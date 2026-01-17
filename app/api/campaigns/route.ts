import { NextRequest, NextResponse } from 'next/server';
import { db, campaigns, calendars, calendarPermissions } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Helper function to check if user can view a calendar.
 * Users can view calendars they own, have any permission for,
 * or all calendars if they are a Manager/Admin.
 */
async function canViewCalendar(userId: string, userRole: string, calendarId: string): Promise<boolean> {
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, calendarId)).limit(1);
  if (calendar?.ownerId === userId) return true;

  const [permission] = await db
    .select()
    .from(calendarPermissions)
    .where(and(
      eq(calendarPermissions.calendarId, calendarId),
      eq(calendarPermissions.userId, userId)
    ))
    .limit(1);

  return !!permission;
}

/**
 * Helper function to check if user can edit a calendar.
 * Users can edit calendars they own, have 'edit' permission for,
 * or all calendars if they are a Manager/Admin.
 */
async function canEditCalendar(userId: string, userRole: string, calendarId: string): Promise<boolean> {
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, calendarId)).limit(1);
  if (calendar?.ownerId === userId) return true;

  const [permission] = await db
    .select()
    .from(calendarPermissions)
    .where(and(
      eq(calendarPermissions.calendarId, calendarId),
      eq(calendarPermissions.userId, userId)
    ))
    .limit(1);

  return permission?.accessType === 'edit';
}

/**
 * GET /api/campaigns - List campaigns for a calendar
 *
 * Campaigns are used to group related activities together.
 *
 * Query params:
 * - calendarId (optional): Filter by specific calendar
 *
 * Security: Only returns campaigns from calendars the user can access.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');

    if (calendarId) {
      // Verify user has access to this calendar
      const hasAccess = await canViewCalendar(user.id, user.role, calendarId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const campaignList = await db.select().from(campaigns).where(eq(campaigns.calendarId, calendarId));
      return NextResponse.json({ campaigns: campaignList });
    }

    // If no calendarId, return campaigns from all accessible calendars
    if (user.role === 'Manager' || user.role === 'Admin') {
      const campaignList = await db.select().from(campaigns);
      return NextResponse.json({ campaigns: campaignList });
    }

    // For regular users, get accessible calendars first
    const ownedCalendars = await db.select({ id: calendars.id }).from(calendars).where(eq(calendars.ownerId, user.id));
    const permittedCalendars = await db.select({ calendarId: calendarPermissions.calendarId }).from(calendarPermissions).where(eq(calendarPermissions.userId, user.id));

    const accessibleIds = new Set([
      ...ownedCalendars.map(c => c.id),
      ...permittedCalendars.map(p => p.calendarId)
    ]);

    if (accessibleIds.size === 0) {
      return NextResponse.json({ campaigns: [] });
    }

    const campaignList = await db
      .select()
      .from(campaigns)
      .where(inArray(campaigns.calendarId, Array.from(accessibleIds)));

    return NextResponse.json({ campaigns: campaignList });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

/**
 * POST /api/campaigns - Create a new campaign
 *
 * Body params:
 * - name (required): Name of the campaign
 * - calendarId (required): ID of the parent calendar
 *
 * Security: Requires edit access to the calendar.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, calendarId } = await request.json();

    if (!name || !calendarId) {
      return NextResponse.json({ error: 'Name and calendarId are required' }, { status: 400 });
    }

    // Check edit access
    const hasEditAccess = await canEditCalendar(user.id, user.role, calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    const [newCampaign] = await db.insert(campaigns).values({
      name: name.trim(),
      calendarId
    }).returning();

    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

/**
 * PUT /api/campaigns - Update a campaign
 *
 * Body params:
 * - id (required): ID of the campaign to update
 * - name (required): New name
 *
 * Security: Requires edit access to the calendar containing this campaign.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    // Get campaign to check calendar access
    const [existingCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check edit access
    const hasEditAccess = await canEditCalendar(user.id, user.role, existingCampaign.calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    const [updated] = await db.update(campaigns).set({ name: name.trim() }).where(eq(campaigns.id, id)).returning();
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns - Delete a campaign
 *
 * Query params:
 * - id (required): ID of the campaign to delete
 *
 * Note: Activities referencing this campaign will have their campaignId set to null.
 * Security: Requires edit access to the calendar containing this campaign.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Get campaign to check calendar access
    const [existingCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check edit access
    const hasEditAccess = await canEditCalendar(user.id, user.role, existingCampaign.calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    await db.delete(campaigns).where(eq(campaigns.id, id));
    return NextResponse.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}

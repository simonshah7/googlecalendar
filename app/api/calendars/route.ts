import { NextRequest, NextResponse } from 'next/server';
import { db, calendars, swimlanes, calendarPermissions, campaignPermissions, campaigns } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, inArray } from 'drizzle-orm';

/**
 * GET /api/calendars - List all calendars accessible to the current user
 *
 * Returns:
 * - For Manager/Admin: All calendars in the system
 * - For regular users: Calendars they own + calendars shared with them + calendars with campaign access
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Managers and Admins can see all calendars
    if (user.role === 'Manager' || user.role === 'Admin') {
      const allCalendars = await db.select().from(calendars);
      return NextResponse.json({ calendars: allCalendars });
    }

    // For regular users, get calendars they own
    const ownedCalendars = await db
      .select()
      .from(calendars)
      .where(eq(calendars.ownerId, user.id));

    // Get calendars shared with them via calendar permissions
    const sharedPermissions = await db
      .select({ calendarId: calendarPermissions.calendarId })
      .from(calendarPermissions)
      .where(eq(calendarPermissions.userId, user.id));

    const sharedCalendarIds = sharedPermissions.map(p => p.calendarId);

    // Get calendars they have access to via campaign permissions
    const userCampaignPerms = await db
      .select({ campaignId: campaignPermissions.campaignId })
      .from(campaignPermissions)
      .where(eq(campaignPermissions.userId, user.id));

    const campaignIds = userCampaignPerms.map(p => p.campaignId);

    // Get the calendar IDs from those campaigns
    let campaignCalendarIds: string[] = [];
    if (campaignIds.length > 0) {
      const campaignsWithCalendars = await db
        .select({ calendarId: campaigns.calendarId })
        .from(campaigns)
        .where(inArray(campaigns.id, campaignIds));
      campaignCalendarIds = campaignsWithCalendars.map(c => c.calendarId);
    }

    // Combine all calendar IDs the user has access to
    const accessibleCalendarIds = new Set([
      ...sharedCalendarIds,
      ...campaignCalendarIds
    ]);

    // Fetch shared calendars if any exist
    let sharedCalendars: typeof ownedCalendars = [];
    if (accessibleCalendarIds.size > 0) {
      sharedCalendars = await db
        .select()
        .from(calendars)
        .where(inArray(calendars.id, Array.from(accessibleCalendarIds)));
    }

    // Combine and deduplicate (in case of any overlap)
    const allUserCalendars = [...ownedCalendars];
    const ownedIds = new Set(ownedCalendars.map(c => c.id));

    for (const cal of sharedCalendars) {
      if (!ownedIds.has(cal.id)) {
        allUserCalendars.push(cal);
      }
    }

    return NextResponse.json({ calendars: allUserCalendars });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}

/**
 * POST /api/calendars - Create a new calendar
 *
 * Creates a new calendar with default swimlanes.
 * Any authenticated user can create calendars.
 *
 * Body params:
 * - name (required): Name of the calendar
 * - isTemplate (optional): Whether this is a template calendar
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, isTemplate = false } = await request.json();

    // Validate name
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Calendar name is required' }, { status: 400 });
    }

    // Create the calendar
    const [newCalendar] = await db
      .insert(calendars)
      .values({
        name: name.trim(),
        ownerId: user.id,
        isTemplate,
      })
      .returning();

    // Create default swimlanes for the new calendar
    await db.insert(swimlanes).values([
      { name: 'Content Marketing', calendarId: newCalendar.id, sortOrder: '0' },
      { name: 'Events', calendarId: newCalendar.id, sortOrder: '1' },
      { name: 'Digital Campaigns', calendarId: newCalendar.id, sortOrder: '2' },
    ]);

    return NextResponse.json({ calendar: newCalendar }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar:', error);
    return NextResponse.json({ error: 'Failed to create calendar' }, { status: 500 });
  }
}

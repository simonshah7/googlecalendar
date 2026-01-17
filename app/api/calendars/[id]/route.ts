import { NextRequest, NextResponse } from 'next/server';
import { db, calendars, activities, swimlanes, campaigns, calendarPermissions, campaignPermissions } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, asc, and, inArray } from 'drizzle-orm';

/**
 * Access level result for calendar access check.
 * - 'full': User has full calendar access (owner, calendar permission, or manager/admin)
 * - 'campaign_only': User only has access to specific campaigns within this calendar
 * - 'none': User has no access
 */
type CalendarAccessLevel = 'full' | 'campaign_only' | 'none';

/**
 * Helper function to check user's access level to a calendar.
 * Returns the access level and list of accessible campaign IDs (if campaign_only).
 */
async function getCalendarAccessLevel(
  userId: string,
  userRole: string,
  calendarId: string,
  calendarOwnerId: string
): Promise<{ level: CalendarAccessLevel; accessibleCampaignIds?: string[]; canEdit: boolean }> {
  // Managers and admins have full access
  if (userRole === 'Manager' || userRole === 'Admin') {
    return { level: 'full', canEdit: true };
  }

  // Check if user owns the calendar
  if (calendarOwnerId === userId) {
    return { level: 'full', canEdit: true };
  }

  // Check if user has calendar-level permission
  const [calPerm] = await db
    .select()
    .from(calendarPermissions)
    .where(and(
      eq(calendarPermissions.calendarId, calendarId),
      eq(calendarPermissions.userId, userId)
    ))
    .limit(1);

  if (calPerm) {
    return { level: 'full', canEdit: calPerm.accessType === 'edit' };
  }

  // Check if user has campaign-level permissions for campaigns in this calendar
  const calendarCampaigns = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.calendarId, calendarId));

  if (calendarCampaigns.length === 0) {
    return { level: 'none', canEdit: false };
  }

  const campaignIds = calendarCampaigns.map(c => c.id);
  const campPerms = await db
    .select()
    .from(campaignPermissions)
    .where(and(
      inArray(campaignPermissions.campaignId, campaignIds),
      eq(campaignPermissions.userId, userId)
    ));

  if (campPerms.length > 0) {
    const accessibleCampaignIds = campPerms.map(p => p.campaignId);
    const canEdit = campPerms.some(p => p.accessType === 'edit');
    return { level: 'campaign_only', accessibleCampaignIds, canEdit };
  }

  return { level: 'none', canEdit: false };
}

/**
 * Helper function to check if user can view a calendar.
 * Users can view calendars they own, have any permission for,
 * have campaign permissions for, or all calendars if they are a Manager/Admin.
 *
 * Note: Database stores roles as 'Manager'/'Admin' (title case), not uppercase.
 */
async function canViewCalendar(userId: string, userRole: string, calendarId: string, calendarOwnerId: string): Promise<boolean> {
  const access = await getCalendarAccessLevel(userId, userRole, calendarId, calendarOwnerId);
  return access.level !== 'none';
}

/**
 * Helper function to check if user can edit/manage a calendar.
 * Users can edit calendars they own, have 'edit' permission for,
 * or all calendars if they are a Manager/Admin.
 */
async function canEditCalendar(userId: string, userRole: string, calendarId: string, calendarOwnerId: string): Promise<boolean> {
  // Managers and admins can edit any calendar
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  // Owner can always edit their own calendar
  if (calendarOwnerId === userId) return true;

  // Check if user has edit permission
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
 * GET /api/calendars/[id] - Get a specific calendar with all data
 *
 * Returns the calendar along with its activities, swimlanes, and campaigns.
 * Security: Validates user has view access to the calendar.
 *
 * For campaign-only users:
 * - Returns all swimlanes (needed for activity context)
 * - Returns only campaigns they have access to
 * - Returns only activities belonging to accessible campaigns
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [calendar] = await db.select().from(calendars).where(eq(calendars.id, id)).limit(1);

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Check authorization and get access level
    const access = await getCalendarAccessLevel(user.id, user.role, id, calendar.ownerId);
    if (access.level === 'none') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get swimlanes (always return all - needed for context)
    const calendarSwimlanes = await db
      .select()
      .from(swimlanes)
      .where(eq(swimlanes.calendarId, id))
      .orderBy(asc(swimlanes.sortOrder));

    // Get campaigns - filter if campaign-only access
    let calendarCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.calendarId, id));

    // Get activities - filter if campaign-only access
    let calendarActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.calendarId, id));

    // If user has campaign-only access, filter the results
    if (access.level === 'campaign_only' && access.accessibleCampaignIds) {
      const accessibleIds = access.accessibleCampaignIds;

      // Filter campaigns to only accessible ones
      calendarCampaigns = calendarCampaigns.filter(c => accessibleIds.includes(c.id));

      // Filter activities to only those in accessible campaigns
      // Include activities with no campaign (campaignId is null/empty) as they're general
      calendarActivities = calendarActivities.filter(a =>
        !a.campaignId || accessibleIds.includes(a.campaignId)
      );
    }

    return NextResponse.json({
      calendar,
      activities: calendarActivities,
      swimlanes: calendarSwimlanes,
      campaigns: calendarCampaigns,
      // Include access info so frontend knows user's permission level
      accessLevel: access.level,
      canEdit: access.canEdit,
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

/**
 * PUT /api/calendars/[id] - Update a calendar
 *
 * Security: Validates user has edit access to the calendar.
 * Users with only 'view' permission cannot update calendars.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get existing calendar to check authorization
    const [existingCalendar] = await db.select().from(calendars).where(eq(calendars.id, id)).limit(1);
    if (!existingCalendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Check authorization - only owner, managers, or users with edit permission can update
    const hasEditAccess = await canEditCalendar(user.id, user.role, id, existingCalendar.ownerId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    const { name, isTemplate } = await request.json();

    // Validate name is provided
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Calendar name is required' }, { status: 400 });
    }

    const [updatedCalendar] = await db
      .update(calendars)
      .set({ name: name.trim(), isTemplate, updatedAt: new Date() })
      .where(eq(calendars.id, id))
      .returning();

    return NextResponse.json({ calendar: updatedCalendar });
  } catch (error) {
    console.error('Error updating calendar:', error);
    return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 });
  }
}

/**
 * DELETE /api/calendars/[id] - Delete a calendar
 *
 * Security: Only calendar owner or Manager/Admin can delete.
 * Cascade delete will remove all related activities, swimlanes, and campaigns.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get existing calendar to check authorization
    const [existingCalendar] = await db.select().from(calendars).where(eq(calendars.id, id)).limit(1);
    if (!existingCalendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Check authorization - only owner or managers can delete (not users with edit permission)
    const canDelete = user.role === 'Manager' || user.role === 'Admin' || existingCalendar.ownerId === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden - only owner or admin can delete' }, { status: 403 });
    }

    // Delete the calendar (cascades will handle related data)
    await db.delete(calendars).where(eq(calendars.id, id));

    return NextResponse.json({ message: 'Calendar deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return NextResponse.json({ error: 'Failed to delete calendar' }, { status: 500 });
  }
}

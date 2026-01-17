import { NextRequest, NextResponse } from 'next/server';
import { db, calendars, activities, swimlanes, campaigns, calendarPermissions } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, asc, and } from 'drizzle-orm';

/**
 * Helper function to check if user can view a calendar.
 * Users can view calendars they own, have any permission for,
 * or all calendars if they are a Manager/Admin.
 *
 * Note: Database stores roles as 'Manager'/'Admin' (title case), not uppercase.
 */
async function canViewCalendar(userId: string, userRole: string, calendarId: string, calendarOwnerId: string): Promise<boolean> {
  // Managers and admins can access all calendars
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  // Check if user owns the calendar
  if (calendarOwnerId === userId) return true;

  // Check if user has any permission for this calendar
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

    // Check authorization
    const hasAccess = await canViewCalendar(user.id, user.role, id, calendar.ownerId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get related data in parallel for better performance
    const [calendarActivities, calendarSwimlanes, calendarCampaigns] = await Promise.all([
      db.select().from(activities).where(eq(activities.calendarId, id)),
      db.select().from(swimlanes).where(eq(swimlanes.calendarId, id)).orderBy(asc(swimlanes.sortOrder)),
      db.select().from(campaigns).where(eq(campaigns.calendarId, id))
    ]);

    return NextResponse.json({
      calendar,
      activities: calendarActivities,
      swimlanes: calendarSwimlanes,
      campaigns: calendarCampaigns,
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

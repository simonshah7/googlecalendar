import { NextRequest, NextResponse } from 'next/server';
import { db, activities, calendars, calendarPermissions } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Helper function to check if user can view a calendar.
 * Users can view calendars they own, have any permission for,
 * or all calendars if they are a Manager/Admin.
 *
 * @param userId - The ID of the current user
 * @param userRole - The role of the current user (User, Manager, Admin)
 * @param calendarId - The calendar ID to check access for
 * @returns Boolean indicating if user can view
 */
async function canViewCalendar(userId: string, userRole: string, calendarId: string): Promise<boolean> {
  // Managers and admins can access all calendars (note: DB stores 'Manager'/'Admin', not uppercase)
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  // Check if user owns the calendar
  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, calendarId)).limit(1);
  if (calendar?.ownerId === userId) return true;

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
 * Helper function to check if user can edit a calendar.
 * Users can edit calendars they own, have 'edit' permission for,
 * or all calendars if they are a Manager/Admin.
 *
 * @param userId - The ID of the current user
 * @param userRole - The role of the current user
 * @param calendarId - The calendar ID to check access for
 * @returns Boolean indicating if user can edit
 */
async function canEditCalendar(userId: string, userRole: string, calendarId: string): Promise<boolean> {
  // Managers and admins can edit all calendars
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  // Check if user owns the calendar
  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, calendarId)).limit(1);
  if (calendar?.ownerId === userId) return true;

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
 * GET /api/activities/[id] - Get a specific activity
 *
 * Security: Validates user has view access to the calendar containing this activity.
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

    const [activity] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Check authorization (view access is sufficient)
    const hasAccess = await canViewCalendar(user.id, user.role, activity.calendarId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

/**
 * PUT /api/activities/[id] - Update an activity
 *
 * Security: Validates user has edit access to the calendar containing this activity.
 * Users with only 'view' permission cannot update activities.
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

    // Get activity to check authorization
    const [existingActivity] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!existingActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Check for edit permission (stricter than view)
    const hasEditAccess = await canEditCalendar(user.id, user.role, existingActivity.calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // Use sql`null` for explicit SQL NULL values
    // This prevents the Neon driver from serializing JavaScript null as empty string
    const sqlNull = sql`null`;

    // Define allowed fields for update (whitelist approach for security)
    const allowedFields = [
      'title', 'swimlaneId', 'calendarId',
      'startDate', 'endDate', 'status', 'description', 'tags',
      'currency', 'region', 'dependencies', 'attachments',
      'inlineComments'
    ];

    // Optional UUID/text fields that can be set to NULL
    const optionalFields = ['typeId', 'campaignId', 'vendorId', 'color', 'outline'];

    // Process standard allowed fields
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Process optional fields - use sql`null` for clearing values
    optionalFields.forEach(field => {
      if (body[field] !== undefined) {
        // If value is provided and truthy, use it; otherwise use SQL NULL
        updateData[field] = body[field] || sqlNull;
      }
    });

    // Handle numeric fields (convert to string for database storage)
    if (body.cost !== undefined) updateData.cost = body.cost.toString();
    if (body.expectedSAOs !== undefined) updateData.expectedSAOs = body.expectedSAOs.toString();
    if (body.actualSAOs !== undefined) updateData.actualSAOs = body.actualSAOs.toString();

    // Handle slackChannel (normalize by removing leading #, use sql`null` for clearing)
    if (body.slackChannel !== undefined) {
      updateData.slackChannel = body.slackChannel ? body.slackChannel.replace(/^#/, '') : sqlNull;
    }

    // Validate date range if dates are being updated
    if (updateData.startDate && updateData.endDate && updateData.startDate > updateData.endDate) {
      return NextResponse.json(
        { error: 'Start date cannot be after end date' },
        { status: 400 }
      );
    }

    const [updatedActivity] = await db
      .update(activities)
      .set(updateData)
      .where(eq(activities.id, id))
      .returning();

    if (!updatedActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ activity: updatedActivity });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}

/**
 * DELETE /api/activities/[id] - Delete an activity
 *
 * Security: Validates user has edit access to the calendar containing this activity.
 * Users with only 'view' permission cannot delete activities.
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

    // Get activity to check authorization
    const [existingActivity] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!existingActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Check for edit permission (stricter than view)
    const hasEditAccess = await canEditCalendar(user.id, user.role, existingActivity.calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    await db.delete(activities).where(eq(activities.id, id));

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db, activities, calendars, calendarPermissions } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, inArray } from 'drizzle-orm';

/**
 * Helper function to get calendar IDs a user can access.
 * Users can access calendars they own, have explicit permissions for,
 * or all calendars if they are a Manager/Admin.
 *
 * @param userId - The ID of the current user
 * @param userRole - The role of the current user (User, Manager, Admin)
 * @returns Array of calendar IDs the user can access
 */
async function getUserAccessibleCalendarIds(userId: string, userRole: string): Promise<string[]> {
  // Managers and Admins can access all calendars
  if (userRole === 'Manager' || userRole === 'Admin') {
    const allCalendars = await db.select({ id: calendars.id }).from(calendars);
    return allCalendars.map(c => c.id);
  }

  // Get calendars user owns
  const ownedCalendars = await db
    .select({ id: calendars.id })
    .from(calendars)
    .where(eq(calendars.ownerId, userId));

  // Get calendars user has explicit permissions for
  const permittedCalendars = await db
    .select({ calendarId: calendarPermissions.calendarId })
    .from(calendarPermissions)
    .where(eq(calendarPermissions.userId, userId));

  // Combine and deduplicate calendar IDs
  const calendarIds = new Set([
    ...ownedCalendars.map(c => c.id),
    ...permittedCalendars.map(p => p.calendarId)
  ]);

  return Array.from(calendarIds);
}

/**
 * Helper function to check if user can edit a calendar.
 * Returns true if user owns the calendar, is a Manager/Admin, or has 'edit' permission.
 *
 * @param userId - The ID of the current user
 * @param userRole - The role of the current user
 * @param calendarId - The calendar ID to check access for
 * @returns Boolean indicating if user can edit
 */
async function canEditCalendar(userId: string, userRole: string, calendarId: string): Promise<boolean> {
  // Managers and Admins can edit any calendar
  if (userRole === 'Manager' || userRole === 'Admin') {
    return true;
  }

  // Check if user owns the calendar
  const [calendar] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId))
    .limit(1);

  if (calendar?.ownerId === userId) {
    return true;
  }

  // Check if user has edit permission
  const [permission] = await db
    .select()
    .from(calendarPermissions)
    .where(eq(calendarPermissions.calendarId, calendarId))
    .limit(1);

  return permission?.accessType === 'edit';
}

/**
 * GET /api/activities - List activities (optionally filtered by calendarId)
 *
 * Security: Only returns activities from calendars the user has access to.
 * If calendarId is provided, validates user has access to that calendar first.
 *
 * Query params:
 * - calendarId (optional): Filter by specific calendar
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');

    // Get accessible calendar IDs for the user
    const accessibleCalendarIds = await getUserAccessibleCalendarIds(user.id, user.role);

    if (calendarId) {
      // Verify user has access to the requested calendar
      if (!accessibleCalendarIds.includes(calendarId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const activityList = await db.select().from(activities).where(eq(activities.calendarId, calendarId));
      return NextResponse.json({ activities: activityList });
    }

    // Return activities only from accessible calendars
    if (accessibleCalendarIds.length === 0) {
      return NextResponse.json({ activities: [] });
    }

    const activityList = await db
      .select()
      .from(activities)
      .where(inArray(activities.calendarId, accessibleCalendarIds));

    return NextResponse.json({ activities: activityList });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

/**
 * POST /api/activities - Create a new activity
 *
 * Security: Validates that user has edit access to the target calendar.
 * Users with 'view' permission cannot create activities.
 *
 * Required fields: title, swimlaneId, calendarId, startDate, endDate
 * Optional fields: typeId, campaignId, status, description, tags, cost, currency,
 *                  vendorId, expectedSAOs, actualSAOs, region, dependencies, attachments, color
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      typeId: rawTypeId,
      campaignId: rawCampaignId,
      swimlaneId,
      calendarId,
      startDate,
      endDate,
      status = 'Considering',
      description = '',
      tags = '',
      cost = 0,
      currency = 'US$',
      vendorId: rawVendorId,
      expectedSAOs = 0,
      actualSAOs = 0,
      region = 'US',
      dependencies = [],
      attachments = [],
      color,
    } = body;

    // Validate required fields
    if (!title || !swimlaneId || !calendarId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, swimlaneId, calendarId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Check if user has edit access to the calendar
    const hasEditAccess = await canEditCalendar(user.id, user.role, calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    // Convert empty strings to null for optional UUID foreign keys
    const typeId = rawTypeId || null;
    const campaignId = rawCampaignId || null;
    const vendorId = rawVendorId || null;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate startDate is not after endDate
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Start date cannot be after end date' },
        { status: 400 }
      );
    }

    const [newActivity] = await db
      .insert(activities)
      .values({
        title,
        typeId,
        campaignId,
        swimlaneId,
        calendarId,
        startDate,
        endDate,
        status,
        description,
        tags,
        cost: cost.toString(),
        currency,
        vendorId,
        expectedSAOs: expectedSAOs.toString(),
        actualSAOs: actualSAOs.toString(),
        region,
        dependencies,
        attachments,
        color,
      })
      .returning();

    return NextResponse.json({ activity: newActivity }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}

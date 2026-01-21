import { NextRequest, NextResponse } from 'next/server';
import { db, activities, calendars, calendarPermissions, swimlanes } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, inArray, and, sql } from 'drizzle-orm';

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

  // Check if user has edit permission for this specific calendar
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
      slackChannel,
      outline,
      inlineComments = [],
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

    // Verify the swimlane exists and belongs to the calendar
    const [swimlane] = await db
      .select()
      .from(swimlanes)
      .where(and(
        eq(swimlanes.id, swimlaneId),
        eq(swimlanes.calendarId, calendarId)
      ))
      .limit(1);

    if (!swimlane) {
      return NextResponse.json(
        { error: 'Invalid swimlane. The selected swimlane does not exist or does not belong to this calendar.' },
        { status: 400 }
      );
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

    // Normalize slack channel (remove leading # if present for consistency)
    const normalizedSlackChannel = slackChannel ? slackChannel.replace(/^#/, '') : null;

    // Ensure arrays are valid (not undefined)
    const safeDependencies = Array.isArray(dependencies) ? dependencies : [];
    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    const safeInlineComments = Array.isArray(inlineComments) ? inlineComments : [];

    // Use sql`null` for optional fields to explicitly insert SQL NULL
    // This prevents the Neon driver from serializing JavaScript null as empty string
    const sqlNull = sql`null`;

    const [newActivity] = await db
      .insert(activities)
      .values({
        title,
        swimlaneId,
        calendarId,
        startDate,
        endDate,
        status,
        description: description || '',
        tags: tags || '',
        cost: cost.toString(),
        currency,
        expectedSAOs: expectedSAOs.toString(),
        actualSAOs: actualSAOs.toString(),
        region,
        dependencies: safeDependencies,
        attachments: safeAttachments,
        inlineComments: safeInlineComments,
        // Use sql`null` for optional fields to ensure proper NULL insertion
        typeId: typeId || sqlNull,
        campaignId: campaignId || sqlNull,
        vendorId: vendorId || sqlNull,
        color: color || sqlNull,
        slackChannel: normalizedSlackChannel || sqlNull,
        outline: outline || sqlNull,
      } as typeof activities.$inferInsert)
      .returning();

    return NextResponse.json({ activity: newActivity }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);

    // Provide more specific error messages based on error type
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Check for foreign key constraint violations
      if (errorMessage.includes('foreign key') || errorMessage.includes('violates foreign key')) {
        if (errorMessage.includes('swimlane')) {
          return NextResponse.json(
            { error: 'The selected swimlane no longer exists. Please refresh and try again.' },
            { status: 400 }
          );
        }
        if (errorMessage.includes('calendar')) {
          return NextResponse.json(
            { error: 'The calendar no longer exists. Please refresh and try again.' },
            { status: 400 }
          );
        }
        if (errorMessage.includes('campaign')) {
          return NextResponse.json(
            { error: 'The selected campaign no longer exists. Please select a different campaign.' },
            { status: 400 }
          );
        }
        if (errorMessage.includes('type')) {
          return NextResponse.json(
            { error: 'The selected activity type no longer exists. Please select a different type.' },
            { status: 400 }
          );
        }
        if (errorMessage.includes('vendor')) {
          return NextResponse.json(
            { error: 'The selected vendor no longer exists. Please select a different vendor.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'A referenced item no longer exists. Please refresh and try again.' },
          { status: 400 }
        );
      }

      // Check for invalid UUID format
      if (errorMessage.includes('invalid input syntax for type uuid') || errorMessage.includes('uuid')) {
        return NextResponse.json(
          { error: 'Invalid data format. Please refresh the page and try again.' },
          { status: 400 }
        );
      }

      // Check for connection issues
      if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
        return NextResponse.json(
          { error: 'Database connection error. Please try again in a moment.' },
          { status: 503 }
        );
      }
    }

    // Include actual error in response for debugging
    const debugError = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: 'Failed to create activity. Please try again.',
      debug: debugError
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db, swimlanes, calendars, calendarPermissions } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, asc, and, inArray } from 'drizzle-orm';

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
 * GET /api/swimlanes - List swimlanes for a calendar
 *
 * Query params:
 * - calendarId (optional): Filter by specific calendar
 *
 * Security: Only returns swimlanes from calendars the user can access.
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

      const swimlaneList = await db
        .select()
        .from(swimlanes)
        .where(eq(swimlanes.calendarId, calendarId))
        .orderBy(asc(swimlanes.sortOrder));

      return NextResponse.json({ swimlanes: swimlaneList });
    }

    // If no calendarId, return swimlanes from all accessible calendars
    // For managers/admins, return all swimlanes
    if (user.role === 'Manager' || user.role === 'Admin') {
      const swimlaneList = await db.select().from(swimlanes).orderBy(asc(swimlanes.sortOrder));
      return NextResponse.json({ swimlanes: swimlaneList });
    }

    // For regular users, get accessible calendars first
    const ownedCalendars = await db.select({ id: calendars.id }).from(calendars).where(eq(calendars.ownerId, user.id));
    const permittedCalendars = await db.select({ calendarId: calendarPermissions.calendarId }).from(calendarPermissions).where(eq(calendarPermissions.userId, user.id));

    const accessibleIds = new Set([
      ...ownedCalendars.map(c => c.id),
      ...permittedCalendars.map(p => p.calendarId)
    ]);

    if (accessibleIds.size === 0) {
      return NextResponse.json({ swimlanes: [] });
    }

    const swimlaneList = await db
      .select()
      .from(swimlanes)
      .where(inArray(swimlanes.calendarId, Array.from(accessibleIds)))
      .orderBy(asc(swimlanes.sortOrder));

    return NextResponse.json({ swimlanes: swimlaneList });
  } catch (error) {
    console.error('Error fetching swimlanes:', error);
    return NextResponse.json({ error: 'Failed to fetch swimlanes' }, { status: 500 });
  }
}

/**
 * POST /api/swimlanes - Create a new swimlane
 *
 * Body params:
 * - name (required): Name of the swimlane
 * - calendarId (required): ID of the parent calendar
 * - budget (optional): Budget allocation for this swimlane
 * - sortOrder (optional): Order position (defaults to '0')
 *
 * Security: Requires edit access to the calendar.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, calendarId, budget, sortOrder } = await request.json();

    if (!name || !calendarId) {
      return NextResponse.json({ error: 'Name and calendarId are required' }, { status: 400 });
    }

    // Check edit access
    const hasEditAccess = await canEditCalendar(user.id, user.role, calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    const [newSwimlane] = await db.insert(swimlanes).values({
      name: name.trim(),
      calendarId,
      budget: budget?.toString(),
      sortOrder: sortOrder?.toString() || '0',
    }).returning();

    return NextResponse.json({ swimlane: newSwimlane }, { status: 201 });
  } catch (error) {
    console.error('Error creating swimlane:', error);
    return NextResponse.json({ error: 'Failed to create swimlane' }, { status: 500 });
  }
}

/**
 * PUT /api/swimlanes - Update a swimlane
 *
 * Body params:
 * - id (required): ID of the swimlane to update
 * - name (optional): New name
 * - budget (optional): New budget
 * - sortOrder (optional): New sort order
 *
 * Security: Requires edit access to the calendar containing this swimlane.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, budget, sortOrder } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Swimlane ID is required' }, { status: 400 });
    }

    // Get swimlane to check calendar access
    const [existingSwimlane] = await db.select().from(swimlanes).where(eq(swimlanes.id, id)).limit(1);
    if (!existingSwimlane) {
      return NextResponse.json({ error: 'Swimlane not found' }, { status: 404 });
    }

    // Check edit access
    const hasEditAccess = await canEditCalendar(user.id, user.role, existingSwimlane.calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (budget !== undefined) updateData.budget = budget?.toString();
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder?.toString();

    const [updated] = await db.update(swimlanes).set(updateData).where(eq(swimlanes.id, id)).returning();
    return NextResponse.json({ swimlane: updated });
  } catch (error) {
    console.error('Error updating swimlane:', error);
    return NextResponse.json({ error: 'Failed to update swimlane' }, { status: 500 });
  }
}

/**
 * DELETE /api/swimlanes - Delete a swimlane
 *
 * Query params:
 * - id (required): ID of the swimlane to delete
 *
 * Note: Deleting a swimlane will cascade delete all activities in that swimlane.
 * Security: Requires edit access to the calendar containing this swimlane.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Get swimlane to check calendar access
    const [existingSwimlane] = await db.select().from(swimlanes).where(eq(swimlanes.id, id)).limit(1);
    if (!existingSwimlane) {
      return NextResponse.json({ error: 'Swimlane not found' }, { status: 404 });
    }

    // Check edit access
    const hasEditAccess = await canEditCalendar(user.id, user.role, existingSwimlane.calendarId);
    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden - edit access required' }, { status: 403 });
    }

    await db.delete(swimlanes).where(eq(swimlanes.id, id));
    return NextResponse.json({ message: 'Swimlane deleted' });
  } catch (error) {
    console.error('Error deleting swimlane:', error);
    return NextResponse.json({ error: 'Failed to delete swimlane' }, { status: 500 });
  }
}

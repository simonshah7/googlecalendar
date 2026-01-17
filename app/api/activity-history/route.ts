/**
 * Activity History API
 *
 * Provides read access to activity audit logs and supports undo operations.
 * History is automatically created when activities are modified through other APIs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, activityHistory, activities, calendars, calendarPermissions, users } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Helper to check if user can view an activity's calendar.
 */
async function canViewActivity(userId: string, userRole: string, activityId: string): Promise<boolean> {
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  if (!activity) return false;

  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, activity.calendarId)).limit(1);
  if (calendar?.ownerId === userId) return true;

  const [permission] = await db
    .select()
    .from(calendarPermissions)
    .where(and(
      eq(calendarPermissions.calendarId, activity.calendarId),
      eq(calendarPermissions.userId, userId)
    ))
    .limit(1);

  return !!permission;
}

/**
 * GET /api/activity-history - Get history for an activity
 *
 * Query params:
 * - activityId (required): The activity to get history for
 * - limit (optional): Number of entries to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (!activityId) {
      return NextResponse.json({ error: 'activityId is required' }, { status: 400 });
    }

    // Check access
    const hasAccess = await canViewActivity(user.id, user.role, activityId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get history with user info
    const history = await db
      .select({
        id: activityHistory.id,
        activityId: activityHistory.activityId,
        userId: activityHistory.userId,
        userName: users.name,
        action: activityHistory.action,
        changes: activityHistory.changes,
        previousState: activityHistory.previousState,
        createdAt: activityHistory.createdAt,
      })
      .from(activityHistory)
      .leftJoin(users, eq(activityHistory.userId, users.id))
      .where(eq(activityHistory.activityId, activityId))
      .orderBy(desc(activityHistory.createdAt))
      .limit(limit);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

/**
 * POST /api/activity-history/undo - Undo the last action on an activity
 *
 * This restores an activity to its previous state using the stored previousState.
 *
 * Body params:
 * - historyId (required): The history entry to undo
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { historyId } = await request.json();

    if (!historyId) {
      return NextResponse.json({ error: 'historyId is required' }, { status: 400 });
    }

    // Get the history entry
    const [historyEntry] = await db
      .select()
      .from(activityHistory)
      .where(eq(activityHistory.id, historyId))
      .limit(1);

    if (!historyEntry) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    // Check access
    const hasAccess = await canViewActivity(user.id, user.role, historyEntry.activityId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If there's no previous state, we can't undo
    if (!historyEntry.previousState) {
      return NextResponse.json({ error: 'No previous state available for undo' }, { status: 400 });
    }

    // For delete actions, we need to recreate the activity
    if (historyEntry.action === 'deleted') {
      const previousState = historyEntry.previousState as Record<string, unknown>;
      const [restored] = await db
        .insert(activities)
        .values({
          id: historyEntry.activityId,
          ...previousState,
        } as typeof activities.$inferInsert)
        .returning();

      // Log the undo action
      await db.insert(activityHistory).values({
        activityId: historyEntry.activityId,
        userId: user.id,
        action: 'created',
        changes: { undone: { old: 'deleted', new: 'restored' } },
      });

      return NextResponse.json({ activity: restored, message: 'Activity restored' });
    }

    // For other actions, restore the previous state
    const [updated] = await db
      .update(activities)
      .set({
        ...historyEntry.previousState as Partial<typeof activities.$inferSelect>,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, historyEntry.activityId))
      .returning();

    // Log the undo action
    await db.insert(activityHistory).values({
      activityId: historyEntry.activityId,
      userId: user.id,
      action: 'updated',
      changes: { undone: { old: historyEntry.action, new: 'restored' } },
    });

    return NextResponse.json({ activity: updated, message: 'Changes undone' });
  } catch (error) {
    console.error('Error undoing action:', error);
    return NextResponse.json({ error: 'Failed to undo action' }, { status: 500 });
  }
}

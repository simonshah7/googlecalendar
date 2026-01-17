/**
 * Bulk Activities API
 *
 * Provides bulk operations for activities including:
 * - Bulk delete
 * - Bulk status change
 * - Bulk swimlane change
 * - Bulk campaign change
 * - Bulk region change
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, activities, activityHistory, calendars, calendarPermissions } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Helper to check if user can edit a calendar.
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
 * POST /api/activities/bulk - Perform bulk operations on activities
 *
 * Body params:
 * - operation (required): 'delete' | 'changeStatus' | 'changeSwimlane' | 'changeCampaign' | 'changeRegion'
 * - activityIds (required): Array of activity IDs
 * - targetValue (required for change operations): The new value to set
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, activityIds, targetValue } = await request.json();

    if (!operation || !activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return NextResponse.json({ error: 'operation and activityIds are required' }, { status: 400 });
    }

    if (activityIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 activities per bulk operation' }, { status: 400 });
    }

    // Get all activities to verify access
    const targetActivities = await db
      .select()
      .from(activities)
      .where(inArray(activities.id, activityIds));

    if (targetActivities.length === 0) {
      return NextResponse.json({ error: 'No activities found' }, { status: 404 });
    }

    // Check edit access for all calendars involved
    const calendarIds = [...new Set(targetActivities.map(a => a.calendarId))];
    for (const calendarId of calendarIds) {
      const hasAccess = await canEditCalendar(user.id, user.role, calendarId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden - no edit access to some calendars' }, { status: 403 });
      }
    }

    const foundIds = targetActivities.map(a => a.id);
    const now = new Date();

    switch (operation) {
      case 'delete': {
        // Store previous states for undo
        for (const activity of targetActivities) {
          await db.insert(activityHistory).values({
            activityId: activity.id,
            userId: user.id,
            action: 'deleted',
            previousState: activity as Record<string, unknown>,
          });
        }

        // Delete activities
        await db.delete(activities).where(inArray(activities.id, foundIds));

        return NextResponse.json({
          message: `${foundIds.length} activities deleted`,
          deletedIds: foundIds,
        });
      }

      case 'changeStatus': {
        if (!targetValue || !['Considering', 'Negotiating', 'Committed'].includes(targetValue)) {
          return NextResponse.json({ error: 'Valid targetValue (status) is required' }, { status: 400 });
        }

        // Store previous states
        for (const activity of targetActivities) {
          await db.insert(activityHistory).values({
            activityId: activity.id,
            userId: user.id,
            action: 'status_changed',
            changes: { status: { old: activity.status, new: targetValue } },
            previousState: activity as Record<string, unknown>,
          });
        }

        await db
          .update(activities)
          .set({ status: targetValue, updatedAt: now })
          .where(inArray(activities.id, foundIds));

        return NextResponse.json({
          message: `${foundIds.length} activities updated to status: ${targetValue}`,
          updatedIds: foundIds,
        });
      }

      case 'changeSwimlane': {
        if (!targetValue) {
          return NextResponse.json({ error: 'targetValue (swimlaneId) is required' }, { status: 400 });
        }

        // Store previous states
        for (const activity of targetActivities) {
          await db.insert(activityHistory).values({
            activityId: activity.id,
            userId: user.id,
            action: 'moved',
            changes: { swimlaneId: { old: activity.swimlaneId, new: targetValue } },
            previousState: activity as Record<string, unknown>,
          });
        }

        await db
          .update(activities)
          .set({ swimlaneId: targetValue, updatedAt: now })
          .where(inArray(activities.id, foundIds));

        return NextResponse.json({
          message: `${foundIds.length} activities moved to new swimlane`,
          updatedIds: foundIds,
        });
      }

      case 'changeCampaign': {
        // targetValue can be null/empty to remove from campaign
        const campaignId = targetValue || null;

        // Store previous states
        for (const activity of targetActivities) {
          await db.insert(activityHistory).values({
            activityId: activity.id,
            userId: user.id,
            action: 'updated',
            changes: { campaignId: { old: activity.campaignId, new: campaignId } },
            previousState: activity as Record<string, unknown>,
          });
        }

        await db
          .update(activities)
          .set({ campaignId, updatedAt: now })
          .where(inArray(activities.id, foundIds));

        return NextResponse.json({
          message: `${foundIds.length} activities campaign updated`,
          updatedIds: foundIds,
        });
      }

      case 'changeRegion': {
        if (!targetValue || !['US', 'EMEA', 'ROW'].includes(targetValue)) {
          return NextResponse.json({ error: 'Valid targetValue (region) is required' }, { status: 400 });
        }

        // Store previous states
        for (const activity of targetActivities) {
          await db.insert(activityHistory).values({
            activityId: activity.id,
            userId: user.id,
            action: 'updated',
            changes: { region: { old: activity.region, new: targetValue } },
            previousState: activity as Record<string, unknown>,
          });
        }

        await db
          .update(activities)
          .set({ region: targetValue, updatedAt: now })
          .where(inArray(activities.id, foundIds));

        return NextResponse.json({
          message: `${foundIds.length} activities region updated to: ${targetValue}`,
          updatedIds: foundIds,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown operation: ${operation}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json({ error: 'Failed to perform bulk operation' }, { status: 500 });
  }
}

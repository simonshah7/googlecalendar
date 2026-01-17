/**
 * Activity Comments API
 *
 * Provides CRUD operations for activity comments.
 * Comments allow users to discuss and collaborate on activities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, activityComments, activities, calendars, calendarPermissions, users } from '@/db';
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
 * GET /api/activity-comments - Get comments for an activity
 *
 * Query params:
 * - activityId (required): The activity to get comments for
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');

    if (!activityId) {
      return NextResponse.json({ error: 'activityId is required' }, { status: 400 });
    }

    // Check access
    const hasAccess = await canViewActivity(user.id, user.role, activityId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comments with user info
    const comments = await db
      .select({
        id: activityComments.id,
        activityId: activityComments.activityId,
        userId: activityComments.userId,
        userName: users.name,
        userEmail: users.email,
        content: activityComments.content,
        createdAt: activityComments.createdAt,
        updatedAt: activityComments.updatedAt,
      })
      .from(activityComments)
      .leftJoin(users, eq(activityComments.userId, users.id))
      .where(eq(activityComments.activityId, activityId))
      .orderBy(desc(activityComments.createdAt));

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * POST /api/activity-comments - Add a comment to an activity
 *
 * Body params:
 * - activityId (required): The activity to comment on
 * - content (required): The comment text
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId, content } = await request.json();

    if (!activityId || !content?.trim()) {
      return NextResponse.json({ error: 'activityId and content are required' }, { status: 400 });
    }

    // Check access
    const hasAccess = await canViewActivity(user.id, user.role, activityId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [newComment] = await db
      .insert(activityComments)
      .values({
        activityId,
        userId: user.id,
        content: content.trim(),
      })
      .returning();

    // Return with user info
    return NextResponse.json({
      comment: {
        ...newComment,
        userName: user.name,
        userEmail: user.email,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

/**
 * PUT /api/activity-comments - Update a comment
 *
 * Body params:
 * - id (required): Comment ID
 * - content (required): New content
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, content } = await request.json();

    if (!id || !content?.trim()) {
      return NextResponse.json({ error: 'id and content are required' }, { status: 400 });
    }

    // Get comment to check ownership
    const [existingComment] = await db.select().from(activityComments).where(eq(activityComments.id, id)).limit(1);
    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only comment author or admin can edit
    if (existingComment.userId !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [updated] = await db
      .update(activityComments)
      .set({ content: content.trim(), updatedAt: new Date() })
      .where(eq(activityComments.id, id))
      .returning();

    return NextResponse.json({ comment: updated });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

/**
 * DELETE /api/activity-comments - Delete a comment
 *
 * Query params:
 * - id (required): Comment ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Get comment to check ownership
    const [existingComment] = await db.select().from(activityComments).where(eq(activityComments.id, id)).limit(1);
    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only comment author or admin can delete
    if (existingComment.userId !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(activityComments).where(eq(activityComments.id, id));

    return NextResponse.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

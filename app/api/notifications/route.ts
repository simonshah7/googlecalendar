import { NextRequest, NextResponse } from 'next/server';
import { db, notifications } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/notifications - Get notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build query
    let query = db
      .select()
      .from(notifications)
      .where(
        unreadOnly
          ? and(eq(notifications.userId, user.id), eq(notifications.read, false))
          : eq(notifications.userId, user.id)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const userNotifications = await query;

    // Get unread count
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

    return NextResponse.json({
      notifications: userNotifications,
      unreadCount: unreadNotifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notification(s) as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, markAllRead } = await request.json();

    if (markAllRead) {
      // Mark all notifications as read for this user
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required (or use markAllRead: true)' }, { status: 400 });
    }

    // Verify the notification belongs to the user
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark as read
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();

    return NextResponse.json({ notification: updated });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications - Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      // Delete all notifications for this user
      await db.delete(notifications).where(eq(notifications.userId, user.id));
      return NextResponse.json({ message: 'All notifications deleted' });
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required (or use deleteAll=true)' }, { status: 400 });
    }

    // Verify the notification belongs to the user
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete notification
    await db.delete(notifications).where(eq(notifications.id, id));

    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}

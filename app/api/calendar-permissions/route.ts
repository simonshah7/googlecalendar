import { NextRequest, NextResponse } from 'next/server';
import { db, calendarPermissions, calendars, users, notifications } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// Helper to check if user can manage calendar permissions
async function canManageCalendar(userId: string, userRole: string, calendarId: string): Promise<boolean> {
  // Managers and admins can manage any calendar
  if (userRole === 'MANAGER' || userRole === 'ADMIN') return true;

  // Check if user owns the calendar
  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, calendarId)).limit(1);
  return calendar?.ownerId === userId;
}

// GET /api/calendar-permissions - Get permissions for a calendar
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');

    if (!calendarId) {
      return NextResponse.json({ error: 'calendarId is required' }, { status: 400 });
    }

    // Get permissions with user info
    const permissions = await db
      .select({
        id: calendarPermissions.id,
        calendarId: calendarPermissions.calendarId,
        userId: calendarPermissions.userId,
        accessType: calendarPermissions.accessType,
        userEmail: users.email,
        userName: users.name,
      })
      .from(calendarPermissions)
      .leftJoin(users, eq(calendarPermissions.userId, users.id))
      .where(eq(calendarPermissions.calendarId, calendarId));

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

// POST /api/calendar-permissions - Add a permission (invite user by email)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { calendarId, email, accessType = 'view' } = await request.json();

    if (!calendarId || !email) {
      return NextResponse.json({ error: 'calendarId and email are required' }, { status: 400 });
    }

    // Check if user can manage this calendar
    const canManage = await canManageCalendar(user.id, user.role, calendarId);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find user by email
    const [targetUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found with this email' }, { status: 404 });
    }

    // Check if permission already exists
    const [existing] = await db
      .select()
      .from(calendarPermissions)
      .where(and(
        eq(calendarPermissions.calendarId, calendarId),
        eq(calendarPermissions.userId, targetUser.id)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'User already has access to this calendar' }, { status: 409 });
    }

    // Get calendar details for notification
    const [calendar] = await db.select().from(calendars).where(eq(calendars.id, calendarId)).limit(1);

    // Create permission
    const [newPermission] = await db
      .insert(calendarPermissions)
      .values({
        calendarId,
        userId: targetUser.id,
        accessType,
      })
      .returning();

    // Create notification for the invited user
    await db.insert(notifications).values({
      userId: targetUser.id,
      type: 'calendar_invite',
      title: 'Workspace Invitation',
      message: `${user.name} invited you to collaborate on workspace "${calendar?.name || 'Unknown'}" with ${accessType} access.`,
      relatedType: 'calendar',
      relatedId: calendarId,
    });

    return NextResponse.json({
      permission: {
        ...newPermission,
        userEmail: targetUser.email,
        userName: targetUser.name,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 });
  }
}

// PUT /api/calendar-permissions - Update a permission
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, accessType } = await request.json();

    if (!id || !accessType) {
      return NextResponse.json({ error: 'id and accessType are required' }, { status: 400 });
    }

    // Get the permission to check calendar ownership
    const [permission] = await db
      .select()
      .from(calendarPermissions)
      .where(eq(calendarPermissions.id, id))
      .limit(1);

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Check if user can manage this calendar
    const canManage = await canManageCalendar(user.id, user.role, permission.calendarId);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update permission
    const [updated] = await db
      .update(calendarPermissions)
      .set({ accessType })
      .where(eq(calendarPermissions.id, id))
      .returning();

    return NextResponse.json({ permission: updated });
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 });
  }
}

// DELETE /api/calendar-permissions - Remove a permission
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

    // Get the permission to check calendar ownership
    const [permission] = await db
      .select()
      .from(calendarPermissions)
      .where(eq(calendarPermissions.id, id))
      .limit(1);

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Check if user can manage this calendar
    const canManage = await canManageCalendar(user.id, user.role, permission.calendarId);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete permission
    await db.delete(calendarPermissions).where(eq(calendarPermissions.id, id));

    return NextResponse.json({ message: 'Permission removed successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 });
  }
}

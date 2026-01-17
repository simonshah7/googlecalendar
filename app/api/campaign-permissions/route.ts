import { NextRequest, NextResponse } from 'next/server';
import { db, campaignPermissions, campaigns, calendars, users, notifications } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// Helper to check if user can manage campaign permissions
// Returns true if user owns the calendar that contains the campaign, or is Manager/Admin
async function canManageCampaign(userId: string, userRole: string, campaignId: string): Promise<boolean> {
  // Managers and admins can manage any campaign
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  // Get the campaign and its calendar
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return false;

  // Check if user owns the calendar that contains this campaign
  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, campaign.calendarId)).limit(1);
  return calendar?.ownerId === userId;
}

// Helper to check if user has any access to a campaign
async function hasAnyCampaignAccess(userId: string, userRole: string, campaignId: string): Promise<boolean> {
  // Managers and admins can access any campaign
  if (userRole === 'Manager' || userRole === 'Admin') return true;

  // Get the campaign
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return false;

  // Check if user owns the calendar
  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, campaign.calendarId)).limit(1);
  if (calendar?.ownerId === userId) return true;

  // Check campaign-specific permission
  const [campPerm] = await db
    .select()
    .from(campaignPermissions)
    .where(and(
      eq(campaignPermissions.campaignId, campaignId),
      eq(campaignPermissions.userId, userId)
    ))
    .limit(1);

  return !!campPerm;
}

// GET /api/campaign-permissions - Get permissions for a campaign
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    // Check if user has any access to this campaign
    const hasAccess = await hasAnyCampaignAccess(user.id, user.role, campaignId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get permissions with user info
    const permissions = await db
      .select({
        id: campaignPermissions.id,
        campaignId: campaignPermissions.campaignId,
        userId: campaignPermissions.userId,
        accessType: campaignPermissions.accessType,
        invitedBy: campaignPermissions.invitedBy,
        createdAt: campaignPermissions.createdAt,
        updatedAt: campaignPermissions.updatedAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(campaignPermissions)
      .leftJoin(users, eq(campaignPermissions.userId, users.id))
      .where(eq(campaignPermissions.campaignId, campaignId));

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching campaign permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

// POST /api/campaign-permissions - Add a permission (invite user by email)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId, email, accessType = 'view' } = await request.json();

    if (!campaignId || !email) {
      return NextResponse.json({ error: 'campaignId and email are required' }, { status: 400 });
    }

    // Check if user can manage this campaign
    const canManage = await canManageCampaign(user.id, user.role, campaignId);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find user by email
    const [targetUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found with this email' }, { status: 404 });
    }

    // Prevent inviting yourself
    if (targetUser.id === user.id) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Check if permission already exists
    const [existing] = await db
      .select()
      .from(campaignPermissions)
      .where(and(
        eq(campaignPermissions.campaignId, campaignId),
        eq(campaignPermissions.userId, targetUser.id)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'User already has access to this campaign' }, { status: 409 });
    }

    // Get campaign details for notification
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);

    // Create permission
    const [newPermission] = await db
      .insert(campaignPermissions)
      .values({
        campaignId,
        userId: targetUser.id,
        accessType,
        invitedBy: user.id,
      })
      .returning();

    // Create notification for the invited user
    await db.insert(notifications).values({
      userId: targetUser.id,
      type: 'campaign_invite',
      title: 'Campaign Invitation',
      message: `${user.name} invited you to collaborate on campaign "${campaign?.name || 'Unknown'}" with ${accessType} access.`,
      relatedType: 'campaign',
      relatedId: campaignId,
    });

    return NextResponse.json({
      permission: {
        ...newPermission,
        userEmail: targetUser.email,
        userName: targetUser.name,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign permission:', error);
    return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 });
  }
}

// PUT /api/campaign-permissions - Update a permission
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

    // Get the permission to check campaign ownership
    const [permission] = await db
      .select()
      .from(campaignPermissions)
      .where(eq(campaignPermissions.id, id))
      .limit(1);

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Check if user can manage this campaign
    const canManage = await canManageCampaign(user.id, user.role, permission.campaignId);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get campaign details for notification
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, permission.campaignId)).limit(1);

    // Update permission
    const [updated] = await db
      .update(campaignPermissions)
      .set({ accessType, updatedAt: new Date() })
      .where(eq(campaignPermissions.id, id))
      .returning();

    // Create notification for the affected user
    await db.insert(notifications).values({
      userId: permission.userId,
      type: 'permission_changed',
      title: 'Permission Updated',
      message: `Your access to campaign "${campaign?.name || 'Unknown'}" has been changed to ${accessType}.`,
      relatedType: 'campaign',
      relatedId: permission.campaignId,
    });

    return NextResponse.json({ permission: updated });
  } catch (error) {
    console.error('Error updating campaign permission:', error);
    return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 });
  }
}

// DELETE /api/campaign-permissions - Remove a permission
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

    // Get the permission to check campaign ownership
    const [permission] = await db
      .select()
      .from(campaignPermissions)
      .where(eq(campaignPermissions.id, id))
      .limit(1);

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Check if user can manage this campaign
    const canManage = await canManageCampaign(user.id, user.role, permission.campaignId);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get campaign details for notification
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, permission.campaignId)).limit(1);

    // Delete permission
    await db.delete(campaignPermissions).where(eq(campaignPermissions.id, id));

    // Create notification for the removed user
    await db.insert(notifications).values({
      userId: permission.userId,
      type: 'permission_changed',
      title: 'Access Removed',
      message: `Your access to campaign "${campaign?.name || 'Unknown'}" has been removed.`,
      relatedType: 'campaign',
      relatedId: permission.campaignId,
    });

    return NextResponse.json({ message: 'Permission removed successfully' });
  } catch (error) {
    console.error('Error deleting campaign permission:', error);
    return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 });
  }
}

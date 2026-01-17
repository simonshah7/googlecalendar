/**
 * User Profile API
 *
 * Provides endpoints for users to view and update their own profile,
 * including name, avatar, and password changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/db';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * GET /api/users/profile - Get current user's profile
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return user profile without sensitive data
    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PUT /api/users/profile - Update current user's profile
 *
 * Body params (all optional):
 * - name: New display name
 * - avatarUrl: New avatar URL
 * - currentPassword: Required if changing password
 * - newPassword: New password (min 8 characters)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, avatarUrl, currentPassword, newPassword } = await request.json();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    // Update avatar if provided
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }

      // Get current password hash
      const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, userData.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Hash new password
      updateData.passwordHash = await hashPassword(newPassword);
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 1) { // Only updatedAt
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning();

    // Return updated profile without sensitive data
    return NextResponse.json({
      profile: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
        createdAt: updated.createdAt,
      },
      message: newPassword ? 'Profile and password updated' : 'Profile updated',
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

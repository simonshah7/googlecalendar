import { NextResponse } from 'next/server';
import { db, users, calendars, swimlanes } from '@/db';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const DEV_USER = {
  email: 'dev@campaignos.local',
  password: 'dev-password',
  name: 'Dev User',
};

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dev login is not available in production' },
      { status: 403 }
    );
  }

  try {
    // Check if dev user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEV_USER.email))
      .limit(1);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create dev user
      const passwordHash = await hashPassword(DEV_USER.password);
      const [newUser] = await db
        .insert(users)
        .values({
          email: DEV_USER.email,
          name: DEV_USER.name,
          passwordHash,
          role: 'User',
        })
        .returning();

      userId = newUser.id;

      // Create a default calendar with swimlanes
      const [calendar] = await db
        .insert(calendars)
        .values({
          name: 'Dev Calendar',
          ownerId: userId,
          isTemplate: false,
        })
        .returning();

      await db.insert(swimlanes).values([
        { name: 'Content Marketing', calendarId: calendar.id, sortOrder: '0' },
        { name: 'Events', calendarId: calendar.id, sortOrder: '1' },
        { name: 'ABM Campaigns', calendarId: calendar.id, sortOrder: '2' },
      ]);
    }

    // Fetch user to get all fields
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Create JWT and set cookie
    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(token);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Dev login successful',
    });
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json(
      { error: 'Dev login failed. Is the database running?' },
      { status: 500 }
    );
  }
}

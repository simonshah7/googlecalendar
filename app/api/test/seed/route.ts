import { NextRequest, NextResponse } from 'next/server';
import { db, users, calendars, swimlanes } from '@/db';
import { hashPassword } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * Test Seed API Endpoint
 *
 * Creates a test user and sample data for E2E testing.
 * Protected by E2E_TEST_SECRET environment variable.
 *
 * Usage: POST /api/test/seed
 * Header: x-test-secret: <E2E_TEST_SECRET>
 *
 * Returns the test user credentials for use in tests.
 */

const TEST_USER = {
  email: 'e2e-test@campaignos.test',
  password: 'TestPassword123!',
  name: 'E2E Test User',
};

export async function POST(request: NextRequest) {
  // Verify test secret
  const testSecret = request.headers.get('x-test-secret');
  const expectedSecret = process.env.E2E_TEST_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'E2E_TEST_SECRET not configured' },
      { status: 500 }
    );
  }

  if (testSecret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Invalid test secret' },
      { status: 401 }
    );
  }

  try {
    // Check if test user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, TEST_USER.email))
      .limit(1);

    let userId: string;

    if (existingUser.length > 0) {
      // User exists, use existing ID
      userId = existingUser[0].id;
    } else {
      // Create test user
      const passwordHash = await hashPassword(TEST_USER.password);
      const [newUser] = await db
        .insert(users)
        .values({
          email: TEST_USER.email,
          name: TEST_USER.name,
          passwordHash,
          role: 'User',
        })
        .returning();

      userId = newUser.id;

      // Create a default calendar for the test user
      const [calendar] = await db
        .insert(calendars)
        .values({
          name: 'Test Calendar',
          ownerId: userId,
        })
        .returning();

      // Create a default swimlane
      await db.insert(swimlanes).values({
        name: 'Test Swimlane',
        calendarId: calendar.id,
        sortOrder: '0',
      });
    }

    return NextResponse.json({
      success: true,
      testUser: {
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name,
      },
    });
  } catch (error) {
    console.error('Test seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed test data' },
      { status: 500 }
    );
  }
}

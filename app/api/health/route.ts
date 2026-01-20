import { NextResponse } from 'next/server';
import { db, users, calendars, swimlanes } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * Health Check API Endpoint
 *
 * Tests database connectivity and returns diagnostic information.
 * This helps debug 500 errors by revealing the actual error messages.
 *
 * GET /api/health
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    databaseUrlSet: !!process.env.DATABASE_URL,
    authSecretSet: !!process.env.AUTH_SECRET,
  };

  try {
    // Test basic database connectivity with a simple query
    const result = await db.execute(sql`SELECT 1 as test`);
    diagnostics.dbConnection = 'ok';
    diagnostics.dbQueryResult = result;

    // Try to count users
    try {
      const userCount = await db.select().from(users);
      diagnostics.userCount = userCount.length;
    } catch (userError) {
      diagnostics.userCountError = userError instanceof Error ? userError.message : String(userError);
    }

    // Try to count calendars
    try {
      const calendarCount = await db.select().from(calendars);
      diagnostics.calendarCount = calendarCount.length;
    } catch (calError) {
      diagnostics.calendarCountError = calError instanceof Error ? calError.message : String(calError);
    }

    // Try to count swimlanes
    try {
      const swimlaneCount = await db.select().from(swimlanes);
      diagnostics.swimlaneCount = swimlaneCount.length;
    } catch (swimError) {
      diagnostics.swimlaneCountError = swimError instanceof Error ? swimError.message : String(swimError);
    }

    return NextResponse.json({
      status: 'ok',
      diagnostics,
    });
  } catch (error) {
    diagnostics.dbConnection = 'failed';
    diagnostics.error = error instanceof Error ? error.message : String(error);
    diagnostics.errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      status: 'error',
      diagnostics,
    }, { status: 500 });
  }
}

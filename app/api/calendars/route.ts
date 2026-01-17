import { NextRequest, NextResponse } from 'next/server';
import { db, calendars, swimlanes, campaigns } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, or } from 'drizzle-orm';

// GET /api/calendars - List all calendars for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For managers/admins, show all calendars
    // For regular users, show only their own calendars (and those shared with them)
    const userCalendars = user.role === 'User'
      ? await db.select().from(calendars).where(eq(calendars.ownerId, user.id))
      : await db.select().from(calendars);

    return NextResponse.json({ calendars: userCalendars });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}

// POST /api/calendars - Create a new calendar
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, isTemplate = false } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Calendar name is required' }, { status: 400 });
    }

    const [newCalendar] = await db
      .insert(calendars)
      .values({
        name,
        ownerId: user.id,
        isTemplate,
      })
      .returning();

    // Create default swimlanes for the new calendar
    await db.insert(swimlanes).values([
      { name: 'Content Marketing', calendarId: newCalendar.id, sortOrder: '0' },
      { name: 'Events', calendarId: newCalendar.id, sortOrder: '1' },
      { name: 'Digital Campaigns', calendarId: newCalendar.id, sortOrder: '2' },
    ]);

    return NextResponse.json({ calendar: newCalendar }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar:', error);
    return NextResponse.json({ error: 'Failed to create calendar' }, { status: 500 });
  }
}

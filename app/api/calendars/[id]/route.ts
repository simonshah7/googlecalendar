import { NextRequest, NextResponse } from 'next/server';
import { db, calendars, activities, swimlanes, campaigns } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// GET /api/calendars/[id] - Get a specific calendar with all data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [calendar] = await db.select().from(calendars).where(eq(calendars.id, id)).limit(1);

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Get related data
    const calendarActivities = await db.select().from(activities).where(eq(activities.calendarId, id));
    const calendarSwimlanes = await db.select().from(swimlanes).where(eq(swimlanes.calendarId, id));
    const calendarCampaigns = await db.select().from(campaigns).where(eq(campaigns.calendarId, id));

    return NextResponse.json({
      calendar,
      activities: calendarActivities,
      swimlanes: calendarSwimlanes,
      campaigns: calendarCampaigns,
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

// PUT /api/calendars/[id] - Update a calendar
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, isTemplate } = await request.json();

    const [updatedCalendar] = await db
      .update(calendars)
      .set({ name, isTemplate, updatedAt: new Date() })
      .where(eq(calendars.id, id))
      .returning();

    if (!updatedCalendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    return NextResponse.json({ calendar: updatedCalendar });
  } catch (error) {
    console.error('Error updating calendar:', error);
    return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 });
  }
}

// DELETE /api/calendars/[id] - Delete a calendar
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete the calendar (cascades will handle related data)
    const [deletedCalendar] = await db
      .delete(calendars)
      .where(eq(calendars.id, id))
      .returning();

    if (!deletedCalendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Calendar deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return NextResponse.json({ error: 'Failed to delete calendar' }, { status: 500 });
  }
}

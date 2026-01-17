import { NextRequest, NextResponse } from 'next/server';
import { db, activities } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// GET /api/activities - List activities (optionally filtered by calendarId)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');

    const activityList = calendarId
      ? await db.select().from(activities).where(eq(activities.calendarId, calendarId))
      : await db.select().from(activities);

    return NextResponse.json({ activities: activityList });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

// POST /api/activities - Create a new activity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      typeId,
      campaignId,
      swimlaneId,
      calendarId,
      startDate,
      endDate,
      status = 'Considering',
      description = '',
      tags = '',
      cost = 0,
      currency = 'US$',
      vendorId,
      expectedSAOs = 0,
      actualSAOs = 0,
      region = 'US',
      dependencies = [],
      attachments = [],
      color,
    } = body;

    if (!title || !swimlaneId || !calendarId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, swimlaneId, calendarId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    const [newActivity] = await db
      .insert(activities)
      .values({
        title,
        typeId,
        campaignId,
        swimlaneId,
        calendarId,
        startDate,
        endDate,
        status,
        description,
        tags,
        cost: cost.toString(),
        currency,
        vendorId,
        expectedSAOs: expectedSAOs.toString(),
        actualSAOs: actualSAOs.toString(),
        region,
        dependencies,
        attachments,
        color,
      })
      .returning();

    return NextResponse.json({ activity: newActivity }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}

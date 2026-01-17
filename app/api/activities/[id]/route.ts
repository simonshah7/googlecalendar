import { NextRequest, NextResponse } from 'next/server';
import { db, activities } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// GET /api/activities/[id] - Get a specific activity
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

    const [activity] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

// PUT /api/activities/[id] - Update an activity
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
    const body = await request.json();

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // Map allowed fields
    const allowedFields = [
      'title', 'typeId', 'campaignId', 'swimlaneId', 'calendarId',
      'startDate', 'endDate', 'status', 'description', 'tags',
      'currency', 'vendorId', 'region', 'dependencies', 'attachments', 'color'
    ];

    // Optional UUID foreign keys - convert empty strings to null
    const optionalUuidFields = ['typeId', 'campaignId', 'vendorId'];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        // Convert empty strings to null for optional UUID fields
        if (optionalUuidFields.includes(field) && body[field] === '') {
          updateData[field] = null;
        } else {
          updateData[field] = body[field];
        }
      }
    });

    // Handle numeric fields
    if (body.cost !== undefined) updateData.cost = body.cost.toString();
    if (body.expectedSAOs !== undefined) updateData.expectedSAOs = body.expectedSAOs.toString();
    if (body.actualSAOs !== undefined) updateData.actualSAOs = body.actualSAOs.toString();

    const [updatedActivity] = await db
      .update(activities)
      .set(updateData)
      .where(eq(activities.id, id))
      .returning();

    if (!updatedActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ activity: updatedActivity });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}

// DELETE /api/activities/[id] - Delete an activity
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

    const [deletedActivity] = await db
      .delete(activities)
      .where(eq(activities.id, id))
      .returning();

    if (!deletedActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}

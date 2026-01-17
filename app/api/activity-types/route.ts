import { NextRequest, NextResponse } from 'next/server';
import { db, activityTypes } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const typeList = await db.select().from(activityTypes);
    return NextResponse.json({ activityTypes: typeList });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const [newType] = await db.insert(activityTypes).values({ name }).returning();
    return NextResponse.json({ activityType: newType }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create activity type' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name } = await request.json();
    const [updated] = await db.update(activityTypes).set({ name }).where(eq(activityTypes.id, id)).returning();
    return NextResponse.json({ activityType: updated });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update activity type' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.delete(activityTypes).where(eq(activityTypes.id, id));
    return NextResponse.json({ message: 'Activity type deleted' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete activity type' }, { status: 500 });
  }
}

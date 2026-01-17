import { NextRequest, NextResponse } from 'next/server';
import { db, swimlanes } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');

    // Sort by sortOrder to maintain user-defined ordering
    const swimlaneList = calendarId
      ? await db.select().from(swimlanes).where(eq(swimlanes.calendarId, calendarId)).orderBy(asc(swimlanes.sortOrder))
      : await db.select().from(swimlanes).orderBy(asc(swimlanes.sortOrder));

    return NextResponse.json({ swimlanes: swimlaneList });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch swimlanes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, calendarId, budget, sortOrder } = await request.json();
    if (!name || !calendarId) {
      return NextResponse.json({ error: 'Name and calendarId are required' }, { status: 400 });
    }

    const [newSwimlane] = await db.insert(swimlanes).values({
      name,
      calendarId,
      budget: budget?.toString(),
      sortOrder: sortOrder?.toString() || '0',
    }).returning();

    return NextResponse.json({ swimlane: newSwimlane }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create swimlane' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, budget, sortOrder } = await request.json();
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (budget !== undefined) updateData.budget = budget?.toString();
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder?.toString();

    const [updated] = await db.update(swimlanes).set(updateData).where(eq(swimlanes.id, id)).returning();
    return NextResponse.json({ swimlane: updated });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update swimlane' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.delete(swimlanes).where(eq(swimlanes.id, id));
    return NextResponse.json({ message: 'Swimlane deleted' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete swimlane' }, { status: 500 });
  }
}

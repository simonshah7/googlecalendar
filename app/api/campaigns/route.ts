import { NextRequest, NextResponse } from 'next/server';
import { db, campaigns } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');

    const campaignList = calendarId
      ? await db.select().from(campaigns).where(eq(campaigns.calendarId, calendarId))
      : await db.select().from(campaigns);

    return NextResponse.json({ campaigns: campaignList });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, calendarId } = await request.json();
    if (!name || !calendarId) {
      return NextResponse.json({ error: 'Name and calendarId are required' }, { status: 400 });
    }

    const [newCampaign] = await db.insert(campaigns).values({ name, calendarId }).returning();
    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name } = await request.json();
    const [updated] = await db.update(campaigns).set({ name }).where(eq(campaigns.id, id)).returning();
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.delete(campaigns).where(eq(campaigns.id, id));
    return NextResponse.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}

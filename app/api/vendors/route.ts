import { NextRequest, NextResponse } from 'next/server';
import { db, vendors } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const vendorList = await db.select().from(vendors);
    return NextResponse.json({ vendors: vendorList });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const [newVendor] = await db.insert(vendors).values({ name }).returning();
    return NextResponse.json({ vendor: newVendor }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name } = await request.json();
    const [updated] = await db.update(vendors).set({ name }).where(eq(vendors.id, id)).returning();
    return NextResponse.json({ vendor: updated });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.delete(vendors).where(eq(vendors.id, id));
    return NextResponse.json({ message: 'Vendor deleted' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}

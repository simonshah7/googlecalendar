import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db, calendars, activities, swimlanes, campaigns, activityTypes, vendors } from '@/db';
import { eq } from 'drizzle-orm';
import AppShell from '@/components/AppShell';
import { UserRole, CampaignStatus, Currency, Region } from '@/types';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch initial data for the user
  const userCalendars = user.role === 'User'
    ? await db.select().from(calendars).where(eq(calendars.ownerId, user.id))
    : await db.select().from(calendars);

  // If user has no calendars, create a default one
  let activeCalendarId: string;
  if (userCalendars.length === 0) {
    const [newCalendar] = await db
      .insert(calendars)
      .values({
        name: 'Main Roadmap',
        ownerId: user.id,
        isTemplate: false,
      })
      .returning();

    // Create default swimlanes
    await db.insert(swimlanes).values([
      { name: 'Content Marketing', calendarId: newCalendar.id, sortOrder: '0' },
      { name: 'Events', calendarId: newCalendar.id, sortOrder: '1' },
      { name: 'ABM Campaigns', calendarId: newCalendar.id, sortOrder: '2' },
    ]);

    activeCalendarId = newCalendar.id;
    userCalendars.push(newCalendar);
  } else {
    activeCalendarId = userCalendars[0].id;
  }

  // Fetch all related data
  const [allActivities, allSwimlanes, allCampaigns, allActivityTypes, allVendors] = await Promise.all([
    db.select().from(activities).where(eq(activities.calendarId, activeCalendarId)),
    db.select().from(swimlanes).where(eq(swimlanes.calendarId, activeCalendarId)),
    db.select().from(campaigns).where(eq(campaigns.calendarId, activeCalendarId)),
    db.select().from(activityTypes),
    db.select().from(vendors),
  ]);

  // Map DB role to enum
  const roleMap: Record<string, UserRole> = {
    'User': UserRole.USER,
    'Manager': UserRole.MANAGER,
    'Admin': UserRole.ADMIN,
  };

  return (
    <AppShell
      initialUser={{
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleMap[user.role] || UserRole.USER,
        avatarUrl: user.avatarUrl || undefined,
      }}
      initialCalendars={userCalendars.map(c => ({
        id: c.id,
        name: c.name,
        ownerId: c.ownerId,
        createdAt: c.createdAt.toISOString(),
        isTemplate: c.isTemplate,
      }))}
      initialActiveCalendarId={activeCalendarId}
      initialActivities={allActivities.map(a => ({
        id: a.id,
        title: a.title,
        typeId: a.typeId || '',
        campaignId: a.campaignId || '',
        swimlaneId: a.swimlaneId,
        calendarId: a.calendarId,
        startDate: a.startDate,
        endDate: a.endDate,
        status: a.status as CampaignStatus,
        description: a.description || '',
        tags: a.tags || '',
        cost: parseFloat(a.cost || '0'),
        currency: a.currency as Currency,
        vendorId: a.vendorId || '',
        expectedSAOs: parseFloat(a.expectedSAOs || '0'),
        actualSAOs: parseFloat(a.actualSAOs || '0'),
        region: a.region as Region,
        dependencies: a.dependencies || [],
        attachments: (a.attachments || []).map(att => ({
          ...att,
          type: att.type as 'pdf' | 'doc' | 'sheet' | 'image' | 'link'
        })),
        color: a.color || undefined,
      }))}
      initialSwimlanes={allSwimlanes.map(s => ({
        id: s.id,
        name: s.name,
        budget: s.budget ? parseFloat(s.budget) : undefined,
        calendarId: s.calendarId,
      }))}
      initialCampaigns={allCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        calendarId: c.calendarId,
      }))}
      initialActivityTypes={allActivityTypes.map(t => ({
        id: t.id,
        name: t.name,
      }))}
      initialVendors={allVendors.map(v => ({
        id: v.id,
        name: v.name,
      }))}
    />
  );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Campaign, Swimlane, ActivityType, Vendor, CampaignStatus, Currency, Region, User, Calendar, UserRole } from '@/types';
import Header from '@/components/Header';
import TimelineView from '@/components/TimelineView';
import CalendarView from '@/components/CalendarView';
import TableView from '@/components/TableView';
import ActivityModal from '@/components/CampaignModal';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import FilterControls from '@/components/FilterControls';
import ManagerDashboard from '@/components/ManagerDashboard';
import ExportModal, { ExportConfig } from '@/components/ExportModal';
import CalendarSettingsModal from '@/components/CalendarSettingsModal';
import { CalendarPermission } from '@/types';

export type ViewType = 'timeline' | 'calendar' | 'table';

export type Filters = {
  search: string;
  campaignId: string;
  status: string;
  dateRange: string;
  startDate: string;
  endDate: string;
};

interface AppShellProps {
  initialUser: User;
  initialCalendars: Calendar[];
  initialActiveCalendarId: string;
  initialActivities: Activity[];
  initialSwimlanes: Swimlane[];
  initialCampaigns: Campaign[];
  initialActivityTypes: ActivityType[];
  initialVendors: Vendor[];
}

export default function AppShell({
  initialUser,
  initialCalendars,
  initialActiveCalendarId,
  initialActivities,
  initialSwimlanes,
  initialCampaigns,
  initialActivityTypes,
  initialVendors,
}: AppShellProps) {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [activeCalendarId, setActiveCalendarId] = useState<string>(initialActiveCalendarId);
  const [view, setView] = useState<ViewType>('timeline');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved preference, default to true (dark mode)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Data state
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [calendars, setCalendars] = useState<Calendar[]>(initialCalendars);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(initialSwimlanes);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(initialActivityTypes);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | Partial<Activity> | null>(null);
  const [permissions, setPermissions] = useState<CalendarPermission[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: '', campaignId: 'all', status: 'all', dateRange: 'all', startDate: '', endDate: '',
  });

  // Dark mode effect - also persists preference to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  // Load calendar data when active calendar changes
  useEffect(() => {
    async function loadCalendarData() {
      setIsSyncing(true);
      try {
        const res = await fetch(`/api/calendars/${activeCalendarId}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities.map(mapActivity));
          setSwimlanes(data.swimlanes.map(mapSwimlane));
          setCampaigns(data.campaigns.map(mapCampaign));
        }
      } catch (error) {
        console.error('Failed to load calendar data:', error);
      } finally {
        setIsSyncing(false);
      }
    }
    loadCalendarData();
  }, [activeCalendarId]);

  // Helper functions to map API responses to frontend types
  const mapActivity = (a: Record<string, unknown>): Activity => ({
    id: a.id as string,
    title: a.title as string,
    typeId: (a.typeId || '') as string,
    campaignId: (a.campaignId || '') as string,
    swimlaneId: a.swimlaneId as string,
    calendarId: a.calendarId as string,
    startDate: a.startDate as string,
    endDate: a.endDate as string,
    status: a.status as CampaignStatus,
    description: (a.description || '') as string,
    tags: (a.tags || '') as string,
    cost: parseFloat((a.cost || '0') as string),
    currency: (a.currency || Currency.USD) as Currency,
    vendorId: (a.vendorId || '') as string,
    expectedSAOs: parseFloat((a.expectedSAOs || '0') as string),
    actualSAOs: parseFloat((a.actualSAOs || '0') as string),
    region: (a.region || Region.US) as Region,
    dependencies: (a.dependencies || []) as string[],
    attachments: (a.attachments || []) as Activity['attachments'],
    color: a.color as string | undefined,
  });

  const mapSwimlane = (s: Record<string, unknown>): Swimlane => ({
    id: s.id as string,
    name: s.name as string,
    budget: s.budget ? parseFloat(s.budget as string) : undefined,
    calendarId: s.calendarId as string,
  });

  const mapCampaign = (c: Record<string, unknown>): Campaign => ({
    id: c.id as string,
    name: c.name as string,
    calendarId: c.calendarId as string,
  });

  // Activity handlers
  const handleSaveActivity = async (activity: Activity) => {
    setIsSyncing(true);
    try {
      if (activity.id) {
        const res = await fetch(`/api/activities/${activity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activity),
        });
        if (res.ok) {
          const { activity: updated } = await res.json();
          setActivities(prev => prev.map(a => a.id === updated.id ? mapActivity(updated) : a));
        }
      } else {
        const res = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...activity, calendarId: activeCalendarId }),
        });
        if (res.ok) {
          const { activity: created } = await res.json();
          setActivities(prev => [...prev, mapActivity(created)]);
        }
      }
    } catch (error) {
      console.error('Failed to save activity:', error);
    } finally {
      setIsSyncing(false);
      setIsModalOpen(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete activity:', error);
    } finally {
      setIsSyncing(false);
      setIsModalOpen(false);
    }
  };

  // Campaign handlers
  const handleAddCampaign = async (name: string) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, calendarId: activeCalendarId }),
      });
      if (res.ok) {
        const { campaign } = await res.json();
        setCampaigns(prev => [...prev, mapCampaign(campaign)]);
      }
    } catch (error) {
      console.error('Failed to add campaign:', error);
    }
  };

  const handleUpdateCampaign = async (campaign: Campaign) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c));
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  // Swimlane handlers
  const handleAddSwimlane = async () => {
    try {
      const res = await fetch('/api/swimlanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Lane', calendarId: activeCalendarId }),
      });
      if (res.ok) {
        const { swimlane } = await res.json();
        setSwimlanes(prev => [...prev, mapSwimlane(swimlane)]);
      }
    } catch (error) {
      console.error('Failed to add swimlane:', error);
    }
  };

  const handleUpdateSwimlane = async (swimlane: Swimlane) => {
    try {
      await fetch('/api/swimlanes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swimlane),
      });
      setSwimlanes(prev => prev.map(s => s.id === swimlane.id ? swimlane : s));
    } catch (error) {
      console.error('Failed to update swimlane:', error);
    }
  };

  const handleDeleteSwimlane = async (id: string) => {
    try {
      await fetch(`/api/swimlanes?id=${id}`, { method: 'DELETE' });
      setSwimlanes(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete swimlane:', error);
    }
  };

  // Calendar handlers
  const handleAddCalendar = async (name: string) => {
    try {
      const res = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const { calendar } = await res.json();
        setCalendars(prev => [...prev, {
          id: calendar.id,
          name: calendar.name,
          ownerId: calendar.ownerId,
          createdAt: calendar.createdAt,
          isTemplate: calendar.isTemplate,
        }]);
        setActiveCalendarId(calendar.id);
        setIsWorkspaceOpen(false);
      }
    } catch (error) {
      console.error('Failed to add calendar:', error);
    }
  };

  const handleDeleteCalendar = async (id: string) => {
    if (calendars.length <= 1) {
      alert('Cannot delete the last calendar');
      return;
    }
    try {
      await fetch(`/api/calendars/${id}`, { method: 'DELETE' });
      setCalendars(prev => prev.filter(c => c.id !== id));
      if (activeCalendarId === id) {
        const remaining = calendars.filter(c => c.id !== id);
        if (remaining.length > 0) setActiveCalendarId(remaining[0].id);
      }
    } catch (error) {
      console.error('Failed to delete calendar:', error);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  };

  // Export handler
  const handleExport = async (config: ExportConfig) => {
    setIsExportOpen(false);
    setIsSyncing(true);

    try {
      // For CSV export, generate and download immediately
      if (config.format === 'csv') {
        const headers = ['Title', 'Start Date', 'End Date', 'Status', 'Swimlane', 'Campaign', 'Cost', 'Currency'];
        const rows = filteredActivities.map(a => [
          a.title,
          a.startDate,
          a.endDate,
          a.status,
          swimlanes.find(s => s.id === a.swimlaneId)?.name || '',
          campaigns.find(c => c.id === a.campaignId)?.name || '',
          a.cost.toString(),
          a.currency
        ]);
        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campaign-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // For image-based exports, use html2canvas on the timeline
        const { default: html2canvas } = await import('html2canvas');
        const timeline = document.querySelector('.timeline-container') as HTMLElement;
        if (timeline) {
          const canvas = await html2canvas(timeline, {
            scale: 2,
            backgroundColor: isDarkMode ? '#0B0E14' : '#ffffff'
          });
          const link = document.createElement('a');
          link.download = `campaign-export-${new Date().toISOString().split('T')[0]}.${config.format === 'pdf' ? 'png' : config.format}`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Calendar update handler
  const handleUpdateCalendar = async (calendar: Calendar) => {
    try {
      const res = await fetch(`/api/calendars/${calendar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: calendar.name }),
      });
      if (res.ok) {
        setCalendars(prev => prev.map(c => c.id === calendar.id ? calendar : c));
      }
    } catch (error) {
      console.error('Failed to update calendar:', error);
    }
  };

  // Filter logic
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!a.title.toLowerCase().includes(searchLower) && !a.description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (filters.status !== 'all' && a.status !== filters.status) return false;
      if (filters.campaignId !== 'all' && a.campaignId !== filters.campaignId) return false;
      if (filters.startDate && a.endDate < filters.startDate) return false;
      if (filters.endDate && a.startDate > filters.endDate) return false;
      return true;
    });
  }, [activities, filters]);

  const activeCalendarName = calendars.find(c => c.id === activeCalendarId)?.name || 'Main Roadmap';
  const isManager = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-valuenova-bg transition-colors flex flex-col">
      <Header
        onAddActivityClick={() => { setEditingActivity(null); setIsModalOpen(true); }}
        currentView={view}
        onViewChange={setView}
        onExportClick={() => setIsExportOpen(true)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        activeCalendarName={activeCalendarName}
        onCalendarSwitchClick={() => setIsWorkspaceOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onAdminClick={() => isManager && setIsAdminOpen(true)}
        user={currentUser}
        onLogout={handleLogout}
        isSyncing={isSyncing}
        lastSync={null}
      />

      <div className="px-4 pt-4">
        <FilterControls
          filters={filters}
          onFilterChange={setFilters}
          campaigns={campaigns}
        />
      </div>

      <main className="flex-grow p-4 relative overflow-hidden">
        <div className="h-full border border-gray-200 dark:border-valuenova-border rounded-xl bg-white dark:bg-valuenova-surface/30 overflow-auto">
          {view === 'timeline' && (
            <TimelineView
              activities={filteredActivities}
              swimlanes={swimlanes}
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
              onUpdate={handleSaveActivity}
              onDeleteActivity={handleDeleteActivity}
              onAddSwimlane={handleAddSwimlane}
              onUpdateSwimlane={handleUpdateSwimlane}
              onDeleteSwimlane={handleDeleteSwimlane}
              onReorderSwimlanes={setSwimlanes}
              onQuickAdd={(s, e, sw) => handleSaveActivity({
                id: '',
                title: 'New Activity',
                startDate: s,
                endDate: e,
                swimlaneId: sw,
                calendarId: activeCalendarId,
                status: CampaignStatus.Considering,
                cost: 0,
                currency: Currency.USD,
                region: Region.US,
                typeId: activityTypes[0]?.id || '',
                campaignId: campaigns[0]?.id || '',
                description: '',
                tags: '',
                vendorId: vendors[0]?.id || '',
                expectedSAOs: 0,
                actualSAOs: 0,
              })}
              onDuplicate={(id) => {
                const a = activities.find(x => x.id === id);
                if (a) handleSaveActivity({ ...a, id: '', title: `${a.title} (Copy)` });
              }}
              readOnly={false}
            />
          )}
          {view === 'calendar' && (
            <CalendarView
              activities={filteredActivities}
              swimlanes={swimlanes}
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
            />
          )}
          {view === 'table' && (
            <TableView
              activities={filteredActivities}
              campaigns={campaigns}
              activityTypes={activityTypes}
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
              onDuplicate={(id) => {
                const a = activities.find(x => x.id === id);
                if (a) handleSaveActivity({ ...a, id: '', title: `${a.title} (Copy)` });
              }}
              onDelete={handleDeleteActivity}
              exchangeRates={{ [Currency.USD]: 1, [Currency.EUR]: 0.92, [Currency.GBP]: 0.79 }}
              displayCurrency={Currency.USD}
            />
          )}
        </div>
      </main>

      {isModalOpen && (
        <ActivityModal
          activity={editingActivity}
          campaigns={campaigns}
          swimlanes={swimlanes}
          activityTypes={activityTypes}
          vendors={vendors}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveActivity}
          onDelete={handleDeleteActivity}
          onAddCampaign={handleAddCampaign}
          onUpdateCampaign={handleUpdateCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onAddActivityType={async (name) => {
            const res = await fetch('/api/activity-types', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            });
            if (res.ok) {
              const { activityType } = await res.json();
              setActivityTypes(prev => [...prev, { id: activityType.id, name: activityType.name }]);
            }
          }}
          onUpdateActivityType={async (type) => {
            await fetch('/api/activity-types', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(type),
            });
            setActivityTypes(prev => prev.map(t => t.id === type.id ? type : t));
          }}
          onDeleteActivityType={async (id) => {
            await fetch(`/api/activity-types?id=${id}`, { method: 'DELETE' });
            setActivityTypes(prev => prev.filter(t => t.id !== id));
          }}
          onAddVendor={async (name) => {
            const res = await fetch('/api/vendors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            });
            if (res.ok) {
              const { vendor } = await res.json();
              setVendors(prev => [...prev, { id: vendor.id, name: vendor.name }]);
            }
          }}
          onUpdateVendor={async (vendor) => {
            await fetch('/api/vendors', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(vendor),
            });
            setVendors(prev => prev.map(v => v.id === vendor.id ? vendor : v));
          }}
          onDeleteVendor={async (id) => {
            await fetch(`/api/vendors?id=${id}`, { method: 'DELETE' });
            setVendors(prev => prev.filter(v => v.id !== id));
          }}
          isCampaignInUse={(id) => activities.some(a => a.campaignId === id)}
          isActivityTypeInUse={(id) => activities.some(a => a.typeId === id)}
          isVendorInUse={(id) => activities.some(a => a.vendorId === id)}
          allActivities={activities}
          readOnly={false}
        />
      )}

      {isWorkspaceOpen && (
        <WorkspaceSwitcher
          calendars={calendars}
          activeCalendarId={activeCalendarId}
          onSwitch={(id) => { setActiveCalendarId(id); setIsWorkspaceOpen(false); }}
          onClose={() => setIsWorkspaceOpen(false)}
          onAddCalendar={handleAddCalendar}
          onDeleteCalendar={handleDeleteCalendar}
          user={currentUser}
          permissions={permissions}
        />
      )}

      {isExportOpen && (
        <ExportModal
          onClose={() => setIsExportOpen(false)}
          onStartExport={handleExport}
        />
      )}

      {isSettingsOpen && calendars.find(c => c.id === activeCalendarId) && (
        <CalendarSettingsModal
          calendar={calendars.find(c => c.id === activeCalendarId)!}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={handleUpdateCalendar}
          onDelete={(id) => { handleDeleteCalendar(id); setIsSettingsOpen(false); }}
          permissions={permissions}
          onUpdatePermissions={setPermissions}
          currentUser={currentUser}
        />
      )}

      {isAdminOpen && isManager && (
        <ManagerDashboard
          onClose={() => setIsAdminOpen(false)}
          users={[currentUser]}
          onUpdateUsers={() => {}}
          calendars={calendars}
          onUpdateCalendars={setCalendars}
          activities={activities}
          onCalendarAction={(calId) => {
            setActiveCalendarId(calId);
            setIsAdminOpen(false);
          }}
        />
      )}
    </div>
  );
}

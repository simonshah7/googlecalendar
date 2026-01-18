'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | Partial<Activity> | null>(null);
  const [permissions, setPermissions] = useState<CalendarPermission[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
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

  // Load permissions when calendar changes
  useEffect(() => {
    async function loadPermissions() {
      try {
        const res = await fetch(`/api/calendar-permissions?calendarId=${activeCalendarId}`);
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions.map((p: Record<string, unknown>) => ({
            calendarId: p.calendarId as string,
            userId: p.userId as string,
            accessType: p.accessType as 'view' | 'edit' | 'copy',
          })));
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    }
    if (activeCalendarId) loadPermissions();
  }, [activeCalendarId]);

  // Load all users for admin dashboard (managers/admins only)
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    }
    if (currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN) {
      loadUsers();
    }
  }, [currentUser?.role]);

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
      return;
    }

    // Don't trigger if any modal is open (except for Escape)
    const anyModalOpen = isModalOpen || isWorkspaceOpen || isAdminOpen || isExportOpen || isSettingsOpen || isHelpOpen;

    switch (e.key.toLowerCase()) {
      case '1':
        if (!anyModalOpen) setView('timeline');
        break;
      case '2':
        if (!anyModalOpen) setView('calendar');
        break;
      case '3':
        if (!anyModalOpen) setView('table');
        break;
      case 'n':
        if (!anyModalOpen) { setEditingActivity(null); setIsModalOpen(true); }
        break;
      case 'e':
        if (!anyModalOpen) setIsExportOpen(true);
        break;
      case 'd':
        if (!anyModalOpen) setIsDarkMode(prev => !prev);
        break;
      case '?':
        if (!anyModalOpen) setIsHelpOpen(true);
        break;
      case 'escape':
        // Close any open modal
        if (isHelpOpen) setIsHelpOpen(false);
        else if (isExportOpen) setIsExportOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isAdminOpen) setIsAdminOpen(false);
        else if (isWorkspaceOpen) setIsWorkspaceOpen(false);
        else if (isModalOpen) setIsModalOpen(false);
        break;
    }
  }, [isModalOpen, isWorkspaceOpen, isAdminOpen, isExportOpen, isSettingsOpen, isHelpOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

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

  // Helper function to convert modern CSS color functions to RGB for html2canvas compatibility
  // html2canvas doesn't support modern CSS color functions like lab(), oklch(), oklab(), lch()
  // which are used by Tailwind CSS v4. This function applies all computed color values as
  // inline styles and sanitizes stylesheets to prevent parsing errors.
  const convertModernColorsToRgb = (clonedDoc: Document, element: HTMLElement) => {
    const colorProperties = [
      'color', 'backgroundColor', 'borderColor', 'borderTopColor',
      'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'outlineColor', 'textDecorationColor', 'caretColor', 'fill', 'stroke'
    ];

    const processElement = (el: Element) => {
      if (!(el instanceof HTMLElement)) return;

      const computedStyle = clonedDoc.defaultView?.getComputedStyle(el) || window.getComputedStyle(el);

      // Apply all color properties as inline styles with computed RGB values
      colorProperties.forEach(prop => {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const value = computedStyle.getPropertyValue(cssProp);
        if (value && value !== 'none' && value !== 'transparent' && value !== '') {
          // Force override with computed value (browsers compute to RGB)
          el.style.setProperty(cssProp, value, 'important');
        }
      });

      // Also handle box-shadow and text-shadow which may contain colors
      const boxShadow = computedStyle.getPropertyValue('box-shadow');
      if (boxShadow && boxShadow !== 'none') {
        el.style.setProperty('box-shadow', boxShadow, 'important');
      }
      const textShadow = computedStyle.getPropertyValue('text-shadow');
      if (textShadow && textShadow !== 'none') {
        el.style.setProperty('text-shadow', textShadow, 'important');
      }

      // Process children
      Array.from(el.children).forEach(child => processElement(child));
    };

    processElement(element);

    // Sanitize stylesheets by removing rules that contain unsupported color functions
    // This is safer than removing all stylesheets as it preserves layout and other styles
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach(styleEl => {
      try {
        const cssText = styleEl.textContent || '';
        // Remove any rules containing modern color functions that html2canvas can't parse
        const sanitizedCss = cssText.replace(
          /[^{}]*\{[^{}]*(lab|oklch|oklab|lch)\s*\([^)]*\)[^{}]*\}/gi,
          ''
        );
        styleEl.textContent = sanitizedCss;
      } catch {
        // If we can't modify the stylesheet, remove it
        styleEl.remove();
      }
    });
  };

  // Export handler
  const handleExport = async (config: ExportConfig) => {
    setIsExportOpen(false);
    setIsSyncing(true);

    try {
      // Filter activities by date range if specified
      let exportActivities = filteredActivities;
      const year = config.year || new Date().getFullYear();

      if (config.type === 'monthly' && config.selectedPeriods.length > 0) {
        exportActivities = filteredActivities.filter(a => {
          const startMonth = new Date(a.startDate).getMonth() + 1;
          const endMonth = new Date(a.endDate).getMonth() + 1;
          return config.selectedPeriods.some(p => {
            const month = parseInt(p);
            return startMonth <= month && endMonth >= month;
          });
        });
      } else if (config.type === 'quarterly' && config.selectedPeriods.length > 0) {
        const quarterMonths: Record<string, number[]> = {
          'Q1': [1, 2, 3], 'Q2': [4, 5, 6], 'Q3': [7, 8, 9], 'Q4': [10, 11, 12]
        };
        exportActivities = filteredActivities.filter(a => {
          const startMonth = new Date(a.startDate).getMonth() + 1;
          const endMonth = new Date(a.endDate).getMonth() + 1;
          return config.selectedPeriods.some(q => {
            const months = quarterMonths[q] || [];
            return months.some(m => startMonth <= m && endMonth >= m);
          });
        });
      } else if (config.type === 'custom' && config.startDate && config.endDate) {
        exportActivities = filteredActivities.filter(a => {
          return a.endDate >= config.startDate! && a.startDate <= config.endDate!;
        });
      }

      // For CSV export, generate and download immediately
      if (config.format === 'csv') {
        const headers = ['Title', 'Start Date', 'End Date', 'Status', 'Swimlane', 'Campaign', 'Cost', 'Currency', 'Region', 'Description'];
        const rows = exportActivities.map(a => [
          a.title,
          a.startDate,
          a.endDate,
          a.status,
          swimlanes.find(s => s.id === a.swimlaneId)?.name || '',
          campaigns.find(c => c.id === a.campaignId)?.name || '',
          a.cost.toString(),
          a.currency,
          a.region,
          a.description || ''
        ]);
        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campaign-export-${config.type}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // For image-based exports, use html2canvas on the timeline
        const { default: html2canvas } = await import('html2canvas');
        const timeline = document.querySelector('.timeline-container') as HTMLElement;
        if (timeline) {
          // Store original scroll position
          const originalScrollLeft = timeline.scrollLeft;
          const originalScrollTop = timeline.scrollTop;

          // For better export, temporarily scroll to show full timeline
          timeline.scrollLeft = 0;
          timeline.scrollTop = 0;

          const canvas = await html2canvas(timeline, {
            scale: config.format === 'slides' ? 3 : 2,
            backgroundColor: isDarkMode ? '#0B0E14' : '#ffffff',
            useCORS: true,
            logging: false,
            windowWidth: timeline.scrollWidth,
            windowHeight: timeline.scrollHeight,
            onclone: (clonedDoc) => {
              // Convert modern CSS color functions (lab, oklch, etc.) to RGB
              // This fixes html2canvas compatibility with Tailwind CSS v4
              const clonedTimeline = clonedDoc.querySelector('.timeline-container') as HTMLElement;
              if (clonedTimeline) {
                convertModernColorsToRgb(clonedDoc, clonedTimeline);
              }
            },
          });

          // Restore scroll position
          timeline.scrollLeft = originalScrollLeft;
          timeline.scrollTop = originalScrollTop;

          const link = document.createElement('a');
          const extension = config.format === 'pdf' ? 'png' : config.format === 'slides' ? 'png' : config.format;
          link.download = `campaign-report-${config.type}-${year}-${new Date().toISOString().split('T')[0]}.${extension}`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
        } else {
          throw new Error('Timeline container not found. Please switch to Timeline view to export.');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(error instanceof Error ? error.message : 'Export failed. Please try again.');
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

  // User update handler (for admin dashboard)
  const handleUpdateUser = async (userId: string, updates: { role?: string; name?: string }) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...updates }),
      });
      if (res.ok) {
        const { user: updatedUser } = await res.json();
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatedUser } : u));
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  // Wrapper for ManagerDashboard user updates (detects changes and calls API)
  const handleUsersUpdateFromDashboard = (newUsers: User[]) => {
    // Find which user changed and update via API
    for (const newUser of newUsers) {
      const oldUser = allUsers.find(u => u.id === newUser.id);
      if (oldUser && oldUser.role !== newUser.role) {
        handleUpdateUser(newUser.id, { role: newUser.role });
        break;
      }
      if (oldUser && oldUser.name !== newUser.name) {
        handleUpdateUser(newUser.id, { name: newUser.name });
        break;
      }
    }
    // Update local state immediately for responsive UI
    setAllUsers(newUsers);
  };

  // Permission handlers for CalendarSettingsModal
  const handleAddPermission = async (email: string, accessType: 'view' | 'edit' | 'copy' = 'view') => {
    try {
      const res = await fetch('/api/calendar-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: activeCalendarId, email, accessType }),
      });
      if (res.ok) {
        const { permission } = await res.json();
        setPermissions(prev => [...prev, {
          calendarId: permission.calendarId,
          userId: permission.userId,
          accessType: permission.accessType,
        }]);
        return { success: true };
      } else {
        const error = await res.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Failed to add permission:', error);
      return { success: false, error: 'Network error' };
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
              onQuickAdd={(date, swimlaneId) => handleSaveActivity({
                id: '',
                title: 'New Activity',
                startDate: date,
                endDate: date,
                swimlaneId: swimlaneId || swimlanes[0]?.id || '',
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
            />
          )}
          {view === 'table' && (
            <TableView
              activities={filteredActivities}
              campaigns={campaigns}
              activityTypes={activityTypes}
              swimlanes={swimlanes}
              vendors={vendors}
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
          users={allUsers.length > 0 ? allUsers : [currentUser]}
          onUpdateUsers={handleUsersUpdateFromDashboard}
          calendars={calendars}
          onUpdateCalendars={setCalendars}
          activities={activities}
          onCalendarAction={(calId) => {
            setActiveCalendarId(calId);
            setIsAdminOpen(false);
          }}
        />
      )}

      <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

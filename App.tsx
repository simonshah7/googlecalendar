import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Activity, Campaign, Swimlane, ActivityType, Vendor, CampaignStatus, Currency, Region, User, Calendar, UserRole } from './types';
import { INITIAL_ACTIVITIES, INITIAL_CAMPAIGNS, INITIAL_SWIMLANES, INITIAL_ACTIVITY_TYPES, INITIAL_VENDORS } from './constants';
import Header from './components/Header';
import TimelineView from './components/TimelineView';
import CalendarView from './components/CalendarView';
import TableView from './components/TableView';
import ActivityModal from './components/CampaignModal';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import LoginOverlay from './components/LoginOverlay';
import FilterControls from './components/FilterControls';
import ExportModal, { ExportConfig } from './components/ExportModal';
import ExportPreview from './components/ExportPreview';
import ManagerDashboard from './components/ManagerDashboard';

export type ViewType = 'timeline' | 'calendar' | 'table';

export type Filters = {
  search: string;
  campaignId: string;
  status: string;
  dateRange: string;
  startDate: string;
  endDate: string;
};

// Preset users for the system
const PRESET_USERS: User[] = [
  { id: 'u1', email: 'manager@company.com', name: 'Alex Manager', role: UserRole.MANAGER },
  { id: 'u2', email: 'user@company.com', name: 'Jordan User', role: UserRole.USER }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeCalendarId, setActiveCalendarId] = useState<string>('cal1');
  const [view, setView] = useState<ViewType>('timeline');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // ============ DATA STATE WITH LOCAL STORAGE ============

  // Activities
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('campaignos_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  // Campaigns (P1.1)
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('campaignos_campaigns');
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });

  // Swimlanes
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(() => {
    const saved = localStorage.getItem('campaignos_swimlanes');
    return saved ? JSON.parse(saved) : INITIAL_SWIMLANES;
  });

  // Activity Types (P1.2)
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(() => {
    const saved = localStorage.getItem('campaignos_activityTypes');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_TYPES;
  });

  // Vendors (P1.3)
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const saved = localStorage.getItem('campaignos_vendors');
    return saved ? JSON.parse(saved) : INITIAL_VENDORS;
  });

  // Calendars (P1.4)
  const [calendars, setCalendars] = useState<Calendar[]>(() => {
    const saved = localStorage.getItem('campaignos_calendars');
    return saved ? JSON.parse(saved) : [
      { id: 'cal1', name: 'Main Roadmap', ownerId: 'u1', createdAt: new Date().toISOString(), isTemplate: false }
    ];
  });

  // Users for admin dashboard
  const [users, setUsers] = useState<User[]>(PRESET_USERS);

  // ============ UI STATE ============
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | Partial<Activity> | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '', campaignId: 'all', status: 'all', dateRange: 'all', startDate: '', endDate: '',
  });

  // Export state
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // ============ LOCAL STORAGE PERSISTENCE ============
  useEffect(() => {
    localStorage.setItem('campaignos_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('campaignos_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem('campaignos_swimlanes', JSON.stringify(swimlanes));
  }, [swimlanes]);

  useEffect(() => {
    localStorage.setItem('campaignos_activityTypes', JSON.stringify(activityTypes));
  }, [activityTypes]);

  useEffect(() => {
    localStorage.setItem('campaignos_vendors', JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem('campaignos_calendars', JSON.stringify(calendars));
  }, [calendars]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // ============ ACTIVITY HANDLERS ============
  const handleSaveActivity = (activity: Activity) => {
    if (activity.id) {
      setActivities(prev => prev.map(a => a.id === activity.id ? activity : a));
    } else {
      const newAct = { ...activity, id: crypto.randomUUID(), calendarId: activeCalendarId };
      setActivities(prev => [...prev, newAct]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    setIsModalOpen(false);
  };

  // ============ CAMPAIGN HANDLERS (P1.1) ============
  const handleAddCampaign = (name: string) => {
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      name,
      calendarId: activeCalendarId
    };
    setCampaigns(prev => [...prev, newCampaign]);
  };

  const handleUpdateCampaign = (campaign: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c));
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const isCampaignInUse = (id: string) => activities.some(a => a.campaignId === id);

  // ============ ACTIVITY TYPE HANDLERS (P1.2) ============
  const handleAddActivityType = (name: string) => {
    const newType: ActivityType = {
      id: crypto.randomUUID(),
      name
    };
    setActivityTypes(prev => [...prev, newType]);
  };

  const handleUpdateActivityType = (activityType: ActivityType) => {
    setActivityTypes(prev => prev.map(t => t.id === activityType.id ? activityType : t));
  };

  const handleDeleteActivityType = (id: string) => {
    setActivityTypes(prev => prev.filter(t => t.id !== id));
  };

  const isActivityTypeInUse = (id: string) => activities.some(a => a.typeId === id);

  // ============ VENDOR HANDLERS (P1.3) ============
  const handleAddVendor = (name: string) => {
    const newVendor: Vendor = {
      id: crypto.randomUUID(),
      name
    };
    setVendors(prev => [...prev, newVendor]);
  };

  const handleUpdateVendor = (vendor: Vendor) => {
    setVendors(prev => prev.map(v => v.id === vendor.id ? vendor : v));
  };

  const handleDeleteVendor = (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  const isVendorInUse = (id: string) => activities.some(a => a.vendorId === id);

  // ============ CALENDAR HANDLERS (P1.4) ============
  const handleAddCalendar = (name: string) => {
    if (!currentUser) return;
    const newCalendar: Calendar = {
      id: crypto.randomUUID(),
      name,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
      isTemplate: false
    };
    setCalendars(prev => [...prev, newCalendar]);
    setActiveCalendarId(newCalendar.id);
    setIsWorkspaceOpen(false);
  };

  const handleDeleteCalendar = (id: string) => {
    // Don't delete the last calendar
    if (calendars.length <= 1) {
      alert('Cannot delete the last calendar');
      return;
    }
    // Remove calendar and associated activities
    setCalendars(prev => prev.filter(c => c.id !== id));
    setActivities(prev => prev.filter(a => a.calendarId !== id));
    setSwimlanes(prev => prev.filter(s => s.calendarId !== id));
    // Switch to another calendar if the active one was deleted
    if (activeCalendarId === id) {
      const remaining = calendars.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setActiveCalendarId(remaining[0].id);
      }
    }
  };

  // ============ EXPORT HANDLERS (P0.1) ============
  const handleStartExport = (config: ExportConfig) => {
    setExportConfig(config);
    setIsExportOpen(false);
  };

  const handleExportComplete = async () => {
    if (!exportRef.current || !exportConfig) return;

    try {
      // Dynamic import html2canvas for export
      const html2canvas = (await import('https://esm.sh/html2canvas@1.4.1')).default;

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      if (exportConfig.format === 'png' || exportConfig.format === 'slides') {
        const link = document.createElement('a');
        link.download = `campaignos-export-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (exportConfig.format === 'pdf') {
        // For PDF, we'll just download as PNG for now
        // Full PDF support would require jsPDF library
        const link = document.createElement('a');
        link.download = `campaignos-export-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (exportConfig.format === 'csv') {
        // CSV Export
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `campaignos-export-${Date.now()}.csv`;
        link.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback to CSV if image export fails
      if (exportConfig.format !== 'csv') {
        alert('Image export failed. Downloading as CSV instead.');
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `campaignos-export-${Date.now()}.csv`;
        link.click();
      }
    }

    setExportConfig(null);
  };

  const generateCSV = () => {
    const headers = ['Title', 'Campaign', 'Type', 'Start Date', 'End Date', 'Status', 'Cost', 'Currency', 'Region', 'Vendor', 'Description'];
    const rows = filteredActivities.map(a => [
      a.title,
      campaigns.find(c => c.id === a.campaignId)?.name || '',
      activityTypes.find(t => t.id === a.typeId)?.name || '',
      a.startDate,
      a.endDate,
      a.status,
      a.cost.toString(),
      a.currency,
      a.region,
      vendors.find(v => v.id === a.vendorId)?.name || '',
      a.description
    ]);
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  // Calculate export date range
  const getExportDateRange = () => {
    if (!exportConfig) return { start: '2025-01-01', end: '2025-12-31' };

    if (exportConfig.type === 'annual') {
      return { start: '2025-01-01', end: '2025-12-31' };
    }
    if (exportConfig.type === 'custom' && exportConfig.startDate && exportConfig.endDate) {
      return { start: exportConfig.startDate, end: exportConfig.endDate };
    }
    if (exportConfig.type === 'quarterly' && exportConfig.selectedPeriods.length > 0) {
      const quarters: Record<string, { start: string; end: string }> = {
        'Q1': { start: '2025-01-01', end: '2025-03-31' },
        'Q2': { start: '2025-04-01', end: '2025-06-30' },
        'Q3': { start: '2025-07-01', end: '2025-09-30' },
        'Q4': { start: '2025-10-01', end: '2025-12-31' }
      };
      const selectedQuarters = exportConfig.selectedPeriods.map(q => quarters[q]).filter(Boolean);
      if (selectedQuarters.length > 0) {
        const starts = selectedQuarters.map(q => q.start).sort();
        const ends = selectedQuarters.map(q => q.end).sort();
        return { start: starts[0], end: ends[ends.length - 1] };
      }
    }
    if (exportConfig.type === 'monthly' && exportConfig.selectedPeriods.length > 0) {
      const months = exportConfig.selectedPeriods.map(m => parseInt(m)).sort((a, b) => a - b);
      const startMonth = months[0];
      const endMonth = months[months.length - 1];
      const startDate = `2025-${String(startMonth).padStart(2, '0')}-01`;
      const endDate = new Date(2025, endMonth, 0).toISOString().split('T')[0];
      return { start: startDate, end: endDate };
    }
    return { start: '2025-01-01', end: '2025-12-31' };
  };

  // ============ FILTER LOGIC (P0.2 + P1.5) ============
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      // Calendar filter
      if (a.calendarId !== activeCalendarId) return false;

      // Search filter (search title and description)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(searchLower);
        const matchesDesc = a.description?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Status filter
      if (filters.status !== 'all' && a.status !== filters.status) return false;

      // Campaign filter (P1.5)
      if (filters.campaignId !== 'all' && a.campaignId !== filters.campaignId) return false;

      // Date range filter (P1.5)
      if (filters.startDate && a.endDate < filters.startDate) return false;
      if (filters.endDate && a.startDate > filters.endDate) return false;

      return true;
    });
  }, [activities, filters, activeCalendarId]);

  // Get active calendar name
  const activeCalendar = calendars.find(c => c.id === activeCalendarId);
  const activeCalendarName = activeCalendar?.name || 'Main Roadmap';

  // Check if user is manager
  const isManager = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;

  if (!currentUser) return <LoginOverlay onLogin={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-valuenova-bg transition-colors flex flex-col">
      <Header
        onAddActivityClick={() => { setEditingActivity(null); setIsModalOpen(true); }}
        currentView={view} onViewChange={setView}
        onExportClick={() => setIsExportOpen(true)}
        isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        activeCalendarName={activeCalendarName}
        onCalendarSwitchClick={() => setIsWorkspaceOpen(true)}
        onSettingsClick={() => {}}
        onAdminClick={() => isManager && setIsAdminOpen(true)}
        user={currentUser} onLogout={() => setCurrentUser(null)}
        isSyncing={false} lastSync={null}
      />

      {/* Filter Controls (P0.2) */}
      <div className="px-4 pt-4">
        <FilterControls
          filters={filters}
          onFilterChange={setFilters}
          campaigns={campaigns.filter(c => c.calendarId === activeCalendarId)}
        />
      </div>

      <main className="flex-grow p-4 relative overflow-hidden">
        <div className="h-full border border-gray-200 dark:border-valuenova-border rounded-xl bg-white dark:bg-valuenova-surface/30 overflow-auto">
          {view === 'timeline' && (
            <TimelineView
              activities={filteredActivities} swimlanes={swimlanes.filter(s => s.calendarId === activeCalendarId)}
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
              onUpdate={handleSaveActivity}
              onDeleteActivity={handleDeleteActivity}
              onAddSwimlane={() => {
                const ns = { id: crypto.randomUUID(), name: 'New Lane', calendarId: activeCalendarId };
                setSwimlanes(prev => [...prev, ns]);
              }}
              onUpdateSwimlane={(s) => setSwimlanes(prev => prev.map(x => x.id === s.id ? s : x))}
              onDeleteSwimlane={(id) => setSwimlanes(prev => prev.filter(x => x.id !== id))}
              onReorderSwimlanes={setSwimlanes}
              onQuickAdd={(s, e, sw) => handleSaveActivity({ id: '', title: 'New Activity', startDate: s, endDate: e, swimlaneId: sw, calendarId: activeCalendarId, status: CampaignStatus.Considering, cost: 0, currency: Currency.USD, region: Region.US, typeId: activityTypes[0]?.id || '', campaignId: campaigns[0]?.id || '', description: '', tags: '', vendorId: vendors[0]?.id || '', expectedSAOs: 0, actualSAOs: 0 })}
              onDuplicate={(id) => { const a = activities.find(x => x.id === id); if(a) handleSaveActivity({ ...a, id: '', title: `${a.title} (Copy)` }); }}
              readOnly={false}
            />
          )}
          {view === 'calendar' && (
            <CalendarView activities={filteredActivities} swimlanes={swimlanes.filter(s => s.calendarId === activeCalendarId)} onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }} />
          )}
          {view === 'table' && (
            <TableView
              activities={filteredActivities} campaigns={campaigns} activityTypes={activityTypes}
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
              onDuplicate={(id) => { const a = activities.find(x => x.id === id); if(a) handleSaveActivity({ ...a, id: '', title: `${a.title} (Copy)` }); }}
              onDelete={handleDeleteActivity}
              exchangeRates={{ [Currency.USD]: 1, [Currency.EUR]: 0.92, [Currency.GBP]: 0.79 }} displayCurrency={Currency.USD}
            />
          )}
        </div>
      </main>

      {/* Activity Modal */}
      {isModalOpen && (
        <ActivityModal
          activity={editingActivity}
          campaigns={campaigns.filter(c => c.calendarId === activeCalendarId)}
          swimlanes={swimlanes.filter(s => s.calendarId === activeCalendarId)}
          activityTypes={activityTypes}
          vendors={vendors}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveActivity}
          onDelete={handleDeleteActivity}
          onAddCampaign={handleAddCampaign}
          onUpdateCampaign={handleUpdateCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onAddActivityType={handleAddActivityType}
          onUpdateActivityType={handleUpdateActivityType}
          onDeleteActivityType={handleDeleteActivityType}
          onAddVendor={handleAddVendor}
          onUpdateVendor={handleUpdateVendor}
          onDeleteVendor={handleDeleteVendor}
          isCampaignInUse={isCampaignInUse}
          isActivityTypeInUse={isActivityTypeInUse}
          isVendorInUse={isVendorInUse}
          allActivities={activities}
          readOnly={false}
        />
      )}

      {/* Workspace Switcher (P1.4) */}
      {isWorkspaceOpen && (
        <WorkspaceSwitcher
          calendars={calendars}
          activeCalendarId={activeCalendarId}
          onSwitch={(id) => { setActiveCalendarId(id); setIsWorkspaceOpen(false); }}
          onClose={() => setIsWorkspaceOpen(false)}
          onAddCalendar={handleAddCalendar}
          onDeleteCalendar={handleDeleteCalendar}
          user={currentUser}
          permissions={[]}
        />
      )}

      {/* Export Modal (P0.1) */}
      {isExportOpen && (
        <ExportModal
          onClose={() => setIsExportOpen(false)}
          onStartExport={handleStartExport}
        />
      )}

      {/* Export Preview (hidden, used for rendering) */}
      {exportConfig && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Export Preview</h2>
                <p className="text-sm text-gray-500">Review before downloading</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setExportConfig(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportComplete}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  Download {exportConfig.format.toUpperCase()}
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto">
              <div className="transform scale-[0.4] origin-top-left">
                <ExportPreview
                  ref={exportRef}
                  activities={filteredActivities}
                  swimlanes={swimlanes.filter(s => s.calendarId === activeCalendarId)}
                  startDate={getExportDateRange().start}
                  endDate={getExportDateRange().end}
                  title={exportConfig.type === 'annual' ? 'Annual Report 2025' : `${exportConfig.type.charAt(0).toUpperCase() + exportConfig.type.slice(1)} Report`}
                  isAnnual={exportConfig.type === 'annual'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Dashboard (P0.3) */}
      {isAdminOpen && isManager && (
        <ManagerDashboard
          onClose={() => setIsAdminOpen(false)}
          users={users}
          onUpdateUsers={setUsers}
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
};

export default App;

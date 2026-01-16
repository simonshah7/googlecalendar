import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Campaign, Swimlane, ActivityType, Vendor, CampaignStatus, Currency, Region, User, Calendar } from './types';
import { INITIAL_ACTIVITIES, INITIAL_CAMPAIGNS, INITIAL_SWIMLANES, INITIAL_ACTIVITY_TYPES, INITIAL_VENDORS } from './constants';
import Header from './components/Header';
import TimelineView from './components/TimelineView';
import CalendarView from './components/CalendarView';
import TableView from './components/TableView';
import ActivityModal from './components/CampaignModal';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import LoginOverlay from './components/LoginOverlay';

export type ViewType = 'timeline' | 'calendar' | 'table';

export type Filters = {
  search: string;
  campaignId: string;
  status: string;
  dateRange: string;
  startDate: string;
  endDate: string;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeCalendarId, setActiveCalendarId] = useState<string>('cal1');
  const [view, setView] = useState<ViewType>('timeline');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Data State - Pure Local Storage
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('campaignos_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(INITIAL_SWIMLANES);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | Partial<Activity> | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '', campaignId: 'all', status: 'all', dateRange: 'all', startDate: '', endDate: '',
  });

  // Local Persistence
  useEffect(() => {
    localStorage.setItem('campaignos_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

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

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (a.calendarId !== activeCalendarId) return false;
      if (filters.search && !a.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status !== 'all' && a.status !== filters.status) return false;
      return true;
    });
  }, [activities, filters, activeCalendarId]);

  if (!currentUser) return <LoginOverlay onLogin={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-valuenova-bg transition-colors flex flex-col">
      <Header 
        onAddActivityClick={() => { setEditingActivity(null); setIsModalOpen(true); }} 
        currentView={view} onViewChange={setView}
        onExportClick={() => {}} 
        isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        activeCalendarName="Main Roadmap"
        onCalendarSwitchClick={() => setIsWorkspaceOpen(true)}
        onSettingsClick={() => {}}
        onAdminClick={() => {}}
        user={currentUser} onLogout={() => setCurrentUser(null)}
        isSyncing={false} lastSync={null}
      />

      <main className="flex-grow p-4 relative overflow-hidden">
        <div className="h-full border border-gray-200 dark:border-valuenova-border rounded-xl bg-white dark:bg-valuenova-surface/30 overflow-auto">
          {view === 'timeline' && (
            <TimelineView 
              activities={filteredActivities} swimlanes={swimlanes} 
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
              onQuickAdd={(s, e, sw) => handleSaveActivity({ id: '', title: 'New Activity', startDate: s, endDate: e, swimlaneId: sw, calendarId: activeCalendarId, status: CampaignStatus.Considering, cost: 0, currency: Currency.USD, region: Region.US, typeId: 'report', campaignId: campaigns[0]?.id || '', description: '', tags: '', vendorId: 'linkedin', expectedSAOs: 0, actualSAOs: 0 })}
              onDuplicate={(id) => { const a = activities.find(x => x.id === id); if(a) handleSaveActivity({ ...a, id: '', title: `${a.title} (Copy)` }); }}
              readOnly={false}
            />
          )}
          {view === 'calendar' && (
            <CalendarView activities={filteredActivities} swimlanes={swimlanes} onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }} />
          )}
          {view === 'table' && (
            <TableView 
              activities={filteredActivities} campaigns={campaigns} activityTypes={INITIAL_ACTIVITY_TYPES} 
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }} 
              onDuplicate={(id) => { const a = activities.find(x => x.id === id); if(a) handleSaveActivity({ ...a, id: '', title: `${a.title} (Copy)` }); }}
              onDelete={handleDeleteActivity}
              exchangeRates={{ [Currency.USD]: 1, [Currency.EUR]: 0.92, [Currency.GBP]: 0.79 }} displayCurrency={Currency.USD}
            />
          )}
        </div>
      </main>

      {isModalOpen && (
        <ActivityModal 
          activity={editingActivity} campaigns={campaigns} swimlanes={swimlanes} activityTypes={INITIAL_ACTIVITY_TYPES} vendors={INITIAL_VENDORS}
          onClose={() => setIsModalOpen(false)} onSave={handleSaveActivity} onDelete={handleDeleteActivity}
          onAddCampaign={() => {}} onUpdateCampaign={() => {}} onDeleteCampaign={() => {}} onAddActivityType={() => {}} onUpdateActivityType={() => {}} onDeleteActivityType={() => {}} onAddVendor={() => {}} onUpdateVendor={() => {}} onDeleteVendor={() => {}}
          isCampaignInUse={() => false} isActivityTypeInUse={() => false} isVendorInUse={() => false}
          allActivities={activities} readOnly={false}
        />
      )}

      {isWorkspaceOpen && (
        <WorkspaceSwitcher 
          calendars={[{id: 'cal1', name: 'Main Roadmap', ownerId: currentUser.id, createdAt: new Date().toISOString(), isTemplate: false}]} 
          activeCalendarId={activeCalendarId} onSwitch={setActiveCalendarId}
          onClose={() => setIsWorkspaceOpen(false)} 
          onAddCalendar={() => {}}
          user={currentUser} permissions={[]}
        />
      )}
    </div>
  );
};

export default App;
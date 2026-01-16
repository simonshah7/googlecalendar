import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Activity, Campaign, Swimlane, ActivityType, Vendor, CampaignStatus, Currency, Region, User, Calendar, CalendarPermission, UserRole } from './types';
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
import CalendarSettingsModal from './components/CalendarSettingsModal';
import ManagerDashboard from './components/ManagerDashboard';
import ConfirmDialog from './components/ConfirmDialog';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import Tooltip from './components/Tooltip';

export type ViewType = 'timeline' | 'calendar' | 'table';

export type Filters = {
  search: string;
  campaignId: string;
  status: string;
  dateRange: string;
  startDate: string;
  endDate: string;
};

// Undo/Redo history stack
type HistoryEntry = {
  activities: Activity[];
  description: string;
};

const MAX_HISTORY = 50;

// Initial users for demo
const DEMO_USERS: User[] = [
  { id: 'u1', email: 'manager@company.com', name: 'Sarah Manager', role: UserRole.MANAGER },
  { id: 'u2', email: 'user@company.com', name: 'Alex User', role: UserRole.USER },
];

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
  const [calendars, setCalendars] = useState<Calendar[]>([
    { id: 'cal1', name: 'Main Roadmap', ownerId: 'u1', createdAt: new Date().toISOString(), isTemplate: false }
  ]);
  const [permissions, setPermissions] = useState<CalendarPermission[]>([
    { calendarId: 'cal1', userId: 'u1', accessType: 'edit' },
    { calendarId: 'cal1', userId: 'u2', accessType: 'view' }
  ]);
  const [users, setUsers] = useState<User[]>(DEMO_USERS);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | Partial<Activity> | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '', campaignId: 'all', status: 'all', dateRange: 'all', startDate: '', endDate: '',
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  // Undo/Redo state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoing = useRef(false);

  // Timeline zoom ref for keyboard shortcuts
  const timelineZoomRef = useRef<{ zoomIn: () => void; zoomOut: () => void; goToToday: () => void } | null>(null);

  // Local Persistence
  useEffect(() => {
    localStorage.setItem('campaignos_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Save to history for undo/redo
  const saveToHistory = useCallback((newActivities: Activity[], description: string) => {
    if (isUndoRedoing.current) return;

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ activities: newActivities, description });
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoing.current = true;
      setHistoryIndex(prev => prev - 1);
      setActivities(history[historyIndex - 1].activities);
      setTimeout(() => { isUndoRedoing.current = false; }, 0);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoing.current = true;
      setHistoryIndex(prev => prev + 1);
      setActivities(history[historyIndex + 1].activities);
      setTimeout(() => { isUndoRedoing.current = false; }, 0);
    }
  }, [historyIndex, history]);

  // Show confirm dialog helper
  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmDialog({ isOpen: true, title, message, variant, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleSaveActivity = useCallback((activity: Activity) => {
    let newActivities: Activity[];
    let description: string;

    if (activity.id) {
      newActivities = activities.map(a => a.id === activity.id ? activity : a);
      description = `Updated "${activity.title}"`;
    } else {
      const newAct = { ...activity, id: crypto.randomUUID(), calendarId: activeCalendarId };
      newActivities = [...activities, newAct];
      description = `Created "${activity.title}"`;
    }

    setActivities(newActivities);
    saveToHistory(newActivities, description);
    setIsModalOpen(false);
  }, [activities, activeCalendarId, saveToHistory]);

  const handleDeleteActivity = useCallback((id: string) => {
    const activity = activities.find(a => a.id === id);
    const newActivities = activities.filter(a => a.id !== id);
    setActivities(newActivities);
    saveToHistory(newActivities, `Deleted "${activity?.title || 'activity'}"`);
    setIsModalOpen(false);
  }, [activities, saveToHistory]);

  const handleDeleteActivityWithConfirm = useCallback((id: string) => {
    const activity = activities.find(a => a.id === id);
    showConfirm(
      'Delete Activity',
      `Are you sure you want to delete "${activity?.title}"? This action cannot be undone.`,
      () => handleDeleteActivity(id),
      'danger'
    );
  }, [activities, showConfirm, handleDeleteActivity]);

  const handleDuplicate = useCallback((id: string) => {
    const activity = activities.find(x => x.id === id);
    if (activity) {
      const newActivity = { ...activity, id: crypto.randomUUID(), title: `${activity.title} (Copy)` };
      const newActivities = [...activities, newActivity];
      setActivities(newActivities);
      saveToHistory(newActivities, `Duplicated "${activity.title}"`);
    }
  }, [activities, saveToHistory]);

  // Bulk operations
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());

  const handleBulkDelete = useCallback(() => {
    if (selectedActivities.size === 0) return;
    showConfirm(
      'Delete Selected Activities',
      `Are you sure you want to delete ${selectedActivities.size} selected activities? This action cannot be undone.`,
      () => {
        const newActivities = activities.filter(a => !selectedActivities.has(a.id));
        setActivities(newActivities);
        saveToHistory(newActivities, `Deleted ${selectedActivities.size} activities`);
        setSelectedActivities(new Set());
      },
      'danger'
    );
  }, [activities, selectedActivities, showConfirm, saveToHistory]);

  const handleBulkStatusChange = useCallback((status: CampaignStatus) => {
    if (selectedActivities.size === 0) return;
    const newActivities = activities.map(a =>
      selectedActivities.has(a.id) ? { ...a, status } : a
    );
    setActivities(newActivities);
    saveToHistory(newActivities, `Changed status of ${selectedActivities.size} activities to ${status}`);
    setSelectedActivities(new Set());
  }, [activities, selectedActivities, saveToHistory]);

  const toggleSelectActivity = useCallback((id: string, isShiftClick: boolean = false) => {
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllActivities = useCallback(() => {
    const filtered = filteredActivities.map(a => a.id);
    setSelectedActivities(new Set(filtered));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedActivities(new Set());
  }, []);

  // Export handler
  const handleExport = useCallback((config: ExportConfig) => {
    // Generate export based on config
    console.log('Exporting with config:', config);

    if (config.format === 'csv') {
      // Generate CSV
      const headers = ['Title', 'Campaign', 'Status', 'Start Date', 'End Date', 'Cost', 'Currency', 'Region', 'Expected SAOs'];
      const rows = filteredActivities.map(a => [
        a.title,
        campaigns.find(c => c.id === a.campaignId)?.name || '',
        a.status,
        a.startDate,
        a.endDate,
        a.cost,
        a.currency,
        a.region,
        a.expectedSAOs
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // For other formats, show a placeholder message
      alert(`Export as ${config.format.toUpperCase()} would be generated here. In production, this would use a proper export library.`);
    }

    setIsExportOpen(false);
  }, [filteredActivities, campaigns]);

  // Calendar settings handlers
  const handleUpdateCalendar = useCallback((cal: Calendar) => {
    setCalendars(prev => prev.map(c => c.id === cal.id ? cal : c));
  }, []);

  const handleDeleteCalendar = useCallback((id: string) => {
    setCalendars(prev => prev.filter(c => c.id !== id));
    if (activeCalendarId === id) {
      setActiveCalendarId(calendars[0]?.id || '');
    }
    setIsSettingsOpen(false);
  }, [activeCalendarId, calendars]);

  // Filtering logic - FIXED to include campaign and date range
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      // Filter by calendar
      if (a.calendarId !== activeCalendarId) return false;

      // Filter by search term (search in title, description, tags)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(searchLower);
        const matchesDescription = a.description?.toLowerCase().includes(searchLower);
        const matchesTags = a.tags?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription && !matchesTags) return false;
      }

      // Filter by status
      if (filters.status !== 'all' && a.status !== filters.status) return false;

      // Filter by campaign - FIXED
      if (filters.campaignId !== 'all' && a.campaignId !== filters.campaignId) return false;

      // Filter by date range - FIXED
      if (filters.startDate && filters.endDate) {
        const activityStart = new Date(a.startDate);
        const activityEnd = new Date(a.endDate);
        const filterStart = new Date(filters.startDate);
        const filterEnd = new Date(filters.endDate);

        // Activity overlaps with filter range
        if (activityEnd < filterStart || activityStart > filterEnd) return false;
      } else if (filters.startDate) {
        const activityEnd = new Date(a.endDate);
        const filterStart = new Date(filters.startDate);
        if (activityEnd < filterStart) return false;
      } else if (filters.endDate) {
        const activityStart = new Date(a.startDate);
        const filterEnd = new Date(filters.endDate);
        if (activityStart > filterEnd) return false;
      }

      return true;
    });
  }, [activities, filters, activeCalendarId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      // Check for modals open
      const anyModalOpen = isModalOpen || isWorkspaceOpen || isExportOpen || isSettingsOpen || isAdminOpen || isShortcutsOpen;

      // Escape to close modals
      if (e.key === 'Escape') {
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        else if (isModalOpen) setIsModalOpen(false);
        else if (isExportOpen) setIsExportOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isAdminOpen) setIsAdminOpen(false);
        else if (isWorkspaceOpen) setIsWorkspaceOpen(false);
        else if (selectedActivities.size > 0) clearSelection();
        return;
      }

      // Don't process other shortcuts if modal is open
      if (anyModalOpen) return;

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }

      // View switching: 1, 2, 3
      if (e.key === '1') { setView('timeline'); return; }
      if (e.key === '2') { setView('calendar'); return; }
      if (e.key === '3') { setView('table'); return; }

      // New activity: N
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingActivity(null);
        setIsModalOpen(true);
        return;
      }

      // Export: E
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsExportOpen(true);
        return;
      }

      // Dark mode: D
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setIsDarkMode(prev => !prev);
        return;
      }

      // Go to today: T
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        timelineZoomRef.current?.goToToday();
        return;
      }

      // Zoom in: + or =
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        timelineZoomRef.current?.zoomIn();
        return;
      }

      // Zoom out: -
      if (e.key === '-') {
        e.preventDefault();
        timelineZoomRef.current?.zoomOut();
        return;
      }

      // Help: ?
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // Select all: Cmd/Ctrl + A
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAllActivities();
        return;
      }

      // Delete selected: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedActivities.size > 0) {
        e.preventDefault();
        handleBulkDelete();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isModalOpen, isWorkspaceOpen, isExportOpen, isSettingsOpen, isAdminOpen, isShortcutsOpen,
    undo, redo, selectedActivities, clearSelection, selectAllActivities, handleBulkDelete
  ]);

  // Get active calendar
  const activeCalendar = calendars.find(c => c.id === activeCalendarId);

  if (!currentUser) return <LoginOverlay onLogin={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-valuenova-bg transition-colors flex flex-col">
      <Header
        onAddActivityClick={() => { setEditingActivity(null); setIsModalOpen(true); }}
        currentView={view} onViewChange={setView}
        onExportClick={() => setIsExportOpen(true)}
        isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        activeCalendarName={activeCalendar?.name || 'Main Roadmap'}
        onCalendarSwitchClick={() => setIsWorkspaceOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onAdminClick={() => setIsAdminOpen(true)}
        user={currentUser} onLogout={() => setCurrentUser(null)}
        isSyncing={false} lastSync={null}
      />

      {/* Filter Controls - Now integrated */}
      <div className="px-4 pt-4">
        <FilterControls
          filters={filters}
          onFilterChange={setFilters}
          campaigns={campaigns.filter(c => c.calendarId === activeCalendarId)}
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedActivities.size > 0 && (
        <div className="mx-4 mt-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {selectedActivities.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value as CampaignStatus);
                  e.target.value = '';
                }
              }}
              className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-valuenova-surface border border-indigo-200 dark:border-valuenova-border rounded-lg text-gray-700 dark:text-white"
              defaultValue=""
            >
              <option value="" disabled>Change Status</option>
              {Object.values(CampaignStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Undo/Redo indicator */}
      {(historyIndex > 0 || historyIndex < history.length - 1) && (
        <div className="fixed bottom-4 left-4 flex items-center gap-2 z-40">
          <Tooltip content="Undo" shortcut="⌘Z">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Redo" shortcut="⌘⇧Z">
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </Tooltip>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-4 right-4 z-40">
        <Tooltip content="Keyboard shortcuts" shortcut="?">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="p-2 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors text-gray-500 dark:text-gray-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
            </svg>
          </button>
        </Tooltip>
      </div>

      <main className="flex-grow p-4 relative overflow-hidden">
        <div className="h-full border border-gray-200 dark:border-valuenova-border rounded-xl bg-white dark:bg-valuenova-surface/30 overflow-auto">
          {view === 'timeline' && (
            <TimelineView
              activities={filteredActivities}
              swimlanes={swimlanes.filter(s => s.calendarId === activeCalendarId)}
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
              onUpdate={handleSaveActivity}
              onDeleteActivity={handleDeleteActivityWithConfirm}
              onAddSwimlane={() => {
                const ns = { id: crypto.randomUUID(), name: 'New Lane', calendarId: activeCalendarId };
                setSwimlanes(prev => [...prev, ns]);
              }}
              onUpdateSwimlane={(s) => setSwimlanes(prev => prev.map(x => x.id === s.id ? s : x))}
              onDeleteSwimlane={(id) => {
                const swimlane = swimlanes.find(s => s.id === id);
                const hasActivities = activities.some(a => a.swimlaneId === id);
                if (hasActivities) {
                  showConfirm(
                    'Delete Swimlane',
                    `"${swimlane?.name}" contains activities. Delete the swimlane and move activities to the first swimlane?`,
                    () => {
                      const firstSwimlane = swimlanes.find(s => s.id !== id);
                      if (firstSwimlane) {
                        setActivities(prev => prev.map(a => a.swimlaneId === id ? { ...a, swimlaneId: firstSwimlane.id } : a));
                      }
                      setSwimlanes(prev => prev.filter(x => x.id !== id));
                    },
                    'warning'
                  );
                } else {
                  setSwimlanes(prev => prev.filter(x => x.id !== id));
                }
              }}
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
                typeId: INITIAL_ACTIVITY_TYPES[0]?.id || 'report',
                campaignId: campaigns[0]?.id || '',
                description: '',
                tags: '',
                vendorId: INITIAL_VENDORS[0]?.id || 'linkedin',
                expectedSAOs: 0,
                actualSAOs: 0
              })}
              onDuplicate={handleDuplicate}
              readOnly={false}
              selectedActivities={selectedActivities}
              onSelectActivity={toggleSelectActivity}
              ref={timelineZoomRef}
            />
          )}
          {view === 'calendar' && (
            <CalendarView
              activities={filteredActivities}
              swimlanes={swimlanes.filter(s => s.calendarId === activeCalendarId)}
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
                typeId: INITIAL_ACTIVITY_TYPES[0]?.id || 'report',
                campaignId: campaigns[0]?.id || '',
                description: '',
                tags: '',
                vendorId: INITIAL_VENDORS[0]?.id || 'linkedin',
                expectedSAOs: 0,
                actualSAOs: 0
              })}
            />
          )}
          {view === 'table' && (
            <TableView
              activities={filteredActivities}
              campaigns={campaigns}
              activityTypes={INITIAL_ACTIVITY_TYPES}
              onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteActivityWithConfirm}
              exchangeRates={{ [Currency.USD]: 1, [Currency.EUR]: 0.92, [Currency.GBP]: 0.79 }}
              displayCurrency={Currency.USD}
              selectedActivities={selectedActivities}
              onSelectActivity={toggleSelectActivity}
            />
          )}
        </div>
      </main>

      {isModalOpen && (
        <ActivityModal
          activity={editingActivity}
          campaigns={campaigns.filter(c => c.calendarId === activeCalendarId)}
          swimlanes={swimlanes.filter(s => s.calendarId === activeCalendarId)}
          activityTypes={INITIAL_ACTIVITY_TYPES}
          vendors={INITIAL_VENDORS}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveActivity}
          onDelete={handleDeleteActivityWithConfirm}
          onAddCampaign={(name) => {
            const newCampaign = { id: crypto.randomUUID(), name, calendarId: activeCalendarId };
            setCampaigns(prev => [...prev, newCampaign]);
          }}
          onUpdateCampaign={(c) => setCampaigns(prev => prev.map(x => x.id === c.id ? c : x))}
          onDeleteCampaign={(id) => setCampaigns(prev => prev.filter(x => x.id !== id))}
          onAddActivityType={() => {}}
          onUpdateActivityType={() => {}}
          onDeleteActivityType={() => {}}
          onAddVendor={() => {}}
          onUpdateVendor={() => {}}
          onDeleteVendor={() => {}}
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
          onAddCalendar={(name) => {
            const newCal: Calendar = {
              id: crypto.randomUUID(),
              name,
              ownerId: currentUser.id,
              createdAt: new Date().toISOString(),
              isTemplate: false
            };
            setCalendars(prev => [...prev, newCal]);
            setActiveCalendarId(newCal.id);
          }}
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

      {isSettingsOpen && activeCalendar && (
        <CalendarSettingsModal
          calendar={activeCalendar}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={handleUpdateCalendar}
          onDelete={handleDeleteCalendar}
          permissions={permissions}
          onUpdatePermissions={setPermissions}
          currentUser={currentUser}
        />
      )}

      {isAdminOpen && (
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

      {isShortcutsOpen && (
        <KeyboardShortcutsHelp
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={() => {
          confirmDialog.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default App;

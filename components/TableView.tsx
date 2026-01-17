
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Activity, Campaign, ActivityType, Currency, Swimlane, Vendor, User } from '../types';
import { STATUS_COLORS } from '../constants';
import EmptyState from './EmptyState';
import { generateICS, downloadICS, hasValidSchedule } from '../lib/ics';
import { generateCSV, downloadCSV, createCSVLookups, ALL_CSV_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '../lib/csv';

interface TableViewProps {
  activities: Activity[];
  campaigns: Campaign[];
  activityTypes: ActivityType[];
  swimlanes: Swimlane[];
  vendors: Vendor[];
  onEdit: (activity: Activity) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorderActivities?: (activityIds: string[]) => void;
  exchangeRates: Record<Currency, number>;
  displayCurrency: Currency;
  selectedActivities?: Set<string>;
  onSelectActivity?: (id: string, isShiftClick: boolean) => void;
  currentUser?: User;
}

// Column definition type
interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  render: (activity: Activity, lookups: Lookups) => React.ReactNode;
  getValue: (activity: Activity, lookups: Lookups) => string | number;
}

interface Lookups {
  campaigns: Map<string, Campaign>;
  swimlanes: Map<string, Swimlane>;
  activityTypes: Map<string, ActivityType>;
  vendors: Map<string, Vendor>;
}

// Sort configuration type
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

// Filter state type
interface FilterState {
  search: string;
  activityTypes: string[];
  campaigns: string[];
  statuses: string[];
  swimlanes: string[];
  dateRange: { start: string; end: string };
  spendRange: { min: number | null; max: number | null };
  expectedSAOsRange: { min: number | null; max: number | null };
  actualSAOsRange: { min: number | null; max: number | null };
  hasCampaign: boolean | null;
  hasSlackChannel: boolean | null;
  hasOutline: boolean | null;
  hasAttachments: boolean | null;
  hasDependencies: boolean | null;
  hasRecurrence: boolean | null;
}

// Table preferences for persistence
interface TablePreferences {
  visibleColumns: string[];
  sortConfigs: SortConfig[];
  filters: FilterState;
}

const STORAGE_KEY = 'nexus-table-preferences';

// Default filters
const defaultFilters: FilterState = {
  search: '',
  activityTypes: [],
  campaigns: [],
  statuses: [],
  swimlanes: [],
  dateRange: { start: '', end: '' },
  spendRange: { min: null, max: null },
  expectedSAOsRange: { min: null, max: null },
  actualSAOsRange: { min: null, max: null },
  hasCampaign: null,
  hasSlackChannel: null,
  hasOutline: null,
  hasAttachments: null,
  hasDependencies: null,
  hasRecurrence: null,
};

const TableView: React.FC<TableViewProps> = ({
  activities,
  campaigns,
  activityTypes,
  swimlanes,
  vendors,
  onEdit,
  onDuplicate,
  onDelete,
  onReorderActivities,
  exchangeRates,
  displayCurrency,
  selectedActivities,
  onSelectActivity,
  currentUser
}) => {
  // Lookups for resolving foreign keys
  const lookups: Lookups = useMemo(() => ({
    campaigns: new Map(campaigns.map(c => [c.id, c])),
    swimlanes: new Map(swimlanes.map(s => [s.id, s])),
    activityTypes: new Map(activityTypes.map(t => [t.id, t])),
    vendors: new Map(vendors.map(v => [v.id, v])),
  }), [campaigns, swimlanes, activityTypes, vendors]);

  // Column definitions
  const allColumns: ColumnDef[] = useMemo(() => [
    {
      key: 'title',
      label: 'Activity Name',
      sortable: true,
      render: (a) => (
        <div>
          <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-xs" title={a.title}>{a.title}</div>
        </div>
      ),
      getValue: (a) => a.title,
    },
    {
      key: 'campaign',
      label: 'Campaign',
      sortable: true,
      render: (a, l) => (
        <div className="text-xs font-medium text-gray-500 dark:text-valuenova-muted">
          {l.campaigns.get(a.campaignId)?.name || '—'}
        </div>
      ),
      getValue: (a, l) => l.campaigns.get(a.campaignId)?.name || '',
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (a, l) => (
        <div className="text-[10px] font-black uppercase text-indigo-500 dark:text-valuenova-accent">
          {l.activityTypes.get(a.typeId)?.name || '—'}
        </div>
      ),
      getValue: (a, l) => l.activityTypes.get(a.typeId)?.name || '',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (a) => (
        <span className={`px-2 inline-flex text-[9px] uppercase font-black leading-5 rounded-full border ${STATUS_COLORS[a.status]}`}>
          {a.status}
        </span>
      ),
      getValue: (a) => a.status,
    },
    {
      key: 'swimlane',
      label: 'Swim Lane',
      sortable: true,
      render: (a, l) => (
        <div className="text-xs font-medium text-gray-500 dark:text-valuenova-muted">
          {l.swimlanes.get(a.swimlaneId)?.name || '—'}
        </div>
      ),
      getValue: (a, l) => l.swimlanes.get(a.swimlaneId)?.name || '',
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
      render: (a) => (
        <div className="text-xs text-gray-900 dark:text-white font-medium">{a.startDate}</div>
      ),
      getValue: (a) => a.startDate,
    },
    {
      key: 'endDate',
      label: 'End Date',
      sortable: true,
      render: (a) => (
        <div className="text-xs text-gray-900 dark:text-white font-medium">{a.endDate}</div>
      ),
      getValue: (a) => a.endDate,
    },
    {
      key: 'vendor',
      label: 'Placement',
      sortable: true,
      render: (a, l) => (
        <div className="text-xs font-medium text-gray-500 dark:text-valuenova-muted">
          {l.vendors.get(a.vendorId)?.name || '—'}
        </div>
      ),
      getValue: (a, l) => l.vendors.get(a.vendorId)?.name || '',
    },
    {
      key: 'region',
      label: 'Region',
      sortable: true,
      render: (a) => (
        <div className="text-xs font-bold text-gray-600 dark:text-gray-400">{a.region}</div>
      ),
      getValue: (a) => a.region,
    },
    {
      key: 'recurrence',
      label: 'Recurrence',
      sortable: true,
      render: (a) => (
        <div className="text-xs text-gray-500 dark:text-valuenova-muted">
          {a.recurrenceFrequency && a.recurrenceFrequency !== 'none' ? a.recurrenceFrequency : '—'}
        </div>
      ),
      getValue: (a) => a.recurrenceFrequency || 'none',
    },
    {
      key: 'cost',
      label: 'Spend',
      sortable: true,
      align: 'right',
      render: (a) => (
        <div className="text-sm text-gray-900 dark:text-white font-bold tabular-nums">
          {a.currency} {a.cost.toLocaleString()}
        </div>
      ),
      getValue: (a) => a.cost,
    },
    {
      key: 'expectedSAOs',
      label: 'Expected SAOs',
      sortable: true,
      align: 'right',
      render: (a) => (
        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
          {a.expectedSAOs.toFixed(1)}
        </div>
      ),
      getValue: (a) => a.expectedSAOs,
    },
    {
      key: 'actualSAOs',
      label: 'Actual SAOs',
      sortable: true,
      align: 'right',
      render: (a) => (
        <div className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">
          {a.actualSAOs.toFixed(1)}
        </div>
      ),
      getValue: (a) => a.actualSAOs,
    },
    {
      key: 'slackChannel',
      label: 'Slack Channel',
      sortable: true,
      render: (a) => (
        <div className="text-xs font-medium text-gray-500 dark:text-valuenova-muted">
          {a.slackChannel ? `#${a.slackChannel}` : '—'}
        </div>
      ),
      getValue: (a) => a.slackChannel || '',
    },
    {
      key: 'outline',
      label: 'Outline',
      sortable: false,
      render: (a) => (
        <div className="text-xs text-gray-500 dark:text-valuenova-muted truncate max-w-[150px]" title={a.outline || ''}>
          {a.outline ? (a.outline.length > 50 ? a.outline.slice(0, 50) + '...' : a.outline) : '—'}
        </div>
      ),
      getValue: (a) => a.outline || '',
    },
    {
      key: 'attachments',
      label: 'Attachments',
      sortable: true,
      align: 'center',
      render: (a) => (
        <div className="text-xs font-bold text-gray-600 dark:text-gray-400">
          {a.attachments?.length || 0}
        </div>
      ),
      getValue: (a) => a.attachments?.length || 0,
    },
    {
      key: 'dependencies',
      label: 'Dependencies',
      sortable: true,
      align: 'center',
      render: (a) => (
        <div className="text-xs font-bold text-gray-600 dark:text-gray-400">
          {a.dependencies?.length || 0}
        </div>
      ),
      getValue: (a) => a.dependencies?.length || 0,
    },
  ], []);

  // Default visible columns
  const defaultVisibleColumns = ['title', 'campaign', 'type', 'status', 'startDate', 'endDate', 'cost', 'expectedSAOs'];

  // State
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ key: 'startDate', direction: 'desc' }]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isManualOrder, setIsManualOrder] = useState(false);

  const dragRef = useRef<{ startY: number; index: number } | null>(null);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs: TablePreferences = JSON.parse(stored);
        if (prefs.visibleColumns) setVisibleColumns(prefs.visibleColumns);
        if (prefs.sortConfigs) setSortConfigs(prefs.sortConfigs);
        // Optionally restore filters
        // if (prefs.filters) setFilters(prefs.filters);
      }
    } catch (e) {
      console.error('Failed to load table preferences:', e);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback(() => {
    try {
      const prefs: TablePreferences = {
        visibleColumns,
        sortConfigs,
        filters,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save table preferences:', e);
    }
  }, [visibleColumns, sortConfigs, filters]);

  useEffect(() => {
    savePreferences();
  }, [visibleColumns, sortConfigs, savePreferences]);

  // Close column picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Global search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const campaignName = lookups.campaigns.get(activity.campaignId)?.name || '';
        const matchesSearch =
          activity.title.toLowerCase().includes(searchLower) ||
          campaignName.toLowerCase().includes(searchLower) ||
          (activity.outline || '').toLowerCase().includes(searchLower) ||
          (activity.slackChannel || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Multi-select filters
      if (filters.activityTypes.length > 0 && !filters.activityTypes.includes(activity.typeId)) return false;
      if (filters.campaigns.length > 0 && !filters.campaigns.includes(activity.campaignId)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(activity.status)) return false;
      if (filters.swimlanes.length > 0 && !filters.swimlanes.includes(activity.swimlaneId)) return false;

      // Date range filter (activity overlaps with filter range)
      if (filters.dateRange.start || filters.dateRange.end) {
        const actStart = activity.startDate;
        const actEnd = activity.endDate;
        const filterStart = filters.dateRange.start || '1900-01-01';
        const filterEnd = filters.dateRange.end || '2100-12-31';
        // Activity overlaps if: actStart <= filterEnd AND actEnd >= filterStart
        if (!(actStart <= filterEnd && actEnd >= filterStart)) return false;
      }

      // Numeric range filters
      if (filters.spendRange.min !== null && activity.cost < filters.spendRange.min) return false;
      if (filters.spendRange.max !== null && activity.cost > filters.spendRange.max) return false;
      if (filters.expectedSAOsRange.min !== null && activity.expectedSAOs < filters.expectedSAOsRange.min) return false;
      if (filters.expectedSAOsRange.max !== null && activity.expectedSAOs > filters.expectedSAOsRange.max) return false;
      if (filters.actualSAOsRange.min !== null && activity.actualSAOs < filters.actualSAOsRange.min) return false;
      if (filters.actualSAOsRange.max !== null && activity.actualSAOs > filters.actualSAOsRange.max) return false;

      // Boolean "Has" filters
      if (filters.hasCampaign === true && !activity.campaignId) return false;
      if (filters.hasCampaign === false && activity.campaignId) return false;
      if (filters.hasSlackChannel === true && !activity.slackChannel) return false;
      if (filters.hasSlackChannel === false && activity.slackChannel) return false;
      if (filters.hasOutline === true && !activity.outline) return false;
      if (filters.hasOutline === false && activity.outline) return false;
      if (filters.hasAttachments === true && (!activity.attachments || activity.attachments.length === 0)) return false;
      if (filters.hasAttachments === false && activity.attachments && activity.attachments.length > 0) return false;
      if (filters.hasDependencies === true && (!activity.dependencies || activity.dependencies.length === 0)) return false;
      if (filters.hasDependencies === false && activity.dependencies && activity.dependencies.length > 0) return false;
      if (filters.hasRecurrence === true && (!activity.recurrenceFrequency || activity.recurrenceFrequency === 'none')) return false;
      if (filters.hasRecurrence === false && activity.recurrenceFrequency && activity.recurrenceFrequency !== 'none') return false;

      return true;
    });
  }, [activities, filters, lookups]);

  // Sort activities with multi-sort support
  const sortedActivities = useMemo(() => {
    if (isManualOrder) return filteredActivities;

    const sorted = [...filteredActivities];
    sorted.sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        const column = allColumns.find(c => c.key === sortConfig.key);
        if (!column) continue;

        const aValue = column.getValue(a, lookups);
        const bValue = column.getValue(b, lookups);

        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        if (comparison !== 0) {
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
    return sorted;
  }, [filteredActivities, sortConfigs, allColumns, lookups, isManualOrder]);

  // Handle sort (shift-click for multi-sort)
  const handleSort = (key: string, shiftKey: boolean) => {
    setIsManualOrder(false);

    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(s => s.key === key);

      if (shiftKey) {
        // Multi-sort: add or toggle
        if (existingIndex >= 0) {
          const newConfigs = [...prev];
          newConfigs[existingIndex] = {
            key,
            direction: newConfigs[existingIndex].direction === 'asc' ? 'desc' : 'asc'
          };
          return newConfigs;
        }
        return [...prev, { key, direction: 'asc' }];
      } else {
        // Single sort
        if (existingIndex >= 0 && prev.length === 1) {
          return [{ key, direction: prev[0].direction === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key, direction: 'asc' }];
      }
    });
  };

  // Handle column visibility toggle
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters(defaultFilters);
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.activityTypes.length > 0) count++;
    if (filters.campaigns.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.swimlanes.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.spendRange.min !== null || filters.spendRange.max !== null) count++;
    if (filters.expectedSAOsRange.min !== null || filters.expectedSAOsRange.max !== null) count++;
    if (filters.actualSAOsRange.min !== null || filters.actualSAOsRange.max !== null) count++;
    if (filters.hasCampaign !== null) count++;
    if (filters.hasSlackChannel !== null) count++;
    if (filters.hasOutline !== null) count++;
    if (filters.hasAttachments !== null) count++;
    if (filters.hasDependencies !== null) count++;
    if (filters.hasRecurrence !== null) count++;
    return count;
  }, [filters]);

  // Totals
  const totals = useMemo(() => {
    return sortedActivities.reduce((acc, a) => ({
      cost: acc.cost + a.cost,
      expectedSAOs: acc.expectedSAOs + a.expectedSAOs,
      actualSAOs: acc.actualSAOs + a.actualSAOs,
    }), { cost: 0, expectedSAOs: 0, actualSAOs: 0 });
  }, [sortedActivities]);

  // CSV Export handlers
  const handleExportCurrentView = () => {
    const csvLookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);
    const csvContent = generateCSV(sortedActivities, csvLookups, {
      columns: visibleColumns,
    });
    downloadCSV(csvContent, 'nexus-activities');
  };

  const handleExportFullDetails = () => {
    const csvLookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);
    const csvContent = generateCSV(sortedActivities, csvLookups);
    downloadCSV(csvContent, 'nexus-activities-full');
  };

  // ICS download handler
  const handleDownloadICS = (activity: Activity) => {
    const campaignName = lookups.campaigns.get(activity.campaignId)?.name;
    const typeName = lookups.activityTypes.get(activity.typeId)?.name;
    const vendorName = lookups.vendors.get(activity.vendorId)?.name;

    const icsContent = generateICS(activity, { campaignName, typeName, vendorName });
    if (icsContent) {
      const filename = activity.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      downloadICS(icsContent, filename);
    }
  };

  // Copy Slack channel
  const handleCopySlackChannel = (slackChannel: string) => {
    navigator.clipboard.writeText(`#${slackChannel}`);
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!onReorderActivities) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || !onReorderActivities) return;
    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || !onReorderActivities) return;

    const newOrder = [...sortedActivities];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    setIsManualOrder(true);
    onReorderActivities(newOrder.map(a => a.id));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Get visible column definitions
  const visibleColumnDefs = useMemo(() => {
    return visibleColumns.map(key => allColumns.find(c => c.key === key)).filter(Boolean) as ColumnDef[];
  }, [visibleColumns, allColumns]);

  // Sort icon component
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    const sortIndex = sortConfigs.findIndex(s => s.key === columnKey);
    if (sortIndex < 0) return <span className="ml-1 opacity-20 text-gray-400">↕</span>;
    const dir = sortConfigs[sortIndex].direction;
    return (
      <span className="ml-1 text-indigo-600 dark:text-valuenova-accent">
        {dir === 'asc' ? '↑' : '↓'}
        {sortConfigs.length > 1 && <sup className="text-[8px]">{sortIndex + 1}</sup>}
      </span>
    );
  };

  // Render filter chips
  const renderFilterChips = () => {
    const chips: React.ReactNode[] = [];

    if (filters.search) {
      chips.push(
        <span key="search" className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-bold">
          Search: {filters.search}
          <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="hover:text-indigo-900">×</button>
        </span>
      );
    }

    if (filters.activityTypes.length > 0) {
      chips.push(
        <span key="types" className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-bold">
          Types: {filters.activityTypes.length}
          <button onClick={() => setFilters(prev => ({ ...prev, activityTypes: [] }))} className="hover:text-purple-900">×</button>
        </span>
      );
    }

    if (filters.campaigns.length > 0) {
      chips.push(
        <span key="campaigns" className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-[10px] font-bold">
          Campaigns: {filters.campaigns.length}
          <button onClick={() => setFilters(prev => ({ ...prev, campaigns: [] }))} className="hover:text-teal-900">×</button>
        </span>
      );
    }

    if (filters.statuses.length > 0) {
      chips.push(
        <span key="statuses" className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-bold">
          Statuses: {filters.statuses.length}
          <button onClick={() => setFilters(prev => ({ ...prev, statuses: [] }))} className="hover:text-amber-900">×</button>
        </span>
      );
    }

    if (filters.dateRange.start || filters.dateRange.end) {
      chips.push(
        <span key="dates" className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">
          Date range
          <button onClick={() => setFilters(prev => ({ ...prev, dateRange: { start: '', end: '' } }))} className="hover:text-blue-900">×</button>
        </span>
      );
    }

    return chips;
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-valuenova-surface rounded-lg shadow-sm border border-gray-200 dark:border-valuenova-border overflow-hidden transition-colors flex flex-col h-full">
        <EmptyState
          title="No Activities Found"
          description="Create your first activity or adjust your filters to see activities in this view."
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-valuenova-surface rounded-lg shadow-sm border border-gray-200 dark:border-valuenova-border overflow-hidden transition-colors flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-valuenova-border bg-gray-50 dark:bg-valuenova-bg space-y-3">
        {/* Search and Actions Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Search */}
          <div className="relative flex-grow max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search activities, campaigns, outlines..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-valuenova-border rounded-lg bg-white dark:bg-valuenova-surface focus:ring-2 focus:ring-indigo-500 dark:focus:ring-valuenova-accent focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'bg-white dark:bg-valuenova-surface border-gray-200 dark:border-valuenova-border text-gray-600 dark:text-gray-400 hover:border-indigo-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px]">{activeFilterCount}</span>
            )}
          </button>

          {/* Column Picker */}
          <div className="relative" ref={columnPickerRef}>
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border bg-white dark:bg-valuenova-surface border-gray-200 dark:border-valuenova-border text-gray-600 dark:text-gray-400 hover:border-indigo-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Columns
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg shadow-xl z-20 py-2 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Show/Hide Columns</div>
                {allColumns.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-valuenova-bg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-indigo-600 dark:bg-valuenova-accent text-white hover:bg-indigo-700 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg shadow-xl z-20 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={handleExportCurrentView}
                className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-valuenova-bg"
              >
                Export current view
              </button>
              <button
                onClick={handleExportFullDetails}
                className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-valuenova-bg"
              >
                Export full details
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {renderFilterChips()}
            <button
              onClick={clearAllFilters}
              className="text-[10px] font-bold text-red-500 hover:text-red-700"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Expanded Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-200 dark:border-valuenova-border">
            {/* Activity Type Filter */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Activity Type</label>
              <select
                multiple
                value={filters.activityTypes}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  activityTypes: Array.from(e.target.selectedOptions, opt => opt.value)
                }))}
                className="w-full text-xs border border-gray-200 dark:border-valuenova-border rounded-lg p-2 h-20"
              >
                {activityTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Campaign Filter */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Campaign</label>
              <select
                multiple
                value={filters.campaigns}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  campaigns: Array.from(e.target.selectedOptions, opt => opt.value)
                }))}
                className="w-full text-xs border border-gray-200 dark:border-valuenova-border rounded-lg p-2 h-20"
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Status</label>
              <select
                multiple
                value={filters.statuses}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  statuses: Array.from(e.target.selectedOptions, opt => opt.value)
                }))}
                className="w-full text-xs border border-gray-200 dark:border-valuenova-border rounded-lg p-2 h-20"
              >
                <option value="Considering">Considering</option>
                <option value="Negotiating">Negotiating</option>
                <option value="Committed">Committed</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Date Range</label>
              <div className="space-y-1">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full text-xs border border-gray-200 dark:border-valuenova-border rounded-lg p-1.5"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full text-xs border border-gray-200 dark:border-valuenova-border rounded-lg p-1.5"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Spend Range Filter */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Spend Range</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={filters.spendRange.min ?? ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    spendRange: { ...prev.spendRange, min: e.target.value ? Number(e.target.value) : null }
                  }))}
                  className="w-1/2 text-xs border border-gray-200 dark:border-valuenova-border rounded-lg p-1.5"
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={filters.spendRange.max ?? ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    spendRange: { ...prev.spendRange, max: e.target.value ? Number(e.target.value) : null }
                  }))}
                  className="w-1/2 text-xs border border-gray-200 dark:border-valuenova-border rounded-lg p-1.5"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* Has Filters */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Has...</label>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filters.hasCampaign === true}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hasCampaign: e.target.checked ? true : null
                    }))}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  Campaign
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filters.hasSlackChannel === true}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hasSlackChannel: e.target.checked ? true : null
                    }))}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  Slack
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filters.hasOutline === true}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hasOutline: e.target.checked ? true : null
                    }))}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  Outline
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filters.hasAttachments === true}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hasAttachments: e.target.checked ? true : null
                    }))}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  Files
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filters.hasDependencies === true}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hasDependencies: e.target.checked ? true : null
                    }))}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  Deps
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filters.hasRecurrence === true}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hasRecurrence: e.target.checked ? true : null
                    }))}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  Recurring
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto scrollbar-hide flex-grow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-valuenova-border border-separate border-spacing-0">
          <thead className="bg-gray-50 dark:bg-valuenova-bg sticky top-0 z-10">
            <tr>
              {onReorderActivities && (
                <th scope="col" className="w-10 px-2 py-3 text-center">
                  <span className="sr-only">Reorder</span>
                </th>
              )}
              {onSelectActivity && (
                <th scope="col" className="w-12 px-4 py-3 text-center">
                  <span className="sr-only">Select</span>
                </th>
              )}
              {visibleColumnDefs.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-${col.align || 'left'} text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors whitespace-nowrap`}
                  onClick={(e) => col.sortable && handleSort(col.key, e.shiftKey)}
                  title={col.sortable ? 'Click to sort. Shift+click for multi-sort.' : ''}
                >
                  {col.label}
                  {col.sortable && <SortIcon columnKey={col.key} />}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-valuenova-surface divide-y divide-gray-200 dark:divide-valuenova-border transition-colors">
            {sortedActivities.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnDefs.length + (onReorderActivities ? 1 : 0) + (onSelectActivity ? 1 : 0) + 1} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium">No activities match your filters</p>
                    <p className="text-xs mt-1">Try adjusting your filter criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedActivities.map((activity, index) => {
                const isSelected = selectedActivities?.has(activity.id);
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index && draggedIndex !== index;
                const isExpanded = expandedRow === activity.id;

                return (
                  <React.Fragment key={activity.id}>
                    <tr
                      data-row-index={index}
                      draggable={!!onReorderActivities}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => onEdit(activity)}
                      className={`hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors cursor-pointer
                        ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
                        ${isDragging ? 'opacity-50 bg-gray-100 dark:bg-valuenova-bg' : ''}
                        ${isDragOver ? 'border-t-2 border-t-indigo-500' : ''}
                        ${onReorderActivities ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      {onReorderActivities && (
                        <td className="px-2 py-4 text-center touch-none" onClick={(e) => e.stopPropagation()}>
                          <div className="text-gray-300 hover:text-indigo-500 transition-colors cursor-grab">
                            <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                        </td>
                      )}
                      {onSelectActivity && (
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected || false}
                            onChange={() => {}}
                            onClick={(e) => onSelectActivity(activity.id, e.shiftKey)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-valuenova-border rounded focus:ring-indigo-500 dark:focus:ring-valuenova-accent cursor-pointer"
                          />
                        </td>
                      )}
                      {visibleColumnDefs.map(col => (
                        <td key={col.key} className={`px-4 py-4 whitespace-nowrap text-${col.align || 'left'}`}>
                          {col.render(activity, lookups)}
                        </td>
                      ))}
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-1">
                          {/* ICS Download */}
                          {hasValidSchedule(activity) && (
                            <button
                              onClick={() => handleDownloadICS(activity)}
                              className="text-gray-400 hover:text-indigo-600 dark:hover:text-valuenova-accent p-1.5 rounded-md transition-colors"
                              title="Download .ics"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                          {/* Copy Slack */}
                          {activity.slackChannel && (
                            <button
                              onClick={() => handleCopySlackChannel(activity.slackChannel!)}
                              className="text-gray-400 hover:text-indigo-600 dark:hover:text-valuenova-accent p-1.5 rounded-md transition-colors"
                              title="Copy Slack channel"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                          {/* Open Attachments */}
                          {activity.attachments && activity.attachments.length > 0 && (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : activity.id)}
                              className="text-gray-400 hover:text-indigo-600 dark:hover:text-valuenova-accent p-1.5 rounded-md transition-colors"
                              title="View attachments"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            </button>
                          )}
                          {/* Edit */}
                          <button
                            onClick={() => onEdit(activity)}
                            className="text-indigo-600 dark:text-valuenova-accent hover:bg-indigo-50 dark:hover:bg-valuenova-bg p-1.5 rounded-md transition-colors"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z" />
                            </svg>
                          </button>
                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicate(activity.id)}
                            className="text-gray-500 dark:text-valuenova-muted hover:text-indigo-600 dark:hover:text-valuenova-accent hover:bg-indigo-50 dark:hover:bg-valuenova-bg p-1.5 rounded-md transition-colors"
                            title="Duplicate"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => onDelete(activity.id)}
                            className="text-gray-400 dark:text-valuenova-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-md transition-colors"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row for Details */}
                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-valuenova-bg">
                        <td colSpan={visibleColumnDefs.length + (onReorderActivities ? 1 : 0) + (onSelectActivity ? 1 : 0) + 1} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* Outline */}
                            {activity.outline && (
                              <div>
                                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-1">Outline</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{activity.outline}</p>
                              </div>
                            )}
                            {/* Attachments */}
                            {activity.attachments && activity.attachments.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-1">Attachments</h4>
                                <div className="flex flex-wrap gap-2">
                                  {activity.attachments.map(att => (
                                    <a
                                      key={att.id}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded text-xs text-indigo-600 dark:text-valuenova-accent hover:bg-indigo-50"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                      </svg>
                                      {att.name}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Comments */}
                            {activity.inlineComments && activity.inlineComments.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-1">Comments ({activity.inlineComments.length})</h4>
                                <div className="space-y-1">
                                  {activity.inlineComments.slice(0, 3).map(comment => (
                                    <div key={comment.id} className="text-xs text-gray-600 dark:text-gray-300">
                                      <span className="font-bold">{comment.authorName}:</span> {comment.content}
                                    </div>
                                  ))}
                                  {activity.inlineComments.length > 3 && (
                                    <div className="text-xs text-indigo-500">+{activity.inlineComments.length - 3} more</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-gray-50 dark:bg-valuenova-surface border-t-2 border-gray-200 dark:border-valuenova-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <tr>
              <td colSpan={(onReorderActivities ? 1 : 0) + (onSelectActivity ? 1 : 0) + 4} className="px-4 py-3 text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-widest">
                {sortedActivities.length} of {activities.length} activities
              </td>
              <td className="px-4 py-3 text-right">
                <div className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                  {displayCurrency} {totals.cost.toLocaleString()}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {totals.expectedSAOs.toFixed(1)}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  {totals.actualSAOs.toFixed(1)}
                </div>
              </td>
              <td colSpan={visibleColumnDefs.length - 6}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TableView;

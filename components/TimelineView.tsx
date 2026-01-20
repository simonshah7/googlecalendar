
import React, { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { Activity, Swimlane, CampaignStatus, CardDisplayProfile, FieldStyle, DEFAULT_CARD_PROFILES } from '../types';
import { SWIMLANE_COLORS } from '../constants';
import EmptyState from './EmptyState';
import CardStylePanel from './CardStylePanel';

const ZOOM_LEVELS = [4, 8, 12, 20, 30]; // pixels per day
const DEFAULT_ZOOM_INDEX = 2; // Corresponds to 12px

// Font size mapping for card display
const FONT_SIZE_MAP: Record<string, string> = {
  'xs': '9px',
  'sm': '11px',
  'base': '13px',
  'lg': '15px',
};

// Font weight mapping for card display
const FONT_WEIGHT_MAP: Record<string, string> = {
  'normal': '400',
  'bold': '700',
  'black': '900',
};

// Helper functions
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};
const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const diffDaysUTC = (dateStr1: string, dateStr2: string): number => {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

interface TimelineViewProps {
  activities: Activity[];
  swimlanes: Swimlane[];
  onEdit: (activity: Activity) => void;
  onUpdate: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  onAddSwimlane: () => void;
  onUpdateSwimlane: (swimlane: Swimlane) => void;
  onDeleteSwimlane: (swimlaneId: string) => void;
  onReorderSwimlanes: (swimlanes: Swimlane[]) => void;
  onQuickAdd: (startDate: string, endDate: string, swimlaneId: string) => void;
  onDuplicate: (activityId: string) => void;
  readOnly?: boolean;
  selectedActivities?: Set<string>;
  onSelectActivity?: (id: string, isShiftClick: boolean) => void;
}

export interface TimelineViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  goToToday: () => void;
}

const ActivityBar: React.FC<{
  activity: Activity;
  timelineStartDate: Date;
  top: number;
  cardProfile: CardDisplayProfile;
  onMouseDown: (e: React.MouseEvent, activity: Activity, mode: 'drag' | 'resize-left' | 'resize-right') => void;
  onTouchStart: (e: React.TouchEvent, activity: Activity, mode: 'drag' | 'resize-left' | 'resize-right') => void;
  onEdit: (activity: Activity) => void;
  onDuplicate: (activityId: string) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  isGhost?: boolean;
  dayWidth: number;
  colorClasses: string;
  draggingOffset?: { x: number; y: number };
  readOnly?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, isShiftClick: boolean) => void;
  lastDragEndTimeRef?: React.MutableRefObject<number>;
}> = ({ activity, timelineStartDate, top, cardProfile, onMouseDown, onTouchStart, onEdit, onDuplicate, onDelete, isDragging, isGhost, dayWidth, colorClasses, draggingOffset, readOnly, isSelected, onSelect, lastDragEndTimeRef }) => {
  const startOffsetDays = diffDaysUTC(formatDate(timelineStartDate), activity.startDate);
  const durationDays = diffDaysUTC(activity.startDate, activity.endDate) + 1;

  const left = startOffsetDays * dayWidth;
  const width = Math.max(durationDays * dayWidth, 2);

  const barHeight = cardProfile.cardHeight;
  const fields = cardProfile.fields;

  // Helper to get field style
  const getFieldStyle = (fieldConfig: FieldStyle): React.CSSProperties => ({
    fontSize: FONT_SIZE_MAP[fieldConfig.fontSize],
    fontWeight: FONT_WEIGHT_MAP[fieldConfig.fontWeight],
    textTransform: fieldConfig.uppercase ? 'uppercase' : 'none',
  });

  // Format date range for display
  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
  };

  const barStyle: React.CSSProperties = {
    left: `${left + (isDragging ? (draggingOffset?.x || 0) : 0)}px`,
    width: `${width}px`,
    top: `${isDragging ? (draggingOffset?.y || 0) : top}px`,
    height: `${barHeight}px`,
    transition: (isDragging || isGhost) ? 'none' : 'left 150ms cubic-bezier(0.4, 0, 0.2, 1), width 150ms cubic-bezier(0.4, 0, 0.2, 1), top 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: activity.color || undefined,
    borderColor: activity.color ? 'rgba(0,0,0,0.1)' : undefined,
    zIndex: isDragging ? 50 : isGhost ? 5 : 10,
    opacity: isDragging ? 0.7 : isGhost ? 0.3 : 1,
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'Committed': return <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shrink-0" />;
      case 'Negotiating': return <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shrink-0" />;
      default: return <div className="w-2 h-2 rounded-full bg-sky-500 shadow-sm shrink-0" />;
    }
  };

  // Check if we have any secondary fields visible
  const hasSecondaryFields = fields.region.visible || fields.status.visible || fields.cost.visible || fields.dates.visible;

  return (
    <div
      id={isGhost ? `ghost-${activity.id}` : `activity-${activity.id}`}
      className={`absolute rounded-lg shadow-sm border group flex flex-col ${activity.color ? '' : colorClasses}
        ${isDragging ? 'shadow-2xl scale-105 cursor-grabbing ring-2 ring-indigo-500/50' : isGhost ? 'border-dashed border-indigo-400 pointer-events-none' : `border-black/5 dark:border-white/10 hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${readOnly ? 'cursor-default' : 'cursor-grab'}`}
        ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
      style={barStyle}
      onMouseDown={(e) => {
        if (isGhost || readOnly) return;
        if (e.button !== 0) return;
        onMouseDown(e, activity, 'drag');
      }}
      onTouchStart={(e) => {
        if (isGhost || readOnly) return;
        onTouchStart(e, activity, 'drag');
      }}
      onDoubleClick={(e) => {
        if (isGhost || readOnly) return;
        e.stopPropagation();
        // Prevent double-click if a drag just ended (within 300ms)
        if (lastDragEndTimeRef && Date.now() - lastDragEndTimeRef.current < 300) {
          return;
        }
        // Double-click duplicates the activity
        onDuplicate(activity.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect && !isGhost) {
          onSelect(activity.id, e.shiftKey);
        }
      }}
    >
      {!isGhost && !readOnly && (
        <>
          <div
            className="absolute left-0 top-0 h-full w-4 cursor-ew-resize z-30 touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, activity, 'resize-left'); }}
            onTouchStart={(e) => { e.stopPropagation(); onTouchStart(e, activity, 'resize-left'); }}
          />
          <div
            className="absolute right-0 top-0 h-full w-4 cursor-ew-resize z-30 touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, activity, 'resize-right'); }}
            onTouchStart={(e) => { e.stopPropagation(); onTouchStart(e, activity, 'resize-right'); }}
          />
        </>
      )}

      <div className="px-3 py-2 h-full flex flex-col justify-center overflow-hidden pointer-events-none">
        {/* Title row with optional status dot */}
        {fields.title.visible && (
          <div className={`flex items-center gap-2 ${hasSecondaryFields ? 'mb-1' : ''}`}>
            {fields.statusDot.visible && getStatusDot(activity.status)}
            <p
              className="truncate text-gray-900 dark:text-gray-900 leading-tight tracking-tight"
              style={getFieldStyle(fields.title)}
            >
              {activity.title}
            </p>
          </div>
        )}

        {/* Secondary fields row */}
        {hasSecondaryFields && (
          <div className="flex items-center gap-2 flex-wrap">
            {fields.region.visible && (
              <span
                className="tracking-tighter bg-black/10 px-1.5 py-0.5 rounded text-gray-800"
                style={getFieldStyle(fields.region)}
              >
                {activity.region}
              </span>
            )}
            {fields.status.visible && (
              <span
                className="text-gray-700/80"
                style={getFieldStyle(fields.status)}
              >
                {activity.status}
              </span>
            )}
            {fields.dates.visible && (
              <span
                className="text-gray-700/80"
                style={getFieldStyle(fields.dates)}
              >
                {formatDateRange(activity.startDate, activity.endDate)}
              </span>
            )}
            {fields.cost.visible && (
              <span
                className="text-gray-800/90 ml-auto"
                style={getFieldStyle(fields.cost)}
              >
                {activity.cost > 0 ? `${activity.currency}${activity.cost.toLocaleString()}` : 'No Cost'}
              </span>
            )}
          </div>
        )}
      </div>

       {!isGhost && !readOnly && (
         <div className={`absolute right-1 top-0 h-full flex items-center gap-0.5 z-40 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(activity);
            }}
            className="p-1 rounded-full text-gray-800 hover:bg-white/40 focus:outline-none transition-colors"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicate(activity.id);
            }}
            className="p-1 rounded-full text-gray-800 hover:bg-white/40 focus:outline-none transition-colors"
            title="Duplicate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(activity.id);
            }}
            className="p-1 rounded-full text-red-700 hover:bg-red-100/40 focus:outline-none transition-colors"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
       )}
    </div>
  );
};

// Dependency arrow component
const DependencyArrow: React.FC<{
  fromActivity: Activity;
  toActivity: Activity;
  timelineStartDate: Date;
  dayWidth: number;
  swimlaneOffsets: Record<string, { top: number; height: number }>;
  barHeight: number;
}> = ({ fromActivity, toActivity, timelineStartDate, dayWidth, swimlaneOffsets, barHeight }) => {
  const fromEndDays = diffDaysUTC(formatDate(timelineStartDate), fromActivity.endDate);
  const toStartDays = diffDaysUTC(formatDate(timelineStartDate), toActivity.startDate);

  const fromX = (fromEndDays + 1) * dayWidth;
  const toX = toStartDays * dayWidth;

  const fromOffset = swimlaneOffsets[fromActivity.swimlaneId];
  const toOffset = swimlaneOffsets[toActivity.swimlaneId];
  if (!fromOffset || !toOffset) return null;

  const fromY = fromOffset.top + barHeight / 2 + 24;
  const toY = toOffset.top + barHeight / 2 + 24;

  const midX = (fromX + toX) / 2;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
        </marker>
      </defs>
      <path
        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
        stroke="#6366f1"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 2"
        markerEnd="url(#arrowhead)"
        opacity="0.6"
      />
    </svg>
  );
};

const TimelineView = forwardRef<TimelineViewRef, TimelineViewProps>(({
  activities, swimlanes, onEdit, onUpdate, onDeleteActivity, onAddSwimlane, onUpdateSwimlane, onDeleteSwimlane, onReorderSwimlanes, onQuickAdd, onDuplicate, readOnly,
  selectedActivities, onSelectActivity
}, ref) => {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [swimlaneHeights, setSwimlaneHeights] = useState<Record<string, number>>({});
  const dayWidth = ZOOM_LEVELS[zoomIndex];

  // Card display profile state
  const [cardProfiles, setCardProfiles] = useState<CardDisplayProfile[]>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cardDisplayProfiles');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with default profiles (in case new built-ins were added)
          const customProfiles = parsed.filter((p: CardDisplayProfile) => !p.isBuiltIn);
          return [...DEFAULT_CARD_PROFILES, ...customProfiles];
        } catch {
          return [...DEFAULT_CARD_PROFILES];
        }
      }
    }
    return [...DEFAULT_CARD_PROFILES];
  });
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeCardProfileId') || 'detailed';
    }
    return 'detailed';
  });
  const [isCardStylePanelOpen, setIsCardStylePanelOpen] = useState(false);

  // Get active profile
  const activeProfile = cardProfiles.find(p => p.id === activeProfileId) || DEFAULT_CARD_PROFILES[1];

  // Persist profile changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cardDisplayProfiles', JSON.stringify(cardProfiles));
      localStorage.setItem('activeCardProfileId', activeProfileId);
    }
  }, [cardProfiles, activeProfileId]);

  // Profile handlers
  const handleProfileChange = (profileId: string) => {
    setActiveProfileId(profileId);
  };

  const handleProfileUpdate = (updatedProfile: CardDisplayProfile) => {
    setCardProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  };

  const handleProfileCreate = (newProfile: CardDisplayProfile) => {
    setCardProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const handleProfileDelete = (profileId: string) => {
    setCardProfiles(prev => prev.filter(p => p.id !== profileId));
    if (activeProfileId === profileId) {
      setActiveProfileId('detailed');
    }
  };

  // Dynamic timeline based on current year
  const currentYear = new Date().getFullYear();
  const timelineStartDate = new Date(currentYear, 0, 1);
  const timelineEndDate = new Date(currentYear, 11, 31);
  const today = new Date();

  const [dragState, setDragState] = useState<{
    activity: Activity;
    mode: 'drag' | 'resize-left' | 'resize-right';
    startX: number;
    startY: number;
    initialStart: string;
    initialEnd: string;
    initialSwimlaneId: string;
    deltaX: number;
    deltaY: number;
    ghostActivity: Activity | null;
  } | null>(null);

  const [resizingSwimlane, setResizingSwimlane] = useState<{
    id: string;
    startY: number;
    initialHeight: number;
  } | null>(null);

  const [draggedSwimlaneIndex, setDraggedSwimlaneIndex] = useState<number | null>(null);
  const [dragOverSwimlaneIndex, setDragOverSwimlaneIndex] = useState<number | null>(null);

  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [resizingSidebar, setResizingSidebar] = useState<{
    startX: number;
    initialWidth: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastDragEndTimeRef = useRef<number>(0);
  const dragOccurredRef = useRef<boolean>(false);

  // Expose methods via ref for keyboard shortcuts
  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoomIndex(prev => Math.min(ZOOM_LEVELS.length - 1, prev + 1)),
    zoomOut: () => setZoomIndex(prev => Math.max(0, prev - 1)),
    goToToday: () => {
      if (containerRef.current) {
        const todayOffset = diffDaysUTC(formatDate(timelineStartDate), formatDate(today)) * dayWidth;
        containerRef.current.scrollLeft = todayOffset - containerRef.current.clientWidth / 2;
      }
    }
  }), [dayWidth, timelineStartDate, today]);

  const months = useMemo(() => {
    const m = [];
    let curr = new Date(timelineStartDate);
    while (curr <= timelineEndDate) {
      m.push(new Date(curr));
      curr.setMonth(curr.getMonth() + 1);
    }
    return m;
  }, []);

  const totalWidth = useMemo(() => {
    const days = diffDaysUTC(formatDate(timelineStartDate), formatDate(timelineEndDate)) + 1;
    return days * dayWidth;
  }, [dayWidth]);

  const swimlaneLayouts = useMemo(() => {
    const layouts: Record<string, Activity[][]> = {};
    swimlanes.forEach(swimlane => {
      const swimlaneActivities = activities
        .filter(a => a.swimlaneId === swimlane.id)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      const rows: Activity[][] = [];
      swimlaneActivities.forEach(activity => {
        let placed = false;
        for (let i = 0; i < rows.length; i++) {
          const lastInRow = rows[i][rows[i].length - 1];
          if (new Date(activity.startDate) > new Date(lastInRow.endDate)) {
            rows[i].push(activity);
            placed = true;
            break;
          }
        }
        if (!placed) rows.push([activity]);
      });
      layouts[swimlane.id] = rows;
    });
    return layouts;
  }, [activities, swimlanes]);

  const swimlaneOffsets = useMemo(() => {
    let currentOffset = 0;
    const offsets: Record<string, { top: number; height: number }> = {};

    swimlanes.forEach(swimlane => {
      const rows = swimlaneLayouts[swimlane.id] || [];
      const barHeight = activeProfile.cardHeight;
      const rowHeight = barHeight + 12;
      const minHeight = Math.max(1, rows.length) * rowHeight + 48;
      const height = swimlaneHeights[swimlane.id] || minHeight;

      offsets[swimlane.id] = { top: currentOffset, height };
      currentOffset += height;
    });
    return offsets;
  }, [swimlanes, swimlaneLayouts, activeProfile.cardHeight, swimlaneHeights]);

  const swimlaneColorMap = useMemo(() => {
    return swimlanes.reduce((acc, swimlane, index) => {
        acc[swimlane.id] = SWIMLANE_COLORS[index % SWIMLANE_COLORS.length];
        return acc;
    }, {} as Record<string, string>);
  }, [swimlanes]);

  // Calculate swimlane budget usage
  const swimlaneBudgetUsage = useMemo(() => {
    const usage: Record<string, { used: number; budget: number }> = {};
    swimlanes.forEach(swimlane => {
      const swimlaneActivities = activities.filter(a => a.swimlaneId === swimlane.id);
      const used = swimlaneActivities.reduce((sum, a) => sum + (a.cost || 0), 0);
      usage[swimlane.id] = { used, budget: swimlane.budget || 0 };
    });
    return usage;
  }, [activities, swimlanes]);

  // Get dependencies to render
  const dependencyPairs = useMemo(() => {
    const pairs: { from: Activity; to: Activity }[] = [];
    activities.forEach(activity => {
      if (activity.dependencies && activity.dependencies.length > 0) {
        activity.dependencies.forEach(depId => {
          const depActivity = activities.find(a => a.id === depId);
          if (depActivity) {
            pairs.push({ from: depActivity, to: activity });
          }
        });
      }
    });
    return pairs;
  }, [activities]);

  const handleMouseDown = (e: React.MouseEvent, activity: Activity, mode: 'drag' | 'resize-left' | 'resize-right') => {
    if (readOnly) return;
    e.preventDefault();
    dragOccurredRef.current = false;
    setDragState({
      activity,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialStart: activity.startDate,
      initialEnd: activity.endDate,
      initialSwimlaneId: activity.swimlaneId,
      deltaX: 0,
      deltaY: 0,
      ghostActivity: { ...activity },
    });
  };

  const handleTouchStart = (e: React.TouchEvent, activity: Activity, mode: 'drag' | 'resize-left' | 'resize-right') => {
    if (readOnly) return;
    const touch = e.touches[0];
    dragOccurredRef.current = false;
    setDragState({
      activity,
      mode,
      startX: touch.clientX,
      startY: touch.clientY,
      initialStart: activity.startDate,
      initialEnd: activity.endDate,
      initialSwimlaneId: activity.swimlaneId,
      deltaX: 0,
      deltaY: 0,
      ghostActivity: { ...activity },
    });
  };

  const startSwimlaneResize = (e: React.MouseEvent, id: string, initialHeight: number) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setResizingSwimlane({
      id,
      startY: e.clientY,
      initialHeight,
    });
  };

  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingSidebar({
      startX: e.clientX,
      initialWidth: sidebarWidth,
    });
  };

  const handleSwimlaneDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    setDraggedSwimlaneIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSwimlaneDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSwimlaneIndex === null) return;
    if (index !== dragOverSwimlaneIndex) {
      setDragOverSwimlaneIndex(index);
    }
  };

  const handleSwimlaneDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSwimlaneIndex === null) return;

    const newSwimlanes = [...swimlanes];
    const [removed] = newSwimlanes.splice(draggedSwimlaneIndex, 1);
    newSwimlanes.splice(index, 0, removed);

    onReorderSwimlanes(newSwimlanes);
    setDraggedSwimlaneIndex(null);
    setDragOverSwimlaneIndex(null);
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (dragState) {
        const deltaX = clientX - dragState.startX;
        const deltaY = clientY - dragState.startY;

        // Mark drag as having occurred if there's significant movement
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          dragOccurredRef.current = true;
        }

        const deltaDays = Math.round(deltaX / dayWidth);
        const { activity, mode, initialStart, initialEnd } = dragState;

        let newStart = initialStart;
        let newEnd = initialEnd;
        let newSwimlaneId = dragState.initialSwimlaneId;

        if (mode === 'drag') {
          newStart = formatDate(addDays(new Date(initialStart), deltaDays));
          newEnd = formatDate(addDays(new Date(initialEnd), deltaDays));

          if (canvasRef.current && containerRef.current) {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            // Account for scroll position and header height (64px)
            const scrollTop = containerRef.current.scrollTop;
            const headerHeight = 64; // Fixed header height in timeline
            const relativeY = clientY - canvasRect.top + scrollTop - headerHeight;

            // Find target swimlane based on Y position with better detection
            let foundSwimlane = null;
            for (const s of swimlanes) {
              const bounds = swimlaneOffsets[s.id];
              // Use a margin to make swimlane detection more forgiving
              if (relativeY >= bounds.top - 10 && relativeY <= (bounds.top + bounds.height + 10)) {
                foundSwimlane = s;
                break;
              }
            }

            if (foundSwimlane) {
              newSwimlaneId = foundSwimlane.id;
            } else {
              // Fallback: find the closest swimlane if outside bounds
              let closestSwimlane = swimlanes[0];
              let closestDistance = Infinity;
              for (const s of swimlanes) {
                const bounds = swimlaneOffsets[s.id];
                const center = bounds.top + bounds.height / 2;
                const distance = Math.abs(relativeY - center);
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestSwimlane = s;
                }
              }
              newSwimlaneId = closestSwimlane.id;
            }
          }
        } else if (mode === 'resize-left') {
          newStart = formatDate(addDays(new Date(initialStart), deltaDays));
          if (newStart > newEnd) newStart = newEnd;
        } else if (mode === 'resize-right') {
          newEnd = formatDate(addDays(new Date(initialEnd), deltaDays));
          if (newEnd < newStart) newEnd = newStart;
        }

        setDragState(prev => prev ? ({
          ...prev,
          deltaX,
          deltaY,
          ghostActivity: {
            ...prev.activity,
            startDate: newStart,
            endDate: newEnd,
            swimlaneId: newSwimlaneId
          }
        }) : null);
      }

      if (resizingSwimlane) {
        const deltaY = clientY - resizingSwimlane.startY;
        const newHeight = Math.max(80, resizingSwimlane.initialHeight + deltaY);
        setSwimlaneHeights(prev => ({
          ...prev,
          [resizingSwimlane.id]: newHeight
        }));
      }

      if (resizingSidebar) {
        const deltaX = clientX - resizingSidebar.startX;
        const newWidth = Math.max(160, Math.min(500, resizingSidebar.initialWidth + deltaX));
        setSidebarWidth(newWidth);
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (dragState || resizingSwimlane) {
        e.preventDefault(); // Prevent scrolling while dragging
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleEnd = () => {
      if (dragState && dragState.ghostActivity) {
        const { ghostActivity } = dragState;
        if (ghostActivity.startDate !== dragState.activity.startDate ||
            ghostActivity.endDate !== dragState.activity.endDate ||
            ghostActivity.swimlaneId !== dragState.activity.swimlaneId) {
          onUpdate(ghostActivity);
        }
        // Record the drag end time to prevent accidental double-click
        if (dragOccurredRef.current) {
          lastDragEndTimeRef.current = Date.now();
        }
      }
      setDragState(null);
      setResizingSwimlane(null);
      setResizingSidebar(null);
    };

    if (dragState || resizingSwimlane || resizingSidebar) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [dragState, resizingSwimlane, resizingSidebar, dayWidth, onUpdate, swimlanes, swimlaneOffsets]);

  const handleCanvasClick = (e: React.MouseEvent, swimlaneId: string) => {
    if (readOnly) return;

    // More robust check: only proceed if the click is directly on the swimlane container
    // or on an empty part of it (not on an activity bar)
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    // If clicked exactly on the container, proceed
    if (target === currentTarget) {
      // Direct click on swimlane - create activity
    } else {
      // Check if we clicked on an activity bar or its children
      // Activity bars have IDs starting with "activity-" or "ghost-"
      let element: HTMLElement | null = target;
      while (element && element !== currentTarget) {
        const id = element.id;
        if (id && (id.startsWith('activity-') || id.startsWith('ghost-'))) {
          // Clicked on an activity, don't create a new one
          return;
        }
        element = element.parentElement;
      }
      // If we got here, we clicked on some other element inside the swimlane
      // (like a grid line with pointer-events-none that somehow caught the click)
      // We should still create the activity
    }

    const rect = currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const dayOffset = Math.floor(clickX / dayWidth);
    const startDate = formatDate(addDays(timelineStartDate, dayOffset));
    const endDate = formatDate(addDays(timelineStartDate, dayOffset + 7));
    console.log('Timeline quick-add click:', { swimlaneId, startDate, endDate, clickX, dayOffset });
    onQuickAdd(startDate, endDate, swimlaneId);
  };

  const handleSwimlaneNameChange = (swimlane: Swimlane, newName: string) => {
    if (readOnly) return;
    onUpdateSwimlane({ ...swimlane, name: newName });
  };

  // Calculate today line position
  const todayOffset = diffDaysUTC(formatDate(timelineStartDate), formatDate(today)) * dayWidth;
  const showTodayLine = today >= timelineStartDate && today <= timelineEndDate;

  const barHeight = activeProfile.cardHeight;

  if (swimlanes.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-valuenova-bg transition-colors duration-300">
        <EmptyState
          title="No Swimlanes Yet"
          description="Create your first swimlane to start organizing your campaign activities on the timeline."
          actionLabel="Add Swimlane"
          onAction={onAddSwimlane}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-valuenova-bg transition-colors duration-300">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-valuenova-border bg-gray-50/30 dark:bg-valuenova-bg transition-colors">
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-white dark:bg-valuenova-surface p-1 rounded-lg border border-gray-200 dark:border-valuenova-border shadow-sm">
                <button onClick={() => setZoomIndex(Math.max(0, zoomIndex - 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-md text-gray-500 dark:text-valuenova-muted transition-colors" title="Zoom out (-)"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg></button>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 text-gray-400 dark:text-valuenova-muted min-w-[80px] text-center">Zoom {Math.round((dayWidth/12)*100)}%</span>
                <button onClick={() => setZoomIndex(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-md text-gray-500 dark:text-valuenova-muted transition-colors" title="Zoom in (+)"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></button>
            </div>

            {/* Profile selector */}
            <div className="flex items-center bg-white dark:bg-valuenova-surface p-1 rounded-lg border border-gray-200 dark:border-valuenova-border shadow-sm">
                {cardProfiles.slice(0, 3).map(p => (
                    <button
                        key={p.id}
                        onClick={() => handleProfileChange(p.id)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${activeProfileId === p.id ? 'bg-indigo-600 dark:bg-valuenova-accent text-white shadow-md' : 'text-gray-400 dark:text-valuenova-muted hover:text-gray-600 dark:hover:text-white'}`}
                        title={`${p.name} view`}
                    >
                        {p.name}
                    </button>
                ))}
                {cardProfiles.length > 3 && (
                  <select
                    value={cardProfiles.slice(0, 3).some(p => p.id === activeProfileId) ? '' : activeProfileId}
                    onChange={(e) => e.target.value && handleProfileChange(e.target.value)}
                    className="px-2 py-1.5 text-[10px] font-black uppercase bg-transparent border-none text-gray-400 dark:text-valuenova-muted cursor-pointer focus:ring-0"
                  >
                    <option value="">More</option>
                    {cardProfiles.slice(3).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
            </div>

            {/* Card Style button */}
            <button
              onClick={() => setIsCardStylePanelOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg text-gray-600 dark:text-valuenova-muted hover:text-indigo-600 dark:hover:text-valuenova-accent hover:border-indigo-300 dark:hover:border-valuenova-accent transition-colors shadow-sm"
              title="Customize card display"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Card Style
            </button>

            {/* Go to Today button */}
            <button
              onClick={() => {
                if (containerRef.current) {
                  const todayScrollPos = todayOffset - containerRef.current.clientWidth / 2;
                  containerRef.current.scrollTo({ left: todayScrollPos, behavior: 'smooth' });
                }
              }}
              className="px-3 py-1.5 text-[10px] font-black uppercase bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg text-indigo-600 dark:text-valuenova-accent hover:bg-indigo-50 dark:hover:bg-valuenova-bg transition-colors shadow-sm"
              title="Go to today (T)"
            >
              Today
            </button>
        </div>
        {readOnly && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/20 rounded-lg">
             <svg className="w-3.5 h-3.5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-11a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Read Only Access</span>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-auto scrollbar-hide flex relative timeline-container" ref={containerRef}>
        <div className="flex flex-col sticky left-0 z-30 bg-white/95 dark:bg-valuenova-bg/95 backdrop-blur-sm border-r border-gray-200 dark:border-valuenova-border shrink-0 shadow-xl shadow-black/5 transition-colors relative" style={{ width: `${sidebarWidth}px` }}>
          {/* Sidebar resize handle */}
          <div
            className="absolute right-0 top-0 h-full w-1 cursor-ew-resize z-50 hover:bg-indigo-400 dark:hover:bg-valuenova-accent transition-colors group"
            onMouseDown={startSidebarResize}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 -mr-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-6 rounded-full bg-indigo-400 dark:bg-valuenova-accent" />
            </div>
          </div>
          <div className="h-16 border-b border-gray-100 dark:border-valuenova-border"></div>
          {swimlanes.map((swimlane, index) => {
            const height = swimlaneOffsets[swimlane.id].height;
            const isActivityTarget = dragState?.ghostActivity?.swimlaneId === swimlane.id;
            const isBeingDragged = draggedSwimlaneIndex === index;
            const isDragOver = dragOverSwimlaneIndex === index;
            const budgetData = swimlaneBudgetUsage[swimlane.id];
            const budgetPercent = budgetData.budget > 0 ? Math.min(100, (budgetData.used / budgetData.budget) * 100) : 0;

            return (
              <div
                key={swimlane.id}
                draggable={!readOnly}
                onDragStart={(e) => handleSwimlaneDragStart(e, index)}
                onDragOver={(e) => handleSwimlaneDragOver(e, index)}
                onDrop={(e) => handleSwimlaneDrop(e, index)}
                onDragEnd={() => { setDraggedSwimlaneIndex(null); setDragOverSwimlaneIndex(null); }}
                className={`group relative flex flex-col justify-center px-6 py-3 border-b border-gray-100 dark:border-valuenova-border transition-all duration-200
                  ${isActivityTarget ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-valuenova-surface/30'}
                  ${isBeingDragged ? 'opacity-40 grayscale' : 'opacity-100'}
                  ${isDragOver && draggedSwimlaneIndex !== index ? 'border-t-4 border-t-indigo-500' : ''}
                `}
                style={{ height: `${height}px` }}
              >
                <div className="flex items-center gap-2">
                  {/* Drag Handle */}
                  {!readOnly && (
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-indigo-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-grow">
                      <input
                        type="text"
                        value={swimlane.name}
                        onChange={(e) => handleSwimlaneNameChange(swimlane, e.target.value)}
                        disabled={readOnly}
                        className={`w-full bg-transparent border-none p-0 font-black text-xs uppercase tracking-wider transition-all focus:ring-1 focus:ring-indigo-500/30 focus:bg-black/5 dark:focus:bg-white/5 rounded px-1 -mx-1 ${isActivityTarget ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'} hover:bg-black/5 dark:hover:bg-white/5 cursor-text`}
                      />
                  </div>

                  {!readOnly && (
                    <button onClick={() => onDeleteSwimlane(swimlane.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  )}
                </div>

                {/* Budget display */}
                {budgetData.budget > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[9px] mb-1">
                      <span className="font-bold text-gray-400 dark:text-valuenova-muted">Budget</span>
                      <span className={`font-black ${budgetPercent > 100 ? 'text-red-500' : budgetPercent > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        ${budgetData.used.toLocaleString()} / ${budgetData.budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-valuenova-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${budgetPercent > 100 ? 'bg-red-500' : budgetPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, budgetPercent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {!readOnly && (
                  <div className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize hover:bg-indigo-400 dark:hover:bg-valuenova-accent transition-colors z-40" onMouseDown={(e) => startSwimlaneResize(e, swimlane.id, height)} />
                )}
              </div>
            );
          })}
          {!readOnly && (
            <button onClick={onAddSwimlane} className="w-full py-4 text-[10px] font-black uppercase text-gray-400 dark:text-valuenova-muted hover:text-indigo-600 dark:hover:text-valuenova-accent hover:bg-gray-50 dark:hover:bg-valuenova-surface/50 border-b border-gray-100 dark:border-valuenova-border flex items-center justify-center gap-2 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Swimlane
            </button>
          )}
        </div>

        <div className="relative" style={{ width: `${totalWidth}px` }} ref={canvasRef}>
          {/* Today line */}
          {showTodayLine && (
            <div
              className="absolute top-0 h-full w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: `${todayOffset}px` }}
            >
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-[9px] font-black uppercase rounded-b-md whitespace-nowrap">
                Today
              </div>
            </div>
          )}

          <div className="flex h-16 sticky top-0 z-20 bg-white/95 dark:bg-valuenova-bg/95 backdrop-blur-sm border-b border-gray-100 dark:border-valuenova-border transition-colors">
            {months.map(monthDate => {
              const daysInMonth = getDaysInMonth(monthDate.getFullYear(), monthDate.getMonth());
              return (
                <div key={monthDate.toISOString()} className="h-full border-r border-gray-100 dark:border-valuenova-border flex flex-col justify-center items-center shrink-0" style={{ width: `${daysInMonth * dayWidth}px` }}>
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">{monthDate.toLocaleString('default', { month: 'long' })}</span>
                  <span className="text-[9px] font-bold text-gray-400 dark:text-valuenova-muted mt-0.5">{monthDate.getFullYear()}</span>
                </div>
              );
            })}
          </div>

          <div className="relative">
            {months.map(monthDate => (
              <div key={`line-${monthDate.toISOString()}`} className="absolute top-0 h-full border-r border-gray-50 dark:border-valuenova-border/10 pointer-events-none" style={{ left: `${diffDaysUTC(formatDate(timelineStartDate), formatDate(monthDate)) * dayWidth}px` }}></div>
            ))}

            {/* Dependency arrows */}
            {dependencyPairs.map((pair, idx) => (
              <DependencyArrow
                key={`dep-${idx}`}
                fromActivity={pair.from}
                toActivity={pair.to}
                timelineStartDate={timelineStartDate}
                dayWidth={dayWidth}
                swimlaneOffsets={swimlaneOffsets}
                barHeight={barHeight}
              />
            ))}

            {swimlanes.map((swimlane, index) => {
              const rows = swimlaneLayouts[swimlane.id] || [];
              const rowHeight = barHeight + 12;
              const height = swimlaneOffsets[swimlane.id].height;
              const isActive = dragState?.ghostActivity?.swimlaneId === swimlane.id;
              const isBeingDragged = draggedSwimlaneIndex === index;
              const isDragOver = dragOverSwimlaneIndex === index;

              return (
                <div
                  key={swimlane.id}
                  className={`relative border-b border-gray-100 dark:border-valuenova-border/40 transition-colors overflow-visible
                    ${isActive ? 'bg-indigo-50/20 dark:bg-indigo-900/5 ring-1 ring-inset ring-indigo-500/10' : 'hover:bg-gray-50/20 dark:hover:bg-valuenova-surface/5'}
                    ${isBeingDragged ? 'opacity-40 grayscale' : 'opacity-100'}
                    ${isDragOver && draggedSwimlaneIndex !== index ? 'border-t-4 border-t-indigo-500' : ''}
                    ${readOnly ? 'cursor-default' : 'cursor-crosshair'}
                  `}
                  style={{ height: `${height}px` }}
                  onClick={(e) => handleCanvasClick(e, swimlane.id)}
                >
                  {/* Render ghost activity first if dragging in this swimlane */}
                  {dragState?.ghostActivity?.swimlaneId === swimlane.id && (
                    <ActivityBar
                      activity={dragState.ghostActivity}
                      timelineStartDate={timelineStartDate}
                      top={(swimlaneLayouts[swimlane.id]?.findIndex(row => row.some(a => a.id === dragState.activity.id)) ?? 0) * rowHeight + 24}
                      cardProfile={activeProfile}
                      onMouseDown={() => {}}
                      onTouchStart={() => {}}
                      onEdit={() => {}}
                      onDuplicate={() => {}}
                      onDelete={() => {}}
                      isDragging={false}
                      isGhost={true}
                      dayWidth={dayWidth}
                      colorClasses={swimlaneColorMap[dragState.ghostActivity.swimlaneId]}
                    />
                  )}

                  {rows.map((row, rowIndex) => (
                    row.map(activity => {
                      const isDragging = dragState?.activity.id === activity.id;
                      return (
                        <ActivityBar
                          key={activity.id}
                          activity={activity}
                          timelineStartDate={timelineStartDate}
                          top={rowIndex * rowHeight + 24}
                          cardProfile={activeProfile}
                          onMouseDown={handleMouseDown}
                          onTouchStart={handleTouchStart}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDeleteActivity}
                          isDragging={isDragging}
                          dayWidth={dayWidth}
                          colorClasses={swimlaneColorMap[activity.swimlaneId]}
                          draggingOffset={isDragging ? { x: dragState!.deltaX, y: dragState!.deltaY } : undefined}
                          readOnly={readOnly}
                          isSelected={selectedActivities?.has(activity.id)}
                          onSelect={onSelectActivity}
                          lastDragEndTimeRef={lastDragEndTimeRef}
                        />
                      );
                    })
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Style Panel */}
      <CardStylePanel
        isOpen={isCardStylePanelOpen}
        onClose={() => setIsCardStylePanelOpen(false)}
        profiles={cardProfiles}
        activeProfileId={activeProfileId}
        onProfileChange={handleProfileChange}
        onProfileUpdate={handleProfileUpdate}
        onProfileCreate={handleProfileCreate}
        onProfileDelete={handleProfileDelete}
      />
    </div>
  );
});

TimelineView.displayName = 'TimelineView';

export default TimelineView;

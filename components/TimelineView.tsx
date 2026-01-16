
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Activity, Swimlane, CampaignStatus } from '../types';
import { SWIMLANE_COLORS } from '../constants';

const ZOOM_LEVELS = [4, 8, 12, 20, 30]; // pixels per day
const DEFAULT_ZOOM_INDEX = 2; // Corresponds to 12px

type Density = 'compact' | 'detailed';

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
}

const ActivityBar: React.FC<{
  activity: Activity;
  timelineStartDate: Date;
  top: number;
  density: Density;
  onMouseDown: (e: React.MouseEvent, activity: Activity, mode: 'drag' | 'resize-left' | 'resize-right') => void;
  onDoubleClick: (activity: Activity) => void;
  onDuplicate: (activityId: string) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  isGhost?: boolean;
  dayWidth: number;
  colorClasses: string;
  draggingOffset?: { x: number; y: number };
  readOnly?: boolean;
}> = ({ activity, timelineStartDate, top, density, onMouseDown, onDoubleClick, onDuplicate, onDelete, isDragging, isGhost, dayWidth, colorClasses, draggingOffset, readOnly }) => {
  const startOffsetDays = diffDaysUTC(formatDate(timelineStartDate), activity.startDate);
  const durationDays = diffDaysUTC(activity.startDate, activity.endDate) + 1;

  const left = startOffsetDays * dayWidth;
  const width = Math.max(durationDays * dayWidth, 2);
  
  const barHeight = density === 'compact' ? 32 : 68;

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
      case 'Committed': return <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />;
      case 'Negotiating': return <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />;
      default: return <div className="w-2 h-2 rounded-full bg-sky-500 shadow-sm" />;
    }
  };

  return (
    <div
      id={isGhost ? `ghost-${activity.id}` : `activity-${activity.id}`}
      className={`absolute rounded-lg shadow-sm border group flex flex-col ${activity.color ? '' : colorClasses} 
        ${isDragging ? 'shadow-2xl scale-105 cursor-grabbing ring-2 ring-indigo-500/50' : isGhost ? 'border-dashed border-indigo-400 pointer-events-none' : `border-black/5 dark:border-white/10 hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${readOnly ? 'cursor-default' : 'cursor-grab'}`}`}
      style={barStyle}
      onMouseDown={(e) => {
        if (isGhost || readOnly) return;
        if (e.button !== 0) return;
        onMouseDown(e, activity, 'drag');
      }}
      onDoubleClick={(e) => {
        if (isGhost) return;
        e.stopPropagation();
        onDoubleClick(activity);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {!isGhost && !readOnly && (
        <>
          <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-30" onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, activity, 'resize-left'); }} />
          <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-30" onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, activity, 'resize-right'); }} />
        </>
      )}
      
      <div className="px-3 py-2 h-full flex flex-col justify-center overflow-hidden pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          {density === 'detailed' && getStatusDot(activity.status)}
          <p className="font-black text-[11px] truncate text-gray-900 dark:text-gray-900 leading-tight uppercase tracking-tight">
            {activity.title}
          </p>
        </div>

        {density === 'detailed' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[8px] font-black uppercase tracking-tighter bg-black/10 px-1.5 py-0.5 rounded text-gray-800">
              {activity.region}
            </span>
            <span className="text-[9px] font-bold text-gray-700/80">
              {activity.status}
            </span>
            <span className="text-[9px] font-black text-gray-800/90 ml-auto">
              {activity.cost > 0 ? `${activity.currency}${activity.cost.toLocaleString()}` : 'No Cost'}
            </span>
          </div>
        )}
      </div>

       {!isGhost && !readOnly && (
         <div className="absolute right-1 top-0 h-full flex items-center gap-0.5 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012-2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              if(window.confirm('Delete this activity?')) {
                onDelete(activity.id);
              }
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

const TimelineView: React.FC<TimelineViewProps> = ({ activities, swimlanes, onEdit, onUpdate, onDeleteActivity, onAddSwimlane, onUpdateSwimlane, onDeleteSwimlane, onReorderSwimlanes, onQuickAdd, onDuplicate, readOnly }) => {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [density, setDensity] = useState<Density>('detailed');
  const [swimlaneHeights, setSwimlaneHeights] = useState<Record<string, number>>({});
  const dayWidth = ZOOM_LEVELS[zoomIndex];
  
  const timelineStartDate = new Date(2025, 0, 1);
  const timelineEndDate = new Date(2025, 11, 31);
  
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

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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
      const barHeight = density === 'compact' ? 32 : 68;
      const rowHeight = barHeight + 12;
      const minHeight = Math.max(1, rows.length) * rowHeight + 48;
      const height = swimlaneHeights[swimlane.id] || minHeight;
      
      offsets[swimlane.id] = { top: currentOffset, height };
      currentOffset += height;
    });
    return offsets;
  }, [swimlanes, swimlaneLayouts, density, swimlaneHeights]);

  const swimlaneColorMap = useMemo(() => {
    return swimlanes.reduce((acc, swimlane, index) => {
        acc[swimlane.id] = SWIMLANE_COLORS[index % SWIMLANE_COLORS.length];
        return acc;
    }, {} as Record<string, string>);
  }, [swimlanes]);

  const handleMouseDown = (e: React.MouseEvent, activity: Activity, mode: 'drag' | 'resize-left' | 'resize-right') => {
    if (readOnly) return;
    e.preventDefault();
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
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;
        
        const deltaDays = Math.round(deltaX / dayWidth);
        const { activity, mode, initialStart, initialEnd } = dragState;
        
        let newStart = initialStart;
        let newEnd = initialEnd;
        let newSwimlaneId = dragState.initialSwimlaneId;

        if (mode === 'drag') {
          newStart = formatDate(addDays(new Date(initialStart), deltaDays));
          newEnd = formatDate(addDays(new Date(initialEnd), deltaDays));
          
          if (canvasRef.current) {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const relativeY = e.clientY - canvasRect.top;
            
            const targetSwimlane = swimlanes.find(s => {
              const bounds = swimlaneOffsets[s.id];
              return relativeY >= bounds.top && relativeY <= (bounds.top + bounds.height);
            });
            
            if (targetSwimlane) {
                newSwimlaneId = targetSwimlane.id;
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
        const deltaY = e.clientY - resizingSwimlane.startY;
        const newHeight = Math.max(80, resizingSwimlane.initialHeight + deltaY);
        setSwimlaneHeights(prev => ({
          ...prev,
          [resizingSwimlane.id]: newHeight
        }));
      }
    };

    const handleGlobalMouseUp = () => {
      if (dragState && dragState.ghostActivity) {
        const { ghostActivity } = dragState;
        if (ghostActivity.startDate !== dragState.activity.startDate || 
            ghostActivity.endDate !== dragState.activity.endDate || 
            ghostActivity.swimlaneId !== dragState.activity.swimlaneId) {
          onUpdate(ghostActivity);
        }
      }
      setDragState(null);
      setResizingSwimlane(null);
    };

    if (dragState || resizingSwimlane) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState, resizingSwimlane, dayWidth, onUpdate, swimlanes, swimlaneOffsets]);

  const handleCanvasClick = (e: React.MouseEvent, swimlaneId: string) => {
    if (readOnly) return;
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const dayOffset = Math.floor(clickX / dayWidth);
    const startDate = formatDate(addDays(timelineStartDate, dayOffset));
    const endDate = formatDate(addDays(timelineStartDate, dayOffset + 7));
    onQuickAdd(startDate, endDate, swimlaneId);
  };

  const handleSwimlaneNameChange = (swimlane: Swimlane, newName: string) => {
    if (readOnly) return;
    onUpdateSwimlane({ ...swimlane, name: newName });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-valuenova-bg transition-colors duration-300">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-valuenova-border bg-gray-50/30 dark:bg-valuenova-bg transition-colors">
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-white dark:bg-valuenova-surface p-1 rounded-lg border border-gray-200 dark:border-valuenova-border shadow-sm">
                <button onClick={() => setZoomIndex(Math.max(0, zoomIndex - 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-md text-gray-500 dark:text-valuenova-muted transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg></button>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 text-gray-400 dark:text-valuenova-muted min-w-[80px] text-center">Zoom {Math.round((dayWidth/12)*100)}%</span>
                <button onClick={() => setZoomIndex(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-md text-gray-500 dark:text-valuenova-muted transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></button>
            </div>
            
            <div className="flex items-center bg-white dark:bg-valuenova-surface p-1 rounded-lg border border-gray-200 dark:border-valuenova-border shadow-sm">
                {(['compact', 'detailed'] as Density[]).map(d => (
                    <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${density === d ? 'bg-indigo-600 dark:bg-valuenova-accent text-white shadow-md' : 'text-gray-400 dark:text-valuenova-muted hover:text-gray-600 dark:hover:text-white'}`}
                    >
                        {d}
                    </button>
                ))}
            </div>
        </div>
        {readOnly && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/20 rounded-lg">
             <svg className="w-3.5 h-3.5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-11a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Read Only Access</span>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-auto scrollbar-hide flex relative" ref={containerRef}>
        <div className="flex flex-col sticky left-0 z-30 bg-white/95 dark:bg-valuenova-bg/95 backdrop-blur-sm border-r border-gray-200 dark:border-valuenova-border w-64 shrink-0 shadow-xl shadow-black/5 transition-colors">
          <div className="h-16 border-b border-gray-100 dark:border-valuenova-border"></div>
          {swimlanes.map((swimlane, index) => {
            const height = swimlaneOffsets[swimlane.id].height;
            const isActivityTarget = dragState?.ghostActivity?.swimlaneId === swimlane.id;
            const isBeingDragged = draggedSwimlaneIndex === index;
            const isDragOver = dragOverSwimlaneIndex === index;

            return (
              <div 
                key={swimlane.id} 
                draggable={!readOnly}
                onDragStart={(e) => handleSwimlaneDragStart(e, index)}
                onDragOver={(e) => handleSwimlaneDragOver(e, index)}
                onDrop={(e) => handleSwimlaneDrop(e, index)}
                onDragEnd={() => { setDraggedSwimlaneIndex(null); setDragOverSwimlaneIndex(null); }}
                className={`group relative flex items-center px-6 border-b border-gray-100 dark:border-valuenova-border transition-all duration-200 
                  ${isActivityTarget ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-valuenova-surface/30'}
                  ${isBeingDragged ? 'opacity-40 grayscale' : 'opacity-100'}
                  ${isDragOver && draggedSwimlaneIndex !== index ? 'border-t-4 border-t-indigo-500' : ''}
                `} 
                style={{ height: `${height}px` }}
              >
                {/* Drag Handle */}
                {!readOnly && (
                  <div className="mr-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-indigo-500 transition-colors">
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
                  <button onClick={() => onDeleteSwimlane(swimlane.id)} className="absolute right-4 opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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

            {swimlanes.map((swimlane, index) => {
              const rows = swimlaneLayouts[swimlane.id] || [];
              const barHeight = density === 'compact' ? 32 : 68;
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
                      density={density}
                      onMouseDown={() => {}}
                      onDoubleClick={() => {}}
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
                          density={density}
                          onMouseDown={handleMouseDown}
                          onDoubleClick={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDeleteActivity}
                          isDragging={isDragging}
                          dayWidth={dayWidth}
                          colorClasses={swimlaneColorMap[activity.swimlaneId]}
                          draggingOffset={isDragging ? { x: dragState!.deltaX, y: dragState!.deltaY } : undefined}
                          readOnly={readOnly}
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
    </div>
  );
};

export default TimelineView;

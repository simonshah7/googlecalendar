
import React, { useState, useMemo } from 'react';
import { Activity, Swimlane } from '../types';
import { SWIMLANE_COLORS } from '../constants';
import EmptyState from './EmptyState';

interface CalendarViewProps {
  activities: Activity[];
  swimlanes: Swimlane[];
  onEdit: (activity: Activity) => void;
  onQuickAdd?: (date: string, swimlaneId?: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ activities, swimlanes, onEdit, onQuickAdd }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days: Date[] = [];
  let day = new Date(startDate);
  while (day <= endDate) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const dayIsInRange = (day: Date, activity: Activity) => {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const start = new Date(new Date(activity.startDate).setUTCHours(0,0,0,0));
    const end = new Date(new Date(activity.endDate).setUTCHours(0,0,0,0));
    return d >= start && d <= end;
  };

  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const swimlaneColorMap = useMemo(() => {
    return swimlanes.reduce((acc, swimlane, index) => {
        acc[swimlane.id] = SWIMLANE_COLORS[index % SWIMLANE_COLORS.length];
        return acc;
    }, {} as Record<string, string>);
  }, [swimlanes]);

  const formatDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleDayClick = (e: React.MouseEvent, date: Date) => {
    // Only trigger if clicking on the day cell itself, not on an activity
    if (e.target === e.currentTarget && onQuickAdd) {
      onQuickAdd(formatDateString(date));
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-valuenova-bg p-4 rounded-lg shadow-sm transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => changeMonth(-1)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-valuenova-surface text-gray-600 dark:text-valuenova-text transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
            >
              Today
            </button>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-valuenova-surface text-gray-600 dark:text-valuenova-text transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <EmptyState
          title="No Activities Yet"
          description="Click on any day to create your first activity, or switch to Timeline view to get started."
          actionLabel={onQuickAdd ? "Create Activity" : undefined}
          onAction={onQuickAdd ? () => onQuickAdd(formatDateString(today)) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-valuenova-bg p-4 rounded-lg shadow-sm transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => changeMonth(-1)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-valuenova-surface text-gray-600 dark:text-valuenova-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            Today
          </button>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-valuenova-surface text-gray-600 dark:text-valuenova-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-valuenova-border border border-gray-200 dark:border-valuenova-border rounded-lg overflow-hidden transition-colors">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
          <div key={dayName} className="text-center font-black py-3 bg-gray-50 dark:bg-valuenova-surface text-gray-500 dark:text-valuenova-muted text-[10px] uppercase tracking-wider">{dayName}</div>
        ))}

        {days.map((d, i) => {
          const isCurrentMonth = d.getMonth() === currentDate.getMonth();
          const activitiesOnDay = activities.filter(c => dayIsInRange(d, c));
          const isTodayDate = isToday(d);

          return (
            <div
              key={i}
              className={`relative min-h-[140px] p-2 transition-colors group ${
                isCurrentMonth ? 'bg-white dark:bg-valuenova-bg' : 'bg-gray-50 dark:bg-valuenova-bg/40'
              } ${onQuickAdd && isCurrentMonth ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-valuenova-surface/30' : ''}`}
              onClick={(e) => isCurrentMonth && handleDayClick(e, d)}
            >
              {/* Date number with Today highlight */}
              <span className={`absolute top-2 right-2 text-xs font-bold transition-colors flex items-center justify-center ${
                isTodayDate
                  ? 'w-7 h-7 -mt-1 -mr-1 bg-red-500 text-white rounded-full'
                  : isCurrentMonth
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-300 dark:text-valuenova-muted/30'
              }`}>
                {d.getDate()}
              </span>

              {/* Quick add hint on hover */}
              {onQuickAdd && isCurrentMonth && activitiesOnDay.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 dark:text-valuenova-muted">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Click to add
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                {activitiesOnDay.map(activity => {
                  const colorClasses = swimlaneColorMap[activity.swimlaneId] || 'bg-gray-100 border-gray-500 text-gray-800';
                  return (
                    <div
                      key={activity.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(activity);
                      }}
                      className={`p-1.5 rounded-md text-[10px] font-black uppercase leading-tight cursor-pointer ${activity.color ? 'border' : colorClasses} truncate border-l-4 shadow-sm hover:brightness-110 active:scale-95 transition-all text-gray-900`}
                      style={activity.color ? { backgroundColor: activity.color, borderColor: 'rgba(0,0,0,0.1)', borderLeftColor: 'rgba(0,0,0,0.3)' } : {}}
                      title={activity.title}
                    >
                      {activity.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {swimlanes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {swimlanes.map((swimlane, index) => {
            const colorClass = SWIMLANE_COLORS[index % SWIMLANE_COLORS.length];
            return (
              <div key={swimlane.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colorClass.split(' ')[0]}`} />
                <span className="text-[10px] font-bold text-gray-500 dark:text-valuenova-muted uppercase tracking-wider">
                  {swimlane.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarView;

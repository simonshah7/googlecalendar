
import React, { useState, useMemo } from 'react';
import { Activity, Swimlane } from '../types';
import { SWIMLANE_COLORS } from '../constants';

interface CalendarViewProps {
  activities: Activity[];
  swimlanes: Swimlane[];
  onEdit: (activity: Activity) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ activities, swimlanes, onEdit }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 2, 1)); 

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = [];
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

  const dayIsInRange = (day: Date, activity: Activity) => {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const start = new Date(new Date(activity.startDate).setUTCHours(0,0,0,0));
    const end = new Date(new Date(activity.endDate).setUTCHours(0,0,0,0));
    return d >= start && d <= end;
  };

  const swimlaneColorMap = useMemo(() => {
    return swimlanes.reduce((acc, swimlane, index) => {
        acc[swimlane.id] = SWIMLANE_COLORS[index % SWIMLANE_COLORS.length];
        return acc;
    }, {} as Record<string, string>);
  }, [swimlanes]);
  
  return (
    <div className="bg-white dark:bg-valuenova-bg p-4 rounded-lg shadow-sm transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => changeMonth(-1)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-valuenova-surface text-gray-600 dark:text-valuenova-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
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

          return (
            <div key={i} className={`relative min-h-[140px] p-2 transition-colors ${isCurrentMonth ? 'bg-white dark:bg-valuenova-bg' : 'bg-gray-50 dark:bg-valuenova-bg/40'}`}>
              <span className={`absolute top-2 right-2 text-xs font-bold transition-colors ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-valuenova-muted/30'}`}>
                {d.getDate()}
              </span>
              <div className="mt-6 space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                {activitiesOnDay.map(activity => {
                  const colorClasses = swimlaneColorMap[activity.swimlaneId] || 'bg-gray-100 border-gray-500 text-gray-800';
                  return (
                    <div
                      key={activity.id}
                      onClick={() => onEdit(activity)}
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
    </div>
  );
};

export default CalendarView;

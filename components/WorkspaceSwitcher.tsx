
import React, { useState } from 'react';
import { Calendar, User, UserRole, CalendarPermission } from '../types';

interface WorkspaceSwitcherProps {
  calendars: Calendar[];
  activeCalendarId: string;
  onSwitch: (id: string) => void;
  onClose: () => void;
  onAddCalendar: (name: string) => void;
  onDeleteCalendar?: (id: string) => void;
  user: User | null;
  permissions: CalendarPermission[];
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  calendars, activeCalendarId, onSwitch, onClose, onAddCalendar, onDeleteCalendar, user, permissions
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCalName, setNewCalName] = useState('');

  const visibleCalendars = calendars.filter(cal => {
    if (!user) return false;
    if (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN) return true;
    return permissions.some(p => p.calendarId === cal.id && p.userId === user.id);
  });

  const handleAdd = () => {
    if (newCalName.trim()) {
      onAddCalendar(newCalName);
      setNewCalName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-start">
      <div className="w-full max-w-sm bg-white dark:bg-valuenova-bg h-full shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col border-r border-gray-200 dark:border-valuenova-border">
        <div className="p-8 flex justify-between items-center border-b border-gray-100 dark:border-valuenova-border">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Workspaces</h2>
            <p className="text-xs text-gray-500 dark:text-valuenova-muted font-bold">Manage multiple marketing calendars.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-valuenova-surface rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {visibleCalendars.map(cal => (
            <div
              key={cal.id}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group
                ${activeCalendarId === cal.id
                  ? 'bg-indigo-50 dark:bg-valuenova-surface border-indigo-200 dark:border-valuenova-accent shadow-sm'
                  : 'bg-white dark:bg-valuenova-surface border-gray-100 dark:border-valuenova-border hover:border-indigo-200 dark:hover:border-valuenova-accent/50'}
              `}
            >
              <button
                onClick={() => { onSwitch(cal.id); onClose(); }}
                className="flex items-center gap-4 flex-grow text-left"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm
                  ${activeCalendarId === cal.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-valuenova-bg text-gray-400 dark:text-valuenova-muted'}
                `}>
                  {cal.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-black uppercase tracking-tight ${activeCalendarId === cal.id ? 'text-indigo-700 dark:text-valuenova-accent' : 'text-gray-900 dark:text-white'}`}>
                    {cal.name}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">Created {new Date(cal.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
              <div className="flex items-center gap-2">
                {activeCalendarId === cal.id && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm animate-pulse"></div>
                )}
                {onDeleteCalendar && calendars.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${cal.name}"? This will remove all activities in this calendar.`)) {
                        onDeleteCalendar(cal.id);
                      }
                    }}
                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-valuenova-border bg-gray-50/50 dark:bg-valuenova-surface/20">
          {isAdding ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <input 
                autoFocus
                type="text" 
                value={newCalName} 
                onChange={(e) => setNewCalName(e.target.value)}
                placeholder="Calendar Name..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-valuenova-bg border border-gray-200 dark:border-valuenova-border text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex gap-2">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-xs font-black uppercase text-gray-500 hover:text-gray-900">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase shadow-lg">Create</button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-4 bg-white dark:bg-valuenova-surface border-2 border-dashed border-gray-200 dark:border-valuenova-border rounded-2xl flex flex-col items-center gap-2 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all group"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Create New Calendar</span>
            </button>
          )}
        </div>
      </div>
      <div className="flex-grow" onClick={onClose}></div>
    </div>
  );
};

export default WorkspaceSwitcher;

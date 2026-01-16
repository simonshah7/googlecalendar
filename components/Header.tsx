
import React from 'react';
import { ViewType } from '../App';
import { User, UserRole } from '../types';

interface HeaderProps {
  onAddActivityClick: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onExportClick: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeCalendarName: string;
  onCalendarSwitchClick: () => void;
  onSettingsClick: () => void;
  onAdminClick: () => void;
  user: User | null;
  onLogout: () => void;
  isSyncing?: boolean;
  lastSync?: Date | null;
}

const Header: React.FC<HeaderProps> = ({ 
  onAddActivityClick, 
  currentView, 
  onViewChange, 
  onExportClick, 
  isDarkMode, 
  toggleDarkMode,
  activeCalendarName,
  onCalendarSwitchClick,
  onSettingsClick,
  onAdminClick,
  user,
  onLogout,
  isSyncing,
  lastSync
}) => {
  const isManager = user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN;

  return (
    <header className="bg-white dark:bg-valuenova-bg border-b border-gray-200 dark:border-valuenova-border px-6 h-16 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 dark:bg-valuenova-accent rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight hidden md:block">CampaignOS</h1>
        </div>

        <div className="h-8 w-px bg-gray-200 dark:bg-valuenova-border mx-2"></div>

        <button 
          onClick={onCalendarSwitchClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors group"
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-black uppercase text-gray-400 dark:text-valuenova-muted leading-none mb-1">Workspace</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap overflow-hidden max-w-[150px]">
              {activeCalendarName}
              <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
        </button>

        <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-gray-50 dark:bg-valuenova-surface rounded-full border border-gray-100 dark:border-valuenova-border">
          {isSyncing ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Syncing</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                {lastSync ? `Synced ${lastSync.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Neon Cloud'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <nav className="flex bg-gray-100 dark:bg-valuenova-surface p-1 rounded-lg transition-colors">
          {(['timeline', 'calendar', 'table'] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                currentView === v 
                ? 'bg-white dark:bg-valuenova-border text-indigo-600 dark:text-valuenova-accent shadow-sm' 
                : 'text-gray-500 dark:text-valuenova-muted hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-400 dark:text-valuenova-muted hover:text-indigo-600 dark:hover:text-valuenova-accent hover:bg-indigo-50 dark:hover:bg-valuenova-surface rounded-lg transition-colors"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={onExportClick}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-valuenova-border text-gray-600 dark:text-valuenova-text hover:bg-gray-50 dark:hover:bg-valuenova-surface transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export</span>
          </button>

          <button
            onClick={onAddActivityClick}
            className="bg-indigo-600 dark:bg-valuenova-accent text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 dark:hover:brightness-110 shadow-lg dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden lg:inline">Create Activity</span>
          </button>

          <div className="h-8 w-px bg-gray-200 dark:bg-valuenova-border mx-1"></div>

          <div className="flex items-center gap-3 pl-2 group relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white dark:border-valuenova-border shadow-sm flex items-center justify-center text-white font-bold text-xs cursor-pointer">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-valuenova-surface rounded-xl shadow-2xl border border-gray-100 dark:border-valuenova-border py-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all translate-y-2 group-hover:translate-y-0 z-50">
               <div className="px-4 py-2 border-b border-gray-100 dark:border-valuenova-border mb-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signed in as</p>
                 <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.email}</p>
                 <p className="text-[10px] font-black text-indigo-500 uppercase mt-0.5">{user?.role}</p>
               </div>
               {isManager && (
                  <button onClick={onAdminClick} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-valuenova-bg flex items-center gap-2 transition-colors">
                    Admin Dash
                  </button>
               )}
               <button onClick={onSettingsClick} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-valuenova-bg flex items-center gap-2 transition-colors">
                 Settings
               </button>
               <button 
                 onClick={onLogout}
                 className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
               >
                 Sign Out
               </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

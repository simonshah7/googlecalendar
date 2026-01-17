
import React from 'react';
import { ViewType } from '../App';
import { User, UserRole } from '../types';
import Tooltip from './Tooltip';

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

  const viewShortcuts: Record<ViewType, string> = {
    'timeline': '1',
    'calendar': '2',
    'table': '3'
  };

  return (
    <header className="bg-white dark:bg-valuenova-bg border-b border-gray-200 dark:border-valuenova-border px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-2 sm:gap-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 bg-indigo-600 dark:bg-valuenova-accent rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight hidden md:block">CampaignOS</h1>
        </div>

        <div className="h-8 w-px bg-gray-200 dark:bg-valuenova-border mx-1 sm:mx-2 hidden sm:block"></div>

        <button
          onClick={onCalendarSwitchClick}
          className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors group min-h-[44px]"
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-black uppercase text-gray-400 dark:text-valuenova-muted leading-none mb-1 hidden sm:block">Workspace</span>
            <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap overflow-hidden max-w-[100px] sm:max-w-[150px]">
              {activeCalendarName}
              <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
        </button>

        {/* Sync status indicator - Connected to Neon Cloud Database */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-gray-50 dark:bg-valuenova-surface rounded-full border border-gray-100 dark:border-valuenova-border">
          {isSyncing ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Saving</span>
            </div>
          ) : (
            <Tooltip content="Data synced to Neon cloud database" position="bottom">
              <div className="flex items-center gap-1.5 cursor-help">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                  Cloud Synced
                </span>
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        <nav className="flex bg-gray-100 dark:bg-valuenova-surface p-0.5 sm:p-1 rounded-lg transition-colors">
          {(['timeline', 'calendar', 'table'] as ViewType[]).map((v) => (
            <Tooltip key={v} content={`${v.charAt(0).toUpperCase() + v.slice(1)} view`} shortcut={viewShortcuts[v]} position="bottom">
              <button
                onClick={() => onViewChange(v)}
                className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 min-h-[36px] sm:min-h-[auto] ${
                  currentView === v
                  ? 'bg-white dark:bg-valuenova-border text-indigo-600 dark:text-valuenova-accent shadow-sm'
                  : 'text-gray-500 dark:text-valuenova-muted hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                <span className="sm:hidden">{v.charAt(0).toUpperCase()}</span>
              </button>
            </Tooltip>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <Tooltip content={isDarkMode ? "Light mode" : "Dark mode"} shortcut="D" position="bottom">
            <button
              onClick={toggleDarkMode}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-valuenova-muted hover:text-indigo-600 dark:hover:text-valuenova-accent hover:bg-indigo-50 dark:hover:bg-valuenova-surface rounded-lg transition-colors"
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
          </Tooltip>

          <Tooltip content="Export data" shortcut="E" position="bottom">
            <button
              onClick={onExportClick}
              className="hidden sm:flex px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-valuenova-border text-gray-600 dark:text-valuenova-text hover:bg-gray-50 dark:hover:bg-valuenova-surface transition-all active:scale-95 items-center gap-2 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden md:inline">Export</span>
            </button>
          </Tooltip>

          <Tooltip content="Create new activity" shortcut="N" position="bottom">
            <button
              onClick={onAddActivityClick}
              className="bg-indigo-600 dark:bg-valuenova-accent text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 dark:hover:brightness-110 shadow-lg dark:shadow-none transition-all active:scale-95 flex items-center gap-2 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden lg:inline">Create Activity</span>
            </button>
          </Tooltip>

          <div className="h-8 w-px bg-gray-200 dark:bg-valuenova-border mx-1 hidden sm:block"></div>

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
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Admin Dash
                  </button>
               )}
               <button onClick={onSettingsClick} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-valuenova-bg flex items-center gap-2 transition-colors">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
                 Workspace Settings
               </button>
               <button
                 onClick={onLogout}
                 className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
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

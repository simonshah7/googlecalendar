
import React, { useState, useMemo } from 'react';
import { Calendar, User, UserRole, Activity } from '../types';

interface ManagerDashboardProps {
  onClose: () => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  calendars: Calendar[];
  onUpdateCalendars: (calendars: Calendar[]) => void;
  activities: Activity[];
  onCalendarAction: (calId: string) => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ 
  onClose, users, onUpdateUsers, calendars, onUpdateCalendars, activities, onCalendarAction 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'workspaces' | 'users'>('overview');

  const stats = useMemo(() => ({
    totalWorkspaces: calendars.length,
    totalUsers: users.length,
    totalActivities: activities.length,
    totalBudget: activities.reduce((sum, a) => sum + (a.cost || 0), 0)
  }), [calendars, users, activities]);

  const toggleUserRole = (userId: string) => {
    const newUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, role: u.role === UserRole.USER ? UserRole.MANAGER : UserRole.USER };
      }
      return u;
    });
    onUpdateUsers(newUsers);
  };

  const deleteCalendar = (id: string) => {
    if (window.confirm('Globally delete this workspace and all its data? This cannot be undone.')) {
      onUpdateCalendars(calendars.filter(c => c.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-xl z-[70] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-white dark:bg-valuenova-bg rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-valuenova-border flex overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Sidebar Navigation */}
        <div className="w-72 bg-gray-50/50 dark:bg-valuenova-surface/30 border-r border-gray-100 dark:border-valuenova-border p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Console</h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Admin Central</p>
            </div>
          </div>

          <nav className="flex-grow space-y-2">
            {[
              { id: 'overview', label: 'Global Overview', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
              { id: 'workspaces', label: 'All Workspaces', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg> },
              { id: 'users', label: 'User Directory', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 translate-x-1' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-white hover:bg-white dark:hover:bg-valuenova-bg'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <button 
            onClick={onClose}
            className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-valuenova-border text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
          >
            Exit Console
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col p-12 overflow-hidden bg-[#FBFBFC] dark:bg-valuenova-bg transition-colors">
          
          {activeTab === 'overview' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">System Health</h1>
                  <p className="text-gray-500 dark:text-valuenova-muted font-bold mt-2">Real-time aggregate data across all instances.</p>
                </div>
                <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/20 rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Database Syncing</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Workspaces', value: stats.totalWorkspaces, color: 'text-indigo-600' },
                  { label: 'Total Users', value: stats.totalUsers, color: 'text-purple-600' },
                  { label: 'Active Initiatives', value: stats.totalActivities, color: 'text-emerald-600' },
                  { label: 'Total Value', value: `$${stats.totalBudget.toLocaleString()}`, color: 'text-gray-900 dark:text-white' }
                ].map(stat => (
                  <div key={stat.label} className="bg-white dark:bg-valuenova-surface p-8 rounded-[2rem] border border-gray-100 dark:border-valuenova-border shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
                    <p className={`text-3xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                 <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-2">Manager Access Level</h3>
                    <p className="text-indigo-100 font-medium max-w-md opacity-80 leading-relaxed">
                      You are currently browsing the global console. You have elevated permissions to edit roles, reassign ownership, and manage the system data directory.
                    </p>
                 </div>
                 <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                   <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.4 0 2.5 1.1 2.5 2.5S13.4 12 12 12s-2.5-1.1-2.5-2.5S10.6 7 12 7zm0 12c-2.3 0-4.4-1.1-5.7-2.9.1-1.9 3.8-3 5.7-3s5.6 1.1 5.7 3c-1.3 1.8-3.4 2.9-5.7 2.9z"/></svg>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <div className="flex-grow flex flex-col animate-in fade-in slide-in-from-right-4 overflow-hidden">
               <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Workspace Directory</h2>
                <p className="text-gray-500 dark:text-valuenova-muted font-bold mt-1">Audit and manage every calendar across the system.</p>
              </div>

              <div className="flex-grow overflow-auto border border-gray-100 dark:border-valuenova-border rounded-3xl bg-white dark:bg-valuenova-surface/30">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-valuenova-surface sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Workspace Name</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner ID</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Activities</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-valuenova-border">
                    {calendars.map(cal => (
                      <tr key={cal.id} className="hover:bg-gray-50 dark:hover:bg-valuenova-bg/40 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-valuenova-bg flex items-center justify-center font-black text-xs text-gray-400">
                              {cal.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{cal.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-xs font-bold text-gray-500 dark:text-valuenova-muted tabular-nums">{cal.ownerId}</td>
                        <td className="px-8 py-5">
                           <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black">
                             {activities.filter(a => a.calendarId === cal.id).length} Active
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right space-x-2">
                           <button onClick={() => onCalendarAction(cal.id)} className="px-4 py-1.5 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg transition-all">Go To</button>
                           <button onClick={() => deleteCalendar(cal.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="flex-grow flex flex-col animate-in fade-in slide-in-from-right-4 overflow-hidden">
               <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">User Directory</h2>
                <p className="text-gray-500 dark:text-valuenova-muted font-bold mt-1">Manage platform-wide identities and security roles.</p>
              </div>

              <div className="flex-grow overflow-auto border border-gray-100 dark:border-valuenova-border rounded-3xl bg-white dark:bg-valuenova-surface/30">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-valuenova-surface sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Profile</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">System Role</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-valuenova-border">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-valuenova-bg/40 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-black text-white">
                              {u.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-xs font-bold text-gray-500 dark:text-valuenova-muted">{u.email}</td>
                        <td className="px-8 py-5">
                           <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${u.role === UserRole.MANAGER ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 dark:bg-valuenova-bg text-gray-400'}`}>
                             {u.role}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <button 
                             onClick={() => toggleUserRole(u.id)}
                             className="px-6 py-2 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                           >
                             Switch to {u.role === UserRole.USER ? 'Manager' : 'User'}
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;

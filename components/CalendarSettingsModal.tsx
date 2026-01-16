
import React, { useState } from 'react';
import { Calendar, User, CalendarPermission, UserRole } from '../types';

interface CalendarSettingsModalProps {
  calendar: Calendar;
  onClose: () => void;
  onUpdate: (cal: Calendar) => void;
  onDelete: (id: string) => void;
  permissions: CalendarPermission[];
  onUpdatePermissions: (perms: CalendarPermission[]) => void;
  currentUser: User | null;
}

const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({ 
  calendar, onClose, onUpdate, onDelete, permissions, onUpdatePermissions, currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team'>('general');
  const [name, setName] = useState(calendar.name);
  const [newUserEmail, setNewUserEmail] = useState('');

  const isOwner = currentUser?.id === calendar.ownerId || currentUser?.role === UserRole.MANAGER;

  const handleUpdate = () => {
    onUpdate({ ...calendar, name });
    onClose();
  };

  const calPermissions = permissions.filter(p => p.calendarId === calendar.id);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    
    // In a real app, you'd lookup this user ID by email. Here we simulate.
    const mockId = `u-${newUserEmail.split('@')[0]}`;
    const exists = permissions.some(p => p.calendarId === calendar.id && p.userId === mockId);
    
    if (!exists) {
      onUpdatePermissions([...permissions, { calendarId: calendar.id, userId: mockId, accessType: 'view' }]);
    }
    setNewUserEmail('');
  };

  const toggleAccess = (userId: string) => {
    const newPerms = permissions.map(p => {
      if (p.calendarId === calendar.id && p.userId === userId) {
        return { ...p, accessType: p.accessType === 'view' ? 'edit' : 'view' } as CalendarPermission;
      }
      return p;
    });
    onUpdatePermissions(newPerms);
  };

  const removeUser = (userId: string) => {
    if (userId === calendar.ownerId) return;
    onUpdatePermissions(permissions.filter(p => !(p.calendarId === calendar.id && p.userId === userId)));
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex justify-center items-center z-[60] p-4">
      <div className="bg-white dark:bg-valuenova-surface rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Workspace Settings</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{calendar.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-gray-100 dark:border-valuenova-border bg-gray-50/50 dark:bg-valuenova-bg/20 p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-valuenova-surface'}`}
            >
              General
            </button>
            <button 
              onClick={() => setActiveTab('team')}
              className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-valuenova-surface'}`}
            >
              Team Access
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-grow p-8 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Calendar Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                  />
                </div>

                <div className="pt-8 border-t border-gray-100 dark:border-valuenova-border">
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Danger Zone</h4>
                  <div className="p-6 border border-red-100 dark:border-red-900/30 rounded-2xl bg-red-50/30 dark:bg-red-900/10">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-4">Deleting this calendar will permanently remove all associated activities and data.</p>
                    <button 
                      onClick={() => { if(window.confirm('Delete this calendar? This cannot be undone.')) onDelete(calendar.id); }}
                      disabled={!isOwner}
                      className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-600 transition-all disabled:opacity-50"
                    >
                      Delete Calendar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Add Team Member</label>
                  <form onSubmit={handleAddUser} className="flex gap-2">
                    <input 
                      type="email" 
                      value={newUserEmail} 
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Enter email address..."
                      disabled={!isOwner}
                      className="flex-grow px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                    />
                    <button 
                      type="submit"
                      disabled={!isOwner}
                      className="px-6 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:brightness-110 disabled:opacity-50"
                    >
                      Invite
                    </button>
                  </form>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Permissions</label>
                  <div className="border border-gray-100 dark:border-valuenova-border rounded-2xl divide-y divide-gray-100 dark:divide-valuenova-border overflow-hidden">
                    {calPermissions.map(p => (
                      <div key={p.userId} className="flex items-center justify-between p-4 bg-white dark:bg-valuenova-surface hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-valuenova-bg flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                            {p.userId.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">{p.userId}</p>
                            <p className="text-[10px] font-bold text-gray-400">{p.userId === calendar.ownerId ? 'Owner' : 'Invited'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleAccess(p.userId)}
                            disabled={!isOwner || p.userId === calendar.ownerId}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${p.accessType === 'edit' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-valuenova-bg text-gray-400 hover:text-gray-900'}`}
                          >
                            {p.accessType}
                          </button>
                          {p.userId !== calendar.ownerId && isOwner && (
                            <button 
                              onClick={() => removeUser(p.userId)}
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-6 border-t border-gray-100 dark:border-valuenova-border flex justify-end gap-3 bg-gray-50/30 dark:bg-valuenova-bg/20">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Close</button>
          {isOwner && (
            <button onClick={handleUpdate} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all">Save Changes</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSettingsModal;

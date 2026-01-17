/**
 * CalendarSettingsModal Component
 *
 * A modal dialog for managing calendar settings including:
 * - General settings (name, delete calendar)
 * - Team access (invite users, manage permissions)
 *
 * This component handles both local state updates and API calls for
 * persisting changes to the backend.
 */

import React, { useState } from 'react';
import { Calendar, User, CalendarPermission, UserRole } from '../types';

/**
 * Extended permission type that includes user info from API
 */
interface ExtendedPermission extends CalendarPermission {
  userEmail?: string;
  userName?: string;
}

interface CalendarSettingsModalProps {
  calendar: Calendar;
  onClose: () => void;
  onUpdate: (cal: Calendar) => void;
  onDelete: (id: string) => void;
  permissions: ExtendedPermission[];
  onUpdatePermissions: (perms: ExtendedPermission[]) => void;
  currentUser: User | null;
}

const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  calendar, onClose, onUpdate, onDelete, permissions, onUpdatePermissions, currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team'>('general');
  const [name, setName] = useState(calendar.name);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Check if current user can manage this calendar
  const isOwner = currentUser?.id === calendar.ownerId ||
    currentUser?.role === UserRole.MANAGER ||
    currentUser?.role === UserRole.ADMIN;

  /**
   * Handle calendar name update
   */
  const handleUpdate = () => {
    onUpdate({ ...calendar, name });
    onClose();
  };

  // Filter permissions for this calendar
  const calPermissions = permissions.filter(p => p.calendarId === calendar.id);

  /**
   * Handle inviting a new user by email.
   * Makes an API call to add the permission.
   */
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/calendar-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: calendar.id,
          email: newUserEmail.trim(),
          accessType: 'view'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || 'Failed to invite user');
        return;
      }

      // Add the new permission to the list with user info
      const newPermission: ExtendedPermission = {
        calendarId: calendar.id,
        userId: data.permission.userId,
        accessType: data.permission.accessType,
        userEmail: data.permission.userEmail,
        userName: data.permission.userName
      };

      onUpdatePermissions([...permissions, newPermission]);
      setNewUserEmail('');
    } catch (error) {
      console.error('Error inviting user:', error);
      setInviteError('Network error. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  /**
   * Toggle user's access level between 'view' and 'edit'.
   * Makes an API call to update the permission.
   */
  const toggleAccess = async (permission: ExtendedPermission) => {
    const newAccessType = permission.accessType === 'view' ? 'edit' : 'view';

    try {
      const response = await fetch('/api/calendar-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: permission.userId, // Using userId as the permission lookup key
          calendarId: permission.calendarId,
          accessType: newAccessType
        })
      });

      if (!response.ok) {
        console.error('Failed to update permission');
        return;
      }

      // Update local state
      const newPerms = permissions.map(p => {
        if (p.calendarId === calendar.id && p.userId === permission.userId) {
          return { ...p, accessType: newAccessType } as ExtendedPermission;
        }
        return p;
      });
      onUpdatePermissions(newPerms);
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  /**
   * Remove a user's access to the calendar.
   * Makes an API call to delete the permission.
   */
  const removeUser = async (permission: ExtendedPermission) => {
    if (permission.userId === calendar.ownerId) return;

    try {
      const response = await fetch(`/api/calendar-permissions?id=${permission.userId}&calendarId=${permission.calendarId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        console.error('Failed to remove permission');
        return;
      }

      // Update local state
      onUpdatePermissions(permissions.filter(p =>
        !(p.calendarId === calendar.id && p.userId === permission.userId)
      ));
    } catch (error) {
      console.error('Error removing permission:', error);
    }
  };

  /**
   * Get display name for a permission entry.
   * Shows email/name if available, otherwise falls back to a formatted user ID.
   */
  const getDisplayName = (p: ExtendedPermission): string => {
    if (p.userName) return p.userName;
    if (p.userEmail) return p.userEmail;
    return p.userId.substring(0, 8) + '...';
  };

  /**
   * Get initials for avatar display.
   */
  const getInitials = (p: ExtendedPermission): string => {
    if (p.userName) {
      return p.userName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (p.userEmail) {
      return p.userEmail.substring(0, 2).toUpperCase();
    }
    return p.userId.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex justify-center items-center z-[60] p-4">
      <div className="bg-white dark:bg-valuenova-surface rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Workspace Settings</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{calendar.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-gray-100 dark:border-valuenova-border bg-gray-50/50 dark:bg-valuenova-bg/20 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'general'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-valuenova-surface'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'team'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-valuenova-surface'
              }`}
            >
              Team Access
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-grow p-8 overflow-y-auto">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Calendar Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                  />
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-gray-100 dark:border-valuenova-border">
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Danger Zone</h4>
                  <div className="p-6 border border-red-100 dark:border-red-900/30 rounded-2xl bg-red-50/30 dark:bg-red-900/10">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-4">
                      Deleting this calendar will permanently remove all associated activities, swimlanes, and campaigns.
                    </p>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this calendar? This cannot be undone.')) {
                          onDelete(calendar.id);
                        }
                      }}
                      disabled={!isOwner}
                      className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-600 transition-all disabled:opacity-50"
                    >
                      Delete Calendar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Team Access Tab */}
            {activeTab === 'team' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                {/* Invite Form */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                    Add Team Member
                  </label>
                  <form onSubmit={handleAddUser} className="flex gap-2">
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => {
                        setNewUserEmail(e.target.value);
                        setInviteError(null);
                      }}
                      placeholder="Enter email address..."
                      disabled={!isOwner || isInviting}
                      className="flex-grow px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!isOwner || isInviting || !newUserEmail.trim()}
                      className="px-6 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {isInviting ? 'Adding...' : 'Invite'}
                    </button>
                  </form>
                  {inviteError && (
                    <p className="mt-2 text-xs text-red-500 font-bold">{inviteError}</p>
                  )}
                </div>

                {/* Permissions List */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Active Permissions ({calPermissions.length})
                  </label>
                  {calPermissions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No team members have been invited yet.
                    </div>
                  ) : (
                    <div className="border border-gray-100 dark:border-valuenova-border rounded-2xl divide-y divide-gray-100 dark:divide-valuenova-border overflow-hidden">
                      {calPermissions.map(p => (
                        <div key={p.userId} className="flex items-center justify-between p-4 bg-white dark:bg-valuenova-surface hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-valuenova-bg flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                              {getInitials(p)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                {getDisplayName(p)}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400">
                                {p.userId === calendar.ownerId ? 'Owner' : (p.userEmail || 'Invited')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleAccess(p)}
                              disabled={!isOwner || p.userId === calendar.ownerId}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                p.accessType === 'edit'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 dark:bg-valuenova-bg text-gray-400 hover:text-gray-900 dark:hover:text-white'
                              } disabled:opacity-50`}
                            >
                              {p.accessType}
                            </button>
                            {p.userId !== calendar.ownerId && isOwner && (
                              <button
                                onClick={() => removeUser(p)}
                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                title="Remove access"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 dark:border-valuenova-border flex justify-end gap-3 bg-gray-50/30 dark:bg-valuenova-bg/20">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>
          {isOwner && (
            <button
              onClick={handleUpdate}
              className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSettingsModal;

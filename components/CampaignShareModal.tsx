/**
 * CampaignShareModal Component
 *
 * A modal dialog for managing campaign-level sharing and permissions.
 * Allows users to invite collaborators to specific campaigns with view or edit access.
 */

import React, { useState, useEffect } from 'react';
import { Campaign, User, UserRole, ExtendedCampaignPermission } from '../types';

interface CampaignShareModalProps {
  campaign: Campaign;
  onClose: () => void;
  currentUser: User | null;
  calendarOwnerId: string;
}

const CampaignShareModal: React.FC<CampaignShareModalProps> = ({
  campaign,
  onClose,
  currentUser,
  calendarOwnerId,
}) => {
  const [permissions, setPermissions] = useState<ExtendedCampaignPermission[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newAccessType, setNewAccessType] = useState<'view' | 'edit'>('view');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if current user can manage this campaign
  const canManage = currentUser?.id === calendarOwnerId ||
    currentUser?.role === UserRole.MANAGER ||
    currentUser?.role === UserRole.ADMIN;

  // Fetch existing permissions on mount
  useEffect(() => {
    fetchPermissions();
  }, [campaign.id]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`/api/campaign-permissions?campaignId=${campaign.id}`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle inviting a new user by email.
   */
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/campaign-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          email: newUserEmail.trim(),
          accessType: newAccessType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || 'Failed to invite user');
        return;
      }

      // Add the new permission to the list
      const newPermission: ExtendedCampaignPermission = {
        id: data.permission.id,
        campaignId: campaign.id,
        userId: data.permission.userId,
        accessType: data.permission.accessType,
        createdAt: data.permission.createdAt,
        updatedAt: data.permission.updatedAt,
        userEmail: data.permission.userEmail,
        userName: data.permission.userName,
      };

      setPermissions([...permissions, newPermission]);
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
   */
  const toggleAccess = async (permission: ExtendedCampaignPermission) => {
    const newAccessType = permission.accessType === 'view' ? 'edit' : 'view';

    try {
      const response = await fetch('/api/campaign-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: permission.id,
          accessType: newAccessType,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update permission');
        return;
      }

      // Update local state
      setPermissions(permissions.map(p =>
        p.id === permission.id ? { ...p, accessType: newAccessType } : p
      ));
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  /**
   * Remove a user's access to the campaign.
   */
  const removeUser = async (permission: ExtendedCampaignPermission) => {
    try {
      const response = await fetch(`/api/campaign-permissions?id=${permission.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Failed to remove permission');
        return;
      }

      // Update local state
      setPermissions(permissions.filter(p => p.id !== permission.id));
    } catch (error) {
      console.error('Error removing permission:', error);
    }
  };

  /**
   * Get display name for a permission entry.
   */
  const getDisplayName = (p: ExtendedCampaignPermission): string => {
    if (p.userName) return p.userName;
    if (p.userEmail) return p.userEmail;
    return p.userId.substring(0, 8) + '...';
  };

  /**
   * Get initials for avatar display.
   */
  const getInitials = (p: ExtendedCampaignPermission): string => {
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
      <div className="bg-white dark:bg-valuenova-surface rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Share Campaign</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{campaign.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow p-8 overflow-y-auto">
          {/* Invite Form */}
          {canManage && (
            <div className="mb-8">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                Invite Collaborator
              </label>
              <form onSubmit={handleAddUser} className="space-y-3">
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => {
                    setNewUserEmail(e.target.value);
                    setInviteError(null);
                  }}
                  placeholder="Enter email address..."
                  disabled={isInviting}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition-all disabled:opacity-50"
                />
                <div className="flex gap-2">
                  <select
                    value={newAccessType}
                    onChange={(e) => setNewAccessType(e.target.value as 'view' | 'edit')}
                    className="flex-grow px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 transition-all"
                  >
                    <option value="view">View access</option>
                    <option value="edit">Edit access</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting || !newUserEmail.trim()}
                    className="px-6 bg-green-600 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {isInviting ? 'Adding...' : 'Invite'}
                  </button>
                </div>
              </form>
              {inviteError && (
                <p className="mt-2 text-xs text-red-500 font-bold">{inviteError}</p>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              Users invited here will only have access to this campaign and its activities,
              even if they don&apos;t have workspace-level access.
            </p>
          </div>

          {/* Permissions List */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Campaign Collaborators ({permissions.length})
            </label>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Loading...
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No collaborators have been invited yet.
              </div>
            ) : (
              <div className="border border-gray-100 dark:border-valuenova-border rounded-2xl divide-y divide-gray-100 dark:divide-valuenova-border overflow-hidden">
                {permissions.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white dark:bg-valuenova-surface hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-[10px] font-black text-green-600 uppercase">
                        {getInitials(p)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                          {getDisplayName(p)}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400">
                          {p.userEmail || 'Invited'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAccess(p)}
                        disabled={!canManage}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          p.accessType === 'edit'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-valuenova-bg text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        } disabled:opacity-50`}
                      >
                        {p.accessType}
                      </button>
                      {canManage && (
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

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 dark:border-valuenova-border flex justify-end bg-gray-50/30 dark:bg-valuenova-bg/20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-gray-200 dark:bg-valuenova-border text-gray-700 dark:text-white rounded-xl text-sm font-black uppercase hover:bg-gray-300 dark:hover:bg-valuenova-surface transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignShareModal;

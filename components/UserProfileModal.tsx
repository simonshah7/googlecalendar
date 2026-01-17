/**
 * UserProfileModal Component
 *
 * Allows users to view and update their profile including:
 * - Display name
 * - Avatar URL
 * - Password change
 */

import React, { useState } from 'react';
import { User } from '../types';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onUpdate }) => {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  /**
   * Handle profile update submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate password change if attempting
    if (showPasswordSection && newPassword) {
      if (!currentPassword) {
        setError('Current password is required');
        return;
      }
      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    setIsLoading(true);

    try {
      const body: Record<string, string> = {};

      if (name !== user.name) {
        body.name = name;
      }

      if (avatarUrl !== (user.avatarUrl || '')) {
        body.avatarUrl = avatarUrl;
      }

      if (showPasswordSection && newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      if (Object.keys(body).length === 0) {
        setError('No changes to save');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setSuccess(data.message || 'Profile updated successfully');
      onUpdate({
        ...user,
        name: data.profile.name,
        avatarUrl: data.profile.avatarUrl,
      });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get initials for avatar display.
   */
  const getInitials = (): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex justify-center items-center z-[60] p-4">
      <div className="bg-white dark:bg-valuenova-surface rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Profile Settings</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Avatar Preview */}
          <div className="flex justify-center">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 dark:border-valuenova-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-black text-white ${avatarUrl ? 'hidden' : ''}`}>
                {getInitials()}
              </div>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          {/* Avatar URL Field */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Avatar URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <p className="mt-1 text-xs text-gray-400">Leave empty to use initials</p>
          </div>

          {/* Role Display */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Role
            </label>
            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border">
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                user.role === 'Admin' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                user.role === 'Manager' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="pt-4 border-t border-gray-100 dark:border-valuenova-border">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-700"
            >
              <svg className={`w-4 h-4 transition-transform ${showPasswordSection ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Change Password
            </button>

            {showPasswordSection && (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
              <p className="text-sm font-bold text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 dark:border-valuenova-border flex justify-end gap-3 bg-gray-50/30 dark:bg-valuenova-bg/20">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;

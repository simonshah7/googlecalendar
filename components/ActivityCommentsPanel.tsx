/**
 * ActivityCommentsPanel Component
 *
 * Displays and manages comments for an activity.
 * Supports adding, editing, and deleting comments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActivityComment, User } from '../types';

interface ActivityCommentsPanelProps {
  activityId: string;
  activityTitle: string;
  currentUser: User | null;
  onClose: () => void;
}

const ActivityCommentsPanel: React.FC<ActivityCommentsPanelProps> = ({
  activityId,
  activityTitle,
  currentUser,
  onClose,
}) => {
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch comments for the activity.
   */
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/activity-comments?activityId=${activityId}`);
      const data = await response.json();

      if (response.ok) {
        setComments(data.comments);
      } else {
        setError(data.error || 'Failed to load comments');
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /**
   * Add a new comment.
   */
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/activity-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, content: newComment }),
      });

      const data = await response.json();

      if (response.ok) {
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        setError(data.error || 'Failed to add comment');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Update an existing comment.
   */
  const handleUpdateComment = async (id: string) => {
    if (!editContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/activity-comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content: editContent }),
      });

      const data = await response.json();

      if (response.ok) {
        setComments(comments.map(c => c.id === id ? { ...c, content: editContent, updatedAt: new Date().toISOString() } : c));
        setEditingId(null);
        setEditContent('');
      } else {
        setError(data.error || 'Failed to update comment');
      }
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Delete a comment.
   */
  const handleDeleteComment = async (id: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const response = await fetch(`/api/activity-comments?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== id));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete comment');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Network error');
    }
  };

  /**
   * Format relative time.
   */
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Get initials for avatar.
   */
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-valuenova-surface shadow-2xl z-[60] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">Comments</h3>
          <p className="text-xs font-bold text-gray-400 truncate max-w-[200px]">{activityTitle}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-valuenova-bg rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No comments yet</p>
            <p className="text-xs text-gray-300">Be the first to comment!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="group">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-valuenova-bg flex items-center justify-center text-xs font-black text-indigo-600 flex-shrink-0">
                  {getInitials(comment.userName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-gray-900 dark:text-white">{comment.userName || 'Unknown'}</span>
                    <span className="text-[10px] text-gray-400">{formatTime(comment.createdAt)}</span>
                    {comment.updatedAt !== comment.createdAt && (
                      <span className="text-[10px] text-gray-400 italic">(edited)</span>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-valuenova-bg border border-gray-200 dark:border-valuenova-border text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditContent(''); }}
                          className="px-3 py-1 text-gray-500 hover:text-gray-700 text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                  )}

                  {/* Actions */}
                  {currentUser && comment.userId === currentUser.id && editingId !== comment.id && (
                    <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                        className="text-xs text-gray-400 hover:text-indigo-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800/30">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* New Comment Form */}
      <div className="p-4 border-t border-gray-100 dark:border-valuenova-border bg-gray-50/50 dark:bg-valuenova-bg/30">
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border text-sm focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ActivityCommentsPanel;

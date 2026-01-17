/**
 * useUndoRedo Hook
 *
 * Provides undo/redo functionality for the application.
 * Maintains a stack of actions that can be undone or redone.
 */

import { useState, useCallback, useEffect } from 'react';
import { UndoAction, Activity } from '../types';

const MAX_UNDO_STACK_SIZE = 50;

interface UseUndoRedoReturn {
  /** Add an action to the undo stack */
  pushAction: (action: Omit<UndoAction, 'timestamp'>) => void;
  /** Undo the last action */
  undo: () => UndoAction | null;
  /** Redo the last undone action */
  redo: () => UndoAction | null;
  /** Check if undo is available */
  canUndo: boolean;
  /** Check if redo is available */
  canRedo: boolean;
  /** Get the description of the action that would be undone */
  undoDescription: string | null;
  /** Get the description of the action that would be redone */
  redoDescription: string | null;
  /** Clear all undo/redo history */
  clearHistory: () => void;
}

/**
 * Hook for managing undo/redo operations.
 */
export function useUndoRedo(): UseUndoRedoReturn {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  /**
   * Add an action to the undo stack.
   * Clears the redo stack since we're starting a new branch.
   */
  const pushAction = useCallback((action: Omit<UndoAction, 'timestamp'>) => {
    const fullAction: UndoAction = {
      ...action,
      timestamp: Date.now(),
    };

    setUndoStack(prev => {
      const newStack = [fullAction, ...prev];
      // Keep only the last MAX_UNDO_STACK_SIZE actions
      return newStack.slice(0, MAX_UNDO_STACK_SIZE);
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, []);

  /**
   * Undo the last action.
   * Moves it to the redo stack and returns it for processing.
   */
  const undo = useCallback((): UndoAction | null => {
    if (undoStack.length === 0) return null;

    const [action, ...rest] = undoStack;
    setUndoStack(rest);
    setRedoStack(prev => [action, ...prev]);

    return action;
  }, [undoStack]);

  /**
   * Redo the last undone action.
   * Moves it back to the undo stack and returns it for processing.
   */
  const redo = useCallback((): UndoAction | null => {
    if (redoStack.length === 0) return null;

    const [action, ...rest] = redoStack;
    setRedoStack(rest);
    setUndoStack(prev => [action, ...prev]);

    return action;
  }, [redoStack]);

  /**
   * Clear all history.
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // Note: The actual undo logic is handled by the component using this hook
        // We dispatch a custom event that the component can listen to
        window.dispatchEvent(new CustomEvent('app:undo'));
      }

      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y for redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' && e.shiftKey) || (e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:redo'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    pushAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoDescription: undoStack[0]?.description || null,
    redoDescription: redoStack[0]?.description || null,
    clearHistory,
  };
}

/**
 * Helper to create undo action for activity creation.
 */
export function createActivityAction(activity: Activity): Omit<UndoAction, 'timestamp'> {
  return {
    type: 'CREATE_ACTIVITY',
    description: `Create "${activity.title}"`,
    data: {
      created: activity,
      ids: [activity.id],
    },
  };
}

/**
 * Helper to create undo action for activity update.
 */
export function updateActivityAction(
  activity: Activity,
  previousState: Partial<Activity>
): Omit<UndoAction, 'timestamp'> {
  return {
    type: 'UPDATE_ACTIVITY',
    description: `Update "${activity.title}"`,
    data: {
      previous: previousState,
      ids: [activity.id],
    },
  };
}

/**
 * Helper to create undo action for activity deletion.
 */
export function deleteActivityAction(activity: Activity): Omit<UndoAction, 'timestamp'> {
  return {
    type: 'DELETE_ACTIVITY',
    description: `Delete "${activity.title}"`,
    data: {
      deleted: activity,
      ids: [activity.id],
    },
  };
}

/**
 * Helper to create undo action for bulk deletion.
 */
export function bulkDeleteActivitiesAction(activities: Activity[]): Omit<UndoAction, 'timestamp'> {
  return {
    type: 'BULK_DELETE_ACTIVITIES',
    description: `Delete ${activities.length} activities`,
    data: {
      deleted: activities,
      ids: activities.map(a => a.id),
    },
  };
}

/**
 * Helper to create undo action for bulk update.
 */
export function bulkUpdateActivitiesAction(
  activities: Activity[],
  previousStates: Partial<Activity>[]
): Omit<UndoAction, 'timestamp'> {
  return {
    type: 'BULK_UPDATE_ACTIVITIES',
    description: `Update ${activities.length} activities`,
    data: {
      previous: previousStates,
      ids: activities.map(a => a.id),
    },
  };
}

export default useUndoRedo;


import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon ? (
        <div className="mb-6 text-gray-300 dark:text-valuenova-muted">
          {icon}
        </div>
      ) : (
        <div className="mb-6">
          <svg className="w-16 h-16 text-gray-300 dark:text-valuenova-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-valuenova-muted max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-indigo-600 dark:bg-valuenova-accent text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 dark:hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

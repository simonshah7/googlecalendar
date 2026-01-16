
import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-100 dark:border-red-800/30',
      button: 'bg-red-500 hover:bg-red-600 shadow-red-200'
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-100 dark:border-amber-800/30',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-100 dark:border-indigo-800/30',
      button: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-valuenova-bg/80 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-valuenova-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-valuenova-border animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-xl ${styles.bg} ${styles.border} border flex items-center justify-center mb-4`}>
            {styles.icon}
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-valuenova-muted leading-relaxed">
            {message}
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-valuenova-bg/30 border-t border-gray-100 dark:border-valuenova-border flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold text-gray-500 dark:text-valuenova-muted hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 ${styles.button} text-white rounded-xl text-sm font-black shadow-lg dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;


import React from 'react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['1'], description: 'Switch to Timeline view' },
    { keys: ['2'], description: 'Switch to Calendar view' },
    { keys: ['3'], description: 'Switch to Table view' },
    { keys: ['T'], description: 'Go to today' },
  ]},
  { category: 'Actions', items: [
    { keys: ['N'], description: 'Create new activity' },
    { keys: ['E'], description: 'Export' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ]},
  { category: 'Timeline', items: [
    { keys: ['+', '='], description: 'Zoom in' },
    { keys: ['-'], description: 'Zoom out' },
  ]},
  { category: 'General', items: [
    { keys: ['Esc'], description: 'Close modal / Cancel' },
    { keys: ['⌘', 'Z'], description: 'Undo' },
    { keys: ['⌘', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['D'], description: 'Toggle dark mode' },
  ]},
];

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-valuenova-bg/80 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-valuenova-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-valuenova-border animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Keyboard Shortcuts</h2>
              <p className="text-xs text-gray-500 dark:text-valuenova-muted font-medium">Work faster with these shortcuts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 grid grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto">
          {shortcuts.map(category => (
            <div key={category.category}>
              <h3 className="text-[10px] font-black text-gray-400 dark:text-valuenova-muted uppercase tracking-widest mb-4">
                {category.category}
              </h3>
              <div className="space-y-3">
                {category.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <kbd className="px-2 py-1 bg-gray-100 dark:bg-valuenova-bg border border-gray-200 dark:border-valuenova-border rounded-lg text-xs font-mono font-bold text-gray-700 dark:text-gray-300 shadow-sm">
                            {key}
                          </kbd>
                          {keyIdx < item.keys.length - 1 && (
                            <span className="text-gray-300 dark:text-valuenova-muted text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-8 py-4 bg-gray-50/50 dark:bg-valuenova-bg/30 border-t border-gray-100 dark:border-valuenova-border">
          <p className="text-xs text-gray-400 dark:text-valuenova-muted text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-valuenova-bg rounded text-[10px] font-mono mx-1">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;

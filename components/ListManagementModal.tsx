import React, { useState, useRef, useEffect } from 'react';

interface ListItem {
  id: string;
  name: string;
}

interface ListManagementModalProps {
  items: ListItem[];
  title: string;
  onClose: () => void;
  onAdd: (name: string) => void;
  onUpdate: (item: ListItem) => void;
  onDelete: (id: string) => void;
  isItemInUse: (id: string) => boolean;
}

const ListManagementModal: React.FC<ListManagementModalProps> = ({ items, title, onClose, onAdd, onUpdate, onDelete, isItemInUse }) => {
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      inputRef.current?.focus();
    }
  }, [editingItem]);

  const handleAdd = () => {
    if (newItemName.trim()) {
      onAdd(newItemName.trim());
      setNewItemName('');
    }
  };

  const handleStartEdit = (item: ListItem) => {
    setEditingItem(item);
    setEditingName(item.name);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingName('');
  };

  const handleUpdate = () => {
    if (editingItem && editingName.trim()) {
      onUpdate({ ...editingItem, name: editingName.trim() });
      handleCancelEdit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
              {editingItem?.id === item.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleUpdate}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') handleCancelEdit(); }}
                  className="flex-grow mr-2 border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              ) : (
                <span className="text-gray-800">{item.name}</span>
              )}

              <div className="flex items-center space-x-2">
                {editingItem?.id === item.id ? (
                  <>
                    <button onClick={handleUpdate} className="p-1 text-green-600 hover:text-green-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <button onClick={handleCancelEdit} className="p-1 text-gray-500 hover:text-gray-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleStartEdit(item)} className="p-1 text-gray-500 hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z" /></svg></button>
                    <button onClick={() => onDelete(item.id)} disabled={isItemInUse(item.id)} className="p-1 text-gray-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed" title={isItemInUse(item.id) ? 'This item is currently in use.' : 'Delete'}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex space-x-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add new item..."
            className="flex-grow border-gray-300 rounded-md shadow-sm sm:text-sm"
          />
          <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">Add</button>
        </div>
      </div>
    </div>
  );
};

export default ListManagementModal;

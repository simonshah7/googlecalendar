import React, { useState } from 'react';
import { CardDisplayProfile, FieldStyle, CardFontSize, CardFontWeight, DEFAULT_CARD_PROFILES } from '../types';

interface CardStylePanelProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: CardDisplayProfile[];
  activeProfileId: string;
  onProfileChange: (profileId: string) => void;
  onProfileUpdate: (profile: CardDisplayProfile) => void;
  onProfileCreate: (profile: CardDisplayProfile) => void;
  onProfileDelete: (profileId: string) => void;
}

type FieldKey = 'title' | 'region' | 'status' | 'statusDot' | 'cost' | 'dates';

const FONT_SIZE_OPTIONS: { value: CardFontSize; label: string }[] = [
  { value: 'xs', label: 'XS' },
  { value: 'sm', label: 'SM' },
  { value: 'base', label: 'M' },
  { value: 'lg', label: 'LG' },
];

const FONT_WEIGHT_OPTIONS: { value: CardFontWeight; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'black', label: 'Black' },
];

const FIELD_LABELS: Record<FieldKey, string> = {
  title: 'Title',
  region: 'Region',
  status: 'Status Text',
  statusDot: 'Status Dot',
  cost: 'Cost',
  dates: 'Date Range',
};

export default function CardStylePanel({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onProfileChange,
  onProfileUpdate,
  onProfileCreate,
  onProfileDelete,
}: CardStylePanelProps) {
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const activeProfile = profiles.find(p => p.id === activeProfileId) || DEFAULT_CARD_PROFILES[1];

  const handleFieldToggle = (field: FieldKey) => {
    const updatedProfile = { ...activeProfile };
    if (field === 'statusDot') {
      updatedProfile.fields = {
        ...updatedProfile.fields,
        statusDot: { visible: !updatedProfile.fields.statusDot.visible },
      };
    } else {
      updatedProfile.fields = {
        ...updatedProfile.fields,
        [field]: { ...updatedProfile.fields[field], visible: !updatedProfile.fields[field].visible },
      };
    }
    onProfileUpdate(updatedProfile);
  };

  const handleFieldStyleChange = (
    field: Exclude<FieldKey, 'statusDot'>,
    property: keyof FieldStyle,
    value: CardFontSize | CardFontWeight | boolean
  ) => {
    const updatedProfile = { ...activeProfile };
    updatedProfile.fields = {
      ...updatedProfile.fields,
      [field]: { ...updatedProfile.fields[field], [property]: value },
    };
    onProfileUpdate(updatedProfile);
  };

  const handleHeightChange = (height: number) => {
    onProfileUpdate({ ...activeProfile, cardHeight: height });
  };

  const handleSaveAsNew = () => {
    if (!newProfileName.trim()) return;
    const newProfile: CardDisplayProfile = {
      ...activeProfile,
      id: `custom-${Date.now()}`,
      name: newProfileName.trim(),
      isBuiltIn: false,
    };
    onProfileCreate(newProfile);
    setNewProfileName('');
    setIsSaveAsOpen(false);
  };

  const handleDeleteProfile = () => {
    if (activeProfile.isBuiltIn) return;
    if (confirm(`Delete profile "${activeProfile.name}"?`)) {
      onProfileDelete(activeProfile.id);
      onProfileChange(DEFAULT_CARD_PROFILES[1].id);
    }
  };

  const renderFieldControl = (field: FieldKey) => {
    const isStatusDot = field === 'statusDot';
    const fieldConfig = activeProfile.fields[field];
    const isVisible = isStatusDot
      ? (fieldConfig as { visible: boolean }).visible
      : (fieldConfig as FieldStyle).visible;

    return (
      <div key={field} className="py-3 border-b border-gray-100 dark:border-valuenova-border/50 last:border-b-0">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={() => handleFieldToggle(field)}
              className="w-4 h-4 rounded border-gray-300 dark:border-valuenova-border text-indigo-600 focus:ring-indigo-500 dark:bg-valuenova-surface"
            />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {FIELD_LABELS[field]}
            </span>
          </label>
        </div>

        {!isStatusDot && isVisible && (
          <div className="ml-7 mt-2 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-gray-500 dark:text-valuenova-muted w-12">Size</span>
              <div className="flex gap-1">
                {FONT_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleFieldStyleChange(field as Exclude<FieldKey, 'statusDot'>, 'fontSize', opt.value)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                      (fieldConfig as FieldStyle).fontSize === opt.value
                        ? 'bg-indigo-600 dark:bg-valuenova-accent text-white'
                        : 'bg-gray-100 dark:bg-valuenova-surface text-gray-600 dark:text-valuenova-muted hover:bg-gray-200 dark:hover:bg-valuenova-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-gray-500 dark:text-valuenova-muted w-12">Weight</span>
              <div className="flex gap-1">
                {FONT_WEIGHT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleFieldStyleChange(field as Exclude<FieldKey, 'statusDot'>, 'fontWeight', opt.value)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                      (fieldConfig as FieldStyle).fontWeight === opt.value
                        ? 'bg-indigo-600 dark:bg-valuenova-accent text-white'
                        : 'bg-gray-100 dark:bg-valuenova-surface text-gray-600 dark:text-valuenova-muted hover:bg-gray-200 dark:hover:bg-valuenova-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {field !== 'cost' && field !== 'dates' && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-gray-500 dark:text-valuenova-muted w-12">Case</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(fieldConfig as FieldStyle).uppercase}
                    onChange={() => handleFieldStyleChange(field as Exclude<FieldKey, 'statusDot'>, 'uppercase', !(fieldConfig as FieldStyle).uppercase)}
                    className="w-3.5 h-3.5 rounded border-gray-300 dark:border-valuenova-border text-indigo-600 focus:ring-indigo-500 dark:bg-valuenova-surface"
                  />
                  <span className="text-[10px] font-medium text-gray-600 dark:text-valuenova-muted">UPPERCASE</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-valuenova-surface border-l border-gray-200 dark:border-valuenova-border shadow-2xl z-50 flex flex-col transform transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-valuenova-border">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
            Card Style
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-valuenova-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Profile Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-valuenova-muted mb-2">
              Profile
            </label>
            <div className="flex gap-2">
              <select
                value={activeProfileId}
                onChange={(e) => onProfileChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-medium bg-gray-50 dark:bg-valuenova-bg border border-gray-200 dark:border-valuenova-border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-valuenova-accent focus:border-transparent text-gray-900 dark:text-white"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isBuiltIn ? '' : '(Custom)'}
                  </option>
                ))}
              </select>
              {!activeProfile.isBuiltIn && (
                <button
                  onClick={handleDeleteProfile}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete profile"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Card Height */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-valuenova-muted mb-2">
              Card Height
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={28}
                max={120}
                step={4}
                value={activeProfile.cardHeight}
                onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-valuenova-border rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-valuenova-accent"
              />
              <span className="text-sm font-bold text-gray-600 dark:text-valuenova-muted w-12 text-right">
                {activeProfile.cardHeight}px
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-valuenova-border" />

          {/* Fields */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-valuenova-muted mb-3">
              Fields
            </label>
            <div className="bg-gray-50 dark:bg-valuenova-bg rounded-lg px-3">
              {(['title', 'region', 'status', 'statusDot', 'cost', 'dates'] as FieldKey[]).map(renderFieldControl)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-valuenova-border space-y-2">
          {isSaveAsOpen ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-valuenova-bg border border-gray-200 dark:border-valuenova-border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-valuenova-accent focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAsNew();
                  if (e.key === 'Escape') setIsSaveAsOpen(false);
                }}
              />
              <button
                onClick={handleSaveAsNew}
                disabled={!newProfileName.trim()}
                className="px-4 py-2 text-sm font-bold bg-indigo-600 dark:bg-valuenova-accent text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => setIsSaveAsOpen(false)}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-valuenova-muted hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSaveAsOpen(true)}
              className="w-full px-4 py-2.5 text-sm font-bold bg-gray-100 dark:bg-valuenova-bg text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-valuenova-border transition-colors"
            >
              Save As New Profile
            </button>
          )}
        </div>
      </div>
    </>
  );
}

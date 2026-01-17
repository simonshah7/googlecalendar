/**
 * BulkActionsBar Component
 *
 * Floating action bar that appears when activities are selected.
 * Provides bulk operations like delete, status change, move, etc.
 */

import React, { useState } from 'react';
import { CampaignStatus, Region, Swimlane, Campaign } from '../types';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  swimlanes: Swimlane[];
  campaigns: Campaign[];
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: CampaignStatus) => void;
  onBulkSwimlaneChange: (swimlaneId: string) => void;
  onBulkCampaignChange: (campaignId: string | null) => void;
  onBulkRegionChange: (region: Region) => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  selectedIds,
  swimlanes,
  campaigns,
  onClearSelection,
  onBulkDelete,
  onBulkStatusChange,
  onBulkSwimlaneChange,
  onBulkCampaignChange,
  onBulkRegionChange,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-gray-900 dark:bg-valuenova-surface rounded-2xl shadow-2xl border border-gray-700 dark:border-valuenova-border px-4 py-3 flex items-center gap-3">
        {/* Selection Count */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-black">
            {selectedCount}
          </div>
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Selected</span>
        </div>

        {/* Status Change */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('status')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {activeDropdown === 'status' && (
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden min-w-[150px]">
              {Object.values(CampaignStatus).map(status => (
                <button
                  key={status}
                  onClick={() => { onBulkStatusChange(status); setActiveDropdown(null); }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swimlane Change */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('swimlane')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Move
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {activeDropdown === 'swimlane' && (
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden min-w-[180px] max-h-[200px] overflow-y-auto">
              {swimlanes.map(swimlane => (
                <button
                  key={swimlane.id}
                  onClick={() => { onBulkSwimlaneChange(swimlane.id); setActiveDropdown(null); }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors truncate"
                >
                  {swimlane.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Change */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('campaign')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Campaign
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {activeDropdown === 'campaign' && (
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden min-w-[180px] max-h-[200px] overflow-y-auto">
              <button
                onClick={() => { onBulkCampaignChange(null); setActiveDropdown(null); }}
                className="w-full px-4 py-2 text-left text-xs font-bold text-gray-400 italic hover:bg-gray-700 hover:text-white transition-colors"
              >
                No Campaign
              </button>
              {campaigns.map(campaign => (
                <button
                  key={campaign.id}
                  onClick={() => { onBulkCampaignChange(campaign.id); setActiveDropdown(null); }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors truncate"
                >
                  {campaign.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Region Change */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('region')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Region
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {activeDropdown === 'region' && (
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden min-w-[120px]">
              {Object.values(Region).map(region => (
                <button
                  key={region}
                  onClick={() => { onBulkRegionChange(region); setActiveDropdown(null); }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {region}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-700"></div>

        {/* Delete */}
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Clear selection"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;

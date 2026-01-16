
import React from 'react';
import { Campaign, CampaignStatus } from '../types';
import { Filters } from '../App';
import DatePicker from './DatePicker';

interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  campaigns: Campaign[];
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, onFilterChange, campaigns }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const handleDateChange = (name: 'startDate' | 'endDate', value: string) => {
    onFilterChange({ ...filters, [name]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-gray-50/50 dark:bg-valuenova-bg/50 p-2 rounded-lg border border-gray-100 dark:border-valuenova-border w-full transition-colors">
      <div className="relative flex-grow min-w-[200px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400 dark:text-valuenova-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleInputChange}
          className="block w-full pl-9 pr-3 py-1.5 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-md text-sm placeholder-gray-400 dark:placeholder-valuenova-muted text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-valuenova-accent focus:border-transparent transition-colors"
          placeholder="Filter activities..."
        />
      </div>

      <select
        name="campaignId"
        value={filters.campaignId}
        onChange={handleInputChange}
        className="bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-valuenova-accent transition-colors"
      >
        <option value="all">All Campaigns</option>
        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select
        name="status"
        value={filters.status}
        onChange={handleInputChange}
        className="bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-valuenova-accent transition-colors"
      >
        <option value="all">All Statuses</option>
        {Object.values(CampaignStatus).map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="flex items-center gap-2">
        <DatePicker
          name="startDate"
          value={filters.startDate}
          onChange={(v) => handleDateChange('startDate', v)}
        />
        <span className="text-gray-400 dark:text-valuenova-muted">→</span>
        <DatePicker
          name="endDate"
          value={filters.endDate}
          onChange={(v) => handleDateChange('endDate', v)}
        />
      </div>

      <button 
        onClick={() => onFilterChange({ search: '', campaignId: 'all', status: 'all', dateRange: 'all', startDate: '', endDate: '' })}
        className="text-xs text-indigo-600 dark:text-valuenova-accent font-semibold hover:text-indigo-800 dark:hover:brightness-110 px-2 transition-colors"
      >
        Reset
      </button>
    </div>
  );
};

export default FilterControls;


import React, { useState, useMemo } from 'react';
import { Activity, Campaign, ActivityType, Currency } from '../types';
import { STATUS_COLORS } from '../constants';

interface TableViewProps {
  activities: Activity[];
  campaigns: Campaign[];
  activityTypes: ActivityType[];
  onEdit: (activity: Activity) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  exchangeRates: Record<Currency, number>; // Base is USD = 1
  displayCurrency: Currency;
}

type SortConfig = {
  key: keyof Activity | 'campaign' | 'type';
  direction: 'asc' | 'desc';
};

const TableView: React.FC<TableViewProps> = ({ 
  activities, 
  campaigns, 
  activityTypes, 
  onEdit, 
  onDuplicate, 
  onDelete,
  exchangeRates,
  displayCurrency
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'startDate', direction: 'asc' });

  const campaignMap = useMemo(() => {
    return campaigns.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as Record<string, string>);
  }, [campaigns]);

  const typeMap = useMemo(() => {
    return activityTypes.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {} as Record<string, string>);
  }, [activityTypes]);

  const convertCost = (cost: number, fromCurrency: Currency): number => {
    // Convert source to USD, then USD to display currency
    const inUSD = cost / exchangeRates[fromCurrency];
    return inUSD * exchangeRates[displayCurrency];
  };

  const totals = useMemo(() => {
    return activities.reduce((acc, a) => ({
      cost: acc.cost + convertCost(a.cost, a.currency),
      sao: acc.sao + a.expectedSAOs
    }), { cost: 0, sao: 0 });
  }, [activities, displayCurrency, exchangeRates]);

  const sortedActivities = useMemo(() => {
    const sortableItems = [...activities];
    sortableItems.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'campaign') {
        aValue = campaignMap[a.campaignId] || '';
        bValue = campaignMap[b.campaignId] || '';
      } else if (sortConfig.key === 'type') {
        aValue = typeMap[a.typeId] || '';
        bValue = typeMap[b.typeId] || '';
      } else {
        aValue = a[sortConfig.key as keyof Activity];
        bValue = b[sortConfig.key as keyof Activity];
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [activities, sortConfig, campaignMap, typeMap]);

  const handleSort = (key: keyof Activity | 'campaign' | 'type') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <span className="ml-1 opacity-20 text-gray-400">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-indigo-600 dark:text-valuenova-accent">↑</span> : <span className="ml-1 text-indigo-600 dark:text-valuenova-accent">↓</span>;
  };

  return (
    <div className="bg-white dark:bg-valuenova-surface rounded-lg shadow-sm border border-gray-200 dark:border-valuenova-border overflow-hidden transition-colors flex flex-col h-full">
      <div className="overflow-auto scrollbar-hide flex-grow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-valuenova-border table-fixed md:table-auto border-separate border-spacing-0">
          <thead className="bg-gray-50 dark:bg-valuenova-bg sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors" onClick={() => handleSort('title')}>
                Title <SortIcon column="title" />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors" onClick={() => handleSort('campaign')}>
                Campaign <SortIcon column="campaign" />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors" onClick={() => handleSort('startDate')}>
                Date <SortIcon column="startDate" />
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors" onClick={() => handleSort('expectedSAOs')}>
                SAOs <SortIcon column="expectedSAOs" />
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors" onClick={() => handleSort('cost')}>
                Cost ({displayCurrency}) <SortIcon column="cost" />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-valuenova-surface transition-colors" onClick={() => handleSort('status')}>
                Status <SortIcon column="status" />
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-valuenova-surface divide-y divide-gray-200 dark:divide-valuenova-border transition-colors">
            {sortedActivities.length > 0 ? (
              sortedActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-valuenova-bg transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-xs" title={activity.title}>{activity.title}</div>
                    <div className="text-[10px] font-black uppercase text-indigo-500 dark:text-valuenova-accent mt-0.5">{typeMap[activity.typeId]}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-500 dark:text-valuenova-muted">{campaignMap[activity.campaignId] || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-900 dark:text-white font-medium">{activity.startDate}</div>
                    <div className="text-[10px] text-gray-400 dark:text-valuenova-muted">to {activity.endDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {activity.expectedSAOs.toFixed(1)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900 dark:text-white font-bold tabular-nums">
                      {convertCost(activity.cost, activity.currency).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-[9px] uppercase font-black leading-5 rounded-full border ${STATUS_COLORS[activity.status]}`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => onEdit(activity)} className="text-indigo-600 dark:text-valuenova-accent hover:bg-indigo-50 dark:hover:bg-valuenova-bg p-1.5 rounded-md transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-valuenova-muted italic">
                  No activities found matching filters.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-gray-50 dark:bg-valuenova-surface border-t-2 border-gray-200 dark:border-valuenova-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-xs font-black text-gray-500 dark:text-valuenova-muted uppercase tracking-widest">
                Totals for current view
              </td>
              <td className="px-6 py-4 text-right">
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {totals.sao.toFixed(1)}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="text-sm font-black text-indigo-600 dark:text-valuenova-accent tabular-nums">
                  {displayCurrency} {totals.cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TableView;

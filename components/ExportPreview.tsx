
import React, { forwardRef, useMemo } from 'react';
import { Activity, Swimlane } from '../types';
import { LIGHT_SWIMLANE_COLORS } from '../constants';

// Helper functions
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const diffDaysUTC = (dateStr1: string, dateStr2: string): number => {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.round((d2.getTime() - d1.getTime()) / oneDay);
};

interface ExportPreviewProps {
  activities: Activity[];
  swimlanes: Swimlane[];
  startDate: string;
  endDate: string;
  title: string;
  isAnnual?: boolean;
}

const ExportPreview = forwardRef<HTMLDivElement, ExportPreviewProps>(({ activities, swimlanes, startDate, endDate, title, isAnnual }, ref) => {
  const HEADER_COL_WIDTH = 300;
  const EXPORT_WIDTH = isAnnual ? 3840 : 2560; // Increased width for higher fidelity
  const availableWidthForTimeline = EXPORT_WIDTH - HEADER_COL_WIDTH - 120;

  const timelineData = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T23:59:59Z');
    
    const totalDays = diffDaysUTC(formatDate(start), formatDate(end)) + 1;
    const dayWidth = availableWidthForTimeline / totalDays;

    const months: Date[] = [];
    let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (current <= end) {
      months.push(new Date(current));
      current.setUTCMonth(current.getUTCMonth() + 1);
    }

    return { months, totalWidth: totalDays * dayWidth, dayWidth };
  }, [startDate, endDate, availableWidthForTimeline]);

  const { months, totalWidth, dayWidth } = timelineData;

  const swimlaneColorMap = useMemo(() => {
    return swimlanes.reduce((acc, swimlane, index) => {
        // We use a mapping that ensures sharp 1px borders for the export
        const colors = [
            'bg-[#E0F2F1] border-[#26A69A] text-[#004D40]', // Teal
            'bg-[#F3E5F5] border-[#AB47BC] text-[#4A148C]', // Purple
            'bg-[#FCE4EC] border-[#EC407A] text-[#880E4F]', // Pink
            'bg-[#FFF3E0] border-[#FFA726] text-[#E65100]', // Orange
            'bg-[#E1F5FE] border-[#29B6F6] text-[#01579B]', // Cyan
        ];
        acc[swimlane.id] = colors[index % colors.length];
        return acc;
    }, {} as Record<string, string>);
  }, [swimlanes]);

  const swimlaneLayouts = useMemo(() => {
    const layouts: Record<string, Activity[][]> = {};
    swimlanes.forEach(swimlane => {
        const swimlaneActivities = activities
            .filter(a => a.swimlaneId === swimlane.id)
            .filter(a => !(a.endDate < startDate || a.startDate > endDate))
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        const layout: Activity[][] = [];
        swimlaneActivities.forEach(activity => {
            let placed = false;
            for (let i = 0; i < layout.length; i++) {
                const lastInRow = layout[i][layout[i].length - 1];
                if (new Date(activity.startDate) > new Date(lastInRow.endDate)) {
                    layout[i].push(activity);
                    placed = true;
                    break;
                }
            }
            if (!placed) layout.push([activity]);
        });
        layouts[swimlane.id] = layout;
    });
    return layouts;
  }, [activities, swimlanes, startDate, endDate]);

  return (
    <div
      ref={ref}
      className="bg-white p-16 font-sans relative text-gray-900"
      style={{ width: `${EXPORT_WIDTH}px`, minHeight: '1200px' }}
    >
      {/* High-End Header */}
      <header className="mb-14 flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-7xl font-black tracking-tighter text-gray-900">CampaignOS</h1>
          <div className="h-1.5 w-32 bg-indigo-600 rounded-full"></div>
          <p className="text-3xl font-bold text-gray-400 uppercase tracking-[0.2em] pt-2">{title}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="bg-gray-900 text-white px-6 py-2 rounded-full mb-4">
             <span className="text-lg font-black uppercase tracking-widest">Marketing Roadmap</span>
          </div>
          <p className="text-2xl font-medium text-gray-500 tabular-nums">
            {startDate.replace(/-/g, '.')} — {endDate.replace(/-/g, '.')}
          </p>
        </div>
      </header>

      <div className="border-[1px] border-gray-200 rounded-xl overflow-hidden shadow-2xl shadow-gray-200/50" style={{ display: 'grid', gridTemplateColumns: `${HEADER_COL_WIDTH}px 1fr` }}>
        {/* Left Column: Labels */}
        <div className="bg-white border-r-[1px] border-gray-200">
          <div className="h-24 bg-gray-50/50 border-b-[1px] border-gray-200"></div>
          {swimlanes.map(swimlane => {
            const layout = swimlaneLayouts[swimlane.id] || [];
            const rowCount = Math.max(1, layout.length);
            const height = rowCount * 90 + 40; 
            return (
              <div key={swimlane.id} style={{ height: `${height}px` }} className="px-8 flex items-center border-b-[1px] border-gray-200 last:border-b-0">
                <h4 className="font-black text-xl text-gray-800 uppercase tracking-wide leading-tight">{swimlane.name}</h4>
              </div>
            );
          })}
        </div>
        
        {/* Right Column: Timeline Grid */}
        <div className="relative bg-white" style={{ width: `${totalWidth}px` }}>
          {/* Timeline Header (Months) */}
          <div className="flex sticky top-0 z-10">
            {months.map((monthDate, idx) => {
              const startOfRange = new Date(startDate + 'T00:00:00Z');
              const endOfRange = new Date(endDate + 'T23:59:59Z');
              
              const monthStart = idx === 0 ? startOfRange : monthDate;
              const nextMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));
              const monthEnd = nextMonth > endOfRange ? endOfRange : new Date(nextMonth.getTime() - 1);
              
              const daysInSlice = diffDaysUTC(formatDate(monthStart), formatDate(monthEnd)) + 1;
              const sliceWidth = daysInSlice * dayWidth;

              return (
                <div key={monthDate.toISOString()} className="h-24 flex flex-col items-center justify-center border-r-[1px] border-b-[1px] border-gray-200 bg-white" style={{ width: `${sliceWidth}px` }}>
                  <span className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                    {monthDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' })}
                  </span>
                  {isAnnual && <span className="text-sm font-bold text-gray-400 mt-1">{monthDate.getUTCFullYear()}</span>}
                </div>
              );
            })}
          </div>
          
          {/* Rows Content */}
          {swimlanes.map(swimlane => {
            const layout = swimlaneLayouts[swimlane.id] || [];
            const rowCount = Math.max(1, layout.length);
            const height = rowCount * 90 + 40;
            return (
              <div key={swimlane.id} className="relative border-b-[1px] border-gray-200 last:border-b-0" style={{ height: `${height}px` }}>
                {/* Vertical helper lines - thinner and more subtle */}
                {months.map((monthDate, idx) => {
                   if (idx === 0) return null;
                   const left = diffDaysUTC(startDate, formatDate(monthDate)) * dayWidth;
                   return <div key={monthDate.toISOString()} className="absolute top-0 h-full border-l-[1px] border-gray-100" style={{ left: `${left}px` }} />;
                })}

                {/* Activity Bars */}
                {layout.map((row, rowIndex) => (
                  row.map(activity => {
                    const activityStart = activity.startDate < startDate ? startDate : activity.startDate;
                    const activityEnd = activity.endDate > endDate ? endDate : activity.endDate;
                    
                    const left = diffDaysUTC(startDate, activityStart) * dayWidth;
                    const width = (diffDaysUTC(activityStart, activityEnd) + 1) * dayWidth;
                    const top = rowIndex * 90 + 20; 
                    const styleClasses = swimlaneColorMap[activity.swimlaneId];
                    
                    return (
                      <div
                        key={activity.id}
                        className={`absolute h-[68px] rounded-md border-[1px] flex flex-col justify-center px-5 ${styleClasses}`}
                        style={{ left: `${left}px`, width: `${width}px`, top: `${top}px` }}
                      >
                        <p className="font-black text-[22px] truncate uppercase tracking-tight leading-tight">
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-[11px] font-bold opacity-60 tabular-nums">
                              {activity.startDate.replace(/-/g, '/')} — {activity.endDate.replace(/-/g, '/')}
                            </p>
                            <span className="h-2 w-2 rounded-full bg-black/10"></span>
                            <p className="text-[11px] font-black uppercase tracking-widest opacity-70">
                              {activity.status}
                            </p>
                        </div>
                      </div>
                    );
                  })
                ))}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Clean Footer */}
      <footer className="mt-16 flex justify-between items-center border-t-[1px] border-gray-100 pt-8">
        <div>
           <p className="text-xl font-black uppercase tracking-[0.3em] text-gray-300">Confidential Strategy Document</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-400">
            System: <span className="text-gray-900 font-black">CampaignOS</span> • v2.5 • {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>
      </footer>
    </div>
  );
});

export default ExportPreview;

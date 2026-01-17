/**
 * ExportModal Component
 *
 * Provides a UI for configuring and initiating calendar exports.
 * Supports multiple export formats (PNG, PDF, CSV, Slides) and
 * different time scope options (monthly, quarterly, annual, custom).
 */

import React, { useState, useMemo } from 'react';
import DatePicker from './DatePicker';

/**
 * Configuration object passed to the export handler.
 */
export type ExportConfig = {
    type: 'monthly' | 'quarterly' | 'annual' | 'custom';
    selectedPeriods: string[]; // e.g., ["1", "2", "Q1"]
    format: 'pdf' | 'png' | 'csv' | 'slides';
    startDate?: string;
    endDate?: string;
    year?: number; // The year for monthly/quarterly/annual exports
};

interface ExportModalProps {
    onClose: () => void;
    onStartExport: (config: ExportConfig) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onStartExport }) => {
    // Get current year for dynamic date defaults
    const currentYear = useMemo(() => new Date().getFullYear(), []);

    const [type, setType] = useState<'monthly' | 'quarterly' | 'annual' | 'custom'>('monthly');
    const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
    const [format, setFormat] = useState<'pdf' | 'png' | 'csv' | 'slides'>('png');
    // Initialize with current year's date range
    const [customStartDate, setCustomStartDate] = useState(`${currentYear}-01-01`);
    const [customEndDate, setCustomEndDate] = useState(`${currentYear}-12-31`);

    const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    const quarters = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];

    const togglePeriod = (p: string) => {
        setSelectedPeriods(prev => 
            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
        );
    };

    /**
     * Validate and submit the export configuration.
     */
    const handleConfirm = () => {
        // Validate period selection for monthly/quarterly exports
        if (type !== 'annual' && type !== 'custom' && selectedPeriods.length === 0) {
            alert('Please select at least one period to export.');
            return;
        }

        // Validate custom date range
        if (type === 'custom' && customStartDate > customEndDate) {
            alert('Start date cannot be after end date.');
            return;
        }

        onStartExport({
            type,
            selectedPeriods,
            format,
            startDate: type === 'custom' ? customStartDate : undefined,
            endDate: type === 'custom' ? customEndDate : undefined,
            year: currentYear
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-valuenova-surface rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-valuenova-border">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Report Bundle</h2>
                        <p className="text-sm text-gray-500 dark:text-valuenova-muted">Select report type, timeframes, and format.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Export Format</label>
                        <div className="grid grid-cols-4 gap-2 p-1 bg-gray-100 dark:bg-valuenova-bg rounded-xl">
                            {(['png', 'pdf', 'csv', 'slides'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFormat(f)}
                                    className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${format === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {f === 'slides' ? 'Slides Zip' : f}
                                </button>
                            ))}
                        </div>
                        {format === 'slides' && (
                            <p className="mt-2 text-[10px] text-indigo-500 font-bold italic">Generates 16:9 4K images optimized for Google Slides drag-and-drop.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Report Scope</label>
                        <div className="grid grid-cols-4 gap-2 p-1 bg-gray-100 dark:bg-valuenova-bg rounded-xl">
                            {(['monthly', 'quarterly', 'annual', 'custom'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setType(t); setSelectedPeriods([]); }}
                                    className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${type === t ? 'bg-white dark:bg-valuenova-border text-indigo-600 dark:text-valuenova-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {type === 'monthly' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Select Months</label>
                            <div className="grid grid-cols-3 gap-2 max-h-[180px] overflow-y-auto scrollbar-hide p-1">
                                {months.map((p, i) => {
                                    const id = `${i + 1}`;
                                    const isSelected = selectedPeriods.includes(id);
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => togglePeriod(id)}
                                            className={`p-3 text-[10px] font-bold rounded-xl border-2 transition-all text-center ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white dark:bg-valuenova-bg border-gray-100 dark:border-valuenova-border text-gray-500 hover:border-indigo-100'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {type === 'quarterly' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Select Quarters</label>
                            <div className="grid grid-cols-2 gap-2 p-1">
                                {quarters.map((p, i) => {
                                    const id = `Q${i + 1}`;
                                    const isSelected = selectedPeriods.includes(id);
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => togglePeriod(id)}
                                            className={`p-3 text-[10px] font-bold rounded-xl border-2 transition-all text-center ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white dark:bg-valuenova-bg border-gray-100 dark:border-valuenova-border text-gray-500 hover:border-indigo-100'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {type === 'custom' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Select Date Range</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Start Date</span>
                                    <DatePicker 
                                        name="exportStart" 
                                        value={customStartDate} 
                                        onChange={setCustomStartDate} 
                                    />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">End Date</span>
                                    <DatePicker 
                                        name="exportEnd" 
                                        value={customEndDate} 
                                        onChange={setCustomEndDate} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'annual' && (
                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 text-center">
                            <p className="text-sm font-bold text-indigo-600 dark:text-valuenova-accent">Full Year {currentYear} Report</p>
                            <p className="text-xs text-indigo-400 mt-1 italic">Single high-resolution panorama of the entire roadmap.</p>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-gray-50/50 dark:bg-valuenova-bg/30 border-t border-gray-100 dark:border-valuenova-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-800">Cancel</button>
                    <button 
                        onClick={handleConfirm}
                        className="px-8 py-2.5 bg-indigo-600 dark:bg-valuenova-accent text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        {format === 'csv' ? 'Download CSV' : format === 'slides' ? 'Generate Deck' : 'Generate Report'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;

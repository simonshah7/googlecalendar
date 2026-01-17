
import React, { useState, useEffect } from 'react';
import { Activity, Campaign, ActivityType, CampaignStatus, Swimlane, Vendor, Currency, Region, Attachment, RecurrenceFrequency } from '../types';
import DatePicker from './DatePicker';

interface ActivityModalProps {
  activity: Activity | Partial<Activity> | null;
  campaigns: Campaign[];
  swimlanes: Swimlane[];
  activityTypes: ActivityType[];
  vendors: Vendor[];
  onClose: () => void;
  onSave: (activity: Activity) => void;
  onDelete?: (id: string) => void;
  onAddCampaign: (name: string) => void;
  onUpdateCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (id: string) => void;
  onAddActivityType: (name: string) => void;
  onUpdateActivityType: (type: ActivityType) => void;
  onDeleteActivityType: (id: string) => void;
  onAddVendor: (name: string) => void;
  onUpdateVendor: (vendor: Vendor) => void;
  onDeleteVendor: (id: string) => void;
  isCampaignInUse: (id: string) => boolean;
  isActivityTypeInUse: (id: string) => boolean;
  isVendorInUse: (id: string) => boolean;
  allActivities?: Activity[]; 
  readOnly?: boolean;
}

const PRESET_COLORS = [
  '#99f6e4', '#e9d5ff', '#fbcfe8', '#fed7aa', '#bae6fd', '#d9f99d', '#fef08a', '#fecaca', '#e2e8f0',
];

const MOCK_DRIVE_FILES: Omit<Attachment, 'id'>[] = [
  { name: 'Campaign_Contract_v2.pdf', type: 'pdf', url: '#' },
  { name: 'Q3_Budget_Tracking.xlsx', type: 'sheet', url: '#' },
  { name: 'Creative_Brief_Main.docx', type: 'doc', url: '#' },
  { name: 'Hero_Banner_v1.png', type: 'image', url: '#' },
];

const ActivityModal: React.FC<ActivityModalProps> = ({
  activity, campaigns, swimlanes, activityTypes, vendors, onClose, onSave, onDelete,
  onAddCampaign, onAddActivityType, allActivities = [],
  readOnly = false
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    general: false, schedule: false, commercials: false, visual: false, attachments: false, dependencies: true
  });
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);
  const [isAddingActivityType, setIsAddingActivityType] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newActivityTypeName, setNewActivityTypeName] = useState('');

  // Get available activities for dependencies (exclude current activity)
  const availableForDependency = allActivities.filter(a => a.id !== activity?.id);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getInitialFormData = (): Omit<Activity, 'id'> => ({
    title: '',
    typeId: activityTypes[0]?.id || '',
    campaignId: campaigns[0]?.id || '',
    swimlaneId: swimlanes[0]?.id || '',
    calendarId: activity?.calendarId || '', // Fix: calendarId is required for Omit<Activity, 'id'>
    startDate: '',
    endDate: '',
    status: CampaignStatus.Considering,
    description: '',
    tags: '',
    cost: 0,
    currency: Currency.USD,
    vendorId: vendors[0]?.id || '',
    expectedSAOs: 0,
    actualSAOs: 0,
    region: Region.US,
    dependencies: [] as string[],
    attachments: [] as Attachment[],
    color: PRESET_COLORS[0],
    // Recurrence fields
    recurrenceFrequency: RecurrenceFrequency.NONE,
    recurrenceEndDate: undefined,
    recurrenceCount: undefined,
  });

  const [formData, setFormData] = useState<Omit<Activity, 'id'>>(() => getInitialFormData());

  useEffect(() => {
    if (activity) {
      setFormData(prev => ({ ...getInitialFormData(), ...prev, ...activity } as Omit<Activity, 'id'>));
    } else {
      setFormData(getInitialFormData());
    }
  }, [activity]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (readOnly) return;
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (name: 'startDate' | 'endDate', value: string) => {
    if (readOnly) return;

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Date validation: Auto-adjust end date if it's before start date
      if (name === 'startDate' && newData.endDate && value > newData.endDate) {
        newData.endDate = value;
      }
      // Date validation: Auto-adjust start date if end date is set before it
      if (name === 'endDate' && newData.startDate && value < newData.startDate) {
        newData.startDate = value;
      }

      return newData;
    });
  };

  // Check if dates are valid
  const isDateRangeValid = !formData.startDate || !formData.endDate || formData.startDate <= formData.endDate;

  const handleAddAttachment = (file: Omit<Attachment, 'id'>) => {
    if (readOnly) return;
    const newAttachment: Attachment = { ...file, id: `att-${Date.now()}` };
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment]
    }));
    setIsDrivePickerOpen(false);
  };

  const handleRemoveAttachment = (id: string) => {
    if (readOnly) return;
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    // Only require title, startDate, endDate, and swimlaneId - campaignId and typeId are optional
    if (formData.title && formData.startDate && formData.endDate && formData.swimlaneId) {
       onSave({ ...formData, id: activity?.id || '' } as Activity);
    }
  };

  const labelClass = "block text-[10px] font-black text-gray-400 dark:text-valuenova-muted uppercase tracking-widest mb-2";
  const inputClass = "block w-full rounded-lg border-gray-200 dark:border-valuenova-border bg-gray-50/50 dark:bg-valuenova-bg shadow-sm focus:border-indigo-500 dark:focus:border-valuenova-accent focus:ring-indigo-500 dark:focus:ring-valuenova-accent text-sm text-gray-900 dark:text-white py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const numericInputClass = `${inputClass} text-right tabular-nums`;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z"/></svg>;
      case 'sheet': return <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>;
      case 'image': return <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>;
      default: return <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>;
    }
  };

  const SectionHeader = ({ title, sectionKey }: { title: string, sectionKey: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full group mb-4 text-left"
    >
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-5 bg-indigo-600 dark:bg-valuenova-accent rounded-full"></span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{title}</h3>
      </div>
      <svg
        className={`w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-transform duration-200 ${collapsedSections[sectionKey] ? '-rotate-90' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-valuenova-bg/80 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 p-0 sm:p-4 transition-all">
      <div className="bg-white dark:bg-valuenova-surface rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom sm:zoom-in duration-200 transition-colors border border-gray-200 dark:border-valuenova-border">
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 dark:border-valuenova-border flex justify-between items-center bg-white dark:bg-valuenova-surface">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{activity?.id ? 'Edit Activity' : 'Create Activity'}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-valuenova-muted font-medium hidden sm:block">Configure initiative parameters and link assets.</p>
            </div>
            {readOnly && (
              <span className="px-2 sm:px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full border border-yellow-200 dark:border-yellow-800/20">
                View Only
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-valuenova-muted hover:text-gray-600 dark:hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-valuenova-bg rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-4 sm:px-10 py-6 sm:py-8 space-y-8 sm:space-y-10 scrollbar-hide bg-[#FBFBFC] dark:bg-valuenova-bg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              <section className="transition-all duration-300">
                <SectionHeader title="General Information" sectionKey="general" />
                {!collapsedSections.general && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="md:col-span-2">
                      <label className={labelClass}>Activity Title</label>
                      <input type="text" name="title" value={formData.title} onChange={handleChange} disabled={readOnly} required className={inputClass} placeholder="e.g. Q3 Strategic Product Launch" />
                    </div>
                    <div>
                      <label className={labelClass}>Parent Campaign</label>
                      {isAddingCampaign ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCampaignName}
                            onChange={(e) => setNewCampaignName(e.target.value)}
                            placeholder="Campaign name..."
                            className={inputClass}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newCampaignName.trim()) {
                                onAddCampaign(newCampaignName.trim());
                                setNewCampaignName('');
                                setIsAddingCampaign(false);
                              } else if (e.key === 'Escape') {
                                setNewCampaignName('');
                                setIsAddingCampaign(false);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newCampaignName.trim()) {
                                onAddCampaign(newCampaignName.trim());
                                setNewCampaignName('');
                                setIsAddingCampaign(false);
                              }
                            }}
                            className="px-3 py-2 bg-indigo-600 dark:bg-valuenova-accent text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => { setNewCampaignName(''); setIsAddingCampaign(false); }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select name="campaignId" value={formData.campaignId} onChange={handleChange} disabled={readOnly} className={`${inputClass} flex-grow`}>
                            <option value="">-- No Campaign --</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => setIsAddingCampaign(true)}
                              className="px-3 py-2 border border-gray-200 dark:border-valuenova-border rounded-lg text-xs font-bold text-gray-500 dark:text-valuenova-muted hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                              New
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Activity Type</label>
                      {isAddingActivityType ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newActivityTypeName}
                            onChange={(e) => setNewActivityTypeName(e.target.value)}
                            placeholder="Activity type name..."
                            className={inputClass}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newActivityTypeName.trim()) {
                                onAddActivityType(newActivityTypeName.trim());
                                setNewActivityTypeName('');
                                setIsAddingActivityType(false);
                              } else if (e.key === 'Escape') {
                                setNewActivityTypeName('');
                                setIsAddingActivityType(false);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newActivityTypeName.trim()) {
                                onAddActivityType(newActivityTypeName.trim());
                                setNewActivityTypeName('');
                                setIsAddingActivityType(false);
                              }
                            }}
                            className="px-3 py-2 bg-indigo-600 dark:bg-valuenova-accent text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => { setNewActivityTypeName(''); setIsAddingActivityType(false); }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select name="typeId" value={formData.typeId} onChange={handleChange} disabled={readOnly} className={`${inputClass} flex-grow`}>
                            <option value="">-- No Type --</option>
                            {activityTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => setIsAddingActivityType(true)}
                              className="px-3 py-2 border border-gray-200 dark:border-valuenova-border rounded-lg text-xs font-bold text-gray-500 dark:text-valuenova-muted hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                              New
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="transition-all duration-300">
                <SectionHeader title="Schedule & Placement" sectionKey="schedule" />
                {!collapsedSections.schedule && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className={labelClass}>Start Date</label>
                        <DatePicker name="startDate" value={formData.startDate} onChange={(d) => handleDateChange('startDate', d)} required />
                      </div>
                      <div>
                        <label className={labelClass}>End Date</label>
                        <DatePicker name="endDate" value={formData.endDate} onChange={(d) => handleDateChange('endDate', d)} required />
                      </div>
                      <div>
                        <label className={labelClass}>Swimlane</label>
                        <select name="swimlaneId" value={formData.swimlaneId} onChange={handleChange} disabled={readOnly} className={inputClass}>
                          {swimlanes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Recurrence Section */}
                    <div className="p-4 bg-gray-50 dark:bg-valuenova-bg rounded-xl border border-gray-100 dark:border-valuenova-border">
                      <div className="flex items-center gap-3 mb-4">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-widest">Recurrence</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Repeat</label>
                          <select
                            name="recurrenceFrequency"
                            value={formData.recurrenceFrequency || RecurrenceFrequency.NONE}
                            onChange={handleChange}
                            disabled={readOnly}
                            className={inputClass}
                          >
                            <option value={RecurrenceFrequency.NONE}>Does not repeat</option>
                            <option value={RecurrenceFrequency.DAILY}>Daily</option>
                            <option value={RecurrenceFrequency.WEEKLY}>Weekly</option>
                            <option value={RecurrenceFrequency.BIWEEKLY}>Every 2 weeks</option>
                            <option value={RecurrenceFrequency.MONTHLY}>Monthly</option>
                            <option value={RecurrenceFrequency.QUARTERLY}>Quarterly</option>
                            <option value={RecurrenceFrequency.YEARLY}>Yearly</option>
                          </select>
                        </div>
                        {formData.recurrenceFrequency && formData.recurrenceFrequency !== RecurrenceFrequency.NONE && (
                          <>
                            <div>
                              <label className={labelClass}>End Repeat</label>
                              <DatePicker
                                name="recurrenceEndDate"
                                value={formData.recurrenceEndDate || ''}
                                onChange={(d) => {
                                  if (!readOnly) {
                                    setFormData(prev => ({ ...prev, recurrenceEndDate: d || undefined }));
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Or After # Occurrences</label>
                              <input
                                type="number"
                                name="recurrenceCount"
                                value={formData.recurrenceCount || ''}
                                onChange={(e) => {
                                  if (!readOnly) {
                                    setFormData(prev => ({
                                      ...prev,
                                      recurrenceCount: e.target.value ? parseInt(e.target.value, 10) : undefined
                                    }));
                                  }
                                }}
                                placeholder="e.g. 10"
                                min="1"
                                max="52"
                                disabled={readOnly}
                                className={inputClass}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      {formData.recurrenceFrequency && formData.recurrenceFrequency !== RecurrenceFrequency.NONE && (
                        <p className="mt-3 text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">
                          This activity will repeat {formData.recurrenceFrequency}
                          {formData.recurrenceEndDate ? ` until ${new Date(formData.recurrenceEndDate).toLocaleDateString()}` : ''}
                          {formData.recurrenceCount ? ` for ${formData.recurrenceCount} occurrences` : ''}
                          {!formData.recurrenceEndDate && !formData.recurrenceCount ? ' indefinitely' : ''}.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="transition-all duration-300">
                <SectionHeader title="Commercials" sectionKey="commercials" />
                {!collapsedSections.commercials && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-white dark:bg-valuenova-surface rounded-2xl border border-gray-100 dark:border-valuenova-border shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="col-span-1">
                      <label className={labelClass}>Currency</label>
                      <select name="currency" value={formData.currency} onChange={handleChange} disabled={readOnly} className={inputClass}>
                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Budget / Cost</label>
                      <input type="number" name="cost" value={formData.cost} onChange={handleChange} disabled={readOnly} className={numericInputClass} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} disabled={readOnly} className={inputClass}>
                        {Object.values(CampaignStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Expected SAOs</label>
                      <input type="number" name="expectedSAOs" value={formData.expectedSAOs} onChange={handleChange} disabled={readOnly} className={numericInputClass} />
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Actual SAOs</label>
                      <input type="number" name="actualSAOs" value={formData.actualSAOs} onChange={handleChange} disabled={readOnly} className={numericInputClass} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Target Region</label>
                      <select name="region" value={formData.region} onChange={handleChange} disabled={readOnly} className={inputClass}>
                        {Object.values(Region).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </section>

              <section className="transition-all duration-300">
                <SectionHeader title="Google Drive Assets" sectionKey="attachments" />
                {!collapsedSections.attachments && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                    <div className="flex flex-wrap gap-3">
                      {(formData.attachments || []).map(att => (
                        <div key={att.id} className="group relative flex items-center gap-2 px-3 py-2 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-xl shadow-sm hover:border-indigo-500 transition-all">
                          {getFileIcon(att.type)}
                          <span className="text-xs font-bold text-gray-700 dark:text-white truncate max-w-[150px]">{att.name}</span>
                          {!readOnly && (
                            <button type="button" onClick={() => handleRemoveAttachment(att.id)} className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {!readOnly && (
                        <button type="button" onClick={() => setIsDrivePickerOpen(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 dark:border-valuenova-border rounded-xl text-xs font-black text-gray-400 hover:border-indigo-500 hover:text-indigo-600 transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                          Attach File
                        </button>
                      )}
                    </div>
                    {isDrivePickerOpen && !readOnly && (
                      <div className="p-4 bg-gray-50 dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[10px] font-black uppercase text-gray-400">Select Google Drive Asset</h4>
                          <button type="button" onClick={() => setIsDrivePickerOpen(false)} className="text-gray-400 hover:text-gray-900"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {MOCK_DRIVE_FILES.map(file => (
                            <button key={file.name} type="button" onClick={() => handleAddAttachment(file)} className="flex items-center gap-3 p-3 bg-white dark:bg-valuenova-bg border border-gray-100 dark:border-valuenova-border rounded-xl text-left hover:border-indigo-500 hover:shadow-md transition-all group">
                              {getFileIcon(file.type)}
                              <span className="text-xs font-bold text-gray-700 dark:text-white group-hover:text-indigo-600 truncate">{file.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="transition-all duration-300">
                <SectionHeader title="Dependencies" sectionKey="dependencies" />
                {!collapsedSections.dependencies && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                    <p className="text-xs text-gray-500 dark:text-valuenova-muted">
                      Select activities that must be completed before this one can start.
                    </p>
                    {/* Current dependencies */}
                    {(formData.dependencies || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(formData.dependencies || []).map(depId => {
                          const depActivity = allActivities.find(a => a.id === depId);
                          if (!depActivity) return null;
                          return (
                            <div key={depId} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg">
                              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{depActivity.title}</span>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    dependencies: (prev.dependencies || []).filter(id => id !== depId)
                                  }))}
                                  className="text-indigo-400 hover:text-red-500"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Add dependency dropdown */}
                    {!readOnly && availableForDependency.length > 0 && (
                      <div>
                        <select
                          className={inputClass}
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !(formData.dependencies || []).includes(e.target.value)) {
                              setFormData(prev => ({
                                ...prev,
                                dependencies: [...(prev.dependencies || []), e.target.value]
                              }));
                            }
                          }}
                        >
                          <option value="">+ Add dependency...</option>
                          {availableForDependency
                            .filter(a => !(formData.dependencies || []).includes(a.id))
                            .map(a => (
                              <option key={a.id} value={a.id}>{a.title}</option>
                            ))}
                        </select>
                      </div>
                    )}
                    {availableForDependency.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No other activities available for dependencies.</p>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-10">
              <section className="transition-all duration-300">
                <SectionHeader title="Visual Style" sectionKey="visual" />
                {!collapsedSections.visual && (
                  <div className="bg-white dark:bg-valuenova-surface p-6 rounded-2xl border border-gray-100 dark:border-valuenova-border shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className={labelClass}>Initiative Color</label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => { if(!readOnly) setFormData(prev => ({ ...prev, color: c })); }} className={`w-full aspect-square rounded-xl border-2 transition-all ${formData.color === c ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-50' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02]'} ${readOnly ? 'cursor-not-allowed' : ''}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/20">
                 <h4 className="text-[10px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-widest mb-3">Initiative Summary</h4>
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                       <span className="font-bold text-gray-500">Duration</span>
                       <span className="font-black text-gray-900 dark:text-white">
                        {formData.startDate && formData.endDate ? 
                          Math.max(1, Math.round((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) + ' Days' : '—'}
                       </span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-indigo-100/50 dark:border-indigo-800/20 pt-2">
                       <span className="font-bold text-gray-500">Allocated Cost</span>
                       <span className="font-black text-indigo-600 dark:text-valuenova-accent">
                          {formData.currency} {formData.cost.toLocaleString()}
                       </span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-indigo-100/50 dark:border-indigo-800/20 pt-2">
                       <span className="font-bold text-gray-500">Assets</span>
                       <span className="font-black text-gray-900 dark:text-white">
                          {(formData.attachments || []).length} Linked
                       </span>
                    </div>
                 </div>
              </section>
            </div>
          </div>
        </form>

        <div className="px-8 py-6 border-t border-gray-100 dark:border-valuenova-border flex justify-between items-center bg-white dark:bg-valuenova-surface">
          <div>
            {activity?.id && onDelete && !readOnly && (
                <button type="button" onClick={() => onDelete(activity.id as string)} className="px-5 py-2.5 text-xs font-black text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
            )}
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-valuenova-muted hover:text-gray-900 dark:hover:text-white transition-colors">
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button onClick={handleSubmit} type="submit" className="px-10 py-3 bg-indigo-600 dark:bg-valuenova-accent text-white rounded-xl text-sm font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 dark:hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                {activity?.id ? 'Update Activity' : 'Confirm & Create'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;

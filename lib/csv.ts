/**
 * CSV Export Utility
 *
 * Provides functionality to export activity data to CSV format.
 * Handles proper escaping of special characters and multi-line fields.
 */

import { Activity, Campaign, Swimlane, ActivityType, Vendor, ActivityInlineComment } from '@/types';

/**
 * Escapes a value for CSV according to RFC 4180.
 * - Values containing commas, quotes, or newlines are wrapped in quotes
 * - Quotes within values are escaped by doubling them
 */
function escapeCSVValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if the value needs to be quoted
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Formats inline comments for CSV export.
 * Joins comments with " | " delimiter, including timestamp prefix.
 */
function formatCommentsForCSV(comments: ActivityInlineComment[] | undefined): string {
  if (!comments || comments.length === 0) {
    return '';
  }

  return comments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((c) => {
      const date = new Date(c.createdAt).toLocaleDateString();
      return `[${date} - ${c.authorName}] ${c.content}`;
    })
    .join(' | ');
}

/**
 * Column definitions for CSV export
 */
export interface CSVColumn {
  key: string;
  label: string;
  getValue: (
    activity: Activity,
    lookups: CSVLookups
  ) => string | number | boolean | null | undefined;
}

/**
 * Lookup data needed to resolve foreign key references
 */
export interface CSVLookups {
  campaigns: Map<string, Campaign>;
  swimlanes: Map<string, Swimlane>;
  activityTypes: Map<string, ActivityType>;
  vendors: Map<string, Vendor>;
}

/**
 * All available columns for CSV export
 */
export const ALL_CSV_COLUMNS: CSVColumn[] = [
  { key: 'title', label: 'Activity Name', getValue: (a) => a.title },
  {
    key: 'campaign',
    label: 'Campaign',
    getValue: (a, l) => l.campaigns.get(a.campaignId)?.name || '',
  },
  {
    key: 'type',
    label: 'Activity Type',
    getValue: (a, l) => l.activityTypes.get(a.typeId)?.name || '',
  },
  { key: 'status', label: 'Status', getValue: (a) => a.status },
  {
    key: 'swimlane',
    label: 'Swim Lane',
    getValue: (a, l) => l.swimlanes.get(a.swimlaneId)?.name || '',
  },
  { key: 'startDate', label: 'Start Date', getValue: (a) => a.startDate },
  { key: 'endDate', label: 'End Date', getValue: (a) => a.endDate },
  {
    key: 'vendor',
    label: 'Placement/Vendor',
    getValue: (a, l) => l.vendors.get(a.vendorId)?.name || '',
  },
  { key: 'region', label: 'Region', getValue: (a) => a.region },
  {
    key: 'recurrence',
    label: 'Recurrence',
    getValue: (a) => {
      if (!a.recurrenceFrequency || a.recurrenceFrequency === 'none') return '';
      let recurrence: string = a.recurrenceFrequency;
      if (a.recurrenceEndDate) recurrence += ` until ${a.recurrenceEndDate}`;
      if (a.recurrenceCount) recurrence += ` (${a.recurrenceCount} times)`;
      return recurrence;
    },
  },
  { key: 'cost', label: 'Spend', getValue: (a) => a.cost },
  { key: 'currency', label: 'Currency', getValue: (a) => a.currency },
  { key: 'expectedSAOs', label: 'Expected SAOs', getValue: (a) => a.expectedSAOs },
  { key: 'actualSAOs', label: 'Actual SAOs', getValue: (a) => a.actualSAOs },
  {
    key: 'slackChannel',
    label: 'Slack Channel',
    getValue: (a) => (a.slackChannel ? `#${a.slackChannel}` : ''),
  },
  { key: 'outline', label: 'Outline', getValue: (a) => a.outline || '' },
  { key: 'description', label: 'Description', getValue: (a) => a.description || '' },
  {
    key: 'attachmentsCount',
    label: 'Attachments',
    getValue: (a) => a.attachments?.length || 0,
  },
  {
    key: 'attachmentsList',
    label: 'Attachment Names',
    getValue: (a) => a.attachments?.map((att) => att.name).join('; ') || '',
  },
  {
    key: 'dependenciesCount',
    label: 'Dependencies',
    getValue: (a) => a.dependencies?.length || 0,
  },
  {
    key: 'comments',
    label: 'Comments',
    getValue: (a) => formatCommentsForCSV(a.inlineComments),
  },
  { key: 'tags', label: 'Tags', getValue: (a) => a.tags || '' },
  { key: 'updatedAt', label: 'Last Updated', getValue: (a) => a.updatedAt || '' },
];

/**
 * Default visible columns for "Export Current View" mode
 */
export const DEFAULT_VISIBLE_COLUMNS = [
  'title',
  'campaign',
  'type',
  'status',
  'swimlane',
  'startDate',
  'endDate',
  'cost',
  'expectedSAOs',
  'actualSAOs',
];

/**
 * Options for CSV export
 */
export interface CSVExportOptions {
  /** Which columns to include (uses all if not specified) */
  columns?: string[];
  /** Filename prefix (will have date appended) */
  filenamePrefix?: string;
}

/**
 * Creates lookup maps from arrays of related data
 */
export function createCSVLookups(
  campaigns: Campaign[],
  swimlanes: Swimlane[],
  activityTypes: ActivityType[],
  vendors: Vendor[]
): CSVLookups {
  return {
    campaigns: new Map(campaigns.map((c) => [c.id, c])),
    swimlanes: new Map(swimlanes.map((s) => [s.id, s])),
    activityTypes: new Map(activityTypes.map((t) => [t.id, t])),
    vendors: new Map(vendors.map((v) => [v.id, v])),
  };
}

/**
 * Generates CSV content from activities
 *
 * @param activities - Activities to export
 * @param lookups - Lookup data for resolving foreign keys
 * @param options - Export options
 * @returns CSV content as a string
 */
export function generateCSV(
  activities: Activity[],
  lookups: CSVLookups,
  options: CSVExportOptions = {}
): string {
  const { columns } = options;

  // Filter columns if specified
  const columnsToExport = columns
    ? ALL_CSV_COLUMNS.filter((c) => columns.includes(c.key))
    : ALL_CSV_COLUMNS;

  // Generate header row
  const headerRow = columnsToExport.map((c) => escapeCSVValue(c.label)).join(',');

  // Generate data rows
  const dataRows = activities.map((activity) => {
    return columnsToExport
      .map((col) => escapeCSVValue(col.getValue(activity, lookups)))
      .join(',');
  });

  // Combine with proper line endings
  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a download of a CSV file in the browser.
 *
 * @param csvContent - The CSV file content
 * @param filenamePrefix - Prefix for the filename (date will be appended)
 */
export function downloadCSV(csvContent: string, filenamePrefix: string = 'nexus-activities'): void {
  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}-${date}.csv`;

  // Create blob with BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Helper function to get columns by keys
 */
export function getColumnsByKeys(keys: string[]): CSVColumn[] {
  return ALL_CSV_COLUMNS.filter((c) => keys.includes(c.key));
}

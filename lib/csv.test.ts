import { describe, it, expect } from 'vitest';
import { generateCSV, createCSVLookups, ALL_CSV_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from './csv';
import { Activity, Campaign, Swimlane, ActivityType, Vendor, CampaignStatus, Currency, Region, RecurrenceFrequency, ActivityInlineComment } from '../types';

// Helper to create mock data
function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    title: 'Test Activity',
    typeId: 'type-1',
    campaignId: 'campaign-1',
    swimlaneId: 'swimlane-1',
    calendarId: 'calendar-1',
    startDate: '2025-01-15',
    endDate: '2025-01-17',
    status: CampaignStatus.Committed,
    description: 'Test description',
    tags: 'tag1,tag2',
    cost: 1500,
    currency: Currency.USD,
    vendorId: 'vendor-1',
    expectedSAOs: 10,
    actualSAOs: 5,
    region: Region.US,
    dependencies: ['dep-1', 'dep-2'],
    attachments: [
      { id: 'att-1', name: 'file.pdf', type: 'pdf', url: '/files/file.pdf' },
    ],
    color: '#99f6e4',
    recurrenceFrequency: RecurrenceFrequency.WEEKLY,
    slackChannel: 'marketing-team',
    outline: 'Key talking points',
    ...overrides,
  };
}

function createMockLookupData() {
  const campaigns: Campaign[] = [
    { id: 'campaign-1', name: 'Q1 Marketing', calendarId: 'calendar-1' },
    { id: 'campaign-2', name: 'Product Launch', calendarId: 'calendar-1' },
  ];

  const swimlanes: Swimlane[] = [
    { id: 'swimlane-1', name: 'Events', calendarId: 'calendar-1', order: 0, color: '#99f6e4', collapsed: false, budget: 10000, currency: Currency.USD },
    { id: 'swimlane-2', name: 'Content', calendarId: 'calendar-1', order: 1, color: '#e9d5ff', collapsed: false, budget: 5000, currency: Currency.USD },
  ];

  const activityTypes: ActivityType[] = [
    { id: 'type-1', name: 'Webinar', calendarId: 'calendar-1' },
    { id: 'type-2', name: 'Blog Post', calendarId: 'calendar-1' },
  ];

  const vendors: Vendor[] = [
    { id: 'vendor-1', name: 'Zoom', calendarId: 'calendar-1' },
    { id: 'vendor-2', name: 'WordPress', calendarId: 'calendar-1' },
  ];

  return { campaigns, swimlanes, activityTypes, vendors };
}

describe('CSV Generation', () => {
  describe('generateCSV', () => {
    it('should generate non-empty CSV content', () => {
      const activity = createMockActivity();
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups);

      expect(csv.length).toBeGreaterThan(0);
    });

    it('should include header row with column labels', () => {
      const activity = createMockActivity();
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups);
      const lines = csv.split('\r\n');
      const header = lines[0];

      expect(header).toContain('Activity Name');
      expect(header).toContain('Campaign');
      expect(header).toContain('Status');
    });

    it('should include data rows for each activity', () => {
      const activities = [
        createMockActivity({ id: '1', title: 'Activity One' }),
        createMockActivity({ id: '2', title: 'Activity Two' }),
      ];
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV(activities, lookups);
      const lines = csv.split('\r\n').filter(l => l.trim());

      // 1 header + 2 data rows
      expect(lines.length).toBe(3);
    });

    it('should filter columns when specified', () => {
      const activity = createMockActivity();
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['title', 'campaign'] });
      const header = csv.split('\r\n')[0];

      expect(header).toContain('Activity Name');
      expect(header).toContain('Campaign');
      expect(header).not.toContain('Status');
      expect(header).not.toContain('Spend');
    });

    it('should resolve campaign names from lookups', () => {
      const activity = createMockActivity({ campaignId: 'campaign-1' });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['campaign'] });

      expect(csv).toContain('Q1 Marketing');
    });

    it('should resolve activity type names from lookups', () => {
      const activity = createMockActivity({ typeId: 'type-1' });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['type'] });

      expect(csv).toContain('Webinar');
    });

    it('should include Slack channel with # prefix', () => {
      const activity = createMockActivity({ slackChannel: 'marketing-team' });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['slackChannel'] });

      expect(csv).toContain('#marketing-team');
    });

    it('should handle empty Slack channel', () => {
      const activity = createMockActivity({ slackChannel: undefined });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['slackChannel'] });
      const lines = csv.split('\r\n');
      const dataRow = lines[1];

      // Should be empty, not "#"
      expect(dataRow).toBe('');
    });

    it('should properly escape commas in values', () => {
      const activity = createMockActivity({ title: 'Event, Meeting, Planning' });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['title'] });

      // Values with commas should be wrapped in quotes
      expect(csv).toContain('"Event, Meeting, Planning"');
    });

    it('should properly escape quotes in values', () => {
      const activity = createMockActivity({ title: 'The "Big" Event' });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['title'] });

      // Quotes should be escaped by doubling
      expect(csv).toContain('"The ""Big"" Event"');
    });

    it('should properly escape newlines in values', () => {
      const activity = createMockActivity({ outline: 'Line 1\nLine 2\nLine 3' });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['outline'] });

      // Values with newlines should be wrapped in quotes
      expect(csv).toContain('"Line 1\nLine 2\nLine 3"');
    });

    it('should include attachment count', () => {
      const activity = createMockActivity({
        attachments: [
          { id: '1', name: 'file1.pdf', type: 'pdf', url: '/1' },
          { id: '2', name: 'file2.doc', type: 'doc', url: '/2' },
        ],
      });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['attachmentsCount'] });
      const lines = csv.split('\r\n');

      expect(lines[1]).toBe('2');
    });

    it('should include dependencies count', () => {
      const activity = createMockActivity({
        dependencies: ['dep-1', 'dep-2', 'dep-3'],
      });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['dependenciesCount'] });
      const lines = csv.split('\r\n');

      expect(lines[1]).toBe('3');
    });

    it('should format inline comments correctly', () => {
      const comments: ActivityInlineComment[] = [
        { id: 'c1', content: 'First comment', authorName: 'Alice', authorId: 'u1', createdAt: '2025-01-15T10:00:00Z' },
        { id: 'c2', content: 'Second comment', authorName: 'Bob', authorId: 'u2', createdAt: '2025-01-16T10:00:00Z' },
      ];
      const activity = createMockActivity({ inlineComments: comments });
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups, { columns: ['comments'] });

      // Comments should be joined with " | " and include timestamps
      expect(csv).toContain('Bob');
      expect(csv).toContain('Alice');
      expect(csv).toContain('|');
    });

    it('should use CRLF line endings', () => {
      const activity = createMockActivity();
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      const csv = generateCSV([activity], lookups);

      expect(csv).toContain('\r\n');
    });
  });

  describe('createCSVLookups', () => {
    it('should create maps from arrays', () => {
      const { campaigns, swimlanes, activityTypes, vendors } = createMockLookupData();
      const lookups = createCSVLookups(campaigns, swimlanes, activityTypes, vendors);

      expect(lookups.campaigns.get('campaign-1')?.name).toBe('Q1 Marketing');
      expect(lookups.swimlanes.get('swimlane-1')?.name).toBe('Events');
      expect(lookups.activityTypes.get('type-1')?.name).toBe('Webinar');
      expect(lookups.vendors.get('vendor-1')?.name).toBe('Zoom');
    });
  });

  describe('ALL_CSV_COLUMNS', () => {
    it('should have all expected columns', () => {
      const columnKeys = ALL_CSV_COLUMNS.map(c => c.key);

      expect(columnKeys).toContain('title');
      expect(columnKeys).toContain('campaign');
      expect(columnKeys).toContain('type');
      expect(columnKeys).toContain('status');
      expect(columnKeys).toContain('swimlane');
      expect(columnKeys).toContain('startDate');
      expect(columnKeys).toContain('endDate');
      expect(columnKeys).toContain('vendor');
      expect(columnKeys).toContain('region');
      expect(columnKeys).toContain('recurrence');
      expect(columnKeys).toContain('cost');
      expect(columnKeys).toContain('expectedSAOs');
      expect(columnKeys).toContain('actualSAOs');
      expect(columnKeys).toContain('slackChannel');
      expect(columnKeys).toContain('outline');
      expect(columnKeys).toContain('attachmentsCount');
      expect(columnKeys).toContain('dependenciesCount');
      expect(columnKeys).toContain('comments');
    });
  });

  describe('DEFAULT_VISIBLE_COLUMNS', () => {
    it('should include essential columns', () => {
      expect(DEFAULT_VISIBLE_COLUMNS).toContain('title');
      expect(DEFAULT_VISIBLE_COLUMNS).toContain('campaign');
      expect(DEFAULT_VISIBLE_COLUMNS).toContain('type');
      expect(DEFAULT_VISIBLE_COLUMNS).toContain('status');
    });
  });
});

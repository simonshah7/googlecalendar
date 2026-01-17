import { describe, it, expect } from 'vitest';
import { generateICS, hasValidSchedule } from './ics';
import { Activity, CampaignStatus, Currency, Region, RecurrenceFrequency } from '../types';

// Helper to create a mock activity
function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'test-activity-id',
    title: 'Test Activity',
    typeId: 'type-1',
    campaignId: 'campaign-1',
    swimlaneId: 'swimlane-1',
    calendarId: 'calendar-1',
    startDate: '2025-01-15',
    endDate: '2025-01-17',
    status: CampaignStatus.Committed,
    description: 'Test description',
    tags: '',
    cost: 1000,
    currency: Currency.USD,
    vendorId: 'vendor-1',
    expectedSAOs: 10,
    actualSAOs: 5,
    region: Region.US,
    dependencies: [],
    attachments: [],
    color: '#99f6e4',
    recurrenceFrequency: RecurrenceFrequency.NONE,
    slackChannel: 'test-channel',
    outline: 'Test outline content',
    ...overrides,
  };
}

describe('ICS Generation', () => {
  describe('generateICS', () => {
    it('should return non-empty content for valid activity', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity);

      expect(ics).not.toBeNull();
      expect(ics!.length).toBeGreaterThan(0);
    });

    it('should return null for activity without schedule', () => {
      const activity = createMockActivity({ startDate: '', endDate: '' });
      const ics = generateICS(activity);

      expect(ics).toBeNull();
    });

    it('should include VCALENDAR wrapper', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should include VEVENT wrapper', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity);

      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('END:VEVENT');
    });

    it('should include activity title as SUMMARY', () => {
      const activity = createMockActivity({ title: 'My Test Event' });
      const ics = generateICS(activity);

      expect(ics).toContain('SUMMARY:My Test Event');
    });

    it('should include DTSTART and DTEND with correct format', () => {
      const activity = createMockActivity({
        startDate: '2025-01-15',
        endDate: '2025-01-17',
      });
      const ics = generateICS(activity);

      // DATE-only format for all-day events
      expect(ics).toContain('DTSTART;VALUE=DATE:20250115');
      // End date is exclusive in ICS, so 2025-01-18 (day after endDate)
      expect(ics).toContain('DTEND;VALUE=DATE:20250118');
    });

    it('should include UID for uniqueness', () => {
      const activity = createMockActivity({ id: 'unique-id-123' });
      const ics = generateICS(activity);

      expect(ics).toContain('UID:unique-id-123@nexus-calendar.app');
    });

    it('should include DTSTAMP', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity);

      expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });

    it('should include campaign name in DESCRIPTION when provided', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity, { campaignName: 'Q1 Marketing' });

      expect(ics).toContain('Campaign: Q1 Marketing');
    });

    it('should include outline in DESCRIPTION', () => {
      const activity = createMockActivity({ outline: 'Key discussion points' });
      const ics = generateICS(activity);

      expect(ics).toContain('Key discussion points');
    });

    it('should include vendor name as LOCATION when provided', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity, { vendorName: 'Zoom Webinar' });

      expect(ics).toContain('LOCATION:Zoom Webinar');
    });

    it('should set STATUS:CONFIRMED for Committed activities', () => {
      const activity = createMockActivity({ status: CampaignStatus.Committed });
      const ics = generateICS(activity);

      expect(ics).toContain('STATUS:CONFIRMED');
    });

    it('should set STATUS:TENTATIVE for Considering activities', () => {
      const activity = createMockActivity({ status: CampaignStatus.Considering });
      const ics = generateICS(activity);

      expect(ics).toContain('STATUS:TENTATIVE');
    });

    it('should properly escape special characters', () => {
      const activity = createMockActivity({
        title: 'Meeting; Discussion, Planning\\Review',
      });
      const ics = generateICS(activity);

      // Semicolons, commas, and backslashes should be escaped
      expect(ics).toContain('SUMMARY:Meeting\\; Discussion\\, Planning\\\\Review');
    });

    it('should use CRLF line endings', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity);

      // ICS files should use CRLF
      expect(ics).toContain('\r\n');
    });

    it('should include required ICS headers', () => {
      const activity = createMockActivity();
      const ics = generateICS(activity);

      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//Nexus Calendar//Activity Export//EN');
      expect(ics).toContain('CALSCALE:GREGORIAN');
      expect(ics).toContain('METHOD:PUBLISH');
    });
  });

  describe('hasValidSchedule', () => {
    it('should return true for activity with both dates', () => {
      const activity = createMockActivity({
        startDate: '2025-01-15',
        endDate: '2025-01-17',
      });

      expect(hasValidSchedule(activity)).toBe(true);
    });

    it('should return false for activity without start date', () => {
      const activity = createMockActivity({
        startDate: '',
        endDate: '2025-01-17',
      });

      expect(hasValidSchedule(activity)).toBe(false);
    });

    it('should return false for activity without end date', () => {
      const activity = createMockActivity({
        startDate: '2025-01-15',
        endDate: '',
      });

      expect(hasValidSchedule(activity)).toBe(false);
    });

    it('should return false for activity without any dates', () => {
      const activity = createMockActivity({
        startDate: '',
        endDate: '',
      });

      expect(hasValidSchedule(activity)).toBe(false);
    });
  });
});

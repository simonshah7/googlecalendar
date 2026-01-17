/**
 * ICS File Generator
 *
 * Generates standards-compliant ICS (iCalendar) files for activities.
 * Compatible with Outlook and Google Calendar.
 *
 * @see https://icalendar.org/RFC-Specifications/iCalendar-RFC-5545/
 */

import { Activity, Campaign } from '@/types';

/**
 * Formats a date string to ICS DATE format (YYYYMMDD)
 * Used for all-day events
 */
function formatICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

/**
 * Formats a Date object to ICS DATETIME format (YYYYMMDDTHHMMSSZ)
 * Uses UTC time for consistency
 */
function formatICSDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapes special characters in ICS text fields according to RFC 5545.
 * Characters that need escaping: backslash, semicolon, comma, newline
 */
function escapeICSText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Folds long lines according to RFC 5545 (max 75 octets per line).
 * Continuation lines start with a space or tab.
 */
function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) return line;

  const result: string[] = [];
  let remaining = line;

  // First line can be full length
  result.push(remaining.slice(0, maxLength));
  remaining = remaining.slice(maxLength);

  // Continuation lines (start with space, so max content is 74 chars)
  while (remaining.length > 0) {
    result.push(' ' + remaining.slice(0, maxLength - 1));
    remaining = remaining.slice(maxLength - 1);
  }

  return result.join('\r\n');
}

/**
 * Generates a unique identifier for the ICS event
 */
function generateUID(activityId: string): string {
  return `${activityId}@nexus-calendar.app`;
}

interface ICSOptions {
  /** Campaign name to include in description */
  campaignName?: string;
  /** Vendor/platform name to use as location */
  vendorName?: string;
  /** Activity type name */
  typeName?: string;
}

/**
 * Generates an ICS file content string for an activity.
 *
 * The generated ICS file includes:
 * - SUMMARY: Activity title
 * - DESCRIPTION: Campaign name (if set) and activity outline
 * - DTSTART/DTEND: Activity dates (as all-day events)
 * - LOCATION: Vendor/placement information
 *
 * @param activity - The activity to generate ICS for
 * @param options - Additional options for the ICS generation
 * @returns ICS file content as a string, or null if no schedule is set
 */
export function generateICS(activity: Activity, options: ICSOptions = {}): string | null {
  // Check if activity has a valid schedule
  if (!activity.startDate || !activity.endDate) {
    return null;
  }

  const { campaignName, vendorName, typeName } = options;

  // Build description from campaign name and outline
  const descriptionParts: string[] = [];

  if (campaignName) {
    descriptionParts.push(`Campaign: ${campaignName}`);
  }

  if (typeName) {
    descriptionParts.push(`Type: ${typeName}`);
  }

  if (activity.outline) {
    descriptionParts.push('');
    descriptionParts.push(activity.outline);
  }

  if (activity.description) {
    descriptionParts.push('');
    descriptionParts.push(activity.description);
  }

  const description = escapeICSText(descriptionParts.join('\n'));

  // Use vendor name as location if available
  const location = vendorName ? escapeICSText(vendorName) : '';

  // Calculate end date (ICS uses exclusive end date for VALUE=DATE)
  // Add 1 day to include the end date in the event
  const endDate = new Date(activity.endDate);
  endDate.setDate(endDate.getDate() + 1);
  const endDateStr = endDate.toISOString().split('T')[0];

  const now = formatICSDateTime(new Date());
  const uid = generateUID(activity.id);

  // Build ICS content
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nexus Calendar//Activity Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${formatICSDate(activity.startDate)}`,
    `DTEND;VALUE=DATE:${formatICSDate(endDateStr)}`,
    `SUMMARY:${escapeICSText(activity.title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${description}`);
  }

  if (location) {
    lines.push(`LOCATION:${location}`);
  }

  // Add status based on activity status
  if (activity.status === 'Committed') {
    lines.push('STATUS:CONFIRMED');
  } else if (activity.status === 'Considering') {
    lines.push('STATUS:TENTATIVE');
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // Fold long lines and join with CRLF
  return lines.map(foldLine).join('\r\n');
}

/**
 * Triggers a download of an ICS file in the browser.
 *
 * @param icsContent - The ICS file content
 * @param filename - The filename for the download (without extension)
 */
export function downloadICS(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Helper function to check if an activity has a valid schedule for ICS generation
 */
export function hasValidSchedule(activity: Activity): boolean {
  return !!(activity.startDate && activity.endDate);
}

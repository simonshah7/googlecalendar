/**
 * Type Definitions for CampaignOS
 *
 * This file contains all the TypeScript interfaces and enums used throughout
 * the application. These types are shared between the frontend components
 * and API routes to ensure type consistency.
 *
 * Note: These types are separate from the database types (db/schema.ts)
 * and represent the client-facing data structures.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * User roles for authorization throughout the application.
 *
 * - USER: Standard user with access only to their own calendars and
 *         calendars shared with them
 * - MANAGER: Can view and manage all calendars in the system
 * - ADMIN: Full system access including user management and settings
 *
 * Note: Enum values must match exactly what's stored in the database
 * (title case: 'User', 'Manager', 'Admin')
 */
export enum UserRole {
  USER = "User",
  MANAGER = "Manager",
  ADMIN = "Admin"
}

/**
 * Activity status representing the planning/sales pipeline stages.
 *
 * - Considering: Initial stage - activity is being evaluated
 * - Negotiating: Middle stage - active discussions in progress
 * - Committed: Final stage - activity is confirmed and scheduled
 *
 * Status affects visual styling (color coding) in the UI.
 */
export enum CampaignStatus {
  Considering = "Considering",
  Negotiating = "Negotiating",
  Committed = "Committed",
}

/**
 * Supported currencies for tracking activity costs and budgets.
 *
 * The enum values include the currency symbol for display purposes.
 */
export enum Currency {
  USD = "US$",
  GBP = "UK£",
  EUR = "EUR",
}

/**
 * Geographic regions for activity targeting and reporting.
 *
 * - US: United States
 * - EMEA: Europe, Middle East, and Africa
 * - ROW: Rest of World
 */
export enum Region {
  US = "US",
  EMEA = "EMEA",
  ROW = "ROW",
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * User account information.
 *
 * Represents an authenticated user in the system.
 * Note: This does not include the password hash for security.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string; // Optional profile picture URL
}

/**
 * Calendar (Workspace) container.
 *
 * Calendars are the top-level organizational unit that contains
 * swimlanes, activities, and campaigns.
 */
export interface Calendar {
  id: string;
  name: string;
  ownerId: string; // UUID of the user who owns this calendar
  createdAt: string; // ISO timestamp
  isTemplate: boolean; // Reserved for template feature (future)
}

/**
 * Calendar permission for sharing access with other users.
 *
 * Defines what level of access a user has to a calendar they don't own.
 */
export interface CalendarPermission {
  calendarId: string;
  userId: string;
  accessType: 'view' | 'edit' | 'copy'; // 'copy' is reserved for future use
}

/**
 * Campaign for grouping related activities.
 *
 * Campaigns help organize activities within a calendar by theme,
 * initiative, or project. Example: "Q1 Product Launch", "Summer Sale"
 */
export interface Campaign {
  id: string;
  name: string;
  calendarId: string; // Parent calendar ID
}

/**
 * Swimlane for horizontal organization of activities.
 *
 * Swimlanes represent categories, teams, or channels within a calendar.
 * Activities are displayed in rows corresponding to their swimlane.
 * Example: "Content Marketing", "Events", "Digital Campaigns"
 */
export interface Swimlane {
  id: string;
  name: string;
  budget?: number; // Optional budget allocation
  calendarId: string; // Parent calendar ID
}

/**
 * Activity type for categorization.
 *
 * Standard types include: Webinar, Report, Event, Tool Launch, ABM
 */
export interface ActivityType {
  id: string;
  name: string;
}

/**
 * Vendor/partner information.
 *
 * External vendors associated with activities.
 * Standard vendors include: Gartner, Forrester, LinkedIn
 */
export interface Vendor {
  id: string;
  name: string;
}

/**
 * File or link attachment metadata.
 *
 * Attachments can be linked to activities for reference materials,
 * documents, or external resources.
 */
export interface Attachment {
  id: string;
  name: string; // Display name for the attachment
  type: 'pdf' | 'doc' | 'sheet' | 'image' | 'link'; // Determines icon display
  url: string; // URL to the resource (currently supports mock/external URLs)
}

/**
 * Activity - The main content entity of the calendar.
 *
 * Activities represent events, tasks, initiatives, or any time-bounded
 * item displayed on the calendar timeline. They span a date range
 * and are positioned within swimlanes.
 */
export interface Activity {
  id: string;
  title: string; // Display title
  typeId: string; // Reference to ActivityType (can be empty string)
  campaignId: string; // Reference to Campaign (can be empty string)
  swimlaneId: string; // Required - determines row placement
  calendarId: string; // Parent calendar ID
  startDate: string; // ISO date format: YYYY-MM-DD
  endDate: string; // ISO date format: YYYY-MM-DD
  status: CampaignStatus; // Pipeline stage
  description: string; // Detailed description/notes
  tags: string; // Comma-separated tags for filtering
  cost: number; // Monetary value
  currency: Currency; // Currency for the cost
  vendorId: string; // Reference to Vendor (can be empty string)
  expectedSAOs: number; // Expected Sales Activity Outcomes
  actualSAOs: number; // Actual Sales Activity Outcomes
  region: Region; // Geographic region
  dependencies?: string[]; // Array of activity IDs this depends on
  attachments?: Attachment[]; // Associated files/links
  color?: string; // Optional custom color override (hex or named)
}

// ============================================================================
// EXTENDED TYPES (for API responses with joined data)
// ============================================================================

/**
 * Extended permission type that includes user info.
 * Used in CalendarSettingsModal and permission APIs.
 */
export interface ExtendedCalendarPermission extends CalendarPermission {
  userEmail?: string;
  userName?: string;
}

/**
 * Activity with resolved type and vendor names.
 * Used in views that need to display type/vendor names without lookup.
 */
export interface ActivityWithDetails extends Activity {
  typeName?: string;
  vendorName?: string;
  campaignName?: string;
}

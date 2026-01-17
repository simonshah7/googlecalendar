/**
 * Database Schema for CampaignOS
 *
 * This file defines the PostgreSQL database schema using Drizzle ORM.
 * The schema supports a multi-tenant calendar application with:
 * - User authentication and role-based access control
 * - Multiple calendars (workspaces) per user
 * - Activities organized by swimlanes and campaigns
 * - Sharing calendars with other users via permissions
 *
 * Database: PostgreSQL (via Neon Serverless)
 * ORM: Drizzle ORM
 */

import { pgTable, uuid, text, timestamp, boolean, numeric, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * User roles for authorization.
 * - User: Standard user with access only to their own calendars
 * - Manager: Can access and manage all calendars
 * - Admin: Full system access including user management
 */
export const userRoleEnum = pgEnum('user_role', ['User', 'Manager', 'Admin']);

/**
 * Activity status representing the sales/planning pipeline.
 * - Considering: Initial planning stage
 * - Negotiating: Active discussions/negotiations
 * - Committed: Confirmed and scheduled
 */
export const campaignStatusEnum = pgEnum('campaign_status', ['Considering', 'Negotiating', 'Committed']);

/**
 * Supported currencies for activity cost tracking.
 */
export const currencyEnum = pgEnum('currency', ['US$', 'UK£', 'EUR']);

/**
 * Geographic regions for activity targeting.
 * - US: United States
 * - EMEA: Europe, Middle East, and Africa
 * - ROW: Rest of World
 */
export const regionEnum = pgEnum('region', ['US', 'EMEA', 'ROW']);

/**
 * Permission levels for shared calendar access.
 * - view: Read-only access to calendar and activities
 * - edit: Can create, modify, and delete activities
 * - copy: Can duplicate the calendar as a template (not yet implemented)
 */
export const accessTypeEnum = pgEnum('access_type', ['view', 'edit', 'copy']);

/**
 * Recurrence frequency for recurring activities.
 * - none: One-time activity (default)
 * - daily: Repeats every day
 * - weekly: Repeats every week
 * - biweekly: Repeats every two weeks
 * - monthly: Repeats every month
 * - quarterly: Repeats every three months
 * - yearly: Repeats every year
 */
export const recurrenceFrequencyEnum = pgEnum('recurrence_frequency', [
  'none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
]);

/**
 * Action types for activity history audit log.
 */
export const historyActionEnum = pgEnum('history_action', [
  'created', 'updated', 'deleted', 'status_changed', 'moved', 'duplicated'
]);

/**
 * Notification types for in-app notifications.
 */
export const notificationTypeEnum = pgEnum('notification_type', [
  'calendar_invite',
  'campaign_invite',
  'comment_added',
  'activity_created',
  'activity_updated',
  'permission_changed'
]);

/**
 * Related entity types for notifications.
 */
export const notificationRelatedTypeEnum = pgEnum('notification_related_type', [
  'calendar', 'campaign', 'activity', 'comment'
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Users table - Stores user account information.
 *
 * Each user has a unique email and can own multiple calendars.
 * Passwords are stored as bcrypt hashes.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('User').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Calendars table - Represents workspaces/calendars.
 *
 * Each calendar belongs to a single owner but can be shared with other users.
 * Deleting a calendar cascades to delete all related data (activities, swimlanes, etc.).
 */
export const calendars = pgTable('calendars', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  isTemplate: boolean('is_template').default(false).notNull(), // Reserved for template feature
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Calendar Permissions table - Manages shared access to calendars.
 *
 * Allows calendar owners to grant other users view or edit access.
 * Each record represents a single user's permission for a single calendar.
 *
 * Note: Consider adding a unique constraint on (calendar_id, user_id) to prevent duplicates.
 */
export const calendarPermissions = pgTable('calendar_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accessType: accessTypeEnum('access_type').default('view').notNull(),
});

/**
 * Campaigns table - Groups related activities together.
 *
 * Campaigns are organizational units within a calendar that help
 * categorize and filter activities. For example: "Q1 Product Launch",
 * "Summer Sale", etc.
 */
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Swimlanes table - Horizontal organizing lanes for activities.
 *
 * Swimlanes represent categories or teams (e.g., "Content Marketing", "Events").
 * Each swimlane can have an optional budget allocation.
 * Activities are displayed in rows corresponding to their swimlane.
 *
 * Note: sortOrder is stored as numeric but should ideally be integer for proper sorting.
 */
export const swimlanes = pgTable('swimlanes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  budget: numeric('budget', { precision: 12, scale: 2 }), // Optional budget in user's currency
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: numeric('sort_order').default('0'), // Display order (lower = higher)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Activity Types table - Categorizes activities by type.
 *
 * Standard types include: Webinar, Report, Event, Tool Launch, ABM
 * These are global (not per-calendar) and shared across the application.
 */
export const activityTypes = pgTable('activity_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Vendors table - External partners/vendors for activities.
 *
 * Standard vendors include: Gartner, Forrester, LinkedIn
 * These are global (not per-calendar) and shared across the application.
 */
export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Activities table - The main content of the calendar.
 *
 * Activities represent individual events, tasks, or initiatives on the calendar.
 * They span a date range and are positioned within swimlanes.
 *
 * Key fields:
 * - startDate/endDate: ISO format date strings (YYYY-MM-DD)
 * - status: Pipeline stage (Considering -> Negotiating -> Committed)
 * - cost/currency: Financial tracking
 * - expectedSAOs/actualSAOs: Sales Activity Outcomes metrics
 * - dependencies: Array of activity IDs this activity depends on
 * - attachments: Array of file/link metadata objects
 */
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  typeId: uuid('type_id').references(() => activityTypes.id), // Optional activity type
  campaignId: uuid('campaign_id').references(() => campaigns.id), // Optional campaign grouping
  swimlaneId: uuid('swimlane_id').references(() => swimlanes.id, { onDelete: 'cascade' }).notNull(),
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  startDate: text('start_date').notNull(), // ISO date: YYYY-MM-DD
  endDate: text('end_date').notNull(), // ISO date: YYYY-MM-DD
  status: campaignStatusEnum('status').default('Considering').notNull(),
  description: text('description').default(''),
  tags: text('tags').default(''), // Comma-separated tags for filtering
  cost: numeric('cost', { precision: 12, scale: 2 }).default('0'),
  currency: currencyEnum('currency').default('US$'),
  vendorId: uuid('vendor_id').references(() => vendors.id), // Optional vendor
  expectedSAOs: numeric('expected_saos').default('0'), // Expected Sales Activity Outcomes
  actualSAOs: numeric('actual_saos').default('0'), // Actual Sales Activity Outcomes
  region: regionEnum('region').default('US'),
  dependencies: jsonb('dependencies').$type<string[]>().default([]), // Activity IDs
  attachments: jsonb('attachments').$type<{ id: string; name: string; type: string; url: string }[]>().default([]),
  color: text('color'), // Optional custom color override
  // Recurrence fields
  recurrenceFrequency: recurrenceFrequencyEnum('recurrence_frequency').default('none').notNull(),
  recurrenceEndDate: text('recurrence_end_date'), // Optional end date for recurrence
  recurrenceCount: numeric('recurrence_count'), // Optional: number of occurrences
  parentActivityId: uuid('parent_activity_id'), // For recurring instances, reference to the parent
  isRecurrenceParent: boolean('is_recurrence_parent').default(false).notNull(), // True if this is the parent recurring activity
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Activity Comments table - Discussion threads on activities.
 *
 * Allows users to add comments/notes to activities for collaboration.
 * Comments are ordered by creation time.
 */
export const activityComments = pgTable('activity_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Activity History table - Audit log for activity changes.
 *
 * Tracks all changes to activities for accountability and undo support.
 * Stores the previous state as JSON for potential rollback.
 */
export const activityHistory = pgTable('activity_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(), // Who made the change
  action: historyActionEnum('action').notNull(),
  changes: jsonb('changes').$type<Record<string, { old: unknown; new: unknown }>>(), // Field changes
  previousState: jsonb('previous_state').$type<Record<string, unknown>>(), // Full previous state for undo
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Campaign Permissions table - Manages shared access to campaigns.
 *
 * Allows campaign-level sharing separate from calendar permissions.
 * Users can have access to specific campaigns even without full calendar access.
 * This is an "additive" permission model - campaign permissions extend calendar permissions.
 */
export const campaignPermissions = pgTable('campaign_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accessType: accessTypeEnum('access_type').default('view').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Notifications table - In-app notifications for collaboration.
 *
 * Tracks notifications for various events like:
 * - Being invited to a calendar or campaign
 * - Comments on activities
 * - Activity updates in shared content
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedType: notificationRelatedTypeEnum('related_type'),
  relatedId: uuid('related_id'), // ID of the related entity (calendar, campaign, activity, comment)
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

/**
 * User relations - A user can own many calendars and have many permissions.
 */
export const usersRelations = relations(users, ({ many }) => ({
  calendars: many(calendars),
  permissions: many(calendarPermissions),
  campaignPermissions: many(campaignPermissions),
  notifications: many(notifications),
}));

/**
 * Calendar relations - A calendar has one owner and many child entities.
 */
export const calendarsRelations = relations(calendars, ({ one, many }) => ({
  owner: one(users, { fields: [calendars.ownerId], references: [users.id] }),
  campaigns: many(campaigns),
  swimlanes: many(swimlanes),
  activities: many(activities),
  permissions: many(calendarPermissions),
}));

/**
 * Permission relations - Links a calendar and user together.
 */
export const calendarPermissionsRelations = relations(calendarPermissions, ({ one }) => ({
  calendar: one(calendars, { fields: [calendarPermissions.calendarId], references: [calendars.id] }),
  user: one(users, { fields: [calendarPermissions.userId], references: [users.id] }),
}));

/**
 * Campaign relations - Belongs to a calendar and contains many activities.
 */
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  calendar: one(calendars, { fields: [campaigns.calendarId], references: [calendars.id] }),
  activities: many(activities),
  permissions: many(campaignPermissions),
}));

/**
 * Swimlane relations - Belongs to a calendar and contains many activities.
 */
export const swimlanesRelations = relations(swimlanes, ({ one, many }) => ({
  calendar: one(calendars, { fields: [swimlanes.calendarId], references: [calendars.id] }),
  activities: many(activities),
}));

/**
 * Activity relations - The most connected entity with multiple foreign keys.
 */
export const activitiesRelations = relations(activities, ({ one, many }) => ({
  calendar: one(calendars, { fields: [activities.calendarId], references: [calendars.id] }),
  campaign: one(campaigns, { fields: [activities.campaignId], references: [campaigns.id] }),
  swimlane: one(swimlanes, { fields: [activities.swimlaneId], references: [swimlanes.id] }),
  activityType: one(activityTypes, { fields: [activities.typeId], references: [activityTypes.id] }),
  vendor: one(vendors, { fields: [activities.vendorId], references: [vendors.id] }),
  comments: many(activityComments),
  history: many(activityHistory),
}));

/**
 * Activity Comments relations - Belongs to an activity and a user.
 */
export const activityCommentsRelations = relations(activityComments, ({ one }) => ({
  activity: one(activities, { fields: [activityComments.activityId], references: [activities.id] }),
  user: one(users, { fields: [activityComments.userId], references: [users.id] }),
}));

/**
 * Activity History relations - Belongs to an activity and a user.
 */
export const activityHistoryRelations = relations(activityHistory, ({ one }) => ({
  activity: one(activities, { fields: [activityHistory.activityId], references: [activities.id] }),
  user: one(users, { fields: [activityHistory.userId], references: [users.id] }),
}));

/**
 * Campaign Permissions relations - Links a campaign and user together.
 */
export const campaignPermissionsRelations = relations(campaignPermissions, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignPermissions.campaignId], references: [campaigns.id] }),
  user: one(users, { fields: [campaignPermissions.userId], references: [users.id] }),
  inviter: one(users, { fields: [campaignPermissions.invitedBy], references: [users.id] }),
}));

/**
 * Notifications relations - Belongs to a user.
 */
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * TypeScript types inferred from the schema.
 * Use these for type-safe database operations.
 */
export type DbUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type DbCalendar = typeof calendars.$inferSelect;
export type NewCalendar = typeof calendars.$inferInsert;
export type DbCampaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type DbSwimlane = typeof swimlanes.$inferSelect;
export type NewSwimlane = typeof swimlanes.$inferInsert;
export type DbActivity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type DbActivityType = typeof activityTypes.$inferSelect;
export type DbVendor = typeof vendors.$inferSelect;
export type DbActivityComment = typeof activityComments.$inferSelect;
export type NewActivityComment = typeof activityComments.$inferInsert;
export type DbActivityHistory = typeof activityHistory.$inferSelect;
export type NewActivityHistory = typeof activityHistory.$inferInsert;
export type DbCampaignPermission = typeof campaignPermissions.$inferSelect;
export type NewCampaignPermission = typeof campaignPermissions.$inferInsert;
export type DbNotification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

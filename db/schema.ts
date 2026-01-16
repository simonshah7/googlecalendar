/**
 * Database Schema for CampaignOS
 *
 * This file should define Drizzle ORM table schemas when database integration is complete.
 *
 * To implement Neon + Drizzle:
 * 1. Install dependencies: npm install drizzle-orm @neondatabase/serverless
 * 2. Install dev dependency: npm install -D drizzle-kit
 * 3. Define tables below matching the types in ../types.ts
 * 4. Create drizzle.config.ts in project root
 * 5. Run migrations: npx drizzle-kit generate && npx drizzle-kit migrate
 *
 * Example schema structure (uncomment and modify when ready):
 *
 * import { pgTable, text, timestamp, integer, real, boolean } from 'drizzle-orm/pg-core';
 *
 * export const users = pgTable('users', {
 *   id: text('id').primaryKey(),
 *   email: text('email').notNull().unique(),
 *   name: text('name').notNull(),
 *   role: text('role').notNull().default('User'),
 *   avatarUrl: text('avatar_url'),
 *   createdAt: timestamp('created_at').defaultNow(),
 * });
 *
 * export const calendars = pgTable('calendars', {
 *   id: text('id').primaryKey(),
 *   name: text('name').notNull(),
 *   ownerId: text('owner_id').notNull().references(() => users.id),
 *   createdAt: timestamp('created_at').defaultNow(),
 *   isTemplate: boolean('is_template').default(false),
 * });
 *
 * export const campaigns = pgTable('campaigns', {
 *   id: text('id').primaryKey(),
 *   name: text('name').notNull(),
 *   calendarId: text('calendar_id').notNull().references(() => calendars.id),
 * });
 *
 * export const swimlanes = pgTable('swimlanes', {
 *   id: text('id').primaryKey(),
 *   name: text('name').notNull(),
 *   budget: real('budget'),
 *   calendarId: text('calendar_id').notNull().references(() => calendars.id),
 *   sortOrder: integer('sort_order').default(0),
 * });
 *
 * export const activities = pgTable('activities', {
 *   id: text('id').primaryKey(),
 *   title: text('title').notNull(),
 *   typeId: text('type_id').notNull(),
 *   campaignId: text('campaign_id').notNull().references(() => campaigns.id),
 *   swimlaneId: text('swimlane_id').notNull().references(() => swimlanes.id),
 *   calendarId: text('calendar_id').notNull().references(() => calendars.id),
 *   startDate: text('start_date').notNull(),
 *   endDate: text('end_date').notNull(),
 *   status: text('status').notNull().default('Considering'),
 *   description: text('description'),
 *   tags: text('tags'),
 *   cost: real('cost').default(0),
 *   currency: text('currency').default('US$'),
 *   vendorId: text('vendor_id'),
 *   expectedSAOs: real('expected_saos').default(0),
 *   actualSAOs: real('actual_saos').default(0),
 *   region: text('region').default('US'),
 *   color: text('color'),
 *   createdAt: timestamp('created_at').defaultNow(),
 *   updatedAt: timestamp('updated_at').defaultNow(),
 * });
 *
 * export const activityTypes = pgTable('activity_types', {
 *   id: text('id').primaryKey(),
 *   name: text('name').notNull(),
 * });
 *
 * export const vendors = pgTable('vendors', {
 *   id: text('id').primaryKey(),
 *   name: text('name').notNull(),
 * });
 */

// Placeholder export to prevent empty module errors
export {};

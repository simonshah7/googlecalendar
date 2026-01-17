import { pgTable, uuid, text, timestamp, boolean, numeric, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['User', 'Manager', 'Admin']);
export const campaignStatusEnum = pgEnum('campaign_status', ['Considering', 'Negotiating', 'Committed']);
export const currencyEnum = pgEnum('currency', ['US$', 'UK£', 'EUR']);
export const regionEnum = pgEnum('region', ['US', 'EMEA', 'ROW']);
export const accessTypeEnum = pgEnum('access_type', ['view', 'edit', 'copy']);

// Users table
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

// Calendars table
export const calendars = pgTable('calendars', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  isTemplate: boolean('is_template').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Calendar permissions table
export const calendarPermissions = pgTable('calendar_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accessType: accessTypeEnum('access_type').default('view').notNull(),
});

// Campaigns table
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Swimlanes table
export const swimlanes = pgTable('swimlanes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  budget: numeric('budget', { precision: 12, scale: 2 }),
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: numeric('sort_order').default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Activity types table
export const activityTypes = pgTable('activity_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Vendors table
export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Activities table
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  typeId: uuid('type_id').references(() => activityTypes.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  swimlaneId: uuid('swimlane_id').references(() => swimlanes.id, { onDelete: 'cascade' }).notNull(),
  calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'cascade' }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: campaignStatusEnum('status').default('Considering').notNull(),
  description: text('description').default(''),
  tags: text('tags').default(''),
  cost: numeric('cost', { precision: 12, scale: 2 }).default('0'),
  currency: currencyEnum('currency').default('US$'),
  vendorId: uuid('vendor_id').references(() => vendors.id),
  expectedSAOs: numeric('expected_saos').default('0'),
  actualSAOs: numeric('actual_saos').default('0'),
  region: regionEnum('region').default('US'),
  dependencies: jsonb('dependencies').$type<string[]>().default([]),
  attachments: jsonb('attachments').$type<{ id: string; name: string; type: string; url: string }[]>().default([]),
  color: text('color'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  calendars: many(calendars),
  permissions: many(calendarPermissions),
}));

export const calendarsRelations = relations(calendars, ({ one, many }) => ({
  owner: one(users, { fields: [calendars.ownerId], references: [users.id] }),
  campaigns: many(campaigns),
  swimlanes: many(swimlanes),
  activities: many(activities),
  permissions: many(calendarPermissions),
}));

export const calendarPermissionsRelations = relations(calendarPermissions, ({ one }) => ({
  calendar: one(calendars, { fields: [calendarPermissions.calendarId], references: [calendars.id] }),
  user: one(users, { fields: [calendarPermissions.userId], references: [users.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  calendar: one(calendars, { fields: [campaigns.calendarId], references: [calendars.id] }),
  activities: many(activities),
}));

export const swimlanesRelations = relations(swimlanes, ({ one, many }) => ({
  calendar: one(calendars, { fields: [swimlanes.calendarId], references: [calendars.id] }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  calendar: one(calendars, { fields: [activities.calendarId], references: [calendars.id] }),
  campaign: one(campaigns, { fields: [activities.campaignId], references: [campaigns.id] }),
  swimlane: one(swimlanes, { fields: [activities.swimlaneId], references: [swimlanes.id] }),
  activityType: one(activityTypes, { fields: [activities.typeId], references: [activityTypes.id] }),
  vendor: one(vendors, { fields: [activities.vendorId], references: [vendors.id] }),
}));

// Type exports for use in the app
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

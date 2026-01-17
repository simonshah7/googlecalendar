CREATE TYPE "public"."history_action" AS ENUM('created', 'updated', 'deleted', 'status_changed', 'moved', 'duplicated');--> statement-breakpoint
CREATE TYPE "public"."notification_related_type" AS ENUM('calendar', 'campaign', 'activity', 'comment');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('calendar_invite', 'campaign_invite', 'comment_added', 'activity_created', 'activity_updated', 'permission_changed');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TABLE "activity_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "history_action" NOT NULL,
	"changes" jsonb,
	"previous_state" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"access_type" "access_type" DEFAULT 'view' NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_type" "notification_related_type",
	"related_id" uuid,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "recurrence_frequency" "recurrence_frequency" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "recurrence_end_date" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "recurrence_count" numeric;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "parent_activity_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "is_recurrence_parent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_permissions" ADD CONSTRAINT "campaign_permissions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_permissions" ADD CONSTRAINT "campaign_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_permissions" ADD CONSTRAINT "campaign_permissions_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
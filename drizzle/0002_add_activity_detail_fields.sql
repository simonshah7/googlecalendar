ALTER TABLE "activities" ADD COLUMN "slack_channel" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "outline" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "inline_comments" jsonb DEFAULT '[]'::jsonb;

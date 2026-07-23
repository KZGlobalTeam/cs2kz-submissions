ALTER TABLE "submissions" ADD COLUMN "is_port" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "port_authorization_image_url" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "port_authorization_image_mime" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "port_authorization_image_width" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "port_authorization_image_height" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "port_authorization_image_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "port_notes" text;
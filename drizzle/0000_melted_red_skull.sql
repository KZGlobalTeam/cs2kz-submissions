CREATE TYPE "public"."user_role" AS ENUM('approver', 'lead_approver');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."course_filter_state" AS ENUM('unranked', 'pending', 'ranked');--> statement-breakpoint
CREATE TYPE "public"."course_filter_tier" AS ENUM('very-easy', 'easy', 'medium', 'advanced', 'hard', 'very-hard', 'extreme', 'death', 'unfeasible', 'impossible');--> statement-breakpoint
CREATE TYPE "public"."course_mode" AS ENUM('classic', 'vanilla');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_id64" text NOT NULL,
	"steam_id" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"profile_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_course_mappers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"steam_id64" text NOT NULL,
	"steam_id" text NOT NULL,
	"display_name_snapshot" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"name" text NOT NULL,
	"image_url" text NOT NULL,
	"image_mime" text NOT NULL,
	"image_width" integer NOT NULL,
	"image_height" integer NOT NULL,
	"image_size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_mappers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"steam_id64" text NOT NULL,
	"steam_id" text NOT NULL,
	"display_name_snapshot" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"workshop_url" text NOT NULL,
	"workshop_id" integer NOT NULL,
	"map_name" text NOT NULL,
	"notes" text,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"decision_by_user_id" uuid,
	"decision_notes" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_final_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"mode" "course_mode" NOT NULL,
	"nub_tier" "course_filter_tier" NOT NULL,
	"pro_tier" "course_filter_tier" NOT NULL,
	"state" "course_filter_state" NOT NULL,
	"is_ranked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"resolved_by_user_id" uuid NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_vote_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vote_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"mode" "course_mode" NOT NULL,
	"nub_tier" "course_filter_tier" NOT NULL,
	"pro_tier" "course_filter_tier" NOT NULL,
	"is_ranked" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "submission_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"approver_user_id" uuid NOT NULL,
	"approval_decision" "approval_decision" NOT NULL,
	"rejection_reason" text,
	"rejection_explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_by_user_id" uuid NOT NULL,
	"exported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_course_mappers" ADD CONSTRAINT "submission_course_mappers_course_id_submission_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."submission_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_courses" ADD CONSTRAINT "submission_courses_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_mappers" ADD CONSTRAINT "submission_mappers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_decision_by_user_id_users_id_fk" FOREIGN KEY ("decision_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_final_filters" ADD CONSTRAINT "submission_final_filters_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_final_filters" ADD CONSTRAINT "submission_final_filters_course_id_submission_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."submission_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_final_filters" ADD CONSTRAINT "submission_final_filters_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_vote_filters" ADD CONSTRAINT "submission_vote_filters_vote_id_submission_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."submission_votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_vote_filters" ADD CONSTRAINT "submission_vote_filters_course_id_submission_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."submission_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_votes" ADD CONSTRAINT "submission_votes_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_votes" ADD CONSTRAINT "submission_votes_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_submissions" ADD CONSTRAINT "release_submissions_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_submissions" ADD CONSTRAINT "release_submissions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_steam_id64_idx" ON "users" USING btree ("steam_id64");--> statement-breakpoint
CREATE UNIQUE INDEX "users_steam_id_idx" ON "users" USING btree ("steam_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_unique_idx" ON "user_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "submission_course_mappers_course_idx" ON "submission_course_mappers" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_course_mappers_unique_idx" ON "submission_course_mappers" USING btree ("course_id","steam_id64");--> statement-breakpoint
CREATE INDEX "submission_courses_submission_idx" ON "submission_courses" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_courses_submission_name_idx" ON "submission_courses" USING btree ("submission_id","name");--> statement-breakpoint
CREATE INDEX "submission_mappers_submission_idx" ON "submission_mappers" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_mappers_unique_idx" ON "submission_mappers" USING btree ("submission_id","steam_id64");--> statement-breakpoint
CREATE INDEX "submissions_created_by_idx" ON "submissions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submissions_workshop_id_idx" ON "submissions" USING btree ("workshop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_final_filters_unique_idx" ON "submission_final_filters" USING btree ("submission_id","course_id","mode");--> statement-breakpoint
CREATE INDEX "submission_final_filters_submission_idx" ON "submission_final_filters" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_vote_filters_unique_idx" ON "submission_vote_filters" USING btree ("vote_id","course_id","mode");--> statement-breakpoint
CREATE INDEX "submission_vote_filters_vote_idx" ON "submission_vote_filters" USING btree ("vote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_votes_unique_idx" ON "submission_votes" USING btree ("submission_id","approver_user_id");--> statement-breakpoint
CREATE INDEX "submission_votes_submission_idx" ON "submission_votes" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "release_submissions_unique_idx" ON "release_submissions" USING btree ("release_id","submission_id");--> statement-breakpoint
CREATE INDEX "release_submissions_release_idx" ON "release_submissions" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "releases_created_by_idx" ON "releases" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_name_idx" ON "releases" USING btree ("name");
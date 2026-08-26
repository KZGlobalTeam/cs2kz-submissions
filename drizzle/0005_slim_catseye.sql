CREATE TABLE "submission_approver_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"approver_user_id" uuid NOT NULL,
	"checklist" jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_approver_checklists" ADD CONSTRAINT "submission_approver_checklists_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_approver_checklists" ADD CONSTRAINT "submission_approver_checklists_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "submission_approver_checklists_unique_idx" ON "submission_approver_checklists" USING btree ("submission_id","approver_user_id");--> statement-breakpoint
CREATE INDEX "submission_approver_checklists_submission_idx" ON "submission_approver_checklists" USING btree ("submission_id");
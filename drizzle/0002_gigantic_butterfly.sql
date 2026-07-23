DROP INDEX "users_steam_id_idx";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "steam_id";--> statement-breakpoint
ALTER TABLE "submission_course_mappers" DROP COLUMN "steam_id";--> statement-breakpoint
ALTER TABLE "submission_mappers" DROP COLUMN "steam_id";
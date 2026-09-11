-- Course modes become one shared five-value enum (per-game support, ticket
-- 04). The add-only form is deliberate: no reordering, no drops — the three
-- CS:GO modes (kztimer, simplekz, vanilla) simply join classic and vanilla.
-- Existing CS2 rows keep their two-mode values untouched; which modes a game
-- actually allows is enforced in code (the per-game vocabulary), never by
-- the enum shape. No data migration is needed.
ALTER TYPE "public"."course_mode" ADD VALUE 'kzt';--> statement-breakpoint
ALTER TYPE "public"."course_mode" ADD VALUE 'skz';--> statement-breakpoint
ALTER TYPE "public"."course_mode" ADD VALUE 'vnl';
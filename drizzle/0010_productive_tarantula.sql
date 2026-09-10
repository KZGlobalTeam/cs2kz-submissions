-- Per-game support: every submission and release row gains a game
-- discriminator (`cs2` | `csgo`), backfilled to `cs2` with no data loss.
-- The `DEFAULT 'cs2' NOT NULL` on the ADD COLUMN backfills every existing
-- row in the same statement; a fresh create stamps the game explicitly from
-- its route context, so the default only ever applies to legacy rows.
-- The port-authorization columns are untouched (CS:GO rows keep them
-- always-null; no destructive migration).
CREATE TYPE "public"."game" AS ENUM('cs2', 'csgo');--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "game" "game" DEFAULT 'cs2' NOT NULL;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "game" "game" DEFAULT 'cs2' NOT NULL;
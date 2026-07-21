# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`cs2kz-submissions` is a Nuxt 4 full-stack app for an **internal CS2KZ map review workflow**. It does NOT write to the official CS2KZ API. Instead it manages submissions → approver votes → lead-approver final decision → release grouping, and exports each release as a `NewMap[]` JSON payload validated against `shared/schemas/cs2kz.ts` for a downstream dashboard/import step.

## Commands

Package manager is **`pnpm`** — use it for everything.

```bash
pnpm install          # install (runs `nuxt prepare` via postinstall)
pnpm dev              # dev server at http://localhost:3000
pnpm build            # production build (also runs typecheck — see below)
pnpm preview          # preview the production build
pnpm lint              # eslint .
pnpm typecheck        # nuxt typecheck (vue-tsc)
pnpm test             # vitest run (all tests)
pnpm test:watch       # vitest in watch mode
pnpm test <pattern>   # run a single test file or by name, e.g. `pnpm test workshop-url`
pnpm db:generate      # generate Drizzle migrations from db/schema
pnpm db:migrate       # apply generated migrations
pnpm db:push          # push schema directly (dev shortcut)
```

Before committing, run at least: `pnpm lint && pnpm typecheck && pnpm test`.

`nuxt.config.ts` sets `typescript.typeCheck: true`, so `pnpm build` fails on type errors — `typecheck` is not optional.

## Environment

Copy `.env.example` to `.env` and fill in: `DATABASE_URL`, `NUXT_SESSION_SECRET`, `NUXT_STEAM_REALM`, `NUXT_STEAM_RETURN_URL`, `NUXT_STEAM_API_KEY`, `NUXT_PUBLIC_SITE_URL`, `NUXT_SUPABASE_URL`, `NUXT_SUPABASE_SERVICE_ROLE_KEY`, `NUXT_SUPABASE_STORAGE_BUCKET`. Runtime deps: a reachable PostgreSQL (Neon), Steam OpenID config, and a Supabase project + storage bucket. Anything beyond static code inspection needs a populated `.env`.

## Architecture

### Server-side layering (CQRS-ish)

The `server/` directory is deliberately split by responsibility — this is the core organizing principle:

- `server/api/**` — HTTP handlers. Validate the request body with `zod`, call `requireAuth`/`requireApprover`/`requireLeadApprover`, then delegate to a service or query. Handlers stay thin.
- `server/services/**` — **write-side** business logic and transactions (create submission, save vote, finalize, attach/detach release submission, build export).
- `server/queries/**` — **read-side** aggregation (list submissions, list releases, submission details with votes/final filters joined).
- `server/utils/**` — infra helpers: `auth.ts`, `permissions.ts`, `session.ts`, `steam-openid.ts`, `db.ts`, `storage.ts`, `image-validation.ts`, `export-release.ts`.

Keep this split: services do writes/transactions; queries do reads; API handlers do validation + dispatch.

### Database access

`db/client.ts` builds a Drizzle + Neon singleton (`useDb()`). **Server code does not call `useDb()` directly** — it goes through `server/utils/db.ts`, which re-exports it as `db()`. So in server code: `import { db } from '~/server/utils/db'` and call `db()`. Schemas live in `db/schema/` and are barrel-exported from `db/schema/index.ts`.

### Shared layer

`shared/` is importable by **both** server and client/test code — keep it free of server-only or Nuxt-only imports:
- `shared/schemas/cs2kz.ts` — the **single source of truth** for the export contract (`NewMapSchema` and the enums `mode`, map state, course-filter tier/state).
- `shared/types/` — DTO and role types.
- `shared/utils/` — pure helpers (Steam ID conversion, workshop URL parsing).

### Permission model

Two roles (`db/schema/roles.ts`): `approver`, `lead_approver`. Enforcement lives in `server/utils/auth.ts` (`requireUser`, `requireRole`) and the thin wrapper `server/utils/permissions.ts` (`requireAuth`, `requireApprover`, `requireLeadApprover`).

**Critical rule:** `requireRole('approver')` returns early-success for a `lead_approver` — `lead_approver` automatically satisfies `approver` checks. Preserve this when touching auth.

`middleware/*.ts` (`auth.ts`, `approver.ts`, `lead-approver.ts`) are **client route guards for UX only**. The server-side checks in `auth.ts`/`permissions.ts` are the real authority. Changes to permissions must update both layers.

### Export contract pipeline

The release export is the system's output and its highest-risk area:

1. `server/services/releases/build-export.ts` — loads release membership + submissions/courses/mappers/final filters, assembles the `NewMap`-shaped input, and **throws** if any release member is not `approved` or is missing finalized `classic`+`vanilla` filters for a course.
2. `server/utils/export-release.ts` — `toReleaseExport()` runs `NewMapSchema.safeParse` per map and throws a 500 on validation failure.
3. `shared/schemas/cs2kz.ts` — the zod schemas that define the payload shape.

Any change to the export must stay aligned across all three plus the relevant tests.

### Submission lifecycle & review distinction

Submission statuses (`db/schema/submissions.ts`): `pending` → `approved` | `rejected`. There is no main/bonus distinction — everything is a course, and every course is reviewed in two modes (`classic`, `vanilla`); `CourseFilters` always contains both.

Keep these two concepts distinct:
- `submission_votes` + `submission_vote_filters` = **approver input** (review opinions).
- `submission_final_filters` = **lead-approved release/export truth**.

Only `pending` submissions accept votes; only `approved` submissions may enter a release.

### Image & workshop constraints

- Course images must be JPEG at exactly `1920x1080` (enforced server-side in `image-validation.ts` and in the submission POST `zod` schema).
- Workshop URLs must parse to a `workshop_id`. Workshop IDs can exceed 32-bit int range, so the column is `bigint({ mode: 'number' })` and parsing guards with `Number.isSafeInteger`; the export schema uses `z.number().int().safe().nonnegative()`. Do not downgrade these to plain `integer`/`Number`.
- Supabase storage must use a **service_role/secret** key — `server/utils/storage.ts` rejects keys starting with `sb_publishable_`.

## Conventions

- Vue 3, Composition API, `<script setup lang="ts">`, Tailwind. ESLint config disables `vue/multi-word-component-names`.
- Nuxt 4 (`future.compatibilityVersion: 4`, `srcDir: '.'`, app dir = `app/`). Aliases `~` and `@` both point at repo root.
- Pages orchestrate data fetching; components stay domain-focused (`components/{submission,review,release,admin}/`) and presentation-driven.
- Tests under `tests/unit/` (utilities, validation, export contract) and `tests/integration/` (lead-decision, submission-flow). Vitest runs in node env, include glob `tests/**/*.spec.ts`.

## High-risk change checklist

- **DB schema change** (`db/schema/*`) → update dependent services, queries, shared types, and contract tests together.
- **Export change** → update `server/services/releases/build-export.ts`, `server/utils/export-release.ts`, `shared/schemas/cs2kz.ts`, and export tests in lockstep. Silent breaks here corrupt downstream imports.
- **Permission change** → update `server/utils/auth.ts`/`permissions.ts` AND `middleware/*.ts`; verify affected pages and API endpoints.
- **Review/finalization change** → preserve the approver-input vs. lead-final-filters distinction.

When docs and code disagree, trust the code and note the discrepancy.

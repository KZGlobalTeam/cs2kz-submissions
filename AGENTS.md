# AGENTS.md

## Purpose

This repository is a CS2KZ internal review application used to:

- accept map submissions from logged-in users
- collect approver votes for each submission
- let a lead approver make the final decision
- group approved submissions into releases
- export release payloads as `NewMap[]` JSON aligned with `openapi.json`

The site does not directly create maps in the official CS2KZ API. It exports validated JSON for a downstream dashboard/import step.

## Read First

At the start of a new session, read these files in order:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `HANDOFF.md`
4. `package.json`
5. `.env.example`

When deeper truth is needed, prefer code over docs. The main source-of-truth files are:

- `shared/schemas/cs2kz.ts` for export contract and enum values
- `db/schema/*.ts` for database structure
- `server/utils/auth.ts` and `server/utils/permissions.ts` for permission rules
- `server/services/releases/build-export.ts` for release export behavior
- `server/api/**/*.ts` for request validation and route behavior

## Stack

- Package manager: `pnpm`
- App framework: `Nuxt 4`
- UI: `Vue 3`, Composition API, `<script setup lang="ts">`, `Tailwind CSS`
- Language: `TypeScript` with strict type checking
- Database: `PostgreSQL` via `Neon` + `Drizzle ORM`
- Auth: Steam OpenID login + local session cookie
- File storage: Supabase Storage for course images
- Validation: `zod`
- Tests: `Vitest`

## Domain Summary

- A map submission contains map-level metadata and one or more courses.
- There is no main/bonus distinction. Everything is a course.
- Each course is reviewed in two modes: `classic` and `vanilla`.
- Approvers submit votes and per-course filter opinions.
- Lead approvers write the final per-course filters and decide whether a submission is `approved` or `rejected`.
- Only approved submissions can be attached to a release.
- Release export produces `NewMap[]` and validates the output against `shared/schemas/cs2kz.ts`.

## Roles

- Authenticated user:
  - can upload course images
  - can create submissions
  - can view their own submissions
- `approver`:
  - can view all submissions
  - can submit or update votes on `pending` submissions
- `lead_approver`:
  - inherits `approver` capabilities
  - can finalize submissions
  - can manage approver roles
  - can manage releases and export release payloads

Important rule: `lead_approver` automatically satisfies checks for `approver`.

## Directory Map

- `app/`: Nuxt app shell and global CSS
- `components/`: UI components split by domain (`submission`, `review`, `release`, `admin`)
- `composables/`: reusable client-side state and form logic
- `pages/`: route-level pages
- `middleware/`: route guards for auth and role-based access
- `server/api/`: HTTP endpoints
- `server/services/`: write-side business logic
- `server/queries/`: read-side aggregation queries
- `server/utils/`: auth, session, storage, export, and helper utilities
- `db/schema/`: Drizzle table and enum definitions
- `shared/schemas/`: shared zod schemas for external/export contracts
- `shared/types/`: shared DTO and role types
- `shared/utils/`: shared pure utilities such as Steam ID and workshop parsing
- `tests/unit/`: unit tests for utilities and contract logic
- `tests/integration/`: contract-style integration tests

## Environment

The app expects these environment variables:

- `DATABASE_URL`
- `NUXT_SESSION_SECRET`
- `NUXT_STEAM_REALM`
- `NUXT_STEAM_RETURN_URL`
- `NUXT_STEAM_API_KEY`
- `NUXT_PUBLIC_SITE_URL`
- `NUXT_SUPABASE_URL`
- `NUXT_SUPABASE_SERVICE_ROLE_KEY`
- `NUXT_SUPABASE_STORAGE_BUCKET`

If auth, upload, or DB work is being tested, make sure `.env` is populated first.

## Commands

- install dependencies: `pnpm install`
- run dev server: `pnpm dev`
- run linter: `pnpm lint`
- run tests: `pnpm test`
- run typecheck: `pnpm typecheck`
- generate migrations: `pnpm db:generate`
- apply migrations: `pnpm db:migrate`
- push schema directly: `pnpm db:push`

## Working Rules

- Use `pnpm` for all package and script commands.
- Keep exported payloads aligned with `shared/schemas/cs2kz.ts`.
- When changing submission, vote, final-filter, or release behavior, inspect the matching Drizzle schema and API handler together.
- When changing auth or permissions, verify both client middleware and server-side guards.
- When changing image upload behavior, preserve the server-side JPEG and `1920x1080` validation unless the product rules change.
- Do not assume README is complete; it may lag behind the codebase.

## Common Change Checklist

- Schema change:
  - update `db/schema/*`
  - update dependent services, queries, and shared types
  - update tests that assert contract shape
- Export change:
  - update `server/services/releases/build-export.ts`
  - update `server/utils/export-release.ts` if needed
  - update `shared/schemas/cs2kz.ts`
  - update export-related tests
- Permission change:
  - update `server/utils/auth.ts` or `server/utils/permissions.ts`
  - update `middleware/*.ts`
  - verify affected pages and API endpoints

## Session Bootstrap Prompt

Use this as the default opening instruction for a new AI session:

```text
先阅读仓库根目录的 AGENTS.md、ARCHITECTURE.md、HANDOFF.md、package.json 和 .env.example，再开始分析任务；如果文档和代码不一致，以代码为准，并指出不一致之处。
```

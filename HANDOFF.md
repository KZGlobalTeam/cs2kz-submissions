# HANDOFF.md

## Current Snapshot

- The repository is an active Nuxt 4 application for CS2KZ submission review and release export.
- Dependency management is standardized on `pnpm`.
- The current codebase already includes:
  - Steam login and local session handling
  - role-based access for `approver` and `lead_approver`
  - submission creation
  - course image upload and validation
  - approver voting
  - lead final decision flow
  - release creation, membership management, and JSON export
- The root `README.md` is still the default Nuxt starter and does not explain the real product.

## Environment Checklist

Populate `.env` from `.env.example` before testing anything beyond static code inspection.

Required variables:

- `DATABASE_URL`
- `NUXT_SESSION_SECRET`
- `NUXT_STEAM_REALM`
- `NUXT_STEAM_RETURN_URL`
- `NUXT_STEAM_API_KEY`
- `NUXT_PUBLIC_SITE_URL`
- `NUXT_SUPABASE_URL`
- `NUXT_SUPABASE_SERVICE_ROLE_KEY`
- `NUXT_SUPABASE_STORAGE_BUCKET`

Operational dependencies:

- PostgreSQL database
- Steam OpenID configuration
- Supabase project and storage bucket

## Fast Orientation

Read these files first when resuming work:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `package.json`
4. `.env.example`
5. `shared/schemas/cs2kz.ts`
6. `server/utils/auth.ts`
7. `server/services/releases/build-export.ts`

## What To Verify After Changes

Run these commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

Manually sanity-check these paths when relevant:

- login/session flow
- submission creation
- approver vote save/update flow
- lead final decision flow
- release export output shape

## Important Rules To Preserve

- `lead_approver` must continue to satisfy `approver` permission checks.
- Only `pending` submissions should accept votes.
- Only approved submissions should enter releases.
- Release export must stay aligned with `shared/schemas/cs2kz.ts`.
- Course filters must continue to include both `classic` and `vanilla`.
- Server-side image validation must keep enforcing JPEG and `1920x1080` unless product rules change.

## High-Risk Files

- `shared/schemas/cs2kz.ts`
- `db/schema/submissions.ts`
- `db/schema/votes.ts`
- `server/api/submissions/**/*.ts`
- `server/api/releases/**/*.ts`
- `server/utils/auth.ts`
- `server/utils/export-release.ts`
- `server/services/releases/build-export.ts`

Changes in these areas usually require synchronized updates across API handlers, services, tests, and docs.

## Recommended Next Tasks

1. Replace the starter `README.md` with a real project overview and setup guide.
2. Add stronger integration coverage for auth, permissions, and release export behavior.
3. Add browser-level flow tests for submission, review, and release management.
4. Document deployment/runtime expectations once the environment story is stable.

## Known Documentation Gap

- `README.md` does not yet reflect the current application.
- These three files are intended to be the primary context bootstrap for future AI sessions until the README is rewritten.

## Session Start Prompt

Use this prompt to start a new AI conversation:

```text
先阅读仓库根目录的 AGENTS.md、ARCHITECTURE.md、HANDOFF.md、package.json 和 .env.example，再开始分析任务；如果文档和代码不一致，以代码为准，并指出不一致之处。
```

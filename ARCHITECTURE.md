# ARCHITECTURE.md

## Overview

`cs2kz-submissions` is a Nuxt 4 full-stack application that manages an internal CS2KZ map review workflow.

The main business pipeline is:

1. a logged-in user creates a submission
2. approvers review the submission and save votes
3. a lead approver makes the final decision and finalizes course filters
4. approved submissions are attached to a release
5. the release is exported as `NewMap[]` JSON

The repository keeps both the review workflow and the export contract in the same codebase.

## Runtime Shape

- Frontend routes live in `pages/`
- Shared UI components live in `components/`
- Client-side reusable logic lives in `composables/`
- API handlers live in `server/api/`
- Write-side domain logic lives in `server/services/`
- Read-side aggregation logic lives in `server/queries/`
- Infrastructure helpers live in `server/utils/`
- Database tables and enums live in `db/schema/`
- Shared external contract schemas live in `shared/schemas/`

Nuxt is configured to use `app/` as the app directory, with global CSS from `app/assets/css/main.css`.

## External Dependencies

- PostgreSQL via `DATABASE_URL`
- Steam OpenID for login
- Supabase Storage for course image uploads

The application uses local session cookies and does not depend on an external session service for role checks.

## Core Data Model

### Users And Access

- `users`: local user profile snapshot keyed by internal UUID and Steam identity
- `sessions`: hashed session token records with expiry and last-seen tracking
- `user_roles`: explicit local authorization entries for `approver` and `lead_approver`

Key rule:

- `lead_approver` is treated as an `approver` for permission checks

### Submissions

- `submissions`: map-level submission record
- `submission_mappers`: map-level mapper list
- `submission_courses`: ordered course records for a submission
- `submission_course_mappers`: mapper list per course

Submission lifecycle:

- `pending`
- `approved`
- `rejected`

### Review Data

- `submission_votes`: one current vote per approver per submission
- `submission_vote_filters`: per-course and per-mode filter opinions attached to a vote
- `submission_final_filters`: lead-approved final filter values used for export

Important distinction:

- approver votes are review input
- final filters are release/export truth

### Releases

- `releases`: release metadata and export timestamp
- `release_submissions`: join table between a release and approved submissions

## Shared Contract Layer

`shared/schemas/cs2kz.ts` defines the export contract used by release export.

Important enums and structures:

- modes: `classic`, `vanilla`
- map states: `invalid`, `in-testing`, `approved`
- course filter states: `unranked`, `pending`, `ranked`
- `CourseFilters` always contains both `classic` and `vanilla`
- `NewMap` is the top-level export item

This file is the single source of truth for export payload shape.

## Main Request Flows

### 1. Login And Session

1. client requests session info from `/api/auth/session`
2. login starts at `/api/auth/login`
3. Steam redirects back to `/api/auth/callback`
4. server creates or updates the local user record
5. server creates a local session and stores a hashed token
6. later requests resolve the current user from the cookie token

Server truth lives in:

- `server/utils/session.ts`
- `server/utils/auth.ts`
- `server/utils/steam-openid.ts`

### 2. Submission Creation

1. authenticated user fills the submission form
2. course images are uploaded through `/api/uploads/course-image`
3. server validates image format and dimensions
4. form data is posted to `/api/submissions`
5. service layer creates the submission, map mappers, courses, and course mappers in one transaction

Business constraints:

- a submission must have at least one course
- map and course mapper lists must be non-empty
- images must be JPEG and `1920x1080`
- workshop URL must be parseable into `workshop_id`

### 3. Approver Review

1. approver opens a submission detail page
2. server aggregates submission details, courses, mappers, votes, and final filters
3. approver submits a yes/no vote
4. approver also submits per-course filter opinions for both `classic` and `vanilla`
5. saving a vote overwrites that approver's current vote for the submission

Behavior rule:

- only `pending` submissions can be voted on

### 4. Lead Finalization

1. lead approver reviews the aggregated submission and vote summaries
2. lead writes final per-course filters
3. lead marks the submission as `approved` or `rejected`
4. final filter rows become the values used by release export

Behavior rules:

- only `lead_approver` can finalize
- approved submissions must have complete finalized filters
- rejected submissions do not enter releases

### 5. Release Export

1. lead approver creates a release
2. only approved submissions can be attached
3. export reads release membership, submissions, courses, mappers, and final filters
4. export builds `NewMap[]`
5. payload is validated before being returned
6. export endpoint records `exportedAt`

The export path is centered around:

- `server/services/releases/build-export.ts`
- `server/utils/export-release.ts`
- `shared/schemas/cs2kz.ts`

## Permissions

Permission checks happen in two layers:

- client route guards in `middleware/`
- server-side enforcement in `server/utils/auth.ts` and `server/utils/permissions.ts`

Server-side checks are the real authority. Client middleware only improves UX.

## Validation Boundaries

- Request payload validation: API handlers with `zod`
- Database shape validation: Drizzle schema and enum constraints
- Export contract validation: `NewMapSchema` and related zod schemas
- Upload validation: server-side image MIME and dimension checks

## Design Conventions

- Pages orchestrate data fetching and high-level actions.
- Components stay domain-focused and presentation-driven.
- Services perform write operations and transactions.
- Queries perform read aggregation.
- Shared schemas and shared utilities must remain usable by both server and test code.

## Current Testing Posture

The repo currently has:

- unit tests for utility and validation logic
- contract-style tests for export payload shape

The repo currently lacks deep automated coverage for:

- auth/session behavior
- permission boundaries across API handlers
- end-to-end submission/review/release flows against a real DB
- browser-level UI interaction tests

## High-Risk Areas

- export mapping changes can silently break downstream import expectations
- permission changes can expose admin or lead actions to the wrong users
- DB schema changes often require synchronized service, query, and type updates
- review/finalization changes must preserve the distinction between approver input and lead-approved final filters

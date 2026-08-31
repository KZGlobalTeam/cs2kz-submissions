# CS2KZ Submissions

Internal workflow workspace for the CS2KZ community: map submission, peer
review, and release export — all in one place. Mappers submit workshop maps
(ports included), approvers vote, and lead approvers group approved maps into
releases that export to the CS2KZ backend.

Built with [Nuxt 4](https://nuxt.com) + [Nuxt UI](https://ui.nuxt.com),
deployed to [Cloudflare Pages](https://pages.cloudflare.com) via the Nitro
`cloudflare-pages` preset, backed by a PostgreSQL database (Neon serverless)
and Supabase Storage for course/proof-of-permission images.

## Features

- **Steam OpenID authentication** — sign in with Steam; sessions are
  server-held and role-gated.
- **Submissions** — mappers submit workshop maps, attach multiple courses with
  images, and flag ports with proof-of-permission image uploads.
- **Voting & decisions** — approvers cast votes; lead approvers finalize a
  submission as approved or rejected with notes. Mappers cannot see votes
  while a submission is still pending.
- **Releases** — lead approvers group approved submissions into named releases
  and export them to the CS2KZ backend.
- **Role-based access** — `approver` and `lead_approver` roles, managed by
  admins via the approvers dashboard.
- **Validated uploads** — course and port-authorization images are
  type/size/dimension validated before being stored.

## Tech stack

| Layer        | Choice                                              |
| ------------ | --------------------------------------------------- |
| Framework    | Nuxt 4, Vue 3 (`<script setup>`), TypeScript strict |
| UI           | Nuxt UI 4, Tailwind CSS 4                           |
| Server       | Nitro (`cloudflare-pages` preset), h3               |
| Database     | PostgreSQL via `@neondatabase/serverless`           |
| ORM          | Drizzle ORM + drizzle-kit migrations                |
| Validation   | Zod / drizzle-zod                                   |
| Storage      | Supabase Storage (course & port-authorization imgs) |
| Auth         | Steam OpenID (hand-rolled)                         |
| Testing      | Vitest                                              |
| Linting      | ESLint (`@nuxt/eslint`)                             |
| Deploy       | Cloudflare Pages (Wrangler)                         |

## Project structure

```
app/                Nuxt 4 app directory (entry, assets)
components/        UI components (admin, release, review, submission, common)
composables/       useSession, useSubmissionForm, useVoteForm, useReleaseExport, ...
layouts/           Default layout
middleware/        Route guards: auth, approver, lead-approver
pages/             File-based routes (submissions, releases, review, admin)
server/
  api/             REST endpoints (auth, submissions, releases, uploads, admin)
  queries/         Read-side query helpers
  services/        Write-side business logic (submissions, releases, votes)
  utils/           auth, db, session, storage, permissions, steam-openid, ...
shared/            Cross-stack schemas, types, utils
db/                Drizzle client + schema (users, roles, submissions, votes, releases)
drizzle/           Generated migrations
```

## Roles & permissions

Two roles are stored per user in `user_roles`:

- **`approver`** — can view the review queue and vote on submissions.
- **`lead_approver`** — everything an approver can do, plus finalize decisions
  (approve/reject) and manage releases.

Route guards live in [middleware/](middleware) and server-side helpers in
[server/utils/permissions.ts](server/utils/permissions.ts).

## Getting started

### Prerequisites

- Node.js (LTS) and [pnpm](https://pnpm.io) (the repo pins `pnpm@9.15.1`)
- A PostgreSQL database (e.g. a [Neon](https://neon.tech) project)
- A [Supabase](https://supabase.com) project with a storage bucket for images
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)

### Install

```bash
pnpm install
```

### Configure environment

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

```env
DATABASE_URL=                 # postgres connection string
NUXT_DISCORD_WEBHOOK_URL=     # optional — leave blank to disable Discord notifications
NUXT_SESSION_SECRET=         # random secret for signing sessions
NUXT_STEAM_REALM=             # e.g. http://localhost:11451/
NUXT_STEAM_RETURN_URL=        # e.g. http://localhost:11451/api/auth/callback
NUXT_STEAM_API_KEY=           # Steam Web API key
NUXT_PUBLIC_SITE_URL=         # e.g. http://localhost:11451
NUXT_SUPABASE_URL=
NUXT_SUPABASE_SERVICE_ROLE_KEY=
NUXT_SUPABASE_STORAGE_BUCKET= # e.g. course-images
```

These map onto the `runtimeConfig` keys declared in [nuxt.config.ts](nuxt.config.ts).

### Database

Generate and apply migrations with Drizzle Kit:

```bash
pnpm db:generate   # generate SQL from schema changes
pnpm db:migrate     # apply migrations
# or, for prototyping against a dev DB:
pnpm db:push        # push schema directly without a migration file
```

### Run the dev server

```bash
pnpm dev
```

The app is served at `http://localhost:11451`.

## Scripts

| Script           | Description                                  |
| ---------------- | -------------------------------------------- |
| `pnpm dev`        | Start the Nuxt dev server                    |
| `pnpm build`      | Production build                             |
| `pnpm generate`   | Static site generation                        |
| `pnpm preview`    | Preview the production build locally         |
| `pnpm lint`       | Run ESLint                                   |
| `pnpm typecheck`  | Type-check the project (`vue-tsc`)          |
| `pnpm test`       | Run Vitest once                              |
| `pnpm test:watch` | Run Vitest in watch mode                     |
| `pnpm db:generate`| Generate Drizzle migrations                  |
| `pnpm db:migrate` | Apply Drizzle migrations                     |
| `pnpm db:push`    | Push schema to DB without migration files   |

## Deployment

The app targets **Cloudflare Pages** via the Nitro `cloudflare-pages` preset
(see [nuxt.config.ts](nuxt.config.ts) and [wrangler.toml](wrangler.toml)).
The build emits static assets to `.output/public`, with the Pages Functions
server entry wired automatically.

```bash
pnpm build
npx wrangler pages deploy .output/public
```

Set the `runtimeConfig` secrets (the `NUXT_*` env vars above) as Pages
environment variables in the Cloudflare dashboard or via `wrangler`.

## License

Internal tool for the CS2KZ project. All rights reserved.

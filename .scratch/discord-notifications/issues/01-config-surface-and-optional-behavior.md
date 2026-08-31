# 01: Webhook config surface and optional behavior

**What to build:** Add `NUXT_DISCORD_WEBHOOK_URL` as a server-only secret, following the existing env pattern: read it in `server/utils/config.ts` (`CloudflareEnv` interface, `AppConfig`, and the `getCloudflareEnv`/fallback mapping), add the `runtimeConfig` field in `nuxt.config.ts` (server side only — never under `public`), and document the variable in `.env.example`. When the URL is absent, the notifier must be disabled (a no-op, logged once) and every write path must behave exactly as today — a fresh clone or a dev machine without Discord needs no secret.

**Blocked by:** —

**Status:** resolved

- [x] `NUXT_DISCORD_WEBHOOK_URL` resolved in `getAppConfig` from the Cloudflare bindings with the runtimeConfig fallback, server-only (no `NUXT_PUBLIC_` exposure).
- [x] `runtimeConfig` field registered in `nuxt.config.ts`.
- [x] `.env.example` documents the variable (commented-out / blank, like the other secrets).
- [x] Absent URL resolves to a disabled notifier — the module and both write services run unchanged.

## Comments

Implemented 2026-08-31:

- **Config surface**: `CloudflareEnv` gains `NUXT_DISCORD_WEBHOOK_URL?`, `AppConfig` gains `discordWebhookUrl: string | undefined`, and `getAppConfig` maps `env.NUXT_DISCORD_WEBHOOK_URL ?? runtime.discordWebhookUrl ?? undefined` — the exact sibling pattern for the other secrets. `getCloudflareEnv` needed no change (it returns the whole env object).
- **runtimeConfig**: `discordWebhookUrl: ''` registered at the top level of `nuxt.config.ts` runtimeConfig, never under `public` — no `NUXT_PUBLIC_` exposure.
- **Documentation**: `.env.example` carries a blank `NUXT_DISCORD_WEBHOOK_URL=` line (like the other secrets); the README "Configure environment" block mirrors `.env.example` and got the same line with a comment noting blank disables notifications.
- **Disabled-when-absent contract**: absent bindings and default runtimeConfig resolve to `''` (falsy) via the existing `?? ... ?? undefined` chain, so an unset URL is falsy at the seam where ticket 02's no-op check reads it. No notifier module or write-service code exists yet (tickets 02–05); `server/services/review-write` and `server/services/submission-content` are untouched.
- **Tests**: new `tests/server/utils/config.spec.ts` pins two behaviors — the binding path resolves the URL, and absence resolves to `''` (disabled). `tests/fixtures/nuxt-imports.ts` was kept in sync with the runtimeConfig surface (vitest's `#imports` alias).
- **Verification**: config spec green, full suite 231/231 green, `pnpm typecheck` exit 0, `pnpm eslint` clean.
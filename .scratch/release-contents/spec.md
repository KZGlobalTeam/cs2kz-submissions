# Release contents: one ordered manifest behind the export and the image pack

**Status:** ready-for-agent

## Problem Statement

The Release JSON export (`server/services/releases/build-export.ts`) and the Image pack (`server/services/releases/build-image-pack.ts`) each re-run the same release → submissions → courses → filters aggregation, each carry a copy of the identical `'Release contains non-approved submission'` guard, and silently disagree on ordering — the export sorts nothing, the pack sorts maps by `createdAt` (map name tie-break) and courses by `orderIndex`. An unknown release id makes the pack 404 while the export returns `[]` and still stamps `exportedAt`. ADR-0012 records the decisions; this spec drives the work.

## Solution

One release-contents module (`server/services/release-contents/`, mirroring the review-write and submission-content module shape) resolves a release's **ordered manifest** once — the superset both artifacts need: release name; maps with `mapName`, `workshopId`, `createdAt` and mappers; courses with `courseId`, `orderIndex`, `name`, `imageUrl`, mappers and classic/vanilla finalized filters. The spine owns assembly, the deterministic ordering rule (maps by `createdAt` ascending + `mapName` tie-break, courses by `orderIndex` ascending), the approved-only guard (single 400), and the 404 for an unknown release. The JSON export and the image pack become thin bound adapters; the pure shape-mappers join the formatter seams they feed (`toReleaseExportPayload` next to `toReleaseExport`, `toImagePackManifest` next to `buildImagePack`), and the two formatter seams stay untouched.

- Guard written once, not twice.
- Ordering defined in one place — the export's course arrays become deterministically `orderIndex`-ordered (the external dashboard identifies courses by name, so array order is the only positional signal).
- Export and pack cannot diverge on content or ordering.
- One module to test with a substitute store, mirroring the review-write/submission-content test style.
- Leverage: N artifacts, one resolution — a future artifact adds only a shape-mapper.

## Decisions (ADR-0012)

- Store-port shape: `ReleaseContentsStore` (read-mostly; `markExported` is the one deliberate write), bound via `drizzle-store.ts`; factory `createReleaseContentsService({ store })`; `index.ts` wires production.
- Manifest is the full superset, post-guard (no `status` field — approved by construction); filters are null-able per mode (presence judgment is an export concern).
- Ordering: one rule, the pack's rule, defined in the spine.
- Unknown release → 404 for both artifacts (export behavior change documented).
- Empty release stays per-artifact: export renders `[]`, the pack-builder keeps its own 400.
- Missing-finalized-filters refusal stays in the export shape-mapper.
- `exportedAt` stays an export-handler-only side effect, invoked via `markReleaseExported` (ADR-0008 untouched).

## Testing

- Spine driven through an in-memory fake store: ordering (createdAt + tie-break, orderIndex), the guard, the 404, empty release, mapper/filter attachment.
- Shape-mappers spec'd next to their formatter seams (prior art: `tests/server/utils/`).
- Handlers and the raw `db()` aggregation are not unit-tested, matching convention.
- Verification per convention: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Out of Scope

- Changes to `toReleaseExport`, `buildImagePack`/`toImagePackStream` or their consumers.
- Changes to the meaning of `exportedAt` (ADR-0008 accepted quirk stays).
- `attach-submission`/`detach-submission`; `NewMapSchema` is externally versioned.
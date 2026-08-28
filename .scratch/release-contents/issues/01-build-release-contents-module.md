# 01: Build the release-contents resolution module

**Type:** task

**What to build:** One module at `server/services/release-contents/` mirroring the review-write and submission-content module shape — `types.ts` declaring the `ReleaseContentsStore` port, the row shapes and the ordered-manifest contract; `drizzle-store.ts` binding the store to the Drizzle HTTP client; `resolve-release-contents.ts` exporting a `createReleaseContentsService({ store })` factory that owns assembly, the deterministic ordering (maps by `createdAt` ascending with `mapName` tie-break; courses by `orderIndex` ascending; mappers in insertion order), the approved-only guard (single 400 message), and the 404 for an unknown release; `index.ts` wiring the production store and exposing bound `resolveReleaseContents` and `markReleaseExported`.

The manifest is the superset both artifacts need, resolved in one pass: `{ releaseName, maps: [{ mapName, workshopId, createdAt, mappers, courses: [{ courseId, orderIndex, name, imageUrl, mappers, filters: { classic, vanilla } }] }] }` — filters null-able per mode (presence is the export's judgment), no `status` field (approved by construction). Empty release resolves to `maps: []`. `markExported` sets `exportedAt` + `updatedAt` and is a no-op on a missing release, mirroring the pre-module handler.

**Status:** resolved

- [x] `server/services/release-contents/` exists with `types.ts`, `drizzle-store.ts`, `resolve-release-contents.ts` (factory + spine) and bound `index.ts`.
- [x] Ordering rule defined exactly once in the spine; courses sorted by `orderIndex`; mappers unsorted (insertion order).
- [x] Guards: unknown release → 404 `Release not found`; any non-approved submission → 400 `Release contains non-approved submission`; empty release → `{ releaseName, maps: [] }`.
- [x] The manifest is the full superset; finalized-filter rows stripped of `courseId` (course identity already lives on the course).
- [x] Spine spec'd against an in-memory fake store (ordering, tie-break, guard, 404, empty, mapper/filter attachment, `markExported`).

## Answer

Implemented in commit `5e22eb7`. `server/services/release-contents/types.ts` declares the `ReleaseContentsStore` port (getRelease, listLinkedSubmissionIds, listMaps, listCourses, listMapMappers, listCourseMappers, listFinalFilters, markExported), the row shapes, and the `ReleaseContents` manifest whose doc comment states the ordering contract; `drizzle-store.ts` binds it to the Drizzle HTTP client with plain selects (no ORDER BY — the spine owns ordering so the rule is exercised by fake-store tests); `resolve-release-contents.ts` implements `createReleaseContentsService` with `orderMaps`/`orderCourses` helpers and `stripCourseId`, running the course-mapper query in its own pass after courses resolve (it is keyed by course id); `index.ts` wires `drizzleStore(db())` and exports bound `resolveReleaseContents`/`markReleaseExported` plus the types. Tests: `tests/server/services/release-contents/resolve-release-contents.spec.ts` (8 cases) drives the module through `fake-release-contents-store.ts`. `pnpm lint` (0 new errors, 3 pre-existing warnings), `pnpm typecheck`, `pnpm test` (166 passed), and `pnpm build` all pass. The export and pack adapters route through the module in tickets 02 and 03.
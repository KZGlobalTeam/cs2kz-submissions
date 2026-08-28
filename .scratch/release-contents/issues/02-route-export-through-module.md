# 02: Route the JSON export through the module

**Type:** task

**What to build:** `GET /api/releases/[id]/export` keeps its exact external behavior (lead-approver auth, JSON payload shown in the copy modal, `exportedAt` stamped on the release) but the aggregation moves fully behind the module. `server/services/releases/build-export.ts` becomes a thin bound adapter: resolve ordered manifest, shape, done. The pure shape-mapper `toReleaseExportPayload(contents)` joins the formatter seam (`server/utils/export-release.ts`, next to the untouched `toReleaseExport`): it renders manifest maps into `NewMapSchema`-validated payloads and keeps the export-only filters-presence refusal (`Missing finalized filters for course <name>` 400). The handler drops its inline `db().update(releases)` and calls the module's `markReleaseExported` only after the build succeeds — so a release that fails the build is never marked exported, and the image pack never marks anything (ADR-0008 intact). Unknown release ids now 404 (previously `[]` + a phantom `exportedAt` write) — the deliberate behavior change ADR-0012 records.

**Blocked by:** 01

**Status:** resolved

- [x] `server/utils/export-release.ts` gains pure `toReleaseExportPayload`; `toReleaseExport` untouched.
- [x] `build-export.ts` is the bound adapter; `export.get.ts` drops its DB import and calls `markReleaseExported` post-build.
- [x] Spec: manifest → validated payload (keys per `NewCourseSchema`), manifest course order preserved, missing-mode 400 with course name, empty release → `[]`.

## Answer

Implemented in commit `5e22eb7`. `toReleaseExportPayload` lives in `server/utils/export-release.ts` with a type-only import of `ReleaseContents` (no runtime dependency on the module wiring, so the spec stays in the pure-test style); it maps `mapName`→`name`, picks only `nub_tier`/`pro_tier`/`state`/`notes` per mode (mode, courseId, orderIndex and imageUrl stay out of the wire), throws the course-naming 400 when either mode's filter is missing, and relies on `toReleaseExport` for `state: 'approved'` and the `null`→`''` notes coercion. `build-export.ts` is now only `buildReleaseExport = toReleaseExportPayload ∘ resolveReleaseContents`. `export.get.ts` imports `buildReleaseExport` and `markReleaseExported` and no longer touches the DB — the payload builds first, the export marker lands second, so an invalid release is never stamped. Spec coverage added to `tests/server/utils/export-release.spec.ts` (4 cases: shape + template keys, manifest order preserved with no plumbing leakage, missing-filters 400, empty release `[]`); the pre-existing `toReleaseExport` cases still pass. Behavior change: exporting an unknown release now 404s instead of returning `[]` and writing `exportedAt`; the export course arrays are now deterministically `orderIndex`-ordered.
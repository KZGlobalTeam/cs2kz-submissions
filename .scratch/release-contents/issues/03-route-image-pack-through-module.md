# 03: Route the image pack through the module

**Type:** task

**What to build:** `GET /api/releases/[id]/images` keeps its exact external behavior (lead-approver auth, streamed ZIP with attachment headers, no side effects on the release) but the aggregation moves behind the module. `server/services/releases/build-image-pack.ts` becomes a thin bound adapter over `resolveReleaseContents` + the pure `toImagePackManifest` shape-mapper, which joins the pack's formatter seam (`server/utils/image-pack.ts`, next to the untouched `buildImagePack`/`toImagePackStream`). `images.get.ts` is unchanged. The pack-builder keeps ownership of its empty-release 400 (`Release contains no maps to pack`); the approved-only guard, the 404 and the deterministic ordering now come from the shared resolution.

**Blocked by:** 01

**Status:** resolved

- [x] `server/utils/image-pack.ts` gains pure `toImagePackManifest` and the `ReleaseImagePackManifest` type; `buildImagePack`/`toImagePackStream` untouched.
- [x] `build-image-pack.ts` is the bound adapter (same exported name and return type; re-exports `ReleaseImagePackManifest`); `images.get.ts` unchanged.
- [x] Spec: manifest → pack shape (`mapName`, per-course `orderIndex`/`name`/`imageUrl`), order and release name preserved, plumbing fields excluded.

## Answer

Implemented in commit `5e22eb7`. `toImagePackManifest` lives in `server/utils/image-pack.ts` (type-only import of `ReleaseContents`), projecting each map to `{ mapName, courses: [{ orderIndex, name, imageUrl }] }` — workshop ids, mappers, filters and createdAt stay out of the pack shape — with `ReleaseImagePackManifest` defined at the seam; `build-image-pack.ts` re-exports the type and its `buildImagePackManifest` is now `toImagePackManifest ∘ resolveReleaseContents` with identical signature, so the handler and its unchanged `toImagePackStream` wiring compile and behave as before. Spec coverage added to `tests/server/utils/image-pack.spec.ts` (2 cases: shape with order and release name preserved; no plumbing leakage). The pre-existing archive-streaming cases (store-mode bytes, concurrency bounds, pre-flight errors) still pass against the untouched builder.
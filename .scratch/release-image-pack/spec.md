# Release Image Pack Download

Status: `ready-for-agent`

## Problem Statement

When a release of approved maps is ready to ship, the lead approvers need the course screenshots for every map in one organized package — one folder per map containing that map's course images — to distribute or upload alongside the release. Today nothing provides this: the course images exist only as individual per-course records, and getting an organized set requires opening every map's courses one by one. The JSON export carries metadata only, no images.

## Solution

A "Download Images" button in the Releases table, next to "Export JSON", per release row. Clicking it downloads a `.zip` image pack assembled server-side from Supabase Storage: one folder per map named after the map, containing that map's course images named by course order (`1.jpg`, `2.jpg`, `3.jpg`, …). Map folders appear in submission creation order. The archive is streamed as it is built, fails loudly and early if any image is unreachable, and has no side effects on the release.

## User Stories

1. As a lead approver viewing the Releases table, I want a "Download Images" button beside "Export JSON" on every release row, so that I can download a release's packed course screenshots in one click.
2. As a lead approver, I want the download to be a single `.zip` archive, so that I receive one file that I can move around or upload.
3. As a lead approver, I want the archive to contain one folder per map named exactly after the map name, so that images are attributable to their map without guesswork.
4. As a lead approver, I want each map's course images to live inside that map's folder, so that course screenshots stay grouped with their map.
5. As a lead approver, I want each course image file named by its raw course order (`1.jpg`, `2.jpg`, `3.jpg`, …), so that the file numbering reflects the map's course sequence.
6. As a lead approver, I want course image files to always carry the `.jpg` extension, since all course images are JPGs, so that extracted files open anywhere.
7. As a lead approver, I want map folders to appear in submission creation order, so that the pack reads in the order the maps were submitted.
8. As a lead approver, I want the archive file named after the release, so that I can identify the pack without opening it.
9. As a lead approver, I want downloading a release with no maps to fail with a clear message, so that I'm never handed an empty archive that looks legitimate.
10. As a lead approver, I want the download to fail loudly and name the map and course when any course image cannot be fetched, so that a silently incomplete pack is never produced or shipped.
11. As a lead approver, I want the button to show a loading state while the archive is being assembled, so that I know the request is in flight.
12. As a lead approver, I want failures surfaced as a toast, so that I see the reason without leaving the page.
13. As an unauthorized user, I want the endpoint to reject me, so that image packs for unpublished releases stay internal.
14. As a lead approver, I want downloading images to have no side effects on the release, so that downloading is never confused with shipping it (the export marker stays owned by the JSON export).
15. As a developer, I want the archive assembled with zero recompression (store mode), so that Worker CPU cost stays negligible — course images are already-compressed JPGs and gain nothing from deflate.
16. As a developer, I want every course image pre-flighted before any archive bytes are streamed, so that hard failures produce clean HTTP errors with useful messages instead of truncated archives.
17. As an operator, I want archives to stream out as they are assembled rather than be buffered whole, so that memory stays bounded on large releases.
18. As a lead approver, I want the browser to treat the response as an attachment download, so that the file saves to disk instead of rendering in the tab.
19. As a developer, I want the archive layout to be deterministic, so that the pack's structure can be asserted in automated tests.

## Implementation Decisions

- **New read-side endpoint** `GET /api/releases/[id]/images`, guarded by lead-approver auth (mirrors the existing JSON export endpoint). Response is `Content-Type: application/zip` with `Content-Disposition: attachment`; the archive filename is the release name + `.zip`, RFC-5987-encoded (`filename*`), because release names are unvalidated free text.
- **Server-side, store-mode assembly**: images are streamed from Supabase Storage public URLs into store-mode ZIP entries (no deflate). CRC-32 is computed by the zip library as entries stream; JPGs get no benefit from re-compression, and skipping it keeps the Cloudflare Pages Functions CPU cost near zero.
- **New direct dependency: `fflate`** for ZIP assembly. Verified API: the streaming `Zip` class with `ZipPassThrough` entries (store semantics) pushed per image, `zip.end()` emitting the central directory; the synchronous stream variant avoids Worker-spawn overhead, and `unzipSync` is reused in tests to parse the produced archive back.
- **Layer split mirroring the export feature** (each under its existing convention): a query/service layer that resolves the ordered manifest for a release; a pure pack-builder in the server utilities seam that takes the manifest plus an injected image fetcher and produces the archive; a thin handler that authenticates, sets headers, and streams. The existing `toReleaseExport` pattern is the direct precedent.
- **Manifest contract**: maps ordered by submission `createdAt` ascending, with map name ascending as a deterministic tie-break; each map carries `mapName` and its courses ordered by `orderIndex` with `orderIndex`, `name` (for error messages), and `imageUrl`. Approved-only guard matches the JSON export (a release containing a non-approved submission is an error). Unknown release id → 404.
- **Empty release** → HTTP 400 with a clear message, thrown before any response body is written.
- **Pre-flight + stream**: every course image is HEAD-checked in bounded parallel first; any non-2xx or transport error → HTTP error message naming the map and course. After pre-flight passes, GETs stream in bounded parallel into the ZIP entries.
- **Residual mid-stream failure** (between pre-flight and stream): the response is aborted — the client sees a failed download — rather than emitting a truncated archive that could be mistaken for a complete one.
- **Naming**: map folders use the raw `mapName` (domain rule: map names contain only `[a-zA-Z0-9_]`, so no sanitization); course files use the raw `orderIndex` + `.jpg` (all course images are JPGs per upload validation). No deduplication for duplicate map names, per domain rule.
- **No side effects**: the endpoint performs no DB writes; `exportedAt` remains owned by the JSON export.
- **Frontend**: a "Download Images" button in the Releases table actions cell to the right of "Export JSON" (order: Export JSON, Download Images, Delete), with per-row loading state and error surfacing via toast. The browser saves the file via the attachment header; the client does not download image bytes itself.

## Testing Decisions

- **One seam**: the pure pack-builder module in the server utilities seam, tested where the existing utility specs live (the `toReleaseExport` spec is the prior art). No new test seams are introduced — the repo has no DB or HTTP test infrastructure and services/handlers are not unit-tested by convention.
- **What makes a good test here**: external behavior only. Feed a manifest with canned image bytes and an injected fake fetcher, assemble the archive, parse it back (via the same library's `unzipSync`), and assert observable structure: folder names equal map names, file names equal `orderIndex.jpg`, map order == manifest order, byte-for-byte image content preserved (store mode), and the ZIP entries use store (method 0), not deflate.
- **Error behavior tests (same seam)**: an empty manifest throws an error carrying status 400 with a clear message; a fetcher failure throws an error whose message names the offending map and course; no archive bytes are produced in failure cases.
- **Not unit-tested** (matching prior art): the DB query/service layer and the HTTP handler/auth. The seam contract types the manifest shape so the untested layers stay thin.
- Verification per repo convention: `pnpm typecheck && pnpm build` before finishing.

## Out of Scope

- Changes to the JSON export or the meaning of `exportedAt` — the export marker stays owned by the JSON export.
- Client-side zipping, image conversion, resizing, or transcoding of any kind.
- Duplicate-map-name disambiguation or zip-entry sanitization (domain rule: map names are alphanumeric + underscore; release names are handled only at the header level).
- Per-map or per-course selection — the whole release is always packed.
- A button on the release detail page (the Releases table is the only surface).
- Asynchronous/multi-threaded variants of the zip library; the synchronous stream variant is intentionally used.

## Further Notes

- **Cloudflare Pages Functions**: store mode plus streaming keeps per-request CPU negligible; very large releases could approach the free-plan per-request wall-time limit. Bounded-concurrency image fetches mitigate this. Accepted known limitation given the server-side decision.
- Pre-flight costs one HEAD per course image; negligible at release scale and it is what makes clean hard-fail error messages possible.
- `CONTEXT.md` glossary was updated with the Release, Map, Course, Course image, Image pack, and Release export terms; this spec uses that vocabulary.
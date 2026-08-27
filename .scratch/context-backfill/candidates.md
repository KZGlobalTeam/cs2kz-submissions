# Context docs backfill — mined candidates (awaiting human confirmation)

> Working artifact from 4 parallel read-only mine passes (db schema, server/API, UI, git history).
> **Nothing here is written into `CONTEXT.md` or `docs/adr/` yet.** Sections A and B are proposals;
> section D is the input only you can supply. After confirmation, this file can be deleted or archived.

## A. Glossary candidates

Rules applied (CONTEXT-FORMAT): domain-specific nouns/states only; 1–2 sentence definitions; no implementation detail.

### Strong — recurred across 2+ passes

| Term | Proposed definition (domain language) | _Avoid_ (seen in code/UI) | Evidence |
|---|---|---|---|
| **Vote** | An approver's recorded `yes`/`no` judgment on a submission, optionally carrying per-course filter proposals and, on a `no`, a rejection reason and internal attachments. The first vote on a submission is what moves it from Unreviewed to In review. | "approval decision", "Status of Approval", "verdict" | `db/schema/votes.ts:46–54`; `server/api/submissions/[id]/vote.put.ts:41,45`; `components/review/ApproverVoteForm.vue:151,178` |
| **Decision** | The lead approver's terminal `approved`/`rejected` ruling that ends review; written exactly once while the submission is still pending, never edited. Carries decision notes, the finalized course filters (on approval), and revealed rejection attachments (on rejection). | "finalize", "finalization", "status of approval" | `db/schema/submissions.ts:40–46`; `server/services/submissions/finalize-submission.ts:61–103`; `server/api/submissions/[id]/decision.put.ts:33,49` |
| **Port** | A submission whose map adapts an existing map from another game/source rather than an original; the mapper flags it and must supply proof the original author permits it. | "ported map", "porting" (code key) | `db/schema/submissions.ts:33–39`; `components/submission/SubmissionForm.vue:275`; commit `819b58e` |
| **Proof of permission** | The screenshot of the original mapper's authorization that a Port submission must attach; skippable only when the original mapper has been inactive ~2 years. | "authorization screenshot", `portAuthorizationImage` (field name), "Proof of Authorization" (detail page label) | `components/submission/SubmissionForm.vue:285`; `submissionRules.ts:100–104`; `server/api/uploads/port-image.post.ts` |
| **Submission rules** | The canonical, ordered set of grouped requirements (map naming, course rules, ranked courses, jumpstat areas, porting, other) a mapper must tick through before submitting; the same groups are mirrored one-to-one in every approver's private checklist. | "steps" (schema key), "requirements" | `components/submission/submissionRules.ts:10–107`; commit `a727013`; ADR-0003 |
| **Approver** | One of the two staff roles; casts Votes and keeps a private Approver checklist per submission. | "reviewer" (as a role) | `db/schema/roles.ts:5,14`; `server/utils/approver-gate.ts` |
| **Lead approver** | The second staff role (always also an approver): the only one who casts the Decision, and who manages releases and the approver dashboard. | "admin", "moderator" | `db/schema/roles.ts:5`; `server/utils/permissions.ts:19–41`; README.md:64–68; commit `1c88da4` |
| **Course filter** | The per-(course, mode) set of ratings — nub tier, pro tier, ranked state, notes — proposed by approvers inside their Votes, and separately finalized by the lead at Decision time; the finalized set is what ships in a Release export. | "filter" alone, "filters" (also used for row-filtering in tables) | `db/schema/votes.ts:70–79,138–154`; `server/services/releases/build-export.ts:76–104`; `shared/schemas/cs2kz.ts` |
| **Finalized filter** | The lead's per-course, per-mode record written at Decision time (mode, nub/pro tier, ranked state, notes, resolver) — the vote-proposal shape minus state, plus the resolved state. The export refuses a course lacking both classic and vanilla finals. | "final filters" (DB column phrase) | `server/services/submissions/finalize-submission.ts:53–61`; `components/review/CoursesReadonly.vue:27–28` |
| **Rejection attachment** | An image attached to a rejection: either on an approver's `no` Vote (internal) or on the lead's final Decision (revealed to the mapper). Both live in the shared bucket under `rejection-attachments/`, validated server-side by prefix. | "rejection image" | `shared/types/attachment.ts`; `server/utils/attachment-rules.ts`; ADR-0001 |
| **Rejection reason** | The short, required statement an approver must give when voting `no`, distinct from an optional longer rejection explanation; shown to the mapper once a decision lands. | "reason" (bare), `decisionNotes` (field name) | `db/schema/votes.ts:47–48`; `components/review/ApproverVoteForm.vue:70–71,164` |
| **Mapper** | A Steam identity credited on a submission or single course of it (Steam ID + display-name snapshot); distinct from the submitter account. | "creator", "submitted by" | `db/schema/submissions.ts:63–64,107–108` |
| **Unvoted** | A review-queue state *per viewing approver*: a pending submission they have not yet voted on. Not a submission state — a submission can be Unvoted for one approver while In review for another. | "unreviewed", "unvoted only" (filter label only) | `server/queries/list-submissions.ts:13–19,109`; `pages/review/index.vue:162` |
| **Course mode** | The two play modes a course's filters are rated in: classic and vanilla. | "mode" (field name), "CKZ/VNL filter" | `db/schema/votes.ts:17`; `components/review/CourseFilterVoteTable.vue:79` |
| **Filter tier** | The ten-level CS2KZ difficulty scale (very-easy → impossible) used for both the nub and the pro rating of a Course filter. | "NUB tier", "PRO tier" (UI columns) | `db/schema/votes.ts:18–29`; `shared/schemas/cs2kz.ts` |
| **Filter state** | Whether a Finalized filter is ranked, pending ranking, or unranked. | "ranked status", "state" | `db/schema/votes.ts:30–33`; `build-export.ts:96–99` |

### Borderline (decide whether they earn a glossary entry)

- **Reviewer** — the blanket predicate admitting either role for endpoints where both may act (`requireReviewer`); arguably a permission concept, not a domain noun. Evidence: `server/utils/permissions.ts:38–49`.
- **Port authorization** (vs Proof of permission) — the same object under two names (storage prefix `port-images/`, field `portAuthorizationImage`, UI "Proof of permission"/"Proof of Authorization"). Pick one canonical term.
- **Submission note / Decision note / Filter notes** — four distinct "notes" meanings collide with the glossaried "Approver note". Need disambiguation or renaming (see D5).

## B. ADR candidates

All pass the three tests (hard to reverse / surprising without context / real trade-off) unless marked. Reconstructed "what" is solid; the "why" gaps are in section D.

| # | Title | What was decided | Evidence | Why-gap (D) |
|---|---|---|---|---|
| B1 | **Cloudflare Pages + Neon Postgres + Drizzle runtime stack** | Deploy on Cloudflare Pages/Functions; Postgres via Neon over a stateless HTTP driver for reads/writes; a one-shot WebSocket Pool created and torn down per transaction; `nodejs_compat` retained because Neon's SCRAM auth needs `node:crypto`, while app-side hashing moved to Web Crypto. Cloudflare also drops DELETE bodies, forcing the attachment-delete workaround. | `nuxt.config.ts:55–65` (comment); `db/client.ts:17–74`; `wrangler.toml:1–3`; commits `1220626`, `143b278`, `ccf57be`, `8ad5217`, `5ff9396`, `e3a0410`→`a9fae7c` | D1, D2, D3 |
| B2 | **Steam-only auth; hand-rolled OpenID; host-anchored session cookie** | Steam is the only identity provider; the `openid` npm dep was dropped and the dance hand-rolled; Steam realm, callback, and post-login redirect derive from the request origin, and the cookie `Secure` flag from the request protocol — because fixed-host URLs stranded sessions on preview hosts. | `server/utils/steam-openid.ts`; `server/utils/auth-host.ts:1–24`; `server/utils/session.ts`; commits `f2d4ff6`, `d05fc15` (+ regression test `tests/server/utils/auth-host.spec.ts`) | D4 |
| B3 | **All images share one public Supabase bucket, protected only at the API layer** | Course images and port screenshots (plus rejection attachments, ADR-0001) all use plain public URLs under key prefixes; no object-level security anywhere. | `server/utils/storage.ts:57–95`; `server/api/uploads/course-image.post.ts:16`; complements ADR-0001 | D6 |
| B4 | **Review spine: Votes are advisory; the Lead approver alone finalizes, one-shot** | No quorum/aggregation exists — a Vote never transitions a submission; only the lead's Decision does, guarded against double-finalize. Terminal status (`approved`/`rejected`) is persisted as an enum; the Unreviewed/In review sub-states are never stored, always derived from vote presence. Final filters are entered fresh by the lead at decision time, not aggregated from votes (other approvers' values shown as reference badges only). | `decision.put.ts:49` (requireLeadApprover) vs `vote.put.ts:41` (requireApprover); `finalize-submission.ts:81,95–102`; `list-submissions.ts:67–85`; `submission-mutability.ts:18`; `LeadDecisionPanel.vue:42–48,80–87` | D7, D8, D9, D10 |
| B5 | **Release export is copiable JSON text targeted at an external schema, and merely GETting it stamps the release as exported** | The export endpoint returns inline JSON (no file download) shaped to an external `NewMapSchema` (snake_case, classic/vanilla per course, `state` forced to `approved`), while a sibling endpoint streams the image pack ZIP as a real attachment. The export payload is copied to clipboard by a human. | `server/api/releases/[id]/export.get.ts:25`; `server/api/releases/[id]/images.get.ts:64–65`; `server/utils/export-release.ts:16–37`; `shared/schemas/cs2kz.ts`; commits `f75a98a`, `e38fb93`, `df44fae`; `pages/releases/index.vue:88–181` | D11, D12, D13 |
| B6 | **Deliberate three-way role-predicate split** | Three predicates with distinct intents: shared `requireApprover` deliberately admits lead-only users (they judge votes); `hasApproverRole` gates the private checklist exactly (ADR-0003); `requireReviewer` admits either role for attachment endpoints. | `server/utils/auth.ts:70`; `server/utils/approver-gate.ts:12`; `server/utils/permissions.ts:23,38` | D14 (partly covered by ADR-0003 — decide fold vs extend) |
| B7 | **FK/integrity semantics per relationship** (borderline) | Cascade on child rows (courses, mappers, votes, checklists, release membership); restrict on authorship rows; set-null on decision attribution. Notable consequence: deleting an approver cascade-erases their Votes, rewriting review history. | `db/schema/*.ts` FK blocks; ADR-0002 (hard delete) | D15 |

### Explicitly dropped (for the record)

- **Default page size 15 / `[10,15,20,50]`** — easily reversible, no trade-off (history pass agreed).
- **Post-login role-based redirect to /review** — small, easily reversible, why mostly in commit `0905759`.
- **Client-side data fetching / SSR opt-out** — no clear decision recorded, only an OPEN question; revisit if a real reason emerges.
- **URL-query filter state** — minor; "why" nice-to-have, not ADR-shaped.
- **Course image locked to JPG 1920×1080; magic-byte validation** — spec-bordering, not surprising; skip unless you want the validation rationale recorded.

## C. Drift flags

Things that now contradict the glossary or will once section A lands — worth a sweep when the docs are written:

1. **`pending` conflates Unreviewed and In review.** API `status` is only `pending|approved|rejected` (`shared/types/submission.ts:10`); "In review" is always derived and exists only in comments. README:27 inherits the ambiguity. Decide: document `pending` as the code word, or note the derivation.
2. **`editable` field name** collides with Unreviewed's `_Avoid_` list (`shared/types/submission-detail.ts:109`; `server/api/submissions/[id].get.ts:26–37`). It's a derived owner-UI flag, not a status — glossary can note the collision or the field gets renamed (bigger change).
3. **"Export JSON" UI label / `release-export-json` key** vs glossary "Release export" (`pages/releases/index.vue:190`; `useReleaseExport.ts:12`).
4. **"Download Images" button** labels the glossary "Image pack" (`pages/releases/index.vue:196`).
5. **"Approved Submissions" heading** on the release builder vs Map (`pages/releases/new.vue:118`, vs consistent `Selected Maps` at :88).
6. **"Proof of permission" vs "Proof of Authorization"** — same object, two labels (`SubmissionForm.vue:285` vs `MapInfoPanel.vue:73`).
7. **README:5 says releases "bundle" approved maps** — "bundle" is an `_Avoid_` synonym for Release.
8. **`release_submissions` table / attach service** still name approved content "submission" (`db/schema/releases.ts:31–41`) — internal naming, optional to fix.
9. **Course image alt text "preview"** — `_Avoid_` word in the wild (`CourseEditorCard.vue:134`).
10. **`notes` overload** — four "notes" meanings; see D5.
11. **"Unvoted only" reads like "Unreviewed"** — the glossary entry for Unvoted (A) must draw the distinction explicitly.

## D. Open questions — only you can answer (the "why" gaps)

### Platform & auth (B1, B2)
- **D1. Why this stack?** Why Cloudflare Pages + Neon + Supabase over alternatives (a plain VPS/Node server, other PaaS)? Any constraint (cost, free tier, existing accounts, compliance)?
- **D2. wrangler.toml whiplash** — commit `e3a0410` added it, `a9fae7c` removed it within an hour, `8ad5217` re-added nodejs_compat. What changed in between — abandoned alternative?
- **D3. Two crypto strategies** — why keep `nodejs_compat` solely for Neon's SCRAM while app code moved to Web Crypto? Is the flag now a permanent dependency?
- **D4. Why drop the `openid` npm package** (`f2d4ff6` is silent) — runtime incompatibility on Workers, missing Steam-specific control, or dependency hygiene? Also: is the env-var realm fallback still needed/used?

### Storage (B3)
- **D6. Why public bucket for course/port images too?** ADR-0001's rationale (internal moderation material, small trusted team) doesn't obviously apply to course images that ship publicly. Was it just zero-config, or was object-level protection ever considered?

### Review workflow (B4)
- **D7. Decision rule:** Is there any policy on vote counts (minimum/quorum/consensus) before the lead may finalize — or is it pure lead discretion even over a unanimous vote? Was automatic vote-based resolution ever considered?
- **D8. Can an approved submission ever re-enter review?** The schema permits flips back to `pending`; no code path does. Terminal forever?
- **D9. Why persist terminal status but derive the in-review sub-state?** (A plausible why exists: the ADR-0002 gate needs the live vote count anyway — confirm or correct.)
- **D10. Final filters entered fresh by the lead, not aggregated from votes** — deliberate? Or intended as majority + lead-confirms?

### Export (B5)
- **D11. What consumes the export JSON?** Which system, who versions the external schema, and is the `isRanked` flag (stored on every filter) deliberately dropped from the payload?
- **D12. Can a release be re-exported / un-exported?** Is the export always rebuilt from live rows, or persisted anywhere?
- **D13. Why clipboard-text over file download?** (Guess: human pastes into a backend — confirm.)

### Roles & integrity (B6, B7)
- **D14. What can a lead-*only* user do that an approver can't?** The shared `requireApprover` intentionally admits lead-only users — on what endpoints does that matter? (Their private checklist must NOT be accessible — that's ADR-0003 — but what SHOULD they do?)
- **D15. Deleting an approver cascade-erases their Votes** (rewriting review history) while decision attribution is set-null. Deliberate? And is the ownerless attachment delete (`?url=` workaround) an explicit internal-trust decision?

### Glossary semantics
- **D16. Rejection reason vs rejection explanation** — two genuinely distinct intents (label vs body), or historical accretion worth merging?
- **D17. `notes` overload** — rename the four "notes" fields, or document their distinct meanings in the glossary?
- **D18. Mapper vs submitter** — confirm "Mapper" (credited identity) vs the account that submitted — different things in your mind?

## E. Recommended write plan (after confirmation)

1. **CONTEXT.md** — add the confirmed section-A terms (grouped: Review workflow / Submissions / Releases / Roles as natural clusters), fix the two definitions that need it (Unreviewed/In review already draw on Vote; add explicit note that `pending` is the code word).
2. **docs/adr/** — write `0004` (platform stack), `0005` (auth model), `0006` (public storage, extending 0001), `0007` (review spine), `0008` (export contract), and decide on B6 (extend 0003 vs new ADR) and B7 (yes/no).
3. **Drift sweep** — fix the cheap user-facing ones (3, 4, 5, 6, 7, 9) in the same pass; leave code-internal ones (1, 2, 8, 10) flagged rather than churned, unless you want the renames.
# CS2KZ Submissions

Tracks community map submissions for CS2KZ and packages approved maps into releases for publication.

## Language

### Roles and people

**Approver**:
One of the two reviewer roles. Casts Votes on submissions and keeps a private Approver checklist per submission.
_Avoid_: Reviewer (as a role)

**Lead approver**:
The second reviewer role, held alone or alongside `approver`. The only role that casts a Decision and the only role that creates Releases. In effect still an approver: guard code treats lead-only users as admitted wherever an approver is, and on sign-in any reviewer is routed to the review queue.
_Avoid_: Admin, moderator

**Mapper**:
A person credited with making a map (or one of its courses), captured as a Steam identity plus their display name as of submission time. Usually the same people as the Submitter, but a different concept.
_Avoid_: Creator, submitter

**Submitter**:
The account that submits a map to the website; owns the Submission and its edit/delete window until review starts (see Unreviewed).
_Avoid_: Mapper

### Submissions and review

**Submission**:
A map proposed by a mapper for approval review, tracked until it is approved or rejected.
_Avoid_: Map (until approved), workshop item

**Unreviewed**:
A pending submission that has not yet received any approver vote. Its submitter may still edit or delete it.
_Avoid_: Draft, editable
_Code note: in the API, both Unreviewed and In review carry the single `pending` status; which of the two a submission is in is computed from its votes, never stored._

**In review**:
A pending submission that has received at least one approver vote; from this point its submitting mapper can no longer edit or delete it.
_Avoid_: Under review, approval in process

**Vote**:
An approver's recorded yes/no judgment on a submission. A no vote carries a Rejection reason (required), an optional Rejection explanation, and any internal Rejection attachments; a vote of either kind may propose Course filters. The first vote on a submission is what moves it from Unreviewed to In review. Votes are visible to reviewers but hidden from the submitter while the submission is pending.
_Avoid_: Approval decision, verdict, "Status of Approval"

**Decision**:
The lead approver's terminal approved/rejected ruling that ends review. Written exactly once while the submission is still pending and never edited afterwards; records who decided, a Decision note, the Finalized filters (on approval), and the Rejection attachments revealed to the submitter (on rejection). A submission that has received a Decision can never re-enter review.
_Avoid_: Finalize, finalization, "Submit Approval", status of approval

**Rejection reason**:
The short, required statement an approver gives when voting no — or the lead when rejecting. Distinct from the optional, longer Rejection explanation.
_Avoid_: Reason (bare)

**Rejection explanation**:
The optional longer free-text an approver may attach to a no Vote, beyond the short required Rejection reason.
_Avoid_: Rejection reason

**Rejection attachment**:
An image attached to a rejection: on an approver's no Vote (visible only to reviewers) or on the lead's final Decision (revealed to the submitter once the decision lands). Stored in the public image bucket under a dedicated prefix, which the API validates every attachment URL against.
_Avoid_: Rejection image

**Unvoted**:
A per-viewer state in the review queue: a pending submission the *current* reviewer has not yet voted on. Not a submission state — a submission can be Unvoted for one approver while already In review for another.
_Avoid_: Unreviewed

**Submission rules**:
The canonical, ordered set of grouped requirements (map and course naming, course rules, ranked-course rules, jumpstat areas, porting, other) a submitter must tick through before submitting; the same groups are mirrored one-to-one in each approver's private checklist.
_Avoid_: Steps, requirements

**Submission note**:
Free text the submitter attaches to their Submission.
_Avoid_: Notes (bare)

**Decision note**:
Free text the lead approver attaches to a Decision; shown to the submitter once the decision lands.
_Avoid_: Notes (bare)

### Maps, courses, and filters

**Map**:
An approved submission included in a release. Identified by its map name and workshop ID, with a set of mappers.
_Avoid_: Submission (once approved), workshop item

**Course**:
A playable route inside a map. Each course has an order within the map and a dedicated course image.

**Course mode**:
One of the two play styles a course's filters are rated for: classic or vanilla (labelled CKZ and VNL in the UI).
_Avoid_: Mode (bare), "CKZ/VNL filter"

**Course image**:
The canonical 1920×1080 JPG screenshot of a course. Stored per course; named by course order in an image pack.
_Avoid_: Screenshot, map image, preview

**Course filter**:
An approver's proposed rating of a single Course in a single Course mode — nub tier, pro tier, and notes — attached to their Vote. Contrast the Finalized filter, the lead's settled version of the same slot.
_Avoid_: Filter (bare), filters

**Finalized filter**:
The lead approver's settled rating of a single Course in a single Course mode, written at Decision time and never edited. The values that ship in a Release export; a course needs both Course modes finalized to be exported.
_Avoid_: Final filters

**Filter tier**:
The ten-level CS2KZ difficulty scale (very easy → easy → medium → advanced → hard → very hard → extreme → death → unfeasible → impossible) used for both the nub and the pro rating of a Course filter.
_Avoid_: (none)

**Filter state**:
Whether a Finalized filter is ranked, awaiting ranking, or unranked.
_Avoid_: Ranked status

**Filter note**:
Free-text reasoning attached to a Course filter, proposed or finalized, explaining the tier.
_Avoid_: Notes (bare)

**Port**:
A submission whose map adapts an existing map from another game or source. The submitter must flag it and attach Proof of permission from the original author, skippable only when that author has been inactive for roughly two years.
_Avoid_: Ported map, porting

**Proof of permission**:
The image of the original author's authorization that a Port submission must carry. Also labelled "Proof of Authorization" in one place in the UI.
_Avoid_: Authorization screenshot, port authorization image, Proof of Authorization

### Releases

**Release**:
A named collection of approved maps that ship together. A release has a unique name, notes, a creator, and an export timestamp.
_Avoid_: Pack, bundle, drop

**Image pack**:
The downloadable ZIP of a release's course images: one folder per map, files named by course order (`1.jpg`, `2.jpg`, …). The UI button is labelled "Download Images".
_Avoid_: Download Images

**Release export**:
The JSON describing the maps in a release — workshop IDs, mappers, and per-course finalized filters. Recording it is what marks a release as exported. The payload is shaped for the external CS2KZ dashboard's import dialog and is always rebuilt from the release's live data, never persisted.
_Avoid_: Export JSON, ship file

**Ordered manifest**:
The single, deterministically ordered view of a release's maps and courses that both the release export and the image pack render from: maps ordered by submission creation time (map name as tie-break), courses by their order index. Resolved once by the release-contents module; the JSON export and the image pack are formatting adapters over it, so the two artifacts cannot drift on content or ordering.
_Avoid_: Manifest (alone)
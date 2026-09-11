# CS2KZ Submissions

Tracks community map submissions for CS2KZ and packages approved maps into releases for publication.

## Language

### Games

**Game**:
One of the two supported games a Submission or Release belongs to: CS2 or CS:GO. The whole app is scoped to one game at a time via its route context (`/cs2/…`, `/csgo/…`); a signed-in user's user-card switch is the only place the game changes — pages never render a game badge, and the bare sign-in page carries no game context, only the Preferred game picker. The game scopes the course-mode vocabulary, the course naming convention, the rules, and the port flow. Existing rows were backfilled to CS2.
_Avoid_: Mode, platform, game mode

**Preferred game**:
The Game a user's sign-in lands on — chosen on the game-neutral sign-in page and kept in sync by the user-card switch, so the next sign-in lands where the user last worked. Stored per browser (a cookie), never per account: it does not follow the user across devices and falls back to CS2, the portal's default context, when absent. A landing choice, not a permission.
_Avoid_: Home game, default game

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
An approver's recorded yes/no judgment on a submission. Each decision side carries exactly one text field: the required Rejection reason on No, the optional Approval note on Yes. A no vote may also carry internal Rejection attachments, and a vote of either kind may propose Course filters. The first vote on a submission is what moves it from Unreviewed to In review. Votes are visible to reviewers only, at every stage of the submission's life — never to the submitter, pending or decided. The details API enforces this by stripping the votes payload from every non-approver response.
_Avoid_: Approval decision, verdict, "Status of Approval"

**Approval note**:
The optional free text an approver writes on a yes Vote, so the other approvers and the lead understand their approval. Reviewers-only and never a Decision; a no Vote never carries one. Contrast the private per-approver Approver note/checklist, which no other reviewer ever sees.
_Avoid_: Approver note, comment, reason

**Decision**:
The lead approver's terminal approved/rejected ruling that ends review. Written exactly once while the submission is still pending and never edited afterwards; records who decided, a Decision note, the Finalized filters (on approval), and the Rejection attachments revealed to the submitter (on rejection). A submission that has received a Decision can never re-enter review.
_Avoid_: Finalize, finalization, "Submit Approval", status of approval

**Rejection reason**:
The short, required statement an approver gives when voting no — or the lead when rejecting. No carries this and nothing else — the longer Rejection explanation no longer exists, and each decision side of a Vote carries exactly one text field.
_Avoid_: Reason (bare)

**Rejection attachment**:
An image attached to a rejection: on an approver's no Vote (visible only to reviewers) or on the lead's final Decision (revealed to the submitter once the decision lands). Stored in the public image bucket under a dedicated prefix, which the API validates every attachment URL against.
_Avoid_: Rejection image

**Unvoted**:
A per-viewer state in the review queue: a pending submission the *current* reviewer has not yet voted on. Not a submission state — a submission can be Unvoted for one approver while already In review for another.
_Avoid_: Unreviewed

**Submission rules**:
The canonical, ordered set of grouped requirements (map and course naming, course rules, ranked-course rules, jumpstat areas, porting, other) a submitter must tick through before submitting; the same groups are mirrored one-to-one in each approver's private checklist. The set is per Game: CS:GO has its own copy (initially the CS2 rules minus porting, pending the community's own draft) and never shares a rule set with CS2.
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
A playable route inside a map. Each course has an order within the map and a dedicated course image, and its name follows the game's naming convention (see Course name convention).

**Course name convention**:
The fixed course naming CS:GO submissions must follow: the first course is `Main`, subsequent courses are `Bonus 1`, `Bonus 2`, … Enforced by construction in the form (names are prefilled and not editable) and validated server-side. CS2 courses keep free ASCII names.
_Avoid_: Course name (bare), naming

**Course mode**:
One of the play styles a course's filters are rated for. The set of modes is per game: CS2 offers classic and vanilla (labelled CKZ and VNL in the UI); CS:GO offers kztimer, simplekz, and vanilla (labelled KZT, SKZ, and VNL). A mode is scoped to its Game — CS2's vanilla and CS:GO's vanilla are different modes. One shared enum stores all five values; each game's allowed set is validated in code.
_Avoid_: Mode (bare), "CKZ/VNL filter", filter

**Course image**:
The canonical 1920×1080 JPG screenshot of a course. Stored per course; named by course order in an image pack.
_Avoid_: Screenshot, map image, preview

**Course filter**:
An approver's proposed rating of a single Course in a single Course mode — nub tier, pro tier, and notes — attached to their Vote. Contrast the Finalized filter, the lead's settled version of the same slot.
_Avoid_: Filter (bare), filters

**Finalized filter**:
The lead approver's settled rating of a single Course in a single Course mode, written at Decision time and never edited. Carries no reasoning: a Finalized filter is the settled rating alone, never a reason text (see Filter note). The values that ship in a Release export; a course needs both Course modes finalized to be exported.
_Avoid_: Final filters

**Filter tier**:
The ten-level CS2KZ difficulty scale (very easy → easy → medium → advanced → hard → very hard → extreme → death → unfeasible → impossible) used for both the nub and the pro rating of a Course filter.
_Avoid_: (none)

**Filter state**:
Whether a Finalized filter is ranked, awaiting ranking, or unranked.
_Avoid_: Ranked status

**Filter note**:
Free-text reasoning an approver writes on a proposed Course filter attached to their Vote, explaining the tier. Proposal-only: a Finalized filter never carries one, so on a decided submission the Reasoning row shows only the reasoning each approver proposed — never a settled reasoning.
_Avoid_: Notes (bare)

**Final reference badge**:
The decided view's per-field `Final:` marker showing a Finalized filter's settled value: present beside the `Ranked Status`, `NUB tier`, and `PRO tier` row labels, and never on the Reasoning row — a Finalized filter carries no reasoning, so no settlement is marked there.
_Avoid_: Final (bare)

**Port**:
A submission whose map adapts an existing map from another game or source. The submitter must flag it and attach Proof of permission from the original author, skippable only when that author has been inactive for roughly two years. CS2-only: CS:GO submissions have no Port concept — a CS:GO map is an original that later gets ported to CS2, so the port question, proof, and porting rules belong to CS2 only.
_Avoid_: Ported map, porting

**Proof of permission**:
The image of the original author's authorization that a Port submission must carry. Also labelled "Proof of Authorization" in one place in the UI.
_Avoid_: Authorization screenshot, port authorization image, Proof of Authorization

### Releases

**Release**:
A named collection of approved maps that ship together. A release has a unique name, notes, a creator, and an export timestamp, and belongs to a single Game: it contains only approved submissions of that game, and its JSON export shape is per game.
_Avoid_: Pack, bundle, drop

**Image pack**:
The downloadable ZIP of a release's course images: one folder per map, files named by course order (`1.jpg`, `2.jpg`, …). The UI button is labelled "Download Images".
_Avoid_: Download Images

**Release export**:
The JSON describing the maps in a release — workshop IDs, mappers, and per-course finalized filters. Recording it is what marks a release as exported. The payload is always rebuilt from the release's live data, never persisted. The shape is per game: for CS2 it targets the external CS2KZ dashboard's import dialog (byte-identical contract); for CS:GO it is a provisional JSON carrying `kzt`/`skz`/`vnl` filter keys, pending the CS:GO KZ dashboard API.
_Avoid_: Export JSON, ship file

**Ordered manifest**:
The single, deterministically ordered view of a release's maps and courses that both the release export and the image pack render from: maps ordered by submission creation time (map name as tie-break), courses by their order index. Resolved once by the release-contents module; the JSON export and the image pack are formatting adapters over it, so the two artifacts cannot drift on content or ordering.
_Avoid_: Manifest (alone)
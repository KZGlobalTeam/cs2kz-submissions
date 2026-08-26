# CS2KZ Submissions

Tracks community map submissions for CS2KZ and packages approved maps into releases for publication.

## Language

**Release**:
A named collection of approved maps that ship together. A release has a unique name, notes, a creator, and an export timestamp.
_Avoid_: Pack, bundle, drop

**Map**:
An approved submission included in a release. Identified by its map name and workshop ID, with a set of mappers.
_Avoid_: Submission (once approved), workshop item

**Course**:
A playable route inside a map. Each course has an order within the map and a dedicated course image.

**Course image**:
The canonical 1920×1080 JPG screenshot of a course. Stored per course; named by course order in an image pack.
_Avoid_: Screenshot, map image, preview

**Image pack**:
The downloadable ZIP of a release's course images: one folder per map, files named by course order (`1.jpg`, `2.jpg`, …).

**Release export**:
The JSON describing the maps in a release — workshop IDs, mappers, and per-course finalized filters. Recording it is what marks a release as exported.
_Avoid_: Export JSON, ship file

**Submission**:
A map proposed by a mapper for approval review, tracked until it is approved or rejected.
_Avoid_: Map (until approved), workshop item

**Unreviewed**:
A pending submission that has not yet received any approver vote. Its submitter may still edit or delete it.
_Avoid_: Draft, editable, open

**In review**:
A pending submission that has received at least one approver vote; from this point its submitting mapper can no longer edit or delete it.
_Avoid_: Under review, approval in process

**Approver checklist**:
An approver's private, per-submission record of which submission-rule groups they have verified, presented as the same grouped rules the mapper acknowledges before submitting. Visible only to the approver who wrote it — never to other approvers, the lead approver, or the submitting mapper.
_Avoid_: Rule check-off, verification log

**Approver note**:
A free-text note an approver attaches to their own Approver checklist, private to that approver in the same way.
_Avoid_: Private note, comment
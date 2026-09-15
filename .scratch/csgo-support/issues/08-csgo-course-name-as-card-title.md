# 08: CS:GO course name shown as the card title, name input removed

**What to build:** On the CS:GO submission form (create and edit — the shared `SubmissionForm` drives both), remove the "Course Name" label and text input entirely, and change each course card's title from the positional `Course {{ index + 1 }}` to the convention name derived from course order: `Main`, `Bonus 1`, `Bonus 2`, …. CS2 is untouched in every way: it keeps the editable "Course Name" input, the `Course 1`/`Course 2` card titles, and all existing copy ("Courses", "Add Course", "Remove Course").

**Status:** ready-for-agent

- [x] On CS:GO, a course card shows no name input — no "Course Name" label, no `UInput` — and its title is the convention name derived from order, never from form state (`csgoCourseNameForOrder(index + 1)` → `Main`, `Bonus 1`, …).
- [x] On CS2, the card is exactly as before: editable "Course Name" field and `Course N` title.
- [x] Copy unchanged for both games: "Courses", "Add Course", "Remove Course".
- [x] Names stay in the payload (derived by construction) and the server-side convention validation is untouched — this is a UI-only change, no schema/DB/export change.
- [x] Docs reflect the new shape: CONTEXT.md "Course name convention" and the stale "renders non-editable" comments in `useSubmissionForm.ts` / `shared/utils/course-names.ts` now say the name is displayed as the card title, never an input.

## Comments

Decisions (grill round, all confirmed by the user):

- **Q1 — Title derivation:** derive the CS:GO title fresh from course order (`csgoCourseNameForOrder(index + 1)`), never echo `course.name` — display doesn't trust state someone could have typed. Title is exactly `Main` / `Bonus 1`, no decoration.
- **Q2 — CS2 unchanged:** both the editable name input and the `Course N` titles stay; the two games' course sections now visibly differ (CS:GO: image + mappers only, name as title).
- **Q3 — Copy:** "Add Course" / "Remove Course" / "Courses" unchanged.
- **Q4 — Wire and guard stay:** names remain in the payload and the server keeps 400ing non-convention names. The "remove course names entirely" alternative was rejected — it would ripple into the DB column, release exports, and image packs for zero user-visible gain.

Implemented 2026-09-15:

- `components/submission/CourseEditorCard.vue`: import `csgoCourseNameForOrder`; new `title` computed (`csgoCourseNameForOrder(props.index + 1)` for CS:GO, literal `Course ${index + 1}` for CS2); heading renders `{{ title }}`; the Course Name `UFormField` is gated on `game !== 'csgo'` and its `:disabled` binding (previously how CS:GO rendered the field) is gone — the field simply doesn't exist for CS:GO.
- Docs: CONTEXT.md "Course name convention" entry, `useSubmissionForm.ts` `blankCourse` comment, and `shared/utils/course-names.ts` header updated from "prefilled, non-editable" to "prefilled and displayed as the course card's title — never an input".
- Client-side validation needs no change: derived CS:GO names always pass `min(1)`/ASCII and are unique, and with the field gone the per-course name error anchor is unreachable for CS:GO anyway.
- No component test added: the repo has no component test harness, and the derivation helper (`csgoCourseNameForOrder`) is already covered at the seam (`csgo-course-names.spec.ts`). The CS2 title is a literal label.

**Verification:** `nuxt typecheck` clean, `eslint` clean (3 pre-existing `v-html` warnings only), full suite 399 passed / 1 failed — the failure is `approver-checklist-state.spec.ts` > "is a structural copy today", **pre-existing** (reproduces on base commit with this ticket's changes stashed): HEAD (#2, "Update submissionRules.ts") deliberately diverged the CS:GO rules (renamed the ranked group to "Rules for Main Courses", dropped the `!lj` rule from the jumpstat group), breaking the test that pins CS:GO = CS2 minus porting. That is a rules-content decision for the owner; flagged, not changed here.

Resolved 2026-09-15 (owner decision): the structural-copy test now **pins the actual divergence** instead of expecting identity — same group order and every other group text must match CS2 minus porting, while the two intentional CS:GO differences are asserted explicitly (ranked title = "Rules for Main Courses", jumpstat texts = CS2's minus exactly `Doing \`!lj\` should teleport you to the jumpstat area.`), plus the object-independence checks are kept. The adjacent test name was corrected ("never the CS2 set, no porting group"), and CONTEXT.md "Submission rules" now records the divergence. Full suite: 400 passed.
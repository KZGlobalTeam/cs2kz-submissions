# Discord notifications for submission lifecycle events

**Status:** ready-for-agent

## Problem Statement

The site tracks the three submission lifecycle events — a map submitted, an approver voting, the lead deciding — entirely inside the app. The approvers' coordination channel (an internal Discord channel where only approvers and the lead approver live) receives no signal when they happen: reviewers only find out by polling the review queue. This feature pushes a Discord webhook message to that channel on each of the three events.

## Solution

A `notifications` module posts a Discord **embed** to a single internal channel (a webhook URL, not a bot) after each successful write: `createSubmission` → a submission-created ping, `saveVote` → a vote ping on **every** save, `finalizeSubmission` → a decision ping. The send is fire-and-forget, after the DB commit, and never fails or slows the caller — the same post-commit best-effort shape the write services already use for storage cleanup. The webhook secret is optional: unset, the notifier no-ops and the site behaves exactly as today.

Rejected along the way: a Discord gateway bot (hostile on the Cloudflare Workers runtime, which the app runs on), an outbox/retry queue (recoverable noise, not data loss), and per-event channels (one internal channel was the ask).

## User Stories

1. As an approver, I want a message on the internal Discord channel when a submission is created, so that a new map awaiting review shows up without polling the site.
2. As an approver, I want a message every time an approver saves a vote — including a re-save — so that a changed or refined vote is announced again.
3. As an approver, I want a message when the lead casts the final decision, so that I know the review has closed.
4. As an approver, I want each message to link to the submission's page on the site, so I can jump straight to the detail.
5. As the lead approver, I want a no-vote's Rejection reason and a decision's Decision note in the message, so the channel carries the substance without opening the site.
6. As an approver, I want the message to be distinguishable by outcome at a glance (yes/no, approved/rejected), so I can scan the channel.
7. As a maintainer, I want the webhook secret optional, so the app runs unchanged on machines without Discord configured.
8. As a maintainer, I want a Discord outage or a slow webhook to never fail or block a domain write, so notification stays strictly best-effort.
9. As a maintainer, I want the notifier testable without a real Discord endpoint, so CI stays hermetic.

## Implementation Decisions

- **Transport.** A Discord webhook (HTTP POST of a JSON payload to a server-side secret URL) rather than a Discord bot. The app runs on Cloudflare Pages Functions; a long-lived gateway connection is hostile on a serverless runtime, and webhooks need zero new dependencies. No payload content is off-limits: the channel is internal to approvers, so vote direction, Rejection reasons, Decision notes, and names are all fine.
- **Channel and config.** One internal channel ⇒ one webhook URL ⇒ one env var: `NUXT_DISCORD_WEBHOOK_URL`, server-only (never `NUXT_PUBLIC_`), plumbed through `getAppConfig` and runtimeConfig like the other secrets, documented in `.env.example`. Unset ⇒ the notifier is disabled (a single log line), and the write services are untouched.
- **Fire-and-forget after commit.** The send runs only after the transaction commits (never inside it — a webhook HTTP call inside a transaction would hold the Neon connection and would alert on writes that rolled back). Failures are caught, logged, and swallowed; the caller never sees them. A 429 honours `Retry-After` for exactly one retry, then logs and drops. This mirrors the `deleteStorageObjects` seam the write spines already use for post-commit side effects.
- **Trigger semantics.** Submission ping fires on `createSubmission` only (submitter edits are silent). Vote ping fires on every `saveVote` save — including upsert re-saves of an existing vote (deliberately chosen over first-vote-only; no "[updated]" edit marker — a re-ping is the change signal). Decision ping fires on `finalizeSubmission`, exactly once (a Decision is written once by construction). Lead-approver deletes are silent.
- **Seam.** The notifier is injected into both write services' deps — `SubmissionContentDeps` gains a submission-created sender, `ReviewWriteDeps` gains vote and decision senders — bound in each module's `index.ts`. Endpoints stay thin adapters; the event emission is testable in the existing service tests via a recording fake.
- **Context resolution.** Each service hands the notifier the facts already in hand: on create, `submissionId`, creator user id, `mapName`, `workshopUrl`, `isPort`; on vote, `submissionId`, approver user id, the decision, and the Rejection reason; on decision, `submissionId`, the lead user id, status, and Decision note. The notifier resolves what the services don't hold — display names (`users.displayName` for the submitting account, the approver, and the lead) and the course count — in its own post-commit read. **No store-contract changes**: the narrow write contracts stay as they are.
- **Presentation.** Embeds, one template per event: color blue = submission, green = yes-vote/approved, red = no-vote/rejected; fixed sender name "CS2KZ Submissions"; every message links to `/submissions/{id}`.
- **Payloads.** Submission: title `Submission: <mapName>`, fields *Submitter* (the submitting *account's* display name — Mapper and Submitter are different concepts), *Workshop* (workshop URL), *Courses* (count), and a Port flag when `isPort`. Vote: title `Vote: <mapName>`, fields *Approver*, *Decision* (YES/NO), *Rejection reason* when no. Decision: title `Approved: <mapName>` / `Rejected: <mapName>`, fields *Lead approver*, *Decision note*. No finalized-filter summary on approval (skipped).

## Testing Decisions

- **Seam (one):** the notification module's sender takes an HTTP post function as a dep (mirroring how sibling services take `runTransaction`/`deleteStorageObjects`); tests stub it, never touch Discord.
- **Surface tested:** payload-template unit tests per event (title, color, fields, link, port flag, reason/note inclusion); sender behavior (success, 429 retry-once-then-drop, non-2xx logged, network error swallowed, no-op when the URL is unset); context-read mapping (display names, course count); and, via a recording fake notifier in the two write modules' service tests, that the event fires exactly once after a successful commit — and nothing on a 404/409, a failed or rolled-back write, an owner edit, or a lead delete.
- **Prior art:** the existing pure-function service tests (attachment-rules, submission-mutability) and the fake-driven module tests (review-write, submission-content) — same style, no database, no network.

## Out of Scope

- Discord bot features (threads, slash commands, reactions).
- An outbox or retry queue for webhook delivery — best-effort by explicit choice.
- Additional events (submitter edits, lead deletes, releases).
- Vote-edit markers (every-save pings are identical) and the finalized-filter summary on approval.
- Any client-side or store-contract changes.
- New glossary terms: a Discord embed is infrastructure, not domain, so CONTEXT.md stays untouched. No ADR: the decisions are additive and reversible; this spec is the record.

## Further Notes

- Design settled in a grilling session on 2026-08-31; the decisions and their rejected alternatives are recorded above.
- Implementation is intentionally deferred: the owner has not scheduled it. Do not start without a go.
- Suggested implementation order: 01 (config surface) → 02 (notifications module) → 03/04 (write-service integration) and 05 (module tests).
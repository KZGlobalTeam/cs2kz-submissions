# 02: Notifications module and payload templates

**What to build:** A `server/services/notifications/` module, styled after the sibling services (types, factory, `index.ts` wiring): three embed templates — submission-created, vote-recorded, decision-cast — with the exact settled fields (see spec §Payloads), colors (blue/green/red), fixed sender name "CS2KZ Submissions", and a link to `/submissions/{id}`; a post-commit context read that resolves display names (`users.displayName` for the submitting account, the approver, and the lead) and the course count from facts the write services hand it (`submissionId` + the in-hand event facts); and a best-effort sender: `fetch` of the webhook payload wrapped in try/catch, errors logged and swallowed (never thrown to the caller), a 429 honouring `Retry-After` for exactly one retry then log-and-drop, and a no-op when the webhook URL is unset. The write modules must never require store-contract changes: the read lives here, on its own post-commit query.

**Blocked by:** 01

**Status:** needs-triage

- [ ] Three embed templates match the settled payloads, colors, sender name, and site links exactly.
- [ ] Context read resolves submitter/approver/lead display names and the course count on its own post-commit query; no store-contract changes in the write modules.
- [ ] Sender is best-effort: fetch failures logged and swallowed, a 429 retried once via `Retry-After` then dropped, never thrown to the caller.
- [ ] Unset URL ⇒ no-op with a single log line.
- [ ] Injectable factory shape (`create…Service(deps)` + bound `index.ts` exports) with an HTTP-post seam a test can stub.
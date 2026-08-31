# 05: Payload-template and sender unit tests

**What to build:** Hermetic unit tests for the notifications module with no Discord in sight: per-event template output (title, color, fields, site link, port flag, reason/note inclusion), the context-read mapping (display names, course count), and the sender against a stubbed HTTP post — success posts the exact payload, a 429 retries once via `Retry-After` then drops, a non-2xx logs and drops, a network error is swallowed and logged (never thrown), and an unset URL is a silent no-op.

**Blocked by:** 02

**Status:** needs-triage

- [ ] Template tests: exact titles, colors, field sets, links, the port flag, and rejection reason / decision note inclusion per event.
- [ ] Sender tests via a stubbed HTTP-post dep: success, 429 retry-once-then-drop, non-2xx logged, network error swallowed, no-op when unset.
- [ ] Context-read mapping tests: submitter/approver/lead display names and the course count resolved from the read.
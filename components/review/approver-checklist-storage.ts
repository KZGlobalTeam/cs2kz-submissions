/**
 * One approver's saved ticks: rule-group key → per-rule booleans. The keys
 * are deliberately loose — the rule set can change without breaking saves —
 * and unknown keys are merely never rendered. Ticks are per-index within
 * each group, so a rule-text edit reflects on both surfaces without a
 * migration; a stored tick may then sit against updated text at the same
 * index, accepted for a private scratchpad (ADR 0014).
 */
export type ApproverChecklist = Record<string, boolean[]>

/**
 * Browser-storage backing for the Approver checklist and Approver note: a
 * thin, dependency-free module that owns the whole browser-storage surface —
 * the deterministic per-viewer key, JSON serialization of the same payload
 * shape the table column carried, immediate (write-through) saves, key
 * removal when the state is fully cleared, resilient parsing, per-field
 * cross-tab deltas from `storage` events, and graceful degradation to
 * in-memory behavior when storage is unavailable. Kept free of Vue and the
 * DOM so the repo's pure-function test seam can cover it with an in-memory
 * `Storage` fake.
 *
 * The decision behind this module is the re-scoped feature spec's
 * browser-storage choice; the ADR recording it (ADR-0014, which supersedes
 * ADR-0003) lands with issue 10.
 */

/** One viewer's saved state for one submission: the loose-key ticks map (the
 *  `{ <groupKey>: boolean[] }` shape the section's payload builder produces,
 *  and the same shape the old `checklist` jsonb column carried) plus the
 *  normalized note. */
export interface ApproverChecklistState {
  checklist: ApproverChecklist
  /** Trimmed, at most 2000 characters, null when empty or whitespace-only —
   *  the note contract the section's payload builder already produces. */
  note: string | null
}

/** The minimal `Storage` surface the checklist uses. `window.localStorage`
 *  satisfies it structurally; tests inject an in-memory fake. The default
 *  backend is resolved lazily (never at import time) so the module stays
 *  importable where `window` does not exist — node tests and SSR. */
export interface ApproverChecklistStorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** A browser `storage` event, kept as a plain-object shape so delta
 *  derivation runs without a DOM. */
export interface ChecklistStorageEvent {
  key: string | null
  oldValue: string | null
  newValue: string | null
}

/** Which fields of the saved state a cross-tab `storage` event changed;
 *  absent fields are unchanged. When another tab removed the key, every
 *  field that had content is present reset to its empty value. */
export interface ApproverChecklistDelta {
  checklist?: ApproverChecklist
  note?: string | null
}

/** The note length cap, matching the section's note field (textarea
 *  `maxlength`, the old server body schema's `.max(2000)`). The storage
 *  layer clamps rather than rejects, because storage has no error channel:
 *  an over-long note saves truncated, never crashes. */
export const APPROVER_CHECKLIST_NOTE_MAX = 2000

/** Deterministic per-viewer key: the session user id isolates accounts in a
 *  shared browser, the submission id isolates submissions — two accounts on
 *  the same browser never share state, and neither does one account across
 *  submissions. */
export function approverChecklistKey(userId: string, submissionId: string): string {
  return `approver-checklist:${userId}:${submissionId}`
}

function normalizeStoredNote(note: string): string | null {
  const trimmed = note.trim().slice(0, APPROVER_CHECKLIST_NOTE_MAX)
  return trimmed === '' ? null : trimmed
}

/** True when the state carries nothing worth keeping: no note and every tick
 *  off — the "reset to nothing" condition that removes the key entirely, so
 *  "never saved" and "reset to nothing" are indistinguishable on disk, which
 *  is exactly what the read-only card wants (nothing renders either way). */
function isFullyCleared(state: ApproverChecklistState): boolean {
  if (state.note !== null) {
    return false
  }
  for (const groupTicks of Object.values(state.checklist)) {
    if (groupTicks.some(Boolean)) {
      return false
    }
  }
  return true
}

function emptyState(): ApproverChecklistState {
  return { checklist: {}, note: null }
}

/** A valid ticks map: a plain object whose values are all arrays of
 *  booleans. The keys are deliberately loose (foreign group keys are merely
 *  never rendered); any non-boolean entry makes the whole payload foreign. */
function isChecklistShape(value: unknown): value is ApproverChecklist {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  for (const groupTicks of Object.values(value)) {
    if (!Array.isArray(groupTicks) || !groupTicks.every((tick) => typeof tick === 'boolean')) {
      return false
    }
  }
  return true
}

/** Resilient parse: an absent key, invalid JSON, and corrupt or foreign data
 *  under the key all read as the fresh empty state — reading never crashes
 *  on whatever is stored. Valid payloads come back with the note normalized
 *  exactly like the writer normalizes it, so a saved value round-trips
 *  exactly through read. */
export function parseApproverChecklistState(raw: string | null): ApproverChecklistState {
  if (raw === null) {
    return emptyState()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  }
  catch {
    return emptyState()
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return emptyState()
  }
  const { checklist, note } = parsed as { checklist?: unknown; note?: unknown }
  if (!isChecklistShape(checklist)) {
    return emptyState()
  }
  if (note !== undefined && typeof note !== 'string' && note !== null) {
    return emptyState()
  }
  return {
    checklist,
    note: normalizeStoredNote(note ?? ''),
  }
}

/** The exact JSON stored under the key: the `{ <groupKey>: boolean[] }`
 *  ticks map plus the normalized note (`null` when empty) — the same payload
 *  shape the section persists, so serialize and parse round-trip exactly.
 *  Exported so tests can assert the stored bytes; the store writes through
 *  it. */
export function serializeApproverChecklistState(state: ApproverChecklistState): string {
  return JSON.stringify({
    checklist: state.checklist,
    note: normalizeStoredNote(state.note ?? ''),
  })
}

function sameChecklist(a: ApproverChecklist, b: ApproverChecklist): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  for (const groupKey of aKeys) {
    const aTicks = a[groupKey]
    const bTicks = b[groupKey]
    if (!aTicks || !bTicks || aTicks.length !== bTicks.length) {
      return false
    }
    for (let i = 0; i < aTicks.length; i++) {
      if (aTicks[i] !== bTicks[i]) {
        return false
      }
    }
  }
  return true
}

/** What one cross-tab `storage` event changed for this checklist, per field.
 *  Returns null for events on any other key (another account's checklist,
 *  another submission, or an unrelated key) and when the event changed
 *  nothing adoptable. A removal (`newValue: null`) resets every changed
 *  field to its empty value; corrupt `newValue` reads as the empty state,
 *  exactly like a fresh read, so a foreign write resets rather than crashes.
 *  Events only reach *other* tabs — the writing tab already applied its own
 *  state (the browser does not fire the event for the tab that wrote) — and
 *  the event carries the newer write, so adopting its values is "newer
 *  write wins" by construction. */
export function approverChecklistDeltaFromEvent(
  event: ChecklistStorageEvent,
  key: string,
): ApproverChecklistDelta | null {
  if (event.key !== key) {
    return null
  }
  const before = parseApproverChecklistState(event.oldValue)
  const after = parseApproverChecklistState(event.newValue)
  const delta: ApproverChecklistDelta = {}
  if (!sameChecklist(before.checklist, after.checklist)) {
    delta.checklist = after.checklist
  }
  if (before.note !== after.note) {
    delta.note = after.note
  }
  return Object.keys(delta).length === 0 ? null : delta
}

/** The per-viewer store bound to one (user, submission) key. */
export interface ApproverChecklistStorage {
  /** The owned key — the component registers its `storage` listener against
   *  it and hands events to `approverChecklistDeltaFromEvent`. */
  readonly key: string

  /** Read the saved state. Absent key, corrupt/foreign JSON, and backend
   *  failures never throw: they read as the empty state, or (once the
   *  backend has failed) the state this session saved or read — in-memory
   *  degradation for the rest of the session. */
  read(): ApproverChecklistState

  /** Write-through: persists the full state immediately, or removes the key
   *  when the state is fully cleared. Never throws; when the backend fails
   *  (storage disabled, quota exceeded, or no backend exists) the state is
   *  kept for the session in memory and `false` is returned. Once the
   *  backend has failed, the store stays degraded in memory for the rest of
   *  the session. */
  save(state: ApproverChecklistState): boolean
}

/** The default backend, resolved lazily so importing this module never
 *  touches `window`: `window.localStorage` in the browser, `null` where no
 *  storage exists (SSR, node), which degrades the store to in-memory. */
function defaultBackend(): ApproverChecklistStorageBackend | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    if (window.localStorage) {
      return window.localStorage
    }
  }
  catch {
    // Accessing localStorage may itself throw (disabled buckets in some
    // privacy modes); the store then lives in memory for the session.
  }
  return null
}

/** Binds the checklist state to one browser-storage key for one viewer.
 *  Production code calls this without a backend, picking up
 *  `window.localStorage`; the tests inject an in-memory `Storage` fake. */
export function createApproverChecklistStorage(options: {
  userId: string
  submissionId: string
  backend?: ApproverChecklistStorageBackend | null
}): ApproverChecklistStorage {
  const key = approverChecklistKey(options.userId, options.submissionId)
  const backend = options.backend === undefined ? defaultBackend() : options.backend
  // The in-memory source of truth once storage is unavailable: a failing or
  // missing backend degrades the store to session-only behavior — the state
  // this session saved or read keeps serving until the store is recreated.
  let memory = emptyState()
  let degraded = backend === null

  return {
    key,

    read(): ApproverChecklistState {
      if (degraded) {
        return memory
      }
      let raw: string | null
      try {
        raw = backend!.getItem(key) ?? null
      }
      catch {
        degraded = true
        return memory
      }
      memory = parseApproverChecklistState(raw)
      return memory
    },

    save(state: ApproverChecklistState): boolean {
      const normalized: ApproverChecklistState = {
        checklist: state.checklist,
        note: normalizeStoredNote(state.note ?? ''),
      }
      memory = normalized
      if (degraded) {
        return false
      }
      try {
        if (isFullyCleared(normalized)) {
          backend!.removeItem(key)
          memory = emptyState()
        }
        else {
          backend!.setItem(key, serializeApproverChecklistState(normalized))
        }
        return true
      }
      catch {
        // Quota, disabled storage… the state stays in memory for the
        // session; the caller keeps working without an error surfacing.
        degraded = true
        return false
      }
    },
  }
}
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  APPROVER_CHECKLIST_NOTE_MAX,
  approverChecklistDeltaFromEvent,
  approverChecklistKey,
  createApproverChecklistStorage,
  parseApproverChecklistState,
  serializeApproverChecklistState,
  type ApproverChecklistState,
  type ApproverChecklistStorageBackend,
} from '~/components/review/approver-checklist-storage'

const USER = 'u-1'
const OTHER_USER = 'u-2'
const SUBMISSION = 's-1'
const OTHER_SUBMISSION = 's-2'

function state(
  checklist: ApproverChecklistState['checklist'] = {},
  note: string | null = null,
): ApproverChecklistState {
  return { checklist, note }
}

function store(backend: FakeStorage, userId = USER, submissionId = SUBMISSION) {
  return createApproverChecklistStorage({ userId, submissionId, backend })
}

/** In-memory `localStorage` stand-in over the module's minimal Storage
 *  surface, mirroring the review-queue module's in-memory fake precedent.
 *  Honors the browser contract (missing key reads as null, values are
 *  strings) and can be told to throw on any operation, so the tests exercise
 *  the storage-disabled and quota-exceeded degradation paths with a real
 *  `Storage`-shaped object. */
class FakeStorage implements ApproverChecklistStorageBackend {
  private entries = new Map<string, string>()
  failGet = false
  failSet = false
  failRemove = false

  getItem(key: string): string | null {
    if (this.failGet) {
      throw new Error('storage disabled')
    }
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.failSet) {
      throw new Error('quota exceeded')
    }
    this.entries.set(key, value)
  }

  removeItem(key: string): void {
    if (this.failRemove) {
      throw new Error('storage disabled')
    }
    this.entries.delete(key)
  }

  raw(key: string): string | null {
    return this.entries.get(key) ?? null
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('approverChecklistKey', () => {
  it('composes the deterministic per-viewer, per-submission key', () => {
    expect(approverChecklistKey(USER, SUBMISSION)).toBe(`approver-checklist:${USER}:${SUBMISSION}`)
  })

  it('separates accounts and submissions on the same browser', () => {
    const mine = approverChecklistKey(USER, SUBMISSION)
    expect(approverChecklistKey(OTHER_USER, SUBMISSION)).not.toBe(mine)
    expect(approverChecklistKey(USER, OTHER_SUBMISSION)).not.toBe(mine)
  })
})

describe('save and read round-trip', () => {
  it('persists the full state immediately and reads it back exactly', () => {
    const backend = new FakeStorage()
    const s = store(backend)
    const saved = state({ naming: [true, false, true], other: [false] }, 'Jumpstat blocks look consistent')

    expect(s.save(saved)).toBe(true)
    expect(backend.raw(s.key)).not.toBeNull()
    expect(s.read()).toEqual(saved)
  })

  it('stores exactly the section payload shape under the key', () => {
    const backend = new FakeStorage()
    const s = store(backend)

    s.save(state({ naming: [true, false] }, 'note'))

    expect(backend.raw(s.key)).toBe(
      JSON.stringify({ checklist: { naming: [true, false] }, note: 'note' }),
    )
  })

  it('trims the note when saving', () => {
    const s = store(new FakeStorage())
    s.save(state({}, '  port looks clean  '))
    expect(s.read()).toEqual(state({}, 'port looks clean'))
  })

  it('normalizes an empty or whitespace-only note to null', () => {
    const s = store(new FakeStorage())
    for (const note of ['', '   ', '\t\r\n  ']) {
      s.save(state({}, note))
      expect(s.read()).toEqual(state({}, null))
    }
  })

  it('clamps an over-long note to 2000 characters instead of failing', () => {
    const s = store(new FakeStorage())
    const long = 'x'.repeat(2500)

    expect(s.save(state({}, long))).toBe(true)
    expect(s.read().note?.length).toBe(APPROVER_CHECKLIST_NOTE_MAX)
    expect(s.read().note).toBe('x'.repeat(2000))
  })

  it('two tabs of the same submission share one backend view', () => {
    const backend = new FakeStorage()
    const tabA = createApproverChecklistStorage({ userId: USER, submissionId: SUBMISSION, backend })
    const tabB = createApproverChecklistStorage({ userId: USER, submissionId: SUBMISSION, backend })

    tabA.save(state({ naming: [true, false] }, 'from A'))

    expect(tabB.read()).toEqual(state({ naming: [true, false] }, 'from A'))
  })

  it('two accounts on the same browser never share state', () => {
    const backend = new FakeStorage()
    const accountA = createApproverChecklistStorage({ userId: USER, submissionId: SUBMISSION, backend })
    const accountB = createApproverChecklistStorage({ userId: OTHER_USER, submissionId: SUBMISSION, backend })

    accountA.save(state({ naming: [true] }, 'private to A'))

    expect(accountB.read()).toEqual(state())
  })
})

describe('clear semantics', () => {
  it('reads as the empty state when the key is absent (never saved)', () => {
    expect(store(new FakeStorage()).read()).toEqual(state())
  })

  it('removes the key when every tick is off and the note is empty', () => {
    const backend = new FakeStorage()
    const s = store(backend)
    s.save(state({ naming: [true, false] }, 'note'))
    expect(backend.raw(s.key)).not.toBeNull()

    const saved = s.save(state({ naming: [false, false] }, ''))

    expect(saved).toBe(true)
    expect(backend.raw(s.key)).toBeNull()
    expect(s.read()).toEqual(state())
  })

  it('removes the key for an empty checklist with a blank note', () => {
    const backend = new FakeStorage()
    const s = store(backend)
    s.save(state({ naming: [true] }, null))
    s.save(state({}, '   '))
    expect(backend.raw(s.key)).toBeNull()
  })

  it('keeps the key while any single tick is set or any note exists', () => {
    const backend = new FakeStorage()
    const s = store(backend)
    s.save(state({ naming: [false, false] }, 'pending note'))
    expect(backend.raw(s.key)).not.toBeNull()

    s.save(state({ naming: [false, true] }, null))
    expect(backend.raw(s.key)).not.toBeNull()
  })
})

describe('parseApproverChecklistState (resilience)', () => {
  it('reads absent and null values as the empty state', () => {
    expect(parseApproverChecklistState(null)).toEqual(state())
  })

  it('reads corrupt JSON as the empty state without throwing', () => {
    for (const raw of ['{', '{"checklist": ', '{not json', '"just a string"', '42', '[1,2,3]']) {
      expect(parseApproverChecklistState(raw)).toEqual(state())
    }
  })

  it('reads foreign shapes as the empty state', () => {
    for (const raw of [
      '{}', // checklist field missing entirely
      '{"checklist": "naming"}', // non-object checklist
      '{"checklist": [true, false]}', // array checklist
      '{"checklist": {"naming": "nope"}}', // non-array group value
      '{"checklist": {"naming": [true, "yes"]}}', // non-boolean tick
      '{"checklist": {}, "note": 42}', // non-string, non-null note
    ]) {
      expect(parseApproverChecklistState(raw)).toEqual(state())
    }
  })

  it('keeps a valid payload, normalizing the stored note on read', () => {
    const raw = JSON.stringify({ checklist: { naming: [true, false] }, note: '  tidy  ' })
    expect(parseApproverChecklistState(raw)).toEqual(state({ naming: [true, false] }, 'tidy'))
  })

  it('serializes back to the exact payload (parse(serialize(x)) === x)', () => {
    const payload = state({ naming: [true, false, true] }, 'ok')
    expect(parseApproverChecklistState(serializeApproverChecklistState(payload))).toEqual(payload)
  })
})

describe('approverChecklistDeltaFromEvent (cross-tab)', () => {
  const key = approverChecklistKey(USER, SUBMISSION)

  it('ignores events for any other key', () => {
    expect(approverChecklistDeltaFromEvent({ key: 'some-other-key', oldValue: null, newValue: null }, key)).toBeNull()
    expect(
      approverChecklistDeltaFromEvent(
        { key: approverChecklistKey(OTHER_USER, SUBMISSION), oldValue: null, newValue: '"x"' },
        key,
      ),
    ).toBeNull()
  })

  it('derives a ticks-only delta when only the ticks changed', () => {
    const event = {
      key,
      oldValue: JSON.stringify(state({ naming: [true, false] }, 'same')),
      newValue: JSON.stringify(state({ naming: [true, true] }, 'same')),
    }
    expect(approverChecklistDeltaFromEvent(event, key)).toEqual({ checklist: { naming: [true, true] } })
  })

  it('derives a note-only delta when only the note changed', () => {
    const event = {
      key,
      oldValue: JSON.stringify(state({ naming: [true] }, 'old')),
      newValue: JSON.stringify(state({ naming: [true] }, 'new')),
    }
    expect(approverChecklistDeltaFromEvent(event, key)).toEqual({ note: 'new' })
  })

  it('derives both fields when both changed', () => {
    const event = {
      key,
      oldValue: JSON.stringify(state({ naming: [true] }, 'old')),
      newValue: JSON.stringify(state({ naming: [false] }, 'new')),
    }
    expect(approverChecklistDeltaFromEvent(event, key)).toEqual({ checklist: { naming: [false] }, note: 'new' })
  })

  it('returns null when the event changed nothing adoptable', () => {
    const value = JSON.stringify(state({ naming: [true] }, 'same'))
    expect(approverChecklistDeltaFromEvent({ key, oldValue: value, newValue: value }, key)).toBeNull()
  })

  it('reports both fields when the key is newly created with content', () => {
    const event = {
      key,
      oldValue: null,
      newValue: JSON.stringify(state({ naming: [true] }, 'new')),
    }
    expect(approverChecklistDeltaFromEvent(event, key)).toEqual({ checklist: { naming: [true] }, note: 'new' })
  })

  it('resets every field that had content when another tab removes the key', () => {
    const event = {
      key,
      oldValue: JSON.stringify(state({ naming: [true] }, 'bye')),
      newValue: null,
    }
    expect(approverChecklistDeltaFromEvent(event, key)).toEqual({ checklist: {}, note: null })
  })

  it('reports nothing when a removed key already held an empty state', () => {
    expect(approverChecklistDeltaFromEvent({ key, oldValue: null, newValue: null }, key)).toBeNull()
  })

  it('resets changed fields when another tab writes corrupt data under the key', () => {
    const event = {
      key,
      oldValue: JSON.stringify(state({ naming: [true] }, 'ok')),
      newValue: '{corrupt',
    }
    expect(approverChecklistDeltaFromEvent(event, key)).toEqual({ checklist: {}, note: null })
  })
})

describe('graceful degradation', () => {
  it('defaults to window.localStorage when it exists', () => {
    const backend = new FakeStorage()
    vi.stubGlobal('window', { localStorage: backend })
    const s = createApproverChecklistStorage({ userId: USER, submissionId: SUBMISSION })

    expect(s.save(state({ naming: [true] }, null))).toBe(true)
    expect(backend.raw(s.key)).not.toBeNull()
  })

  it('degrades to in-memory when no window exists at all (SSR, node)', () => {
    // No stubbed window: in the node test environment `window` is genuinely
    // undefined, so the default backend is null — the session-only path.
    const s = createApproverChecklistStorage({ userId: USER, submissionId: SUBMISSION })

    expect(s.save(state({ naming: [true] }, 'session only'))).toBe(false)
    expect(s.read()).toEqual(state({ naming: [true] }, 'session only'))
  })

  it('degrades to in-memory when no window or localStorage exists', () => {
    vi.stubGlobal('window', {})
    const s = createApproverChecklistStorage({ userId: USER, submissionId: SUBMISSION })

    expect(s.save(state({ naming: [true] }, 'session only'))).toBe(false)
    // No crash, and the state stays available for the session.
    expect(s.read()).toEqual(state({ naming: [true] }, 'session only'))
  })

  it('never throws on read when the backend throws, and serves the in-memory state', () => {
    const backend = new FakeStorage()
    const s = store(backend)
    s.save(state({ naming: [true] }, 'keep me'))

    backend.failGet = true
    backend.failRemove = true

    expect(() => s.read()).not.toThrow()
    expect(s.read()).toEqual(state({ naming: [true] }, 'keep me'))
  })

  it('never throws when reads fail before anything was saved', () => {
    const backend = new FakeStorage()
    const s = store(backend)
    backend.failGet = true

    expect(() => s.read()).not.toThrow()
    expect(s.read()).toEqual(state())
  })

  it('reports a failed write (quota) as false and keeps the state for the session', () => {
    const backend = new FakeStorage()
    const s = store(backend)

    backend.failSet = true

    expect(s.save(state({ naming: [true] }, 'note'))).toBe(false)
    expect(() => s.read()).not.toThrow()
    expect(s.read()).toEqual(state({ naming: [true] }, 'note'))
  })

  it('reports a failed key removal as false without losing the in-memory state', () => {
    const backend = new FakeStorage()
    const s = store(backend)

    backend.failRemove = true

    expect(s.save(state({}, null))).toBe(false)
    expect(() => s.read()).not.toThrow()
    expect(s.read()).toEqual(state())
  })
})
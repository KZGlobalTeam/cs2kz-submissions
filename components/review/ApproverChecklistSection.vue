<script setup lang="ts">
import { marked } from 'marked'

import { submissionRulesSteps } from '~/components/submission/submissionRules'
import type { SubmissionRulesStep } from '~/components/submission/submissionRules'
import type { ApproverChecklistRow } from '~/shared/types/approver-checklist'

import {
  buildChecklistPayload,
  seedChecklistGroups,
  visibleRuleGroups,
} from './approver-checklist-state'

const props = defineProps<{
  submissionId: string
  /** The submission's recorded port fact — port-group visibility is driven
   *  solely by it (no toggle, mirroring how the dialog's "is this a port?"
   *  question is replaced by the recorded fact). */
  isPort: boolean
}>()

/** The groups to render: every pre-submission rule group, all at once on one
 *  page, porting only when the submission is a port. */
const groups = computed(() => visibleRuleGroups(submissionRulesSteps, props.isPort))

// Ticks, seeded from the saved row once loaded; the Approver note at the
// bottom. `openState` tracks which group collapsibles are open — expanded by
// default.
const checklist = reactive<Record<string, boolean[]>>({})
const note = ref('')
const openState = reactive<Record<string, boolean>>(
  Object.fromEntries(groups.value.map((group) => [group.key, true])),
)

const ready = shallowRef(false)
const loadError = shallowRef(false)
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
const saveState = shallowRef<SaveState>('idle')

// Render each rule's markdown once, keyed by `${stepKey}:${ruleIndex}` — same
// single source as the pre-submission dialog.
const rendered = new Map<string, string>()
for (const step of submissionRulesSteps) {
  step.rules.forEach((rule, i) => {
    rendered.set(`${step.key}:${i}`, marked.parse(rule.text, { async: false }) as string)
  })
}

function renderedFor(group: SubmissionRulesStep): string[] {
  return group.rules.map((rule, i) => rendered.get(`${group.key}:${i}`) ?? '')
}

/**
 * Auto-save plumbing: any change schedules a debounced (~1 s) PUT of the
 * whole section state. Saves are serialized on a promise chain so a later
 * snapshot can never be overtaken by an earlier in-flight PUT (last write
 * always wins by arrival order at the server), and nothing is persisted while
 * the state still equals the loaded baseline — so an untouched (never-saved)
 * checklist never creates a row, while a genuine "reset to nothing" save
 * still persists as an explicit reset. `flush()` cancels the debounce and
 * awaits the final write, which is what makes the vote-save and unmount
 * flushes lossless.
 */
let persistedPayload = ''
let timer: ReturnType<typeof setTimeout> | null = null
let chain: Promise<void> = Promise.resolve()
let pendingSaves = 0
let sawError = false
const DEBOUNCE_MS = 1000

function enqueueSave(): Promise<void> {
  // Before the saved row has loaded there is nothing to persist, and a
  // failed load must never enable editing (the empty seed would overwrite
  // the row). Mirrors the watch guard below so vote-save/unmount flushes
  // during the load window are no-ops instead of writing a synthetic
  // empty state.
  if (!ready.value || loadError.value) {
    return Promise.resolve()
  }
  const payload = buildChecklistPayload(groups.value, checklist, note.value)
  const key = JSON.stringify(payload)
  // Nothing changed since the last persisted state (or since load).
  if (key === persistedPayload) {
    return Promise.resolve()
  }

  pendingSaves++
  saveState.value = 'saving'
  const run = chain.then(async () => {
    try {
      await $fetch(`/api/submissions/${props.submissionId}/approver-checklist`, {
        method: 'PUT',
        body: payload,
      })
      persistedPayload = key
      sawError = false
    }
    catch (error) {
      sawError = true
      throw error
    }
    finally {
      pendingSaves--
      if (pendingSaves === 0) {
        saveState.value = sawError ? 'error' : 'saved'
      }
    }
  })
  // Keep the chain alive even when a PUT fails, so the next save still runs.
  chain = run.catch(() => {})
  return run
}

/** Persist any pending change now and settle only once it has reached the
 *  server. No-op when nothing changed since the last save. */
async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  await enqueueSave()
}

watch(
  [checklist, note],
  () => {
    if (!ready.value || loadError.value) {
      return
    }
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      void enqueueSave()
    }, DEBOUNCE_MS)
  },
  { deep: true },
)

onMounted(async () => {
  try {
    const row = await $fetch<ApproverChecklistRow | null>(
      `/api/submissions/${props.submissionId}/approver-checklist`,
    )
    Object.assign(checklist, seedChecklistGroups(groups.value, row?.checklist))
    note.value = row?.note ?? ''
    persistedPayload = JSON.stringify(buildChecklistPayload(groups.value, checklist, note.value))
  }
  catch {
    // A failed load must not enable editing: persisting the (empty) seed
    // would overwrite a saved row with nothing.
    loadError.value = true
  }
  finally {
    ready.value = true
  }
})

onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  // Flush pending changes when the view unmounts (e.g. navigating away) so a
  // tick or note made right before leaving is never lost. Fire-and-forget:
  // the request completes in the background.
  void enqueueSave()
})

defineExpose({ flush })
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <div class="mb-1 flex items-center justify-between gap-2">
      <h3 class="text-lg font-semibold">Approver checklist</h3>
      <span v-if="saveState === 'saving'" class="inline-flex items-center gap-1.5 text-xs text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
        Saving…
      </span>
      <span v-else-if="saveState === 'saved'" class="inline-flex items-center gap-1.5 text-xs text-muted">
        <UIcon name="i-lucide-check" class="size-3.5 text-success" />
        Saved
      </span>
      <span v-else-if="saveState === 'error'" class="inline-flex items-center gap-1.5 text-xs text-error">
        <UIcon name="i-lucide-alert-triangle" class="size-3.5" />
        Save failed
      </span>
    </div>

    <div v-if="!ready" class="flex items-center gap-3 text-muted">
      <UIcon name="i-lucide-loader-circle" class="animate-spin" />
      <span class="text-sm">Loading checklist…</span>
    </div>

    <div
      v-else-if="loadError"
      class="flex items-center gap-2 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-sm text-error"
    >
      <UIcon name="i-lucide-alert-triangle" />
      <span>Couldn't load your checklist — refresh and try again.</span>
    </div>

    <template v-else>
      <div class="space-y-3">
        <div
          v-for="group in groups"
          :key="group.key"
          class="rounded-md border border-white/5 bg-black/20 p-3"
        >
          <UCollapsible v-model:open="openState[group.key]">
            <button
              type="button"
              :aria-expanded="openState[group.key]"
              class="flex w-full items-center justify-between gap-2 text-left"
            >
              <span class="text-sm font-semibold">{{ group.title }}</span>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 text-muted transition-transform"
                :class="openState[group.key] ? 'rotate-180' : ''"
              />
            </button>

            <template #content>
              <div class="mt-3 space-y-2 border-t border-white/5 pt-3">
                <UCheckbox
                  v-for="(html, i) in renderedFor(group)"
                  :key="i"
                  v-model="checklist[group.key]![i]"
                  class="items-start"
                >
                  <template #label>
                    <div
                      class="text-sm leading-relaxed [&_p]:m-0 [&_code]:rounded [&_code]:bg-elevated [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_strong]:font-semibold [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-0.5"
                      v-html="html"
                    />
                  </template>
                </UCheckbox>
              </div>
            </template>
          </UCollapsible>
        </div>
      </div>

      <div class="mt-4 border-t border-white/5 pt-4">
        <div class="mb-1.5 flex items-baseline justify-between gap-2">
          <label for="approver-checklist-note" class="text-sm font-medium">
            Approver note
          </label>
          <span class="text-xs text-muted">{{ note.length }}/2000</span>
        </div>
        <UTextarea
          id="approver-checklist-note"
          v-model="note"
          :rows="4"
          maxlength="2000"
          placeholder="Optional note, visible only to you"
          class="w-full"
        />
      </div>
    </template>
  </UCard>
</template>
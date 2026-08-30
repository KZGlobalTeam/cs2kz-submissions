<script setup lang="ts">
import { marked } from 'marked'

import { submissionRulesSteps } from '~/components/submission/submissionRules'
import type { SubmissionRulesStep } from '~/components/submission/submissionRules'

import {
  buildChecklistPayload,
  seedChecklistGroups,
  visibleRuleGroups,
} from './approver-checklist-state'
import {
  approverChecklistDeltaFromEvent,
  createApproverChecklistStorage,
  type ApproverChecklistStorage,
} from './approver-checklist-storage'

const props = defineProps<{
  submissionId: string
  /** The current viewer's id — it composes the per-viewer browser-storage
   *  key, so two accounts on the same browser never share checklist state. */
  userId: string
  /** The submission's recorded port fact — port-group visibility is driven
   *  solely by it (no toggle, mirroring how the dialog's "is this a port?"
   *  question is replaced by the recorded fact). */
  isPort: boolean
}>()

/** The groups to render: every pre-submission rule group, all at once on one
 *  page, porting only when the submission is a port. */
const groups = computed(() => visibleRuleGroups(submissionRulesSteps, props.isPort))

// Ticks and the Approver note at the bottom, seeded from the viewer's
// browser state for this submission and written through to it on every
// change — nothing is ever pending. `openState` tracks which group
// collapsibles are open — expanded by default.
//
// The checklist starts seeded empty (every rendered group, every rule tick
// false) so the template's `checklist[group.key]![i]` is defined from the
// very first render — the browser read that fills the real ticks happens
// client-side, in `onMounted`.
const checklist = reactive<Record<string, boolean[]>>(seedChecklistGroups(groups.value, null))
const note = ref('')
const openState = reactive<Record<string, boolean>>(
  Object.fromEntries(groups.value.map((group) => [group.key, true])),
)

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

/** The per-viewer browser store, bound only on the client (`onMounted`): the
 *  section never touches browser storage during server-side rendering.
 *  Rebound when the viewer or submission changes in place (in-page route
 *  navigation reuses the component instance), re-seeding the section. */
let store: ApproverChecklistStorage | null = null

function rebindStore(): void {
  if (!props.userId) {
    return
  }
  store = createApproverChecklistStorage({
    userId: props.userId,
    submissionId: props.submissionId,
  })
  // Seed from the viewer's saved browser state: returning in the same
  // browser prefills the ticks and note; an absent key reads as empty.
  const saved = store.read()
  Object.assign(checklist, seedChecklistGroups(groups.value, saved.checklist))
  note.value = saved.note ?? ''
}

/** Every tick and every note change is written through immediately — no
 *  debounce, no pending write, no saved/saving indicator. A fully cleared
 *  state (nothing ticked, note empty) removes the key entirely. */
watch(
  [checklist, note],
  () => {
    if (store) {
      store.save(buildChecklistPayload(groups.value, checklist, note.value))
    }
  },
  { deep: true },
)

/** Cross-tab sync: a `storage` event fired by another tab of the same
 *  submission is adopted per field (ticks, note); a removal of the key
 *  resets the section to empty — two tabs of the same submission in the
 *  same browser stay in sync. Events for other keys are ignored, and the
 *  browser never fires the event in the tab that wrote, so adopting a delta
 *  cannot echo back into the storage that produced it. */
function onStorage(event: StorageEvent): void {
  if (!store) {
    return
  }
  const delta = approverChecklistDeltaFromEvent(
    { key: event.key, oldValue: event.oldValue, newValue: event.newValue },
    store.key,
  )
  if (!delta) {
    return
  }
  if (delta.checklist) {
    Object.assign(checklist, seedChecklistGroups(groups.value, delta.checklist))
  }
  if (delta.note !== undefined) {
    note.value = delta.note ?? ''
  }
}

onMounted(() => {
  rebindStore()
  window.addEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  store = null
})

// Re-seed when the viewer or submission changes in place (navigating between
// submissions on this page reuses the component instance).
watch(
  () => [props.userId, props.submissionId],
  () => rebindStore(),
)
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <h3 class="mb-1 text-lg font-semibold">Approver checklist</h3>

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
  </UCard>
</template>
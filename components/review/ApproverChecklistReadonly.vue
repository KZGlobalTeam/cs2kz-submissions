<script setup lang="ts">
import { marked } from 'marked'

import { submissionRulesSteps } from '~/components/submission/submissionRules'
import type { SubmissionRulesStep } from '~/components/submission/submissionRules'

import {
  hasSavedContent,
  seedChecklistGroups,
  visibleRuleGroups,
} from './approver-checklist-state'
import {
  approverChecklistDeltaFromEvent,
  createApproverChecklistStorage,
  type ApproverChecklist,
  type ApproverChecklistStorage,
} from './approver-checklist-storage'

const props = defineProps<{
  submissionId: string
  /** The current viewer's id — it composes the per-viewer browser-storage
   *  key, so two accounts on the same browser never read each other's
   *  checklist state. */
  userId: string
  /** The submission's recorded port fact — the porting group renders only
   *  when the submission actually is a port, exactly like the editable
   *  section and the pre-submission dialog. */
  isPort: boolean
}>()

/** Signals the page once the saved state is known, so it can collapse the
 *  side column (and the two-column grid) when there is nothing to show — a
 *  read-only card for a never-saved approver must not leave an empty box or
 *  an empty column behind. Payload is true while the card renders content
 *  (any tick set or a non-empty note). */
const emit = defineEmits<{ loaded: [visible: boolean] }>()

/** The groups to render: every pre-submission rule group, the porting group
 *  only when the submission is a port — same single source as the editable
 *  section and the mapper dialog. */
const groups = computed(() => visibleRuleGroups(submissionRulesSteps, props.isPort))

// Ticks and note, seeded from the viewer's saved browser state; the card
// never edits them (every control below is disabled). `openState` tracks
// which group collapsibles are open — expanded by default, like the editable
// section.
const ticks = reactive<Record<string, boolean[]>>({})
const note = ref('')
const openState = reactive<Record<string, boolean>>(
  Object.fromEntries(groups.value.map((group) => [group.key, true])),
)

/** Whether the card renders anything: any tick set among the *rendered*
 *  groups or a non-empty note. Starts false — nothing renders until the
 *  client-side read resolves, so a never-saved approver never sees even a
 *  transient empty card. */
const hasContent = shallowRef(false)

// Render each rule's markdown once, keyed by `${stepKey}:${ruleIndex}` — same
// single source as the editable section and the pre-submission dialog, so the
// read-only view shows exactly the same rule texts.
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
 *  card never accesses browser storage during server-side rendering. Rebound
 *  when the viewer or submission changes in place (in-page route navigation
 *  reuses the component instance), re-reading the saved state. */
let store: ApproverChecklistStorage | null = null

/** Applies a parsed saved state and judges content from the *rendered*
 *  groups (porting dropped when the submission is not a port): ticks that
 *  can never render (e.g. a stale `porting` group on a non-port submission)
 *  must not keep the card visible as an empty box. The card only reads —
 *  nothing here writes back to storage. */
function applySaved(checklist: ApproverChecklist, savedNote: string | null): void {
  const seeded = seedChecklistGroups(groups.value, checklist)
  Object.assign(ticks, seeded)
  note.value = savedNote ?? ''
  hasContent.value = hasSavedContent(seeded, note.value)
  emit('loaded', hasContent.value)
}

function rebindStore(): void {
  if (!props.userId) {
    hasContent.value = false
    emit('loaded', false)
    return
  }
  store = createApproverChecklistStorage({
    userId: props.userId,
    submissionId: props.submissionId,
  })
  const saved = store.read()
  applySaved(saved.checklist, saved.note)
}

/** Cross-tab sync: a `storage` event fired by another tab of the same
 *  submission is adopted per field (ticks, note); a removal of the key
 *  resets the card to empty and hides it, so the never-saved rule holds
 *  live. Events for other keys are ignored. The card never writes, so
 *  adopting a delta cannot echo back into the storage that produced it. */
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
  // Re-seed from the adopted delta: the current ticks when the event did not
  // touch the checklist, the incoming ticks when it did — same for the note.
  applySaved(delta.checklist ?? ticks, delta.note !== undefined ? delta.note : note.value)
}

onMounted(() => {
  rebindStore()
  window.addEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  store = null
})

// Re-read when the viewer or submission changes in place (navigating between
// submissions on this page reuses the component instance).
watch(
  () => [props.userId, props.submissionId],
  () => rebindStore(),
)
</script>

<template>
  <!-- No loading shell: the card stays absent until the client-side read
       resolves, so never-saved approvers never see even a transient empty
       card. -->
  <UCard
    v-if="hasContent"
    :ui="{ body: 'p-4 sm:p-4' }"
  >
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
                :model-value="ticks[group.key]![i]"
                disabled
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

    <div v-if="note" class="mt-4 border-t border-white/5 pt-4">
      <div class="mb-1.5">
        <span class="text-sm font-medium">Approver note</span>
      </div>
      <p class="whitespace-pre-wrap text-sm leading-relaxed text-muted">
        {{ note }}
      </p>
    </div>
  </UCard>
</template>
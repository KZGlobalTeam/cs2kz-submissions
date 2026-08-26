<script setup lang="ts">
import { marked } from 'marked'

import { submissionRulesSteps } from '~/components/submission/submissionRules'
import type { SubmissionRulesStep } from '~/components/submission/submissionRules'
import type { ApproverChecklistRow } from '~/shared/types/approver-checklist'

import {
  hasSavedContent,
  seedChecklistGroups,
  visibleRuleGroups,
} from './approver-checklist-state'

const props = defineProps<{
  submissionId: string
  /** The submission's recorded port fact — the porting group renders only
   *  when the submission actually is a port, exactly like the editable
   *  section and the pre-submission dialog. */
  isPort: boolean
}>()

/** Signals the page once the row is known, so it can collapse the side
 *  column (and the two-column grid) when there is nothing to show — a
 *  read-only section for a never-saved approver must not leave an empty box
 *  or an empty column behind. Payload is true when the section renders
 *  something (saved content, or an error box when the load failed). */
const emit = defineEmits<{ loaded: [visible: boolean] }>()

/** The groups to render: every pre-submission rule group, the porting group
 *  only when the submission is a port — same single source as the editable
 *  section and the mapper dialog. */
const groups = computed(() => visibleRuleGroups(submissionRulesSteps, props.isPort))

// Ticks and note, seeded once from the saved row. `openState` tracks which
// group collapsibles are open — expanded by default, like the editable
// section.
const ticks = reactive<Record<string, boolean[]>>({})
const note = ref('')
const openState = reactive<Record<string, boolean>>(
  Object.fromEntries(groups.value.map((group) => [group.key, true])),
)

const ready = shallowRef(false)
const hasContent = shallowRef(false)
const loadError = shallowRef(false)

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

onMounted(async () => {
  try {
    const row = await $fetch<ApproverChecklistRow | null>(
      `/api/submissions/${props.submissionId}/approver-checklist`,
    )
    if (row) {
      // Seed against the *rendered* groups (porting dropped when the
      // submission is not a port), then judge content from that view: ticks
      // that can never render (e.g. a foreign PUT storing `porting` ticks on
      // a non-port row) must not keep the card visible as an empty box.
      const seeded = seedChecklistGroups(groups.value, row.checklist)
      Object.assign(ticks, seeded)
      note.value = row.note ?? ''
      hasContent.value = hasSavedContent(seeded, note.value)
    }
    else {
      hasContent.value = false
    }
  }
  catch {
    // A failed load must never masquerade as "never saved": surface it, don't
    // fabricate an empty box.
    loadError.value = true
  }
  finally {
    ready.value = true
    emit('loaded', hasContent.value || loadError.value)
  }
})
</script>

<template>
  <!-- No loading shell: the column stays collapsed until the row resolves, so
       never-saved approvers never see even a transient empty card. -->
  <UCard
    v-if="ready && (hasContent || loadError)"
    :ui="{ body: 'p-4 sm:p-4' }"
  >
    <h3 class="mb-1 text-lg font-semibold">Approver checklist</h3>
    <p class="mb-4 text-xs text-muted">
      Private to you — kept read-only once this submission left review.
    </p>

    <div
      v-if="loadError"
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
    </template>
  </UCard>
</template>
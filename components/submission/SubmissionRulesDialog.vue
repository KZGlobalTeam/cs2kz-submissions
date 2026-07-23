<script setup lang="ts">
import { marked } from 'marked'
import { submissionRulesSteps } from './submissionRules'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** Emitted once the mapper has acknowledged every step. */
  proceed: []
}>()

const steps = submissionRulesSteps

// Render each rule's markdown once. keyed by `${stepKey}:${ruleIndex}`.
const renderedRules = new Map<string, string>()
for (const step of steps) {
  step.rules.forEach((rule, i) => {
    renderedRules.set(`${step.key}:${i}`, marked.parse(rule.text, { async: false }) as string)
  })
}

const introPrompt =
  'Please read the rules carefully and ensure that your map meets the criteria before submitting it. Otherwise, your map may be rejected.'

// Track checkbox state per step as an object keyed by step key -> boolean[].
const checked = reactive<Record<string, boolean[]>>(
  Object.fromEntries(steps.map((step) => [step.key, step.rules.map(() => false)])),
)

// Porting question answer: undefined = unanswered, 'yes' / 'no'.
const isPort = shallowRef<'yes' | 'no' | undefined>(undefined)

const stepIndex = shallowRef(0)
const currentStep = computed(() => steps[stepIndex.value]!)
const isLastStep = computed(() => stepIndex.value === steps.length - 1)
// The checkbox array for the current step (never undefined for known steps).
const currentChecked = computed(() => checked[currentStep.value.key]!)
// Pre-rendered markdown HTML for the current step's rules.
const currentRendered = computed(() =>
  currentStep.value.rules.map((rule, i) => renderedRules.get(`${currentStep.value.key}:${i}`) ?? ''),
)

function resetState() {
  for (const step of steps) {
    checked[step.key] = step.rules.map(() => false)
  }
  isPort.value = undefined
  stepIndex.value = 0
}

// Whenever the modal opens, start fresh.
watch(
  () => props.open,
  (open) => {
    if (open) resetState()
  },
)

const showPortRules = computed(
  () => currentStep.value.askIsPort && isPort.value === 'yes',
)

const stepComplete = computed(() => {
  const step = currentStep.value
  if (step.askIsPort) {
    if (isPort.value === undefined) return false
    // Not a port → this step is satisfied, rules are skipped.
    if (isPort.value === 'no') return true
  }
  return checked[step.key]!.every(Boolean)
})

const portOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

function next() {
  if (!stepComplete.value) return
  if (isLastStep.value) {
    emit('update:open', false)
    emit('proceed')
    return
  }
  stepIndex.value += 1
}

function back() {
  if (stepIndex.value > 0) stepIndex.value -= 1
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="`Submission Rules — Step ${stepIndex + 1} of ${steps.length}`"
    :dismissible="false"
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <!-- Shared intro prompt, shown on every step -->
      <UAlert
        variant="soft"
        color="warning"
        :description="introPrompt"
        class="mb-4"
      />

      <div class="mb-2 flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">{{ currentStep.title }}</h2>
        <UBadge
          variant="subtle"
          color="neutral"
          :label="`${stepIndex + 1} / ${steps.length}`"
        />
      </div>

      <!-- Porting question first -->
      <div v-if="currentStep.askIsPort" class="mb-4">
        <URadioGroup
          v-model="isPort"
          :items="portOptions"
          legend="Is this map a port of an existing map?"
          class="text-sm"
        />
        <p
          v-if="isPort === 'no'"
          class="mt-2 text-sm text-muted"
        >
          Since this is not a port, you can skip this section and continue.
        </p>
      </div>

      <!-- Rules to tick through (hidden for non-ports) -->
      <div
        v-if="!currentStep.askIsPort || showPortRules"
        class="space-y-2"
      >
        <UCheckbox
          v-for="(html, i) in currentRendered"
          :key="i"
          v-model="currentChecked[i]"
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

    <template #footer>
      <div class="flex w-full justify-between gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancel"
          @click="close"
        />
        <div class="flex items-center gap-2">
          <UButton
            v-if="stepIndex > 0"
            variant="outline"
            color="neutral"
            label="Back"
            @click="back"
          />
          <UButton
            :label="isLastStep ? 'Start Submission' : 'Next'"
            :disabled="!stepComplete"
            @click="next"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

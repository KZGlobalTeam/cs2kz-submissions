<script setup lang="ts">
const emit = defineEmits<{
  created: []
}>()

const name = shallowRef('')
const notes = shallowRef('')
const creating = shallowRef(false)

async function createRelease() {
  creating.value = true
  try {
    await $fetch('/api/releases', {
      method: 'POST',
      body: {
        name: name.value,
        notes: notes.value || null,
      },
    })
    name.value = ''
    notes.value = ''
    emit('created')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <section class="panel rounded-[1.5rem] p-5">
    <div class="mb-4">
      <h2 class="text-xl font-semibold">Create Release</h2>
      <p class="mt-2 text-sm text-muted">将 approved submissions 组织进一个 release，并导出 JSON。</p>
    </div>

    <div class="grid gap-4">
      <input v-model="name" class="field-input" placeholder="Release name" />
      <textarea v-model="notes" class="field-input min-h-24" placeholder="Notes" />
      <div class="flex justify-end">
        <button class="primary-button" type="button" :disabled="creating" @click="createRelease">
          {{ creating ? 'Creating...' : 'Create Release' }}
        </button>
      </div>
    </div>
  </section>
</template>

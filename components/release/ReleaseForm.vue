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
  <UCard>
    <h2 class="mb-4 text-lg font-semibold">Create Release</h2>
    <div class="grid gap-4">
      <UInput v-model="name" placeholder="Release name" class="w-full" />
      <UTextarea v-model="notes" :rows="3" placeholder="Notes" class="w-full" />
      <div class="flex justify-end">
        <UButton
          label="Create Release"
          icon="i-lucide-plus"
          :loading="creating"
          @click="createRelease"
        />
      </div>
    </div>
  </UCard>
</template>

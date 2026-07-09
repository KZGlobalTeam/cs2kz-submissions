<script setup lang="ts">
const steamId64 = shallowRef('')
const role = shallowRef<'approver' | 'lead_approver'>('approver')

const { data: approvers, refresh } = await useAsyncData('approvers', () =>
  $fetch('/api/admin/approvers'),
)

async function addApprover() {
  await $fetch('/api/admin/approvers', {
    method: 'POST',
    body: {
      steamId64: steamId64.value,
      role: role.value,
    },
  })

  steamId64.value = ''
  await refresh()
}

async function removeApprover(item: { steamId64: string; role: string }) {
  await $fetch(`/api/admin/approvers/${item.steamId64}?role=${item.role}`, {
    method: 'DELETE',
  })
  await refresh()
}
</script>

<template>
  <section class="grid gap-6">
    <div class="panel rounded-[1.5rem] p-5">
      <h2 class="text-xl font-semibold">Add Approver</h2>
      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_220px_auto]">
        <input v-model="steamId64" class="field-input" placeholder="SteamID64" />
        <select v-model="role" class="field-input">
          <option value="approver">approver</option>
          <option value="lead_approver">lead_approver</option>
        </select>
        <button class="primary-button" type="button" @click="addApprover">
          Save
        </button>
      </div>
    </div>

    <div class="panel rounded-[1.5rem] p-5">
      <h2 class="text-xl font-semibold">Current Roles</h2>
      <div class="mt-4 space-y-3">
        <div
          v-for="item in approvers ?? []"
          :key="`${item.steamId64}-${item.role}`"
          class="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4"
        >
          <div>
            <p class="font-medium">{{ item.displayName }}</p>
            <p class="text-sm text-muted">{{ item.steamId64 }} · {{ item.role }}</p>
          </div>
          <button class="secondary-button text-xs" type="button" @click="removeApprover(item)">
            Remove
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

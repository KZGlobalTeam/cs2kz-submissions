<script setup lang="ts">
const { session, refreshSession, logout, isApprover, isLeadApprover } = useSession()

await callOnce(async () => {
  await refreshSession()
})

const navigation = computed(() => {
  const items = [
    { label: 'Submissions', to: '/submissions' },
    { label: 'New Submission', to: '/submissions/new' },
  ]

  if (isLeadApprover.value) {
    items.push({ label: 'Releases', to: '/releases' })
    items.push({ label: 'Approvers', to: '/admin/approvers' })
  } else if (isApprover.value) {
    items.push({ label: 'Review Queue', to: '/submissions' })
  }

  return items
})
</script>

<template>
  <div class="min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-6">
      <aside class="panel hidden w-72 rounded-[1.5rem] p-5 lg:block">
        <div class="mb-8">
          <p class="text-xs uppercase tracking-[0.35em] text-muted">CS2KZ</p>
          <h1 class="mt-3 text-2xl font-semibold">Map Review Console</h1>
          <p class="mt-2 text-sm text-muted">
            Mapper 提交、Approver 审核、Lead 发布导出。
          </p>
        </div>

        <nav class="space-y-2">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="block rounded-2xl border border-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:border-accent/40 hover:bg-white/5"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </aside>

      <div class="flex-1">
        <header class="panel mb-6 flex items-center justify-between rounded-[1.5rem] px-5 py-4">
          <div>
            <p class="text-xs uppercase tracking-[0.35em] text-muted">Control Room</p>
            <p class="mt-2 text-sm text-zinc-300">
              {{ session.user ? `当前用户：${session.user.name}` : '未登录' }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <NuxtLink
              v-if="!session.user"
              to="/"
              class="secondary-button text-sm"
            >
              登录
            </NuxtLink>
            <button
              v-else
              class="secondary-button text-sm"
              type="button"
              @click="logout"
            >
              退出登录
            </button>
          </div>
        </header>

        <main>
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

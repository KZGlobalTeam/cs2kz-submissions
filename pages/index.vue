<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { session, refreshSession } = useSession()

await callOnce(async () => {
  await refreshSession()
})
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 lg:px-6">
    <div class="grid w-full gap-6 lg:grid-cols-[1.3fr_0.9fr]">
      <section class="panel rounded-[2rem] p-8">
        <p class="text-xs uppercase tracking-[0.45em] text-muted">CS2KZ Internal Workflow</p>
        <h1 class="mt-4 max-w-3xl text-5xl font-semibold leading-tight">
          地图提交、审核、最终放行与 release 导出，在一个工作台里完成。
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-7 text-zinc-300">
          支持 mapper 提交 map、approver 针对每个 course 的 CKZ/VNL filters 投票、lead approver 汇总结果后批准或拒绝，并将 approved submissions 组成 release 导出为 JSON。
        </p>
      </section>

      <section class="panel rounded-[2rem] p-8">
        <h2 class="text-2xl font-semibold">Steam Login</h2>
        <p class="mt-3 text-sm text-muted">
          所有用户通过 Steam 登录。Lead approver 可在后台管理 approver 角色成员。
        </p>

        <div class="mt-8">
          <a
            v-if="!session.authenticated"
            class="primary-button inline-flex"
            href="/api/auth/login"
          >
            Sign In With Steam
          </a>

          <NuxtLink
            v-else
            class="primary-button inline-flex"
            to="/submissions"
          >
            Enter Dashboard
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

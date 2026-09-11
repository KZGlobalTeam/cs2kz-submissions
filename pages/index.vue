<script setup lang="ts">
import GamePicker from '~/components/common/GamePicker.vue'
import {
  coerceGame,
  PREFERRED_GAME_COOKIE,
  PREFERRED_GAME_COOKIE_MAX_AGE,
  resolvePostLoginPath,
} from '~/shared/utils/games'
import type { Game } from '~/shared/schemas/game'

definePageMeta({
  layout: false,
})

const { session, refreshSession } = useSession()
const preference = useCookie<string | null>(PREFERRED_GAME_COOKIE, {
  maxAge: PREFERRED_GAME_COOKIE_MAX_AGE,
})

// The picker's current selection, seeded from the stored preference (CS2 the
// very first time, when no cookie exists yet). Selecting a game here chooses
// the landing — it never changes the game mid-session.
const selected = ref<Game>(coerceGame(preference.value))

const checking = ref(true)
const loginPending = ref(false)

function handleLogin() {
  if (loginPending.value) {
    return
  }

  // Record the landing preference first, so the Steam callback (which reads
  // the cookie server-side after the OpenID round-trip) lands the user in the
  // picked game. The cookie is site-wide, so it survives the trip to Steam
  // and back.
  preference.value = selected.value

  loginPending.value = true
  void navigateTo('/api/auth/login', {
    external: true,
  })
}

void (async () => {
  await callOnce(async () => {
    await refreshSession()
  })
  checking.value = false

  // A valid (non-expired) session means the visitor is already signed in:
  // forward straight to their preferred game's role page instead of showing
  // the login screen.
  if (session.value.authenticated) {
    const roles = session.value.user?.roles ?? []
    await navigateTo(resolvePostLoginPath(coerceGame(preference.value), roles))
  }
})()
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 lg:px-6">
    <section class="w-full max-w-3xl rounded-lg border border-white/5 bg-panel/60 p-8 lg:p-10">
      <p class="text-2xl font-semibold uppercase tracking-[0.2rem] text-gray-300">KZ Global Submission Portal</p>

      <div class="mt-8 border-t border-white/5 pt-8">
        <h1 class="text-xl font-semibold">Steam Login</h1>

        <div v-if="checking" class="mt-6 flex items-center gap-3 text-muted">
          <UIcon name="i-lucide-loader-circle" class="animate-spin" />
          <span class="text-sm">Checking session…</span>
        </div>

        <div v-else-if="!session.authenticated" class="mt-6">
          <!-- The only pre-auth game choice: the preferred-game picker above
               the Steam button. It chooses the landing, nothing more. -->
          <p class="mb-3 text-sm text-muted">Land in</p>
          <GamePicker v-model="selected" />

          <UButton
            class="mt-6"
            label="Sign In With Steam"
            :loading="loginPending"
            :disabled="loginPending"
            @click="handleLogin"
          />
        </div>
      </div>
    </section>
  </div>
</template>

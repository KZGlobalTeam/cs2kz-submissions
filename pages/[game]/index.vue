<script setup lang="ts">
import { resolvePostLoginPath } from '~/shared/utils/games'

definePageMeta({
  layout: false,
  middleware: 'auth',
})

const { session } = useSession()
const { game } = useGameRoute()

// A game root is a sign-in gate, not a page: logged-out visitors never reach
// this component — the auth middleware bounces them to the bare sign-in page.
// Signed-in visitors are routed straight to their role page of that game
// (review queue for reviewers, submissions dashboard for submitters) through
// the shared resolver.
await navigateTo(resolvePostLoginPath(game.value, session.value.user?.roles ?? []))
</script>

<template>
  <div />
</template>

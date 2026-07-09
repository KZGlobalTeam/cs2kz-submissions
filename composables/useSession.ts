import type { SessionUser } from '~/shared/types/submission'

type SessionState = {
  authenticated: boolean
  user: SessionUser | null
}

export function useSession() {
  const session = useState<SessionState>('session', () => ({
    authenticated: false,
    user: null,
  }))

  const pending = useState<boolean>('session-pending', () => false)

  async function refreshSession(): Promise<SessionState> {
    pending.value = true
    try {
      const response = import.meta.server
        ? await useRequestFetch()<SessionState>('/api/auth/session')
        : await $fetch<SessionState>('/api/auth/session')
      session.value = response
      return response
    } finally {
      pending.value = false
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    session.value = {
      authenticated: false,
      user: null,
    }
    await navigateTo('/')
  }

  const isApprover = computed(() =>
    Boolean(
      session.value.user?.roles.includes('approver') ||
        session.value.user?.roles.includes('lead_approver'),
    ),
  )

  const isLeadApprover = computed(() =>
    Boolean(session.value.user?.roles.includes('lead_approver')),
  )

  return {
    session,
    pending,
    refreshSession,
    logout,
    isApprover,
    isLeadApprover,
  }
}

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
  const logoutPending = useState<boolean>('session-logout-pending', () => false)

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
    if (logoutPending.value) {
      return
    }

    logoutPending.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      session.value = {
        authenticated: false,
        user: null,
      }
      await navigateTo('/')
    } finally {
      logoutPending.value = false
    }
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

  // Precise check: the user holds the `approver` role specifically (not just
  // the lead-implies-approver inheritance). Used for the Vote button/tab so a
  // single-role lead does not get a personal vote affordance.
  const hasApproverRole = computed(() =>
    Boolean(session.value.user?.roles.includes('approver')),
  )

  return {
    session,
    pending,
    logoutPending,
    refreshSession,
    logout,
    isApprover,
    isLeadApprover,
    hasApproverRole,
  }
}

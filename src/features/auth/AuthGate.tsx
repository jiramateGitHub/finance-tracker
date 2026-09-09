import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  getAuthErrorMessage,
  isFirebaseConfigured,
  loginWithEmail,
  logout as logoutFromFirebase,
  registerWithEmail,
  resetPassword,
  subscribeToAuthState,
  type AuthUser,
} from '../../services/firebase/authService'
import { th } from '../../i18n/th'
import { LoginScreen } from './LoginScreen'

type AuthGateChildren = {
  user: AuthUser
  logout: () => Promise<void>
}

type AuthGateProps = {
  children: (auth: AuthGateChildren) => ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const configured = isFirebaseConfigured()
  const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true'
  const [user, setUser] = useState<AuthUser | null>(() => (
    isDemo ? ({ uid: 'demo-user', email: 'demo@example.com' } as unknown as AuthUser) : null
  ))
  const [initializing, setInitializing] = useState(() => !isDemo)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) return
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser)
      setInitializing(false)
    })
    return unsubscribe
  }, [isDemo])

  const runAuthAction = useCallback(async (action: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try {
      await action()
      return true
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await runAuthAction(async () => {
        await loginWithEmail(email, password)
      })
    },
    [runAuthAction],
  )

  const handleRegister = useCallback(
    async (email: string, password: string) => {
      await runAuthAction(async () => {
        await registerWithEmail(email, password)
      })
    },
    [runAuthAction],
  )

  const handleResetPassword = useCallback(
    async (email: string) => {
      return runAuthAction(async () => {
        await resetPassword(email)
      })
    },
    [runAuthAction],
  )

  const handleLogout = useCallback(async () => {
    await runAuthAction(async () => {
      await logoutFromFirebase()
    })
  }, [runAuthAction])

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-finance-bg px-4 text-sm font-extrabold text-finance-muted">
        {th.auth.checking}
      </div>
    )
  }

  if (!user) {
    return (
      <LoginScreen
        configured={configured}
        loading={loading}
        error={error}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onResetPassword={handleResetPassword}
      />
    )
  }

  return children({ user, logout: handleLogout })
}

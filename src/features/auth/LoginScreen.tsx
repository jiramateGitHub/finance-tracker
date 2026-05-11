import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { TextInput } from '../../components/ui/TextInput'
import { th } from '../../i18n/th'

type LoginScreenProps = {
  configured: boolean
  loading: boolean
  error: string | null
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (email: string, password: string) => Promise<void>
  onResetPassword: (email: string) => Promise<boolean>
}

type AuthMode = 'login' | 'register'

export function LoginScreen({ configured, loading, error, onLogin, onRegister, onResetPassword }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const title = mode === 'login' ? th.auth.signIn : th.auth.createAccount
  const primaryLabel = mode === 'login' ? th.auth.signIn : th.auth.register
  const isBusy = loading || !configured

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    if (mode === 'login') {
      await onLogin(email.trim(), password)
      return
    }
    await onRegister(email.trim(), password)
  }

  async function handleResetPassword(): Promise<void> {
    setMessage(null)
    const sent = await onResetPassword(email.trim())
    if (sent) setMessage(th.auth.resetSent)
  }

  return (
    <div className="min-h-screen bg-finance-bg px-4 py-8 text-finance-text">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <section className="w-full rounded-[24px] border border-blue-100 bg-white p-5 shadow-finance-sm sm:p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">{th.app.name}</p>
            <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
          </div>

          {!configured ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
              {th.auth.notConfigured}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">
              {message}
            </div>
          ) : null}

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <FormField label={th.auth.email}>
              <TextInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </FormField>

            <FormField label={th.auth.password}>
              <TextInput
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </FormField>

            <Button type="submit" variant="primary" disabled={isBusy}>
              {loading ? th.auth.wait : primaryLabel}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="light"
              size="sm"
              onClick={() => {
                setMessage(null)
                setMode(mode === 'login' ? 'register' : 'login')
              }}
              disabled={loading}
            >
              {mode === 'login' ? th.auth.createAccount : th.auth.backToSignIn}
            </Button>
            <Button type="button" variant="light" size="sm" onClick={handleResetPassword} disabled={isBusy || !email.trim()}>
              {th.auth.resetPassword}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

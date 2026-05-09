import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './features/auth/AuthGate.tsx'
import { FinanceDataProvider } from './state/FinanceDataProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      {({ user, logout }) => (
        <FinanceDataProvider userId={user.uid}>
          <App currentUserId={user.uid} currentUserEmail={user.email ?? user.uid} onLogout={logout} />
        </FinanceDataProvider>
      )}
    </AuthGate>
  </StrictMode>,
)

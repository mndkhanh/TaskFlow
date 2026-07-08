import { useAuth } from './context/AuthContext'
import LoginPage from './components/LoginPage'
import AccessDenied from './components/AccessDenied'
import Dashboard from './components/Dashboard'

function FullScreen({ children }) {
  return (
    <div className="grid min-h-svh place-items-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
      {children}
    </div>
  )
}

export default function App() {
  const { loading, adminResolved, isAuthenticated, isAdmin } = useAuth()

  // Resolving the initial session, or confirming admin status for a fresh sign-in.
  if (loading || (isAuthenticated && !adminResolved)) {
    return <FullScreen>Loading…</FullScreen>
  }

  if (!isAuthenticated) return <LoginPage />
  if (!isAdmin) return <AccessDenied />
  return <Dashboard />
}

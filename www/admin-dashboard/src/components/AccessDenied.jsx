import { useAuth } from '../context/AuthContext'

// Signed in, but not an admin.
export default function AccessDenied() {
  const { user, logout } = useAuth()
  return (
    <div className="grid min-h-svh place-items-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-xl text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          ⛔
        </div>
        <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Access denied</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span> is not an
          administrator. Ask an existing admin to grant you access.
        </p>
        <button
          onClick={logout}
          className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

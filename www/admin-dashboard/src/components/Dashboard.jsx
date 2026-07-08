import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchDashboard } from '../lib/adminApi'
import Sparkline from './Sparkline'
import ActivityChart from './ActivityChart'

const nav = [
  { label: 'Overview', icon: '▧', active: true },
  { label: 'Workspaces', icon: '▤' },
  { label: 'Users', icon: '☺' },
  { label: 'Boards', icon: '▦' },
  { label: 'Settings', icon: '⚙' },
]

const statusStyles = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  invited: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  suspended: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
}

function nfmt(n) {
  return Number(n).toLocaleString('en-US')
}

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

function shortDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          TF
        </span>
        <span className="font-semibold text-gray-900 dark:text-white">TaskFlow</span>
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {nav.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              item.active
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <span className="w-4 text-center opacity-70">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="mt-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Admin console · v0.1
      </div>
    </aside>
  )
}

function Header({ onRefresh, refreshing }) {
  const { user, logout } = useAuth()
  const initial = (user?.email ?? 'A').charAt(0).toUpperCase()
  return (
    <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Instance activity at a glance</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <span
          title={user?.email}
          className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
        >
          {initial}
        </span>
        <button
          onClick={logout}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

function StatCard({ stat }) {
  const delta = Number(stat.delta)
  const positive = delta >= 0
  const spark = (stat.spark ?? []).map(Number)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
        <span
          className={`text-xs font-medium ${
            positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {positive ? '▲' : '▼'} {Math.abs(delta)}%
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {nfmt(stat.value)}
        </span>
        {spark.length > 1 && <Sparkline data={spark} positive={positive} />}
      </div>
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      {children}
    </section>
  )
}

function Shell({ children, onRefresh, refreshing }) {
  return (
    <div className="flex min-h-svh bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onRefresh={onRefresh} refreshing={refreshing} />
        <main className="flex-1 space-y-6 p-6">{children}</main>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setError(null)
    try {
      setData(await fetchDashboard())
    } catch (e) {
      setError(e.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Shell refreshing>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</p>
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell onRefresh={load}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <p className="font-medium">Couldn’t load dashboard data</p>
          <p className="mt-1 opacity-80">{error}</p>
          <p className="mt-2 opacity-80">
            Make sure <code>supabase/db/admin_data.sql</code> has been applied to the database.
          </p>
        </div>
      </Shell>
    )
  }

  const { stats = [], activity = [], workspaces = [], recentUsers = [] } = data ?? {}

  return (
    <Shell onRefresh={load}>
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.key} stat={s} />
        ))}
      </div>

      {/* Chart + recent users */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Weekly activity" className="lg:col-span-2">
          {activity.length ? (
            <ActivityChart data={activity} />
          ) : (
            <p className="text-sm text-gray-400">No activity in the last 7 days.</p>
          )}
        </Card>

        <Card title="Recent signups">
          {recentUsers.length ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentUsers.map((u) => (
                <li key={u.email} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {(u.name ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[u.status] ?? statusStyles.active}`}>
                      {u.status}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(u.joined)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No users yet.</p>
          )}
        </Card>
      </div>

      {/* Workspaces table */}
      <Card title="Workspaces">
        {workspaces.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="pb-3 font-medium">Workspace</th>
                  <th className="pb-3 font-medium">Owner</th>
                  <th className="pb-3 font-medium">Members</th>
                  <th className="pb-3 font-medium">Boards</th>
                  <th className="pb-3 font-medium">Cards</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {workspaces.map((w) => (
                  <tr key={`${w.name}-${w.created}`} className="text-gray-700 dark:text-gray-300">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">{w.name}</td>
                    <td className="py-3">{w.owner}</td>
                    <td className="py-3">{w.members}</td>
                    <td className="py-3">{w.boards}</td>
                    <td className="py-3">{w.cards}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">{shortDate(w.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No workspaces yet.</p>
        )}
      </Card>
    </Shell>
  )
}

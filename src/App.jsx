import { useEffect, useState } from 'react'
import Dashboard from './Dashboard'
import AdminPanel from './AdminPanel'
import { useTheme } from './useTheme'

// ─── Admin password sourced from .env ─────────────────────────────────────────
// Set VITE_ADMIN_PASSWORD in your .env file.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123'

// ─── Theme Toggle: pill with Sun + Moon buttons ────────────────────────────────
function ThemeToggle({ isDark, onToggle }) {
  return (
    <div className="theme-toggle" role="group" aria-label="Toggle colour theme">

      {/* ☀️ Light mode button */}
      <button
        type="button"
        id="theme-light-btn"
        onClick={() => isDark && onToggle()}
        className={`theme-toggle-btn${!isDark ? ' active' : ''}`}
        aria-label="Switch to light mode"
        aria-pressed={!isDark}
        title="Light mode"
      >
        {/* Sun icon */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
          <line x1="12" y1="2"  x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="2"  y1="12" x2="4"  y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
        </svg>
      </button>

      {/* 🌙 Dark mode button */}
      <button
        type="button"
        id="theme-dark-btn"
        onClick={() => !isDark && onToggle()}
        className={`theme-toggle-btn${isDark ? ' active' : ''}`}
        aria-label="Switch to dark mode"
        aria-pressed={isDark}
        title="Dark mode"
      >
        {/* Moon icon */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      </button>

    </div>
  )
}

// ─── App Root ──────────────────────────────────────────────────────────────────
function App() {
  const [route, setRoute]   = useState(window.location.pathname)
  const [isAdmin, setIsAdmin] = useState(false)

  // Theme is now fully managed by the useTheme hook
  // (reads VITE_DEFAULT_THEME from .env, persists to localStorage)
  const { isDark, toggleTheme } = useTheme()

  // ── Client-side routing ──
  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setRoute(path)
  }

  const handleAdminLogin = () => {
    setIsAdmin(true)
    navigate('/admin')
  }

  const handleSignOut = () => {
    setIsAdmin(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 transition-colors duration-500 dark:bg-zinc-950 dark:text-white">

      {/* ── Layered decorative background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Tiled honeycomb */}
        <div className="absolute inset-0 honeycomb-bg" />
        {/* Warm radial glow at top */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,#fff7d6,transparent_70%)] opacity-80 dark:opacity-15" />
        {/* Drifting amber blur orbs */}
        <div
          className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl"
          style={{ animation: 'float-slow 20s ease-in-out infinite' }}
        />
        <div
          className="absolute top-16 right-16 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl"
          style={{ animation: 'float-fast 15s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-10 left-14 h-64 w-64 rounded-full bg-amber-200/35 blur-3xl"
          style={{ animation: 'float-slow 24s ease-in-out infinite' }}
        />
      </div>

      {/* ── Sticky navigation header ── */}
      <header className="sticky top-0 z-50 border-b border-amber-200/60 bg-white/85 backdrop-blur-md dark:border-amber-500/20 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">

          {/* Left: logo + brand name */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="Stitch Hive logo"
              className="h-11 w-11 rounded-full border-2 border-amber-300/70 bg-white object-contain p-0.5 shadow-sm dark:border-amber-500/40"
            />
            <div className="leading-none">
              <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-500">
                Stitch Hive
              </p>
              <h1 className="mt-0.5 text-[1.45rem] font-bold tracking-tight text-zinc-900 dark:text-white">
                Real-time Inventory
              </h1>
            </div>
          </div>

          {/* Right: nav controls */}
          <nav className="flex items-center gap-3">

            {/* Admin text link */}
            <button
              type="button"
              id="nav-admin-btn"
              onClick={() => navigate(isAdmin ? '/admin' : '/admin-login')}
              className="text-sm font-semibold text-zinc-800 transition-colors hover:text-amber-500 dark:text-zinc-200 dark:hover:text-amber-400"
            >
              Admin
            </button>

            {/* Sign out pill — visible only when authenticated */}
            {isAdmin && (
              <button
                type="button"
                id="nav-signout-btn"
                onClick={handleSignOut}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
              >
                Sign out
              </button>
            )}

            {/* Light / Dark pill toggle */}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

          </nav>
        </div>
      </header>

      {/* ── Page content ── */}
      <main>
        {route === '/' && <Dashboard />}
        {route === '/admin-login' && <AdminLogin onSuccess={handleAdminLogin} />}
        {route === '/admin' && (
          isAdmin ? <AdminPanel /> : <AdminLogin onSuccess={handleAdminLogin} />
        )}
        {route !== '/' && route !== '/admin' && route !== '/admin-login' && (
          <NotFound onBack={() => navigate('/')} />
        )}
      </main>
    </div>
  )
}

// ─── Admin Login Page ──────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setError('')
      onSuccess()
      return
    }
    setError('Incorrect password. Please try again.')
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-amber-200/70 bg-white/90 p-8 shadow-lg backdrop-blur-sm dark:border-amber-400/20 dark:bg-zinc-900/80">

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-400/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-500" fill="currentColor" aria-hidden="true">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Admin Access</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Stitch Hive inventory management</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
            >
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              className="mt-2 w-full rounded-xl border border-amber-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-amber-400 transition focus:ring-2 dark:border-amber-400/30 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-600"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            id="admin-login-btn"
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
          >
            Unlock Admin Panel
          </button>
        </form>
      </div>
    </section>
  )
}

// ─── 404 Page ──────────────────────────────────────────────────────────────────
function NotFound({ onBack }) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-20 text-center">
      <p className="text-6xl" aria-hidden="true">🐝</p>
      <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Page not found</h2>
      <p className="text-zinc-600 dark:text-zinc-400">
        The page you requested does not exist. Head back to the Stitch Hive dashboard.
      </p>
      <button
        type="button"
        id="not-found-back-btn"
        onClick={onBack}
        className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
      >
        Back to Dashboard
      </button>
    </section>
  )
}

export default App

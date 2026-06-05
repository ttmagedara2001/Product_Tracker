import { useEffect, useState } from 'react'
import Dashboard from './Dashboard'
import AdminPanel from './AdminPanel'

// ─── Admin password sourced from .env ─────────────────────────────────────────
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123'


// ─── App Root ──────────────────────────────────────────────────────────────────
function App() {
  const [route, setRoute]   = useState(window.location.pathname)
  const [isAdmin, setIsAdmin] = useState(false)

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
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" style={{ animation: 'float-slow 20s ease-in-out infinite' }} />
        <div className="absolute top-16 right-16 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" style={{ animation: 'float-fast 15s ease-in-out infinite' }} />
        <div className="absolute bottom-10 left-14 h-64 w-64 rounded-full bg-amber-200/35 blur-3xl" style={{ animation: 'float-slow 24s ease-in-out infinite' }} />

        {/* ── Tiny bee silhouettes ── */}
        {/* Bee A – top-left wander */}
        <svg viewBox="0 0 24 24" width="20" height="20" style={{ position:'absolute', top:'18%', left:'8%', opacity:0.18, animation:'wander-a 18s ease-in-out infinite' }} fill="#d97706">
          <ellipse cx="12" cy="14" rx="5" ry="4" />
          <rect x="8" y="12.5" width="8" height="1.5" rx="0.75" fill="#78350f" opacity="0.8"/>
          <circle cx="12" cy="9" r="3" />
          <ellipse cx="7" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(-20 7 10)"/>
          <ellipse cx="17" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(20 17 10)"/>
        </svg>

        {/* Bee B – bottom-right, slower */}
        <svg viewBox="0 0 24 24" width="16" height="16" style={{ position:'absolute', bottom:'24%', right:'14%', opacity:0.15, animation:'wander-b 24s ease-in-out infinite', animationDelay:'3s' }} fill="#d97706">
          <ellipse cx="12" cy="14" rx="5" ry="4" />
          <rect x="8" y="12.5" width="8" height="1.5" rx="0.75" fill="#78350f" opacity="0.8"/>
          <circle cx="12" cy="9" r="3" />
          <ellipse cx="7" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(-20 7 10)"/>
          <ellipse cx="17" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(20 17 10)"/>
        </svg>

        {/* Bee C – mid-left */}
        <svg viewBox="0 0 24 24" width="14" height="14" style={{ position:'absolute', top:'52%', left:'4%', opacity:0.13, animation:'wander-c 20s ease-in-out infinite', animationDelay:'6s' }} fill="#d97706">
          <ellipse cx="12" cy="14" rx="5" ry="4" />
          <rect x="8" y="12.5" width="8" height="1.5" rx="0.75" fill="#78350f" opacity="0.8"/>
          <circle cx="12" cy="9" r="3" />
          <ellipse cx="7" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(-20 7 10)"/>
          <ellipse cx="17" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(20 17 10)"/>
        </svg>

        {/* Bee D – top-right corner */}
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ position:'absolute', top:'12%', right:'22%', opacity:0.16, animation:'wander-d 22s ease-in-out infinite', animationDelay:'9s' }} fill="#d97706">
          <ellipse cx="12" cy="14" rx="5" ry="4" />
          <rect x="8" y="12.5" width="8" height="1.5" rx="0.75" fill="#78350f" opacity="0.8"/>
          <circle cx="12" cy="9" r="3" />
          <ellipse cx="7" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(-20 7 10)"/>
          <ellipse cx="17" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(20 17 10)"/>
        </svg>

        {/* Bee E – bottom-left */}
        <svg viewBox="0 0 24 24" width="12" height="12" style={{ position:'absolute', bottom:'12%', left:'28%', opacity:0.12, animation:'wander-e 26s ease-in-out infinite', animationDelay:'2s' }} fill="#d97706">
          <ellipse cx="12" cy="14" rx="5" ry="4" />
          <rect x="8" y="12.5" width="8" height="1.5" rx="0.75" fill="#78350f" opacity="0.8"/>
          <circle cx="12" cy="9" r="3" />
          <ellipse cx="7" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(-20 7 10)"/>
          <ellipse cx="17" cy="10" rx="4" ry="2" fill="white" opacity="0.55" transform="rotate(20 17 10)"/>
        </svg>

        {/* ── Floating hollow hexagons ── */}
        <svg viewBox="0 0 40 36" width="40" height="36" style={{ position:'absolute', top:'30%', left:'20%', animation:'hex-rise 14s ease-in-out infinite', animationDelay:'0s' }} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.14">
          <polygon points="20,2 38,11 38,29 20,38 2,29 2,11" strokeOpacity="0.7"/>
        </svg>
        <svg viewBox="0 0 32 28" width="32" height="28" style={{ position:'absolute', top:'65%', right:'30%', animation:'hex-drift 18s ease-in-out infinite', animationDelay:'4s' }} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.12">
          <polygon points="16,2 30,9 30,23 16,30 2,23 2,9" strokeOpacity="0.7"/>
        </svg>
        <svg viewBox="0 0 28 24" width="28" height="24" style={{ position:'absolute', bottom:'35%', left:'55%', animation:'hex-rise 22s ease-in-out infinite', animationDelay:'7s' }} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.11">
          <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" strokeOpacity="0.7"/>
        </svg>
        <svg viewBox="0 0 24 20" width="24" height="20" style={{ position:'absolute', top:'75%', left:'12%', animation:'hex-drift 16s ease-in-out infinite', animationDelay:'11s' }} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.1">
          <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" strokeOpacity="0.7"/>
        </svg>
      </div>

      {/* ── Sticky navigation header ── */}
      <header className="sticky top-0 z-50 border-b border-amber-200/60 bg-white/85 backdrop-blur-md dark:border-amber-500/20 dark:bg-zinc-950/80">
        {/*
          3-column grid:
            col 1 (left)   → logo
            col 2 (center) → page title, perfectly centred
            col 3 (right)  → admin + theme toggle
        */}
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-3">

          {/* ── Col 1: Logo only ── */}
          <img
            src="/assets/logo.png"
            alt="Stitch Hive logo"
            className="h-11 w-11 rounded-full border-2 border-amber-300/70 bg-white object-contain p-0.5 shadow-sm dark:border-amber-500/40"
          />

          {/* ── Col 2: Centered title ── */}
          <div className="flex flex-col items-center justify-center leading-none">
            <p className="text-[9px] font-semibold uppercase tracking-[0.42em] text-amber-500">
              Stitch Hive
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Real-time Inventory
            </h1>
          </div>

          {/* ── Col 3: Nav controls ── */}
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

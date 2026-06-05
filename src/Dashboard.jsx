import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

/* ── Inline bee SVG ─────────────────────────────────────────── */
function BeeSVG({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Body */}
      <ellipse cx="32" cy="36" rx="13" ry="10" fill="#F59E0B" />
      {/* Stripes */}
      <rect x="21" y="33" width="22" height="4" rx="2" fill="#18181B" opacity="0.7" />
      <rect x="21" y="40" width="22" height="3" rx="2" fill="#18181B" opacity="0.5" />
      {/* Head */}
      <circle cx="32" cy="24" r="7" fill="#F59E0B" />
      {/* Eyes */}
      <circle cx="29.5" cy="23" r="1.4" fill="#18181B" />
      <circle cx="34.5" cy="23" r="1.4" fill="#18181B" />
      {/* Antennae */}
      <line x1="29" y1="17" x2="24" y2="11" stroke="#18181B" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="23.5" cy="10.5" r="1.5" fill="#FBBF24" />
      <line x1="35" y1="17" x2="40" y2="11" stroke="#18181B" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="40.5" cy="10.5" r="1.5" fill="#FBBF24" />
      {/* Wings */}
      <ellipse cx="18" cy="26" rx="10" ry="5" fill="white" opacity="0.72" transform="rotate(-20 18 26)" />
      <ellipse cx="46" cy="26" rx="10" ry="5" fill="white" opacity="0.72" transform="rotate(20 46 26)" />
      {/* Stinger */}
      <path d="M32 46 L29 52 L32 50 L35 52 Z" fill="#D97706" />
    </svg>
  );
}

/* ── Small dotted bee for inside cards ─────────────────────── */
function TinyBeeSVG() {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-60" aria-hidden="true">
      <ellipse cx="16" cy="18" rx="6.5" ry="5" fill="#F59E0B" />
      <rect x="10.5" y="16.5" width="11" height="2" rx="1" fill="#18181B" opacity="0.65" />
      <circle cx="16" cy="12" r="3.5" fill="#F59E0B" />
      <ellipse cx="9" cy="13" rx="5" ry="2.5" fill="white" opacity="0.7" transform="rotate(-20 9 13)" />
      <ellipse cx="23" cy="13" rx="5" ry="2.5" fill="white" opacity="0.7" transform="rotate(20 23 13)" />
    </svg>
  );
}

/* ── Loading Hexagon Spinner ─────────────────────────────────── */
function HexSpinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points="32,4 58,18 58,46 32,60 6,46 6,18"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="3"
          strokeDasharray="10 4"
        />
      </svg>
      <p className="text-xs font-medium tracking-[0.2em] text-amber-400 uppercase">Loading…</p>
    </div>
  );
}

/* ── HexCard Component ───────────────────────────────────────── */
function HexCard({ product }) {
  return (
    <div className="hex-card">
      <div className="hex-card-inner">
        {/* Category */}
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-400">
          {product.category}
        </span>

        {/* Product name */}
        <h3 className="mt-2 text-[17px] font-bold leading-tight text-white line-clamp-2 px-2">
          {product.name}
        </h3>

        {/* Subtle divider */}
        <div className="mx-auto my-3 h-px w-8 rounded-full bg-amber-500/30" />

        {/* Stock count */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
            Stock
          </span>
          <span className="mt-0.5 text-3xl font-extrabold tracking-tight text-amber-300">
            {product.totalStock ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────── */
export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'products'), orderBy('name', 'asc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const productsData = [];
          snapshot.forEach((doc) => {
            productsData.push({ id: doc.id, ...doc.data() });
          });
          setProducts(productsData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching products:', err);
          setError('Failed to load products. Please try again.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up listener:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* ── Decorative hive cluster (right side) ── */}
      <div className="hive-cluster pointer-events-none" aria-hidden="true" />

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-14 pt-10 text-center">

        {/* Loading */}
        {loading && <HexSpinner />}

        {/* Error */}
        {error && !loading && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 dark:border-red-500/30 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No products yet.</p>
          </div>
        )}

        {/* Hexagonal product grid */}
        {!loading && products.length > 0 && (
          <div className="w-full">
            {/*
              Hex offset grid: odd columns shift down by half a card height.
              We use a CSS approach via gap + negative margin offset for the
              "honeycomb offset" look.
            */}
            <div
              className="flex flex-wrap justify-center"
              style={{ gap: '24px 12px' }}
            >
              {products.map((product, index) => (
                <div
                  key={product.id}
                  style={{
                    /* Offset every other card downward by half the card height */
                    marginTop: index % 2 === 1 ? '64px' : '0px',
                    transition: 'margin-top 0.3s ease',
                  }}
                >
                  <HexCard product={product} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

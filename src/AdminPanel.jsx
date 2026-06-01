import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  increment,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/* ─── Toast notification component ────────────────────────────── */
function Toast({ message, type, onDismiss }) {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-md
        transition-all duration-300
        ${isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300'
        }
      `}
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0 text-lg leading-none">
        {isSuccess ? '✓' : '✕'}
      </span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 text-current opacity-50 transition hover:opacity-100"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M4.47 4.47a.75.75 0 0 1 1.06 0L8 6.94l2.47-2.47a.75.75 0 1 1 1.06 1.06L9.06 8l2.47 2.47a.75.75 0 1 1-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 0 1-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 0 1 0-1.06z" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Reusable form field components ───────────────────────────── */
function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
    >
      {children}
    </label>
  );
}

const inputBase =
  'mt-1.5 w-full rounded-xl border border-amber-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-amber-400 transition placeholder-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-white dark:placeholder-zinc-500 dark:ring-amber-400 dark:focus:ring-2';

/* ─── Section card wrapper ─────────────────────────────────────── */
function SectionCard({ icon, title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-amber-200/60 bg-white/90 p-8 shadow-sm backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-900/80">
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-amber-100/80 pb-5 dark:border-zinc-700/60">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-xl dark:bg-amber-400/15">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Stat badge ────────────────────────────────────────────────── */
function StatBadge({ label, value, accent }) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-1 rounded-2xl border px-5 py-4
        ${accent
          ? 'border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-400/10'
          : 'border-zinc-200/80 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50'
        }
      `}
    >
      <p className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

/* ─── Main AdminPanel ───────────────────────────────────────────── */
export default function AdminPanel() {
  const [newProduct, setNewProduct] = useState({ name: '', category: '', initialStock: '' });
  const [updateCount, setUpdateCount] = useState({ productId: '', adjustment: '' });

  const [loading, setLoading]               = useState(false);
  const [toast, setToast]                   = useState({ message: '', type: 'success' });
  const [products, setProducts]             = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => { fetchProducts(); }, []);

  /* ── Auto-dismiss toast after 4 s ── */
  useEffect(() => {
    if (!toast.message) return;
    const id = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const dismissToast = () => setToast({ message: '', type: 'success' });

  /* ── Fetch products ── */
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const snapshot = await getDocs(
        query(collection(db, 'products'), orderBy('name', 'asc'))
      );
      setProducts(
        snapshot.docs.map((d) => ({ id: d.id, name: d.data().name, totalStock: d.data().totalStock ?? 0, category: d.data().category }))
      );
    } catch (err) {
      console.error('fetchProducts:', err);
      showToast('Failed to load products.', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  /* ── Create product ── */
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.category.trim() || newProduct.initialStock === '') {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, 'products'), {
        name:       newProduct.name.trim(),
        category:   newProduct.category.trim(),
        totalStock: parseInt(newProduct.initialStock, 10),
        createdAt:  new Date(),
      });
      showToast(`"${newProduct.name.trim()}" created successfully!`);
      setNewProduct({ name: '', category: '', initialStock: '' });
      fetchProducts();
    } catch (err) {
      console.error('createProduct:', err);
      showToast('Failed to create product. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Update stock ── */
  const handleUpdateCount = async (e) => {
    e.preventDefault();
    if (!updateCount.productId || updateCount.adjustment === '') {
      showToast('Please select a product and enter an adjustment.', 'error');
      return;
    }
    const adj = parseInt(updateCount.adjustment, 10);
    if (isNaN(adj) || adj === 0) {
      showToast('Adjustment must be a non-zero number.', 'error');
      return;
    }
    try {
      setLoading(true);
      const product = products.find((p) => p.id === updateCount.productId);
      await updateDoc(doc(db, 'products', updateCount.productId), {
        totalStock:  increment(adj),
        lastUpdated: new Date(),
      });
      const verb = adj > 0 ? `+${adj} units added to` : `${adj} units removed from`;
      showToast(`${verb} "${product?.name}"`);
      setUpdateCount({ productId: '', adjustment: '' });
      fetchProducts();
    } catch (err) {
      console.error('updateCount:', err);
      showToast('Failed to update stock. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Quick ±1 buttons ── */
  const quickAdjust = async (productId, amount) => {
    try {
      const product = products.find((p) => p.id === productId);
      await updateDoc(doc(db, 'products', productId), {
        totalStock:  increment(amount),
        lastUpdated: new Date(),
      });
      const verb = amount > 0 ? `+${amount} added to` : `${amount} removed from`;
      showToast(`${verb} "${product?.name}"`);
      fetchProducts();
    } catch (err) {
      showToast('Quick adjust failed.', 'error');
    }
  };

  /* ── Delete product ── */
  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Delete "${productName}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      showToast(`"${productName}" deleted.`);
      fetchProducts();
    } catch (err) {
      showToast('Failed to delete product.', 'error');
    }
  };

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🛠️</span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Stock Management
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create products and adjust inventory counts in real time.
        </p>
      </div>

      {/* ── Stats bar ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBadge label="Total Products" value={products.length} accent />
        <StatBadge label="Total Units" value={products.reduce((sum, p) => sum + (p.totalStock ?? 0), 0)} accent />
        <StatBadge label="Low Stock (≤10)" value={products.filter((p) => (p.totalStock ?? 0) <= 10).length} />
        <StatBadge label="Categories" value={new Set(products.map((p) => p.category)).size} />
      </div>

      {/* ── Toast ── */}
      {toast.message && (
        <div className="mb-6">
          <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
        </div>
      )}

      {/* ── Two-column forms ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ━━ Create Product ━━ */}
        <SectionCard
          icon="📦"
          title="Create New Product"
          subtitle="Add a new item to the Stitch Hive inventory"
        >
          <form onSubmit={handleCreateProduct} className="space-y-5">

            <div>
              <FieldLabel htmlFor="product-name">Product Name</FieldLabel>
              <input
                id="product-name"
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="e.g., Serviettes"
                className={inputBase}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="product-category">Category</FieldLabel>
              <input
                id="product-category"
                type="text"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                placeholder="e.g., Textiles"
                className={inputBase}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="initial-stock">Initial Stock</FieldLabel>
              <input
                id="initial-stock"
                type="number"
                value={newProduct.initialStock}
                onChange={(e) => setNewProduct({ ...newProduct, initialStock: e.target.value })}
                placeholder="0"
                min="0"
                className={inputBase}
                required
              />
            </div>

            <button
              type="submit"
              id="create-product-btn"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Creating…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 5a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0v-3H6a1 1 0 1 1 0-2h3V6a1 1 0 0 1 1-1z" />
                  </svg>
                  Create Product
                </>
              )}
            </button>
          </form>
        </SectionCard>

        {/* ━━ Update Daily Count ━━ */}
        <SectionCard
          icon="🔄"
          title="Daily Count Update"
          subtitle="Adjust inventory for an existing product"
        >
          <form onSubmit={handleUpdateCount} className="space-y-5">

            <div>
              <FieldLabel htmlFor="product-select">Select Product</FieldLabel>
              <select
                id="product-select"
                value={updateCount.productId}
                onChange={(e) => setUpdateCount({ ...updateCount, productId: e.target.value })}
                disabled={loadingProducts}
                className={`${inputBase} cursor-pointer`}
                required
              >
                <option value="">
                  {loadingProducts ? 'Loading products…' : 'Choose a product…'}
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.totalStock} units
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="adjustment">Count Change (+ to add, − to remove)</FieldLabel>
              <input
                id="adjustment"
                type="number"
                value={updateCount.adjustment}
                onChange={(e) => setUpdateCount({ ...updateCount, adjustment: e.target.value })}
                placeholder="e.g., 10 or -5"
                className={inputBase}
                required
              />
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                Positive numbers add stock; negative numbers subtract.
              </p>
            </div>

            <button
              type="submit"
              id="update-stock-btn"
              disabled={loading || loadingProducts}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Updating…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 2a1 1 0 0 1 1 1v2.101a7.002 7.002 0 0 1 11.601 2.566 1 1 0 1 1-1.885.666A5.002 5.002 0 0 0 5.999 7H9a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm.008 9.057a1 1 0 0 1 1.276.61A5.002 5.002 0 0 0 14.001 13H11a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-2.101a7.002 7.002 0 0 1-11.601-2.566 1 1 0 0 1 .61-1.276z" clipRule="evenodd" />
                  </svg>
                  Update Stock
                </>
              )}
            </button>
          </form>
        </SectionCard>
      </div>

      {/* ━━ Products Table ━━ */}
      <div className="mt-8">
        <SectionCard
          icon="📋"
          title="All Products"
          subtitle="Real-time inventory overview with quick-adjust controls"
        >
          {loadingProducts ? (
            <div className="flex items-center justify-center py-10">
              <svg className="h-8 w-8 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Loading">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-4xl" aria-hidden="true">🐝</span>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No products yet.</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Create your first product above to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-amber-100/60 dark:border-zinc-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-100/60 bg-amber-50/70 dark:border-zinc-700/50 dark:bg-zinc-800/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Product
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Category
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Stock
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Quick Adjust
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/40 dark:divide-zinc-700/40">
                  {products.map((product) => {
                    const isLow = product.totalStock <= 10;
                    return (
                      <tr
                        key={product.id}
                        className="group transition-colors hover:bg-amber-50/50 dark:hover:bg-zinc-800/40"
                      >
                        {/* Name */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {product.name}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center rounded-full bg-amber-100/70 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">
                            {product.category}
                          </span>
                        </td>

                        {/* Stock count */}
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`text-lg font-bold tabular-nums ${
                              isLow
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-zinc-900 dark:text-white'
                            }`}
                          >
                            {product.totalStock}
                          </span>
                          {isLow && (
                            <span className="ml-2 text-xs font-medium text-red-400 dark:text-red-500">
                              Low
                            </span>
                          )}
                        </td>

                        {/* Quick ±1 / ±10 */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => quickAdjust(product.id, -10)}
                              title="Remove 10"
                              className="flex h-7 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            >
                              −10
                            </button>
                            <button
                              type="button"
                              onClick={() => quickAdjust(product.id, -1)}
                              title="Remove 1"
                              className="flex h-7 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            >
                              −1
                            </button>
                            <button
                              type="button"
                              onClick={() => quickAdjust(product.id, 1)}
                              title="Add 1"
                              className="flex h-7 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => quickAdjust(product.id, 10)}
                              title="Add 10"
                              className="flex h-7 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                            >
                              +10
                            </button>
                          </div>
                        </td>

                        {/* Delete */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id, product.name)}
                            title="Delete product"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                              <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5zM4.5 3V2.5A1.5 1.5 0 0 1 6 1h4a1.5 1.5 0 0 1 1.5 1.5V3h2a.5.5 0 0 1 0 1h-.5l-.688 8.25A1.5 1.5 0 0 1 10.819 13H5.18a1.5 1.5 0 0 1-1.493-1.75L3 4h-.5a.5.5 0 0 1 0-1h2zm1 1l.688 8h4.624l.688-8H5.5z" />
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

    </section>
  );
}

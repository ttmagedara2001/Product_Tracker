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
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { jsPDF } from 'jspdf';

const DEFAULT_PALETTE = [
  { name: 'Honey', hex: '#F59E0B' },
  { name: 'Gold', hex: '#FBBF24' },
  { name: 'Crimson', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Black', hex: '#18181B' },
  { name: 'White', hex: '#F4F4F5' },
  { name: 'Brown', hex: '#78350F' },
  { name: 'Gray', hex: '#71717A' }
];

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
function SectionCard({ icon, title, subtitle, headerRight, children }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 rounded-3xl border border-amber-200/60 bg-white/90 p-5 sm:p-8 shadow-sm backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-900/80">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-amber-100/80 pb-4 sm:pb-5 dark:border-zinc-700/60">
        <div className="flex items-center gap-3">
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
        {headerRight && <div className="shrink-0">{headerRight}</div>}
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
        flex flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-3 sm:px-5 sm:py-4 text-center
        ${accent
          ? 'border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-400/10'
          : 'border-zinc-200/80 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50'
        }
      `}
    >
      <p className="text-lg sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{value}</p>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

/* ─── Main AdminPanel ───────────────────────────────────────────── */
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders'
  const [newProduct, setNewProduct] = useState({ name: '', category: '', initialStock: '', price: '', colors: [] });
  const [updateCount, setUpdateCount] = useState({ productId: '', soldCount: '', newStock: '' });

  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#fbbf24');

  const [loading, setLoading]               = useState(false);
  const [toast, setToast]                   = useState({ message: '', type: 'success' });
  const [products, setProducts]             = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Product editing modal state
  const [editingProduct, setEditingProduct] = useState(null);

  // Orders and invoices states
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [newOrder, setNewOrder] = useState({
    productId: '',
    colorHex: '',
    colorName: '',
    quantity: '1',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    shippingAddress: '',
    deliveryMethod: 'Courier',
    deliveryDate: '',
    deliveryFee: '0.00',
    unitPrice: ''
  });
  const [activeOrder, setActiveOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProducts();

    // Fetch orders in real-time
    setLoadingOrders(true);
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(
      qOrders,
      (snapshot) => {
        const ordersData = [];
        snapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() });
        });
        setOrders(ordersData);
        setLoadingOrders(false);
        // Automatically manage activeOrder selection in real-time
        setActiveOrder((current) => {
          if (!current && ordersData.length > 0) {
            return ordersData[0];
          }
          if (current && !ordersData.some((o) => o.id === current.id)) {
            return ordersData[0] || null;
          }
          if (current) {
            const updated = ordersData.find((o) => o.id === current.id);
            return updated || current;
          }
          return current;
        });
      },
      (err) => {
        console.error('fetchOrders:', err);
        setLoadingOrders(false);
      }
    );

    return () => {
      unsubscribeOrders();
    };
  }, []);

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
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            totalStock: data.totalStock ?? 0,
            category: data.category,
            price: data.price ?? 0,
            colors: data.colors ?? [],
            lastUpdated: data.lastUpdated,
            createdAt: data.createdAt
          };
        })
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
    if (!newProduct.name.trim() || !newProduct.category.trim() || newProduct.initialStock === '' || newProduct.price === '') {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, 'products'), {
        name:       newProduct.name.trim(),
        category:   newProduct.category.trim(),
        totalStock: parseInt(newProduct.initialStock, 10),
        price:      parseFloat(newProduct.price) || 0,
        colors:     newProduct.colors || [],
        createdAt:  new Date(),
      });
      showToast(`"${newProduct.name.trim()}" created successfully!`);
      setNewProduct({ name: '', category: '', initialStock: '', price: '', colors: [] });
      fetchProducts();
    } catch (err) {
      console.error('createProduct:', err);
      showToast('Failed to create product. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Save edited product ── */
  const handleSaveEditedProduct = async (id, updatedFields) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'products', id), {
        ...updatedFields,
        lastUpdated: new Date()
      });
      showToast('Product updated successfully!');
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
      showToast('Failed to update product.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Update stock ── */
  const handleUpdateCount = async (e) => {
    e.preventDefault();
    const sold    = parseInt(updateCount.soldCount, 10) || 0;
    const received = parseInt(updateCount.newStock,  10) || 0;
    if (!updateCount.productId) {
      showToast('Please select a product.', 'error');
      return;
    }
    if (sold === 0 && received === 0) {
      showToast('Enter units sold and/or new stock received.', 'error');
      return;
    }
    if (sold < 0 || received < 0) {
      showToast('Values must be positive numbers.', 'error');
      return;
    }
    const netAdj = received - sold;
    try {
      setLoading(true);
      const product = products.find((p) => p.id === updateCount.productId);
      await updateDoc(doc(db, 'products', updateCount.productId), {
        totalStock:  increment(netAdj),
        soldCount:   increment(sold),
        lastUpdated: new Date(),
      });
      const parts = [];
      if (sold     > 0) parts.push(`${sold} sold`);
      if (received > 0) parts.push(`${received} restocked`);
      showToast(`"${product?.name}" updated — ${parts.join(', ')}.`);
      setUpdateCount({ productId: '', soldCount: '', newStock: '' });
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

  /* ── Product CSV Exporter ── */
  const exportProductsToCSV = () => {
    const headers = ['Product ID', 'Product Name', 'Category', 'Stock Count', 'Unit Price (LKR)', 'Colors', 'Last Updated'];
    const rows = products.map((p) => [
      p.id,
      p.name,
      p.category,
      p.totalStock ?? 0,
      p.price ? p.price.toFixed(2) : '0.00',
      (p.colors ?? []).map((c) => `${c.name} (${c.hex})`).join('; '),
      p.lastUpdated ? (p.lastUpdated.toDate ? p.lastUpdated.toDate().toLocaleString() : new Date(p.lastUpdated).toLocaleString()) : 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stitch_hive_inventory_admin_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ── Order Product Selector Helper ── */
  const handleOrderProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewOrder({
        ...newOrder,
        productId,
        unitPrice: product.price ? String(product.price) : '0.00',
        colorHex: product.colors && product.colors.length > 0 ? product.colors[0].hex : '',
        colorName: product.colors && product.colors.length > 0 ? product.colors[0].name : '',
      });
    } else {
      setNewOrder({
        ...newOrder,
        productId: '',
        unitPrice: '',
        colorHex: '',
        colorName: ''
      });
    }
  };

  /* ── Record New Order ── */
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.productId || !newOrder.customerName.trim() || !newOrder.quantity) {
      showToast('Please select a product and enter customer name/quantity.', 'error');
      return;
    }
    
    const qty = parseInt(newOrder.quantity, 10);
    if (qty <= 0) {
      showToast('Quantity must be a positive number.', 'error');
      return;
    }

    const selectedProduct = products.find(p => p.id === newOrder.productId);
    if (!selectedProduct) return;

    if ((selectedProduct.totalStock ?? 0) < qty) {
      if (!window.confirm(`Warning: Stock for "${selectedProduct.name}" is only ${selectedProduct.totalStock}. Create order anyway?`)) {
        return;
      }
    }

    try {
      setLoading(true);
      
      const orderNumber = 'SH-' + Math.floor(100000 + Math.random() * 900000);
      
      const orderData = {
        orderNumber,
        productId: newOrder.productId,
        productName: selectedProduct.name,
        colorHex: newOrder.colorHex,
        colorName: newOrder.colorName,
        quantity: qty,
        unitPrice: parseFloat(newOrder.unitPrice) || 0,
        customerName: newOrder.customerName.trim(),
        customerPhone: newOrder.customerPhone.trim(),
        customerEmail: newOrder.customerEmail.trim(),
        shippingAddress: newOrder.shippingAddress.trim(),
        deliveryMethod: newOrder.deliveryMethod,
        deliveryDate: newOrder.deliveryDate,
        deliveryFee: parseFloat(newOrder.deliveryFee) || 0,
        status: 'pending',
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      setActiveOrder({ id: docRef.id, ...orderData });

      await updateDoc(doc(db, 'products', newOrder.productId), {
        totalStock: increment(-qty),
        soldCount: increment(qty),
        lastUpdated: new Date()
      });

      showToast(`Order ${orderNumber} created! Stock decremented by ${qty}.`);
      
      setNewOrder({
        productId: '',
        colorHex: '',
        colorName: '',
        quantity: '1',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        shippingAddress: '',
        deliveryMethod: 'Courier',
        deliveryDate: '',
        deliveryFee: '0.00',
        unitPrice: ''
      });
      
      fetchProducts();
    } catch (err) {
      console.error('createOrder:', err);
      showToast('Failed to place order. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Update Order Status ── */
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
      showToast(`Order status updated to "${newStatus}".`);
    } catch (err) {
      console.error(err);
      showToast('Failed to update status.', 'error');
    }
  };

  /* ── Delete Order ── */
  const handleDeleteOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`Delete order "${orderNumber}"?`)) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      showToast(`Order "${orderNumber}" deleted.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete order.', 'error');
    }
  };

  /* ── Download PDF Invoice ── */
  const downloadInvoicePDF = (order) => {
    const doc = new jsPDF();
    
    const primaryColor = [245, 158, 11]; // Stitch Hive Amber (#f59e0b)
    const textColor = [24, 24, 27];      // Zinc-900
    const lightTextColor = [113, 113, 122]; // Zinc-500
    
    // Top Accent Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text('STITCH HIVE', 20, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...lightTextColor);
    doc.text('Real-time Inventory & Order Invoice', 20, 36);
    
    // Invoice details on the right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...textColor);
    doc.text('INVOICE', 140, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Invoice No: INV-${order.orderNumber || order.id.slice(0, 6).toUpperCase()}`, 140, 37);
    doc.text(`Date: ${order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()) : new Date().toLocaleDateString()}`, 140, 43);
    doc.text(`Status: ${order.status?.toUpperCase() || 'PENDING'}`, 140, 49);
    
    // Line separator
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(20, 56, 190, 56);
    
    // Billed To Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text('BILLED TO:', 20, 68);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(order.customerName || 'N/A', 20, 74);
    doc.text(`Phone: ${order.customerPhone || 'N/A'}`, 20, 80);
    doc.text(`Email: ${order.customerEmail || 'N/A'}`, 20, 86);
    
    // Shipping details on the right
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('SHIPPING DETAILS:', 110, 68);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text(`Method: ${order.deliveryMethod || 'Courier'}`, 110, 74);
    doc.text(`Est. Date: ${order.deliveryDate || 'N/A'}`, 110, 80);
    
    doc.text('Address:', 110, 86);
    const splitAddress = doc.splitTextToSize(order.shippingAddress || 'N/A', 80);
    doc.text(splitAddress, 110, 92);
    
    // Table headers
    doc.setFillColor(244, 244, 245);
    doc.rect(20, 118, 170, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text('Product Description', 24, 123);
    doc.text('Color', 95, 123);
    doc.text('Qty', 128, 123);
    doc.text('Unit Price (LKR)', 142, 123);
    doc.text('Total (LKR)', 172, 123);
    
    // Items List
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(order.productName || 'N/A', 24, 134);
    doc.text(order.colorName || 'N/A', 95, 134);
    doc.text(String(order.quantity), 128, 134);
    doc.text(`LKR ${Number(order.unitPrice || 0).toFixed(2)}`, 142, 134);
    doc.text(`LKR ${(Number(order.unitPrice || 0) * Number(order.quantity)).toFixed(2)}`, 172, 134);
    
    doc.line(20, 140, 190, 140);
    
    const subtotal = Number(order.unitPrice || 0) * Number(order.quantity);
    const deliveryFee = Number(order.deliveryFee || 0);
    const total = subtotal + deliveryFee;
    
    // Summary
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 130, 150);
    doc.text(`LKR ${subtotal.toFixed(2)}`, 165, 150);
    
    doc.text('Delivery Fee:', 130, 156);
    doc.text(`LKR ${deliveryFee.toFixed(2)}`, 165, 156);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Total Amount:', 130, 164);
    doc.text(`LKR ${total.toFixed(2)}`, 165, 164);
    
    // Footer line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(20, 185, 190, 185);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...lightTextColor);
    doc.text('Thank you for business with Stitch Hive! For support, email orders@stitchhive.com', 105, 192, { align: 'center' });
    
    doc.save(`invoice_${order.orderNumber || order.id.slice(0, 6).toUpperCase()}.pdf`);
  };

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl" aria-hidden="true">🛠️</span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Stock Management
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Create products, manage colors, adjust counts, and track customer orders.
          </p>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="admin-tab-container">
        <div className="admin-tab-bar">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Management
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders & Invoices
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast.message && (
        <div className="mb-6">
          <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
        </div>
      )}

      {/* ── TAB 1: INVENTORY MANAGEMENT ── */}
      {activeTab === 'inventory' && (
        <>
          {/* Stats bar */}
          <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBadge label="Total Products" value={products.length} accent />
            <StatBadge label="Total Units" value={products.reduce((sum, p) => sum + (p.totalStock ?? 0), 0)} accent />
            <StatBadge label="Low Stock (≤10)" value={products.filter((p) => (p.totalStock ?? 0) <= 10).length} />
            <StatBadge label="Categories" value={new Set(products.map((p) => p.category)).size} />
          </div>

          {/* Two-column forms */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Create Product Card */}
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

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <FieldLabel htmlFor="product-price">Unit Price (LKR)</FieldLabel>
                    <input
                      id="product-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="0.00"
                      className={inputBase}
                      required
                    />
                  </div>
                </div>

                {/* Colors Manager inside Create Product */}
                <div>
                  <FieldLabel>Product Colors (Optional)</FieldLabel>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="text"
                      placeholder="Color name (e.g. Honey)"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      className="flex-1 rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-white"
                    />
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-10 h-10 border-0 p-0 rounded-xl cursor-pointer bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!colorName.trim()) return;
                        setNewProduct({
                          ...newProduct,
                          colors: [...(newProduct.colors || []), { name: colorName.trim(), hex: colorHex }]
                        });
                        setColorName('');
                        setColorHex('#fbbf24');
                      }}
                      className="px-3 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300 transition animate-fade-in"
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                      Or select from default palette:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_PALETTE.map((c, idx) => {
                        const isSelected = (newProduct.colors || []).some(pc => pc.hex.toLowerCase() === c.hex.toLowerCase());
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setNewProduct({
                                  ...newProduct,
                                  colors: newProduct.colors.filter(pc => pc.hex.toLowerCase() !== c.hex.toLowerCase())
                                });
                              } else {
                                setNewProduct({
                                  ...newProduct,
                                  colors: [...(newProduct.colors || []), { name: c.name, hex: c.hex }]
                                });
                              }
                            }}
                            className={`group relative h-7 px-2.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-300'
                                : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                            }`}
                            title={c.name}
                          >
                            <span
                              className="h-3 w-3 rounded-full border border-white/25 shadow-sm"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span>{c.name}</span>
                            {isSelected && <span className="text-[10px]">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(newProduct.colors || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-2 border border-dashed border-amber-200/70 dark:border-zinc-700 rounded-xl">
                      {newProduct.colors.map((c, i) => (
                        <span key={i} className="color-badge" style={{ borderLeft: `4px solid ${c.hex}` }}>
                          {c.name}
                          <button
                            type="button"
                            onClick={() => {
                              setNewProduct({
                                ...newProduct,
                                colors: newProduct.colors.filter((_, idx) => idx !== i)
                              });
                            }}
                            className="color-badge-remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  id="create-product-btn"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
                >
                  {loading ? 'Creating…' : 'Create Product'}
                </button>
              </form>
            </SectionCard>

            {/* Daily Count Update Card */}
            <SectionCard
              icon="🔄"
              title="Daily Count Update"
              subtitle="Record sales and new stock received"
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

                {updateCount.productId && (() => {
                  const sel = products.find((p) => p.id === updateCount.productId);
                  const sold = parseInt(updateCount.soldCount, 10) || 0;
                  const received = parseInt(updateCount.newStock, 10) || 0;
                  const preview = (sel?.totalStock ?? 0) - sold + received;
                  return (
                    <div className="flex items-center justify-between rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current Stock</p>
                        <p className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{sel?.totalStock ?? 0}</p>
                      </div>
                      <span className="text-amber-400">➜</span>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">After Update</p>
                        <p className={`text-2xl font-extrabold tracking-tight ${
                          preview < (sel?.totalStock ?? 0) ? 'text-red-500' :
                          preview > (sel?.totalStock ?? 0) ? 'text-emerald-600' : 'text-zinc-900 dark:text-white'
                        }`}>{preview}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="sold-count">▼ Units Sold</FieldLabel>
                    <input
                      id="sold-count"
                      type="number"
                      min="0"
                      value={updateCount.soldCount}
                      onChange={(e) => setUpdateCount({ ...updateCount, soldCount: e.target.value })}
                      placeholder="0"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="new-stock">▲ New Stock Received</FieldLabel>
                    <input
                      id="new-stock"
                      type="number"
                      min="0"
                      value={updateCount.newStock}
                      onChange={(e) => setUpdateCount({ ...updateCount, newStock: e.target.value })}
                      placeholder="0"
                      className={inputBase}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="update-stock-btn"
                  disabled={loading || loadingProducts}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Update Stock
                </button>
              </form>
            </SectionCard>
          </div>

          {/* All Products Table */}
          <div className="mt-8">
            <SectionCard
              icon="📋"
              title="All Products"
              subtitle="Real-time inventory overview with quick-adjust controls"
              headerRight={
                <button
                  type="button"
                  onClick={exportProductsToCSV}
                  className="btn-glass p-2.5 rounded-full"
                  title="Export products list to CSV"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              }
            >
              {loadingProducts ? (
                <div className="flex items-center justify-center py-10">
                  <span className="text-zinc-500">Loading products…</span>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">No products yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-amber-100/60 dark:border-zinc-700/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-100/60 bg-amber-50/70 dark:border-zinc-700/50 dark:bg-zinc-800/60">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Product</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Category</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Price (LKR)</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Colors</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Stock</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Quick Adjust</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/40 dark:divide-zinc-700/40">
                      {products.map((product) => {
                        const isLow = product.totalStock <= 10;
                        return (
                          <tr key={product.id} className="group transition-colors hover:bg-amber-50/50 dark:hover:bg-zinc-800/40">
                            <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-white">{product.name}</td>
                            <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                              <span className="inline-flex items-center rounded-full bg-amber-100/70 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right text-zinc-900 dark:text-white font-medium">LKR {(product.price ?? 0).toFixed(2)}</td>
                            <td className="px-5 py-4 text-center">
                              {product.colors && product.colors.length > 0 ? (
                                <div className="flex justify-center gap-1 flex-wrap max-w-[120px] mx-auto">
                                  {product.colors.map((c, i) => (
                                    <span
                                      key={i}
                                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                                      style={{ backgroundColor: c.hex }}
                                      title={c.name}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className={`text-base font-bold ${isLow ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                                {product.totalStock}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-center gap-1">
                                <button type="button" onClick={() => quickAdjust(product.id, -10)} className="px-2 py-1 rounded bg-zinc-100 hover:bg-red-50 hover:text-red-600 text-xs font-bold dark:bg-zinc-800 dark:text-zinc-300">−10</button>
                                <button type="button" onClick={() => quickAdjust(product.id, -1)} className="px-2 py-1 rounded bg-zinc-100 hover:bg-red-50 hover:text-red-600 text-xs font-bold dark:bg-zinc-800 dark:text-zinc-300">−1</button>
                                <button type="button" onClick={() => quickAdjust(product.id, 1)} className="px-2 py-1 rounded bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-600 text-xs font-bold dark:bg-zinc-800 dark:text-zinc-300">+1</button>
                                <button type="button" onClick={() => quickAdjust(product.id, 10)} className="px-2 py-1 rounded bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-600 text-xs font-bold dark:bg-zinc-800 dark:text-zinc-300">+10</button>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct(product)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(product.id, product.name)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40"
                                >
                                  Delete
                                </button>
                              </div>
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
        </>
      )}

      {/* ── TAB 2: ORDERS & INVOICES MANAGEMENT ── */}
      {activeTab === 'orders' && (
        <>
          {/* Stats row */}
          <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBadge label="Total Orders" value={orders.length} accent />
            <StatBadge label="Total Revenue" value={`LKR ${orders.reduce((sum, o) => sum + (Number(o.unitPrice || 0) * Number(o.quantity || 0)), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} accent />
            <StatBadge label="Pending Deliveries" value={orders.filter((o) => o.status === 'pending').length} />
            <StatBadge label="Completed Deliveries" value={orders.filter((o) => o.status === 'delivered').length} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Left Panel: Create Order & Order Tracking List */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Record Customer Order Card */}
              <SectionCard
                icon="📝"
                title="Record Customer Order"
                subtitle="Deducts stock automatically from product"
              >
                <form onSubmit={handleCreateOrder} className="space-y-4">
                  <div>
                    <FieldLabel htmlFor="order-product">Select Product</FieldLabel>
                    <select
                      id="order-product"
                      value={newOrder.productId}
                      onChange={(e) => handleOrderProductChange(e.target.value)}
                      disabled={loadingProducts}
                      className={`${inputBase} cursor-pointer`}
                      required
                    >
                      <option value="">Choose a product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.totalStock} units available
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* If product has colors, show color options */}
                  {newOrder.productId && (() => {
                    const sel = products.find(p => p.id === newOrder.productId);
                    if (!sel || !sel.colors || sel.colors.length === 0) return null;
                    return (
                      <div>
                        <FieldLabel>Select Color</FieldLabel>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {sel.colors.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setNewOrder({ ...newOrder, colorHex: c.hex, colorName: c.name })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                                newOrder.colorHex === c.hex
                                  ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                                  : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel htmlFor="order-qty">Quantity</FieldLabel>
                      <input
                        id="order-qty"
                        type="number"
                        min="1"
                        value={newOrder.quantity}
                        onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                        className={inputBase}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="order-price">Unit Price (LKR)</FieldLabel>
                      <input
                        id="order-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newOrder.unitPrice}
                        onChange={(e) => setNewOrder({ ...newOrder, unitPrice: e.target.value })}
                        className={inputBase}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="order-fee">Delivery Fee (LKR)</FieldLabel>
                    <input
                      id="order-fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newOrder.deliveryFee}
                      onChange={(e) => setNewOrder({ ...newOrder, deliveryFee: e.target.value })}
                      className={inputBase}
                      required
                    />
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Delivery Details</p>
                    <div className="space-y-3">
                      <div>
                        <FieldLabel htmlFor="cust-name">Customer Name</FieldLabel>
                        <input
                          id="cust-name"
                          type="text"
                          placeholder="Jane Doe"
                          value={newOrder.customerName}
                          onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                          className={inputBase}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel htmlFor="cust-phone">Phone Number</FieldLabel>
                          <input
                            id="cust-phone"
                            type="text"
                            placeholder="+94 77 123 4567"
                            value={newOrder.customerPhone}
                            onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                            className={inputBase}
                          />
                        </div>
                        <div>
                          <FieldLabel htmlFor="cust-email">Email Address</FieldLabel>
                          <input
                            id="cust-email"
                            type="email"
                            placeholder="jane@example.com"
                            value={newOrder.customerEmail}
                            onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })}
                            className={inputBase}
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel htmlFor="cust-address">Shipping Address</FieldLabel>
                        <textarea
                          id="cust-address"
                          placeholder="Street, City, Zip"
                          value={newOrder.shippingAddress}
                          onChange={(e) => setNewOrder({ ...newOrder, shippingAddress: e.target.value })}
                          rows="2"
                          className={`${inputBase} resize-none`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel htmlFor="delivery-method">Delivery Method</FieldLabel>
                          <select
                            id="delivery-method"
                            value={newOrder.deliveryMethod}
                            onChange={(e) => setNewOrder({ ...newOrder, deliveryMethod: e.target.value })}
                            className={`${inputBase} cursor-pointer`}
                          >
                            <option value="Courier">Courier</option>
                            <option value="Pickup">Store Pickup</option>
                            <option value="Express">Express Shipping</option>
                            <option value="Standard">Standard Post</option>
                          </select>
                        </div>
                        <div>
                          <FieldLabel htmlFor="delivery-date">Est. Delivery Date</FieldLabel>
                          <input
                            id="delivery-date"
                            type="date"
                            value={newOrder.deliveryDate}
                            onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                            className={inputBase}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
                  >
                    {loading ? 'Creating Order…' : 'Record Order'}
                  </button>
                </form>
              </SectionCard>

              {/* Order Tracking & List Section */}
              <SectionCard
                icon="📋"
                title="Order Tracking"
                subtitle="Track and update customer order status"
              >
                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-1.5 pb-2 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                  {['all', 'pending', 'dispatched', 'delivered', 'cancelled'].map((tab) => {
                    const count = tab === 'all' 
                      ? orders.length 
                      : orders.filter(o => o.status === tab).length;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusFilter(tab)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                          statusFilter === tab
                            ? 'bg-amber-400 text-zinc-900 shadow-sm'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 dark:bg-zinc-850 dark:hover:bg-zinc-850 dark:text-zinc-400'
                        }`}
                      >
                        {tab} ({count})
                      </button>
                    );
                  })}
                </div>

                {loadingOrders ? (
                  <div className="text-center py-10 text-zinc-500">Loading orders…</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500">No orders recorded yet.</div>
                ) : (() => {
                  const filteredOrders = statusFilter === 'all'
                    ? orders
                    : orders.filter(o => o.status === statusFilter);

                  if (filteredOrders.length === 0) {
                    return <div className="text-center py-10 text-zinc-500">No orders match this status.</div>;
                  }

                  return (
                    <div className="overflow-x-auto rounded-2xl border border-amber-100/60 dark:border-zinc-700/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-amber-100/60 bg-amber-50/70 dark:border-zinc-700/50 dark:bg-zinc-800/60">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Order Info</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">Product</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">Total (LKR)</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100/40 dark:divide-zinc-700/40">
                          {filteredOrders.map((order) => {
                            const orderTotal = (order.unitPrice || 0) * (order.quantity || 0) + (order.deliveryFee || 0);
                            const isSelected = activeOrder && activeOrder.id === order.id;
                            return (
                              <tr 
                                key={order.id} 
                                className={`group transition-colors hover:bg-amber-50/50 dark:hover:bg-zinc-800/40 cursor-pointer ${
                                  isSelected ? 'bg-amber-50/80 dark:bg-amber-400/5' : ''
                                }`}
                                onClick={() => setActiveOrder(order)}
                              >
                                <td className="px-4 py-3">
                                  <p className="font-bold text-zinc-900 dark:text-white">
                                    {order.orderNumber || order.id.slice(0, 6).toUpperCase()}
                                  </p>
                                  <p className="text-[10px] text-zinc-400">
                                    {order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()) : 'N/A'}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                  <p className="font-medium">{order.customerName}</p>
                                  {order.customerPhone && <p className="text-[10px] text-zinc-400">{order.customerPhone}</p>}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-zinc-900 dark:text-white leading-tight">{order.productName}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {order.colorHex && (
                                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-200" style={{ backgroundColor: order.colorHex }} title={order.colorName} />
                                    )}
                                    <span className="text-xs text-zinc-500 font-medium">
                                      {order.colorName ? `${order.colorName} • ` : ''}Qty: {order.quantity}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-white">
                                  LKR {orderTotal.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={order.status || 'pending'}
                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none transition focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="dispatched">Dispatched</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setActiveOrder(order)}
                                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                        isSelected
                                          ? 'bg-amber-400 text-zinc-900 font-bold'
                                          : 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-400/10 dark:hover:bg-amber-400/20 dark:text-amber-400'
                                      }`}
                                      title="Select order to preview Invoice"
                                    >
                                      Invoice
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadInvoicePDF(order)}
                                      className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                                      title="Quick Download PDF"
                                    >
                                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/>
                                        <polyline points="7 10 12 15 17 10" strokeLinecap="round"/>
                                        <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOrder(order.id, order.orderNumber || order.id.slice(0, 6).toUpperCase())}
                                      className="p-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40 cursor-pointer"
                                      title="Delete Order"
                                    >
                                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5zM4.5 3V2.5A1.5 1.5 0 0 1 6 1h4a1.5 1.5 0 0 1 1.5 1.5V3h2a.5.5 0 0 1 0 1h-.5l-.688 8.25A1.5 1.5 0 0 1 10.819 13H5.18a1.5 1.5 0 0 1-1.493-1.75L3 4h-.5a.5.5 0 0 1 0-1h2zm1 1l.688 8h4.624l.688-8H5.5z" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </SectionCard>
            </div>

            {/* Right Panel: Highlighted Invoice Preview Sheet */}
            <div className="lg:col-span-5 sticky top-24">
              <SectionCard
                icon="📄"
                title="Invoice Generator"
                subtitle="Download vector PDF or print invoice directly"
                headerRight={
                  activeOrder && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => downloadInvoicePDF(activeOrder)}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 px-3 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer"
                        title="Download Invoice PDF"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 px-3 py-1.5 text-xs font-bold transition dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                        title="Print Invoice"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 6 2 18 2 18 9" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        <span>Print</span>
                      </button>
                    </div>
                  )
                }
              >
                {!activeOrder ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-850 rounded-3xl p-12 text-center text-zinc-400 dark:text-zinc-500">
                    <span className="text-4xl mb-3">📄</span>
                    <p className="text-sm font-semibold">No Order Selected</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">
                      Select an order from the tracking list on the left to preview, print, or download its invoice.
                    </p>
                  </div>
                ) : (() => {
                  const subtotal = Number(activeOrder.unitPrice || 0) * Number(activeOrder.quantity);
                  const deliveryFee = Number(activeOrder.deliveryFee || 0);
                  const total = subtotal + deliveryFee;

                  return (
                    <div className="relative overflow-hidden border border-zinc-200 dark:border-zinc-750 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 p-4">
                      {/* Interactive paper preview */}
                      <div className="invoice-paper print-area p-5 sm:p-6 text-left max-w-full text-zinc-800 shadow-sm border border-zinc-250 bg-white">
                        
                        {/* Amber Top Border inside invoice card */}
                        <div className="h-1.5 w-full bg-amber-500 rounded-t-lg -mt-6 mb-4" style={{ width: 'calc(100% + 48px)', marginLeft: '-24px' }} />

                        {/* Invoice Header */}
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h1 className="text-lg font-black text-amber-500 tracking-tight leading-none">STITCH HIVE</h1>
                            <p className="text-[8px] text-zinc-400 font-semibold uppercase tracking-wider mt-1.5">
                              Real-time Inventory & Order Invoice
                            </p>
                          </div>
                          <div className="text-right">
                            <h2 className="text-sm font-bold text-zinc-800">INVOICE</h2>
                            <p className="text-[9px] text-zinc-500 font-semibold mt-1 leading-none">
                              No: <span className="text-zinc-800 font-bold">INV-{activeOrder.orderNumber || activeOrder.id.slice(0, 6).toUpperCase()}</span>
                            </p>
                            <p className="text-[9px] text-zinc-400">
                              Date: {activeOrder.createdAt ? (activeOrder.createdAt.toDate ? activeOrder.createdAt.toDate().toLocaleDateString() : new Date(activeOrder.createdAt).toLocaleDateString()) : new Date().toLocaleDateString()}
                            </p>
                            <span className={`status-badge mt-1.5 py-0.5 px-2 text-[9px] ${activeOrder.status}`}>{activeOrder.status}</span>
                          </div>
                        </div>

                        {/* Billing and Shipping Split */}
                        <div className="grid grid-cols-2 gap-4 mb-6 border-t border-b border-zinc-100 py-4 text-[10px]">
                          <div>
                            <h3 className="text-[8px] font-bold text-amber-600 uppercase tracking-wider mb-1">Billed To</h3>
                            <p className="font-semibold text-zinc-800">{activeOrder.customerName}</p>
                            {activeOrder.customerPhone && <p className="text-zinc-500 mt-0.5">Phone: {activeOrder.customerPhone}</p>}
                            {activeOrder.customerEmail && <p className="text-zinc-500">Email: {activeOrder.customerEmail}</p>}
                          </div>
                          <div>
                            <h3 className="text-[8px] font-bold text-amber-600 uppercase tracking-wider mb-1">Delivery Details</h3>
                            <p className="text-zinc-600"><span className="font-semibold text-zinc-800">Method:</span> {activeOrder.deliveryMethod}</p>
                            {activeOrder.deliveryDate && <p className="text-zinc-600"><span className="font-semibold text-zinc-800">Est. Date:</span> {activeOrder.deliveryDate}</p>}
                            <p className="text-zinc-600 mt-1 font-semibold text-zinc-800">Address:</p>
                            <p className="text-zinc-500 whitespace-pre-wrap leading-tight mt-0.5">{activeOrder.shippingAddress || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Item Table */}
                        <table className="w-full text-left text-[9px] mb-6">
                          <thead>
                            <tr className="bg-zinc-50 text-zinc-500 font-bold uppercase border-b border-zinc-100">
                              <th className="py-2 px-2">Description</th>
                              <th className="py-2 px-2">Color</th>
                              <th className="py-2 px-2 text-right">Qty</th>
                              <th className="py-2 px-2 text-right">Price (LKR)</th>
                              <th className="py-2 px-2 text-right font-bold">Total (LKR)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-zinc-100 text-zinc-800 font-medium">
                              <td className="py-2.5 px-2">
                                <p className="font-bold">{activeOrder.productName}</p>
                                <p className="text-[7px] text-zinc-400">ID: {activeOrder.productId}</p>
                              </td>
                              <td className="py-2.5 px-2">
                                {activeOrder.colorHex ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full border border-zinc-200" style={{ backgroundColor: activeOrder.colorHex }} />
                                    {activeOrder.colorName}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400">N/A</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-right font-semibold">{activeOrder.quantity}</td>
                              <td className="py-2.5 px-2 text-right">LKR {Number(activeOrder.unitPrice || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-2 text-right font-bold">LKR {subtotal.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Totals Summary */}
                        <div className="flex justify-end mb-6">
                          <div className="w-48 text-[9px]">
                            <div className="flex justify-between py-1 border-b border-zinc-50">
                              <span className="text-zinc-400">Subtotal:</span>
                              <span className="font-semibold text-zinc-800">LKR {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-zinc-50">
                              <span className="text-zinc-400">Delivery:</span>
                              <span className="font-semibold text-zinc-800">LKR {deliveryFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-zinc-200">
                              <span className="text-zinc-800 font-bold">Total Due:</span>
                              <span className="text-[10px] font-extrabold text-amber-500">LKR {total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Invoice Footer */}
                        <div className="border-t border-amber-300 pt-4 text-center text-[7px] text-zinc-400 font-medium">
                          <p className="italic">Thank you for your business with Stitch Hive!</p>
                          <p className="mt-0.5">For support, email orders@stitchhive.com</p>
                        </div>

                      </div>
                    </div>
                  );
                })()}
              </SectionCard>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveEditedProduct}
        />
      )}

    </section>
  );
}

/* ─── Edit Product Modal Component ───────────────────────────────── */
function EditProductModal({ product, onClose, onSave }) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price ?? 0);
  const [colors, setColors] = useState(product.colors ?? []);
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#fbbf24');

  const addColor = () => {
    if (!colorName.trim()) return;
    setColors([...colors, { name: colorName.trim(), hex: colorHex }]);
    setColorName('');
    setColorHex('#fbbf24');
  };

  const removeColor = (idx) => {
    setColors(colors.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(product.id, {
      name: name.trim(),
      category: category.trim(),
      price: parseFloat(price) || 0,
      colors
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content-wrapper p-6 max-w-md">
        <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700 pb-3 mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Edit Product</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="edit-name">Product Name</FieldLabel>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="edit-category">Category</FieldLabel>
            <input
              id="edit-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputBase}
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="edit-price">Unit Price (LKR)</FieldLabel>
            <input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputBase}
              required
            />
          </div>
          
          <div>
            <FieldLabel>Colors</FieldLabel>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Color Name (e.g. Red)"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-10 h-10 border-0 p-0 rounded-xl cursor-pointer bg-transparent"
              />
              <button
                type="button"
                onClick={addColor}
                className="px-3 rounded-xl bg-amber-400 text-zinc-900 text-xs font-semibold hover:bg-amber-300 transition"
              >
                Add
              </button>
            </div>

            <div className="mt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                Or select from default palette:
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PALETTE.map((c, idx) => {
                  const isSelected = colors.some(pc => pc.hex.toLowerCase() === c.hex.toLowerCase());
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setColors(colors.filter(pc => pc.hex.toLowerCase() !== c.hex.toLowerCase()));
                        } else {
                          setColors([...colors, { name: c.name, hex: c.hex }]);
                        }
                      }}
                      className={`group relative h-7 px-2.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-300'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                      title={c.name}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-white/25 shadow-sm"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-2 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                {colors.map((c, i) => (
                  <span key={i} className="color-badge" style={{ borderLeft: `4px solid ${c.hex}` }}>
                    {c.name}
                    <button type="button" onClick={() => removeColor(i)} className="color-badge-remove">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-xl dark:bg-amber-400 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-amber-300 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import stitchHiveLogo from './assets/Stich Hive - logo with no bg.png';
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
import * as XLSX from 'xlsx';

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

  // Multi-item order builder
  const EMPTY_CUSTOMER = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    shippingAddress: '',
    deliveryMethod: 'Courier',
    deliveryDate: '',
    deliveryFee: '0.00',
  };
  const EMPTY_DRAFT = { productId: '', colorHex: '', colorName: '', quantity: '1', unitPrice: '' };

  const [orderItems, setOrderItems]     = useState([]);           // confirmed line items
  const [draftItem, setDraftItem]       = useState(EMPTY_DRAFT);  // item being composed
  const [customerFields, setCustomerFields] = useState(EMPTY_CUSTOMER);

  const [activeOrder, setActiveOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Bulk Product Import state
  const [productAddMode, setProductAddMode] = useState('single'); // 'single' | 'bulk'
  const [bulkFile, setBulkFile] = useState(null);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'merge' | 'overwrite'

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


  /* ── Bulk Product Template & Import ── */
  const downloadExcelTemplate = () => {
    try {
      const headers = ['Product Name', 'Category', 'Stock Count', 'Unit Price (LKR)', 'Colors'];
      const sampleRows = [
        ['Honey Glazed Fabric', 'Textiles', 150, 850.00, 'Honey, Crimson, Gold'],
        ['Classic Serviettes', 'Tableware', 80, 240.00, 'White: #F4F4F5, Black: #18181B'],
        ['Premium Sewing Thread', 'Accessories', 300, 120.50, 'Blue, Teal']
      ];
      const data = [headers, ...sampleRows];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products Template');

      XLSX.writeFile(wb, 'stitch_hive_bulk_products_template.xlsx');
      showToast('Excel template downloaded successfully!');
    } catch (err) {
      console.error('Download template error:', err);
      showToast('Failed to download template.', 'error');
    }
  };

  const clearBulkUpload = () => {
    setBulkFile(null);
    setParsedProducts([]);
    setDuplicateStrategy('skip');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawRows.length === 0) {
          showToast('The file is empty.', 'error');
          setParsedProducts([]);
          return;
        }

        const headers = rawRows[0].map(h => String(h || '').trim().toLowerCase());
        const getColIndex = (aliases) => {
          return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
        };

        const nameIdx = getColIndex(['name', 'product']);
        const categoryIdx = getColIndex(['category']);
        const stockIdx = getColIndex(['stock', 'count', 'qty', 'quantity', 'initial']);
        const priceIdx = getColIndex(['price', 'lkr', 'cost', 'unit price']);
        const colorsIdx = getColIndex(['color']);

        if (nameIdx === -1 || categoryIdx === -1 || stockIdx === -1 || priceIdx === -1) {
          showToast('Invalid template format. Missing required columns (Name, Category, Stock, Price).', 'error');
          setParsedProducts([]);
          return;
        }

        const items = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || row.every(val => val === null || val === undefined || String(val).trim() === '')) {
            continue;
          }

          const rawName = String(row[nameIdx] || '').trim();
          const rawCategory = String(row[categoryIdx] || '').trim();
          const rawStock = row[stockIdx];
          const rawPrice = row[priceIdx];
          const rawColorsStr = colorsIdx !== -1 ? String(row[colorsIdx] || '').trim() : '';

          const errors = [];
          const warnings = [];

          if (!rawName) {
            errors.push('Product Name is required.');
          }
          if (!rawCategory) {
            errors.push('Category is required.');
          }

          const totalStock = parseInt(rawStock, 10);
          if (isNaN(totalStock) || totalStock < 0) {
            errors.push('Stock Count must be a valid positive integer.');
          }

          const price = parseFloat(rawPrice);
          if (isNaN(price) || price < 0) {
            errors.push('Unit Price must be a valid positive number.');
          }

          const colors = [];
          if (rawColorsStr) {
            const colorTokens = rawColorsStr.split(',').map(c => c.trim()).filter(Boolean);
            colorTokens.forEach(token => {
              if (token.includes(':')) {
                const [cName, cHex] = token.split(':').map(part => part.trim());
                if (cName && cHex.startsWith('#') && cHex.length >= 4 && cHex.length <= 7) {
                  colors.push({ name: cName, hex: cHex });
                } else {
                  warnings.push(`Invalid custom color format for "${token}". Expected "Name: #hex".`);
                }
              } else {
                const matched = DEFAULT_PALETTE.find(p => p.name.toLowerCase() === token.toLowerCase());
                if (matched) {
                  colors.push({ name: matched.name, hex: matched.hex });
                } else {
                  const hash = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const colorsList = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6'];
                  const generatedHex = colorsList[hash % colorsList.length];
                  colors.push({ name: token, hex: generatedHex });
                  warnings.push(`Color "${token}" not found in default palette; assigned standard hex ${generatedHex}.`);
                }
              }
            });
          }

          const isDuplicate = products.some(p => p.name.toLowerCase() === rawName.toLowerCase());

          items.push({
            name: rawName,
            category: rawCategory,
            totalStock: isNaN(totalStock) ? 0 : totalStock,
            price: isNaN(price) ? 0 : price,
            colors,
            isDuplicate,
            errors,
            warnings,
            isValid: errors.length === 0,
            rawColorsStr
          });
        }

        setParsedProducts(items);
        if (items.length === 0) {
          showToast('No products found in the sheet.', 'error');
        } else {
          const valCount = items.filter(it => it.isValid).length;
          showToast(`Successfully parsed ${items.length} rows (${valCount} valid).`);
        }
      } catch (err) {
        console.error('File parsing error:', err);
        showToast('Failed to parse file. Make sure it is a valid Excel or CSV.', 'error');
        setParsedProducts([]);
      }
    };

    reader.onerror = () => {
      showToast('Failed to read file.', 'error');
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmBulkUpload = async () => {
    const importable = parsedProducts.filter(p => p.isValid);
    if (importable.length === 0) {
      showToast('No valid products to upload.', 'error');
      return;
    }

    try {
      setLoading(true);
      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      await Promise.all(importable.map(async (ip) => {
        const existing = products.find(p => p.name.toLowerCase() === ip.name.toLowerCase());

        if (existing) {
          if (duplicateStrategy === 'skip') {
            skippedCount++;
            return;
          } else if (duplicateStrategy === 'merge') {
            const newStock = (existing.totalStock || 0) + ip.totalStock;
            await updateDoc(doc(db, 'products', existing.id), {
              totalStock: newStock,
              price: ip.price,
              category: ip.category,
              colors: ip.colors.length > 0 ? ip.colors : existing.colors,
              lastUpdated: new Date()
            });
            updatedCount++;
          } else if (duplicateStrategy === 'overwrite') {
            await updateDoc(doc(db, 'products', existing.id), {
              totalStock: ip.totalStock,
              price: ip.price,
              category: ip.category,
              colors: ip.colors,
              lastUpdated: new Date()
            });
            updatedCount++;
          }
        } else {
          await addDoc(collection(db, 'products'), {
            name: ip.name,
            category: ip.category,
            totalStock: ip.totalStock,
            price: ip.price,
            colors: ip.colors,
            createdAt: new Date()
          });
          addedCount++;
        }
      }));

      let message = `Bulk upload finished.`;
      if (addedCount > 0) message += ` Added ${addedCount} new.`;
      if (updatedCount > 0) message += ` Updated ${updatedCount} existing.`;
      if (skippedCount > 0) message += ` Skipped ${skippedCount} duplicates.`;

      showToast(message);
      clearBulkUpload();
      fetchProducts();
    } catch (err) {
      console.error('Bulk upload error:', err);
      showToast('Failed to complete bulk upload.', 'error');
    } finally {
      setLoading(false);
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

  /* ── Draft item: product change helper ── */
  const handleDraftProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setDraftItem({
        ...EMPTY_DRAFT,
        productId,
        unitPrice: product.price ? String(product.price) : '0.00',
        colorHex:  product.colors?.length ? product.colors[0].hex  : '',
        colorName: product.colors?.length ? product.colors[0].name : '',
      });
    } else {
      setDraftItem(EMPTY_DRAFT);
    }
  };

  /* ── Add draft item to the order basket ── */
  const handleAddDraftItem = () => {
    if (!draftItem.productId) { showToast('Please select a product.', 'error'); return; }
    const qty = parseInt(draftItem.quantity, 10) || 0;
    if (qty <= 0) { showToast('Quantity must be at least 1.', 'error'); return; }
    const product = products.find(p => p.id === draftItem.productId);
    if (!product) return;
    // Check for duplicate — merge quantities if same product+color
    const existIdx = orderItems.findIndex(
      i => i.productId === draftItem.productId && i.colorHex === draftItem.colorHex
    );
    if (existIdx >= 0) {
      const updated = [...orderItems];
      updated[existIdx] = { ...updated[existIdx], quantity: updated[existIdx].quantity + qty };
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        productId:   draftItem.productId,
        productName: product.name,
        colorHex:    draftItem.colorHex,
        colorName:   draftItem.colorName,
        quantity:    qty,
        unitPrice:   parseFloat(draftItem.unitPrice) || 0,
      }]);
    }
    setDraftItem(EMPTY_DRAFT);
  };

  /* ── Remove an item from the basket ── */
  const handleRemoveOrderItem = (idx) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  /* ── Submit the full multi-item order ── */
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      showToast('Add at least one product to the order.', 'error'); return;
    }
    if (!customerFields.customerName.trim()) {
      showToast('Customer name is required.', 'error'); return;
    }

    // Stock check across all items
    for (const item of orderItems) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && (prod.totalStock ?? 0) < item.quantity) {
        if (!window.confirm(`Warning: "${prod.name}" only has ${prod.totalStock} in stock (order wants ${item.quantity}). Continue?`)) return;
      }
    }

    try {
      setLoading(true);
      const orderNumber = 'SH-' + Math.floor(100000 + Math.random() * 900000);

      const orderData = {
        orderNumber,
        items: orderItems,
        // Keep legacy top-level fields for backwards compatibility
        productId:   orderItems[0].productId,
        productName: orderItems.map(i => i.productName).join(', '),
        colorHex:    orderItems[0].colorHex,
        colorName:   orderItems[0].colorName,
        quantity:    orderItems.reduce((s, i) => s + i.quantity, 0),
        unitPrice:   orderItems[0].unitPrice,
        customerName:    customerFields.customerName.trim(),
        customerPhone:   customerFields.customerPhone.trim(),
        customerEmail:   customerFields.customerEmail.trim(),
        shippingAddress: customerFields.shippingAddress.trim(),
        deliveryMethod:  customerFields.deliveryMethod,
        deliveryDate:    customerFields.deliveryDate,
        deliveryFee:     parseFloat(customerFields.deliveryFee) || 0,
        status:    'pending',
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      setActiveOrder({ id: docRef.id, ...orderData });

      // Decrement stock for every item
      await Promise.all(orderItems.map(item =>
        updateDoc(doc(db, 'products', item.productId), {
          totalStock: increment(-item.quantity),
          soldCount:  increment(item.quantity),
          lastUpdated: new Date()
        })
      ));

      showToast(`Order ${orderNumber} created with ${orderItems.length} item(s)!`);
      setOrderItems([]);
      setDraftItem(EMPTY_DRAFT);
      setCustomerFields(EMPTY_CUSTOMER);
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

  /* ── Normalise an order into a guaranteed items[] array ── */
  const getOrderItems = (order) => {
    if (Array.isArray(order.items) && order.items.length > 0) return order.items;
    // Legacy single-product order
    return [{
      productId:   order.productId   || '',
      productName: order.productName || '—',
      colorHex:    order.colorHex    || '',
      colorName:   order.colorName   || '',
      quantity:    Number(order.quantity  || 0),
      unitPrice:   Number(order.unitPrice || 0),
    }];
  };

  /* ── Download PDF Invoice ── */
  const downloadInvoicePDF = (order) => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

    const amber    = [245, 158, 11];
    const dark     = [24,  24,  27];
    const mid      = [82,  82,  91];
    const muted    = [113, 113, 122];
    const hairline = [228, 228, 231];
    const bgRow    = [249, 250, 251];

    const pageW = 210;
    const mL    = 16;
    const mR    = 194;

    const invDate = order.createdAt
      ? (order.createdAt.toDate
          ? order.createdAt.toDate().toLocaleDateString('en-GB')
          : new Date(order.createdAt).toLocaleDateString('en-GB'))
      : new Date().toLocaleDateString('en-GB');
    const invNo   = `INV-${order.orderNumber || order.id.slice(0, 6).toUpperCase()}`;
    const items   = getOrderItems(order);
    const itemsSubtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const deliveryFee   = Number(order.deliveryFee || 0);
    const grandTotal    = itemsSubtotal + deliveryFee;

    /* ── White background ── */
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, 297, 'F');

    /* ── Logo ── */
    try { pdf.addImage(stitchHiveLogo, 'PNG', mL, 8, 36, 36); }
    catch (_) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18);
      pdf.setTextColor(...amber); pdf.text('STITCH HIVE', mL, 28);
    }

    /* ── INVOICE header (right) ── */
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(26);
    pdf.setTextColor(...dark); pdf.text('INVOICE', mR, 18, { align: 'right' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...muted);
    pdf.text(`No: ${invNo}`,                              mR, 26, { align: 'right' });
    pdf.text(`Date: ${invDate}`,                          mR, 32, { align: 'right' });
    pdf.text(`Status: ${(order.status||'pending').toUpperCase()}`, mR, 38, { align: 'right' });
    pdf.text('Tel: +94 776 831 508',                     mR, 44, { align: 'right' });

    /* ── Amber rule ── */
    pdf.setFillColor(...amber); pdf.rect(mL, 48, mR - mL, 0.8, 'F');

    /* ── Billed To ── */
    let y = 56;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...amber);
    pdf.text('BILLED TO', mL, y);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...dark);
    pdf.text(order.customerName || '—', mL, y + 6);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...mid);
    let billedY = y + 12;
    if (order.customerPhone) { pdf.text(`Phone: ${order.customerPhone}`, mL, billedY); billedY += 5; }
    if (order.customerEmail) { pdf.text(`Email: ${order.customerEmail}`, mL, billedY); }

    /* ── Delivery Details ── */
    const colR = 110;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...amber);
    pdf.text('DELIVERY DETAILS', colR, y);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...mid);
    pdf.text(`Method: ${order.deliveryMethod || 'Courier'}`, colR, y + 6);
    pdf.text(`Est. Date: ${order.deliveryDate || '—'}`,      colR, y + 11);
    const addrLines = pdf.splitTextToSize(order.shippingAddress || '—', 78);
    pdf.text('Address:', colR, y + 16);
    pdf.text(addrLines,  colR, y + 21);

    /* ── Divider ── */
    y = 83;
    pdf.setDrawColor(...hairline); pdf.setLineWidth(0.35);
    pdf.line(mL, y, mR, y);

    /* ── Table header ── */
    y = 86;
    pdf.setFillColor(...bgRow); pdf.rect(mL, y, mR - mL, 7.5, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...dark);
    pdf.text('DESCRIPTION', mL + 2, y + 5);
    pdf.text('COLOR',       100,     y + 5);
    pdf.text('QTY',         132,     y + 5, { align: 'right' });
    pdf.text('UNIT (LKR)',  158,     y + 5, { align: 'right' });
    pdf.text('TOTAL (LKR)', mR - 1,  y + 5, { align: 'right' });
    pdf.setDrawColor(...hairline); pdf.setLineWidth(0.3);
    pdf.line(mL, y + 7.5, mR, y + 7.5);

    /* ── Item rows ── */
    y = 97;
    const ROW_H = 11; // height per item row
    items.forEach((item, idx) => {
      // Alternate row shading
      if (idx % 2 === 1) {
        pdf.setFillColor(253, 251, 244); // very light amber tint
        pdf.rect(mL, y - 3, mR - mL, ROW_H, 'F');
      }
      const lineTotal = item.unitPrice * item.quantity;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...dark);
      pdf.text(item.productName || '—', mL + 2, y);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...muted);
      pdf.text(`Ref: ${item.productId}`, mL + 2, y + 4.5);
      pdf.setFontSize(9); pdf.setTextColor(...dark);
      pdf.text(item.colorName || '—',                      100,    y);
      pdf.text(String(item.quantity),                      132,    y, { align: 'right' });
      pdf.text(item.unitPrice.toFixed(2),                  158,    y, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(lineTotal.toFixed(2),                       mR - 1, y, { align: 'right' });
      // Row bottom border
      pdf.setDrawColor(...hairline); pdf.setLineWidth(0.25);
      pdf.line(mL, y + ROW_H - 3, mR, y + ROW_H - 3);
      y += ROW_H;
    });

    /* ── Totals ── */
    y += 4;
    const totW = 76;
    const totX = mR - totW;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...muted);
    pdf.text('Subtotal:', totX, y);
    pdf.setTextColor(...dark); pdf.text(`LKR ${itemsSubtotal.toFixed(2)}`, mR, y, { align: 'right' });
    pdf.setTextColor(...muted); pdf.text('Delivery Fee:', totX, y + 7);
    pdf.setTextColor(...dark); pdf.text(`LKR ${deliveryFee.toFixed(2)}`, mR, y + 7, { align: 'right' });

    pdf.setFillColor(...amber);
    pdf.roundedRect(totX - 2, y + 12, mR - totX + 2, 9, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(255, 255, 255);
    pdf.text('TOTAL DUE', totX + 2, y + 17.5);
    pdf.text(`LKR ${grandTotal.toFixed(2)}`, mR - 2, y + 17.5, { align: 'right' });

    /* ── Footer ── */
    pdf.setFillColor(...amber); pdf.rect(0, 282, pageW, 1.2, 'F');
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(...muted);
    pdf.text('Thank you for your business with Stitch Hive!', 105, 273, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.text('For enquiries: +94 776 831 508', 105, 278, { align: 'center' });

    pdf.save(`invoice_${invNo}.pdf`);
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
              {/* Add Mode Toggle Tabs */}
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => setProductAddMode('single')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productAddMode === 'single'
                      ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <span>✍️</span> Single Product
                </button>
                <button
                  type="button"
                  onClick={() => setProductAddMode('bulk')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productAddMode === 'bulk'
                      ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <span>📁</span> Bulk Upload
                </button>
              </div>

              {productAddMode === 'single' ? (
                <form onSubmit={handleCreateProduct} className="space-y-5 animate-fade-in">
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
                        className="px-3 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300 transition animate-fade-in cursor-pointer"
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300 cursor-pointer"
                  >
                    {loading ? 'Creating…' : 'Create Product'}
                  </button>
                </form>
              ) : (
                /* Bulk Upload Form */
                <div className="space-y-5 animate-fade-in">
                  {/* Download Template Section */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-200/50 bg-amber-50/20 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Excel Template</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Download the standard sheet layout to prepare your items</p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadExcelTemplate}
                      className="flex items-center gap-2 rounded-xl bg-amber-100 hover:bg-amber-200/80 px-4 py-2 text-xs font-bold text-amber-950 transition dark:bg-amber-400/10 dark:text-amber-400 dark:hover:bg-amber-400/20 cursor-pointer"
                    >
                      <span>📥</span> Download
                    </button>
                  </div>

                  {/* File Upload Zone */}
                  <div>
                    <FieldLabel>Upload Filled Sheet (.xlsx, .xls, .csv)</FieldLabel>
                    <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-6 bg-white dark:bg-zinc-800/10 hover:border-amber-400 dark:hover:border-amber-400 transition-colors relative cursor-pointer group">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        key={bulkFile ? 'file-uploaded' : 'file-empty'}
                      />
                      <div className="text-center space-y-2 pointer-events-none">
                        <span className="text-3xl">📊</span>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-amber-500 transition-colors">
                          {bulkFile ? bulkFile.name : 'Drag & drop or click to browse'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : 'Supports Excel or CSV format'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Parsed Preview Table */}
                  {parsedProducts.length > 0 && (
                    <div className="space-y-4 pt-2 animate-fade-in">
                      
                      {/* Duplicate Strategy Option */}
                      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-3">
                        <FieldLabel htmlFor="dup-strategy">Duplicate Handling Strategy</FieldLabel>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 -mt-1">
                          Select how to handle products whose name already exists in the inventory.
                        </p>
                        <select
                          id="dup-strategy"
                          value={duplicateStrategy}
                          onChange={(e) => setDuplicateStrategy(e.target.value)}
                          className={`${inputBase} cursor-pointer`}
                        >
                          <option value="skip">⏭️ Skip duplicates (Keep existing)</option>
                          <option value="merge">➕ Merge / Add Stock & Update Price</option>
                          <option value="overwrite">🔄 Overwrite existing product completely</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                          Parsed Products ({parsedProducts.length})
                        </h4>
                        <button
                          type="button"
                          onClick={clearBulkUpload}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 transition cursor-pointer"
                        >
                          Clear File
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <table className="w-full text-xs text-left">
                          <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Category</th>
                              <th className="px-3 py-2 text-right">Price</th>
                              <th className="px-3 py-2 text-right">Stock</th>
                              <th className="px-3 py-2">Colors</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900/30">
                            {parsedProducts.map((p, index) => {
                              let statusBadge = null;
                              let rowClass = "";
                              
                              if (p.errors.length > 0) {
                                statusBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" title={p.errors.join(', ')}>✕ Error</span>;
                                rowClass = "bg-red-50/20 dark:bg-red-950/5";
                              } else if (p.isDuplicate) {
                                statusBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">⚠️ Dup</span>;
                                rowClass = "bg-amber-50/10 dark:bg-amber-950/5";
                              } else {
                                statusBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">✓ Ready</span>;
                              }

                              return (
                                <tr key={index} className={`${rowClass} hover:bg-zinc-50 dark:hover:bg-zinc-800/40`}>
                                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{statusBadge}</td>
                                  <td className="px-3 py-2.5 font-semibold text-zinc-900 dark:text-white truncate max-w-[120px]" title={p.name}>
                                    {p.name}
                                  </td>
                                  <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400">{p.category}</td>
                                  <td className="px-3 py-2.5 text-right font-medium">{p.price.toFixed(2)}</td>
                                  <td className="px-3 py-2.5 text-right font-medium">{p.totalStock}</td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-1">
                                      {p.colors.map((c, i) => (
                                        <span
                                          key={i}
                                          className="inline-block h-3 w-3 rounded-full border border-white/20 shadow-sm"
                                          style={{ backgroundColor: c.hex }}
                                          title={`${c.name} (${c.hex})`}
                                        />
                                      ))}
                                      {p.colors.length === 0 && <span className="text-zinc-400 text-[10px]">None</span>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Validation Warnings Summary */}
                      {(() => {
                        const allWarnings = parsedProducts.flatMap(p => p.warnings);
                        const allErrors = parsedProducts.flatMap(p => p.errors);
                        if (allWarnings.length === 0 && allErrors.length === 0) return null;
                        return (
                          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 max-h-32 overflow-y-auto">
                            {allErrors.map((e, idx) => (
                              <p key={`e-${idx}`} className="text-[10px] text-red-500 font-semibold">✕ {e}</p>
                            ))}
                            {allWarnings.map((w, idx) => (
                              <p key={`w-${idx}`} className="text-[10px] text-amber-500 font-medium">⚠️ {w}</p>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Confirm upload button */}
                      <button
                        type="button"
                        disabled={loading || parsedProducts.filter(p => p.isValid).length === 0}
                        onClick={handleConfirmBulkUpload}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300 cursor-pointer"
                      >
                        {loading ? 'Importing…' : `Confirm Import (${parsedProducts.filter(p => p.isValid).length} Products)`}
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                subtitle="Add multiple products, then submit — stock deducted automatically"
              >
                <form onSubmit={handleCreateOrder} className="space-y-5">

                  {/* ── Step 1: Item Picker ── */}
                  <div className="rounded-2xl border border-amber-200/60 dark:border-zinc-700 bg-amber-50/40 dark:bg-zinc-800/30 p-4 space-y-3">
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Step 1 — Add Products</p>

                    {/* Product select */}
                    <div>
                      <FieldLabel htmlFor="order-product">Product</FieldLabel>
                      <select
                        id="order-product"
                        value={draftItem.productId}
                        onChange={(e) => handleDraftProductChange(e.target.value)}
                        disabled={loadingProducts}
                        className={`${inputBase} cursor-pointer`}
                      >
                        <option value="">Choose a product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.totalStock} units
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color swatches for draft item */}
                  {draftItem.productId && (() => {
                    const sel = products.find(p => p.id === draftItem.productId);
                    if (!sel?.colors?.length) return null;
                    return (
                      <div>
                        <FieldLabel>Color</FieldLabel>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {sel.colors.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setDraftItem({ ...draftItem, colorHex: c.hex, colorName: c.name })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                                draftItem.colorHex === c.hex
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

                  {/* Qty + Price + Add button */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <FieldLabel htmlFor="draft-qty">Qty</FieldLabel>
                      <input id="draft-qty" type="number" min="1"
                        value={draftItem.quantity}
                        onChange={(e) => setDraftItem({ ...draftItem, quantity: e.target.value })}
                        className={inputBase} />
                    </div>
                    <div className="flex-1">
                      <FieldLabel htmlFor="draft-price">Unit Price (LKR)</FieldLabel>
                      <input id="draft-price" type="number" step="0.01" min="0"
                        value={draftItem.unitPrice}
                        onChange={(e) => setDraftItem({ ...draftItem, unitPrice: e.target.value })}
                        className={inputBase} />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDraftItem}
                      className="shrink-0 h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-bold transition cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                  </div>{/* end Step 1 box */}

                  {/* ── Step 2: Order Basket ── */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                      <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Step 2 — Order Basket
                        {orderItems.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-zinc-900 text-[10px]">{orderItems.length}</span>}
                      </p>
                      {orderItems.length > 0 && (
                        <span className="text-xs font-bold text-amber-600">
                          LKR {orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {orderItems.length === 0 ? (
                      <p className="px-4 py-5 text-center text-xs text-zinc-400 italic">No items added yet. Use Step 1 above to add products.</p>
                    ) : (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                        {orderItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                            {item.colorHex && (
                              <span className="shrink-0 w-3 h-3 rounded-full border border-zinc-200" style={{ backgroundColor: item.colorHex }} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{item.productName}</p>
                              <p className="text-[10px] text-zinc-500">
                                {item.colorName ? `${item.colorName} · ` : ''}Qty: {item.quantity} × LKR {item.unitPrice.toFixed(2)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-zinc-800 dark:text-white">
                              LKR {(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderItem(idx)}
                              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition cursor-pointer text-base leading-none"
                              title="Remove item"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Step 3: Customer & Delivery ── */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Step 3 — Customer & Delivery</p>
                    <div>
                      <FieldLabel htmlFor="cust-name">Customer Name *</FieldLabel>
                      <input id="cust-name" type="text" placeholder="Jane Doe"
                        value={customerFields.customerName}
                        onChange={(e) => setCustomerFields({ ...customerFields, customerName: e.target.value })}
                        className={inputBase} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel htmlFor="cust-phone">Phone</FieldLabel>
                        <input id="cust-phone" type="text" placeholder="+94 77 123 4567"
                          value={customerFields.customerPhone}
                          onChange={(e) => setCustomerFields({ ...customerFields, customerPhone: e.target.value })}
                          className={inputBase} />
                      </div>
                      <div>
                        <FieldLabel htmlFor="cust-email">Email</FieldLabel>
                        <input id="cust-email" type="email" placeholder="jane@example.com"
                          value={customerFields.customerEmail}
                          onChange={(e) => setCustomerFields({ ...customerFields, customerEmail: e.target.value })}
                          className={inputBase} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel htmlFor="cust-address">Shipping Address</FieldLabel>
                      <textarea id="cust-address" placeholder="Street, City, Zip"
                        value={customerFields.shippingAddress}
                        onChange={(e) => setCustomerFields({ ...customerFields, shippingAddress: e.target.value })}
                        rows="2" className={`${inputBase} resize-none`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel htmlFor="delivery-method">Delivery Method</FieldLabel>
                        <select id="delivery-method"
                          value={customerFields.deliveryMethod}
                          onChange={(e) => setCustomerFields({ ...customerFields, deliveryMethod: e.target.value })}
                          className={`${inputBase} cursor-pointer`}>
                          <option value="Courier">Courier</option>
                          <option value="Pickup">Store Pickup</option>
                          <option value="Express">Express Shipping</option>
                          <option value="Standard">Standard Post</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel htmlFor="delivery-date">Est. Delivery Date</FieldLabel>
                        <input id="delivery-date" type="date"
                          value={customerFields.deliveryDate}
                          onChange={(e) => setCustomerFields({ ...customerFields, deliveryDate: e.target.value })}
                          className={inputBase} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel htmlFor="order-fee">Delivery Fee (LKR)</FieldLabel>
                      <input id="order-fee" type="number" step="0.01" min="0"
                        value={customerFields.deliveryFee}
                        onChange={(e) => setCustomerFields({ ...customerFields, deliveryFee: e.target.value })}
                        className={inputBase} />
                    </div>
                  </div>

                  {/* Grand total preview */}
                  {orderItems.length > 0 && (
                    <div className="flex justify-between items-center rounded-xl px-4 py-3 bg-amber-400 dark:bg-amber-500">
                      <span className="text-sm font-bold text-zinc-900">Grand Total</span>
                      <span className="text-sm font-extrabold text-zinc-900">
                        LKR {(orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + (parseFloat(customerFields.deliveryFee) || 0)).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <button type="submit" disabled={loading || orderItems.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-900 dark:hover:bg-amber-300"
                  >
                    {loading ? 'Creating Order…' : `Place Order${orderItems.length > 0 ? ` (${orderItems.length} item${orderItems.length > 1 ? 's' : ''})` : ''}`}
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
                            const rowItems = getOrderItems(order);
                            const orderTotal = rowItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + (order.deliveryFee || 0);
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
                                  <p className="font-medium text-zinc-900 dark:text-white leading-tight">
                                    {rowItems[0]?.productName || order.productName}
                                    {rowItems.length > 1 && (
                                      <span className="ml-1 text-xs text-amber-600 font-bold">+{rowItems.length - 1} more</span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {rowItems[0]?.colorHex && (
                                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-200" style={{ backgroundColor: rowItems[0].colorHex }} title={rowItems[0].colorName} />
                                    )}
                                    <span className="text-xs text-zinc-500 font-medium">
                                      {rowItems.length === 1
                                        ? `${rowItems[0]?.colorName ? rowItems[0].colorName + ' • ' : ''}Qty: ${rowItems[0]?.quantity}`
                                        : `${rowItems.length} items · Total qty: ${rowItems.reduce((s, i) => s + i.quantity, 0)}`
                                      }
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
                  const invoiceItems  = getOrderItems(activeOrder);
                  const itemsSubtotal = invoiceItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                  const deliveryFee   = Number(activeOrder.deliveryFee || 0);
                  const grandTotal    = itemsSubtotal + deliveryFee;

                  return (
                    <div className="relative overflow-hidden border border-zinc-200 dark:border-zinc-700 rounded-2xl bg-white p-0">
                      {/* Invoice Paper - mirrors PDF layout exactly */}
                      <div className="invoice-paper print-area p-6 sm:p-8 text-left text-zinc-800 bg-white">

                        {/* ── Header: Logo left, INVOICE block right ── */}
                        <div className="flex justify-between items-start pb-4 mb-4" style={{ borderBottom: '2px solid #f59e0b' }}>
                          <div className="flex items-center gap-3">
                            <img src={stitchHiveLogo} alt="Stitch Hive" className="h-14 w-14 object-contain" />
                          </div>
                          <div className="text-right">
                            <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-none">INVOICE</h1>
                            <p className="text-[10px] text-zinc-500 mt-1.5">
                              No: <span className="font-bold text-zinc-800">INV-{activeOrder.orderNumber || activeOrder.id.slice(0, 6).toUpperCase()}</span>
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Date: {activeOrder.createdAt ? (activeOrder.createdAt.toDate ? activeOrder.createdAt.toDate().toLocaleDateString('en-GB') : new Date(activeOrder.createdAt).toLocaleDateString('en-GB')) : new Date().toLocaleDateString('en-GB')}
                            </p>
                            <p className="text-[10px] text-zinc-500">Status: <span className="font-semibold text-zinc-700 uppercase">{activeOrder.status || 'pending'}</span></p>
                            <p className="text-[10px] text-zinc-500">Tel: +94 776 831 508</p>
                          </div>
                        </div>

                        {/* ── Billed To + Delivery Details ── */}
                        <div className="grid grid-cols-2 gap-4 mb-5 text-[10px]">
                          <div>
                            <p className="text-[8px] font-bold text-amber-500 uppercase tracking-wider mb-1">Billed To</p>
                            <p className="font-bold text-zinc-900 text-sm">{activeOrder.customerName}</p>
                            {activeOrder.customerPhone && <p className="text-zinc-500 mt-0.5">Phone: {activeOrder.customerPhone}</p>}
                            {activeOrder.customerEmail && <p className="text-zinc-500">Email: {activeOrder.customerEmail}</p>}
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-amber-500 uppercase tracking-wider mb-1">Delivery Details</p>
                            <p className="text-zinc-600">Method: <span className="font-semibold text-zinc-800">{activeOrder.deliveryMethod}</span></p>
                            {activeOrder.deliveryDate && <p className="text-zinc-600">Est. Date: <span className="font-semibold text-zinc-800">{activeOrder.deliveryDate}</span></p>}
                            <p className="text-zinc-600 mt-0.5">Address:</p>
                            <p className="text-zinc-500 whitespace-pre-wrap leading-snug">{activeOrder.shippingAddress || '—'}</p>
                          </div>
                        </div>

                        {/* ── Divider ── */}
                        <div className="border-t border-zinc-200 mb-4" />

                        {/* ── Items Table ── */}
                        <table className="w-full text-left mb-4">
                          <thead>
                            <tr className="bg-zinc-50 text-zinc-500 text-[8px] font-bold uppercase">
                              <th className="py-2 px-2">Description</th>
                              <th className="py-2 px-2">Color</th>
                              <th className="py-2 px-2 text-right">Qty</th>
                              <th className="py-2 px-2 text-right">Unit (LKR)</th>
                              <th className="py-2 px-2 text-right">Total (LKR)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceItems.map((item, idx) => (
                              <tr key={idx} className={`border-t border-zinc-100 text-[10px] ${idx % 2 === 1 ? 'bg-amber-50/40' : ''}`}>
                                <td className="py-2.5 px-2">
                                  <p className="font-bold text-zinc-900">{item.productName}</p>
                                  <p className="text-[8px] text-zinc-400">Ref: {item.productId}</p>
                                </td>
                                <td className="py-2.5 px-2 text-zinc-700">
                                  {item.colorHex ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="h-2.5 w-2.5 rounded-full border border-zinc-200 shrink-0" style={{ backgroundColor: item.colorHex }} />
                                      {item.colorName}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="py-2.5 px-2 text-right font-semibold text-zinc-800">{item.quantity}</td>
                                <td className="py-2.5 px-2 text-right text-zinc-700">{Number(item.unitPrice || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-2 text-right font-bold text-zinc-900">{(item.unitPrice * item.quantity).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* ── Totals ── */}
                        <div className="flex justify-end mb-5">
                          <div className="w-52 text-[10px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Subtotal:</span>
                              <span className="font-semibold text-zinc-800">LKR {itemsSubtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Delivery Fee:</span>
                              <span className="font-semibold text-zinc-800">LKR {deliveryFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center rounded-lg px-2 py-1.5 mt-1" style={{ backgroundColor: '#f59e0b' }}>
                              <span className="font-bold text-white text-[9px] uppercase tracking-wide">Total Due</span>
                              <span className="font-extrabold text-white">LKR {grandTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="border-t border-zinc-200 pt-3 text-center">
                          <p className="text-[8px] italic text-zinc-400">Thank you for your business with Stitch Hive!</p>
                          <p className="text-[8px] text-zinc-400 mt-0.5">For enquiries: <span className="font-semibold text-zinc-600">+94 776 831 508</span></p>
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


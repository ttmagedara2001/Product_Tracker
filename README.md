# 🐝 Stitch Hive Product Tracker & Inventory System

Stitch Hive Product Tracker is a modern, real-time web application designed to track and manage product inventory, record customer orders, and generate professional invoices. It features a premium, responsive interface with deep light/dark mode styling, subtle micro-animations, and warm radial honey/bee-themed aesthetics.

---

## 🚀 Core Features

### 1. Real-Time Dashboard
* **Dynamic Inventory Overview**: View total product counts, aggregate stock, low stock warnings (≤10 units), and categories.
* **Color-Sensitive Representation**: Products with assigned color palettes display their corresponding color swatches directly on the dashboard cards.
* **Search & Filters**: Instant matching by name, category, or color availability.

### 2. Admin Inventory Management
* **Single Product Registration**: Add items with name, category, price (LKR), initial stock, and colors.
* **Default Color Palette**: Single-click toggles for a curated honey-themed default palette (Honey, Gold, Crimson, Blue, Green, Purple, Pink, Teal, Black, White, Brown, Gray).
* **Custom Color Assignment**: Input any custom color name and hex code (e.g., `CustomRed: #ff0055`).
* **Quick Stock Adjustment**: Inline buttons to quickly increment or decrement stock counts directly from the inventory table.
* **CSV Export**: Export all product records to a CSV file.

### 3. Excel Bulk Product Import
* **Template Downloader**: Instantly download a formatted Excel spreadsheet (`stitch_hive_bulk_products_template.xlsx`) outlining columns and example rows.
* **File Parser**: Upload `.xlsx` or `.csv` sheets with automatic validation of numeric columns (stock count and price).
* **Color Matching & Parsing**: Maps color names to hex codes via the default palette or accepts custom name-to-hex configurations (e.g., `Gold: #FBBF24`).
* **Interactive Validation Table**: Highlights parsed rows showing status badges (`✓ Ready`, `⚠️ Dup`, `✕ Error`) and specific formatting warning summaries.
* **Duplicate Strategy Resolution**: Select from three strategies when conflicts arise with existing inventory:
  1. **Skip duplicates** (Default): Keeps current records; imports new items.
  2. **Merge / Add Stock**: Adds incoming stock counts to current totals and updates prices.
  3. **Overwrite**: Completely replaces current catalog fields with incoming data.

### 4. Multi-Product Order Tracking
* **Order Basket Builder**: Add multiple products, customize colors, set item counts, and specify prices before submitting an order. Includes item combination merging and running totals.
* **Stock Synchronization**: Automatically decrements stock from inventory database upon submission.
* **Status-Based Filters**: Track pending, dispatched, delivered, or cancelled orders with status updates.

### 5. Inline Invoice Preview & Print
* **Professional A4 Preview**: Interactive inline preview sheet containing billing info, shipping info, detailed multiple rows, and totals.
* **High-Fidelity PDF Exports**: Instantly download custom formatted vector PDFs via `jsPDF`.
* **Standard Printing Rules**: Clean `@media print` rules hide UI panels to let users launch browser printing dialogs cleanly for physical invoices.

---

## 🛠️ Technology Stack

* **Frontend**: React (v19) + Vite
* **Database**: Firebase (Cloud Firestore)
* **Styling**: Vanilla CSS (TailwindCSS enabled for layout utilities)
* **PDF Utility**: `jspdf`
* **Spreadsheet Utility**: `xlsx` (SheetJS)

---

## ⚙️ Installation & Configuration

### Prerequisites
Make sure you have Node.js installed (v18+ recommended).

### 1. Clone & Install Dependencies
```bash
# Install packages
npm install
```

### 2. Configure Firebase Security Rules
In your Firebase Console, make sure you configure your Cloud Firestore security rules to allow read/write operations on the `products` and `orders` collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{document} {
      allow read, write: if true;
    }
    match /orders/{document} {
      allow read, write: if true;
    }
  }
}
```

### 3. Configure Environment Variables
Create a `.env` file in the project root folder and specify your Firebase keys and administrative password:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_PASSWORD=admin123
```

### 4. Start Development Server
```bash
# Runs dev server at http://localhost:5173
npm run dev
```

### 5. Compile Production Bundle
```bash
# Compiles minified bundle into the /dist directory
npm run build
```

---

## 📊 Firestore Database Schema

### `products` Collection
```typescript
{
  name: string;             // Unique product name
  category: string;         // E.g., "Textiles", "Tableware"
  totalStock: number;       // Current inventory units
  price: number;            // Product unit price in LKR
  colors: Array<{           // Assigned color list
    name: string;
    hex: string;
  }>;
  createdAt?: Timestamp;    // Timestamp of creation
  lastUpdated?: Timestamp;  // Timestamp of edits or stock changes
}
```

### `orders` Collection
```typescript
{
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  deliveryMethod: string;   // E.g., "Courier", "Store Pickup"
  deliveryDate: string;
  deliveryFee: number;      // Fixed delivery cost (LKR)
  status: string;           // "pending" | "dispatched" | "delivered" | "cancelled"
  createdAt: Timestamp;
  items: Array<{            // Multi-product order item list
    productId: string;
    productName: string;
    colorHex: string;
    colorName: string;
    quantity: number;
    unitPrice: number;
  }>;
}
```

---

## 📁 Excel Spreadsheet Import Structure
When creating bulk upload sheets, structure columns with the following headings (case-insensitive):

| Product Name | Category | Stock Count | Unit Price (LKR) | Colors |
| :--- | :--- | :--- | :--- | :--- |
| Honey Glazed Fabric | Textiles | 150 | 850.00 | Honey, Crimson, Gold |
| Classic Serviettes | Tableware | 80 | 240.00 | White: #F4F4F5, Black: #18181B |
| Premium Sewing Thread | Accessories | 300 | 120.50 | Blue, Teal |

* *Note on colors*: Specify colors as a comma-separated list. They will automatically resolve hex codes from the standard color palette or map explicitly using name-to-hex combinations (e.g. `Color: #HexCode`).

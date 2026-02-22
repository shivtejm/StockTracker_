/* ============================================
   StockTracker — Data Layer & Seed Data
   Supabase-backed with localStorage cache
   ============================================ */

// ─── Utility Helpers ───
const DB = {
    get: (key) => JSON.parse(localStorage.getItem('st_' + key) || 'null'),
    set: (key, val) => localStorage.setItem('st_' + key, JSON.stringify(val)),
    remove: (key) => localStorage.removeItem('st_' + key),
};

function genId() { return Date.now() + Math.floor(Math.random() * 1000); }
function genSKU(cat) { return (cat || 'GEN').substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000); }
function genInvoice() { return 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000)); }
function genPO() { return 'PO-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000)); }
function genReturn() { return 'RET-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000)); }
function fmtCur(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtDateTime(d) { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function today() { return new Date().toISOString().split('T')[0]; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; }
function profitMargin(cost, sell) { return sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0.0'; }

// ─── Supabase Sync Layer ───
// Maps localStorage keys to Supabase column names
const SYNC_KEYS = {
    products: 'products',
    sales: 'sales',
    suppliers: 'suppliers',
    customers: 'customers',
    purchaseOrders: 'purchase_orders',
    returns: 'returns',
    adjustments: 'adjustments',
    discounts: 'discounts',
    activities: 'activities',
    settings: 'settings',
};

// Push a single key to Supabase (fire-and-forget)
function syncToSupabase(localKey) {
    const colName = SYNC_KEYS[localKey];
    if (!colName) return;
    const data = DB.get(localKey);
    const userId = getCurrentUserId();
    if (!userId) return;

    supabaseClient
        .from('store_data')
        .update({ [colName]: data, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .then(({ error }) => {
            if (error) console.error('Supabase sync error (' + localKey + '):', error.message);
        });
}

// Load all data from Supabase into localStorage
async function loadFromSupabase() {
    const userId = getCurrentUserId();
    if (!userId) return false;

    const { data, error } = await supabaseClient
        .from('store_data')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Failed to load data from Supabase:', error.message);
        // If no row exists yet, create one
        if (error.code === 'PGRST116') {
            const { error: insertErr } = await supabaseClient
                .from('store_data')
                .insert({ user_id: userId });
            if (insertErr) console.error('Failed to create store_data row:', insertErr.message);
        }
        return false;
    }

    if (data) {
        // Load each column into localStorage
        DB.set('products', data.products || []);
        DB.set('sales', data.sales || []);
        DB.set('suppliers', data.suppliers || []);
        DB.set('customers', data.customers || []);
        DB.set('purchaseOrders', data.purchase_orders || []);
        DB.set('returns', data.returns || []);
        DB.set('adjustments', data.adjustments || []);
        DB.set('discounts', data.discounts || []);
        DB.set('activities', data.activities || []);
        DB.set('settings', data.settings || {});
        DB.set('seeded', data.seeded || false);
        return true;
    }
    return false;
}

// Push ALL data to Supabase (used after seeding)
async function syncAllToSupabase() {
    const userId = getCurrentUserId();
    if (!userId) return;

    const updateData = {
        products: DB.get('products') || [],
        sales: DB.get('sales') || [],
        suppliers: DB.get('suppliers') || [],
        customers: DB.get('customers') || [],
        purchase_orders: DB.get('purchaseOrders') || [],
        returns: DB.get('returns') || [],
        adjustments: DB.get('adjustments') || [],
        discounts: DB.get('discounts') || [],
        activities: DB.get('activities') || [],
        settings: DB.get('settings') || {},
        seeded: true,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
        .from('store_data')
        .update(updateData)
        .eq('user_id', userId);

    if (error) console.error('Failed to sync all data:', error.message);
}

// Get current logged-in user's ID from Supabase session
function getCurrentUserId() {
    const session = DB.get('supabase_session');
    return session?.user?.id || null;
}

// Clear all local data on logout
function clearLocalData() {
    Object.keys(SYNC_KEYS).forEach(key => DB.remove(key));
    DB.remove('seeded');
    DB.remove('auth');
    DB.remove('user');
    DB.remove('supabase_session');
}

// ─── Data Access (unchanged — reads from localStorage cache) ───
function getProducts() { return DB.get('products') || []; }
function getSuppliers() { return DB.get('suppliers') || []; }
function getCustomers() { return DB.get('customers') || []; }
function getSales() { return DB.get('sales') || []; }
function getActivities() { return DB.get('activities') || []; }
function getPurchaseOrders() { return DB.get('purchaseOrders') || []; }
function getReturns() { return DB.get('returns') || []; }
function getAdjustments() { return DB.get('adjustments') || []; }
function getDiscounts() { return DB.get('discounts') || []; }
function getSettings() { return DB.get('settings') || { companyName: 'StockTracker', gstin: '', address: '', phone: '', gstRate: 18, lowStock: 10, overstock: 200, expiryDays: 30, currency: '₹' }; }

// ─── Data Save (write to localStorage + sync to Supabase) ───
function saveProducts(d) { DB.set('products', d); syncToSupabase('products'); }
function saveSuppliers(d) { DB.set('suppliers', d); syncToSupabase('suppliers'); }
function saveCustomers(d) { DB.set('customers', d); syncToSupabase('customers'); }
function saveSales(d) { DB.set('sales', d); syncToSupabase('sales'); }
function saveActivities(d) { DB.set('activities', d); syncToSupabase('activities'); }
function savePurchaseOrders(d) { DB.set('purchaseOrders', d); syncToSupabase('purchaseOrders'); }
function saveReturns(d) { DB.set('returns', d); syncToSupabase('returns'); }
function saveAdjustments(d) { DB.set('adjustments', d); syncToSupabase('adjustments'); }
function saveDiscounts(d) { DB.set('discounts', d); syncToSupabase('discounts'); }
function saveSettings(d) { DB.set('settings', d); syncToSupabase('settings'); }

function addActivity(type, message) {
    const acts = getActivities();
    acts.unshift({ id: genId(), type, message, timestamp: new Date().toISOString(), user: DB.get('user') || 'Admin' });
    if (acts.length > 200) acts.length = 200;
    saveActivities(acts);
}

function getSupplierName(id) {
    if (!id) return '—';
    const s = getSuppliers().find(x => x.id == id);
    return s ? s.name : '—';
}

function getCustomerName(id) {
    if (!id) return 'Walk-in';
    const c = getCustomers().find(x => x.id == id);
    return c ? c.name : 'Walk-in';
}

// ─── Seed Data ───
function seedData() {
    if (DB.get('seeded')) return;

    const suppliers = [
        { id: 1, name: 'TechVision India Pvt Ltd', contact: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@techvision.in', address: 'Nehru Place, New Delhi', rating: 5 },
        { id: 2, name: 'FashionHub Wholesale', contact: 'Priya Sharma', phone: '9123456780', email: 'priya@fashionhub.in', address: 'Surat, Gujarat', rating: 4 },
        { id: 3, name: 'FreshFarms Organics', contact: 'Amit Patel', phone: '9988776655', email: 'amit@freshfarms.in', address: 'Nashik, Maharashtra', rating: 5 },
        { id: 4, name: 'HomeEssentials Co', contact: 'Sneha Reddy', phone: '9876501234', email: 'sneha@homeessentials.in', address: 'Hyderabad, Telangana', rating: 4 },
        { id: 5, name: 'AutoParts Express', contact: 'Vikram Singh', phone: '9811223344', email: 'vikram@autoparts.in', address: 'Ludhiana, Punjab', rating: 3 },
    ];

    const customers = [
        { id: 1, name: 'Arjun Mehta', phone: '9800011122', email: 'arjun@email.com', address: 'MG Road, Bangalore', created_at: daysFromNow(-60), loyaltyPoints: 250 },
        { id: 2, name: 'Neha Gupta', phone: '9800033344', email: 'neha@email.com', address: 'Connaught Place, Delhi', created_at: daysFromNow(-45), loyaltyPoints: 180 },
        { id: 3, name: 'Rahul Verma', phone: '9800055566', email: 'rahul@email.com', address: 'Bandra, Mumbai', created_at: daysFromNow(-30), loyaltyPoints: 420 },
        { id: 4, name: 'Simran Kaur', phone: '9800077788', email: 'simran@email.com', address: 'Sector 17, Chandigarh', created_at: daysFromNow(-20), loyaltyPoints: 90 },
        { id: 5, name: 'Deepak Joshi', phone: '9800099900', email: 'deepak@email.com', address: 'Koregaon Park, Pune', created_at: daysFromNow(-10), loyaltyPoints: 50 },
    ];

    const products = [
        { id: 1, sku: 'ELC-1001', name: 'Laptop Dell Inspiron 15', category: 'Electronics', quantity: 25, costPrice: 38000, sellPrice: 45000, gstPercent: 18, supplier_id: 1, expiryDate: null, minStock: 5, maxStock: 50, created_at: daysFromNow(-90), warranty: '1 Year', unit: 'Pcs', notes: 'Best seller in laptops' },
        { id: 2, sku: 'ELC-1002', name: 'HP Wireless Mouse', category: 'Electronics', quantity: 150, costPrice: 350, sellPrice: 599, gstPercent: 18, supplier_id: 1, expiryDate: null, minStock: 20, maxStock: 200, created_at: daysFromNow(-80), warranty: '6 Months', unit: 'Pcs', notes: '' },
        { id: 3, sku: 'ELC-1003', name: 'Samsung 27" Monitor', category: 'Electronics', quantity: 8, costPrice: 12000, sellPrice: 16500, gstPercent: 18, supplier_id: 1, expiryDate: null, minStock: 10, maxStock: 30, created_at: daysFromNow(-75), warranty: '3 Years', unit: 'Pcs', notes: 'Low stock - reorder needed' },
        { id: 4, sku: 'FSN-2001', name: 'Men Cotton T-Shirt (M)', category: 'Fashion', quantity: 220, costPrice: 250, sellPrice: 499, gstPercent: 12, supplier_id: 2, expiryDate: null, minStock: 15, maxStock: 200, created_at: daysFromNow(-70), warranty: null, unit: 'Pcs', notes: '' },
        { id: 5, sku: 'FSN-2002', name: 'Women Denim Jeans (28)', category: 'Fashion', quantity: 3, costPrice: 600, sellPrice: 1299, gstPercent: 12, supplier_id: 2, expiryDate: null, minStock: 10, maxStock: 100, created_at: daysFromNow(-65), warranty: null, unit: 'Pcs', notes: 'Almost out of stock!' },
        { id: 6, sku: 'FSN-2003', name: 'Silk Saree - Banarasi', category: 'Fashion', quantity: 12, costPrice: 2500, sellPrice: 4999, gstPercent: 5, supplier_id: 2, expiryDate: null, minStock: 5, maxStock: 30, created_at: daysFromNow(-60), warranty: null, unit: 'Pcs', notes: '' },
        { id: 7, sku: 'GRC-3001', name: 'Organic Basmati Rice 5kg', category: 'Grocery', quantity: 45, costPrice: 280, sellPrice: 450, gstPercent: 5, supplier_id: 3, expiryDate: daysFromNow(120), minStock: 20, maxStock: 150, created_at: daysFromNow(-50), warranty: null, unit: 'Bags', notes: '' },
        { id: 8, sku: 'GRC-3002', name: 'Cold Pressed Coconut Oil 1L', category: 'Grocery', quantity: 7, costPrice: 150, sellPrice: 299, gstPercent: 5, supplier_id: 3, expiryDate: daysFromNow(15), minStock: 10, maxStock: 80, created_at: daysFromNow(-40), warranty: null, unit: 'Bottles', notes: 'Expiring soon' },
        { id: 9, sku: 'GRC-3003', name: 'Amul Butter 500g', category: 'Grocery', quantity: 30, costPrice: 140, sellPrice: 260, gstPercent: 12, supplier_id: 3, expiryDate: daysFromNow(5), minStock: 10, maxStock: 60, created_at: daysFromNow(-35), warranty: null, unit: 'Pcs', notes: '' },
        { id: 10, sku: 'HOM-4001', name: 'Ergonomic Office Chair', category: 'Home', quantity: 18, costPrice: 4500, sellPrice: 7500, gstPercent: 18, supplier_id: 4, expiryDate: null, minStock: 5, maxStock: 25, created_at: daysFromNow(-55), warranty: '2 Years', unit: 'Pcs', notes: '' },
        { id: 11, sku: 'HOM-4002', name: 'LED Desk Lamp', category: 'Home', quantity: 60, costPrice: 450, sellPrice: 850, gstPercent: 18, supplier_id: 4, expiryDate: null, minStock: 10, maxStock: 80, created_at: daysFromNow(-45), warranty: '1 Year', unit: 'Pcs', notes: '' },
        { id: 12, sku: 'AUT-5001', name: 'Engine Oil 5W-30 (4L)', category: 'Automotive', quantity: 35, costPrice: 800, sellPrice: 1400, gstPercent: 28, supplier_id: 5, expiryDate: daysFromNow(365), minStock: 10, maxStock: 60, created_at: daysFromNow(-30), warranty: null, unit: 'Cans', notes: '' },
        { id: 13, sku: 'AUT-5002', name: 'Car Battery 12V 65Ah', category: 'Automotive', quantity: 4, costPrice: 3500, sellPrice: 5800, gstPercent: 28, supplier_id: 5, expiryDate: null, minStock: 5, maxStock: 20, created_at: daysFromNow(-25), warranty: '2 Years', unit: 'Pcs', notes: '' },
        { id: 14, sku: 'GRC-3004', name: 'Expired Snack Pack', category: 'Grocery', quantity: 15, costPrice: 50, sellPrice: 99, gstPercent: 12, supplier_id: 3, expiryDate: daysFromNow(-10), minStock: 10, maxStock: 100, created_at: daysFromNow(-60), warranty: null, unit: 'Packs', notes: 'EXPIRED - remove' },
        { id: 15, sku: 'ELC-1004', name: 'USB-C Hub 7-in-1', category: 'Electronics', quantity: 90, costPrice: 800, sellPrice: 1499, gstPercent: 18, supplier_id: 1, expiryDate: null, minStock: 15, maxStock: 100, created_at: daysFromNow(-15), warranty: '1 Year', unit: 'Pcs', notes: '' },
        { id: 16, sku: 'FSN-2004', name: 'Sports Shoes (Size 9)', category: 'Fashion', quantity: 28, costPrice: 1200, sellPrice: 2499, gstPercent: 12, supplier_id: 2, expiryDate: null, minStock: 8, maxStock: 50, created_at: daysFromNow(-12), warranty: '3 Months', unit: 'Pairs', notes: '' },
    ];

    // Seed sales
    const sales = [];
    const saleItems = [
        { pid: 2, qty: 5 }, { pid: 7, qty: 3 }, { pid: 4, qty: 10 },
        { pid: 11, qty: 2 }, { pid: 8, qty: 4 }, { pid: 12, qty: 1 },
        { pid: 1, qty: 1 }, { pid: 10, qty: 2 }, { pid: 6, qty: 1 },
        { pid: 15, qty: 3 }, { pid: 16, qty: 2 },
    ];
    for (let i = 6; i >= 0; i--) {
        const d = daysFromNow(-i);
        const numSales = 1 + Math.floor(Math.random() * 2);
        for (let s = 0; s < numSales; s++) {
            const item = saleItems[(i + s) % saleItems.length];
            const prod = products.find(p => p.id === item.pid);
            if (!prod) continue;
            const qty = item.qty;
            const subtotal = prod.sellPrice * qty;
            const gstAmt = subtotal * prod.gstPercent / 100;
            sales.push({
                id: genId() + i * 1000 + s,
                invoiceNo: 'INV-2026-' + String(1000 + sales.length + 1),
                customer_id: customers[Math.floor(Math.random() * customers.length)].id,
                items: [{ product_id: item.pid, name: prod.name, quantity: qty, price: prod.sellPrice, gstPercent: prod.gstPercent, costPrice: prod.costPrice }],
                subtotal, gstAmount: gstAmt, total: subtotal + gstAmt, discount: 0,
                payment_method: ['Cash', 'UPI', 'Card'][Math.floor(Math.random() * 3)],
                date: d, status: 'Completed'
            });
        }
    }

    // Seed POs
    const purchaseOrders = [
        { id: 1, poNumber: 'PO-2026-1001', supplier_id: 1, items: [{ product_id: 3, name: 'Samsung 27" Monitor', quantity: 20, costPrice: 12000 }], totalAmount: 240000, status: 'Pending', date: daysFromNow(-3), expectedDate: daysFromNow(4), notes: 'Urgent reorder' },
        { id: 2, poNumber: 'PO-2026-1002', supplier_id: 2, items: [{ product_id: 5, name: 'Women Denim Jeans (28)', quantity: 50, costPrice: 600 }], totalAmount: 30000, status: 'Received', date: daysFromNow(-10), expectedDate: daysFromNow(-3), receivedDate: daysFromNow(-2), notes: '' },
        { id: 3, poNumber: 'PO-2026-1003', supplier_id: 3, items: [{ product_id: 8, name: 'Cold Pressed Coconut Oil 1L', quantity: 40, costPrice: 150 }], totalAmount: 6000, status: 'Ordered', date: daysFromNow(-1), expectedDate: daysFromNow(7), notes: '' },
    ];

    // Seed returns
    const returns = [
        { id: 1, returnNo: 'RET-2026-1001', sale_id: sales[0]?.id, customer_id: 1, items: [{ product_id: 2, name: 'HP Wireless Mouse', quantity: 1, price: 599 }], reason: 'Defective product', refundAmount: 706.82, status: 'Completed', date: daysFromNow(-2) },
    ];

    // Seed adjustments  
    const adjustments = [
        { id: 1, product_id: 14, productName: 'Expired Snack Pack', type: 'Damage', quantity: -5, reason: 'Water damage in storage', date: daysFromNow(-5), user: 'Admin' },
        { id: 2, product_id: 2, productName: 'HP Wireless Mouse', type: 'Audit', quantity: +3, reason: 'Physical count correction', date: daysFromNow(-3), user: 'Admin' },
    ];

    // Seed discounts
    const discounts = [
        { id: 1, code: 'WELCOME10', description: '10% off for new customers', type: 'percentage', value: 10, minOrder: 500, maxDiscount: 1000, usageLimit: 100, usedCount: 12, active: true, expiryDate: daysFromNow(30) },
        { id: 2, code: 'FLAT200', description: '₹200 off on orders above ₹2000', type: 'fixed', value: 200, minOrder: 2000, maxDiscount: 200, usageLimit: 50, usedCount: 5, active: true, expiryDate: daysFromNow(60) },
        { id: 3, code: 'SUMMER25', description: '25% off summer sale', type: 'percentage', value: 25, minOrder: 1000, maxDiscount: 5000, usageLimit: 200, usedCount: 45, active: true, expiryDate: daysFromNow(15) },
    ];

    const activities = [
        { id: 1, type: 'sale', message: 'Sold 5x HP Wireless Mouse to Arjun Mehta', timestamp: new Date(daysFromNow(-1) + 'T14:30:00').toISOString(), user: 'Admin' },
        { id: 2, type: 'restock', message: 'Restocked Organic Basmati Rice 5kg (+50 units)', timestamp: new Date(daysFromNow(-1) + 'T10:15:00').toISOString(), user: 'Admin' },
        { id: 3, type: 'alert', message: 'Low stock alert: Samsung 27" Monitor (8 left)', timestamp: new Date(daysFromNow(-2) + 'T09:00:00').toISOString(), user: 'System' },
        { id: 4, type: 'add', message: 'New product added: Car Battery 12V 65Ah', timestamp: new Date(daysFromNow(-3) + 'T16:45:00').toISOString(), user: 'Admin' },
        { id: 5, type: 'invoice', message: 'Invoice INV-2026-1005 generated for ₹16,500', timestamp: new Date(daysFromNow(-3) + 'T11:20:00').toISOString(), user: 'Admin' },
        { id: 6, type: 'purchase', message: 'PO-2026-1001 created for TechVision India', timestamp: new Date(daysFromNow(-3) + 'T10:00:00').toISOString(), user: 'Admin' },
        { id: 7, type: 'return', message: 'Return RET-2026-1001 processed — refund ₹706.82', timestamp: new Date(daysFromNow(-2) + 'T15:30:00').toISOString(), user: 'Admin' },
        { id: 8, type: 'adjustment', message: 'Stock adjusted: Expired Snack Pack -5 units (Water damage)', timestamp: new Date(daysFromNow(-5) + 'T12:00:00').toISOString(), user: 'Admin' },
        { id: 9, type: 'sale', message: 'Sold 1x Laptop Dell Inspiron 15 to Neha Gupta', timestamp: new Date(daysFromNow(-4) + 'T15:00:00').toISOString(), user: 'Admin' },
        { id: 10, type: 'discount', message: 'Coupon WELCOME10 applied — saved ₹500', timestamp: new Date(daysFromNow(-1) + 'T16:00:00').toISOString(), user: 'Admin' },
    ];

    saveSuppliers(suppliers);
    saveCustomers(customers);
    saveProducts(products);
    saveSales(sales);
    saveActivities(activities);
    savePurchaseOrders(purchaseOrders);
    saveReturns(returns);
    saveAdjustments(adjustments);
    saveDiscounts(discounts);

    DB.set('seeded', true);
    // Push seed data to Supabase
    syncAllToSupabase();
}

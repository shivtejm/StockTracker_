/* ============================================
   StockTracker — Core App (Auth, Nav, Dashboard, Products)
   ============================================ */

let salesChartInstance = null, categoryChartInstance = null;
let plChartInstance = null, stockMoveChartInstance = null;
const posCart = [];

// ─── Auth (Supabase) ───
let _appLoading = false;

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;

    if (!email || !pass) { showToast('Please fill in all fields', 'error'); return; }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Signing in...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pass,
        });

        if (error) {
            showToast(error.message || 'Invalid credentials', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-shield-lock"></i> Sign In';
            return;
        }

        if (!data.session) {
            showToast('Please confirm your email before signing in. Check your inbox.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-shield-lock"></i> Sign In';
            return;
        }

        // Clear any previous user's cached data before loading new user
        clearLocalData();

        // Store session and user info
        DB.set('supabase_session', data.session);
        DB.set('auth', true);
        DB.set('user', data.user.email.split('@')[0]);

        // Load data from Supabase for THIS user
        await loadFromSupabase();
        showApp();
    } catch (err) {
        console.error('Login error:', err);
        showToast('Something went wrong. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-shield-lock"></i> Sign In';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;
    const passConfirm = document.getElementById('regPassConfirm').value;

    if (!email) { showToast('Email is required', 'error'); return; }
    if (pass.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (pass !== passConfirm) { showToast('Passwords do not match', 'error'); return; }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Creating account...';

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pass,
        });

        if (error) {
            console.error('Signup error:', error.message, error.status);
            // If user already exists, suggest signing in instead
            if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')) {
                showToast('This email is already registered. Please sign in instead.', 'error');
                showLoginForm();
                document.getElementById('loginUser').value = email;
                document.getElementById('loginPass').value = '';
                document.getElementById('loginPass').focus();
            } else {
                showToast(error.message || 'Registration failed. Please try again.', 'error');
            }
            return;
        }

        // If session exists, auto-login directly to the app
        if (data.session) {
            // Clear any previous user's cached data
            clearLocalData();

            DB.set('supabase_session', data.session);
            DB.set('auth', true);
            DB.set('user', data.user.email.split('@')[0]);
            showToast('Account created! Welcome to StockTracker.', 'success');
            await loadFromSupabase();
            showApp();
            return;
        }

        // If email confirmation is required (session is null), switch to sign-in
        if (data.user && !data.session) {
            showToast('Account created! Check your email to confirm, then sign in.', 'success');
            showLoginForm();
            document.getElementById('loginUser').value = email;
            document.getElementById('loginPass').value = '';
            document.getElementById('loginPass').focus();
        }
    } catch (err) {
        console.error('Registration error:', err);
        showToast('Something went wrong. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-person-plus-fill"></i> Create Account';
    }
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('toggleToRegister').style.display = 'none';
    document.getElementById('toggleToLogin').style.display = 'inline';
    document.getElementById('registerForm').reset();
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('toggleToRegister').style.display = 'inline';
    document.getElementById('toggleToLogin').style.display = 'none';
}

function showApp() {
    seedData();
    const currentUser = DB.get('user') || 'Admin';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser;
    document.getElementById('userAvatar').textContent = currentUser.charAt(0).toUpperCase();
    initTheme();
    navigateTo('dashboard');
    updateAlertBadge();
}

async function logout() {
    await supabaseClient.auth.signOut();
    clearLocalData();
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    showLoginForm();
}

window.onload = async function () {
    // Check for existing Supabase session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        // Clear stale data, then load fresh from Supabase
        clearDataCache();
        DB.set('supabase_session', session);
        DB.set('auth', true);
        DB.set('user', session.user.email.split('@')[0]);
        await loadFromSupabase();
        showApp();
    }
};


// ─── Navigation ───
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');
    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('mobileOverlay')?.classList.remove('show');
    // Render page
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'products': renderProducts(); break;
        case 'sales': renderSales(); break;
        case 'purchaseOrders': renderPurchaseOrders(); break;
        case 'returns': renderReturnsPage(); break;
        case 'suppliers': renderSuppliers(); break;
        case 'customers': renderCustomers(); break;
        case 'discounts': renderDiscounts(); break;
        case 'reports': renderReports(); break;
        case 'alerts': renderAlerts(); break;
        case 'activityLog': renderActivityLog(); break;
        case 'settings': renderSettingsPage(); break;
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobileOverlay').classList.toggle('show');
}

// ─── Theme Toggle ───
function initTheme() {
    const theme = localStorage.getItem('st_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('st_theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
}

// ─── Keyboard Shortcuts ───
document.addEventListener('keydown', function (e) {
    if (!DB.get('auth')) return;
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('globalSearchInput')?.focus(); }
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); openQuickPOS(); }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); navigateTo('products'); document.getElementById('editProductId').value = ''; document.getElementById('productForm').reset(); openModal('addProductModal'); }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); navigateTo('dashboard'); }
    if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show')); }
});

// ─── Global Search ───
function globalSearch(query) {
    const results = document.getElementById('globalSearchResults');
    if (!query || query.length < 2) { results.style.display = 'none'; return; }
    const q = query.toLowerCase();
    const products = getProducts().filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 5);
    const customers = getCustomers().filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)).slice(0, 3);
    const sales = getSales().filter(s => s.invoiceNo.toLowerCase().includes(q)).slice(0, 3);
    const suppliers = getSuppliers().filter(s => s.name.toLowerCase().includes(q)).slice(0, 3);

    let html = '';
    if (products.length) {
        html += '<div class="search-section"><div class="search-section-title">Products</div>';
        products.forEach(p => { html += `<div class="search-item" onclick="navigateTo('products');document.getElementById('globalSearchInput').value='';document.getElementById('globalSearchResults').style.display='none';"><i class="bi bi-box-seam"></i><div><strong>${p.name}</strong><br><small>${p.sku} • ${p.quantity} ${p.unit || 'Pcs'} • ${fmtCur(p.sellPrice)}</small></div></div>`; });
        html += '</div>';
    }
    if (customers.length) {
        html += '<div class="search-section"><div class="search-section-title">Customers</div>';
        customers.forEach(c => { html += `<div class="search-item" onclick="navigateTo('customers');document.getElementById('globalSearchInput').value='';document.getElementById('globalSearchResults').style.display='none';"><i class="bi bi-person"></i><div><strong>${c.name}</strong><br><small>${c.phone || ''}</small></div></div>`; });
        html += '</div>';
    }
    if (sales.length) {
        html += '<div class="search-section"><div class="search-section-title">Invoices</div>';
        sales.forEach(s => { html += `<div class="search-item" onclick="viewInvoice(${s.id});document.getElementById('globalSearchInput').value='';document.getElementById('globalSearchResults').style.display='none';"><i class="bi bi-receipt"></i><div><strong>${s.invoiceNo}</strong><br><small>${fmtCur(s.total)} • ${fmtDate(s.date)}</small></div></div>`; });
        html += '</div>';
    }
    if (suppliers.length) {
        html += '<div class="search-section"><div class="search-section-title">Suppliers</div>';
        suppliers.forEach(s => { html += `<div class="search-item" onclick="navigateTo('suppliers');document.getElementById('globalSearchInput').value='';document.getElementById('globalSearchResults').style.display='none';"><i class="bi bi-truck"></i><div><strong>${s.name}</strong></div></div>`; });
        html += '</div>';
    }
    if (!html) html = '<div class="search-item"><i class="bi bi-search"></i><div>No results found</div></div>';
    results.innerHTML = html;
    results.style.display = 'block';
}

// Close search on outside click
document.addEventListener('click', function (e) {
    if (!e.target.closest('.global-search')) {
        const r = document.getElementById('globalSearchResults');
        if (r) r.style.display = 'none';
    }
});

// ─── Modal & Toast ───
function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    toast.innerHTML = `<i class="bi ${icons[type] || icons.success}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Show Revenue Toast ───
function showRevenueToast(amount) {
    showToast(`Today's Revenue: ${amount}`, 'info');
}

// ─── Dashboard ───
function renderDashboard() {
    const products = getProducts(), sales = getSales(), settings = getSettings();
    const totalProducts = products.length;
    const totalValue = products.reduce((s, p) => s + p.quantity * p.sellPrice, 0);
    const totalCostValue = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);
    const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
    const lowStock = products.filter(p => p.quantity <= (p.minStock || settings.lowStock)).length;
    const overstock = products.filter(p => p.quantity >= (p.maxStock || settings.overstock)).length;
    const expiringSoon = products.filter(p => p.expiryDate && daysBetween(today(), p.expiryDate) <= 30 && daysBetween(today(), p.expiryDate) > 0).length;
    const todaySales = sales.filter(s => s.date === today());
    const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);
    const avgMargin = products.length ? (products.reduce((s, p) => s + parseFloat(profitMargin(p.costPrice, p.sellPrice)), 0) / products.length).toFixed(1) : 0;

    document.getElementById('dashboardKPIs').innerHTML = `
    <div class="kpi-card" title="Total Products: ${totalProducts}" style="cursor:pointer;" onclick="navigateTo('products')"><div class="kpi-card-icon purple"><i class="bi bi-box-seam"></i></div><h3>${totalProducts}</h3><p>Total Products</p></div>
    <div class="kpi-card" style="cursor:pointer;" onclick="showRevenueToast('${fmtCur(todayRevenue)}')"><div class="kpi-card-icon green"><i class="bi bi-cash-stack"></i></div><h3>${fmtCur(todayRevenue)}</h3><p>Today's Sales</p></div>
    <div class="kpi-card" title="Low Stock: ${lowStock}" style="cursor:pointer;" onclick="navigateTo('products');document.getElementById('productStatus').value='low';renderProducts()"><div class="kpi-card-icon red"><i class="bi bi-exclamation-triangle"></i></div><h3>${lowStock}</h3><p>Low Stock</p></div>
    <div class="kpi-card" title="Expiring Soon: ${expiringSoon}" style="cursor:pointer;" onclick="navigateTo('products');document.getElementById('productStatus').value='expiring';renderProducts()"><div class="kpi-card-icon orange"><i class="bi bi-calendar-x"></i></div><h3>${expiringSoon}</h3><p>Expiring Soon</p></div>
  `;

    // Top sellers this week
    const soldMap = {};
    sales.forEach(s => s.items.forEach(i => { soldMap[i.name] = (soldMap[i.name] || 0) + i.quantity; }));
    const topSellers = Object.entries(soldMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById('dashTopSellers').innerHTML = topSellers.length
        ? topSellers.map((t, i) => `<div class="report-metric"><span>${i + 1}. ${t[0]}</span><span class="badge badge-purple">${t[1]} sold</span></div>`).join('')
        : '<p style="color:var(--text-muted);text-align:center;">No sales data yet</p>';

    renderDashboardCharts(products, sales);
    renderActivityFeed();
    updateAlertBadge();
}

function renderDashboardCharts(products, sales) {
    // Sales chart (7 days)
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
        const d = daysFromNow(-i);
        labels.push(new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
        data.push(sales.filter(s => s.date === d).reduce((sum, s) => sum + s.total, 0));
    }
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(document.getElementById('salesChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Revenue', data, backgroundColor: 'rgba(99,102,241,0.6)', borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94a3b8', callback: v => '₹' + (v / 1000).toFixed(0) + 'K' }, grid: { color: 'rgba(255,255,255,0.04)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } }
    });

    // Category chart
    const cats = {};
    products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + p.quantity; });
    const catLabels = Object.keys(cats), catData = Object.values(cats);
    const catColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: catColors.slice(0, catLabels.length), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, usePointStyle: true } } }, cutout: '65%' }
    });
}

function renderActivityFeed() {
    const activities = getActivities().slice(0, 10);
    const list = document.getElementById('activityFeed');
    const icons = { sale: 'bi-cart-check text-green', add: 'bi-plus-circle text-purple', restock: 'bi-arrow-up-circle text-cyan', alert: 'bi-exclamation-triangle text-amber', invoice: 'bi-receipt text-blue', purchase: 'bi-cart-plus text-purple', return: 'bi-arrow-return-left text-red', adjustment: 'bi-sliders text-orange', discount: 'bi-tag text-pink', delete: 'bi-trash text-red' };
    list.innerHTML = activities.map(a => `<li><i class="bi ${icons[a.type] || 'bi-circle text-muted'}"></i><div><span>${a.message}</span><small>${fmtDateTime(a.timestamp)}</small></div></li>`).join('');
}

function updateAlertBadge() {
    const products = getProducts(), settings = getSettings();
    let count = 0;
    products.forEach(p => {
        if (p.quantity <= (p.minStock || settings.lowStock)) count++;
        if (p.quantity >= (p.maxStock || settings.overstock)) count++;
        if (p.expiryDate && daysBetween(today(), p.expiryDate) <= 30) count++;
    });
    const badge = document.getElementById('alertsBadge');
    const toolbarBadge = document.getElementById('toolbarAlertBadge');
    if (count > 0) {
        if (badge) { badge.textContent = count; badge.style.display = 'inline-flex'; }
        if (toolbarBadge) { toolbarBadge.textContent = count; toolbarBadge.style.display = 'inline-flex'; }
    } else {
        if (badge) badge.style.display = 'none';
        if (toolbarBadge) toolbarBadge.style.display = 'none';
    }
}

// ─── Products CRUD ───
function renderProducts() {
    const products = getProducts(), settings = getSettings();
    const search = (document.getElementById('productSearch')?.value || '').toLowerCase();
    const catFilter = document.getElementById('productCategory')?.value || '';
    const statusFilter = document.getElementById('productStatus')?.value || '';

    // Populate category dropdown
    const catSelect = document.getElementById('productCategory');
    if (catSelect && catSelect.options.length <= 1) {
        const cats = [...new Set(products.map(p => p.category))].sort();
        cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSelect.appendChild(o); });
    }

    // Populate supplier dropdown in product modal
    const supSelect = document.getElementById('pSupplier');
    if (supSelect) {
        const suppliers = getSuppliers();
        supSelect.innerHTML = '<option value="">None</option>' + suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    let filtered = products;
    if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search) || p.category.toLowerCase().includes(search));
    if (catFilter) filtered = filtered.filter(p => p.category === catFilter);
    if (statusFilter === 'low') filtered = filtered.filter(p => p.quantity <= (p.minStock || settings.lowStock));
    if (statusFilter === 'overstock') filtered = filtered.filter(p => p.quantity >= (p.maxStock || settings.overstock));
    if (statusFilter === 'expiring') filtered = filtered.filter(p => p.expiryDate && daysBetween(today(), p.expiryDate) <= 30 && daysBetween(today(), p.expiryDate) > 0);
    if (statusFilter === 'expired') filtered = filtered.filter(p => p.expiryDate && daysBetween(today(), p.expiryDate) < 0);

    const tbody = document.getElementById('productsTableBody');
    if (!filtered.length) {
        tbody.innerHTML = ''; document.getElementById('noProductsMsg').style.display = 'block'; return;
    }
    document.getElementById('noProductsMsg').style.display = 'none';

    tbody.innerHTML = filtered.map(p => {
        const margin = profitMargin(p.costPrice, p.sellPrice);
        const marginColor = margin >= 30 ? 'var(--accent-success)' : margin >= 15 ? 'var(--accent-warning)' : 'var(--accent-danger)';
        let statusBadge = '';
        if (p.expiryDate && daysBetween(today(), p.expiryDate) < 0) statusBadge = '<span class="badge badge-red">Expired</span>';
        else if (p.expiryDate && daysBetween(today(), p.expiryDate) <= 7) statusBadge = '<span class="badge badge-orange">Expiring!</span>';
        else if (p.expiryDate && daysBetween(today(), p.expiryDate) <= 30) statusBadge = '<span class="badge badge-amber">Exp. Soon</span>';
        if (p.quantity <= (p.minStock || settings.lowStock)) statusBadge += '<span class="badge badge-red">Low Stock</span>';
        if (p.quantity >= (p.maxStock || settings.overstock)) statusBadge += '<span class="badge badge-amber">Overstock</span>';
        if (!statusBadge) statusBadge = '<span class="badge badge-green">In Stock</span>';

        return `<tr>
      <td><code style="font-size:12px;">${p.sku}</code></td>
      <td><strong>${p.name}</strong>${p.warranty ? '<br><small style="color:var(--text-muted);">🛡 ' + p.warranty + '</small>' : ''}</td>
      <td><span class="badge badge-purple">${p.category}</span></td>
      <td><strong>${p.quantity}</strong> <small style="color:var(--text-muted);">${p.unit || 'Pcs'}</small></td>
      <td>${fmtCur(p.costPrice)}</td>
      <td><strong>${fmtCur(p.sellPrice)}</strong></td>
      <td><span style="color:${marginColor};font-weight:600;">${margin}%</span></td>
      <td>${p.gstPercent}%</td>
      <td>${statusBadge}</td>
      <td style="white-space:nowrap;">
        <button class="btn-icon" onclick="showBarcode(${p.id})" title="Barcode"><i class="bi bi-upc"></i></button>
        <button class="btn-icon" onclick="openAdjustStock(${p.id})" title="Adjust Stock"><i class="bi bi-sliders2"></i></button>
        <button class="btn-icon" onclick="editProduct(${p.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn-icon danger" onclick="deleteProduct(${p.id})" title="Delete"><i class="bi bi-trash3"></i></button>
      </td>
    </tr>`;
    }).join('');
}

function saveProduct() {
    const name = document.getElementById('pName').value.trim();
    if (!name) { showToast('Product name is required', 'error'); return; }
    const products = getProducts();
    const editId = document.getElementById('editProductId').value;
    const cat = document.getElementById('pCategory').value;
    const data = {
        name, sku: document.getElementById('pSKU').value.trim() || genSKU(cat), category: cat,
        quantity: parseInt(document.getElementById('pQty').value) || 0,
        costPrice: parseFloat(document.getElementById('pCost').value) || 0,
        sellPrice: parseFloat(document.getElementById('pSell').value) || 0,
        gstPercent: parseInt(document.getElementById('pGST').value) || 18,
        supplier_id: document.getElementById('pSupplier').value || null,
        expiryDate: document.getElementById('pExpiry').value || null,
        minStock: parseInt(document.getElementById('pMin').value) || 10,
        maxStock: parseInt(document.getElementById('pMax').value) || 200,
        unit: document.getElementById('pUnit').value || 'Pcs',
        warranty: document.getElementById('pWarranty').value.trim() || null,
        notes: document.getElementById('pNotes').value.trim() || '',
    };

    if (editId) {
        const idx = products.findIndex(p => p.id == editId);
        if (idx !== -1) products[idx] = { ...products[idx], ...data };
        addActivity('edit', `Updated product: ${data.name}`);
        showToast('Product updated');
    } else {
        data.id = genId(); data.created_at = today(); products.push(data);
        addActivity('add', `New product added: ${data.name} (${data.sku})`);
        showToast('Product added');
    }
    saveProducts(products);
    closeModal('addProductModal');
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    renderProducts();
}

function editProduct(id) {
    const p = getProducts().find(x => x.id === id);
    if (!p) return;
    document.getElementById('productModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Product';
    document.getElementById('editProductId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pSKU').value = p.sku;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pQty').value = p.quantity;
    document.getElementById('pCost').value = p.costPrice;
    document.getElementById('pSell').value = p.sellPrice;
    document.getElementById('pGST').value = p.gstPercent;
    document.getElementById('pExpiry').value = p.expiryDate || '';
    document.getElementById('pMin').value = p.minStock;
    document.getElementById('pMax').value = p.maxStock;
    document.getElementById('pUnit').value = p.unit || 'Pcs';
    document.getElementById('pWarranty').value = p.warranty || '';
    document.getElementById('pNotes').value = p.notes || '';
    // Populate & set supplier
    const supSelect = document.getElementById('pSupplier');
    supSelect.innerHTML = '<option value="">None</option>' + getSuppliers().map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (p.supplier_id) supSelect.value = p.supplier_id;
    openModal('addProductModal');
}

function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    const p = getProducts().find(x => x.id === id);
    saveProducts(getProducts().filter(x => x.id !== id));
    addActivity('delete', `Deleted product: ${p?.name || 'Unknown'}`);
    showToast('Product deleted', 'warning');
    renderProducts();
}

// ─── Barcode ───
function showBarcode(productId) {
    const p = getProducts().find(x => x.id === productId);
    if (!p) return;
    document.getElementById('barcodeProductInfo').innerHTML = `<h3>${p.name}</h3><p style="color:var(--text-muted);">${p.sku} • ${fmtCur(p.sellPrice)} • ${p.category}</p>`;
    try { JsBarcode('#barcodeDisplay', p.sku, { format: 'CODE128', width: 2, height: 80, displayValue: true, fontSize: 16, margin: 10, background: 'transparent', lineColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#e2e8f0' }); } catch (e) { document.getElementById('barcodeDisplay').innerHTML = '<text>Barcode generation error</text>'; }
    openModal('barcodeModal');
}

function printBarcode() {
    const svg = document.getElementById('barcodeDisplay').outerHTML;
    const info = document.getElementById('barcodeProductInfo').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Barcode</title><style>body{font-family:Inter,sans-serif;text-align:center;padding:40px;}h3{margin:0 0 4px;}p{color:#666;margin:0 0 20px;}</style></head><body>${info}${svg}</body></html>`);
    win.document.close(); win.print();
}

// ─── Stock Adjustment ───
function openAdjustStock(productId) {
    const products = getProducts();
    const select = document.getElementById('adjProduct');
    select.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (Current: ${p.quantity})</option>`).join('');
    if (productId) select.value = productId;
    document.getElementById('adjQty').value = 1;
    document.getElementById('adjReason').value = '';
    openModal('adjustStockModal');
}

function processAdjustment() {
    const pid = parseInt(document.getElementById('adjProduct').value);
    const type = document.getElementById('adjType').value;
    let qty = parseInt(document.getElementById('adjQty').value) || 0;
    const reason = document.getElementById('adjReason').value.trim();
    if (!reason) { showToast('Please provide a reason', 'error'); return; }
    if (qty <= 0) { showToast('Quantity must be positive', 'error'); return; }

    const products = getProducts();
    const p = products.find(x => x.id === pid);
    if (!p) return;

    if (type === 'add') { p.quantity += qty; }
    else { p.quantity = Math.max(0, p.quantity - qty); qty = -qty; }

    saveProducts(products);

    const adj = { id: genId(), product_id: pid, productName: p.name, type: type === 'add' ? 'Add' : type === 'remove' ? 'Remove' : type, quantity: qty, reason, date: today(), user: DB.get('user') || 'Admin' };
    const adjs = getAdjustments(); adjs.push(adj); saveAdjustments(adjs);
    addActivity('adjustment', `Stock adjusted: ${p.name} ${qty > 0 ? '+' : ''}${qty} units (${type}: ${reason})`);
    closeModal('adjustStockModal');
    showToast(`Stock adjusted: ${p.name} (${qty > 0 ? '+' : ''}${qty})`);
    renderProducts();
}

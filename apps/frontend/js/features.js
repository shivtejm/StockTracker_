/* ============================================
   StockTracker Pro — Reports, Alerts, Chatbot, Settings
   ============================================ */

let plChartInst = null, stockMoveInst = null;

// ─── Reports ───
function renderReports() {
    const today_ = today();
    document.getElementById('reportDateFrom').value = document.getElementById('reportDateFrom').value || daysFromNow(-30);
    document.getElementById('reportDateTo').value = document.getElementById('reportDateTo').value || today_;
    generateReport();
    renderReportCharts();

    renderReorderSuggestions();
}

function generateReport() {
    const from = document.getElementById('reportDateFrom')?.value || daysFromNow(-30);
    const to = document.getElementById('reportDateTo')?.value || today();
    const products = getProducts(), sales = getSales(), settings = getSettings();

    const filteredSales = sales.filter(s => s.date >= from && s.date <= to);
    const totalRevenue = filteredSales.reduce((s, x) => s + x.total, 0);
    const totalGST = filteredSales.reduce((s, x) => s + x.gstAmount, 0);
    const totalDiscount = filteredSales.reduce((s, x) => s + (x.discount || 0), 0);
    const totalCost = filteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((is, item) => {
            const p = products.find(x => x.id === item.product_id);
            return is + (p ? p.costPrice * item.quantity : 0);
        }, 0);
    }, 0);
    const profit = totalRevenue - totalGST - totalCost;
    const inventoryValue = products.reduce((s, p) => s + p.quantity * p.sellPrice, 0);
    const inventoryCost = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);
    const avgMargin = products.length ? (products.reduce((s, p) => s + parseFloat(profitMargin(p.costPrice, p.sellPrice)), 0) / products.length).toFixed(1) : 0;
    const avgOrderValue = filteredSales.length ? totalRevenue / filteredSales.length : 0;

    // Top sellers
    const soldMap = {};
    filteredSales.forEach(s => s.items.forEach(i => {
        soldMap[i.name] = (soldMap[i.name] || 0) + i.quantity;
    }));
    const topSellers = Object.entries(soldMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Low stock / expiry alerts count
    const lowCount = products.filter(p => p.quantity <= (p.minStock || settings.lowStock)).length;
    const expCount = products.filter(p => p.expiryDate && daysBetween(today(), p.expiryDate) <= 30 && daysBetween(today(), p.expiryDate) > 0).length;

    document.getElementById('aiReportContent').innerHTML = `
    <div class="charts-grid" style="margin-bottom:20px;">
      <div class="st-card">
        <div class="st-card-header"><h3><i class="bi bi-clipboard-data"></i> Period Summary</h3></div>
        <div class="st-card-body">
          <div class="report-metric"><span>Total Sales</span><strong>${filteredSales.length}</strong></div>
          <div class="report-metric"><span>Average Order Value</span><strong>${fmtCur(avgOrderValue)}</strong></div>
          <div class="report-metric"><span>Discounts Given</span><strong>${fmtCur(totalDiscount)}</strong></div>
          <div class="report-metric"><span>Inventory Value (Sell)</span><strong>${fmtCur(inventoryValue)}</strong></div>
          <div class="report-metric"><span>Inventory Value (Cost)</span><strong>${fmtCur(inventoryCost)}</strong></div>
          <div class="report-metric"><span>Avg Profit Margin</span><strong>${avgMargin}%</strong></div>
          <div class="report-metric"><span>Potential Profit (Inventory)</span><strong style="color:var(--accent-success);">${fmtCur(inventoryValue - inventoryCost)}</strong></div>
        </div>
      </div>
      <div class="st-card">
        <div class="st-card-header"><h3><i class="bi bi-trophy"></i> Top Selling Products</h3></div>
        <div class="st-card-body">
          ${topSellers.length ? topSellers.map((t, i) => `<div class="report-metric"><span>${i + 1}. ${t[0]}</span><span class="badge badge-green">${t[1]} sold</span></div>`).join('') : '<p style="text-align:center;color:var(--text-muted);">No sales in this period</p>'}
        </div>
      </div>
    </div>
    ${lowCount || expCount ? `<div class="st-card" style="margin-bottom:20px;border-left:4px solid var(--accent-warning);">
      <div class="st-card-body">
        <h3 style="margin-bottom:8px;"><i class="bi bi-exclamation-triangle" style="color:var(--accent-warning);"></i> Inventory Health Warnings</h3>
        ${lowCount ? `<p>⚠️ <strong>${lowCount}</strong> products are below minimum stock level</p>` : ''}
        ${expCount ? `<p>⏰ <strong>${expCount}</strong> products expire within 30 days</p>` : ''}
      </div>
    </div>` : ''}
  `;
}

function renderReportCharts() {
    const products = getProducts(), sales = getSales();

    // P&L Chart
    const plLabels = [], revData = [], costData = [], profitData = [];
    for (let i = 6; i >= 0; i--) {
        const d = daysFromNow(-i);
        plLabels.push(new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
        const daySales = sales.filter(s => s.date === d);
        const rev = daySales.reduce((s, x) => s + x.total, 0);
        const cost = daySales.reduce((sum, sale) => sum + sale.items.reduce((is, item) => { const p = products.find(x => x.id === item.product_id); return is + (p ? p.costPrice * item.quantity : 0); }, 0), 0);
        revData.push(rev); costData.push(cost); profitData.push(rev - cost);
    }
    if (plChartInst) plChartInst.destroy();
    plChartInst = new Chart(document.getElementById('plChart'), {
        type: 'line',
        data: {
            labels: plLabels, datasets: [
                { label: 'Revenue', data: revData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4 },
                { label: 'Cost', data: costData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 },
                { label: 'Profit', data: profitData, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4 },
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.04)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } }
    });

    // Stock Movement by Category
    const catMap = {};
    products.forEach(p => { if (!catMap[p.category]) catMap[p.category] = { stock: 0, sold: 0 }; catMap[p.category].stock += p.quantity; });
    sales.forEach(s => s.items.forEach(i => { const p = products.find(x => x.id === i.product_id); if (p && catMap[p.category]) catMap[p.category].sold += i.quantity; }));
    const catLabels = Object.keys(catMap);
    if (stockMoveInst) stockMoveInst.destroy();
    stockMoveInst = new Chart(document.getElementById('stockMovementChart'), {
        type: 'bar',
        data: {
            labels: catLabels, datasets: [
                { label: 'Current Stock', data: catLabels.map(c => catMap[c].stock), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
                { label: 'Sold', data: catLabels.map(c => catMap[c].sold), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 },
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.04)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } }
    });
}



// ─── Alerts ───
function renderAlerts() {
    const products = getProducts(), settings = getSettings();
    const alerts = [];

    products.forEach(p => {
        if (p.quantity <= (p.minStock || settings.lowStock)) {
            alerts.push({ type: 'low', severity: 'danger', icon: 'bi-exclamation-triangle-fill', title: `Low Stock: ${p.name}`, desc: `Only ${p.quantity} ${p.unit || 'Pcs'} remaining (min: ${p.minStock || settings.lowStock})`, product: p });
        }
        if (p.quantity >= (p.maxStock || settings.overstock)) {
            alerts.push({ type: 'over', severity: 'warning', icon: 'bi-exclamation-circle-fill', title: `Overstock: ${p.name}`, desc: `${p.quantity} ${p.unit || 'Pcs'} in stock (max: ${p.maxStock || settings.overstock})`, product: p });
        }
        if (p.expiryDate) {
            const daysToExpiry = daysBetween(today(), p.expiryDate);
            if (daysToExpiry < 0) alerts.push({ type: 'expired', severity: 'danger', icon: 'bi-calendar-x-fill', title: `Expired: ${p.name}`, desc: `Expired ${Math.abs(daysToExpiry)} days ago on ${fmtDate(p.expiryDate)}`, product: p });
            else if (daysToExpiry <= 7) alerts.push({ type: 'expiry', severity: 'danger', icon: 'bi-calendar-x', title: `Expiring Soon: ${p.name}`, desc: `Expires in ${daysToExpiry} days on ${fmtDate(p.expiryDate)}`, product: p });
            else if (daysToExpiry <= 30) alerts.push({ type: 'expiry', severity: 'warning', icon: 'bi-calendar-event', title: `Expiring: ${p.name}`, desc: `Expires in ${daysToExpiry} days on ${fmtDate(p.expiryDate)}`, product: p });
        }
        if (p.warranty) {
            // Show warranty info for recently added high-value items
            if (p.sellPrice >= 5000) {
                alerts.push({ type: 'warranty', severity: 'info', icon: 'bi-shield-check', title: `Warranty: ${p.name}`, desc: `🛡 ${p.warranty} warranty period • ${fmtCur(p.sellPrice)} per unit`, product: p });
            }
        }
    });

    const list = document.getElementById('alertsList');
    if (!alerts.length) {
        list.innerHTML = '';
        document.getElementById('noAlertsMsg').style.display = 'block';
        return;
    }
    document.getElementById('noAlertsMsg').style.display = 'none';

    const severityOrder = { danger: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    list.innerHTML = alerts.map(a => `
    <div class="alert-item alert-${a.severity}">
      <div class="alert-icon"><i class="bi ${a.icon}"></i></div>
      <div class="alert-body">
        <h4>${a.title}</h4>
        <p>${a.desc}</p>
      </div>
      <div class="alert-actions">
        ${a.type === 'low' ? `<button class="btn btn-secondary btn-sm" onclick="navigateTo('purchaseOrders');openPOModal()"><i class="bi bi-cart-plus"></i> Reorder</button>` : ''}
        ${a.type === 'expired' || a.type === 'over' ? `<button class="btn btn-secondary btn-sm" onclick="openAdjustStock(${a.product.id})"><i class="bi bi-sliders2"></i> Adjust</button>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── Chatbot ───
function toggleChatbot() {
    document.getElementById('chatbotWindow').classList.toggle('open');
}

function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    appendChat('user', msg);
    const response = processChatQuery(msg);
    setTimeout(() => appendChat('bot', response), 300);
}

function appendChat(type, msg) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    div.innerHTML = msg;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function processChatQuery(query) {
    const q = query.toLowerCase();
    const products = getProducts(), sales = getSales(), settings = getSettings();

    if (q === 'help' || q === 'commands') {
        return `📋 <strong>Available commands:</strong><br>
    • "how many [product/category]" — check stock<br>
    • "value" / "worth" — inventory value<br>
    • "low stock" — items below minimum<br>
    • "expiring" / "expiry" — expiring products<br>
    • "sales" / "revenue" — sales stats<br>
    • "profit" / "margin" — profit analysis<br>
    • "top sellers" — best selling products<br>
    • "categories" — category breakdown<br>
    • "returns" — return statistics<br>
    • "purchase orders" / "PO" — PO status<br>
    • "coupons" / "discounts" — active coupons`;
    }

    const howMany = q.match(/how many (.+?)(\?|$| left| in stock| available| do we have| remaining)/);
    if (howMany) {
        const term = howMany[1].trim();
        const byName = products.filter(p => p.name.toLowerCase().includes(term));
        if (byName.length) {
            const total = byName.reduce((s, p) => s + p.quantity, 0);
            return `📦 Found <strong>${byName.length}</strong> product(s) matching "<em>${term}</em>":<br>${byName.map(p => `• ${p.name}: <strong>${p.quantity}</strong> ${p.unit || 'Pcs'} (Margin: ${profitMargin(p.costPrice, p.sellPrice)}%)`).join('<br>')}<br><br>Total: <strong>${total}</strong> units`;
        }
        const byCat = products.filter(p => p.category.toLowerCase().includes(term));
        if (byCat.length) {
            const total = byCat.reduce((s, p) => s + p.quantity, 0);
            return `📦 Category "<em>${term}</em>" has <strong>${byCat.length}</strong> product(s) with <strong>${total}</strong> total units.`;
        }
        return `🤔 Couldn't find products or categories matching "<em>${term}</em>". Try a different word.`;
    }

    if (q.includes('value') || q.includes('worth') || q.includes('total stock')) {
        const sellVal = products.reduce((s, p) => s + p.quantity * p.sellPrice, 0);
        const costVal = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);
        return `💰 Inventory value: <strong>${fmtCur(sellVal)}</strong> (sell) / <strong>${fmtCur(costVal)}</strong> (cost)<br>Potential profit: <strong>${fmtCur(sellVal - costVal)}</strong> across <strong>${products.length}</strong> products.`;
    }

    if (q.includes('low stock') || q.includes('reorder') || q.includes('shortage')) {
        const low = products.filter(p => p.quantity <= (p.minStock || settings.lowStock));
        if (!low.length) return '✅ All products are well-stocked!';
        return `⚠️ <strong>${low.length}</strong> products need restocking:<br>${low.slice(0, 8).map(p => `• ${p.name}: <strong>${p.quantity}</strong> left (min: ${p.minStock || settings.lowStock})`).join('<br>')}`;
    }

    if (q.includes('expir')) {
        const expiring = products.filter(p => p.expiryDate && daysBetween(today(), p.expiryDate) <= 30 && daysBetween(today(), p.expiryDate) > 0);
        const expired = products.filter(p => p.expiryDate && daysBetween(today(), p.expiryDate) < 0);
        let resp = '';
        if (expired.length) resp += `🚫 <strong>${expired.length}</strong> expired:<br>${expired.map(p => `• ${p.name} (expired ${fmtDate(p.expiryDate)})`).join('<br>')}<br><br>`;
        if (expiring.length) resp += `⏰ <strong>${expiring.length}</strong> expiring soon:<br>${expiring.map(p => `• ${p.name} — expires ${fmtDate(p.expiryDate)} (${daysBetween(today(), p.expiryDate)} days)`).join('<br>')}`;
        return resp || '✅ No products expiring soon!';
    }

    if (q.includes('revenue') || q.includes('total sales') || q.match(/sales\b/)) {
        const todaySales = sales.filter(s => s.date === today());
        const todayRev = todaySales.reduce((s, x) => s + x.total, 0);
        const totalRev = sales.reduce((s, x) => s + x.total, 0);
        return `📊 <strong>Sales Summary:</strong><br>• Today: <strong>${todaySales.length}</strong> sales = <strong>${fmtCur(todayRev)}</strong><br>• All time: <strong>${sales.length}</strong> sales = <strong>${fmtCur(totalRev)}</strong>`;
    }

    if (q.includes('profit') || q.includes('margin') || q.includes('p&l') || q.includes('pnl')) {
        const totalRev = sales.reduce((s, x) => s + x.total, 0);
        const totalGST = sales.reduce((s, x) => s + x.gstAmount, 0);
        const cogs = sales.reduce((sum, sale) => sum + sale.items.reduce((is, item) => { const p = products.find(x => x.id === item.product_id); return is + (p ? p.costPrice * item.quantity : 0); }, 0), 0);
        const net = totalRev - totalGST - cogs;
        return `💹 <strong>P&L Summary:</strong><br>• Revenue: <strong>${fmtCur(totalRev)}</strong><br>• COGS: <strong>${fmtCur(cogs)}</strong><br>• GST: <strong>${fmtCur(totalGST)}</strong><br>• Net Profit: <strong style="color:${net >= 0 ? '#22c55e' : '#ef4444'};">${fmtCur(net)}</strong>`;
    }

    if (q.includes('top sell') || q.includes('best sell') || q.includes('popular')) {
        const soldMap = {};
        sales.forEach(s => s.items.forEach(i => { soldMap[i.name] = (soldMap[i.name] || 0) + i.quantity; }));
        const top = Object.entries(soldMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return top.length ? `🏆 <strong>Top Sellers:</strong><br>${top.map((t, i) => `${i + 1}. ${t[0]}: <strong>${t[1]}</strong> sold`).join('<br>')}` : '📊 No sales data yet.';
    }

    if (q.includes('categor')) {
        const cats = {};
        products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + p.quantity; });
        return `📂 <strong>Categories:</strong><br>${Object.entries(cats).map(([c, q]) => `• ${c}: <strong>${q}</strong> items`).join('<br>')}`;
    }

    if (q.includes('return') || q.includes('refund')) {
        const returns = getReturns();
        const totalRefunds = returns.reduce((s, r) => s + r.refundAmount, 0);
        return `📦 <strong>Returns:</strong><br>• Total: <strong>${returns.length}</strong> returns<br>• Refunded: <strong>${fmtCur(totalRefunds)}</strong><br>• Return rate: <strong>${sales.length ? ((returns.length / sales.length) * 100).toFixed(1) : 0}%</strong>`;
    }

    if (q.includes('purchase order') || q.includes(' po ') || q.includes('po status')) {
        const pos = getPurchaseOrders();
        const pending = pos.filter(p => p.status === 'Pending').length;
        const ordered = pos.filter(p => p.status === 'Ordered').length;
        return `📋 <strong>Purchase Orders:</strong><br>• Pending: <strong>${pending}</strong><br>• Ordered: <strong>${ordered}</strong><br>• Total POs: <strong>${pos.length}</strong><br>• Total value: <strong>${fmtCur(pos.reduce((s, p) => s + p.totalAmount, 0))}</strong>`;
    }

    if (q.includes('coupon') || q.includes('discount')) {
        const discounts = getDiscounts();
        const active = discounts.filter(d => d.active && (!d.expiryDate || d.expiryDate >= today()));
        return `🏷️ <strong>Active Coupons:</strong><br>${active.length ? active.map(d => `• <code>${d.code}</code>: ${d.type === 'percentage' ? d.value + '%' : fmtCur(d.value)} off (min: ${fmtCur(d.minOrder)}, used ${d.usedCount}/${d.usageLimit})`).join('<br>') : 'No active coupons'}`;
    }

    return `🤔 I'm not sure about that. Try:<br>• "how many [product]"<br>• "low stock"<br>• "expiring"<br>• "sales" or "profit"<br>• "top sellers"<br>• Type <strong>help</strong> for all commands.`;
}

// ─── Settings ───
function renderSettingsPage() {
    const s = getSettings();
    document.getElementById('settingCompanyName').value = s.companyName || '';
    document.getElementById('settingGSTIN').value = s.gstin || '';
    document.getElementById('settingAddress').value = s.address || '';
    document.getElementById('settingPhone').value = s.phone || '';
    document.getElementById('settingGSTRate').value = s.gstRate || 18;
    document.getElementById('settingLowStock').value = s.lowStock || 10;
    document.getElementById('settingOverstock').value = s.overstock || 200;
    document.getElementById('settingExpiryDays').value = s.expiryDays || 30;
}

function saveSettingsAction() {
    const s = {
        companyName: document.getElementById('settingCompanyName').value.trim(),
        gstin: document.getElementById('settingGSTIN').value.trim(),
        address: document.getElementById('settingAddress').value.trim(),
        phone: document.getElementById('settingPhone').value.trim(),
        gstRate: parseInt(document.getElementById('settingGSTRate').value) || 18,
        lowStock: parseInt(document.getElementById('settingLowStock').value) || 10,
        overstock: parseInt(document.getElementById('settingOverstock').value) || 200,
        expiryDays: parseInt(document.getElementById('settingExpiryDays').value) || 30,
    };
    saveSettings(s);
    showToast('Settings saved successfully');
}

function exportAllData() {
    const data = {
        products: getProducts(), sales: getSales(), suppliers: getSuppliers(),
        customers: getCustomers(), purchaseOrders: getPurchaseOrders(),
        returns: getReturns(), adjustments: getAdjustments(),
        discounts: getDiscounts(), activities: getActivities(),
        settings: getSettings()
    };
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `StockTracker_Backup_${today()}.json`, 'application/json');
    showToast('Data exported successfully');
}

function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.products) saveProducts(data.products);
            if (data.sales) saveSales(data.sales);
            if (data.suppliers) saveSuppliers(data.suppliers);
            if (data.customers) saveCustomers(data.customers);
            if (data.purchaseOrders) savePurchaseOrders(data.purchaseOrders);
            if (data.returns) saveReturns(data.returns);
            if (data.adjustments) saveAdjustments(data.adjustments);
            if (data.discounts) saveDiscounts(data.discounts);
            if (data.activities) saveActivities(data.activities);
            if (data.settings) saveSettings(data.settings);
            showToast('Data imported successfully!');
            navigateTo('dashboard');
        } catch (err) { showToast('Import failed: invalid JSON', 'error'); }
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (!confirm('⚠️ This will DELETE all data permanently. Are you sure?')) return;
    if (!confirm('This is your LAST WARNING. All products, sales, and settings will be lost. Continue?')) return;
    localStorage.clear();
    showToast('All data reset. Reloading...', 'warning');
    setTimeout(() => location.reload(), 1000);
}

/* ============================================
   StockTracker Pro — Quick POS, CSV Import, Reorder Suggestions, Export
   ============================================ */

// ─── Quick POS ───
function openQuickPOS() {
    posCart.length = 0;
    document.getElementById('posSearch').value = '';
    document.getElementById('posDiscount').value = 0;
    renderPOSProductGrid('');
    renderPOSCart();
    openModal('quickPOSModal');
    setTimeout(() => document.getElementById('posSearch')?.focus(), 200);
}

function posSearchProducts(query) {
    renderPOSProductGrid(query);
}

function renderPOSProductGrid(query) {
    const products = getProducts().filter(p => p.quantity > 0);
    const q = (query || '').toLowerCase();
    const filtered = q ? products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : products;

    const grid = document.getElementById('posProductGrid');
    grid.innerHTML = filtered.slice(0, 30).map(p => `
    <div class="pos-product-item" onclick="addToPOSCart(${p.id})">
      <div class="pos-product-name">${p.name}</div>
      <div class="pos-product-sku">${p.sku}</div>
      <div class="pos-product-price">${fmtCur(p.sellPrice)}</div>
      <div class="pos-product-stock">${p.quantity} ${p.unit || 'Pcs'}</div>
    </div>
  `).join('');
}

function addToPOSCart(productId) {
    const product = getProducts().find(p => p.id === productId);
    if (!product) return;
    const existing = posCart.find(c => c.product_id === productId);
    if (existing) {
        if (existing.quantity >= product.quantity) { showToast('Not enough stock', 'warning'); return; }
        existing.quantity++;
    } else {
        posCart.push({
            product_id: productId, name: product.name, sku: product.sku,
            price: product.sellPrice, gstPercent: product.gstPercent,
            costPrice: product.costPrice, quantity: 1, maxQty: product.quantity,
            unit: product.unit || 'Pcs'
        });
    }
    renderPOSCart();
}

function updatePOSQty(idx, delta) {
    const item = posCart[idx];
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) { posCart.splice(idx, 1); }
    else if (item.quantity > item.maxQty) { item.quantity = item.maxQty; showToast('Max stock reached', 'warning'); }
    renderPOSCart();
}

function removePOSItem(idx) {
    posCart.splice(idx, 1);
    renderPOSCart();
}

function clearPOSCart() {
    posCart.length = 0;
    renderPOSCart();
}

function renderPOSCart() {
    const container = document.getElementById('posCartItems');
    if (!posCart.length) {
        container.innerHTML = '<div class="empty-state" style="padding:30px;"><i class="bi bi-cart3" style="font-size:40px;opacity:0.3;"></i><p>Add items to cart</p></div>';
        updatePOSTotals();
        return;
    }
    container.innerHTML = posCart.map((item, i) => `
    <div class="pos-cart-item">
      <div class="pos-cart-item-info">
        <strong>${item.name}</strong>
        <small>${fmtCur(item.price)} × ${item.quantity}</small>
      </div>
      <div class="pos-cart-item-actions">
        <button class="btn-sm" onclick="updatePOSQty(${i}, -1)">−</button>
        <span>${item.quantity}</span>
        <button class="btn-sm" onclick="updatePOSQty(${i}, 1)">+</button>
        <button class="btn-sm danger" onclick="removePOSItem(${i})"><i class="bi bi-x"></i></button>
      </div>
      <div class="pos-cart-item-total">${fmtCur(item.price * item.quantity)}</div>
    </div>
  `).join('');
    updatePOSTotals();
}

function updatePOSTotals() {
    const subtotal = posCart.reduce((s, i) => s + i.price * i.quantity, 0);
    const gst = posCart.reduce((s, i) => s + (i.price * i.quantity * i.gstPercent / 100), 0);
    const discount = parseFloat(document.getElementById('posDiscount')?.value) || 0;
    const total = subtotal + gst - discount;

    document.getElementById('posSubtotal').textContent = fmtCur(subtotal);
    document.getElementById('posGST').textContent = fmtCur(gst);
    document.getElementById('posTotal').textContent = fmtCur(Math.max(0, total));
}

function completePOSSale() {
    if (!posCart.length) { showToast('Cart is empty', 'error'); return; }
    const subtotal = posCart.reduce((s, i) => s + i.price * i.quantity, 0);
    const gstAmount = posCart.reduce((s, i) => s + (i.price * i.quantity * i.gstPercent / 100), 0);
    const discount = parseFloat(document.getElementById('posDiscount')?.value) || 0;

    const sale = {
        id: genId(), invoiceNo: genInvoice(), customer_id: null,
        items: posCart.map(i => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, price: i.price, gstPercent: i.gstPercent, costPrice: i.costPrice })),
        subtotal, gstAmount, discount, total: subtotal + gstAmount - discount,
        payment_method: document.getElementById('posPayment').value,
        date: today(), status: 'Completed'
    };

    // Deduct stock
    const products = getProducts();
    posCart.forEach(item => { const p = products.find(x => x.id === item.product_id); if (p) p.quantity -= item.quantity; });
    saveProducts(products);

    const sales = getSales(); sales.push(sale); saveSales(sales);
    addActivity('sale', `POS Sale ${sale.invoiceNo} — ${fmtCur(sale.total)} (${posCart.length} items)`);

    closeModal('quickPOSModal');
    showToast(`POS Sale completed! ${sale.invoiceNo}`);
    posCart.length = 0;
    // Show invoice
    viewInvoice(sale.id);
}

// ─── CSV Import ───
let csvParsedData = [];

function openCSVImportModal() {
    csvParsedData = [];
    document.getElementById('csvPreview').style.display = 'none';
    document.getElementById('csvImportBtn').style.display = 'none';
    openModal('csvImportModal');
}

function previewCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { showToast('CSV must have header row + data', 'error'); return; }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        csvParsedData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            csvParsedData.push(row);
        }

        const preview = document.getElementById('csvPreview');
        preview.style.display = 'block';
        preview.innerHTML = `
      <div class="st-card" style="margin-top:16px;">
        <div class="st-card-header"><h3>${csvParsedData.length} products found</h3></div>
        <div class="table-responsive" style="max-height:300px;overflow:auto;">
          <table class="st-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${csvParsedData.slice(0, 10).map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        </div>
        ${csvParsedData.length > 10 ? `<p style="text-align:center;padding:8px;color:var(--text-muted);">...and ${csvParsedData.length - 10} more</p>` : ''}
      </div>`;
        document.getElementById('csvImportBtn').style.display = 'block';
    };
    reader.readAsText(file);
}

function importCSVProducts() {
    if (!csvParsedData.length) { showToast('No data to import', 'error'); return; }
    const products = getProducts();
    let imported = 0;

    csvParsedData.forEach(row => {
        const name = row['name'] || row['product'] || row['product name'];
        if (!name) return;
        const cat = row['category'] || 'Other';
        products.push({
            id: genId(), sku: row['sku'] || genSKU(cat), name,
            category: cat, quantity: parseInt(row['quantity'] || row['qty']) || 0,
            costPrice: parseFloat(row['costprice'] || row['cost price'] || row['cost']) || 0,
            sellPrice: parseFloat(row['sellprice'] || row['sell price'] || row['price']) || 0,
            gstPercent: parseInt(row['gst%'] || row['gst'] || row['tax']) || 18,
            supplier_id: null, expiryDate: row['expirydate'] || row['expiry'] || null,
            minStock: parseInt(row['minstock'] || row['min stock']) || 10,
            maxStock: parseInt(row['maxstock'] || row['max stock']) || 200,
            unit: row['unit'] || 'Pcs', warranty: row['warranty'] || null,
            notes: row['notes'] || '', created_at: today()
        });
        imported++;
    });

    saveProducts(products);
    addActivity('add', `Bulk CSV import: ${imported} products added`);
    closeModal('csvImportModal');
    showToast(`${imported} products imported successfully!`);
    csvParsedData = [];
    renderProducts();
}

// ─── Reorder Suggestions ───
function renderReorderSuggestions() {
    const products = getProducts(), sales = getSales(), settings = getSettings();
    const soldMap = {};
    sales.forEach(s => s.items.forEach(i => { soldMap[i.product_id] = (soldMap[i.product_id] || 0) + i.quantity; }));

    const suggestions = products.filter(p => {
        const sold = soldMap[p.id] || 0;
        const dailyRate = sold / 30;
        const daysLeft = dailyRate > 0 ? p.quantity / dailyRate : 999;
        return daysLeft < 30 || p.quantity <= (p.minStock || settings.lowStock);
    }).map(p => {
        const sold = soldMap[p.id] || 0;
        const dailyRate = sold / 30;
        const suggestedQty = Math.max(p.maxStock - p.quantity, Math.ceil(dailyRate * 30));
        const supplierName = getSupplierName(p.supplier_id);
        return { ...p, sold, dailyRate: dailyRate.toFixed(1), suggestedQty, supplierName };
    }).sort((a, b) => a.quantity - b.quantity);

    const container = document.getElementById('reorderSuggestions');
    if (!suggestions.length) {
        container.innerHTML = '<div class="empty-state" style="padding:20px;"><i class="bi bi-check-circle"></i><h3>All stocked up!</h3><p>No products need reordering right now.</p></div>';
        return;
    }

    container.innerHTML = `<div class="table-responsive"><table class="st-table">
    <thead><tr><th>Product</th><th>Current Stock</th><th>Daily Sales Rate</th><th>Suggested Order</th><th>Supplier</th><th>Est. Cost</th><th>Action</th></tr></thead>
    <tbody>${suggestions.map(p => `<tr>
      <td><strong>${p.name}</strong><br><small style="color:var(--text-muted);">${p.sku}</small></td>
      <td><span class="badge ${p.quantity <= (p.minStock || 10) ? 'badge-red' : 'badge-amber'}">${p.quantity} ${p.unit || 'Pcs'}</span></td>
      <td>${p.dailyRate}/day</td>
      <td><strong>${p.suggestedQty}</strong></td>
      <td>${p.supplierName}</td>
      <td>${fmtCur(p.suggestedQty * p.costPrice)}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="navigateTo('purchaseOrders');openPOModal()"><i class="bi bi-cart-plus"></i> Create PO</button></td>
    </tr>`).join('')}</tbody></table></div>`;
}

// ─── Export CSV ───
function exportCSV() {
    const products = getProducts();
    const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Unit', 'CostPrice', 'SellPrice', 'GST%', 'Margin%', 'Warranty', 'ExpiryDate', 'Notes'];
    const rows = products.map(p => [p.sku, p.name, p.category, p.quantity, p.unit || 'Pcs', p.costPrice, p.sellPrice, p.gstPercent, profitMargin(p.costPrice, p.sellPrice), p.warranty || '', p.expiryDate || '', (p.notes || '').replace(/,/g, ';')]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `StockTracker_Products_${today()}.csv`, 'text/csv');
    showToast('CSV exported successfully');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Helper ───
function getSupplierName(id) {
    if (!id) return 'N/A';
    const s = getSuppliers().find(x => x.id == id);
    return s ? s.name : 'Unknown';
}

function getCustomerName(id) {
    if (!id) return 'Walk-in';
    const c = getCustomers().find(x => x.id == id);
    return c ? c.name : 'Unknown';
}

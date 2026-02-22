/* ============================================
   StockTracker — Sales, Suppliers, Customers
   ============================================ */

// ─── Sales & Invoicing ───
function renderSales() {
  const sales = getSales(), dateFilter = document.getElementById('salesDateFilter')?.value;
  let filtered = dateFilter ? sales.filter(s => s.date === dateFilter) : sales;
  const totalRev = filtered.reduce((s, x) => s + x.total, 0);
  const totalGST = filtered.reduce((s, x) => s + x.gstAmount, 0);
  const totalDiscount = filtered.reduce((s, x) => s + (x.discount || 0), 0);

  document.getElementById('salesKPIs').innerHTML = `
    <div class="kpi-card" title="Total Sales: ${filtered.length}"><div class="kpi-card-icon green"><i class="bi bi-receipt-cutoff"></i></div><h3>${filtered.length}</h3><p>Total Sales</p></div>
    <div class="kpi-card" title="Total Revenue: ${fmtCur(totalRev)}"><div class="kpi-card-icon cyan"><i class="bi bi-currency-rupee"></i></div><h3>${fmtCur(totalRev)}</h3><p>Total Revenue</p></div>
    <div class="kpi-card" title="GST Collected: ${fmtCur(totalGST)}"><div class="kpi-card-icon amber"><i class="bi bi-percent"></i></div><h3>${fmtCur(totalGST)}</h3><p>GST Collected</p></div>
    <div class="kpi-card" title="Discounts Given: ${fmtCur(totalDiscount)}"><div class="kpi-card-icon purple"><i class="bi bi-tag"></i></div><h3>${fmtCur(totalDiscount)}</h3><p>Discounts Given</p></div>
  `;

  const tbody = document.getElementById('salesTableBody');
  if (!filtered.length) {
    tbody.innerHTML = ''; document.getElementById('noSalesMsg').style.display = 'block'; return;
  }
  document.getElementById('noSalesMsg').style.display = 'none';
  tbody.innerHTML = filtered.sort((a, b) => b.id - a.id).map(s => `<tr>
    <td><strong style="color:var(--accent-primary)">${s.invoiceNo}</strong></td>
    <td>${getCustomerName(s.customer_id)}</td>
    <td>${s.items.length} item(s)</td>
    <td>${fmtCur(s.subtotal)}</td>
    <td>${fmtCur(s.gstAmount)}</td>
    <td><strong style="color:var(--text-primary)">${fmtCur(s.total)}</strong></td>
    <td>${fmtDate(s.date)}</td>
    <td><button class="btn-icon" onclick="viewInvoice(${s.id})" title="View Invoice"><i class="bi bi-eye"></i></button></td>
  </tr>`).join('');
}

document.getElementById('salesDateFilter')?.addEventListener('change', () => renderSales());

function populateSaleModal() {
  const customers = getCustomers();
  document.getElementById('saleCustomer').innerHTML = '<option value="">Walk-in Customer</option>' + customers.map(c => `<option value="${c.id}">${c.name} (${c.phone || ''})</option>`).join('');
  document.getElementById('saleItemsBody').innerHTML = '';
  document.getElementById('saleDiscountCode').value = '';
  document.getElementById('saleDiscountAmount').textContent = '-₹0';
  addSaleItem();
}

function addSaleItem() {
  const products = getProducts();
  const opts = products.filter(p => p.quantity > 0).map(p => `<option value="${p.id}">${p.name} (${p.quantity} ${p.unit || 'Pcs'})</option>`).join('');
  const row = document.createElement('tr');
  row.className = 'sale-item-row';
  row.innerHTML = `
    <td><select class="form-control sale-product" onchange="updateSaleRow(this)" style="min-width:180px;"><option value="">Select...</option>${opts}</select></td>
    <td><input type="number" class="form-control sale-qty" value="1" min="1" oninput="updateSaleRow(this)" style="width:80px;"></td>
    <td class="sale-price">₹0</td><td class="sale-gst">0%</td><td class="sale-total">₹0</td>
    <td><button class="btn-icon danger" onclick="this.closest('tr').remove();updateSaleTotals();"><i class="bi bi-trash3"></i></button></td>`;
  document.getElementById('saleItemsBody').appendChild(row);
}

function updateSaleRow(el) {
  const row = el.closest('tr');
  const pid = row.querySelector('.sale-product').value;
  const qty = parseInt(row.querySelector('.sale-qty').value) || 0;
  const product = getProducts().find(p => p.id == pid);
  if (product) {
    row.querySelector('.sale-price').textContent = fmtCur(product.sellPrice);
    row.querySelector('.sale-gst').textContent = product.gstPercent + '%';
    row.querySelector('.sale-total').textContent = fmtCur(product.sellPrice * qty);
  }
  updateSaleTotals();
}

function updateSaleTotals() {
  let subtotal = 0, gstTotal = 0;
  document.querySelectorAll('.sale-item-row').forEach(row => {
    const pid = row.querySelector('.sale-product').value;
    const qty = parseInt(row.querySelector('.sale-qty').value) || 0;
    const product = getProducts().find(p => p.id == pid);
    if (product) {
      const line = product.sellPrice * qty;
      subtotal += line;
      gstTotal += line * product.gstPercent / 100;
    }
  });
  const discountAmt = calculateDiscountAmount(subtotal);
  document.getElementById('saleSubtotal').textContent = fmtCur(subtotal);
  document.getElementById('saleDiscountAmount').textContent = '-' + fmtCur(discountAmt);
  document.getElementById('saleGST').textContent = fmtCur(gstTotal);
  document.getElementById('saleGrandTotal').textContent = fmtCur(subtotal + gstTotal - discountAmt);
}

function calculateDiscountAmount(subtotal) {
  const code = (document.getElementById('saleDiscountCode')?.value || '').trim().toUpperCase();
  if (!code) return 0;
  const disc = getDiscounts().find(d => d.code === code && d.active);
  if (!disc) return 0;
  if (disc.expiryDate && disc.expiryDate < today()) return 0;
  if (subtotal < disc.minOrder) return 0;
  if (disc.usedCount >= disc.usageLimit) return 0;
  let amt = disc.type === 'percentage' ? subtotal * disc.value / 100 : disc.value;
  return Math.min(amt, disc.maxDiscount);
}

function applySaleDiscount() { updateSaleTotals(); }

function completeSale() {
  const items = [];
  let valid = true;
  document.querySelectorAll('.sale-item-row').forEach(row => {
    const pid = row.querySelector('.sale-product').value;
    const qty = parseInt(row.querySelector('.sale-qty').value) || 0;
    if (!pid) { valid = false; return; }
    const product = getProducts().find(p => p.id == pid);
    if (!product || qty <= 0) { valid = false; return; }
    if (qty > product.quantity) { showToast(`Not enough stock for ${product.name}`, 'error'); valid = false; return; }
    items.push({ product_id: parseInt(pid), name: product.name, quantity: qty, price: product.sellPrice, gstPercent: product.gstPercent, costPrice: product.costPrice });
  });
  if (!valid || items.length === 0) { showToast('Please add valid items', 'error'); return; }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const gstAmount = items.reduce((s, i) => s + i.price * i.quantity * i.gstPercent / 100, 0);
  const discountAmt = calculateDiscountAmount(subtotal);
  const discCode = (document.getElementById('saleDiscountCode')?.value || '').trim().toUpperCase();

  const sale = {
    id: genId(), invoiceNo: genInvoice(),
    customer_id: document.getElementById('saleCustomer').value || null,
    items, subtotal, gstAmount, discount: discountAmt, discountCode: discCode || null,
    total: subtotal + gstAmount - discountAmt,
    payment_method: document.getElementById('salePayment').value,
    date: today(), status: 'Completed'
  };

  // Deduct stock
  const products = getProducts();
  items.forEach(item => { const p = products.find(x => x.id === item.product_id); if (p) p.quantity -= item.quantity; });
  saveProducts(products);

  // Update discount usage
  if (discCode) {
    const discounts = getDiscounts();
    const disc = discounts.find(d => d.code === discCode);
    if (disc) disc.usedCount++;
    saveDiscounts(discounts);
  }

  // Update customer loyalty
  if (sale.customer_id) {
    const customers = getCustomers();
    const cust = customers.find(c => c.id == sale.customer_id);
    if (cust) { cust.loyaltyPoints = (cust.loyaltyPoints || 0) + Math.floor(sale.total / 100); saveCustomers(customers); }
  }

  const sales = getSales(); sales.push(sale); saveSales(sales);
  addActivity('sale', `Sale ${sale.invoiceNo} — ${fmtCur(sale.total)} (${items.length} items) to ${getCustomerName(sale.customer_id)}`);
  addActivity('invoice', `Invoice ${sale.invoiceNo} generated for ${fmtCur(sale.total)}`);

  closeModal('newSaleModal');
  showToast(`Sale completed! Invoice: ${sale.invoiceNo}`);
  viewInvoice(sale.id);
  renderSales();
}

function viewInvoice(saleId) {
  const sale = getSales().find(s => s.id === saleId);
  if (!sale) return;
  const settings = getSettings();
  const cust = sale.customer_id ? getCustomers().find(c => c.id == sale.customer_id) : null;

  document.getElementById('invoiceContent').innerHTML = `
    <div class="invoice-preview" id="invoicePrintArea">
      <div class="invoice-header">
        <div class="company-info">
          <h2>${settings.companyName || 'StockTracker'}</h2>
          <p>${settings.gstin ? 'GSTIN: ' + settings.gstin : ''}</p>
          <p>${settings.address || ''}</p>
          <p>${settings.phone || ''}</p>
        </div>
        <div class="invoice-meta">
          <h2 style="color:#6366f1;">TAX INVOICE</h2>
          <p><strong>${sale.invoiceNo}</strong></p>
          <p>Date: ${fmtDate(sale.date)}</p>
          <p>Payment: ${sale.payment_method || 'Cash'}</p>
          ${sale.discountCode ? `<p>Coupon: <strong>${sale.discountCode}</strong></p>` : ''}
        </div>
      </div>
      <div style="margin-bottom:20px;">
        <p style="color:#666;margin:0;"><strong>Bill To:</strong></p>
        <p style="margin:2px 0;"><strong>${cust ? cust.name : 'Walk-in Customer'}</strong></p>
        ${cust ? `<p style="font-size:13px;color:#666;margin:0;">${cust.phone || ''} ${cust.email ? '| ' + cust.email : ''}</p>` : ''}
      </div>
      <table>
        <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th>GST%</th><th>GST Amt</th><th>Total</th></tr></thead>
        <tbody>
          ${sale.items.map((item, i) => {
    const lineTotal = item.price * item.quantity;
    const gst = lineTotal * item.gstPercent / 100;
    return `<tr><td>${i + 1}</td><td>${item.name}</td><td>${item.quantity}</td><td>${fmtCur(item.price)}</td><td>${item.gstPercent}%</td><td class="gst-row">${fmtCur(gst)}</td><td>${fmtCur(lineTotal + gst)}</td></tr>`;
  }).join('')}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:20px;">
        <p>Subtotal: <strong>${fmtCur(sale.subtotal)}</strong></p>
        ${sale.discount ? `<p style="color:#22c55e;">Discount: <strong>-${fmtCur(sale.discount)}</strong></p>` : ''}
        <p class="gst-row">GST: <strong>${fmtCur(sale.gstAmount)}</strong></p>
        <hr>
        <p class="grand-total">Grand Total: ${fmtCur(sale.total)}</p>
      </div>
      <div style="margin-top:40px;text-align:center;font-size:12px;color:#999;">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated invoice.</p>
      </div>
    </div>`;
  openModal('invoiceModal');
}

function printInvoice() {
  const content = document.getElementById('invoicePrintArea').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Invoice</title><style>body{font-family:Inter,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #ddd;font-size:14px;}th{background:#f5f5f5;font-weight:600;}.gst-row{color:#666;}.grand-total{font-size:20px;font-weight:800;color:#6366f1;}.invoice-header{display:flex;justify-content:space-between;margin-bottom:30px;}.company-info h2{font-size:24px;margin:0 0 4px;}.company-info p,.invoice-meta p{font-size:13px;color:#666;margin:2px 0;}.invoice-meta{text-align:right;}.invoice-meta h2{margin:0 0 4px;}</style></head><body>${content}</body></html>`);
  win.document.close(); win.print();
}

// ─── Suppliers CRUD ───
function renderSuppliers() {
  const suppliers = getSuppliers(), search = (document.getElementById('supplierSearch')?.value || '').toLowerCase();
  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search) || (s.contact || '').toLowerCase().includes(search));
  const tbody = document.getElementById('suppliersTableBody');

  if (!filtered.length) {
    tbody.innerHTML = ''; document.getElementById('noSuppliersMsg').style.display = 'block'; return;
  }
  document.getElementById('noSuppliersMsg').style.display = 'none';
  const products = getProducts();
  tbody.innerHTML = filtered.map(s => {
    const prodCount = products.filter(p => p.supplier_id == s.id).length;
    const stars = '★'.repeat(s.rating || 0) + '☆'.repeat(5 - (s.rating || 0));
    return `<tr>
      <td><strong style="color:var(--text-primary)">${s.name}</strong></td>
      <td>${s.contact || '—'}<br><small style="color:var(--text-muted)">${s.phone || ''}</small></td>
      <td>${s.email || '—'}</td>
      <td style="max-width:200px;font-size:13px;">${s.address || '—'}</td>
      <td><span style="color:#f59e0b;">${stars}</span></td>
      <td><span class="badge badge-purple">${prodCount}</span></td>
      <td>
        <button class="btn-icon" onclick="editSupplier(${s.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn-icon danger" onclick="deleteSupplier(${s.id})" title="Delete"><i class="bi bi-trash3"></i></button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('supplierSearch')?.addEventListener('input', () => renderSuppliers());

function saveSupplier() {
  const name = document.getElementById('sName').value.trim();
  if (!name) { showToast('Supplier name is required', 'error'); return; }
  const suppliers = getSuppliers();
  const editId = document.getElementById('editSupplierId').value;
  const data = { name, contact: document.getElementById('sContact').value.trim(), phone: document.getElementById('sPhone').value.trim(), email: document.getElementById('sEmail').value.trim(), address: document.getElementById('sAddress').value.trim(), rating: parseInt(document.getElementById('sRating').value) || 5 };

  if (editId) {
    const idx = suppliers.findIndex(s => s.id == editId);
    if (idx !== -1) suppliers[idx] = { ...suppliers[idx], ...data };
    showToast('Supplier updated');
  } else {
    data.id = genId(); suppliers.push(data);
    showToast('Supplier added');
    addActivity('add', `New supplier: ${data.name}`);
  }
  saveSuppliers(suppliers);
  closeModal('addSupplierModal');
  document.getElementById('supplierForm').reset();
  document.getElementById('editSupplierId').value = '';
  renderSuppliers();
}

function editSupplier(id) {
  const s = getSuppliers().find(x => x.id === id);
  if (!s) return;
  document.getElementById('supplierModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Supplier';
  document.getElementById('editSupplierId').value = s.id;
  document.getElementById('sName').value = s.name;
  document.getElementById('sContact').value = s.contact || '';
  document.getElementById('sPhone').value = s.phone || '';
  document.getElementById('sEmail').value = s.email || '';
  document.getElementById('sAddress').value = s.address || '';
  document.getElementById('sRating').value = s.rating || 5;
  openModal('addSupplierModal');
}

function deleteSupplier(id) {
  if (!confirm('Delete this supplier?')) return;
  saveSuppliers(getSuppliers().filter(s => s.id !== id));
  showToast('Supplier deleted', 'warning');
  renderSuppliers();
}

// ─── Customers ───
function renderCustomers() {
  const customers = getCustomers(), search = (document.getElementById('customerSearch')?.value || '').toLowerCase();
  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search) || (c.phone || '').includes(search));
  const sales = getSales();
  const grid = document.getElementById('customersGrid');

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i><h3>No customers</h3><p>Add your first customer to track purchases.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(c => {
    const custSales = sales.filter(s => s.customer_id == c.id);
    const totalSpent = custSales.reduce((s, x) => s + x.total, 0);
    return `<div class="st-card" style="margin-bottom:16px;">
      <div class="st-card-body" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div class="sidebar-user-avatar" style="width:48px;height:48px;font-size:18px;flex-shrink:0;">${c.name.charAt(0)}</div>
        <div style="flex:1;min-width:150px;">
          <h3 style="font-size:16px;font-weight:600;margin-bottom:2px;">${c.name}</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin:0;">${c.phone || ''} ${c.email ? '| ' + c.email : ''}</p>
          <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0;">${c.address || ''}</p>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:700;">${custSales.length}</div>
          <div style="font-size:12px;color:var(--text-muted);">Orders</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:700;color:var(--accent-success);">${fmtCur(totalSpent)}</div>
          <div style="font-size:12px;color:var(--text-muted);">Total Spent</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:700;color:var(--accent-warning);">${c.loyaltyPoints || 0}</div>
          <div style="font-size:12px;color:var(--text-muted);">Loyalty Pts</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-icon" onclick="viewCustomerHistory(${c.id})" title="History"><i class="bi bi-clock-history"></i></button>
          <button class="btn-icon" onclick="editCustomer(${c.id})" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon danger" onclick="deleteCustomer(${c.id})" title="Delete"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('customerSearch')?.addEventListener('input', () => renderCustomers());

function saveCustomer() {
  const name = document.getElementById('cName').value.trim();
  if (!name) { showToast('Customer name is required', 'error'); return; }
  const customers = getCustomers();
  const editId = document.getElementById('editCustomerId').value;
  const data = { name, phone: document.getElementById('cPhone').value.trim(), email: document.getElementById('cEmail').value.trim(), address: document.getElementById('cAddress').value.trim() };

  if (editId) {
    const idx = customers.findIndex(c => c.id == editId);
    if (idx !== -1) customers[idx] = { ...customers[idx], ...data };
    showToast('Customer updated');
  } else {
    data.id = genId(); data.created_at = today(); data.loyaltyPoints = 0; customers.push(data);
    showToast('Customer added');
    addActivity('add', `New customer: ${data.name}`);
  }
  saveCustomers(customers);
  closeModal('addCustomerModal');
  document.getElementById('customerForm').reset();
  document.getElementById('editCustomerId').value = '';
  renderCustomers();
}

function editCustomer(id) {
  const c = getCustomers().find(x => x.id === id);
  if (!c) return;
  document.getElementById('customerModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Customer';
  document.getElementById('editCustomerId').value = c.id;
  document.getElementById('cName').value = c.name;
  document.getElementById('cPhone').value = c.phone || '';
  document.getElementById('cEmail').value = c.email || '';
  document.getElementById('cAddress').value = c.address || '';
  openModal('addCustomerModal');
}

function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  saveCustomers(getCustomers().filter(c => c.id !== id));
  showToast('Customer deleted', 'warning');
  renderCustomers();
}

function viewCustomerHistory(id) {
  const customer = getCustomers().find(c => c.id === id);
  const sales = getSales().filter(s => s.customer_id == id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalSpent = sales.reduce((s, x) => s + x.total, 0);
  const container = document.getElementById('customerHistoryContent');

  if (!sales.length) {
    container.innerHTML = `<div class="empty-state"><i class="bi bi-clock-history"></i><h3>No purchase history</h3><p>${customer?.name || 'Customer'} hasn't made any purchases yet.</p></div>`;
  } else {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <h3>${customer?.name || 'Customer'}'s Purchases</h3>
        <div>
          <span class="badge badge-green">${sales.length} orders</span>
          <span class="badge badge-cyan">${fmtCur(totalSpent)} spent</span>
          <span class="badge badge-amber">${customer?.loyaltyPoints || 0} points</span>
        </div>
      </div>
      <div class="timeline">${sales.map(s => `
        <div class="timeline-item">
          <div class="timeline-date">${fmtDate(s.date)}</div>
          <h4>${s.invoiceNo} — ${fmtCur(s.total)}</h4>
          <p>${s.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
          <p style="font-size:12px;color:var(--text-muted);">Payment: ${s.payment_method || 'Cash'}${s.discountCode ? ' | Coupon: ' + s.discountCode : ''}</p>
        </div>`).join('')}
      </div>`;
  }
  openModal('customerHistoryModal');
}

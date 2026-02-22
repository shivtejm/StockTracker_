/* ============================================
   StockTracker Pro — Purchase Orders, Returns, Discounts, Activity Log
   ============================================ */

// ─── Purchase Orders ───
function renderPurchaseOrders() {
  const pos = getPurchaseOrders();
  const pending = pos.filter(p => p.status === 'Pending').length;
  const ordered = pos.filter(p => p.status === 'Ordered').length;
  const received = pos.filter(p => p.status === 'Received').length;
  const totalAmt = pos.reduce((s, p) => s + p.totalAmount, 0);

  document.getElementById('poKPIs').innerHTML = `
    <div class="kpi-card" title="Pending: ${pending}"><div class="kpi-card-icon amber"><i class="bi bi-hourglass-split"></i></div><h3>${pending}</h3><p>Pending</p></div>
    <div class="kpi-card" title="Ordered: ${ordered}"><div class="kpi-card-icon cyan"><i class="bi bi-send"></i></div><h3>${ordered}</h3><p>Ordered</p></div>
    <div class="kpi-card" title="Received: ${received}"><div class="kpi-card-icon green"><i class="bi bi-check-circle"></i></div><h3>${received}</h3><p>Received</p></div>
    <div class="kpi-card" title="Total Value: ${fmtCur(totalAmt)}"><div class="kpi-card-icon purple"><i class="bi bi-currency-rupee"></i></div><h3>${fmtCur(totalAmt)}</h3><p>Total Value</p></div>
  `;

  const tbody = document.getElementById('poTableBody');
  if (!pos.length) { tbody.innerHTML = ''; document.getElementById('noPOMsg').style.display = 'block'; return; }
  document.getElementById('noPOMsg').style.display = 'none';

  tbody.innerHTML = pos.sort((a, b) => b.id - a.id).map(po => {
    const statusColors = { Pending: 'badge-amber', Ordered: 'badge-cyan', Received: 'badge-green', Cancelled: 'badge-red' };
    return `<tr>
      <td><strong style="color:var(--accent-primary)">${po.poNumber}</strong></td>
      <td>${getSupplierName(po.supplier_id)}</td>
      <td>${po.items.length} item(s)</td>
      <td><strong>${fmtCur(po.totalAmount)}</strong></td>
      <td><span class="badge ${statusColors[po.status] || 'badge-purple'}">${po.status}</span></td>
      <td>${fmtDate(po.date)}</td>
      <td>${fmtDate(po.expectedDate)}</td>
      <td style="white-space:nowrap;">
        ${po.status !== 'Received' && po.status !== 'Cancelled' ? `<button class="btn-icon" onclick="receivePO(${po.id})" title="Mark Received"><i class="bi bi-check-lg"></i></button>` : ''}
        ${po.status === 'Pending' ? `<button class="btn-icon" onclick="markPOOrdered(${po.id})" title="Mark Ordered"><i class="bi bi-send"></i></button>` : ''}
        ${po.status !== 'Received' ? `<button class="btn-icon danger" onclick="cancelPO(${po.id})" title="Cancel"><i class="bi bi-x-lg"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function openPOModal() {
  const suppliers = getSuppliers();
  document.getElementById('poSupplier').innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('poItemsBody').innerHTML = '';
  document.getElementById('poNotes').value = '';
  document.getElementById('poExpectedDate').value = daysFromNow(7);
  addPOItem();
  openModal('addPOModal');
}

function addPOItem() {
  const products = getProducts();
  let datalist = document.getElementById('poProductList');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'poProductList';
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = products.map(p => `<option value="${p.name}" data-id="${p.id}" data-cost="${p.costPrice}">`).join('');

  const row = document.createElement('tr');
  row.className = 'po-item-row';
  row.innerHTML = `
    <td><input type="text" class="form-control po-product" list="poProductList" placeholder="Type name..." oninput="updatePORow(this)" style="min-width:200px;"></td>
    <td><input type="number" class="form-control po-qty" value="1" min="1" oninput="updatePORow(this)" style="width:80px;"></td>
    <td><input type="number" class="form-control po-cost" value="0" min="0" oninput="updatePORow(this)" style="width:100px;"></td>
    <td class="po-total">₹0</td>
    <td><button class="btn-icon danger" onclick="this.closest('tr').remove();updatePOTotal();"><i class="bi bi-trash3"></i></button></td>`;
  document.getElementById('poItemsBody').appendChild(row);
}

function updatePORow(el) {
  const row = el.closest('tr');
  const nameInput = row.querySelector('.po-product');
  const qtyInput = row.querySelector('.po-qty');
  const costInput = row.querySelector('.po-cost');

  const name = nameInput.value;
  const qty = parseInt(qtyInput.value) || 0;

  // Auto-fill cost if name matches an existing product
  if (el === nameInput) {
    const products = getProducts();
    const product = products.find(p => p.name === name);
    if (product) {
      costInput.value = product.costPrice;
    }
  }

  const cost = parseFloat(costInput.value) || 0;
  row.querySelector('.po-total').textContent = fmtCur(cost * qty);
  updatePOTotal();
}

function updatePOTotal() {
  let total = 0;
  document.querySelectorAll('.po-item-row').forEach(row => {
    const qty = parseInt(row.querySelector('.po-qty').value) || 0;
    const cost = parseFloat(row.querySelector('.po-cost').value) || 0;
    total += cost * qty;
  });
  document.getElementById('poTotal').textContent = fmtCur(total);
}

function createPO() {
  const items = [];
  let valid = true;
  document.querySelectorAll('.po-item-row').forEach(row => {
    const name = row.querySelector('.po-product').value.trim();
    const qty = parseInt(row.querySelector('.po-qty').value) || 0;
    const cost = parseFloat(row.querySelector('.po-cost').value) || 0;

    if (!name || qty <= 0) { valid = false; return; }

    const product = getProducts().find(p => p.name === name);
    items.push({
      product_id: product ? product.id : null,
      name: name,
      quantity: qty,
      costPrice: cost
    });
  });
  if (!valid || !items.length) { showToast('Please add valid items', 'error'); return; }

  const totalAmount = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const po = {
    id: genId(), poNumber: genPO(),
    supplier_id: parseInt(document.getElementById('poSupplier').value),
    items, totalAmount, status: 'Pending',
    date: today(), expectedDate: document.getElementById('poExpectedDate').value || daysFromNow(7),
    notes: document.getElementById('poNotes').value.trim()
  };

  const pos = getPurchaseOrders(); pos.push(po); savePurchaseOrders(pos);
  addActivity('purchase', `PO ${po.poNumber} created — ${fmtCur(po.totalAmount)} to ${getSupplierName(po.supplier_id)}`);
  closeModal('addPOModal');
  showToast(`Purchase Order ${po.poNumber} created`);
  renderPurchaseOrders();
}

function markPOOrdered(id) {
  const pos = getPurchaseOrders();
  const po = pos.find(p => p.id === id);
  if (po) { po.status = 'Ordered'; savePurchaseOrders(pos); addActivity('purchase', `PO ${po.poNumber} marked as Ordered`); showToast('PO marked as ordered'); renderPurchaseOrders(); }
}

function receivePO(id) {
  if (!confirm('Mark this PO as received? Stock will be added automatically.')) return;
  const pos = getPurchaseOrders();
  const po = pos.find(p => p.id === id);
  if (!po) return;
  po.status = 'Received'; po.receivedDate = today();
  savePurchaseOrders(pos);

  // Auto-restock
  const products = getProducts();
  po.items.forEach(item => {
    const p = products.find(x => x.id === item.product_id);
    if (p) p.quantity += item.quantity;
  });
  saveProducts(products);
  addActivity('restock', `PO ${po.poNumber} received — ${po.items.map(i => `+${i.quantity} ${i.name}`).join(', ')}`);
  showToast(`PO received! Stock updated for ${po.items.length} items`);
  renderPurchaseOrders();
}

function cancelPO(id) {
  if (!confirm('Cancel this purchase order?')) return;
  const pos = getPurchaseOrders();
  const po = pos.find(p => p.id === id);
  if (po) { po.status = 'Cancelled'; savePurchaseOrders(pos); addActivity('purchase', `PO ${po.poNumber} cancelled`); showToast('PO cancelled', 'warning'); renderPurchaseOrders(); }
}

// ─── Returns & Refunds ───
function renderReturnsPage() {
  const returns = getReturns();
  const totalRefunds = returns.reduce((s, r) => s + r.refundAmount, 0);
  const completed = returns.filter(r => r.status === 'Completed').length;

  document.getElementById('returnKPIs').innerHTML = `
    <div class="kpi-card" title="Total Returns: ${returns.length}"><div class="kpi-card-icon red"><i class="bi bi-arrow-return-left"></i></div><h3>${returns.length}</h3><p>Total Returns</p></div>
    <div class="kpi-card" title="Completed: ${completed}"><div class="kpi-card-icon green"><i class="bi bi-check-circle"></i></div><h3>${completed}</h3><p>Completed</p></div>
    <div class="kpi-card" title="Total Refunds: ${fmtCur(totalRefunds)}"><div class="kpi-card-icon amber"><i class="bi bi-currency-rupee"></i></div><h3>${fmtCur(totalRefunds)}</h3><p>Total Refunds</p></div>
    <div class="kpi-card" title="Return Rate: ${returns.length && getSales().length ? ((returns.length / getSales().length) * 100).toFixed(1) : 0}%"><div class="kpi-card-icon purple"><i class="bi bi-percent"></i></div><h3>${returns.length && getSales().length ? ((returns.length / getSales().length) * 100).toFixed(1) : 0}%</h3><p>Return Rate</p></div>
  `;

  const tbody = document.getElementById('returnsTableBody');
  if (!returns.length) { tbody.innerHTML = ''; document.getElementById('noReturnsMsg').style.display = 'block'; return; }
  document.getElementById('noReturnsMsg').style.display = 'none';

  tbody.innerHTML = returns.sort((a, b) => b.id - a.id).map(r => `<tr>
    <td><strong style="color:var(--accent-danger)">${r.returnNo}</strong></td>
    <td>${getCustomerName(r.customer_id)}</td>
    <td>${r.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
    <td>${r.reason}</td>
    <td><strong>${fmtCur(r.refundAmount)}</strong></td>
    <td><span class="badge ${r.status === 'Completed' ? 'badge-green' : 'badge-amber'}">${r.status}</span></td>
    <td>${fmtDate(r.date)}</td>
  </tr>`).join('');
}

function openReturnModal() {
  document.getElementById('retInvoice').value = '';
  document.getElementById('retInvoiceDetails').style.display = 'none';
  document.getElementById('retNotes').value = '';
  openModal('addReturnModal');
}

function lookupInvoiceForReturn(invoiceNo) {
  const sale = getSales().find(s => s.invoiceNo.toLowerCase() === invoiceNo.toLowerCase());
  const details = document.getElementById('retInvoiceDetails');
  if (!sale) { details.style.display = 'none'; return; }
  details.style.display = 'block';
  details.innerHTML = `
    <div class="st-card" style="margin:12px 0;background:var(--bg-card-hover);">
      <div class="st-card-body">
        <p><strong>${sale.invoiceNo}</strong> — ${fmtDate(sale.date)} — ${fmtCur(sale.total)}</p>
        <p style="font-size:13px;color:var(--text-muted);">Customer: ${getCustomerName(sale.customer_id)}</p>
        ${sale.items.map(i => `<label style="display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer;">
          <input type="checkbox" class="return-item-check" value="${i.product_id}" data-name="${i.name}" data-qty="${i.quantity}" data-price="${i.price}" data-gst="${i.gstPercent}" checked>
          ${i.quantity}x ${i.name} (${fmtCur(i.price)})
        </label>`).join('')}
      </div>
    </div>`;
  details.dataset.saleId = sale.id;
  details.dataset.customerId = sale.customer_id || '';
}

function processReturn() {
  const invoiceNo = document.getElementById('retInvoice').value.trim();
  const details = document.getElementById('retInvoiceDetails');
  const sale = getSales().find(s => s.invoiceNo.toLowerCase() === invoiceNo.toLowerCase());
  if (!sale) { showToast('Invoice not found', 'error'); return; }

  const returnItems = [];
  details.querySelectorAll('.return-item-check:checked').forEach(cb => {
    returnItems.push({
      product_id: parseInt(cb.value), name: cb.dataset.name,
      quantity: parseInt(cb.dataset.qty), price: parseFloat(cb.dataset.price),
      gstPercent: parseFloat(cb.dataset.gst)
    });
  });
  if (!returnItems.length) { showToast('Select items to return', 'error'); return; }

  const refundAmount = returnItems.reduce((s, i) => {
    const line = i.price * i.quantity;
    return s + line + (line * i.gstPercent / 100);
  }, 0);

  const ret = {
    id: genId(), returnNo: genReturn(), sale_id: sale.id,
    customer_id: sale.customer_id, items: returnItems,
    reason: document.getElementById('retReason').value,
    notes: document.getElementById('retNotes').value.trim(),
    refundAmount, status: 'Completed', date: today()
  };

  // Restore stock
  const products = getProducts();
  returnItems.forEach(item => {
    const p = products.find(x => x.id === item.product_id);
    if (p) p.quantity += item.quantity;
  });
  saveProducts(products);

  const returns = getReturns(); returns.push(ret); saveReturns(returns);
  addActivity('return', `Return ${ret.returnNo} processed — refund ${fmtCur(refundAmount)} for ${returnItems.length} item(s)`);
  closeModal('addReturnModal');
  showToast(`Return processed! Refund: ${fmtCur(refundAmount)}`);
  renderReturnsPage();
}

// ─── Discounts ───
function renderDiscounts() {
  const discounts = getDiscounts();
  const active = discounts.filter(d => d.active && (!d.expiryDate || d.expiryDate >= today()));
  const totalUsage = discounts.reduce((s, d) => s + d.usedCount, 0);

  document.getElementById('discountKPIs').innerHTML = `
    <div class="kpi-card" title="Active Coupons: ${active.length}"><div class="kpi-card-icon green"><i class="bi bi-tag"></i></div><h3>${active.length}</h3><p>Active Coupons</p></div>
    <div class="kpi-card" title="Total Coupons: ${discounts.length}"><div class="kpi-card-icon purple"><i class="bi bi-tags"></i></div><h3>${discounts.length}</h3><p>Total Coupons</p></div>
    <div class="kpi-card" title="Times Used: ${totalUsage}"><div class="kpi-card-icon cyan"><i class="bi bi-check2-all"></i></div><h3>${totalUsage}</h3><p>Times Used</p></div>
  `;

  const grid = document.getElementById('discountsGrid');
  if (!discounts.length) {
    grid.innerHTML = '<div class="empty-state"><i class="bi bi-tag"></i><h3>No coupons</h3><p>Create your first discount coupon.</p></div>';
    return;
  }

  grid.innerHTML = `<div class="discount-grid">${discounts.map(d => {
    const isExpired = d.expiryDate && d.expiryDate < today();
    const isExhausted = d.usedCount >= d.usageLimit;
    const statusBadge = !d.active ? '<span class="badge badge-red">Inactive</span>' : isExpired ? '<span class="badge badge-red">Expired</span>' : isExhausted ? '<span class="badge badge-amber">Limit Reached</span>' : '<span class="badge badge-green">Active</span>';

    return `<div class="st-card discount-card ${isExpired || !d.active ? 'opacity-muted' : ''}">
      <div class="st-card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <code style="font-size:18px;font-weight:700;color:var(--accent-primary);letter-spacing:2px;">${d.code}</code>
          ${statusBadge}
        </div>
        <p style="color:var(--text-secondary);margin-bottom:8px;">${d.description || ''}</p>
        <div class="report-metric"><span>Discount</span><span>${d.type === 'percentage' ? d.value + '%' : fmtCur(d.value)} off</span></div>
        <div class="report-metric"><span>Min Order</span><span>${fmtCur(d.minOrder)}</span></div>
        <div class="report-metric"><span>Max Discount</span><span>${fmtCur(d.maxDiscount)}</span></div>
        <div class="report-metric"><span>Used</span><span>${d.usedCount} / ${d.usageLimit}</span></div>
        ${d.expiryDate ? `<div class="report-metric"><span>Expires</span><span>${fmtDate(d.expiryDate)}</span></div>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn btn-secondary btn-sm" onclick="toggleDiscount(${d.id})">${d.active ? 'Deactivate' : 'Activate'}</button>
          <button class="btn-icon danger" onclick="deleteDiscount(${d.id})"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function saveDiscount() {
  const code = (document.getElementById('discCode').value || '').trim().toUpperCase();
  if (!code) { showToast('Coupon code is required', 'error'); return; }
  const discounts = getDiscounts();
  if (discounts.find(d => d.code === code)) { showToast('Coupon code already exists', 'error'); return; }

  const disc = {
    id: genId(), code,
    type: document.getElementById('discType').value,
    value: parseFloat(document.getElementById('discValue').value) || 10,
    minOrder: parseFloat(document.getElementById('discMinOrder').value) || 0,
    maxDiscount: parseFloat(document.getElementById('discMaxDiscount').value) || 9999,
    usageLimit: parseInt(document.getElementById('discUsageLimit').value) || 100,
    usedCount: 0, active: true,
    description: document.getElementById('discDescription').value.trim(),
    expiryDate: document.getElementById('discExpiry').value || null,
  };

  discounts.push(disc);
  saveDiscounts(discounts);
  addActivity('discount', `New coupon created: ${disc.code} (${disc.type === 'percentage' ? disc.value + '%' : fmtCur(disc.value)} off)`);
  closeModal('addDiscountModal');
  showToast(`Coupon ${disc.code} created`);
  renderDiscounts();
}

function toggleDiscount(id) {
  const discounts = getDiscounts();
  const d = discounts.find(x => x.id === id);
  if (d) { d.active = !d.active; saveDiscounts(discounts); renderDiscounts(); showToast(d.active ? 'Coupon activated' : 'Coupon deactivated', 'info'); }
}

function deleteDiscount(id) {
  if (!confirm('Delete this coupon?')) return;
  saveDiscounts(getDiscounts().filter(d => d.id !== id));
  showToast('Coupon deleted', 'warning');
  renderDiscounts();
}

// ─── Activity Log ───
function renderActivityLog() {
  const activities = getActivities();
  const typeFilter = document.getElementById('activityTypeFilter')?.value || '';
  const search = (document.getElementById('activitySearch')?.value || '').toLowerCase();

  let filtered = activities;
  if (typeFilter) filtered = filtered.filter(a => a.type === typeFilter);
  if (search) filtered = filtered.filter(a => a.message.toLowerCase().includes(search));

  const list = document.getElementById('activityLogList');
  if (!filtered.length) {
    list.innerHTML = ''; document.getElementById('noActivityMsg').style.display = 'block'; return;
  }
  document.getElementById('noActivityMsg').style.display = 'none';

  const icons = { sale: 'bi-cart-check', add: 'bi-plus-circle', edit: 'bi-pencil', delete: 'bi-trash', restock: 'bi-arrow-up-circle', alert: 'bi-exclamation-triangle', invoice: 'bi-receipt', purchase: 'bi-cart-plus', return: 'bi-arrow-return-left', adjustment: 'bi-sliders', discount: 'bi-tag' };
  const colors = { sale: 'green', add: 'purple', edit: 'cyan', delete: 'red', restock: 'cyan', alert: 'amber', invoice: 'purple', purchase: 'purple', return: 'red', adjustment: 'orange', discount: 'green' };

  list.innerHTML = filtered.slice(0, 50).map(a => `
    <div class="activity-log-item">
      <div class="activity-log-icon ${colors[a.type] || 'purple'}"><i class="bi ${icons[a.type] || 'bi-circle'}"></i></div>
      <div class="activity-log-body">
        <p>${a.message}</p>
        <small>${fmtDateTime(a.timestamp)} • ${a.user || 'System'}</small>
      </div>
      <span class="badge badge-${colors[a.type] || 'purple'}" style="font-size:11px;">${a.type}</span>
    </div>
  `).join('');
}

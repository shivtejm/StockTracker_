/**
 * Stock Tracker - Enhanced JavaScript Application
 * Complete inventory management with all CRUD operations
 */

// Global variables
let allProducts = [];
let productToDelete = null;
let productToSell = null;
let productToRestock = null;
let smartSelectedProduct = null;
let quickSellProduct = null;

// DOM Elements
const productsTableBody = document.getElementById('productsTableBody');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');

// Bootstrap Modals
let productModal, deleteModal, sellModal, restockModal, lowStockModal, statisticsModal, clearDataModal, smartAddModal, quickSellModal;

// Initialize application
document.addEventListener('DOMContentLoaded', function () {
    // Initialize modals
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    sellModal = new bootstrap.Modal(document.getElementById('sellModal'));
    restockModal = new bootstrap.Modal(document.getElementById('restockModal'));
    lowStockModal = new bootstrap.Modal(document.getElementById('lowStockModal'));
    statisticsModal = new bootstrap.Modal(document.getElementById('statisticsModal'));
    clearDataModal = new bootstrap.Modal(document.getElementById('clearDataModal'));
    smartAddModal = new bootstrap.Modal(document.getElementById('smartAddModal'));
    quickSellModal = new bootstrap.Modal(document.getElementById('quickSellModal'));

    // Load data
    loadProducts();
    loadSalesSummary();
    updateLowStockBadge();

    // Event listeners
    document.getElementById('sellQuantity').addEventListener('input', updateSellTotal);
});

// ========== UI FUNCTIONS ==========

/**
 * Toggle sidebar on mobile
 */
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

/**
 * Show specific section
 */
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    // Show selected section
    if (section === 'dashboard') {
        document.getElementById('dashboardSection').classList.add('active');
    } else if (section === 'sales') {
        document.getElementById('salesSection').classList.add('active');
        loadSalesHistory();
    } else if (section === 'products') {
        document.getElementById('productsSection').classList.add('active');
        displayProductsOnly(allProducts);
    }

    // Update nav links
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('active');
}

/**
 * Display products in the Products Only section
 */
function displayProductsOnly(products) {
    const tbody = document.getElementById('productsOnlyTableBody');
    const emptyState = document.getElementById('productsOnlyEmpty');

    tbody.innerHTML = '';

    if (products.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Sort products A-Z by name
    const sortedProducts = [...products].sort((a, b) =>
        a.product_name.toLowerCase().localeCompare(b.product_name.toLowerCase())
    );

    sortedProducts.forEach(product => {
        const row = document.createElement('tr');
        const value = parseFloat(product.price) * parseInt(product.quantity);

        // Stock badge
        let stockBadge = '';
        if (product.quantity == 0) {
            stockBadge = '<span class="stock-badge stock-out"><i class="bi bi-x-circle"></i> Out</span>';
        } else if (product.quantity < 10) {
            stockBadge = `<span class="stock-badge stock-low"><i class="bi bi-exclamation-circle"></i> ${product.quantity}</span>`;
        } else if (product.quantity < 50) {
            stockBadge = `<span class="stock-badge stock-medium">${product.quantity}</span>`;
        } else {
            stockBadge = `<span class="stock-badge stock-high"><i class="bi bi-check-circle"></i> ${product.quantity}</span>`;
        }

        row.innerHTML = `
            <td><strong>#${product.id}</strong></td>
            <td><strong>${escapeHtml(product.product_name)}</strong></td>
            <td><span class="badge badge-category">${escapeHtml(product.category)}</span></td>
            <td>${stockBadge}</td>
            <td>₹${parseFloat(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="fw-bold">₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
            <td>
                <button class="btn btn-info btn-action text-white" onclick="showRestockModal(${product.id})" title="Restock">
                    <i class="bi bi-plus-lg"></i>
                </button>
                <button class="btn btn-success btn-action" onclick="showSellModal(${product.id})" title="Sell" ${product.quantity <= 0 ? 'disabled' : ''}>
                    <i class="bi bi-cart-check"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Search products in Products Only section
 */
function searchProductsOnly() {
    const searchTerm = document.getElementById('productSearchInput').value.toLowerCase();

    const filtered = allProducts.filter(product =>
        product.product_name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );

    displayProductsOnly(filtered);
}

/**
 * Show restock section/modal
 */
function showRestockSection() {
    showSection('dashboard');
    // Scroll to products table
    document.getElementById('productsTable').scrollIntoView({ behavior: 'smooth' });
}

// ========== DATA LOADING FUNCTIONS ==========

/**
 * Load all products
 */
function loadProducts() {
    showLoading(true);
    hideEmptyState();

    fetch('api/get_products.php')
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.success) {
                allProducts = data.data;
                displayProducts(allProducts);
                updateDashboard(allProducts);
                populateCategoryFilter(allProducts);
            } else {
                showToast('Error', data.message || 'Failed to load products', 'danger');
                showEmptyState();
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error:', error);
            showToast('Error', 'Failed to connect to server', 'danger');
            showEmptyState();
        });
}

/**
 * Load sales summary
 */
function loadSalesSummary() {
    fetch('api/get_sales.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('statSold').textContent = data.data.total_items_sold.toLocaleString();
                document.getElementById('statRevenue').textContent = '₹' + parseFloat(data.data.total_sales_value).toLocaleString('en-IN', { minimumFractionDigits: 0 });
            }
        })
        .catch(error => console.error('Error loading sales:', error));
}

/**
 * Load sales history
 */
function loadSalesHistory() {
    fetch('api/get_sales.php')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('salesTableBody');
            const emptyState = document.getElementById('salesEmptyState');

            if (data.success) {
                // Update sales summary cards
                const totalItems = data.data.total_items_sold;
                const totalRevenue = parseFloat(data.data.total_sales_value);
                const transactions = data.data.recent_sales.length;
                const avgOrder = transactions > 0 ? totalRevenue / transactions : 0;

                document.getElementById('salesTotalItems').textContent = totalItems.toLocaleString();
                document.getElementById('salesTotalRevenue').textContent = '₹' + totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 });
                document.getElementById('salesTotalTransactions').textContent = transactions;
                document.getElementById('salesAvgOrder').textContent = '₹' + avgOrder.toLocaleString('en-IN', { minimumFractionDigits: 0 });

                if (data.data.recent_sales.length > 0) {
                    tbody.innerHTML = '';
                    emptyState.style.display = 'none';

                    data.data.recent_sales.forEach(sale => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><strong>#${sale.id}</strong></td>
                            <td>${escapeHtml(sale.product_name)}</td>
                            <td><span class="badge badge-category">${escapeHtml(sale.category)}</span></td>
                            <td><strong>${sale.quantity_sold}</strong></td>
                            <td class="text-success fw-bold">₹${parseFloat(sale.sale_price).toLocaleString('en-IN')}</td>
                            <td>${new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                        `;
                        tbody.appendChild(row);
                    });
                } else {
                    tbody.innerHTML = '';
                    emptyState.style.display = 'block';
                }
            }
        })
        .catch(error => console.error('Error loading sales history:', error));
}

/**
 * Update low stock badge
 */
function updateLowStockBadge() {
    fetch('api/get_low_stock.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('lowStockBadge').textContent = data.count;
            }
        })
        .catch(error => console.error('Error:', error));
}

// ========== DISPLAY FUNCTIONS ==========

/**
 * Display products in table (sorted A-Z by name)
 */
function displayProducts(products) {
    productsTableBody.innerHTML = '';

    if (products.length === 0) {
        showEmptyState();
        return;
    }

    hideEmptyState();

    // Sort products A-Z by name
    const sortedProducts = [...products].sort((a, b) =>
        a.product_name.toLowerCase().localeCompare(b.product_name.toLowerCase())
    );

    sortedProducts.forEach(product => {
        const row = document.createElement('tr');
        const value = parseFloat(product.price) * parseInt(product.quantity);

        // Stock badge
        let stockBadge = '';
        if (product.quantity == 0) {
            stockBadge = '<span class="stock-badge stock-out"><i class="bi bi-x-circle"></i> Out of Stock</span>';
        } else if (product.quantity < 10) {
            stockBadge = `<span class="stock-badge stock-low"><i class="bi bi-exclamation-circle"></i> ${product.quantity}</span>`;
        } else if (product.quantity < 50) {
            stockBadge = `<span class="stock-badge stock-medium">${product.quantity}</span>`;
        } else {
            stockBadge = `<span class="stock-badge stock-high"><i class="bi bi-check-circle"></i> ${product.quantity}</span>`;
        }

        row.innerHTML = `
            <td><strong>#${product.id}</strong></td>
            <td><strong>${escapeHtml(product.product_name)}</strong></td>
            <td><span class="badge badge-category">${escapeHtml(product.category)}</span></td>
            <td>${stockBadge}</td>
            <td>₹${parseFloat(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="fw-bold">₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
            <td>
                <button class="btn btn-success btn-action" onclick="showSellModal(${product.id})" title="Sell" ${product.quantity <= 0 ? 'disabled' : ''}>
                    <i class="bi bi-cart-check"></i>
                </button>
                <button class="btn btn-info btn-action text-white" onclick="showRestockModal(${product.id})" title="Restock">
                    <i class="bi bi-plus-lg"></i>
                </button>
                <button class="btn btn-primary btn-action" onclick="editProduct(${product.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-action" onclick="showDeleteModal(${product.id}, '${escapeHtml(product.product_name)}')" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        productsTableBody.appendChild(row);
    });
}

/**
 * Update dashboard stats
 */
function updateDashboard(products) {
    document.getElementById('statProducts').textContent = products.length;

    const totalStock = products.reduce((sum, p) => sum + parseInt(p.quantity || 0), 0);
    document.getElementById('statStock').textContent = totalStock.toLocaleString();

    const categories = [...new Set(products.map(p => p.category))];
    document.getElementById('statCategories').textContent = categories.length;

    const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.price || 0) * parseInt(p.quantity || 0)), 0);
    document.getElementById('statValue').textContent = '₹' + totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

/**
 * Populate category filter
 */
function populateCategoryFilter(products) {
    const categoryFilter = document.getElementById('categoryFilter');
    const currentValue = categoryFilter.value;
    const categories = [...new Set(products.map(p => p.category))].sort();

    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    categoryFilter.value = currentValue;
}

// ========== SEARCH & FILTER FUNCTIONS ==========

/**
 * Search products
 */
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;

    let filtered = allProducts.filter(product => {
        const matchesSearch = product.product_name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm));
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    displayProducts(filtered);
}

/**
 * Filter by category
 */
function filterByCategory() {
    searchProducts();
}

/**
 * Clear all filters
 */
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    displayProducts(allProducts);
}

// ========== PRODUCT CRUD FUNCTIONS ==========

/**
 * Show add modal
 */
function showAddModal() {
    document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-plus-circle me-2"></i>Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    productModal.show();
}

/**
 * Edit product
 */
function editProduct(id) {
    fetch(`api/get_product.php?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.data;
                document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-pencil me-2"></i>Edit Product';
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.product_name;
                document.getElementById('category').value = product.category;
                document.getElementById('quantity').value = product.quantity;
                document.getElementById('price').value = product.price;
                document.getElementById('description').value = product.description || '';
                productModal.show();
            } else {
                showToast('Error', data.message || 'Failed to load product', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to load product', 'danger');
        });
}

/**
 * Save product
 */
function saveProduct(event) {
    event.preventDefault();

    const formData = new FormData(document.getElementById('productForm'));
    const productId = document.getElementById('productId').value;
    const url = productId ? 'api/update_product.php' : 'api/add_product.php';

    fetch(url, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                productModal.hide();
                showToast('Success', data.message, 'success');
                loadProducts();
            } else {
                showToast('Error', data.message || 'Failed to save product', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to save product', 'danger');
        });
}

/**
 * Show delete modal
 */
function showDeleteModal(id, productName) {
    productToDelete = id;
    document.getElementById('deleteProductName').textContent = productName;
    deleteModal.show();
}

/**
 * Confirm delete
 */
function confirmDelete() {
    if (!productToDelete) return;

    const formData = new FormData();
    formData.append('id', productToDelete);

    fetch('api/delete_product.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            deleteModal.hide();
            if (data.success) {
                showToast('Success', data.message, 'success');
                loadProducts();
                updateLowStockBadge();
            } else {
                showToast('Error', data.message || 'Failed to delete product', 'danger');
            }
            productToDelete = null;
        })
        .catch(error => {
            deleteModal.hide();
            console.error('Error:', error);
            showToast('Error', 'Failed to delete product', 'danger');
            productToDelete = null;
        });
}

// ========== SELL FUNCTIONS ==========

/**
 * Show sell modal
 */
function showSellModal(id) {
    fetch(`api/get_product.php?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.data;
                productToSell = product;
                document.getElementById('sellProductId').value = product.id;
                document.getElementById('sellProductName').textContent = product.product_name;
                document.getElementById('sellAvailableStock').textContent = product.quantity;
                document.getElementById('sellUnitPrice').textContent = '₹' + parseFloat(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                document.getElementById('sellQuantity').value = '';
                document.getElementById('sellQuantity').max = product.quantity;
                document.getElementById('sellTotalPrice').textContent = '₹0';
                sellModal.show();
            } else {
                showToast('Error', data.message || 'Failed to load product', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to load product', 'danger');
        });
}

/**
 * Update sell total
 */
function updateSellTotal() {
    if (!productToSell) return;
    const qty = parseInt(document.getElementById('sellQuantity').value) || 0;
    const price = parseFloat(productToSell.price) || 0;
    const total = qty * price;
    document.getElementById('sellTotalPrice').textContent = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

/**
 * Confirm sell
 */
function confirmSell(event) {
    event.preventDefault();

    const formData = new FormData(document.getElementById('sellForm'));
    const qty = parseInt(formData.get('quantity_sold'));

    if (qty > parseInt(productToSell.quantity)) {
        showToast('Error', 'Quantity exceeds available stock!', 'danger');
        return;
    }

    fetch('api/sell_product.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            sellModal.hide();
            if (data.success) {
                showToast('Sale Complete', data.message, 'success');
                loadProducts();
                loadSalesSummary();
                updateLowStockBadge();
            } else {
                showToast('Error', data.message || 'Failed to complete sale', 'danger');
            }
            productToSell = null;
        })
        .catch(error => {
            sellModal.hide();
            console.error('Error:', error);
            showToast('Error', 'Failed to complete sale', 'danger');
            productToSell = null;
        });
}

// ========== RESTOCK FUNCTIONS ==========

/**
 * Show restock modal
 */
function showRestockModal(id) {
    fetch(`api/get_product.php?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.data;
                productToRestock = product;
                document.getElementById('restockProductId').value = product.id;
                document.getElementById('restockProductName').textContent = product.product_name;
                document.getElementById('restockCurrentStock').textContent = product.quantity;
                document.getElementById('restockQuantity').value = '';
                restockModal.show();
            } else {
                showToast('Error', data.message || 'Failed to load product', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to load product', 'danger');
        });
}

/**
 * Confirm restock
 */
function confirmRestock(event) {
    event.preventDefault();

    const formData = new FormData(document.getElementById('restockForm'));

    fetch('api/restock_product.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            restockModal.hide();
            if (data.success) {
                showToast('Success', data.message, 'success');
                loadProducts();
                updateLowStockBadge();
            } else {
                showToast('Error', data.message || 'Failed to restock product', 'danger');
            }
            productToRestock = null;
        })
        .catch(error => {
            restockModal.hide();
            console.error('Error:', error);
            showToast('Error', 'Failed to restock product', 'danger');
            productToRestock = null;
        });
}

// ========== LOW STOCK FUNCTIONS ==========

/**
 * Show low stock modal
 */
function showLowStockModal() {
    fetch('api/get_low_stock.php')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('lowStockTableBody');
            const noLowStock = document.getElementById('noLowStock');

            if (data.success && data.data.length > 0) {
                tbody.innerHTML = '';
                noLowStock.style.display = 'none';

                data.data.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${escapeHtml(product.product_name)}</strong></td>
                        <td><span class="badge badge-category">${escapeHtml(product.category)}</span></td>
                        <td><span class="stock-badge ${product.quantity == 0 ? 'stock-out' : 'stock-low'}">${product.quantity == 0 ? 'Out of Stock' : product.quantity}</span></td>
                        <td>
                            <button class="btn btn-info btn-sm text-white" onclick="lowStockModal.hide(); showRestockModal(${product.id})">
                                <i class="bi bi-plus-lg me-1"></i>Restock
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '';
                noLowStock.style.display = 'block';
            }

            lowStockModal.show();
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to load low stock products', 'danger');
        });
}

// ========== STATISTICS FUNCTIONS ==========

/**
 * Show statistics modal
 */
function showStatisticsModal() {
    fetch('api/get_statistics.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.data;
                const body = document.getElementById('statisticsBody');

                body.innerHTML = `
                    <div class="stats-grid">
                        <div class="stats-item">
                            <div class="value">${stats.total_products}</div>
                            <div class="label">Total Products</div>
                        </div>
                        <div class="stats-item">
                            <div class="value">${stats.total_stock.toLocaleString()}</div>
                            <div class="label">Total Stock</div>
                        </div>
                        <div class="stats-item">
                            <div class="value">₹${parseFloat(stats.total_value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                            <div class="label">Inventory Value</div>
                        </div>
                        <div class="stats-item">
                            <div class="value">₹${parseFloat(stats.avg_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div class="label">Average Price</div>
                        </div>
                        <div class="stats-item">
                            <div class="value text-warning">${stats.low_stock_count}</div>
                            <div class="label">Low Stock Items</div>
                        </div>
                        <div class="stats-item">
                            <div class="value text-danger">${stats.out_of_stock}</div>
                            <div class="label">Out of Stock</div>
                        </div>
                        <div class="stats-item">
                            <div class="value text-success">${stats.total_sold.toLocaleString()}</div>
                            <div class="label">Items Sold</div>
                        </div>
                        <div class="stats-item">
                            <div class="value text-success">₹${parseFloat(stats.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                            <div class="label">Total Revenue</div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="mb-3"><i class="bi bi-tags me-2"></i>Category Breakdown</h6>
                            <table class="category-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Products</th>
                                        <th>Stock</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stats.categories.map(c => `
                                        <tr>
                                            <td><strong>${escapeHtml(c.category)}</strong></td>
                                            <td>${c.product_count}</td>
                                            <td>${parseInt(c.total_qty).toLocaleString()}</td>
                                            <td>₹${parseFloat(c.category_value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h6 class="mb-3"><i class="bi bi-trophy me-2"></i>Top 5 by Value</h6>
                            <table class="category-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stats.top_products.map(p => `
                                        <tr>
                                            <td><strong>${escapeHtml(p.product_name)}</strong></td>
                                            <td>${p.quantity}</td>
                                            <td>₹${parseFloat(p.price).toLocaleString('en-IN')}</td>
                                            <td class="text-success fw-bold">₹${parseFloat(p.value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                statisticsModal.show();
            } else {
                showToast('Error', 'Failed to load statistics', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to load statistics', 'danger');
        });
}

// ========== CLEAR DATA FUNCTIONS ==========

/**
 * Show clear data modal
 */
function showClearDataModal() {
    clearDataModal.show();
}

/**
 * Confirm clear all data
 */
function confirmClearData() {
    fetch('api/clear_data.php', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            clearDataModal.hide();
            if (data.success) {
                showToast('Success', 'All data has been cleared', 'success');
                loadProducts();
                loadSalesSummary();
                updateLowStockBadge();
            } else {
                showToast('Error', data.message || 'Failed to clear data', 'danger');
            }
        })
        .catch(error => {
            clearDataModal.hide();
            console.error('Error:', error);
            showToast('Error', 'Failed to clear data', 'danger');
        });
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Show/hide loading
 */
function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
    document.getElementById('productsTable').style.display = show ? 'none' : 'table';
}

/**
 * Show empty state
 */
function showEmptyState() {
    emptyState.style.display = 'block';
    document.getElementById('productsTable').style.display = 'none';
}

/**
 * Hide empty state
 */
function hideEmptyState() {
    emptyState.style.display = 'none';
    document.getElementById('productsTable').style.display = 'table';
}

/**
 * Show toast notification
 */
function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toastEl.className = 'toast';
    if (type === 'success') {
        toastEl.classList.add('bg-success', 'text-white');
    } else if (type === 'danger') {
        toastEl.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastEl.classList.add('bg-warning');
    }

    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== SMART ADD/RESTOCK FUNCTIONS ==========

/**
 * Show smart add modal
 */
function showSmartAddModal() {
    resetSmartAdd();
    smartAddModal.show();
}

/**
 * Search products in smart add modal
 */
function smartSearchProducts() {
    const searchTerm = document.getElementById('smartSearchInput').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('smartSearchResults');
    const listDiv = document.getElementById('smartSearchList');

    if (searchTerm.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const filtered = allProducts.filter(p =>
        p.product_name.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
    );

    if (filtered.length > 0) {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '';

        filtered.forEach(product => {
            const stockClass = product.quantity < 10 ? 'text-danger' : 'text-success';
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(product.product_name)}</strong>
                    <br><small class="text-muted">${escapeHtml(product.category)}</small>
                </div>
                <div class="text-end">
                    <span class="${stockClass} fw-bold">Stock: ${product.quantity}</span>
                    <br><small>₹${parseFloat(product.price).toLocaleString('en-IN')}</small>
                </div>
            `;
            item.onclick = (e) => {
                e.preventDefault();
                selectSmartProduct(product);
            };
            listDiv.appendChild(item);
        });
    } else {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '<div class="list-group-item text-muted text-center">No products found</div>';
    }
}

/**
 * List all products sorted A-Z for restock
 */
function listAllProductsForRestock() {
    const resultsDiv = document.getElementById('smartSearchResults');
    const listDiv = document.getElementById('smartSearchList');

    // Sort products A-Z by name
    const sorted = [...allProducts].sort((a, b) =>
        a.product_name.toLowerCase().localeCompare(b.product_name.toLowerCase())
    );

    if (sorted.length > 0) {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '';

        sorted.forEach(product => {
            const stockClass = product.quantity < 10 ? 'text-danger' : 'text-success';
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(product.product_name)}</strong>
                    <br><small class="text-muted">${escapeHtml(product.category)}</small>
                </div>
                <div class="text-end">
                    <span class="${stockClass} fw-bold">Stock: ${product.quantity}</span>
                    <br><small>₹${parseFloat(product.price).toLocaleString('en-IN')}</small>
                </div>
            `;
            item.onclick = (e) => {
                e.preventDefault();
                selectSmartProduct(product);
            };
            listDiv.appendChild(item);
        });
    } else {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '<div class="list-group-item text-muted text-center">No products in inventory</div>';
    }
}

/**
 * Select product for restock
 */
function selectSmartProduct(product) {
    smartSelectedProduct = product;
    document.getElementById('smartSelectedProduct').textContent = product.product_name;
    document.getElementById('smartCurrentStock').textContent = product.quantity;
    document.getElementById('smartRestockQty').value = '';

    document.getElementById('smartSearchResults').style.display = 'none';
    document.getElementById('smartAddNewSection').style.display = 'none';
    document.getElementById('smartRestockForm').style.display = 'block';
}

/**
 * Confirm smart restock
 */
function confirmSmartRestock() {
    if (!smartSelectedProduct) return;

    const qty = parseInt(document.getElementById('smartRestockQty').value);
    if (!qty || qty < 1) {
        showToast('Error', 'Please enter a valid quantity', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('product_id', smartSelectedProduct.id);
    formData.append('quantity', qty);

    fetch('api/restock_product.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                smartAddModal.hide();
                showToast('Success', data.message, 'success');
                loadProducts();
                updateLowStockBadge();
            } else {
                showToast('Error', data.message || 'Failed to restock', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to restock product', 'danger');
        });
}

/**
 * Reset smart add modal
 */
function resetSmartAdd() {
    smartSelectedProduct = null;
    document.getElementById('smartSearchInput').value = '';
    document.getElementById('smartSearchResults').style.display = 'none';
    document.getElementById('smartRestockForm').style.display = 'none';
    document.getElementById('smartAddNewSection').style.display = 'block';
    document.getElementById('smartRestockQty').value = '';
}

/**
 * Show add new product from smart modal
 */
function showAddNewFromSmart() {
    smartAddModal.hide();
    showAddModal();
}

// ========== QUICK SELL FUNCTIONS ==========

/**
 * Show quick sell modal
 */
function showQuickSellModal() {
    resetQuickSell();
    quickSellModal.show();
}

/**
 * Search products in quick sell modal
 */
function quickSellSearchProducts() {
    const searchTerm = document.getElementById('quickSellSearchInput').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('quickSellSearchResults');
    const listDiv = document.getElementById('quickSellSearchList');

    if (searchTerm.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const filtered = allProducts.filter(p =>
        (p.product_name.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm)) &&
        p.quantity > 0
    );

    if (filtered.length > 0) {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '';

        filtered.forEach(product => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(product.product_name)}</strong>
                    <br><small class="text-muted">${escapeHtml(product.category)}</small>
                </div>
                <div class="text-end">
                    <span class="text-success fw-bold">Stock: ${product.quantity}</span>
                    <br><small>₹${parseFloat(product.price).toLocaleString('en-IN')}</small>
                </div>
            `;
            item.onclick = (e) => {
                e.preventDefault();
                selectQuickSellProduct(product);
            };
            listDiv.appendChild(item);
        });
    } else {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '<div class="list-group-item text-muted text-center">No products found with stock</div>';
    }
}

/**
 * List all products sorted A-Z for sell (only with stock > 0)
 */
function listAllProductsForSell() {
    const resultsDiv = document.getElementById('quickSellSearchResults');
    const listDiv = document.getElementById('quickSellSearchList');

    // Sort products A-Z by name, only those with stock
    const sorted = [...allProducts]
        .filter(p => p.quantity > 0)
        .sort((a, b) => a.product_name.toLowerCase().localeCompare(b.product_name.toLowerCase()));

    if (sorted.length > 0) {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '';

        sorted.forEach(product => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(product.product_name)}</strong>
                    <br><small class="text-muted">${escapeHtml(product.category)}</small>
                </div>
                <div class="text-end">
                    <span class="text-success fw-bold">Stock: ${product.quantity}</span>
                    <br><small>₹${parseFloat(product.price).toLocaleString('en-IN')}</small>
                </div>
            `;
            item.onclick = (e) => {
                e.preventDefault();
                selectQuickSellProduct(product);
            };
            listDiv.appendChild(item);
        });
    } else {
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '<div class="list-group-item text-muted text-center">No products with stock available</div>';
    }
}

/**
 * Select product for quick sell
 */
function selectQuickSellProduct(product) {
    quickSellProduct = product;
    document.getElementById('quickSellProductId').value = product.id;
    document.getElementById('quickSellProductName').textContent = product.product_name;
    document.getElementById('quickSellStock').textContent = product.quantity;
    document.getElementById('quickSellPrice').textContent = '₹' + parseFloat(product.price).toLocaleString('en-IN');
    document.getElementById('quickSellQty').value = '';
    document.getElementById('quickSellQty').max = product.quantity;
    document.getElementById('quickSellTotal').textContent = '₹0';

    document.getElementById('quickSellSearchResults').style.display = 'none';
    document.getElementById('quickSellForm').style.display = 'block';
}

/**
 * Update quick sell total
 */
function updateQuickSellTotal() {
    if (!quickSellProduct) return;
    const qty = parseInt(document.getElementById('quickSellQty').value) || 0;
    const price = parseFloat(quickSellProduct.price) || 0;
    const total = qty * price;
    document.getElementById('quickSellTotal').textContent = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

/**
 * Confirm quick sell
 */
function confirmQuickSell() {
    if (!quickSellProduct) return;

    const qty = parseInt(document.getElementById('quickSellQty').value);
    if (!qty || qty < 1) {
        showToast('Error', 'Please enter a valid quantity', 'danger');
        return;
    }

    if (qty > quickSellProduct.quantity) {
        showToast('Error', 'Quantity exceeds available stock!', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('product_id', quickSellProduct.id);
    formData.append('quantity_sold', qty);

    fetch('api/sell_product.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                quickSellModal.hide();
                showToast('Sale Complete', data.message, 'success');
                loadProducts();
                loadSalesSummary();
                updateLowStockBadge();
            } else {
                showToast('Error', data.message || 'Failed to complete sale', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error', 'Failed to complete sale', 'danger');
        });
}

/**
 * Reset quick sell modal
 */
function resetQuickSell() {
    quickSellProduct = null;
    document.getElementById('quickSellSearchInput').value = '';
    document.getElementById('quickSellSearchResults').style.display = 'none';
    document.getElementById('quickSellForm').style.display = 'none';
    document.getElementById('quickSellQty').value = '';
}

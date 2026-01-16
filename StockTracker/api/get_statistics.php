<?php
/**
 * Get Inventory Statistics API
 * Returns comprehensive inventory statistics
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/database.php';

try {
    // Total products
    $sql = "SELECT COUNT(*) as total_products FROM products";
    $stmt = $pdo->query($sql);
    $totalProducts = $stmt->fetch()['total_products'];

    // Total stock quantity
    $sql = "SELECT COALESCE(SUM(quantity), 0) as total_stock FROM products";
    $stmt = $pdo->query($sql);
    $totalStock = $stmt->fetch()['total_stock'];

    // Total inventory value
    $sql = "SELECT COALESCE(SUM(price * quantity), 0) as total_value FROM products";
    $stmt = $pdo->query($sql);
    $totalValue = $stmt->fetch()['total_value'];

    // Average price
    $sql = "SELECT COALESCE(AVG(price), 0) as avg_price FROM products";
    $stmt = $pdo->query($sql);
    $avgPrice = $stmt->fetch()['avg_price'];

    // Low stock count (< 10)
    $sql = "SELECT COUNT(*) as low_stock_count FROM products WHERE quantity < 10";
    $stmt = $pdo->query($sql);
    $lowStockCount = $stmt->fetch()['low_stock_count'];

    // Out of stock count
    $sql = "SELECT COUNT(*) as out_of_stock FROM products WHERE quantity = 0";
    $stmt = $pdo->query($sql);
    $outOfStock = $stmt->fetch()['out_of_stock'];

    // Category breakdown
    $sql = "SELECT category, COUNT(*) as product_count, SUM(quantity) as total_qty, SUM(price * quantity) as category_value 
            FROM products GROUP BY category ORDER BY category_value DESC";
    $stmt = $pdo->query($sql);
    $categories = $stmt->fetchAll();

    // Top 5 most valuable products
    $sql = "SELECT product_name, quantity, price, (price * quantity) as value 
            FROM products ORDER BY value DESC LIMIT 5";
    $stmt = $pdo->query($sql);
    $topProducts = $stmt->fetchAll();

    // Sales statistics
    $sql = "SELECT COALESCE(SUM(quantity_sold), 0) as total_sold, COALESCE(SUM(sale_price), 0) as total_revenue FROM sales";
    $stmt = $pdo->query($sql);
    $salesStats = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'data' => [
            'total_products' => intval($totalProducts),
            'total_stock' => intval($totalStock),
            'total_value' => floatval($totalValue),
            'avg_price' => floatval($avgPrice),
            'low_stock_count' => intval($lowStockCount),
            'out_of_stock' => intval($outOfStock),
            'categories' => $categories,
            'top_products' => $topProducts,
            'total_sold' => intval($salesStats['total_sold']),
            'total_revenue' => floatval($salesStats['total_revenue'])
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching statistics: ' . $e->getMessage()
    ]);
}
?>
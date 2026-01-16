<?php
/**
 * Get Sales Summary API
 * Returns total items sold and sales value
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/database.php';

try {
    // Get total items sold and total sales value
    $sql = "SELECT 
                COALESCE(SUM(quantity_sold), 0) as total_items_sold,
                COALESCE(SUM(sale_price), 0) as total_sales_value
            FROM sales";
    $stmt = $pdo->query($sql);
    $summary = $stmt->fetch();

    // Get recent sales with product details
    $sql = "SELECT s.id, s.quantity_sold, s.sale_price, s.sale_date, 
                   p.product_name, p.category
            FROM sales s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.sale_date DESC
            LIMIT 10";
    $stmt = $pdo->query($sql);
    $recent_sales = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'total_items_sold' => intval($summary['total_items_sold']),
            'total_sales_value' => floatval($summary['total_sales_value']),
            'recent_sales' => $recent_sales
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching sales: ' . $e->getMessage()
    ]);
}
?>
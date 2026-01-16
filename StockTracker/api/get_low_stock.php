<?php
/**
 * Get Low Stock Products API
 * Returns products with quantity below threshold
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/database.php';

// Default threshold is 10, can be passed as parameter
$threshold = isset($_GET['threshold']) ? intval($_GET['threshold']) : 10;

try {
    $sql = "SELECT * FROM products WHERE quantity < :threshold ORDER BY quantity ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['threshold' => $threshold]);
    $products = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $products,
        'count' => count($products),
        'threshold' => $threshold
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching low stock products: ' . $e->getMessage()
    ]);
}
?>
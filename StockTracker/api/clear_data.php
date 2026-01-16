<?php
/**
 * Clear All Products API
 * Deletes all products and sales data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
    exit;
}

require_once '../config/database.php';

try {
    // Start transaction
    $pdo->beginTransaction();

    // Delete all sales first (due to foreign key)
    $pdo->exec("DELETE FROM sales");

    // Delete all products
    $pdo->exec("DELETE FROM products");

    // Reset sequences
    $pdo->exec("ALTER SEQUENCE products_id_seq RESTART WITH 1");
    $pdo->exec("ALTER SEQUENCE sales_id_seq RESTART WITH 1");

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'All data cleared successfully'
    ]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error clearing data: ' . $e->getMessage()
    ]);
}
?>
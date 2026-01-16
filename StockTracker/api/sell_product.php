<?php
/**
 * Sell Product API
 * Handles POST request to sell products (reduce stock and record sale)
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

// Get POST data
$product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
$quantity_sold = isset($_POST['quantity_sold']) ? intval($_POST['quantity_sold']) : 0;

// Validate required fields
if ($product_id <= 0 || $quantity_sold <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid product ID or quantity'
    ]);
    exit;
}

try {
    // Start transaction
    $pdo->beginTransaction();

    // Check current stock
    $sql = "SELECT quantity, price, product_name FROM products WHERE id = :id FOR UPDATE";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $product_id]);
    $product = $stmt->fetch();

    if (!$product) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Product not found'
        ]);
        exit;
    }

    if ($product['quantity'] < $quantity_sold) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Insufficient stock. Available: ' . $product['quantity']
        ]);
        exit;
    }

    // Calculate sale price
    $sale_price = $product['price'] * $quantity_sold;

    // Reduce stock
    $sql = "UPDATE products SET quantity = quantity - :qty, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['qty' => $quantity_sold, 'id' => $product_id]);

    // Record sale
    $sql = "INSERT INTO sales (product_id, quantity_sold, sale_price) VALUES (:product_id, :qty, :price)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'product_id' => $product_id,
        'qty' => $quantity_sold,
        'price' => $sale_price
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Sold ' . $quantity_sold . ' x ' . $product['product_name'] . ' for ₹' . number_format($sale_price, 2),
        'sale_price' => $sale_price
    ]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error processing sale: ' . $e->getMessage()
    ]);
}
?>
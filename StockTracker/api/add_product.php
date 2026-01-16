<?php
/**
 * Add Product API
 * Handles POST request to add new product
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
$product_name = isset($_POST['product_name']) ? trim($_POST['product_name']) : '';
$category = isset($_POST['category']) ? trim($_POST['category']) : '';
$quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 0;
$price = isset($_POST['price']) ? floatval($_POST['price']) : 0.00;
$description = isset($_POST['description']) ? trim($_POST['description']) : '';

// Validate required fields
if (empty($product_name) || empty($category)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Product name and category are required'
    ]);
    exit;
}

try {
    $sql = "INSERT INTO products (product_name, category, quantity, price, description) 
            VALUES (:product_name, :category, :quantity, :price, :description)
            RETURNING id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'product_name' => $product_name,
        'category' => $category,
        'quantity' => $quantity,
        'price' => $price,
        'description' => $description
    ]);

    $newId = $stmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Product added successfully',
        'id' => $newId
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error adding product: ' . $e->getMessage()
    ]);
}
?>
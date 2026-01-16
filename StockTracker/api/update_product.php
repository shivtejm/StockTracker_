<?php
/**
 * Update Product API
 * Handles POST request to update existing product
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
$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
$product_name = isset($_POST['product_name']) ? trim($_POST['product_name']) : '';
$category = isset($_POST['category']) ? trim($_POST['category']) : '';
$quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 0;
$price = isset($_POST['price']) ? floatval($_POST['price']) : 0.00;
$description = isset($_POST['description']) ? trim($_POST['description']) : '';

// Validate required fields
if ($id <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid product ID'
    ]);
    exit;
}

if (empty($product_name) || empty($category)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Product name and category are required'
    ]);
    exit;
}

try {
    $sql = "UPDATE products 
            SET product_name = :product_name, 
                category = :category, 
                quantity = :quantity, 
                price = :price, 
                description = :description,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        'id' => $id,
        'product_name' => $product_name,
        'category' => $category,
        'quantity' => $quantity,
        'price' => $price,
        'description' => $description
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully'
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Product not found or no changes made'
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating product: ' . $e->getMessage()
    ]);
}
?>
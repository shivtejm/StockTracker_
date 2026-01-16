<?php
/**
 * Database Configuration
 * PostgreSQL Connection using PDO
 */

// Database connection parameters
$host = 'localhost';
$port = '5432';
$dbname = 'stock_tracker';
$username = 'postgres';
$password = 'postgres';  // Change this to your PostgreSQL password

try {
    // Create PDO connection
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    // Return error as JSON for API consistency
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}
?>

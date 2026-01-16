-- Stock Tracker Database Schema
-- PostgreSQL Database Setup

-- Create the database (run this separately if needed)
-- CREATE DATABASE stock_tracker;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data for testing
INSERT INTO products (product_name, category, quantity, price, description) VALUES
('Laptop Dell Inspiron', 'Electronics', 25, 45000.00, 'Dell Inspiron 15 inch laptop with 8GB RAM'),
('Office Chair', 'Furniture', 50, 5500.00, 'Ergonomic office chair with lumbar support'),
('Printer HP LaserJet', 'Electronics', 15, 12000.00, 'HP LaserJet Pro wireless printer'),
('Notebook Pack', 'Stationery', 200, 150.00, 'Pack of 5 ruled notebooks'),
('Desk Lamp LED', 'Electronics', 75, 850.00, 'Adjustable LED desk lamp');

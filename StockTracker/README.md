# Stock Tracker - Inventory Management System

A simple web-based inventory management system for stock holders to manage their products.

## 📋 Project Overview

This is an academic project that demonstrates a complete CRUD (Create, Read, Update, Delete) application using:
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: PHP 8.x
- **Database**: PostgreSQL

## 🏗️ Project Structure

```
StockTracker/
├── config/
│   └── database.php          # PostgreSQL connection configuration
├── api/
│   ├── add_product.php       # Add new product
│   ├── get_products.php      # Get all products
│   ├── get_product.php       # Get single product by ID
│   ├── update_product.php    # Update existing product
│   └── delete_product.php    # Delete product
├── css/
│   └── style.css             # Custom stylesheet
├── js/
│   └── app.js                # Frontend JavaScript
├── sql/
│   └── schema.sql            # Database schema
├── index.html                # Main application page
└── README.md                 # This file
```

## ⚙️ Setup Instructions

### Prerequisites
1. **PHP 8.x** installed with PDO PostgreSQL extension
2. **PostgreSQL** database server
3. **Web browser** (Chrome, Firefox, Edge recommended)

### Step 1: Create PostgreSQL Database

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE stock_tracker;

# Connect to the database
\c stock_tracker

# Run the schema file (or copy-paste the contents)
\i /path/to/StockTracker/sql/schema.sql

# Exit
\q
```

### Step 2: Configure Database Connection

Edit `config/database.php` and update these values:

```php
$host = 'localhost';      // Your PostgreSQL host
$port = '5432';           // PostgreSQL port
$dbname = 'stock_tracker'; // Database name
$username = 'postgres';    // Your username
$password = 'postgres';    // Your password
```

### Step 3: Run the Application

```bash
# Navigate to project directory
cd /path/to/StockTracker

# Start PHP built-in server
php -S localhost:8000

# Open browser and visit:
# http://localhost:8000
```

## 📖 Features

### 1. Dashboard
- View total products count
- View total stock quantity
- View number of categories
- View total inventory value

### 2. Product Management
- **Add Product**: Click "Add New Product" button
- **View Products**: Products displayed in a responsive table
- **Edit Product**: Click the edit (pencil) icon
- **Delete Product**: Click the delete (trash) icon with confirmation

### 3. Search & Filter
- Search products by name, category, or description
- Filter products by category

### 4. Stock Level Indicators
- **Red**: Low stock (< 10 items)
- **Yellow**: Medium stock (10-49 items)
- **Green**: High stock (50+ items)

## 🗄️ Database Schema

### Products Table

| Column       | Type         | Description                |
|-------------|--------------|----------------------------|
| id          | SERIAL       | Primary key (auto-increment)|
| product_name| VARCHAR(255) | Name of the product        |
| category    | VARCHAR(100) | Product category           |
| quantity    | INTEGER      | Stock quantity             |
| price       | DECIMAL(10,2)| Unit price in INR          |
| description | TEXT         | Product description        |
| created_at  | TIMESTAMP    | Creation timestamp         |
| updated_at  | TIMESTAMP    | Last update timestamp      |

## 🛠️ API Endpoints

| Endpoint              | Method | Description          |
|----------------------|--------|----------------------|
| api/get_products.php | GET    | Get all products     |
| api/get_product.php  | GET    | Get product by ID    |
| api/add_product.php  | POST   | Add new product      |
| api/update_product.php| POST  | Update product       |
| api/delete_product.php| POST  | Delete product       |

## 📝 Technology Explanation

### Frontend (HTML, CSS, Bootstrap, JavaScript)
- **HTML5**: Page structure and content
- **CSS3**: Custom styling and animations
- **Bootstrap 5**: Responsive grid, components, modals
- **JavaScript**: AJAX calls, DOM manipulation, form handling

### Backend (PHP)
- **PDO**: Secure database connection
- **Prepared Statements**: SQL injection prevention
- **JSON API**: RESTful response format

### Database (PostgreSQL)
- **SERIAL**: Auto-incrementing primary key
- **Timestamps**: Automatic date tracking

## 🎓 Academic Notes

This project demonstrates:
1. **MVC-like Architecture**: Separation of frontend and backend
2. **CRUD Operations**: Complete data management cycle
3. **RESTful API Design**: JSON-based communication
4. **Security Practices**: Input validation, prepared statements
5. **Responsive Design**: Mobile-friendly interface
6. **User Experience**: Loading states, notifications, confirmations

## 👨‍💻 Author

Academic Project for Stock/Inventory Management

---

**Note**: Remember to change the database credentials in `config/database.php` before deploying!

# StockTracker — Inventory Management System

A web-based inventory management system with cloud sync, POS billing, GST invoicing, and real-time alerts.

## 📋 Project Overview

A comprehensive inventory management system built with:
- **Frontend**: HTML5, CSS3, JavaScript
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Charts**: Chart.js
- **Icons**: Bootstrap Icons

## 🏗️ Project Structure

```
StockTracker/
├── apps/
│   └── frontend/
│       ├── css/style.css         # All styles
│       ├── js/
│       │   ├── supabase-config.js  # Supabase client setup
│       │   ├── data.js             # Data layer + Supabase sync
│       │   ├── app.js              # Auth, navigation, dashboard, products
│       │   ├── modules.js          # Sales, suppliers, customers
│       │   ├── features.js         # Reports, alerts, settings
│       │   ├── operations.js       # Purchase orders, returns, discounts
│       │   └── pos.js              # Point of Sale
│       └── index.html            # Single-page application
└── README.md
```

## ⚙️ Setup Instructions

### Prerequisites
1. **Supabase** account (free at [supabase.com](https://supabase.com))
2. **Web browser** (Chrome, Firefox, Edge)

### Step 1: Run the App

```bash
cd apps/frontend
python -m http.server 8080
# Open http://localhost:8080
```

### Step 2: Register & Login
- Create an account with your email and password
- Sign in to access your store dashboard
- Data is cloud-synced — access from any device

## 📖 Features

| Feature | Description |
|---|---|
| **Dashboard** | Revenue, sales, stock, profit analytics with charts |
| **Products** | Full CRUD with SKU, categories, GST, expiry tracking |
| **Sales & Billing** | Create invoices with GST, customer linking, payment methods |
| **POS** | Quick point-of-sale billing with cart |
| **Suppliers** | Manage supplier contacts and ratings |
| **Customers** | Customer directory with loyalty points |
| **Purchase Orders** | Create, track, and receive POs |
| **Returns & Refunds** | Process returns against invoices |
| **Discounts** | Coupon codes with percentage/fixed discounts |
| **Reports** | Sales trends, category breakdown, profit/loss charts |
| **Alerts** | Low stock, expiry, overstock notifications |
| **Activity Log** | Track all actions across the system |
| **Settings** | Company details, GST rate, stock thresholds |
| **Multi-user Auth** | Email/password registration with Supabase Auth |
| **Cloud Sync** | Data stored in Supabase — accessible from any device |

## 🔐 Architecture

- **Auth**: Supabase Auth (email + password)
- **Data Storage**: Supabase PostgreSQL with JSONB columns
- **Sync Strategy**: localStorage cache for speed + async Supabase sync
- **Data Isolation**: Row Level Security (RLS) per user

## 👨‍💻 Author

Academic Project for Stock/Inventory Management

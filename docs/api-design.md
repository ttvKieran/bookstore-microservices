# RESTful API Design Specification

Tài liệu thiết kế API chi tiết cho tất cả 12 microservices trong hệ thống BookStore.

---

## Authentication Flow

### JWT Token Structure
```json
{
  "user_id": "uuid-string",
  "username": "john_doe",
  "role": "customer|staff|manager",
  "exp": 1709641200,
  "iat": 1709637600
}
```

### Common Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 1. API Gateway Service

**Base URL**: `http://localhost:8000`

### Authentication Endpoints

#### 1.1 Login (Customer)
```http
POST /api/auth/login
```

**Request Body**:
```json
{
  "username": "john_doe",
  "password": "securepass123"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

#### 1.2 Login (Staff)
```http
POST /api/auth/staff/login
```

**Request Body**:
```json
{
  "username": "staff_john",
  "password": "staffpass123"
}
```

**Response** (200 OK): Same structure as customer login with `role: "staff"`

#### 1.3 Login (Manager)
```http
POST /api/auth/manager/login
```

**Request Body**:
```json
{
  "username": "manager_user",
  "password": "managerpass123"
}
```

**Response** (200 OK): Same structure with `role: "manager"`

#### 1.4 Refresh Token
```http
POST /api/auth/refresh
```

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "access_token": "new_access_token...",
  "expires_in": 3600
}
```

#### 1.5 Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Successfully logged out"
}
```

#### 1.6 Health Check
```http
GET /health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2026-03-04T10:30:00Z"
}
```

#### 1.7 Metrics
```http
GET /metrics
```

**Response** (200 OK):
```json
{
  "requests_total": 1523,
  "requests_per_second": 12.5,
  "avg_response_time_ms": 45,
  "active_connections": 25
}
```

---

## 2. Customer Service

**Base URL**: `http://localhost:8001` (internal) or via Gateway `/api/customers`

### 2.1 Register Customer
```http
POST /customers/register
```

**Request Body**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepass123",
  "full_name": "John Doe",
  "phone": "+84123456789"
}
```

**Response** (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "john_doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "phone": "+84123456789",
  "created_at": "2026-03-04T10:30:00Z"
}
```

### 2.2 Get Customer Profile
```http
GET /customers/{customer_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "john_doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "phone": "+84123456789",
  "created_at": "2026-03-04T10:30:00Z",
  "updated_at": "2026-03-04T11:00:00Z"
}
```

### 2.3 Update Customer Profile
```http
PUT /customers/{customer_id}
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "full_name": "John Updated Doe",
  "phone": "+84987654321"
}
```

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "john_doe",
  "email": "john@example.com",
  "full_name": "John Updated Doe",
  "phone": "+84987654321",
  "updated_at": "2026-03-04T12:00:00Z"
}
```

### 2.4 Add Customer Address
```http
POST /customers/{customer_id}/addresses
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "address_line": "123 Main Street, District 1",
  "city": "Ho Chi Minh City",
  "postal_code": "700000",
  "is_default": true
}
```

**Response** (201 Created):
```json
{
  "id": "addr-uuid",
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "address_line": "123 Main Street, District 1",
  "city": "Ho Chi Minh City",
  "postal_code": "700000",
  "is_default": true
}
```

### 2.5 Verify Credentials (Internal)
```http
POST /customers/verify-credentials
```

**Request Body**:
```json
{
  "username": "john_doe",
  "password": "securepass123"
}
```

**Response** (200 OK):
```json
{
  "valid": true,
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "role": "customer"
}
```

### 2.6 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 3. Book Service

**Base URL**: `http://localhost:8002` (internal) or via Gateway `/api/books`

### 3.1 List Books (with Pagination)
```http
GET /books?page=1&limit=20&sort=title
```

**Response** (200 OK):
```json
{
  "total": 150,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "id": 1,
      "isbn": "978-3-16-148410-0",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "publisher": "Prentice Hall",
      "publication_year": 2008,
      "price": 32.99,
      "stock_quantity": 50,
      "description": "A handbook of agile software craftsmanship",
      "cover_image_url": "https://example.com/covers/clean-code.jpg",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### 3.2 Get Book Details
```http
GET /books/{book_id}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "isbn": "978-3-16-148410-0",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "publisher": "Prentice Hall",
  "publication_year": 2008,
  "price": 32.99,
  "stock_quantity": 50,
  "description": "A handbook of agile software craftsmanship",
  "cover_image_url": "https://example.com/covers/clean-code.jpg",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-03-01T08:30:00Z"
}
```

### 3.3 Create Book (Admin Only)
```http
POST /books
Authorization: Bearer <admin_token>
```

**Request Body**:
```json
{
  "isbn": "978-3-16-148410-0",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "publisher": "Prentice Hall",
  "publication_year": 2008,
  "price": 32.99,
  "stock_quantity": 50,
  "description": "A handbook of agile software craftsmanship",
  "cover_image_url": "https://example.com/covers/clean-code.jpg"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "isbn": "978-3-16-148410-0",
  "title": "Clean Code",
  "created_at": "2026-03-04T10:00:00Z"
}
```

### 3.4 Update Book
```http
PUT /books/{book_id}
Authorization: Bearer <admin_token>
```

**Request Body**:
```json
{
  "price": 29.99,
  "stock_quantity": 75
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "price": 29.99,
  "stock_quantity": 75,
  "updated_at": "2026-03-04T11:00:00Z"
}
```

### 3.5 Delete Book
```http
DELETE /books/{book_id}
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
  "message": "Book deleted successfully"
}
```

### 3.6 Search Books
```http
GET /books/search?q=clean+code&author=martin
```

**Response** (200 OK):
```json
{
  "total": 3,
  "data": [
    {
      "id": 1,
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "price": 32.99
    }
  ]
}
```

### 3.7 Update Stock (Internal)
```http
PUT /books/{book_id}/stock
```

**Request Body**:
```json
{
  "quantity": 45
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "stock_quantity": 45
}
```

### 3.8 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 4. Cart Service

**Base URL**: `http://localhost:8003` (internal) or via Gateway `/api/carts`

### 4.1 Get Customer Cart
```http
GET /carts/{customer_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "cart_id": 123,
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "items": [
    {
      "id": 1,
      "book_id": 1,
      "title": "Clean Code",
      "price": 32.99,
      "quantity": 2,
      "subtotal": 65.98,
      "added_at": "2026-03-04T10:00:00Z"
    }
  ],
  "total_items": 2,
  "total_amount": 65.98,
  "updated_at": "2026-03-04T10:30:00Z"
}
```

### 4.2 Add Item to Cart
```http
POST /carts/{customer_id}/items
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "book_id": 1,
  "quantity": 2
}
```

**Response** (201 Created):
```json
{
  "item_id": 1,
  "book_id": 1,
  "quantity": 2,
  "added_at": "2026-03-04T10:00:00Z"
}
```

### 4.3 Update Cart Item Quantity
```http
PUT /carts/{customer_id}/items/{item_id}
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "quantity": 5
}
```

**Response** (200 OK):
```json
{
  "item_id": 1,
  "quantity": 5,
  "updated_at": "2026-03-04T10:30:00Z"
}
```

### 4.4 Remove Item from Cart
```http
DELETE /carts/{customer_id}/items/{item_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Item removed from cart"
}
```

### 4.5 Clear Cart
```http
DELETE /carts/{customer_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Cart cleared successfully"
}
```

### 4.6 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 5. Staff Service

**Base URL**: `http://localhost:8004` (internal) or via Gateway `/api/staff`

### 5.1 Register Staff
```http
POST /staff/register
Authorization: Bearer <manager_token>
```

**Request Body**:
```json
{
  "username": "staff_john",
  "email": "staff.john@bookstore.com",
  "password": "staffpass123",
  "full_name": "John Staff",
  "role": "sales",
  "hired_date": "2026-03-01"
}
```

**Response** (201 Created):
```json
{
  "id": "staff-uuid",
  "username": "staff_john",
  "email": "staff.john@bookstore.com",
  "full_name": "John Staff",
  "role": "sales",
  "is_active": true,
  "hired_date": "2026-03-01",
  "created_at": "2026-03-04T10:00:00Z"
}
```

### 5.2 Get Staff Profile
```http
GET /staff/{staff_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "staff-uuid",
  "username": "staff_john",
  "email": "staff.john@bookstore.com",
  "full_name": "John Staff",
  "role": "sales",
  "is_active": true,
  "hired_date": "2026-03-01"
}
```

### 5.3 Update Staff
```http
PUT /staff/{staff_id}
Authorization: Bearer <manager_token>
```

**Request Body**:
```json
{
  "role": "support",
  "is_active": false
}
```

**Response** (200 OK):
```json
{
  "id": "staff-uuid",
  "role": "support",
  "is_active": false,
  "updated_at": "2026-03-04T11:00:00Z"
}
```

### 5.4 Get Staff Activities
```http
GET /staff/{staff_id}/activities?limit=10
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "staff_id": "staff-uuid",
  "activities": [
    {
      "id": "activity-uuid",
      "activity_type": "order_processing",
      "description": "Processed order #12345",
      "timestamp": "2026-03-04T10:30:00Z"
    }
  ]
}
```

### 5.5 Verify Credentials (Internal)
```http
POST /staff/verify-credentials
```

**Request Body**:
```json
{
  "username": "staff_john",
  "password": "staffpass123"
}
```

**Response** (200 OK):
```json
{
  "valid": true,
  "user_id": "staff-uuid",
  "role": "staff"
}
```

### 5.6 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 6. Manager Service

**Base URL**: `http://localhost:8005` (internal) or via Gateway `/api/managers`

### 6.1 Register Manager
```http
POST /managers/register
Authorization: Bearer <super_admin_token>
```

**Request Body**:
```json
{
  "username": "manager_alice",
  "email": "alice.manager@bookstore.com",
  "password": "managerpass123",
  "full_name": "Alice Manager",
  "department": "Operations"
}
```

**Response** (201 Created):
```json
{
  "id": "manager-uuid",
  "username": "manager_alice",
  "email": "alice.manager@bookstore.com",
  "full_name": "Alice Manager",
  "department": "Operations",
  "is_active": true,
  "created_at": "2026-03-04T10:00:00Z"
}
```

### 6.2 Get Dashboard
```http
GET /managers/dashboard
Authorization: Bearer <manager_token>
```

**Response** (200 OK):
```json
{
  "total_sales_today": 15000.00,
  "total_orders_today": 45,
  "active_customers": 1250,
  "low_stock_items": 12,
  "pending_orders": 8,
  "revenue_this_month": 450000.00
}
```

### 6.3 Sales Report
```http
GET /managers/reports/sales?start_date=2026-03-01&end_date=2026-03-04
Authorization: Bearer <manager_token>
```

**Response** (200 OK):
```json
{
  "report_type": "sales",
  "period_start": "2026-03-01",
  "period_end": "2026-03-04",
  "total_revenue": 125000.00,
  "total_orders": 350,
  "average_order_value": 357.14,
  "top_selling_books": [
    {
      "book_id": 1,
      "title": "Clean Code",
      "units_sold": 45,
      "revenue": 1484.55
    }
  ]
}
```

### 6.4 Inventory Report
```http
GET /managers/reports/inventory
Authorization: Bearer <manager_token>
```

**Response** (200 OK):
```json
{
  "report_type": "inventory",
  "total_books": 500,
  "total_value": 25000.00,
  "low_stock_items": [
    {
      "book_id": 5,
      "title": "Design Patterns",
      "stock_quantity": 3,
      "reorder_level": 10
    }
  ]
}
```

### 6.5 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 7. Catalog Service

**Base URL**: `http://localhost:8006` (internal) or via Gateway `/api/catalog`

### 7.1 List Categories
```http
GET /categories
```

**Response** (200 OK):
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Programming",
      "description": "Programming and software development books",
      "parent_id": null,
      "book_count": 150
    },
    {
      "id": 2,
      "name": "Web Development",
      "description": "Web development books",
      "parent_id": 1,
      "book_count": 45
    }
  ]
}
```

### 7.2 Create Category
```http
POST /categories
Authorization: Bearer <admin_token>
```

**Request Body**:
```json
{
  "name": "Machine Learning",
  "description": "AI and ML books",
  "parent_id": null
}
```

**Response** (201 Created):
```json
{
  "id": 10,
  "name": "Machine Learning",
  "description": "AI and ML books",
  "parent_id": null,
  "created_at": "2026-03-04T10:00:00Z"
}
```

### 7.3 List Genres
```http
GET /genres
```

**Response** (200 OK):
```json
{
  "genres": [
    {
      "id": 1,
      "name": "Technical",
      "description": "Technical and educational books"
    },
    {
      "id": 2,
      "name": "Fiction",
      "description": "Fiction and novels"
    }
  ]
}
```

### 7.4 Assign Category to Book
```http
POST /books/{book_id}/categories
Authorization: Bearer <admin_token>
```

**Request Body**:
```json
{
  "category_id": 1
}
```

**Response** (201 Created):
```json
{
  "book_id": 1,
  "category_id": 1,
  "assigned_at": "2026-03-04T10:00:00Z"
}
```

### 7.5 Get Books in Category
```http
GET /categories/{category_id}/books?page=1&limit=20
```

**Response** (200 OK):
```json
{
  "category_id": 1,
  "category_name": "Programming",
  "total": 150,
  "page": 1,
  "books": [
    {
      "book_id": 1,
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "price": 32.99
    }
  ]
}
```

### 7.6 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 8. Recommender AI Service

**Base URL**: `http://localhost:8007` (internal) or via Gateway `/api/recommendations`

### 8.1 Personalized Recommendations
```http
GET /recommendations/{customer_id}?limit=10
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "recommendations": [
    {
      "book_id": 5,
      "title": "Design Patterns",
      "author": "Gang of Four",
      "price": 45.99,
      "score": 0.92,
      "reason": "Based on your purchase history"
    },
    {
      "book_id": 8,
      "title": "Refactoring",
      "author": "Martin Fowler",
      "price": 38.50,
      "score": 0.88,
      "reason": "Similar to books you liked"
    }
  ]
}
```

### 8.2 Similar Books
```http
GET /recommendations/similar/{book_id}?limit=5
```

**Response** (200 OK):
```json
{
  "book_id": 1,
  "similar_books": [
    {
      "book_id": 2,
      "title": "The Pragmatic Programmer",
      "author": "Hunt & Thomas",
      "price": 35.99,
      "similarity_score": 0.85
    }
  ]
}
```

### 8.3 Trending Books
```http
GET /recommendations/trending?limit=10&period=week
```

**Response** (200 OK):
```json
{
  "period": "week",
  "trending_books": [
    {
      "book_id": 1,
      "title": "Clean Code",
      "views": 1250,
      "purchases": 85,
      "trend_score": 0.95
    }
  ]
}
```

### 8.4 Track User Interaction
```http
POST /recommendations/track
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "book_id": 1,
  "interaction_type": "view"
}
```

**Response** (201 Created):
```json
{
  "message": "Interaction tracked successfully"
}
```

### 8.5 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 9. Order Service (Spring Boot)

**Base URL**: `http://localhost:9001` (internal) or via Gateway `/api/orders`

### 9.1 Create Order
```http
POST /orders
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "shipping_address_id": "addr-uuid",
  "payment_method": "credit_card"
}
```

**Response** (201 Created):
```json
{
  "order_id": "order-uuid",
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "order_status": "pending",
  "items": [
    {
      "book_id": 1,
      "title": "Clean Code",
      "quantity": 2,
      "unit_price": 32.99,
      "subtotal": 65.98
    }
  ],
  "subtotal": 65.98,
  "shipping_fee": 5.00,
  "total_amount": 70.98,
  "created_at": "2026-03-04T10:00:00Z"
}
```

### 9.2 Get Order Details
```http
GET /orders/{order_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "order_id": "order-uuid",
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "order_status": "confirmed",
  "items": [
    {
      "book_id": 1,
      "title": "Clean Code",
      "quantity": 2,
      "unit_price": 32.99,
      "subtotal": 65.98
    }
  ],
  "total_amount": 70.98,
  "payment_status": "paid",
  "shipment_status": "in_transit",
  "created_at": "2026-03-04T10:00:00Z",
  "updated_at": "2026-03-04T11:00:00Z"
}
```

### 9.3 Get Customer Orders
```http
GET /orders/customer/{customer_id}?page=1&limit=10
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "total": 15,
  "page": 1,
  "orders": [
    {
      "order_id": "order-uuid",
      "order_status": "delivered",
      "total_amount": 70.98,
      "created_at": "2026-03-04T10:00:00Z"
    }
  ]
}
```

### 9.4 Update Order Status
```http
PUT /orders/{order_id}/status
Authorization: Bearer <staff_token>
```

**Request Body**:
```json
{
  "status": "confirmed"
}
```

**Response** (200 OK):
```json
{
  "order_id": "order-uuid",
  "order_status": "confirmed",
  "updated_at": "2026-03-04T11:00:00Z"
}
```

### 9.5 Cancel Order
```http
DELETE /orders/{order_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Order cancelled successfully",
  "refund_initiated": true
}
```

### 9.6 Health & Metrics
```http
GET /health
GET /metrics
```

**Response** (200 OK):
```json
{
  "status": "UP",
  "service": "order-service",
  "database": {
    "status": "UP",
    "database": "PostgreSQL",
    "validationQuery": "isValid()"
  },
  "timestamp": "2026-03-04T10:30:00Z"
}
```

---

## 10. Pay Service (Spring Boot)

**Base URL**: `http://localhost:9002` (internal) or via Gateway `/api/payments`

### 10.1 Process Payment
```http
POST /payments
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "order_id": "order-uuid",
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 70.98,
  "payment_method": "credit_card",
  "payment_details": {
    "card_number": "4111111111111111",
    "expiry_month": "12",
    "expiry_year": "2027",
    "cvv": "123"
  }
}
```

**Response** (201 Created):
```json
{
  "payment_id": "payment-uuid",
  "order_id": "order-uuid",
  "amount": 70.98,
  "payment_status": "success",
  "transaction_id": "txn_1234567890",
  "payment_method": "credit_card",
  "processed_at": "2026-03-04T10:00:00Z"
}
```

### 10.2 Get Payment Details
```http
GET /payments/{payment_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "payment_id": "payment-uuid",
  "order_id": "order-uuid",
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 70.98,
  "payment_status": "success",
  "transaction_id": "txn_1234567890",
  "payment_method": "credit_card",
  "processed_at": "2026-03-04T10:00:00Z"
}
```

### 10.3 Get Payments for Order
```http
GET /payments/order/{order_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "order_id": "order-uuid",
  "payments": [
    {
      "payment_id": "payment-uuid",
      "amount": 70.98,
      "payment_status": "success",
      "processed_at": "2026-03-04T10:00:00Z"
    }
  ]
}
```

### 10.4 Process Refund
```http
POST /payments/{payment_id}/refund
Authorization: Bearer <staff_token>
```

**Request Body**:
```json
{
  "amount": 70.98,
  "reason": "Customer requested cancellation"
}
```

**Response** (200 OK):
```json
{
  "refund_id": "refund-uuid",
  "payment_id": "payment-uuid",
  "amount": 70.98,
  "refund_status": "success",
  "processed_at": "2026-03-04T11:00:00Z"
}
```

### 10.5 Payment History
```http
GET /payments/customer/{customer_id}?page=1&limit=10
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "total": 20,
  "payments": [
    {
      "payment_id": "payment-uuid",
      "order_id": "order-uuid",
      "amount": 70.98,
      "payment_status": "success",
      "processed_at": "2026-03-04T10:00:00Z"
    }
  ]
}
```

### 10.6 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 11. Ship Service (Spring Boot)

**Base URL**: `http://localhost:9003` (internal) or via Gateway `/api/shipments`

### 11.1 Create Shipment
```http
POST /shipments
Authorization: Bearer <staff_token>
```

**Request Body**:
```json
{
  "order_id": "order-uuid",
  "carrier": "DHL",
  "shipping_address": {
    "address_line": "123 Main Street, District 1",
    "city": "Ho Chi Minh City",
    "postal_code": "700000"
  },
  "estimated_delivery": "2026-03-08"
}
```

**Response** (201 Created):
```json
{
  "shipment_id": "shipment-uuid",
  "order_id": "order-uuid",
  "tracking_number": "DHL1234567890",
  "carrier": "DHL",
  "shipping_status": "pending",
  "estimated_delivery": "2026-03-08",
  "created_at": "2026-03-04T10:00:00Z"
}
```

### 11.2 Get Shipment Details
```http
GET /shipments/{shipment_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "shipment_id": "shipment-uuid",
  "order_id": "order-uuid",
  "tracking_number": "DHL1234567890",
  "carrier": "DHL",
  "shipping_status": "in_transit",
  "shipping_address": "123 Main Street, District 1, Ho Chi Minh City",
  "estimated_delivery": "2026-03-08",
  "actual_delivery": null,
  "history": [
    {
      "status": "picked_up",
      "location": "Distribution Center",
      "timestamp": "2026-03-04T12:00:00Z"
    },
    {
      "status": "in_transit",
      "location": "En route to destination",
      "timestamp": "2026-03-05T08:00:00Z"
    }
  ]
}
```

### 11.3 Track Shipment
```http
GET /shipments/track/{tracking_number}
```

**Response** (200 OK):
```json
{
  "tracking_number": "DHL1234567890",
  "shipping_status": "in_transit",
  "current_location": "En route to destination",
  "estimated_delivery": "2026-03-08",
  "history": [
    {
      "status": "picked_up",
      "location": "Distribution Center",
      "timestamp": "2026-03-04T12:00:00Z"
    }
  ]
}
```

### 11.4 Update Shipment Status
```http
PUT /shipments/{shipment_id}/status
Authorization: Bearer <staff_token>
```

**Request Body**:
```json
{
  "status": "delivered",
  "location": "Customer address",
  "actual_delivery": "2026-03-07"
}
```

**Response** (200 OK):
```json
{
  "shipment_id": "shipment-uuid",
  "shipping_status": "delivered",
  "actual_delivery": "2026-03-07",
  "updated_at": "2026-03-07T14:30:00Z"
}
```

### 11.5 Get Shipment for Order
```http
GET /shipments/order/{order_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "order_id": "order-uuid",
  "shipment": {
    "shipment_id": "shipment-uuid",
    "tracking_number": "DHL1234567890",
    "shipping_status": "in_transit",
    "estimated_delivery": "2026-03-08"
  }
}
```

### 11.6 Health & Metrics
```http
GET /health
GET /metrics
```

---

## 12. Comment & Rate Service (Node.js)

**Base URL**: `http://localhost:3001` (internal) or via Gateway `/api/reviews`

### 12.1 Create Review
```http
POST /reviews
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "book_id": 1,
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "rating": 5,
  "comment": "Excellent book! Highly recommended for software developers.",
  "is_verified_purchase": true
}
```

**Response** (201 Created):
```json
{
  "review_id": 1,
  "book_id": 1,
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "rating": 5,
  "comment": "Excellent book! Highly recommended for software developers.",
  "is_verified_purchase": true,
  "upvotes": 0,
  "downvotes": 0,
  "created_at": "2026-03-04T10:00:00Z"
}
```

### 12.2 Get Reviews for Book
```http
GET /reviews/book/{book_id}?page=1&limit=10&sort=helpful
```

**Response** (200 OK):
```json
{
  "book_id": 1,
  "total": 45,
  "average_rating": 4.5,
  "page": 1,
  "reviews": [
    {
      "review_id": 1,
      "customer_id": "123e4567-e89b-12d3-a456-426614174000",
      "customer_name": "John Doe",
      "rating": 5,
      "comment": "Excellent book!",
      "is_verified_purchase": true,
      "upvotes": 25,
      "downvotes": 2,
      "created_at": "2026-03-04T10:00:00Z"
    }
  ]
}
```

### 12.3 Update Review
```http
PUT /reviews/{review_id}
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "rating": 4,
  "comment": "Good book, but could be more concise."
}
```

**Response** (200 OK):
```json
{
  "review_id": 1,
  "rating": 4,
  "comment": "Good book, but could be more concise.",
  "updated_at": "2026-03-04T11:00:00Z"
}
```

### 12.4 Delete Review
```http
DELETE /reviews/{review_id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Review deleted successfully"
}
```

### 12.5 Upvote Review
```http
POST /reviews/{review_id}/upvote
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "review_id": 1,
  "upvotes": 26,
  "message": "Review upvoted successfully"
}
```

### 12.6 Get Average Rating
```http
GET /reviews/book/{book_id}/average
```

**Response** (200 OK):
```json
{
  "book_id": 1,
  "average_rating": 4.5,
  "total_reviews": 45,
  "rating_distribution": {
    "5": 25,
    "4": 15,
    "3": 3,
    "2": 1,
    "1": 1
  }
}
```

### 12.7 Add Reply to Review
```http
POST /reviews/{review_id}/replies
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "customer_id": "another-customer-uuid",
  "comment": "I agree! This book changed my coding style."
}
```

**Response** (201 Created):
```json
{
  "reply_id": 1,
  "review_id": 1,
  "customer_id": "another-customer-uuid",
  "comment": "I agree! This book changed my coding style.",
  "created_at": "2026-03-04T10:30:00Z"
}
```

### 12.8 Health & Metrics
```http
GET /health
GET /metrics
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "comment-rate-service",
  "database": "connected",
  "timestamp": "2026-03-04T10:30:00Z"
}
```

---

## API Gateway Routing Table

| Client Request | Forwarded To | Service |
|---------------|--------------|---------|
| `/api/auth/*` | Internal | api-gateway |
| `/api/customers/*` | `http://customer-service:8001/*` | customer-service |
| `/api/books/*` | `http://book-service:8002/*` | book-service |
| `/api/carts/*` | `http://cart-service:8003/*` | cart-service |
| `/api/staff/*` | `http://staff-service:8004/*` | staff-service |
| `/api/managers/*` | `http://manager-service:8005/*` | manager-service |
| `/api/catalog/*` | `http://catalog-service:8006/*` | catalog-service |
| `/api/recommendations/*` | `http://recommender-ai-service:8007/*` | recommender-ai-service |
| `/api/orders/*` | `http://order-service:9001/*` | order-service |
| `/api/payments/*` | `http://pay-service:9002/*` | pay-service |
| `/api/shipments/*` | `http://ship-service:9003/*` | ship-service |
| `/api/reviews/*` | `http://comment-rate-service:3001/*` | comment-rate-service |

---

**Version**: 1.0  
**Last Updated**: March 4, 2026  
**Status**: API Design Complete

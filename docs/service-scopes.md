# Service Scopes & Bounded Contexts

## Định Nghĩa Phạm Vi và Giới Hạn Nghiệp Vụ Từng Service

Tài liệu này định nghĩa rõ ràng **Bounded Context** (Bối cảnh giới hạn) của từng microservice trong hệ thống BookStore, đảm bảo không có sự chồng chéo nghiệp vụ và mỗi service có trách nhiệm rõ ràng.

---

## 1. API Gateway Service

### Bounded Context
**Định tuyến và Xác thực Trung tâm**

### Core Responsibilities
- ✅ Nhận và định tuyến tất cả requests từ client
- ✅ Xác thực JWT tokens (issue, validate, refresh)
- ✅ Load balancing đến các services backend
- ✅ Rate limiting và throttling
- ✅ Request/Response logging
- ✅ CORS handling

### What It Does NOT Do
- ❌ KHÔNG lưu trữ business logic
- ❌ KHÔNG có database riêng
- ❌ KHÔNG xử lý nghiệp vụ cụ thể của domain

### Key Endpoints
- `POST /api/auth/login` - Đăng nhập và tạo JWT
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Hủy token
- `GET /api/*` - Forward requests to services

### Dependencies
- Gọi `customer-service` để validate credentials
- Gọi `staff-service` để validate staff credentials
- Gọi `manager-service` để validate manager credentials

---

## 2. Customer Service

### Bounded Context
**Quản Lý Thông Tin Khách Hàng**

### Core Responsibilities
- ✅ Đăng ký tài khoản khách hàng mới
- ✅ Quản lý profile khách hàng (CRUD)
- ✅ Xác thực credentials (username/password hashing)
- ✅ Quản lý địa chỉ giao hàng của khách hàng
- ✅ Lịch sử hoạt động của khách hàng (login history)
- ✅ Customer preferences và settings

### What It Does NOT Do
- ❌ KHÔNG quản lý giỏ hàng (đó là cart-service)
- ❌ KHÔNG xử lý đơn hàng (đó là order-service)
- ❌ KHÔNG quản lý thanh toán (đó là pay-service)

### Database Schema (PostgreSQL)
```sql
Customer {
  id: UUID (PK)
  username: VARCHAR UNIQUE
  email: VARCHAR UNIQUE
  password_hash: VARCHAR
  full_name: VARCHAR
  phone: VARCHAR
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

CustomerAddress {
  id: UUID (PK)
  customer_id: UUID (FK)
  address_line: TEXT
  city: VARCHAR
  postal_code: VARCHAR
  is_default: BOOLEAN
}
```

### Key Endpoints
- `POST /customers/register`
- `GET /customers/{id}`
- `PUT /customers/{id}`
- `POST /customers/verify-credentials`

---

## 3. Book Service

### Bounded Context
**Quản Lý Sách và Kho**

### Core Responsibilities
- ✅ CRUD operations cho sách
- ✅ Quản lý thông tin chi tiết sách (title, author, ISBN, price, description)
- ✅ Quản lý số lượng tồn kho (inventory)
- ✅ Tìm kiếm sách (search by title, author, ISBN)
- ✅ Cập nhật giá sách

### What It Does NOT Do
- ❌ KHÔNG quản lý danh mục/thể loại (đó là catalog-service)
- ❌ KHÔNG quản lý đánh giá/bình luận (đó là comment-rate-service)
- ❌ KHÔNG đề xuất sách (đó là recommender-ai-service)

### Database Schema (MySQL)
```sql
Book {
  id: BIGINT (PK, AUTO_INCREMENT)
  isbn: VARCHAR UNIQUE
  title: VARCHAR
  author: VARCHAR
  publisher: VARCHAR
  publication_year: INT
  price: DECIMAL(10,2)
  stock_quantity: INT
  description: TEXT
  cover_image_url: VARCHAR
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Key Endpoints
- `GET /books` - List all books (with pagination)
- `GET /books/{id}` - Get book details
- `POST /books` - Create new book (admin only)
- `PUT /books/{id}` - Update book
- `DELETE /books/{id}` - Delete book
- `GET /books/search?q={query}` - Search books
- `PUT /books/{id}/stock` - Update stock quantity

---

## 4. Cart Service

### Bounded Context
**Quản Lý Giỏ Hàng**

### Core Responsibilities
- ✅ Thêm sách vào giỏ hàng
- ✅ Xóa sách khỏi giỏ hàng
- ✅ Cập nhật số lượng sách trong giỏ
- ✅ Tính tổng giá trị giỏ hàng
- ✅ Lấy danh sách items trong giỏ
- ✅ Xóa toàn bộ giỏ hàng (clear cart)

### What It Does NOT Do
- ❌ KHÔNG xử lý thanh toán (đó là pay-service)
- ❌ KHÔNG tạo đơn hàng (đó là order-service)
- ❌ KHÔNG lưu trữ thông tin chi tiết sách (chỉ lưu book_id và quantity)

### Database Schema (MySQL)
```sql
Cart {
  id: BIGINT (PK, AUTO_INCREMENT)
  customer_id: VARCHAR (indexed)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

CartItem {
  id: BIGINT (PK, AUTO_INCREMENT)
  cart_id: BIGINT (FK)
  book_id: BIGINT
  quantity: INT
  added_at: TIMESTAMP
}
```

### Key Endpoints
- `GET /carts/{customer_id}` - Get customer's cart
- `POST /carts/{customer_id}/items` - Add item to cart
- `PUT /carts/{customer_id}/items/{item_id}` - Update quantity
- `DELETE /carts/{customer_id}/items/{item_id}` - Remove item
- `DELETE /carts/{customer_id}` - Clear cart

### Dependencies
- Gọi `book-service` để verify book existence và lấy price

---

## 5. Staff Service

### Bounded Context
**Quản Lý Nhân Viên**

### Core Responsibilities
- ✅ Đăng ký và quản lý tài khoản nhân viên
- ✅ Phân quyền cho nhân viên (roles: sales, support, warehouse)
- ✅ Xác thực credentials nhân viên
- ✅ Theo dõi hoạt động của nhân viên
- ✅ Quản lý shifts và schedules

### What It Does NOT Do
- ❌ KHÔNG quản lý managers (đó là manager-service)
- ❌ KHÔNG tạo báo cáo thống kê cấp cao
- ❌ KHÔNG quản lý đơn hàng trực tiếp

### Database Schema (PostgreSQL)
```sql
Staff {
  id: UUID (PK)
  username: VARCHAR UNIQUE
  email: VARCHAR UNIQUE
  password_hash: VARCHAR
  full_name: VARCHAR
  role: ENUM('sales', 'support', 'warehouse')
  is_active: BOOLEAN
  hired_date: DATE
  created_at: TIMESTAMP
}

StaffActivity {
  id: UUID (PK)
  staff_id: UUID (FK)
  activity_type: VARCHAR
  description: TEXT
  timestamp: TIMESTAMP
}
```

### Key Endpoints
- `POST /staff/register`
- `GET /staff/{id}`
- `PUT /staff/{id}`
- `GET /staff/{id}/activities`
- `POST /staff/verify-credentials`

---

## 6. Manager Service

### Bounded Context
**Quản Lý Cấp Cao và Báo Cáo**

### Core Responsibilities
- ✅ Đăng ký và quản lý tài khoản managers
- ✅ Tạo báo cáo thống kê (sales, revenue, inventory)
- ✅ Dashboard analytics
- ✅ Quản lý KPIs
- ✅ Phê duyệt các quyết định quan trọng

### What It Does NOT Do
- ❌ KHÔNG quản lý nhân viên thường (đó là staff-service)
- ❌ KHÔNG xử lý nghiệp vụ cụ thể (order, payment, shipping)

### Database Schema (PostgreSQL)
```sql
Manager {
  id: UUID (PK)
  username: VARCHAR UNIQUE
  email: VARCHAR UNIQUE
  password_hash: VARCHAR
  full_name: VARCHAR
  department: VARCHAR
  is_active: BOOLEAN
  created_at: TIMESTAMP
}

Report {
  id: UUID (PK)
  manager_id: UUID (FK)
  report_type: VARCHAR
  data: JSONB
  period_start: DATE
  period_end: DATE
  created_at: TIMESTAMP
}
```

### Key Endpoints
- `POST /managers/register`
- `GET /managers/{id}`
- `GET /managers/reports/sales`
- `GET /managers/reports/inventory`
- `GET /managers/dashboard`

### Dependencies
- Gọi `order-service` để lấy dữ liệu đơn hàng
- Gọi `book-service` để lấy dữ liệu kho
- Gọi `pay-service` để lấy dữ liệu doanh thu

---

## 7. Catalog Service

### Bounded Context
**Quản Lý Danh Mục và Phân Loại**

### Core Responsibilities
- ✅ CRUD operations cho categories
- ✅ CRUD operations cho genres/tags
- ✅ Mapping sách với categories/genres
- ✅ Hierarchical categories (parent-child)
- ✅ Browse books by category

### What It Does NOT Do
- ❌ KHÔNG lưu trữ thông tin chi tiết sách (chỉ lưu mapping)
- ❌ KHÔNG quản lý inventory

### Database Schema (MySQL)
```sql
Category {
  id: BIGINT (PK, AUTO_INCREMENT)
  name: VARCHAR UNIQUE
  description: TEXT
  parent_id: BIGINT (FK, nullable)
  created_at: TIMESTAMP
}

Genre {
  id: BIGINT (PK, AUTO_INCREMENT)
  name: VARCHAR UNIQUE
  description: TEXT
}

BookCategory {
  book_id: BIGINT
  category_id: BIGINT
  PRIMARY KEY (book_id, category_id)
}

BookGenre {
  book_id: BIGINT
  genre_id: BIGINT
  PRIMARY KEY (book_id, genre_id)
}
```

### Key Endpoints
- `GET /categories` - List all categories
- `POST /categories` - Create category
- `GET /genres` - List all genres
- `POST /genres` - Create genre
- `POST /books/{book_id}/categories` - Assign category
- `GET /categories/{id}/books` - Get books in category

---

## 8. Recommender AI Service

### Bounded Context
**Gợi Ý Thông Minh**

### Core Responsibilities
- ✅ Gợi ý sách dựa trên lịch sử mua hàng
- ✅ Gợi ý sách tương tự (similar items)
- ✅ Collaborative filtering
- ✅ Content-based recommendations
- ✅ Trending books analysis

### What It Does NOT Do
- ❌ KHÔNG quản lý sách
- ❌ KHÔNG quản lý đơn hàng (chỉ đọc dữ liệu)

### Database Schema (PostgreSQL)
```sql
Recommendation {
  id: UUID (PK)
  customer_id: VARCHAR
  book_id: BIGINT
  score: FLOAT
  algorithm: VARCHAR
  created_at: TIMESTAMP
}

CustomerInteraction {
  id: UUID (PK)
  customer_id: VARCHAR
  book_id: BIGINT
  interaction_type: ENUM('view', 'cart', 'purchase')
  timestamp: TIMESTAMP
}
```

### Key Endpoints
- `GET /recommendations/{customer_id}` - Personalized recommendations
- `GET /recommendations/similar/{book_id}` - Similar books
- `GET /recommendations/trending` - Trending books
- `POST /recommendations/track` - Track user interaction

### Dependencies
- Gọi `book-service` để lấy book details
- Gọi `order-service` để lấy purchase history

---

## 9. Order Service (Spring Boot)

### Bounded Context
**Quản Lý Đơn Hàng**

### Core Responsibilities
- ✅ Tạo đơn hàng từ giỏ hàng
- ✅ Quản lý order lifecycle (pending → confirmed → shipped → delivered)
- ✅ Order history của khách hàng
- ✅ Cancel/refund orders
- ✅ Order tracking

### What It Does NOT Do
- ❌ KHÔNG xử lý thanh toán (đó là pay-service)
- ❌ KHÔNG xử lý vận chuyển (đó là ship-service)
- ❌ KHÔNG tính giá sách (lấy từ book-service)

### Database Schema (PostgreSQL)
```sql
Order {
  id: UUID (PK)
  customer_id: VARCHAR
  order_status: VARCHAR
  total_amount: DECIMAL(10,2)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

OrderItem {
  id: UUID (PK)
  order_id: UUID (FK)
  book_id: BIGINT
  quantity: INT
  unit_price: DECIMAL(10,2)
  subtotal: DECIMAL(10,2)
}
```

### Key Endpoints
- `POST /orders` - Create order from cart
- `GET /orders/{id}` - Get order details
- `GET /orders/customer/{customer_id}` - Get customer orders
- `PUT /orders/{id}/status` - Update order status
- `DELETE /orders/{id}` - Cancel order

### Dependencies
- Gọi `cart-service` để lấy cart items
- Gọi `book-service` để verify stock và prices
- Gọi `pay-service` để initiate payment
- Gọi `ship-service` để create shipment

---

## 10. Pay Service (Spring Boot)

### Bounded Context
**Xử Lý Thanh Toán**

### Core Responsibilities
- ✅ Xử lý payment transactions
- ✅ Tích hợp payment gateways (Stripe, PayPal simulation)
- ✅ Validate payment information
- ✅ Payment history và receipts
- ✅ Refund processing

### What It Does NOT Do
- ❌ KHÔNG tạo đơn hàng (đó là order-service)
- ❌ KHÔNG lưu trữ thông tin card thật (PCI compliance)

### Database Schema (PostgreSQL)
```sql
Payment {
  id: UUID (PK)
  order_id: UUID
  customer_id: VARCHAR
  amount: DECIMAL(10,2)
  payment_method: VARCHAR
  payment_status: VARCHAR
  transaction_id: VARCHAR
  created_at: TIMESTAMP
}

PaymentHistory {
  id: UUID (PK)
  payment_id: UUID (FK)
  status: VARCHAR
  message: TEXT
  timestamp: TIMESTAMP
}
```

### Key Endpoints
- `POST /payments` - Process payment
- `GET /payments/{id}` - Get payment details
- `GET /payments/order/{order_id}` - Get payments for order
- `POST /payments/{id}/refund` - Process refund
- `GET /payments/customer/{customer_id}` - Payment history

---

## 11. Ship Service (Spring Boot)

### Bounded Context
**Quản Lý Vận Chuyển**

### Core Responsibilities
- ✅ Tạo shipment từ order
- ✅ Tính phí vận chuyển
- ✅ Tracking shipment status
- ✅ Cập nhật delivery status
- ✅ Tích hợp với đối tác vận chuyển

### What It Does NOT Do
- ❌ KHÔNG quản lý đơn hàng (đó là order-service)
- ❌ KHÔNG xử lý thanh toán ship (đã tính trong order)

### Database Schema (PostgreSQL)
```sql
Shipment {
  id: UUID (PK)
  order_id: UUID
  tracking_number: VARCHAR UNIQUE
  carrier: VARCHAR
  shipping_address: TEXT
  shipping_status: VARCHAR
  estimated_delivery: DATE
  actual_delivery: DATE
  created_at: TIMESTAMP
}

ShipmentHistory {
  id: UUID (PK)
  shipment_id: UUID (FK)
  status: VARCHAR
  location: VARCHAR
  timestamp: TIMESTAMP
}
```

### Key Endpoints
- `POST /shipments` - Create shipment
- `GET /shipments/{id}` - Get shipment details
- `GET /shipments/track/{tracking_number}` - Track shipment
- `PUT /shipments/{id}/status` - Update status
- `GET /shipments/order/{order_id}` - Get shipment for order

---

## 12. Comment & Rate Service (Node.js)

### Bounded Context
**Đánh Giá và Bình Luận**

### Core Responsibilities
- ✅ Tạo, sửa, xóa reviews
- ✅ Rating sách (1-5 stars)
- ✅ Comment threads (replies)
- ✅ Upvote/downvote reviews
- ✅ Report inappropriate content
- ✅ Tính average rating cho sách

### What It Does NOT Do
- ❌ KHÔNG quản lý sách (chỉ lưu book_id)
- ❌ KHÔNG verify purchase (có thể review mà không cần mua)

### Database Schema (MySQL)
```sql
Review {
  id: BIGINT (PK, AUTO_INCREMENT)
  book_id: BIGINT (indexed)
  customer_id: VARCHAR (indexed)
  rating: INT (1-5)
  comment: TEXT
  is_verified_purchase: BOOLEAN
  upvotes: INT DEFAULT 0
  downvotes: INT DEFAULT 0
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

ReviewReply {
  id: BIGINT (PK, AUTO_INCREMENT)
  review_id: BIGINT (FK)
  customer_id: VARCHAR
  comment: TEXT
  created_at: TIMESTAMP
}
```

### Key Endpoints
- `POST /reviews` - Create review
- `GET /reviews/book/{book_id}` - Get reviews for book
- `PUT /reviews/{id}` - Update review
- `DELETE /reviews/{id}` - Delete review
- `POST /reviews/{id}/upvote` - Upvote review
- `GET /reviews/book/{book_id}/average` - Get average rating

---

## Inter-Service Communication Matrix

| Service | Calls To | Called By |
|---------|----------|-----------|
| api-gateway | All services | External clients |
| customer-service | - | api-gateway, order-service |
| book-service | - | cart-service, order-service, catalog-service |
| cart-service | book-service | api-gateway, order-service |
| staff-service | - | api-gateway |
| manager-service | order, book, pay | api-gateway |
| catalog-service | book-service | api-gateway |
| recommender-ai-service | book, order | api-gateway |
| order-service | cart, book, pay, ship | api-gateway, manager-service |
| pay-service | - | order-service, manager-service |
| ship-service | - | order-service |
| comment-rate-service | - | api-gateway |

---

**Version**: 1.0  
**Last Updated**: March 4, 2026  
**Status**: Bounded Context Defined

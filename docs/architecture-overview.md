# Kiến Trúc Tổng Quan - Polyglot Microservices Bookstore

## 1. Giới Thiệu
Hệ thống BookStore được xây dựng dựa trên kiến trúc **Microservices** với nguyên tắc cốt lõi: **Database Per Service Pattern**. Mỗi service sở hữu database riêng biệt, đảm bảo tính độc lập và khả năng mở rộng.

## 2. Tổng Quan Kiến Trúc

### 2.1 Nguyên Tắc Thiết Kế
- **API Gateway Pattern**: Điểm truy cập trung tâm cho tất cả client requests
- **Database Per Service**: Mỗi service có database riêng (PostgreSQL hoặc MySQL)
- **Polyglot Architecture**: Sử dụng đa ngôn ngữ/framework phù hợp với từng nghiệp vụ
- **JWT Authentication**: Xác thực tập trung tại API Gateway
- **Health Check & Metrics**: Observability cho tất cả services

### 2.2 Cấu Trúc Hệ Thống

```
Client (Web/Mobile)
        ↓
   API Gateway (Django DRF) - JWT Authentication
        ↓
   ┌────┴────┬────────┬────────┬─────────┐
   ↓         ↓        ↓        ↓         ↓
Python     Python   Java     Java     Node.js
Services   Services Services Services Service
```

## 3. Danh Sách 12 Microservices

### 3.1 Services Python (Django REST Framework)
| Service | Port | Database | Mô Tả |
|---------|------|----------|-------|
| **api-gateway** | 8000 | N/A | Định tuyến, xác thực JWT, load balancing |
| **customer-service** | 8001 | PostgreSQL | Quản lý thông tin khách hàng, đăng ký, đăng nhập |
| **book-service** | 8002 | MySQL | Quản lý sách, CRUD operations |
| **cart-service** | 8003 | MySQL | Giỏ hàng, thêm/xóa sản phẩm |
| **staff-service** | 8004 | PostgreSQL | Quản lý nhân viên, phân quyền nhân viên |
| **manager-service** | 8005 | PostgreSQL | Quản lý cấp cao, báo cáo, thống kê |
| **catalog-service** | 8006 | MySQL | Danh mục, phân loại sách theo thể loại |
| **recommender-ai-service** | 8007 | PostgreSQL | Gợi ý sách dựa trên AI/ML algorithms |

### 3.2 Services Java (Spring Boot)
| Service | Port | Database | Mô Tả |
|---------|------|----------|-------|
| **order-service** | 9001 | PostgreSQL | Xử lý đơn hàng, order lifecycle |
| **pay-service** | 9002 | PostgreSQL | Xử lý thanh toán, payment gateway integration |
| **ship-service** | 9003 | PostgreSQL | Quản lý vận chuyển, tracking |

### 3.3 Services Node.js (Express)
| Service | Port | Database | Mô Tả |
|---------|------|----------|-------|
| **comment-rate-service** | 3001 | MySQL | Đánh giá, bình luận sách |

## 4. Cơ Sở Dữ Liệu

### 4.1 PostgreSQL Instances
- **customer_db** (customer-service)
- **staff_db** (staff-service)
- **manager_db** (manager-service)
- **recommender_db** (recommender-ai-service)
- **order_db** (order-service)
- **payment_db** (pay-service)
- **shipment_db** (ship-service)

### 4.2 MySQL Instances
- **book_db** (book-service)
- **cart_db** (cart-service)
- **catalog_db** (catalog-service)
- **comment_db** (comment-rate-service)

## 5. Communication Patterns

### 5.1 Synchronous Communication (REST API)
- Client → API Gateway → Services
- Service-to-Service calls qua HTTP/REST khi cần

### 5.2 Authentication Flow
```
1. Client gửi credentials → API Gateway
2. API Gateway xác thực → Tạo JWT token
3. Client gửi request + JWT → API Gateway
4. API Gateway validate JWT → Forward to Service
5. Service xử lý → Response → API Gateway → Client
```

## 6. Cross-Cutting Concerns

### 6.1 Observability
**Health Check Endpoint** (`/health`):
```json
{
  "status": "healthy",
  "service": "book-service",
  "database": "connected",
  "timestamp": "2026-03-04T10:30:00Z"
}
```

**Metrics Endpoint** (`/metrics`):
```json
{
  "requests_total": 1523,
  "requests_per_second": 12.5,
  "avg_response_time_ms": 45,
  "database_connections": 10,
  "error_rate": 0.02
}
```

### 6.2 Configuration Management
- Environment variables cho sensitive data
- Docker Compose cho orchestration
- Shared configuration patterns

## 7. Deployment Strategy

### 7.1 Containerization
- Mỗi service có Dockerfile riêng
- Multi-stage builds cho optimization
- Health checks trong Docker Compose

### 7.2 Docker Compose Architecture
```yaml
services:
  # Databases
  - PostgreSQL containers (7 instances)
  - MySQL containers (4 instances)
  
  # Services
  - 8 Python services
  - 3 Java services
  - 1 Node.js service
  
  # Networking
  - Internal network cho service-to-service
  - External network cho client access
```

## 8. Scalability & Performance

### 8.1 Horizontal Scaling
- Mỗi service có thể scale độc lập
- Load balancing tại API Gateway
- Database connection pooling

### 8.2 Caching Strategy
- Redis cho session management (future)
- Application-level caching trong services
- Database query caching

## 9. Security Considerations

### 9.1 Authentication & Authorization
- JWT tokens với expiration
- Role-based access control (RBAC)
- API Gateway enforces security policies

### 9.2 Data Protection
- Encrypted connections (HTTPS)
- Database credentials trong environment variables
- Input validation tại mỗi service

## 10. Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **API Gateway** | Django REST Framework, JWT |
| **Backend Services** | Django DRF, Spring Boot, Express.js |
| **Databases** | PostgreSQL 14, MySQL 8 |
| **Containerization** | Docker, Docker Compose |
| **Languages** | Python 3.11, Java 17, Node.js 18 |

## 11. Development Principles

1. **Single Responsibility**: Mỗi service giải quyết một domain cụ thể
2. **Independent Deployment**: Deploy service riêng lẻ không ảnh hưởng toàn hệ thống
3. **Technology Freedom**: Chọn công nghệ phù hợp cho từng service
4. **Data Isolation**: Không truy cập trực tiếp database của service khác
5. **API Contract**: RESTful API standards cho mọi communication

## 12. Future Enhancements

- **Service Mesh**: Istio/Linkerd cho advanced networking
- **Message Queue**: RabbitMQ/Kafka cho async communication
- **Distributed Tracing**: Jaeger/Zipkin
- **Centralized Logging**: ELK Stack
- **API Documentation**: Swagger/OpenAPI cho tất cả services
- **CI/CD Pipeline**: GitHub Actions, Jenkins

---

**Version**: 1.0  
**Last Updated**: March 4, 2026  
**Status**: Initial Design Phase

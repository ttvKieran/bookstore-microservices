# Complete System Deployment Guide

Hướng dẫn triển khai đầy đủ hệ thống BookStore Microservices với 13 services (12 backend + 1 frontend).

## 📋 Prerequisites

### Required Software
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 20+ (chỉ cho development)
- **Java**: 17+ (chỉ cho development)
- **Python**: 3.9+ (chỉ cho development)

### System Requirements
- **RAM**: Tối thiểu 8GB (khuyến nghị 16GB)
- **Disk Space**: 10GB trống
- **OS**: Windows 10/11, macOS, hoặc Linux

## 🏗️ Architecture Overview

### 13 Services

**Backend Services (12):**
1. **API Gateway** - Django (Port 8000) - Điểm vào duy nhất
2. **Customer Service** - Django (Port 8001) - Quản lý khách hàng
3. **Staff Service** - Django (Port 8002) - Quản lý nhân viên
4. **Manager Service** - Django (Port 8003) - Quản lý quản lý viên
5. **Book Service** - Django (Port 8004) - Quản lý sách
6. **Cart Service** - Django (Port 8005) - Giỏ hàng
7. **Catalog Service** - Django (Port 8006) - Danh mục sản phẩm
8. **Recommender AI Service** - Django (Port 8007) - Gợi ý thông minh
9. **Order Service** - Spring Boot (Port 9001) - Quản lý đơn hàng
10. **Payment Service** - Spring Boot (Port 9002) - Thanh toán
11. **Shipment Service** - Spring Boot (Port 9003) - Vận chuyển
12. **Comment & Rate Service** - Node.js (Port 3001) - Đánh giá & bình luận

**Frontend Service (1):**
13. **Frontend Web** - React + Nginx (Port 3000) - Giao diện người dùng

### Databases
- **PostgreSQL**: 7 instances (Customer, Staff, Manager, Recommender, Order, Payment, Shipment)
- **MySQL**: 4 instances (Book, Cart, Catalog, Comment)

## 🚀 Quick Start (Docker Compose)

### 1. Clone Repository

```bash
cd "d:\Year4_Semester 2\KienTrucVaThietKePhanMem\Assignments\assignment5"
```

### 2. Start All Services

```bash
# Build và start tất cả services
docker-compose up -d --build
```

Lệnh này sẽ:
- Build 13 Docker images cho mỗi service
- Start 11 database containers
- Start 13 application containers
- Tạo network `bookstore-network` để kết nối các services

### 3. Verify Deployment

Kiểm tra tất cả containers đang chạy:

```bash
docker-compose ps
```

Expected output: 24 containers running (11 databases + 13 services)

### 4. Health Checks

```bash
# API Gateway
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000/health

# Book Service
curl http://localhost:8004/health

# Order Service
curl http://localhost:9001/actuator/health
```

### 5. Access Applications

- **Frontend Web UI**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (nếu có)

## 📦 Service-by-Service Deployment

### Frontend Web (Port 3000)

```bash
# Build only frontend
docker-compose build frontend-web

# Start frontend và dependencies
docker-compose up -d frontend-web
```

Configuration:
- **Dockerfile**: Multi-stage (Node build → Nginx serve)
- **Nginx**: Serves React SPA với client-side routing
- **Environment**: API Gateway URL baked into build
- **Dependencies**: api-gateway

### API Gateway (Port 8000)

```bash
docker-compose up -d api-gateway
```

Configuration:
- **Technology**: Django REST Framework
- **Role**: Điểm vào duy nhất, routing requests đến backend services
- **Dependencies**: Tất cả backend services

### Backend Services (Python/Django)

```bash
# Start individual service
docker-compose up -d customer-service
docker-compose up -d book-service
docker-compose up -d cart-service
...
```

Common Configuration:
- **Base Image**: python:3.9-slim
- **Entry Point**: entrypoint.sh (chạy migrations, collect static, start server)
- **Database**: Mỗi service có riêng database instance

### Backend Services (Java/Spring Boot)

```bash
docker-compose up -d order-service
docker-compose up -d pay-service
docker-compose up -d ship-service
```

Common Configuration:
- **Base Image**: maven:3.8-openjdk-17
- **Build**: Maven package
- **Database**: PostgreSQL
- **Health**: Spring Actuator

### Backend Services (Node.js)

```bash
docker-compose up -d comment-rate-service
```

Configuration:
- **Base Image**: node:18-alpine
- **Database**: MySQL
- **Package Manager**: npm

## 🔄 Database Initialization

### Auto Initialization

Tất cả databases được tự động khởi tạo khi start services:

1. **PostgreSQL databases**: Tạo qua environment variables
2. **MySQL databases**: Tạo qua init scripts trong `mysql-init/`
3. **Django migrations**: Chạy tự động qua entrypoint.sh
4. **Spring Boot migrations**: Chạy qua Flyway/Liquibase

### Manual Database Reset

Nếu cần reset databases:

```bash
# Stop all services
docker-compose down

# Remove volumes (XÓA TẤT CẢ DATA!)
docker-compose down -v

# Restart fresh
docker-compose up -d --build
```

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend-web
docker-compose logs -f api-gateway
docker-compose logs -f order-service

# Last 100 lines
docker-compose logs --tail=100 -f frontend-web
```

### Resource Usage

```bash
# Container stats (CPU, Memory, Network)
docker stats

# Specific containers
docker stats frontend-web api-gateway
```

## 🛠️ Development Workflow

### Local Development (Without Docker)

#### Frontend Development

```bash
cd frontend-web
npm install
npm run dev
# Opens at http://localhost:5173
```

#### Backend Development (Django)

```bash
cd customer-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

#### Backend Development (Spring Boot)

```bash
cd order-service
mvn spring-boot:run
```

### Hot Reload with Docker

Để enable hot reload trong Docker, mount source code:

```yaml
# docker-compose.override.yml
services:
  frontend-web:
    volumes:
      - ./frontend-web/src:/app/src
    command: npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.production)
```env
VITE_API_BASE_URL=http://localhost:8000
```

#### Django Services
```env
DEBUG=False
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=*
```

#### Spring Boot Services
```properties
spring.datasource.url=jdbc:postgresql://postgres-order:5432/order_db
spring.datasource.username=order_user
spring.datasource.password=order_pass
```

### Port Mapping

| Service | Container Port | Host Port |
|---------|----------------|-----------|
| Frontend Web | 80 | 3000 |
| API Gateway | 8000 | 8000 |
| Customer Service | 8000 | 8001 |
| Book Service | 8000 | 8004 |
| Order Service | 8080 | 9001 |
| Payment Service | 8080 | 9002 |
| Shipment Service | 8080 | 9003 |
| Comment Service | 3000 | 3001 |

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux

# Kill process
taskkill /PID <pid> /F        # Windows
kill -9 <pid>                 # macOS/Linux
```

#### 2. Database Connection Failed

```bash
# Check database health
docker-compose ps
docker-compose logs postgres-customer

# Restart database
docker-compose restart postgres-customer
```

#### 3. Build Failures

```bash
# Clean build
docker-compose down
docker system prune -a -f
docker-compose up -d --build --force-recreate
```

#### 4. Frontend Build Errors

```bash
# Clear npm cache
cd frontend-web
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 5. Out of Memory

Edit `docker-compose.yaml`:

```yaml
services:
  frontend-web:
    mem_limit: 1g
    mem_reservation: 512m
```

### Debug Mode

Enable debug mode cho services:

```bash
# Django services
docker-compose exec customer-service python manage.py shell

# Spring Boot services
docker-compose exec order-service /bin/bash

# Frontend
docker-compose exec frontend-web /bin/sh
```

## 🔒 Security Considerations

### Production Deployment

1. **Change Default Passwords**: Update tất cả database passwords
2. **Set SECRET_KEY**: Generate unique secret keys cho Django services
3. **Enable HTTPS**: Configure Nginx với SSL certificates
4. **Restrict CORS**: Configure CORS trong API Gateway
5. **Environment Variables**: Sử dụng Docker secrets cho sensitive data

### Example Production Configuration

```yaml
# docker-compose.prod.yml
services:
  api-gateway:
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - ALLOWED_HOSTS=yourdomain.com
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## 📈 Performance Optimization

### Database Tuning

```yaml
postgres-customer:
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### Frontend Optimization

- Nginx gzip compression (đã enable)
- Static asset caching (đã enable)
- CDN cho static files (optional)

### Service Scaling

Scale services horizontally:

```bash
docker-compose up -d --scale book-service=3
```

## 🔄 Backup & Restore

### Database Backup

```bash
# PostgreSQL backup
docker-compose exec postgres-customer pg_dump -U customer_user customer_db > backup_customer.sql

# MySQL backup
docker-compose exec mysql-book mysqldump -u book_user -pbook_pass book_db > backup_book.sql
```

### Database Restore

```bash
# PostgreSQL restore
docker-compose exec -T postgres-customer psql -U customer_user customer_db < backup_customer.sql

# MySQL restore
docker-compose exec -T mysql-book mysql -u book_user -pbook_pass book_db < backup_book.sql
```

## 📚 Additional Resources

- [Frontend Web README](./frontend-web/README.md)
- [API Design Documentation](./docs/api-design.md)
- [Architecture Overview](./docs/architecture-overview.md)
- [Service Scopes](./docs/service-scopes.md)

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Docker và Docker Compose installed
- [ ] Ports 3000, 8000-8007, 9001-9003, 3001 available
- [ ] Sufficient disk space (10GB)
- [ ] Sufficient RAM (8GB minimum)

### Deployment

- [ ] Clone repository
- [ ] Review docker-compose.yaml
- [ ] Run `docker-compose up -d --build`
- [ ] Verify all containers running
- [ ] Test health endpoints
- [ ] Access frontend at http://localhost:3000

### Post-Deployment

- [ ] Create test user accounts
- [ ] Test authentication flow
- [ ] Test book browsing
- [ ] Test cart operations
- [ ] Test order creation
- [ ] Monitor logs for errors

## 🎉 Success!

Nếu tất cả services đều running và health checks pass, hệ thống đã sẵn sàng sử dụng!

**Default Admin Access:**
- URL: http://localhost:8000/admin
- Username: admin (nếu được seed)
- Password: admin123 (nếu được seed)

**Frontend Access:**
- URL: http://localhost:3000
- Register new account hoặc login với test credentials

---

**Last Updated**: Phase 7 Complete  
**Total Services**: 13 (12 Backend + 1 Frontend)  
**Total Databases**: 11 instances

# Run Instructions - Polyglot Microservices BookStore

Hướng dẫn chi tiết cách build và chạy toàn bộ hệ thống BookStore với Docker Compose.

---

## Prerequisites (Yêu Cầu Hệ Thống)

### Phần Mềm Bắt Buộc
- **Docker Desktop**: Version 20.10 trở lên
  - Windows: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - macOS: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Linux: [Install Docker Engine](https://docs.docker.com/engine/install/)
- **Docker Compose**: Version 2.0 trở lên (thường đi kèm Docker Desktop)
- **Git**: Để clone repository

### Yêu Cầu Phần Cứng
- **RAM**: Tối thiểu 8GB (khuyến nghị 16GB)
- **Disk Space**: Tối thiểu 10GB trống
- **CPU**: 4 cores trở lên (khuyến nghị)

### Kiểm Tra Cài Đặt
```powershell
# Kiểm tra Docker version
docker --version
# Output: Docker version 24.0.0 hoặc cao hơn

# Kiểm tra Docker Compose
docker compose version
# Output: Docker Compose version v2.x.x

# Kiểm tra Docker đang chạy
docker ps
# Không có lỗi = Docker đang hoạt động
```

---

## Quick Start (Khởi Động Nhanh)

### Bước 1: Clone Repository
```powershell
cd "d:\Year4_Semester 2\KienTrucVaThietKePhanMem\Assignments"
cd assignment5
```

### Bước 2: Verify Project Structure
```powershell
# Kiểm tra cấu trúc thư mục
Get-ChildItem -Directory

# Bạn nên thấy các thư mục:
# - api-gateway/
# - customer-service/
# - book-service/
# - cart-service/
# - staff-service/
# - manager-service/
# - catalog-service/
# - recommender-ai-service/
# - order-service/
# - pay-service/
# - ship-service/
# - comment-rate-service/
# - docs/
```

### Bước 3: Start All Services
```powershell
# Build và start tất cả services
docker compose up --build -d

# Tùy chọn:
# --build : Build images trước khi start
# -d : Detached mode (chạy background)
```

### Bước 4: Verify Services
```powershell
# Kiểm tra trạng thái containers
docker compose ps

# Kiểm tra logs
docker compose logs -f api-gateway
```

### Bước 5: Access Services
- **API Gateway**: http://localhost:8000
- **Customer Service**: http://localhost:8001
- **Book Service**: http://localhost:8002
- **Cart Service**: http://localhost:8003
- **Staff Service**: http://localhost:8004
- **Manager Service**: http://localhost:8005
- **Catalog Service**: http://localhost:8006
- **Recommender AI Service**: http://localhost:8007
- **Order Service**: http://localhost:9001
- **Pay Service**: http://localhost:9002
- **Ship Service**: http://localhost:9003
- **Comment & Rate Service**: http://localhost:3001

---

## Docker Compose Commands

### Build Commands
```powershell
# Build tất cả services (không start)
docker compose build

# Build một service cụ thể
docker compose build book-service

# Rebuild without cache
docker compose build --no-cache

# Build parallel (nhanh hơn)
docker compose build --parallel
```

### Start/Stop Commands
```powershell
# Start tất cả services
docker compose up -d

# Start một service cụ thể
docker compose up -d book-service

# Stop tất cả services
docker compose stop

# Stop một service cụ thể
docker compose stop book-service

# Restart tất cả services
docker compose restart

# Restart một service cụ thể
docker compose restart book-service
```

### Remove Commands
```powershell
# Stop và remove containers
docker compose down

# Remove containers, networks, và volumes
docker compose down -v

# Remove containers, networks, volumes, và images
docker compose down -v --rmi all
```

### View Commands
```powershell
# Xem status tất cả services
docker compose ps

# Xem logs tất cả services
docker compose logs

# Xem logs một service cụ thể
docker compose logs book-service

# Follow logs realtime
docker compose logs -f api-gateway

# Xem logs với timestamp
docker compose logs -t

# Xem 100 dòng cuối
docker compose logs --tail=100
```

### Execute Commands
```powershell
# Execute command trong container
docker compose exec api-gateway bash

# Chạy Django migrations
docker compose exec book-service python manage.py migrate

# Tạo Django superuser
docker compose exec customer-service python manage.py createsuperuser

# Chạy tests
docker compose exec book-service python manage.py test
```

---

## Health Checks

### Check All Services Health
```powershell
# PowerShell script để check health tất cả services
$services = @(
    @{Name="API Gateway"; Port=8000},
    @{Name="Customer Service"; Port=8001},
    @{Name="Book Service"; Port=8002},
    @{Name="Cart Service"; Port=8003},
    @{Name="Staff Service"; Port=8004},
    @{Name="Manager Service"; Port=8005},
    @{Name="Catalog Service"; Port=8006},
    @{Name="Recommender AI"; Port=8007},
    @{Name="Order Service"; Port=9001},
    @{Name="Pay Service"; Port=9002},
    @{Name="Ship Service"; Port=9003},
    @{Name="Comment & Rate"; Port=3001}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($service.Port)/health" -TimeoutSec 5
        Write-Host "✓ $($service.Name) - HEALTHY" -ForegroundColor Green
    } catch {
        Write-Host "✗ $($service.Name) - UNHEALTHY" -ForegroundColor Red
    }
}
```

### Manual Health Check
```powershell
# Check individual service
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
# ... và các service khác
```

---

## Database Management

### PostgreSQL Databases

#### Access PostgreSQL Container
```powershell
# Customer database
docker compose exec postgres-customer psql -U customer_user -d customer_db

# Staff database
docker compose exec postgres-staff psql -U staff_user -d staff_db

# Manager database
docker compose exec postgres-manager psql -U manager_user -d manager_db

# Recommender database
docker compose exec postgres-recommender psql -U recommender_user -d recommender_db

# Order database
docker compose exec postgres-order psql -U order_user -d order_db

# Payment database
docker compose exec postgres-payment psql -U payment_user -d payment_db

# Shipment database
docker compose exec postgres-shipment psql -U shipment_user -d shipment_db
```

#### Common PostgreSQL Commands
```sql
-- List all tables
\dt

-- Describe table structure
\d table_name

-- List all databases
\l

-- List all users
\du

-- Exit psql
\q
```

### MySQL Databases

#### Access MySQL Container
```powershell
# Book database
docker compose exec mysql-book mysql -u book_user -pbook_pass -D book_db

# Cart database
docker compose exec mysql-cart mysql -u cart_user -pcart_pass -D cart_db

# Catalog database
docker compose exec mysql-catalog mysql -u catalog_user -pcatalog_pass -D catalog_db

# Comment database
docker compose exec mysql-comment mysql -u comment_user -pcomment_pass -D comment_db
```

#### Common MySQL Commands
```sql
-- List all tables
SHOW TABLES;

-- Describe table structure
DESCRIBE table_name;

-- List all databases
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

### Run Migrations

#### Django Services (Python)
```powershell
# Customer Service
docker compose exec customer-service python manage.py makemigrations
docker compose exec customer-service python manage.py migrate

# Book Service
docker compose exec book-service python manage.py makemigrations
docker compose exec book-service python manage.py migrate

# Cart Service
docker compose exec cart-service python manage.py makemigrations
docker compose exec cart-service python manage.py migrate

# Staff Service
docker compose exec staff-service python manage.py makemigrations
docker compose exec staff-service python manage.py migrate

# Manager Service
docker compose exec manager-service python manage.py makemigrations
docker compose exec manager-service python manage.py migrate

# Catalog Service
docker compose exec catalog-service python manage.py makemigrations
docker compose exec catalog-service python manage.py migrate

# Recommender AI Service
docker compose exec recommender-ai-service python manage.py makemigrations
docker compose exec recommender-ai-service python manage.py migrate
```

#### Spring Boot Services (Java)
Spring Boot services sử dụng JPA/Hibernate auto DDL mode.
```powershell
# Restart service to apply schema changes
docker compose restart order-service
docker compose restart pay-service
docker compose restart ship-service
```

---

## Testing

### Test API Gateway
```powershell
# Health check
curl http://localhost:8000/health

# Metrics
curl http://localhost:8000/metrics

# Login endpoint (after implementation)
curl -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"testuser","password":"testpass"}'
```

### Test Individual Services
```powershell
# Book Service - List books
curl http://localhost:8002/books

# Customer Service - Health
curl http://localhost:8001/health

# Order Service - Health (Spring Boot)
curl http://localhost:9001/health

# Comment Service - Health (Node.js)
curl http://localhost:3001/health
```

### Load Sample Data
```powershell
# Create Django superuser for admin access
docker compose exec book-service python manage.py createsuperuser

# Access Django admin
# http://localhost:8002/admin
```

---

## Troubleshooting

### Issue: Port Already in Use
```powershell
# Tìm process sử dụng port
netstat -ano | findstr :8000

# Kill process (thay <PID> bằng process ID)
taskkill /PID <PID> /F
```

### Issue: Container Won't Start
```powershell
# Xem logs để tìm lỗi
docker compose logs <service-name>

# Xem logs với nhiều chi tiết
docker compose logs --tail=100 <service-name>

# Rebuild service
docker compose build --no-cache <service-name>
docker compose up -d <service-name>
```

### Issue: Database Connection Failed
```powershell
# Verify database container đang chạy
docker compose ps | findstr postgres
docker compose ps | findstr mysql

# Restart database container
docker compose restart postgres-customer

# Check database logs
docker compose logs postgres-customer
```

### Issue: Out of Memory
```powershell
# Stop tất cả containers
docker compose down

# Clean up unused resources
docker system prune -a --volumes

# Tăng Docker memory limit trong Docker Desktop settings
# Settings -> Resources -> Memory (increase to 8GB+)
```

### Issue: Permission Denied (Linux/macOS)
```bash
# Fix entrypoint script permissions
chmod +x api-gateway/entrypoint.sh
chmod +x customer-service/entrypoint.sh
chmod +x book-service/entrypoint.sh
# ... repeat for all services
```

---

## Monitoring

### View Resource Usage
```powershell
# View CPU, Memory usage của tất cả containers
docker stats

# View specific service
docker stats book-service
```

### View Network Traffic
```powershell
# List Docker networks
docker network ls

# Inspect bookstore network
docker network inspect assignment5_bookstore-network
```

### View Volumes
```powershell
# List all volumes
docker volume ls

# Inspect volume
docker volume inspect assignment5_postgres-customer-data
```

---

## Development Workflow

### Making Code Changes

#### For Django Services
```powershell
# 1. Edit code trong thư mục service
# 2. Rebuild service
docker compose build book-service

# 3. Restart service
docker compose restart book-service

# 4. View logs
docker compose logs -f book-service
```

#### For Spring Boot Services
```powershell
# 1. Edit code trong thư mục service
# 2. Rebuild service (Maven build inside container)
docker compose build order-service

# 3. Restart service
docker compose restart order-service

# 4. View logs
docker compose logs -f order-service
```

#### For Node.js Service
```powershell
# 1. Edit code trong thư mục service
# 2. Rebuild service
docker compose build comment-rate-service

# 3. Restart service
docker compose restart comment-rate-service

# 4. View logs
docker compose logs -f comment-rate-service
```

### Hot Reload (Development Mode)
Để enable hot reload, mount source code as volume trong docker-compose.yml:
```yaml
services:
  book-service:
    volumes:
      - ./book-service:/app
```

---

## Security Best Practices

### Environment Variables
```powershell
# Tạo .env file cho sensitive data
# NEVER commit .env to Git

# Example .env file:
# DB_PASSWORD=super_secure_password
# JWT_SECRET=your_jwt_secret_key
# STRIPE_API_KEY=sk_test_xxx
```

### Change Default Passwords
```yaml
# Trong docker-compose.yml, đổi default passwords:
environment:
  POSTGRES_PASSWORD: your_secure_password
  MYSQL_ROOT_PASSWORD: your_secure_password
```

---

## Production Deployment

### Build for Production
```powershell
# Build production images
docker compose -f docker-compose.prod.yml build

# Start production services
docker compose -f docker-compose.prod.yml up -d
```

### Backup Databases
```powershell
# Backup PostgreSQL
docker compose exec postgres-customer pg_dump -U customer_user customer_db > backup_customer.sql

# Backup MySQL
docker compose exec mysql-book mysqldump -u book_user -pbook_pass book_db > backup_book.sql
```

### Restore Databases
```powershell
# Restore PostgreSQL
cat backup_customer.sql | docker compose exec -T postgres-customer psql -U customer_user -d customer_db

# Restore MySQL
cat backup_book.sql | docker compose exec -T mysql-book mysql -u book_user -pbook_pass book_db
```

---

## Performance Optimization

### Scale Services
```powershell
# Scale book-service to 3 instances
docker compose up -d --scale book-service=3

# Verify
docker compose ps book-service
```

### Resource Limits
Add to docker-compose.yml:
```yaml
services:
  book-service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

---

## Common Commands Cheat Sheet

```powershell
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f

# Rebuild and restart
docker compose up -d --build

# Clean everything
docker compose down -v --rmi all

# Check status
docker compose ps

# Execute command in container
docker compose exec <service> <command>

# View resource usage
docker stats

# Health check all services
curl http://localhost:8000/health
```

---

## Getting Help

### Check Logs
```powershell
# Tất cả services
docker compose logs

# Service cụ thể
docker compose logs book-service

# Follow logs realtime
docker compose logs -f api-gateway
```

### Inspect Service
```powershell
# Inspect container
docker inspect <container_id>

# View environment variables
docker compose exec book-service env
```

### Debug Inside Container
```powershell
# Access shell
docker compose exec book-service bash

# Check Python version
docker compose exec book-service python --version

# Check installed packages
docker compose exec book-service pip list

# Check Java version
docker compose exec order-service java -version

# Check Node.js version
docker compose exec comment-rate-service node --version
```

---

## Next Steps

1. **Verify Installation**: Run health checks on all services
2. **Explore APIs**: Use Postman/curl to test endpoints
3. **Load Sample Data**: Create test users and books
4. **Test Workflows**: Try complete purchase flow
5. **Monitor Services**: Use `docker stats` and logs
6. **Read Documentation**: Check [api-design.md](api-design.md) for API specs

---

**Version**: 1.0  
**Last Updated**: March 4, 2026  
**Status**: Run Instructions Complete

## Support

- Check [architecture-overview.md](architecture-overview.md) for system design
- Check [service-scopes.md](service-scopes.md) for service responsibilities
- Check [api-design.md](api-design.md) for API specifications
- Check [architecture-diagrams.md](architecture-diagrams.md) for visual diagrams

# Bootstrap Guide - Initial Setup

Hướng dẫn khởi tạo dữ liệu ban đầu cho hệ thống BookStore Microservices.

## 🔐 Seed Data - Tài khoản mặc định

Khi chạy `docker-compose up`, hệ thống sẽ tự động tạo các tài khoản mặc định:

### 1️⃣ Manager Account (Admin)

Được tạo tự động qua `manager-service/app/management/commands/seed_manager.py`

```
Username: admin_manager
Email: admin@bookstore.com
Password: admin123456
Department: Administration
```

**⚠️ LƯU Ý:** Đổi mật khẩu sau khi đăng nhập lần đầu!

### 2️⃣ Test Customer Accounts

Được tạo tự động qua `customer-service/app/management/commands/seed_customers.py`

**Customer 1:**
```
Username: testuser
Email: test@bookstore.com
Password: testpass123
Full Name: Test User
```

**Customer 2:**
```
Username: john_doe
Email: john@bookstore.com
Password: john123456
Full Name: John Doe
```

## 🚀 Cách sử dụng

### Tự động (Khuyến nghị)

Seed data được chạy tự động trong `entrypoint.sh`:

```bash
# Khởi động tất cả services
docker-compose up -d

# Seed commands sẽ tự động chạy
```

### Thủ công (Nếu cần)

Nếu muốn chạy lại seed data:

```bash
# Manager seed
docker-compose exec manager-service python manage.py seed_manager

# Customer seed
docker-compose exec customer-service python manage.py seed_customers
```

## 📋 Workflow khởi tạo

### 1. Manager tạo Staff

Sau khi có manager account, login và tạo staff:

```bash
# Login as manager
POST http://localhost:8000/api/auth/login
{
  "username": "admin_manager",
  "password": "admin123456"
}

# Register staff (với manager token)
POST http://localhost:8000/api/staff/register/
{
  "username": "staff_john",
  "email": "staff@bookstore.com",
  "password": "staff123456",
  "full_name": "John Staff",
  "role": "sales",
  "hired_date": "2026-03-04"
}
```

### 2. Customer tự đăng ký

Customers có thể tự đăng ký qua frontend hoặc API:

```bash
POST http://localhost:8000/api/auth/register
{
  "username": "newcustomer",
  "email": "customer@example.com",
  "password": "password123",
  "full_name": "New Customer",
  "phone": "0123456789"
}
```

## 🔧 Manual Bootstrap (Không dùng seed script)

Nếu không muốn dùng tự động seed:

### Cách 1: API Call

```bash
# Tạo manager
curl -X POST http://localhost:8000/api/managers/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_manager",
    "email": "manager@example.com",
    "password": "your_password",
    "full_name": "Your Name",
    "department": "Administration"
  }'
```

### Cách 2: PowerShell

```powershell
$body = @{
    username = "your_manager"
    email = "manager@example.com"
    password = "your_password"
    full_name = "Your Name"
    department = "Administration"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/managers/register/" `
  -Method POST -Body $body -ContentType "application/json"
```

### Cách 3: Django Shell

```bash
docker-compose exec manager-service python manage.py shell

# Trong shell:
from django.contrib.auth.hashers import make_password
from app.models import Manager

Manager.objects.create(
    username='your_manager',
    email='manager@example.com',
    password_hash=make_password('your_password'),
    full_name='Your Name',
    department='Administration',
    is_active=True
)
```

## 🔒 Bảo mật

### ⚠️ Vấn đề hiện tại

Hiện tại các endpoint registration **KHÔNG có authentication**:
- `/api/managers/register/` - Ai cũng có thể tạo manager
- `/api/staff/register/` - Ai cũng có thể tạo staff
- `/api/auth/register` - Customer tự đăng ký (OK)

### ✅ Khuyến nghị Production

1. **Protect Manager Registration:**
   - Chỉ super admin mới được tạo manager
   - Hoặc disable endpoint sau khi bootstrap xong

2. **Protect Staff Registration:**
   - Yêu cầu manager token
   - Verify manager role trong API Gateway

3. **Seed Data:**
   - Chỉ chạy trong lần đầu
   - Không commit sensitive passwords vào git
   - Sử dụng environment variables

### 🔧 Fix bảo mật (TODO)

**manager-service/app/views.py:**
```python
@api_view(['POST'])
@permission_classes([IsManager])  # Add this
def register_manager(request):
    # Verify requester is super manager
    ...
```

**staff-service/app/views.py:**
```python
@api_view(['POST'])
@permission_classes([IsManager])  # Add this
def register_staff(request):
    # Verify manager token
    ...
```

## 📊 Kiểm tra

Sau khi bootstrap, verify:

```bash
# Check manager
curl http://localhost:8000/api/managers/

# Check customers
curl http://localhost:8000/api/customers/

# Login test
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'
```

## 🎓 Best Practices

1. **Development:**
   - Sử dụng seed scripts với test data
   - Commit seed scripts vào git
   - Document default credentials

2. **Production:**
   - Tạo manager account riêng
   - Xóa hoặc disable test accounts
   - Protect registration endpoints
   - Sử dụng strong passwords
   - Enable 2FA cho admin accounts

---

**Last Updated:** March 4, 2026  
**Status:** Seed scripts implemented for manager-service and customer-service

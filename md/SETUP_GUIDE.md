# Hướng dẫn cài đặt và chạy

## 1. Dừng và xóa các container cũ (nếu có)
```bash
docker-compose down -v
```

## 2. Build và khởi động tất cả services
```bash
docker-compose up --build
```

Chờ khoảng 30-60 giây để các database khởi động và các service kết nối thành công.

## 3. Kiểm tra trạng thái các containers
```bash
docker-compose ps
```

Tất cả services phải ở trạng thái "Up" hoặc "running".

## 4. Kiểm tra logs
```bash
# Xem logs của tất cả services
docker-compose logs

# Xem logs của một service cụ thể
docker-compose logs book-service
docker-compose logs cart-service
docker-compose logs customer-service
```

## 5. Kiểm tra kết nối database

### Kiểm tra MySQL cho Book Service
```bash
docker exec -it assignment5-mysql-book-1 mysql -uroot -proot123 -e "SHOW DATABASES;"
docker exec -it assignment5-mysql-book-1 mysql -uroot -proot123 bookdb -e "SHOW TABLES;"
```

### Kiểm tra MySQL cho Cart Service
```bash
docker exec -it assignment5-mysql-cart-1 mysql -uroot -proot123 -e "SHOW DATABASES;"
docker exec -it assignment5-mysql-cart-1 mysql -uroot -proot123 cartdb -e "SHOW TABLES;"
```

### Kiểm tra PostgreSQL (customer-service)
```bash
docker exec -it assignment5-postgres-1 psql -U postgres -d customerdb -c "\dt"
```

## 6. Test các API endpoints

### Test Book Service (MySQL)
```bash
# Tạo một quyển sách mới
curl -X POST http://localhost:8002/books/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Book", "author": "Test Author", "price": "29.99", "stock": 10}'

# Lấy danh sách sách
curl http://localhost:8002/books/
```

### Test Customer Service (PostgreSQL)
```bash
# Tạo một customer mới
curl -X POST http://localhost:8001/customers/ \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Lấy danh sách customers
curl http://localhost:8001/customers/
```

### Test Cart Service (MySQL)
```bash
# Tạo một cart mới (thay {customer_id} bằng ID thực tế)
curl -X POST http://localhost:8003/carts/ \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1}'
```

### Test API Gateway
```bash
# Truy cập trang web
http://localhost:8000/books/
```

## 7. Xác nhận hoạt động thành công

✅ Tất cả containers đang chạy (5 containers: 2 MySQL, 1 PostgreSQL, 3 services)
✅ MySQL "bookdb" có tables từ book-service
✅ MySQL "cartdb" có tables từ cart-service  
✅ PostgreSQL "customerdb" có tables từ customer-service
✅ Có thể tạo và đọc dữ liệu từ các APIs
✅ API Gateway có thể giao tiếp với các services

## 8. Dừng services
```bash
# Dừng nhưng giữ data
docker-compose stop

# Dừng và xóa volumes (mất hết data)
docker-compose down -v
```

## Cấu trúc Database (Tuân thủ nguyên tắc Microservices):

Mỗi service có database RIÊNG BIỆT:

- **MySQL Book Database (bookdb)**:
  - book-service tables: app_book
  
- **MySQL Cart Database (cartdb)**:
  - cart-service tables: app_cart, app_cartitem

- **PostgreSQL (customerdb)**:
  - customer-service tables: app_customer

## Thông tin kết nối:

### MySQL Book Service
- Host: localhost
- Port: 3306
- User: root
- Password: root123
- Database: bookdb

### MySQL Cart Service
- Host: localhost
- Port: 3307
- User: root
- Password: root123
- Database: cartdb

### PostgreSQL Customer Service
- Host: localhost
- Port: 5432
- User: postgres
- Password: postgres123
- Database: customerdb


# MASTER INSTRUCTION: POLYGLOT MICROSERVICES BOOKSTORE PROJECT

Bạn là một Chuyên gia Kiến trúc Phần mềm (Software Architect) và Lập trình viên Fullstack lão luyện. Nhiệm vụ của bạn là hỗ trợ tôi xây dựng một hệ thống BookStore dựa trên kiến trúc Microservices chuẩn công nghiệp

Chúng ta sẽ làm việc theo phương pháp Từng-bước-một (Step-by-step). TUYỆT ĐỐI KHÔNG tự động sinh ra toàn bộ mã nguồn ngay lập tức. Hãy đọc kỹ các ràng buộc kiến trúc dưới đây, sau đó tạo một bản kế hoạch TODO, và đợi lệnh của tôi để thực thi từng bước.

## 1. QUY MÔ DỰ ÁN VÀ STACK CÔNG NGHỆ (12 SERVICES)
Hệ thống bao gồm 12 services với nguyên tắc cốt lõi: Mỗi service sở hữu một Database riêng biệt, không dùng chung.

| STT | Tên Service | Trạng thái hiện tại | Ngôn ngữ / Framework | Cơ sở dữ liệu (Docker) |
|---|---|---|---|---|
| 1 | api-gateway | Đã có code basic | Python / Django DRF | Không dùng DB |
| 2 | customer-service | Đã có code basic | Python / Django DRF | PostgreSQL |
| 3 | book-service | Đã có code basic | Python / Django DRF | MySQL |
| 4 | cart-service | Đã có code basic | Python / Django DRF | MySQL |
| 5 | staff-service | Code mới | Python / Django DRF | PostgreSQL |
| 6 | manager-service | Code mới | Python / Django DRF | PostgreSQL |
| 7 | catalog-service | Code mới | Python / Django DRF | MySQL |
| 8 | recommender-ai-service| Code mới | Python / Django DRF | PostgreSQL |
| 9 | order-service | Code mới | Java / Spring Boot | PostgreSQL |
| 10 | pay-service | Code mới | Java / Spring Boot | PostgreSQL |
| 11 | ship-service | Code mới | Java / Spring Boot | PostgreSQL |
| 12 | comment-rate-service| Code mới | Node.js (Express)| MySQL |

## 2. RÀNG BUỘC KỸ THUẬT BẮT BUỘC (GLOBAL RULES)
- **API Gateway & Xác thực:** `api-gateway` phải đóng vai trò trung tâm định tuyến và quản lý xác thực. Sử dụng **JWT tokens** để cấp quyền và kiểm tra hợp lệ tại Gateway trước khi đẩy request xuống các service con.
- **Observability (Khả năng quan sát):** TẤT CẢ 12 services BẮT BUỘC phải triển khai 2 endpoints: `/health` (kiểm tra trạng thái service và kết nối DB) và `/metrics` (để thu thập dữ liệu hiệu suất).
- **Docker Compose:** Quản lý toàn bộ vòng đời (build, run) của 12 services và các databases (Postgres, MySQL) qua một file `docker-compose.yml` thống nhất.

## 3. QUY TRÌNH THỰC THI (TODO LIST PHASE)
Để đảm bảo chất lượng, chúng ta sẽ thực hiện dự án theo các Phase sau. 

**PHASE 1: DESIGN & DOCUMENTATION (BẮT BUỘC LÀM TRƯỚC KHI CODE)**
Trước khi đụng vào code, bạn phải tạo thư mục `docs/` và xuất ra các tài liệu markdown sau:
1. `architecture-overview.md`: Kiến trúc tổng quan của toàn bộ 12 microservices.
2. `service-scopes.md`: Tài liệu định nghĩa rõ chức năng, giới hạn và phạm vi (Bounded Context) của từng service.
3. `api-design.md`: Tài liệu thiết kế RESTful API rõ ràng (Endpoints, Request/Response payload, HTTP status).
4. `architecture-diagrams.md`: Mã Mermaid.js để vẽ biểu đồ kiến trúc cho tổng thể và cho từng service.
5. `run-instructions.md`: Hướng dẫn chi tiết cách build và chạy hệ thống với Docker Compose.

**PHASE 2: INFRASTRUCTURE & REFACTORING**
1. Cập nhật `docker-compose.yml` để thêm cấu hình chuẩn cho các container PostgreSQL và MySQL.
2. Cấu hình lại kết nối DB, JWT, `/health`, `/metrics` cho 4 services đã có code basic (`api-gateway`, `customer-service`, `book-service`, `cart-service`).

**PHASE 3: IMPLEMENTATION (NEW SERVICES)**
Chúng ta sẽ code lần lượt từng service mới, theo cụm ngôn ngữ (ví dụ: làm hết Django, rồi qua Spring Boot, rồi Node.js). Khi code một service, hãy đảm bảo có đủ: Dockerfile riêng, Model, Controller/View, Cấu hình DB và Endpoints.

---

## 4. HÀNH ĐỘNG ĐẦU TIÊN CỦA BẠN
Nếu bạn đã hiểu toàn bộ kiến trúc và yêu cầu trên, hãy trả lời bằng một tin nhắn ngắn gọn:
1. Xác nhận bạn đã nắm rõ stack công nghệ cho 12 services.
2. In ra một danh sách TODO (dạng checkbox) để tôi có thể theo dõi tiến độ.
3. Hỏi tôi xem có muốn bắt đầu "PHASE 1: Mục số 1 và 2" ngay bây giờ không.
KHÔNG ĐƯỢC BẮT ĐẦU VIẾT CODE HAY TÀI LIỆU KHI TÔI CHƯA RA LỆNH.
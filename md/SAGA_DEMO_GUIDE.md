# Hướng Dẫn Demo Saga Pattern với Kafka

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Chuẩn Bị](#chuẩn-bị)
3. [Demo 1: Happy Path - Đặt Hàng Thành Công](#demo-1-happy-path---đặt-hàng-thành-công)
4. [Demo 2: Compensation Flow - Ship Service Lỗi](#demo-2-compensation-flow---ship-service-lỗi)
5. [Demo 3: Payment Service Lỗi](#demo-3-payment-service-lỗi)
6. [Theo Dõi Messages Trên Kafka UI](#theo-dõi-messages-trên-kafka-ui)
7. [Troubleshooting](#troubleshooting)

---

## Tổng Quan

### Saga Pattern Architecture
API thứ 3 này sử dụng **Saga Orchestration Pattern** với Kafka để xử lý distributed transactions:

```
POST /orders/saga
  ↓
Order Service (Orchestrator)
  ↓
1. BOOK_RESERVE → book-service
  ↓ (success)
2. PAYMENT_PROCESS → pay-service  
  ↓ (success)
3. SHIPMENT_SCHEDULE → ship-service
  ↓ (success)
4. Order Status = CONFIRMED
```

**Nếu có lỗi**, Saga sẽ tự động **compensation** (rollback) theo thứ tự ngược lại:
```
Shipment FAILED
  ↓
PAYMENT_REFUND → pay-service
  ↓
BOOK_RELEASE → book-service
  ↓
Order Status = CANCELLED
```

### Kafka Topics
- `saga-book-cmd` / `saga-book-reply`
- `saga-payment-cmd` / `saga-payment-reply`
- `saga-shipment-cmd` / `saga-shipment-reply`

---

## Chuẩn Bị

### 1. Kiểm Tra Services Đang Chạy
```bash
docker compose ps
```

Đảm bảo các services sau đang chạy:
- ✅ order-service (port 9001)
- ✅ book-service (port 8002)
- ✅ pay-service (port 9002)
- ✅ ship-service (port 9003)
- ✅ kafka (port 9092)
- ✅ kafka-ui (port 8099)

### 2. Build và Start Tất Cả Services
```bash
# Build các services đã được update
docker compose build order-service pay-service ship-service book-service

# Start tất cả services
docker compose up -d

# Kiểm tra logs
docker compose logs -f order-service pay-service ship-service book-service
```

### 3. Mở Kafka UI
Truy cập: **http://localhost:8099**

Giao diện Kafka UI sẽ hiển thị:
- Clusters
- Topics (6 topics cho Saga)
- Messages trong mỗi topic

---

## Demo 1: Happy Path - Đặt Hàng Thành Công

### Mục Đích
Demo luồng Saga hoàn chỉnh khi **TẤT CẢ services hoạt động bình thường**.

### Các Bước Thực Hiện

#### Bước 1: Đảm Bảo Tất Cả Services Đang Chạy
```bash
# Kiểm tra
docker compose ps | grep -E "(order|book|pay|ship)" | grep "Up"

# Nếu thiếu service nào, start lại
docker compose up -d order-service book-service pay-service ship-service
```

#### Bước 2: Chuẩn Bị Dữ Liệu Test
Lấy customer_id từ database:
```bash
docker compose exec postgres-order psql -U order_user -d order_db -c "SELECT id FROM orders LIMIT 1;"
```

Hoặc dùng UUID mẫu:
```
customer_id: c119ad44-bf19-4386-9caf-327c2fb0996e
```

#### Bước 3: Gọi API Saga
```bash
curl -X POST http://localhost:9001/orders/saga \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "shipping_address_id": "123 Nguyen Hue, District 1, Ho Chi Minh City",
    "payment_method": "credit_card"
  }'
```

**Expected Response** (HTTP 202 Accepted):
```json
{
  "success": true,
  "protocol": "SAGA",
  "message": "Order submitted successfully. Processing asynchronously via Saga Pattern.",
  "order": {
    "id": "uuid-here",
    "customerId": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "status": "PENDING",
    "totalAmount": 150.00,
    "createdAt": "2026-03-09T..."
  },
  "transactionId": "saga-uuid-here",
  "note": "Order will be processed asynchronously. Check status via /orders/{id}"
}
```

#### Bước 4: Theo Dõi Luồng Trên Console Logs

**Terminal 1 - Order Service (Orchestrator):**
```bash
docker compose logs -f order-service
```

Bạn sẽ thấy:
```
🚀 [ORDER-SERVICE] Starting SAGA transaction: txId=saga-xxx
📤 [ORDER-SERVICE] Sending Book Reserve Command
📥 [ORDER-SERVICE] Received Book Reserve REPLY: SUCCESS
📤 [ORDER-SERVICE] Sending Payment Command
📥 [ORDER-SERVICE] Received Payment REPLY: SUCCESS
📤 [ORDER-SERVICE] Sending Shipment Command
📥 [ORDER-SERVICE] Received Shipment REPLY: SUCCESS
✅ [ORDER-SERVICE] SAGA Completed Successfully
```

**Terminal 2 - Book Service:**
```bash
docker compose logs -f book-service
```

```
📚 [BOOK-SERVICE] Received Saga Event: step=BOOK_RESERVE
📚 [BOOK-SERVICE] Reserving books: orderId=xxx, items=2
✅ [BOOK-SERVICE] Reserved book: bookId=1, qty=2, remaining=48
📤 [BOOK-SERVICE] Sent SUCCESS reply
```

**Terminal 3 - Payment Service:**
```bash
docker compose logs -f pay-service
```

```
💳 [PAYMENT-SERVICE] Received Saga Event: step=PAYMENT_PROCESS
💳 [PAYMENT-SERVICE] Processing payment: orderId=xxx, amount=150.00
✅ [PAYMENT-SERVICE] Payment processed successfully: paymentId=xxx
📤 [PAYMENT-SERVICE] Sent SUCCESS reply
```

**Terminal 4 - Shipment Service:**
```bash
docker compose logs -f ship-service
```

```
🚚 [SHIPMENT-SERVICE] Received Saga Event: step=SHIPMENT_SCHEDULE
🚚 [SHIPMENT-SERVICE] Scheduling shipment: orderId=xxx
✅ [SHIPMENT-SERVICE] Shipment scheduled successfully: trackingNumber=TRK-XXX
📤 [SHIPMENT-SERVICE] Sent SUCCESS reply
```

#### Bước 5: Xem Messages Trên Kafka UI

1. Mở **http://localhost:8099**
2. Click vào cluster **"bookstore-kafka"**
3. Click **"Topics"** ở menu bên trái
4. Xem từng topic:

**Topic: `saga-book-cmd`**
- Click vào topic → Tab "Messages"
- Bạn sẽ thấy COMMAND message với:
  ```json
  {
    "transactionId": "saga-xxx",
    "orderId": "uuid",
    "eventType": "COMMAND",
    "sagaStep": "BOOK_RESERVE",
    "payload": {
      "items": [...]
    }
  }
  ```

**Topic: `saga-book-reply`**
- Xem REPLY message:
  ```json
  {
    "transactionId": "saga-xxx",
    "eventType": "REPLY",
    "eventStatus": "SUCCESS",
    "sagaStep": "BOOK_RESERVE"
  }
  ```

**Lặp lại cho các topics:**
- `saga-payment-cmd` / `saga-payment-reply`
- `saga-shipment-cmd` / `saga-shipment-reply`

#### Bước 6: Verify Kết Quả

**Kiểm tra Order đã được tạo:**
```bash
curl http://localhost:9001/orders/{order-id}
```

Expected: `status: "CONFIRMED"`

**Kiểm tra Payment đã được tạo:**
```bash
docker compose exec postgres-payment psql -U payment_user -d payment_db -c "SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;"
```

**Kiểm tra Shipment đã được tạo:**
```bash
docker compose exec postgres-shipment psql -U shipment_user -d shipment_db -c "SELECT * FROM shipments ORDER BY created_at DESC LIMIT 1;"
```

**Kiểm tra Book stock đã giảm:**
```bash
docker compose exec mysql-book mysql -u book_user -pbook_pass -D book_db -e "SELECT id, title, stock_quantity FROM app_book LIMIT 5;"
```

---

## Demo 2: Compensation Flow - Ship Service Lỗi

### Mục Đích
Demo **Compensation Flow** khi ship-service bị lỗi. Saga sẽ tự động rollback:
- ✅ Book đã reserve → Phải **release** (cộng lại stock)
- ✅ Payment đã process → Phải **refund**
- ✅ Order status → **CANCELLED**

### Các Bước Thực Hiện

#### Bước 1: TẮT Ship Service (Simulate Lỗi)
```bash
docker stop ship-service
```

Verify:
```bash
docker compose ps | grep ship-service
# Hoặc
curl http://localhost:9003/actuator/health
# Expected: Connection refused
```

#### Bước 2: Kiểm Tra Stock Trước Khi Đặt Hàng
```bash
docker compose exec mysql-book mysql -u book_user -pbook_pass -D book_db -e "SELECT id, title, stock_quantity FROM app_book WHERE id=1;"
```

Ghi nhớ số lượng hiện tại (ví dụ: stock_quantity = 48)

#### Bước 3: Mở Kafka UI Trước Khi Gọi API
1. Mở **http://localhost:8099**
2. Navigate đến Topics
3. Mở sẵn các tabs:
   - `saga-book-cmd`
   - `saga-book-reply`
   - `saga-payment-cmd`
   - `saga-payment-reply`
   - `saga-shipment-cmd`
   - `saga-shipment-reply`

#### Bước 4: Mở 4 Terminal Để Monitor Logs

**Terminal 1 - Order Service:**
```bash
docker compose logs -f order-service | grep -E "SAGA|📤|📥|✅|❌"
```

**Terminal 2 - Book Service:**
```bash
docker compose logs -f book-service | grep -E "BOOK|📚|🔄"
```

**Terminal 3 - Payment Service:**
```bash
docker compose logs -f pay-service | grep -E "PAYMENT|💳|🔄"
```

**Terminal 4 - Ship Service (để verify nó không nhận được gì):**
```bash
docker compose logs -f ship-service 2>&1 | tail -f
```
(Sẽ không có output vì đã stop)

#### Bước 5: Gọi API Saga
```bash
curl -X POST http://localhost:9001/orders/saga \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "shipping_address_id": "123 Main Street, District 1, HCM",
    "payment_method": "credit_card"
  }'
```

#### Bước 6: Quan Sát Luồng Compensation

**Order Service Console sẽ hiển thị:**
```
🚀 [ORDER-SERVICE] Starting SAGA transaction: txId=saga-xxx
📤 [ORDER-SERVICE] Sending Book Reserve Command
📥 [ORDER-SERVICE] Received Book Reserve REPLY: SUCCESS
📤 [ORDER-SERVICE] Sending Payment Command
📥 [ORDER-SERVICE] Received Payment REPLY: SUCCESS
📤 [ORDER-SERVICE] Sending Shipment Command
⏳ [ORDER-SERVICE] Waiting for Shipment reply... (timeout 30s)
❌ [ORDER-SERVICE] Shipment FAILED or TIMEOUT
🔄 [ORDER-SERVICE] Starting COMPENSATION...
📤 [ORDER-SERVICE] Sending Payment Refund Command
📥 [ORDER-SERVICE] Payment Refund: SUCCESS
📤 [ORDER-SERVICE] Sending Book Release Command
📥 [ORDER-SERVICE] Book Release: SUCCESS
❌ [ORDER-SERVICE] SAGA FAILED - Compensation completed
```

**Payment Service sẽ hiển thị:**
```
💳 [PAYMENT-SERVICE] Processing payment: SUCCESS
💳 [PAYMENT-SERVICE] Payment completed: paymentId=xxx
---
🔄 [PAYMENT-SERVICE] Compensating - Refunding payment: paymentId=xxx
✅ [PAYMENT-SERVICE] Payment refunded successfully
📤 [PAYMENT-SERVICE] Sent REFUND SUCCESS reply
```

**Book Service sẽ hiển thị:**
```
📚 [BOOK-SERVICE] Reserving books: SUCCESS
✅ [BOOK-SERVICE] Reserved book: bookId=1, qty=2
---
🔄 [BOOK-SERVICE] Compensating - Releasing books
✅ [BOOK-SERVICE] Released book: bookId=1, qty=2, new_stock=48
📤 [BOOK-SERVICE] Sent RELEASE SUCCESS reply
```

#### Bước 7: Xem Messages Trên Kafka UI

Refresh từng topic trên Kafka UI:

**1. saga-book-cmd (2 messages):**
- Message 1: BOOK_RESERVE command ✅
- Message 2: BOOK_RELEASE command (compensation) 🔄

**2. saga-book-reply (2 messages):**
- Message 1: BOOK_RESERVE SUCCESS
- Message 2: BOOK_RELEASE SUCCESS

**3. saga-payment-cmd (2 messages):**
- Message 1: PAYMENT_PROCESS command ✅
- Message 2: PAYMENT_REFUND command (compensation) 🔄

**4. saga-payment-reply (2 messages):**
- Message 1: PAYMENT_PROCESS SUCCESS
- Message 2: PAYMENT_REFUND SUCCESS

**5. saga-shipment-cmd (1 message):**
- Message 1: SHIPMENT_SCHEDULE command (không có reply vì service đã tắt)

**6. saga-shipment-reply (0 messages):**
- Không có reply vì ship-service đã bị tắt

#### Bước 8: Verify Compensation Đã Hoàn Thành

**1. Kiểm tra Order status = CANCELLED:**
```bash
curl http://localhost:9001/orders/{order-id}
```
Expected: `"status": "CANCELLED"`

**2. Kiểm tra Payment status = REFUNDED:**
```bash
docker compose exec postgres-payment psql -U payment_user -d payment_db \
  -c "SELECT id, order_id, amount, status FROM payments ORDER BY created_at DESC LIMIT 1;"
```
Expected: `status = REFUNDED`

**3. Kiểm tra Book stock đã được cộng lại:**
```bash
docker compose exec mysql-book mysql -u book_user -pbook_pass -D book_db \
  -e "SELECT id, title, stock_quantity FROM app_book WHERE id=1;"
```
Expected: stock_quantity = 48 (giống ban đầu)

#### Bước 9: Restart Ship Service Để Demo Lần Sau
```bash
docker compose up -d ship-service
```

---

## Demo 3: Payment Service Lỗi

### Mục Đích
Demo compensation khi **payment-service** lỗi (chỉ cần rollback book reservation).

### Các Bước

#### Bước 1: TẮT Payment Service
```bash
docker stop pay-service
```

#### Bước 2: Gọi API
```bash
curl -X POST http://localhost:9001/orders/saga \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "shipping_address_id": "123 Main St",
    "payment_method": "credit_card"
  }'
```

#### Bước 3: Quan Sát Luồng

**Order Service:**
```
📤 Book Reserve Command → ✅ SUCCESS
📤 Payment Command → ❌ TIMEOUT/FAILED
🔄 Starting Compensation
📤 Book Release Command → ✅ SUCCESS
❌ SAGA FAILED
```

**Kafka UI - Messages:**
- `saga-book-cmd`: BOOK_RESERVE, BOOK_RELEASE
- `saga-book-reply`: 2 SUCCESS
- `saga-payment-cmd`: PAYMENT_PROCESS (no reply)
- `saga-payment-reply`: 0 messages
- `saga-shipment-cmd`: 0 messages (không đến bước này)

#### Bước 4: Restart Payment Service
```bash
docker compose up -d pay-service
```

---

## Theo Dõi Messages Trên Kafka UI

### Cách Sử Dụng Kafka UI

#### 1. Truy Cập Dashboard
URL: **http://localhost:8099**

#### 2. Xem Danh Sách Topics
- Click menu **"Topics"** bên trái
- Bạn sẽ thấy 6 topics:
  - `saga-book-cmd`
  - `saga-book-reply`
  - `saga-payment-cmd`
  - `saga-payment-reply`
  - `saga-shipment-cmd`
  - `saga-shipment-reply`

#### 3. Xem Messages Trong Topic

**Cách xem:**
1. Click vào tên topic (ví dụ: `saga-book-cmd`)
2. Click tab **"Messages"**
3. Chọn:
   - **Partition**: All
   - **Offset**: Beginning (để xem từ đầu)
4. Click **"Submit"**

**Thông tin hiển thị cho mỗi message:**
- **Partition**: 0 (vì ta cấu hình 1 partition)
- **Offset**: 0, 1, 2, ... (thứ tự message)
- **Timestamp**: Thời gian gửi message
- **Key**: transactionId (để track Saga instance)
- **Value**: JSON payload

**Ví dụ message trong `saga-book-cmd`:**
```json
{
  "transactionId": "saga-abc123",
  "orderId": "uuid-order",
  "eventType": "COMMAND",
  "eventStatus": null,
  "sagaStep": "BOOK_RESERVE",
  "payload": {
    "orderId": "uuid-order",
    "items": [
      {
        "bookId": 1,
        "quantity": 2,
        "price": 25.00
      }
    ]
  },
  "errorMessage": null
}
```

**Ví dụ message trong `saga-book-reply`:**
```json
{
  "transactionId": "saga-abc123",
  "orderId": "uuid-order",
  "eventType": "REPLY",
  "eventStatus": "SUCCESS",
  "sagaStep": "BOOK_RESERVE",
  "payload": {
    "orderId": "uuid-order",
    "items": [
      {
        "bookId": 1,
        "quantity": 2,
        "price": 25.00
      }
    ]
  },
  "errorMessage": null
}
```

#### 4. Filter Messages Theo Transaction ID

1. Ở tab Messages
2. Tìm **"Key"** filter
3. Nhập transaction ID (ví dụ: `saga-abc123`)
4. Submit

Bạn sẽ chỉ thấy các messages của Saga instance đó.

#### 5. Theo Dõi Real-time

- Kafka UI **TỰ ĐỘNG refresh** khi có message mới
- Hoặc bạn có thể click **"Live Mode"** để xem real-time

#### 6. So Sánh Happy Path vs Compensation

**Happy Path (thành công):**
```
saga-book-cmd:     1 message  (BOOK_RESERVE)
saga-book-reply:   1 message  (SUCCESS)
saga-payment-cmd:  1 message  (PAYMENT_PROCESS)
saga-payment-reply: 1 message (SUCCESS)
saga-shipment-cmd: 1 message  (SHIPMENT_SCHEDULE)
saga-shipment-reply: 1 message (SUCCESS)
Total: 6 messages
```

**Compensation (ship-service lỗi):**
```
saga-book-cmd:     2 messages (RESERVE + RELEASE)
saga-book-reply:   2 messages (SUCCESS, SUCCESS)
saga-payment-cmd:  2 messages (PROCESS + REFUND)
saga-payment-reply: 2 messages (SUCCESS, SUCCESS)
saga-shipment-cmd: 1 message  (SCHEDULE - no reply)
saga-shipment-reply: 0 messages
Total: 9 messages
```

---

## Troubleshooting

### 1. Không Thấy Messages Trên Kafka UI

**Nguyên nhân:**
- Topics chưa được tạo
- Consumer chưa consume

**Giải pháp:**
```bash
# Verify topics exist
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list | grep saga

# Tạo topics thủ công nếu cần
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create \
  --topic saga-book-cmd --partitions 1 --replication-factor 1

docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create \
  --topic saga-book-reply --partitions 1 --replication-factor 1

# (Tương tự cho các topics khác)
```

### 2. Service Không Nhận Được Kafka Messages

**Kiểm tra logs:**
```bash
docker compose logs book-service | grep -i kafka
docker compose logs pay-service | grep -i kafka
docker compose logs ship-service | grep -i kafka
```

**Kiểm tra Kafka connection:**
```bash
docker compose logs kafka | grep -i error
```

### 3. Order Status Không Đổi Sang CANCELLED

**Nguyên nhân:** SagaOrchestrator timeout chưa đủ lâu

**Giải pháp:** Kiểm tra code trong SagaOrchestrator.java:
```java
// Timeout nên là 30 giây trở lên
```

### 4. Compensation Không Chạy

**Kiểm tra logs order-service:**
```bash
docker compose logs order-service | grep -i compensation
```

**Verify consumer groups:**
```bash
docker compose exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

### 5. Kafka UI Không Kết Nối Được

```bash
# Restart Kafka UI
docker compose restart kafka-ui

# Kiểm tra logs
docker compose logs kafka-ui
```

---

## Tips Cho Presentation Demo

### Chuẩn Bị Trước Demo

1. **Mở sẵn các terminals:**
   - Terminal 1: order-service logs
   - Terminal 2: book-service logs
   - Terminal 3: pay-service logs
   - Terminal 4: ship-service logs

2. **Mở sẵn các browser tabs:**
   - Tab 1: Kafka UI - Topics overview
   - Tab 2: saga-book-cmd messages
   - Tab 3: saga-payment-cmd messages
   - Tab 4: saga-shipment-cmd messages

3. **Clear logs trước khi demo:**
```bash
docker compose restart order-service book-service pay-service ship-service
```

### Kịch Bản Demo Trước Khán Giả

**Part 1: Giới thiệu (2 phút)**
- Giải thích vấn đề: Distributed transactions trong microservices
- Giới thiệu Saga Pattern (Orchestration vs Choreography)
- So sánh 3 APIs: REST, 2PC, Saga

**Part 2: Happy Path Demo (3 phút)**
- Gọi API POST /orders/saga
- Show console logs từ 4 services
- Show Kafka UI với 6 messages qua lại
- Verify order CONFIRMED

**Part 3: Compensation Demo (5 phút)**
- Stop ship-service
- Gọi API lần nữa
- **Highlight:** Compensation tự động rollback
- Show logs: Payment REFUND, Book RELEASE
- Show Kafka UI: 9 messages (bao gồm compensation)
- Verify order CANCELLED, stock restored

**Part 4: Q&A (5 phút)**

---

## Kết Luận

Bạn đã có đầy đủ 3 phương pháp để tạo đơn hàng:

| API | Pattern | Use Case | Pros | Cons |
|-----|---------|----------|------|------|
| `/orders` | REST Sync | Simple flows | Fast, easy | No transaction guarantee |
| `/orders/2pc` | 2PC | Strong consistency | ACID guarantee | Blocking, poor availability |
| `/orders/saga` | Saga + Kafka | Complex workflows | Async, scalable, resilient | Eventual consistency |

**Saga Pattern** là lựa chọn tốt nhất cho production khi:
- ✅ Cần high availability
- ✅ Services có thể fail independently
- ✅ Long-running transactions
- ✅ Observable & debuggable (via Kafka UI)

---

## Tài Liệu Tham Khảo

- [Saga Pattern - Chris Richardson](https://microservices.io/patterns/data/saga.html)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Spring Kafka](https://spring.io/projects/spring-kafka)
- [Kafka UI GitHub](https://github.com/provectus/kafka-ui)

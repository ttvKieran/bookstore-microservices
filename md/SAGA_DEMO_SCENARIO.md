# 🎬 KỊCH BẢN DEMO SAGA PATTERN VỚI KAFKA UI

## 📋 Mục tiêu Demo
Trình diễn luồng **Saga Pattern (Orchestration)** với Kafka khi xảy ra lỗi và thực hiện **Compensation** (rollback phân tán).

---

## 🔧 BƯỚC 1: Chuẩn bị môi trường

### 1.1. Khởi động tất cả services
```bash
cd /home/truongvu/Documents/bookstore/bookstore-microservices
docker compose up -d
```

### 1.2. Kiểm tra services đang chạy
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 1.3. Tắt ship-service để tạo lỗi (đã làm ✅)
```bash
docker stop ship-service
```

**Giải thích**: Khi ship-service bị tắt, bước cuối cùng trong Saga sẽ THẤT BẠI → Kích hoạt compensation flow.

---

## 🌐 BƯỚC 2: Mở Kafka UI

### 2.1. Truy cập Kafka UI
```
URL: http://localhost:8099
```

### 2.2. Các Topics cần theo dõi
Mở 6 tabs trong trình duyệt, mỗi tab xem 1 topic:

| Topic | Vai trò |
|-------|---------|
| `saga-book-reserve-cmd` | 📤 Lệnh đặt chỗ sách |
| `saga-book-reserve-reply` | 📥 Kết quả đặt chỗ sách |
| `saga-payment-process-cmd` | 📤 Lệnh xử lý thanh toán |
| `saga-payment-process-reply` | 📥 Kết quả thanh toán |
| `saga-shipment-schedule-cmd` | 📤 Lệnh tạo vận chuyển |
| `saga-shipment-schedule-reply` | 📥 Kết quả vận chuyển |

### 2.3. Cài đặt hiển thị
- Chọn **"Live Mode"** (Auto refresh) để xem real-time
- Sort theo **"Timestamp"** mới nhất trên đầu

---

## 🚀 BƯỚC 3: Thực hiện POST Request

### 3.1. Lấy Customer ID hợp lệ
```bash
curl http://localhost:8004/customers | jq -r '.content[0].id'
```

**Output mẫu**: `c119ad44-bf19-4386-9caf-327c2fb0996e`

### 3.2. POST Order với Saga Pattern
```bash
curl -X POST http://localhost:8001/orders/saga \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "shipping_address_id": "456 Demo Street, District 10, Ho Chi Minh City",
    "payment_method": "credit_card"
  }' | jq .
```

### 3.3. Response mong đợi
```json
{
  "success": true,
  "message": "Saga transaction initiated",
  "orderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "transactionId": "saga_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "protocol": "SAGA",
  "status": "PROCESSING",
  "note": "Order is being processed asynchronously via Saga Pattern"
}
```

**⚠️ Lưu ý**: Response trả về **202 ACCEPTED** (không phải 201) vì Saga xử lý bất đồng bộ.

---

## 🔍 BƯỚC 4: Quan sát luồng trên Kafka UI

### 📊 Timeline Messages (theo thứ tự):

#### **Message 1: Book Reserve Command** ✅
**Topic**: `saga-book-reserve-cmd`
```json
{
  "sagaId": "saga_a1b2c3d4-...",
  "eventType": "COMMAND",
  "sagaStep": "BOOK_RESERVE",
  "timestamp": "2026-03-09T...",
  "payload": {
    "bookId": 123,
    "quantity": 2,
    "customerId": "c119ad44-..."
  }
}
```
**Giải thích**: 🚀 Orchestrator gửi lệnh đặt chỗ sách

---

#### **Message 2: Book Reserve Reply** ✅
**Topic**: `saga-book-reserve-reply`
```json
{
  "sagaId": "saga_a1b2c3d4-...",
  "eventType": "REPLY",
  "eventStatus": "SUCCESS",
  "sagaStep": "BOOK_RESERVE",
  "timestamp": "2026-03-09T...",
  "payload": {
    "bookId": 123,
    "quantity": 2,
    "reserved": true
  }
}
```
**Giải thích**: ✅ Book service phản hồi thành công

---

#### **Message 3: Payment Process Command** ✅
**Topic**: `saga-payment-process-cmd`
```json
{
  "sagaId": "saga_a1b2c3d4-...",
  "eventType": "COMMAND",
  "sagaStep": "PAYMENT_PROCESS",
  "timestamp": "2026-03-09T...",
  "payload": {
    "orderId": "a1b2c3d4-...",
    "customerId": "c119ad44-...",
    "amount": 299.50,
    "paymentMethod": "credit_card"
  }
}
```
**Giải thích**: 💳 Orchestrator gửi lệnh xử lý thanh toán

---

#### **Message 4: Payment Process Reply** ✅
**Topic**: `saga-payment-process-reply`
```json
{
  "sagaId": "saga_a1b2c3d4-...",
  "eventType": "REPLY",
  "eventStatus": "SUCCESS",
  "sagaStep": "PAYMENT_PROCESS",
  "timestamp": "2026-03-09T...",
  "payload": {
    "paymentId": "pay_xyz789",
    "status": "COMPLETED"
  }
}
```
**Giải thích**: ✅ Payment service phản hồi thành công

---

#### **Message 5: Shipment Schedule Command** ❌
**Topic**: `saga-shipment-schedule-cmd`
```json
{
  "sagaId": "saga_a1b2c3d4-...",
  "eventType": "COMMAND",
  "sagaStep": "SHIPMENT_SCHEDULE",
  "timestamp": "2026-03-09T...",
  "payload": {
    "orderId": "a1b2c3d4-...",
    "shippingAddress": "456 Demo Street...",
    "estimatedDays": 3
  }
}
```
**Giải thích**: 📦 Orchestrator gửi lệnh tạo vận chuyển

---

#### **Message 6: Shipment Schedule Reply** ❌ **TIMEOUT/NO RESPONSE**
**Topic**: `saga-shipment-schedule-reply`
```
⏰ Timeout: Không có reply sau 30 giây
```
**Giải thích**: ⚠️ Ship service bị tắt → Không phản hồi → **COMPENSATION BẮT ĐẦU**

---

### 🔄 **COMPENSATION PHASE** (Rollback)

#### **Message 7: Payment Compensation Command** 🔙
**Topic**: `saga-payment-process-cmd` (với flag COMPENSATE)
```json
{
  "sagaId": "saga_a1b2c3d4-...",
  "eventType": "COMPENSATE",
  "sagaStep": "PAYMENT_PROCESS",
  "timestamp": "2026-03-09T...",
  "payload": {
    "paymentId": "pay_xyz789",
    "action": "REFUND"
  }
}
```
**Giải thích**: 💸 Hoàn tiền thanh toán đã thực hiện

---

#### **Message 8: Book Reserve Compensation Command** 🔙
**Topic**: `saga-book-reserve-cmd` (với flag COMPENSATE)
```json
{
  "sagaId": "saga_a1b2c3d4-...",
  "eventType": "COMPENSATE",
  "sagaStep": "BOOK_RESERVE",
  "timestamp": "2026-03-09T...",
  "payload": {
    "bookId": 123,
    "quantity": 2,
    "action": "RELEASE_RESERVATION"
  }
}
```
**Giải thích**: 📚 Hủy đặt chỗ sách đã reserve

---

## 📊 BƯỚC 5: Kiểm tra kết quả Database

### 5.1. Check Order Status
```bash
# Lấy Order ID từ response ở bước 3.3
ORDER_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

docker compose exec order-service-db psql -U orderuser -d orderdb -c \
  "SELECT id, customer_id, status, total_amount, created_at 
   FROM orders 
   WHERE id = '$ORDER_ID';"
```

**Kết quả mong đợi**:
```
 id                                   | customer_id | status    | total_amount
--------------------------------------+-------------+-----------+-------------
 a1b2c3d4-e5f6-7890-abcd-ef1234567890 | c119ad44... | CANCELLED | 299.50
```

**✅ Order status = CANCELLED** (do Saga compensation)

---

## 🎯 BƯỚC 6: Điểm nhấn khi Demo

### 6.1. So sánh với 2PC
**Two-Phase Commit** (API cũ `/orders/2pc`):
- ❌ Ship-service timeout → Toàn bộ transaction **BLOCKED**
- ❌ Database locks giữ connection
- ❌ Không có visibility về tiến trình

**Saga Pattern** (API mới `/orders/saga`):
- ✅ Ship-service timeout → **Compensation tự động**
- ✅ Không có blocking, mỗi service độc lập
- ✅ **Full visibility** trên Kafka UI

### 6.2. Key Messages cho audience
1. **Bất đồng bộ**: Response 202 ngay lập tức, xử lý background
2. **Traceability**: Mọi bước đều có message trên Kafka
3. **Resilience**: Một service fail không làm crash toàn hệ thống
4. **Compensation**: Tự động rollback các bước đã thành công

---

## 🧪 BƯỚC 7: Test Scenario thành công

### 7.1. Khởi động lại ship-service
```bash
docker start ship-service

# Đợi 5 giây để service sẵn sàng
sleep 5
```

### 7.2. POST Order lại
```bash
curl -X POST http://localhost:8001/orders/saga \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "shipping_address_id": "456 Demo Street, District 10, Ho Chi Minh City",
    "payment_method": "credit_card"
  }' | jq .
```

### 7.3. Quan sát Kafka UI
Lần này bạn sẽ thấy:
- ✅ Message 6 có reply thành công từ ship-service
- ✅ **KHÔNG CÓ** compensation messages
- ✅ Order status = **CONFIRMED** (không phải CANCELLED)

---

## 📸 Screenshots cần chụp cho Demo

1. **Kafka UI Overview**: Danh sách 6 topics
2. **Timeline Messages**: Các messages theo thứ tự thời gian
3. **Compensation Messages**: Highlight các message COMPENSATE
4. **Database Before/After**: Order status CANCELLED
5. **Logs Console**: `docker compose logs order-service` (có emoji 🚀📤📥❌)

---

## 🎤 Script Thuyết trình mẫu

> "Hiện tại tôi có 3 API tạo đơn hàng:
> 
> 1. **REST đồng bộ** - Đơn giản nhưng không có distributed transaction
> 2. **Two-Phase Commit** - Có transaction nhưng blocking và dễ bị deadlock
> 3. **Saga Pattern với Kafka** - Bất đồng bộ, scalable, có compensation
> 
> Bây giờ tôi sẽ demo kịch bản: **Ship-service bị down** khi đang tạo đơn hàng.
> 
> [Mở Kafka UI] Các bạn xem, khi tôi POST đơn hàng, hệ thống sẽ:
> - Bước 1: Reserve sách → Thành công ✅
> - Bước 2: Xử lý payment → Thành công ✅
> - Bước 3: Tạo shipment → **Thất bại** ❌ (vì ship-service tắt)
> 
> Điều quan trọng là: Saga Orchestrator **tự động rollback**:
> - Hoàn tiền payment 💸
> - Hủy reserve sách 📚
> - Đánh dấu order = CANCELLED
> 
> Tất cả các bước này đều **visible** trên Kafka để debug và monitor!"

---

## ✅ Checklist trước khi Demo

- [ ] Tất cả services đang chạy (trừ ship-service)
- [ ] Kafka UI accessible tại http://localhost:8099
- [ ] Đã chuẩn bị customer_id hợp lệ
- [ ] Đã mở 6 tabs Kafka topics
- [ ] Terminal sẵn sàng chạy curl command
- [ ] Có `jq` để format JSON response
- [ ] Chuẩn bị script thuyết trình

---

## 🔧 Troubleshooting

### Nếu không thấy messages trên Kafka UI:
```bash
# Check Kafka health
docker compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Check order-service logs
docker compose logs -f order-service | grep "🚀\|📤\|📥"
```

### Nếu order-service lỗi:
```bash
# Rebuild và restart
docker compose build order-service
docker compose up -d order-service
```

### Nếu muốn reset demo:
```bash
# Xóa tất cả orders
docker compose exec order-service-db psql -U orderuser -d orderdb -c "DELETE FROM order_items; DELETE FROM orders;"

# Clear Kafka topics (Optional - giữ lại để xem lịch sử)
docker compose exec kafka kafka-topics --delete --topic saga-book-reserve-cmd --bootstrap-server localhost:9092
# ... (repeat for other topics)
```

---

## 📚 Tài liệu tham khảo

- [Saga Pattern - Chris Richardson](https://microservices.io/patterns/data/saga.html)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Spring Kafka Reference](https://docs.spring.io/spring-kafka/reference/html/)

---

**🎉 CHÚC BẠN DEMO THÀNH CÔNG!**

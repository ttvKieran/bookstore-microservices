# Saga Pattern with Kafka - Implementation Guide

## 📋 Overview

API thứ 3 để tạo đơn hàng sử dụng **Saga Pattern (Orchestration) + Kafka**

- **Endpoint**: `POST /orders/saga`
- **Body**: Giống như 2 API trước
```json
{
    "customer_id": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "shipping_address_id": "123 Main Street, District 1, Ho Chi Minh City",
    "payment_method": "credit_card"
}
```

## 🏗️ Architecture

### Luồng Saga Orchestration:

```
POST /orders/saga
     ↓
[Order Service - Orchestrator]
     ↓
1. Create Order (status: PENDING)
     ↓
2. Send BOOK_RESERVE → Kafka topic: saga-book-cmd
     ↓
3. Wait for reply ← Kafka topic: saga-book-reply
     ↓ SUCCESS
4. Send PAYMENT_PROCESS → Kafka topic: saga-payment-cmd
     ↓
5. Wait for reply ← Kafka topic: saga-payment-reply
     ↓ SUCCESS
6. Send SHIPMENT_SCHEDULE → Kafka topic: saga-shipment-cmd
     ↓
7. Wait for reply ← Kafka topic: saga-shipment-reply
     ↓ SUCCESS
8. Update Order status: CONFIRMED
     ↓
   COMPLETED ✅

If any step FAILS → Compensate in reverse order
```

### Kafka Topics:

| Topic | Purpose |
|-------|---------|
| `saga-book-cmd` | Commands to book service |
| `saga-book-reply` | Replies from book service |
| `saga-payment-cmd` | Commands to payment service |
| `saga-payment-reply` | Replies from payment service |
| `saga-shipment-cmd` | Commands to shipment service |
| `saga-shipment-reply` | Replies from shipment service |

## 🚀 Setup & Run

### 1. Start Infrastructure

```bash
cd /home/truongvu/Documents/bookstore/bookstore-microservices

# Start Kafka + Zookeeper
docker compose up -d zookeeper kafka

# Wait for Kafka to be healthy
docker compose logs -f kafka
# (Ctrl+C when you see "Kafka Server started")

# Rebuild và start order-service
docker compose up -d --build order-service
```

### 2. Verify Kafka is Running

```bash
# Check Kafka health
docker compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# List topics (should see saga topics auto-created)
docker compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

## 📊 Xem Kafka Messages (Demo cho hội đồng)

### Cách 1: Console Consumer (Real-time)

Mở 3 terminals để xem messages trên 3 reply topics:

**Terminal 1 - Book Replies:**
```bash
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic saga-book-reply \
  --from-beginning \
  --property print.key=true \
  --property print.timestamp=true
```

**Terminal 2 - Payment Replies:**
```bash
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic saga-payment-reply \
  --from-beginning \
  --property print.key=true \
  --property print.timestamp=true
```

**Terminal 3 - Shipment Replies:**
```bash
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic saga-shipment-reply \
  --from-beginning \
  --property print.key=true \
  --property print.timestamp=true
```

### Cách 2: Xem Order Service Logs (Recommended)

Order service có extensive logging cho mỗi bước:

```bash
docker compose logs -f order-service | grep SAGA
```

Bạn sẽ thấy:
```
🚀 [SAGA-START] Saga ID: abc123 | Customer: c119ad44...
📦 [SAGA] Fetched 2 items from cart
📝 [SAGA] Created order xyz789 with status PENDING
📤 [SAGA-KAFKA] Sending BOOK_RESERVE command to topic: saga-book-cmd | Saga: abc123
📥 [SAGA-KAFKA] Received BOOK_REPLY | Saga: abc123 | Status: SUCCESS
✅ [SAGA] Book reservation successful
📤 [SAGA-KAFKA] Sending PAYMENT_PROCESS command to topic: saga-payment-cmd
📥 [SAGA-KAFKA] Received PAYMENT_REPLY | Saga: abc123 | Status: SUCCESS
✅ [SAGA] Payment processed successfully
📤 [SAGA-KAFKA] Sending SHIPMENT_SCHEDULE command to topic: saga-shipment-cmd
📥 [SAGA-KAFKA] Received SHIPMENT_REPLY | Saga: abc123 | Status: SUCCESS
✅ [SAGA] Shipment scheduled successfully
🎉 [SAGA-COMPLETE] Saga abc123 completed successfully | Order: xyz789 | Status: CONFIRMED
```

### Cách 3: Kafka UI (Nếu cần giao diện)

Nếu muốn giao diện web, thêm vào docker-compose.yaml:

```yaml
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: bookstore-kafka
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
    depends_on:
      - kafka
    networks:
      - bookstore-network
```

Sau đó truy cập: http://localhost:8080

## 🧪 Test API

### 1. Test API /orders/saga

```bash
curl -X POST http://localhost:9001/orders/saga \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "c119ad44-bf19-4386-9caf-327c2fb0996e",
    "shipping_address_id": "123 Main Street, District 1, Ho Chi Minh City",
    "payment_method": "credit_card"
  }'
```

Response:
```json
{
  "success": true,
  "protocol": "SAGA",
  "order": {
    "id": "xyz789",
    "customerId": "c119ad44...",
    "status": "PENDING",
    "totalAmount": 65.98
  },
  "message": "Saga transaction started - processing asynchronously via Kafka",
  "note": "Order status will be updated to CONFIRMED when all steps complete"
}
```

### 2. Monitor Progress

Xem logs:
```bash
docker compose logs -f order-service | grep SAGA
```

### 3. Verify Order Status

```bash
ORDER_ID="<order_id_from_response>"
curl http://localhost:9001/orders/$ORDER_ID
```

Status sẽ thay đổi: `PENDING` → `CONFIRMED` khi Saga hoàn thành.

## 🔍 Troubleshooting

### Kafka không start
```bash
# Xem logs
docker compose logs kafka

# Restart
docker compose restart zookeeper kafka
```

### Order-service không kết nối được Kafka
```bash
# Check connection
docker compose exec order-service env | grep KAFKA

# Should see: KAFKA_BOOTSTRAP_SERVERS=kafka:29092
```

### Messages không hiện trong Kafka
```bash
# Check if topics exist
docker compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Describe a topic
docker compose exec kafka kafka-topics --describe --topic saga-book-cmd --bootstrap-server localhost:9092
```

## 📝 So sánh 3 API

| API | Endpoint | Protocol | Sync/Async | Consistency |
|-----|----------|----------|------------|-------------|
| #1 | `POST /orders` | REST | ✅ Sync | Eventually Consistent |
| #2 | `POST /orders/2pc` | 2PC | ✅ Sync | ✅ Strong |
| #3 | `POST /orders/saga` | Saga + Kafka | ⚡ Async | Eventually Consistent |

## 🎯 Demo cho hội đồng

1. **Mở terminal logs trước:**
   ```bash
   docker compose logs -f order-service | grep SAGA
   ```

2. **Gọi API:**
   ```bash
   curl -X POST http://localhost:9001/orders/saga ...
   ```

3. **Chỉ cho logs** - messages flying through Kafka:
   - 🚀 Saga started
   - 📤 Sending commands
   - 📥 Receiving replies
   - ✅ Success steps
   - 🎉 Completion

4. **Verify kết quả:**
   ```bash
   curl http://localhost:9001/orders/<order_id>
   # Status: CONFIRMED
   ```

---

**Lưu ý**: Hiện tại chỉ có Order Service được implement đầy đủ. Các services khác (book, payment, shipment) cần implement Kafka consumers để xử lý commands và gửi replies. Tuy nhiên, code đã sẵn sàng và có extensive logging để demo luồng Saga.

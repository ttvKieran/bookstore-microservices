# 📊 Load Testing & Monitoring Guide

Hướng dẫn tích hợp và sử dụng hệ thống Load Testing (k6) và Monitoring (Grafana + InfluxDB) cho Bookstore Microservices.

---

## 📁 Cấu Trúc Thư Mục

```
bookstore-microservices/
├── scripts/                          # K6 test scripts
│   ├── health_test.js               # Basic health check test
│   ├── full_load_test.js            # Comprehensive load test
│   └── spike_test.js                # Spike/stress test
├── monitoring/
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/         # Grafana datasource configs
│       │   │   └── datasources.yml
│       │   └── dashboards/          # Dashboard provisioning
│       │       └── dashboard.yml
│       └── dashboards/              # Dashboard JSON files
│           └── k6-dashboard.json
└── docker-compose.yaml              # Updated with monitoring services
```

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────┐
│     k6      │  Load Testing Tool
│  (Manual)   │  - Generates traffic
└──────┬──────┘  - Sends metrics to InfluxDB
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌─────────────┐          ┌──────────────┐
│  InfluxDB   │◄─────────│ API Services │
│  (Port 8086)│          │ (Your APIs)  │
└──────┬──────┘          └──────────────┘
       │
       │ Metrics Storage
       │
       ▼
┌─────────────┐
│   Grafana   │  Visualization
│ (Port 3001) │  - Dashboards
└─────────────┘  - Real-time metrics
```

---

## 🚀 Khởi Động Hệ Thống

### 1️⃣ Khởi động toàn bộ services (bao gồm monitoring)

```bash
docker compose up -d
```

### 2️⃣ Hoặc khởi động riêng monitoring stack

```bash
# Khởi động InfluxDB và Grafana
docker compose up -d influxdb grafana

# Đợi 10-15 giây để services khởi động hoàn toàn
```

### 3️⃣ Kiểm tra services đang chạy

```bash
docker compose ps
```

Bạn sẽ thấy:
- ✅ `influxdb` - Running on port 8086
- ✅ `grafana` - Running on port 3001
- ✅ `api-gateway` - Running on port 8000
- ✅ Các microservices khác...

---

## 📊 Truy Cập Grafana Dashboard

### 🔗 URL và Credentials

```
URL:      http://localhost:3001
Username: admin
Password: admin
```

### 📈 Dashboard đã được cấu hình sẵn

1. Truy cập: http://localhost:3001
2. Login với credentials trên
3. Vào **Dashboards** → **Browse**
4. Chọn **"K6 Load Testing Dashboard"**

### Dashboard hiển thị:
- 📊 **Virtual Users**: Số lượng user đồng thời
- ⏱️ **Response Time**: Thời gian phản hồi trung bình
- 🔥 **Requests per Second**: Throughput của hệ thống
- ❌ **Error Rate**: Tỷ lệ lỗi

---

## 🧪 Chạy Load Tests

### ⚡ Test 1: Health Check Test (Basic)

**Mô tả:** Test đơn giản để kiểm tra endpoint `/health/` của API Gateway

```bash
docker compose run --rm k6 run /scripts/health_test.js
```

**Kịch bản:**
- 30s: Tăng dần lên 10 users
- 1m: Giữ ở 10 users
- 30s: Tăng lên 50 users
- 2m: Giữ ở 50 users
- 30s: Giảm về 0 users

**Thresholds:**
- 95% requests phải < 500ms
- Error rate < 10%

---

### 🔥 Test 2: Full Load Test (Comprehensive)

**Mô tả:** Test toàn diện với nhiều scenarios thực tế

```bash
docker compose run --rm k6 run /scripts/full_load_test.js
```

**Scenarios:**
1. **Get Books List** - Lấy danh sách sách
2. **Get Book Details** - Xem chi tiết sách
3. **Search Books** - Tìm kiếm sách

**Kịch bản:**
- 1m: Warm-up với 20 users
- 3m: Normal load với 50 users
- 2m: Peak load với 100 users
- 3m: Scale down về 50 users
- 1m: Cool-down về 0 users

**Thresholds:**
- p95 < 1000ms
- p99 < 2000ms
- Error rate < 5%

---

### 💥 Test 3: Spike Test (Stress Test)

**Mô tả:** Test khả năng chịu tải đột ngột (sudden traffic spike)

```bash
docker compose run --rm k6 run /scripts/spike_test.js
```

**Kịch bản:**
- 30s: Normal load (10 users)
- 10s: **SPIKE!** Tăng đột ngột lên 200 users
- 1m: Giữ ở 200 users
- 30s: Về lại normal (10 users)
- 30s: Cool-down (0 users)

**Thresholds:**
- p95 < 2000ms (lenient hơn)
- Error rate < 20% (cho phép lỗi cao hơn trong spike)

---

## 📝 Xem Kết Quả Test

### 1️⃣ Terminal Output

K6 sẽ hiển thị real-time metrics ngay trên terminal:

```
     ✓ health status is 200
     ✓ health response time < 200ms

     checks.........................: 100.00% ✓ 4567    ✗ 0
     data_received..................: 1.2 MB  12 kB/s
     data_sent......................: 456 kB  4.6 kB/s
     http_req_blocked...............: avg=1.23ms   min=0.5ms    med=0.9ms    max=45ms
     http_req_duration..............: avg=145.67ms min=32.45ms  med=120.3ms  max=998ms
     http_reqs......................: 4567    45.67/s
     vus............................: 10      min=0  max=50
```

### 2️⃣ Grafana Dashboard

Truy cập http://localhost:3001 để xem:
- **Real-time graphs** của metrics
- **Historical data** của các test trước
- **Visual alerts** khi vượt threshold

---

## 🎯 Các Kịch Bản Test Khuyến Nghị

### 📋 Test Plan Cơ Bản

```bash
# Bước 1: Kiểm tra health
docker compose run --rm k6 run /scripts/health_test.js

# Bước 2: Load test toàn diện
docker compose run --rm k6 run /scripts/full_load_test.js

# Bước 3: Stress test
docker compose run --rm k6 run /scripts/spike_test.js
```

### 📋 Test Plan Nâng Cao

```bash
# Chạy test liên tục với custom config
docker compose run --rm k6 run \
  --vus 100 \
  --duration 5m \
  /scripts/health_test.js

# Test với target cụ thể
docker compose run --rm k6 run \
  --stage 2m:100 \
  --stage 5m:100 \
  --stage 2m:0 \
  /scripts/full_load_test.js
```

---

## 🔧 Tùy Chỉnh Test Scripts

### Cấu trúc cơ bản của k6 script:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp-up
    { duration: '3m', target: 10 },  // Stay
    { duration: '1m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

// Test scenario
export default function () {
  const res = http.get('http://api-gateway:8000/your-endpoint/');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Thêm test endpoint mới:

1. Edit file trong `/scripts/`
2. Thêm function test mới
3. Gọi function trong `default function()`
4. Chạy lại test

---

## 🛠️ Troubleshooting

### ❌ Problem: k6 không kết nối được API Gateway

**Solution:**
```bash
# Kiểm tra api-gateway đang chạy
docker compose ps api-gateway

# Kiểm tra network
docker network ls | grep bookstore

# Restart services
docker compose restart api-gateway k6
```

### ❌ Problem: Grafana không hiển thị data

**Solution:**
```bash
# 1. Kiểm tra InfluxDB có data không
docker exec -it influxdb influx -execute 'SHOW DATABASES'

# 2. Kiểm tra datasource trong Grafana
# Vào Grafana → Configuration → Data Sources → InfluxDB
# Test connection

# 3. Chạy lại test để generate data
docker compose run --rm k6 run /scripts/health_test.js
```

### ❌ Problem: Port conflict (3001 already in use)

**Solution:**
```bash
# Sửa port trong docker-compose.yaml
# Thay "3001:3000" thành "3002:3000" hoặc port khác
```

---

## 📈 Metrics Chính Cần Theo Dõi

### 🎯 Performance Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **Response Time (p95)** | < 500ms | 500-1000ms | > 1000ms |
| **Response Time (p99)** | < 1000ms | 1000-2000ms | > 2000ms |
| **Error Rate** | < 1% | 1-5% | > 5% |
| **Throughput** | > 100 req/s | 50-100 req/s | < 50 req/s |

### 📊 K6 Metrics Explained

- **http_req_duration**: Tổng thời gian request (gửi + server xử lý + nhận response)
- **http_req_waiting**: Thời gian chờ server xử lý
- **http_req_blocked**: Thời gian bị block (DNS lookup, TCP connection)
- **http_reqs**: Tổng số requests
- **vus (Virtual Users)**: Số user đồng thời
- **iterations**: Số lần chạy test function

---

## 🎓 Best Practices

### ✅ DO

1. **Chạy test trên môi trường staging** trước khi production
2. **Monitor resources** (CPU, Memory) trong khi test
3. **Tăng tải dần dần** để tránh crash hệ thống
4. **Lưu kết quả test** để so sánh theo thời gian
5. **Test theo user journey thực tế** (login → browse → add to cart → checkout)

### ❌ DON'T

1. ❌ Chạy load test trực tiếp trên production
2. ❌ Test với load quá cao ngay từ đầu
3. ❌ Ignore error logs trong test
4. ❌ Test mà không có monitoring
5. ❌ Quên scale down sau spike test

---

## 🧹 Dọn Dẹp

### Dừng monitoring services

```bash
docker compose stop influxdb grafana
```

### Xóa data và volumes

```bash
# Xóa containers và volumes
docker compose down -v

# Hoặc chỉ xóa monitoring volumes
docker volume rm bookstore-microservices_influxdb_data
docker volume rm bookstore-microservices_grafana_data
```

---

## 📚 Tài Liệu Tham Khảo

- **K6 Documentation**: https://k6.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **InfluxDB Documentation**: https://docs.influxdata.com/
- **K6 Examples**: https://k6.io/docs/examples/

---

## 🤝 Support

Nếu gặp vấn đề, kiểm tra:

1. **Logs của services:**
   ```bash
   docker compose logs influxdb
   docker compose logs grafana
   docker compose logs api-gateway
   ```

2. **Network connectivity:**
   ```bash
   docker compose exec k6 ping api-gateway
   ```

3. **Resource usage:**
   ```bash
   docker stats
   ```

---

**🎉 Chúc bạn test thành công!**

Hệ thống monitoring này giúp bạn:
- ✅ Đánh giá hiệu năng hệ thống
- ✅ Phát hiện bottlenecks
- ✅ Đảm bảo SLA/SLO
- ✅ Cải thiện trải nghiệm người dùng

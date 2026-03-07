# 🚀 Quick Start - Load Testing & Monitoring

## 📊 Architecture

```
k6 (Load Testing) → InfluxDB (Metrics Storage) → Grafana (Visualization)
                 ↓
            API Gateway & Microservices
```

## ⚡ Quick Start (3 Steps)

### 1. Start Monitoring Stack
```bash
docker compose up -d influxdb grafana
```

### 2. Access Grafana
```
URL:      http://localhost:3001
Username: admin
Password: admin
```

### 3. Run a Load Test
```bash
# Basic health check test
docker compose run --rm k6 run /scripts/health_test.js

# Full load test
docker compose run --rm k6 run /scripts/full_load_test.js

# Spike/stress test
docker compose run --rm k6 run /scripts/spike_test.js
```

## 📁 Test Scripts

| Script | Description | Duration | Max Users |
|--------|-------------|----------|-----------|
| `health_test.js` | Basic health endpoint test | 4 min | 50 |
| `full_load_test.js` | Comprehensive API test | 10 min | 100 |
| `spike_test.js` | Sudden traffic spike test | 3 min | 200 |

## 📈 View Results

1. **Terminal**: Real-time stats during test
2. **Grafana Dashboard**: http://localhost:3001 → "K6 Load Testing Dashboard"

## 🎯 Key Metrics

- **Response Time (p95)**: < 500ms ✅
- **Error Rate**: < 1% ✅
- **Throughput**: requests/second
- **Virtual Users**: concurrent users

## 📚 Full Documentation

See [LOAD_TESTING_GUIDE.md](./LOAD_TESTING_GUIDE.md) for detailed instructions.

## 🧹 Cleanup

```bash
# Stop monitoring
docker compose stop influxdb grafana

# Remove volumes
docker compose down -v
```

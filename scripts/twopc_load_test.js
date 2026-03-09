import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics để tracking chi tiết trong Grafana
const successfulOrders = new Counter('successful_orders');
const failedOrders = new Counter('failed_orders');
const twoPCLatency = new Trend('twopc_latency');

/**
 * Load Test Configuration
 * Mục tiêu: Demo 2PC performance degradation khi load tăng dần
 * 
 * Stage 1: Light load - hệ thống healthy
 * Stage 2-3: Moderate load - bắt đầu thấy latency tăng
 * Stage 4: Heavy load - errors xuất hiện, RPS plateau
 * Stage 5: Extreme load - high error rate, RT rất cao
 */
export const options = {
  stages: [
    { duration: '20s', target: 30 },   // Stage 1: 30 VUs
    { duration: '20s', target: 80 },   // Stage 2: 80 VUs  
    { duration: '20s', target: 150 },  // Stage 3: 150 VUs
    { duration: '20s', target: 250 },  // Stage 4: 250 VUs (errors start)
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<30000'], // Cho phép chậm để test chạy hết
    'http_req_failed': ['rate<0.95'],     // Cho phép 95% lỗi ở peak
  },
};

const BASE_URL = 'http://order-service:8080';

// Fixed payload - chung cho tất cả requests
const FIXED_PAYLOAD = JSON.stringify({
    customer_id: "c119ad44-bf19-4386-9caf-327c2fb0996e",
    shipping_address_id: "123 Main Street, District 1, Ho Chi Minh City",
    payment_method: "credit_card"
});

/**
 * Main test function
 */
export default function () {
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: '5s', // Request timeout sau 5s
    };
    
    const startTime = new Date().getTime();
    
    // POST request to 2PC endpoint
    const response = http.post(`${BASE_URL}/orders/saga`, FIXED_PAYLOAD, params);
    
    const duration = new Date().getTime() - startTime;
    
    // Track custom latency metric
    twoPCLatency.add(duration);
    
    // Check response
    const isSuccess = response.status === 200 || response.status === 201;
    
    if (isSuccess) {
        successfulOrders.add(1);
    } else {
        failedOrders.add(1);
        if (__ENV.DEBUG === 'true') {
            console.log(`Failed: Status=${response.status}, Error=${response.error}`);
        }
    }
    
    // Sleep ngắn để tạo high concurrency → contention → RT tăng → errors
    sleep(0.1 + Math.random() * 0.2); // 100-300ms → mỗi VU ~3-5 req/s
}

/**
 * Setup - chạy trước test
 */
export function setup() {
    console.log('');
    console.log('Expected Behavior:');
    console.log('  Stage 1 (0-20s):   30 VUs  → ~100-150 RPS,  RT 1-2s,   Error 0%');
    console.log('  Stage 2 (20-40s):  80 VUs  → ~250-350 RPS,  RT 2-4s,   Error 5-15%');
    console.log('  Stage 3 (40-60s):  150 VUs → ~450-600 RPS,  RT 4-8s,   Error 20-40%');
    console.log('  Stage 4 (60-80s):  250 VUs → ~500-700 RPS,  RT 10-20s, Error 50-80%');
    console.log('  Stage 5 (80-90s):  Ramp down');
}

/**
 * Teardown - chạy sau test
 */
export function teardown(data) {
    console.log('');
    console.log('Test completed - Check Grafana for results');
}

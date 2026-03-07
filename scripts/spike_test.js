import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Spike test: Sudden traffic increase
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Normal load
    { duration: '10s', target: 200 },  // Sudden spike!
    { duration: '1m', target: 200 },   // Stay at spike
    { duration: '30s', target: 10 },   // Back to normal
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // More lenient during spike
    http_req_failed: ['rate<0.2'],     // Allow higher error rate
  },
};

const BASE_URL = 'http://api-gateway:8000';

export default function () {
  const res = http.get(`${BASE_URL}/health/`);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
  });
  
  errorRate.add(!success);
  sleep(0.5);
}

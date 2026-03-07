import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },    // Warm-up: 20 users
    { duration: '3m', target: 50 },    // Normal load: 50 users
    { duration: '2m', target: 100 },   // Peak load: 100 users
    { duration: '3m', target: 50 },    // Scale down to normal
    { duration: '1m', target: 0 },     // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = 'http://api-gateway:8000';

// Test scenarios
export default function () {
  // Scenario 1: Get books list
  testGetBooks();
  sleep(2);
  
  // Scenario 2: Get book details
  testGetBookDetails();
  sleep(2);
  
  // Scenario 3: Search books
  testSearchBooks();
  sleep(3);
}

function testGetBooks() {
  const res = http.get(`${BASE_URL}/books/`);
  
  const success = check(res, {
    'get books status is 200': (r) => r.status === 200,
    'get books response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  apiLatency.add(res.timings.duration);
  errorRate.add(!success);
}

function testGetBookDetails() {
  const bookId = Math.floor(Math.random() * 100) + 1;
  const res = http.get(`${BASE_URL}/books/${bookId}/`);
  
  const success = check(res, {
    'get book details response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  apiLatency.add(res.timings.duration);
  errorRate.add(!success);
}

function testSearchBooks() {
  const searchTerms = ['python', 'javascript', 'java', 'docker', 'kubernetes'];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  const res = http.get(`${BASE_URL}/books/search/?q=${term}`);
  
  const success = check(res, {
    'search response time < 800ms': (r) => r.timings.duration < 800,
  });
  
  apiLatency.add(res.timings.duration);
  errorRate.add(!success);
}

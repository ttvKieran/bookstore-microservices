# Frontend-Web Service

Service thứ 13 trong hệ thống BookStore Microservices - Giao diện người dùng ReactJS.

## 📋 Tổng quan

Frontend-web là ứng dụng React single-page application (SPA) cung cấp giao diện người dùng cho hệ thống BookStore. Ứng dụng giao tiếp với backend thông qua API Gateway và cung cấp đầy đủ tính năng quản lý sách, giỏ hàng, đặt hàng và tài khoản người dùng.

## 🎯 Tính năng

### ✅ Đã hoàn thành (Phase 1-7)

#### Phase 1: Cấu trúc dự án & Layout
- ✅ Khởi tạo React project với Vite
- ✅ Cài đặt Material-UI, React Router, Axios
- ✅ Layout components (Header, Footer)
- ✅ AuthContext cho quản lý authentication
- ✅ Axios interceptors cho JWT tokens

#### Phase 2: Authentication
- ✅ Trang Login
- ✅ Trang Register
- ✅ Protected routes (ProtectedRoute component)
- ✅ JWT token management với auto-refresh

#### Phase 3: Catalog & Search
- ✅ Trang Search với book grid display
- ✅ Trang Book Detail với reviews và similar books
- ✅ Review submission và upvote functionality

#### Phase 4: Shopping Cart
- ✅ CartContext cho global cart state management
- ✅ Trang Cart với CRUD operations
- ✅ Quantity controls, remove items
- ✅ Real-time cart item count trong Header

#### Phase 5: Checkout & User Management
- ✅ Multi-step Checkout (Shipping → Payment → Review)
- ✅ Order Confirmation page
- ✅ Profile editing với validation
- ✅ Order history display
- ✅ NotificationContext cho snackbar alerts

#### Phase 6: UX Enhancements
- ✅ Loading states với Skeleton components
- ✅ Error handling với user-friendly messages
- ✅ Responsive design với Material-UI Grid
- ✅ Success/Error notifications

#### Phase 7: Dockerization
- ✅ Multi-stage Dockerfile (Node build + Nginx serve)
- ✅ Nginx configuration cho SPA routing
- ✅ Docker Compose integration
- ✅ .dockerignore file

## 🛠️ Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: Context API (AuthContext, CartContext, NotificationContext)
- **Icons**: @mui/icons-material
- **Deployment**: Nginx (Docker)

## 📁 Cấu trúc thư mục

```
frontend-web/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── layout/         # Header, Footer
│   │   └── routing/        # ProtectedRoute
│   ├── contexts/           # Context providers
│   │   ├── AuthContext.jsx
│   │   ├── CartContext.jsx
│   │   └── NotificationContext.jsx
│   ├── pages/              # Page components
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── SearchPage.jsx
│   │   ├── BookDetail.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── OrderConfirmation.jsx
│   │   ├── Profile.jsx
│   │   └── Orders.jsx
│   ├── services/           # API service layer
│   │   └── api.js
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── .env.production         # Production environment variables
├── .dockerignore           # Docker ignore rules
├── Dockerfile              # Multi-stage Docker build
├── nginx.conf              # Nginx configuration
├── package.json
└── vite.config.js
```

## 🚀 Development Setup

### Prerequisites

- Node.js 20+ (khuyến nghị 20.19+)
- npm hoặc yarn

### Installation

1. Di chuyển vào thư mục frontend-web:
```bash
cd frontend-web
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env.local` cho development:
```env
VITE_API_BASE_URL=http://localhost:8000
```

4. Chạy development server:
```bash
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:5173

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🐳 Docker Deployment

### Build Docker image

```bash
# Từ thư mục gốc (assignment5)
docker-compose build frontend-web
```

### Run với Docker Compose

```bash
# Start tất cả services (bao gồm frontend-web)
docker-compose up -d

# Hoặc chỉ start frontend-web và dependencies
docker-compose up -d frontend-web
```

Frontend sẽ chạy tại: http://localhost:3000

### Docker Configuration

- **Port**: 3000 (mapped từ container port 80)
- **Base Image**: node:20-alpine (build stage), nginx:alpine (production stage)
- **Nginx**: Configured cho React SPA routing, gzip compression, caching
- **Dependencies**: api-gateway service

## 🔗 API Integration

Frontend giao tiếp với backend thông qua **API Gateway** tại `http://localhost:8000`.

### API Services Used

| Service | Endpoint | Description |
|---------|----------|-------------|
| Auth | `/api/auth/*` | Login, Register, Token refresh |
| Books | `/api/books/*` | Get books, search, book details |
| Cart | `/api/cart/*` | Cart CRUD operations |
| Orders | `/api/orders/*` | Create order, order history |
| Customers | `/api/customers/*` | Profile management |
| Reviews | `/api/reviews/*` | Reviews & ratings |
| Recommendations | `/api/recommendations/*` | Similar books |

### Authentication Flow

1. User login → JWT access & refresh tokens stored in localStorage
2. Axios interceptor tự động inject access token vào headers
3. Khi 401 error → Auto refresh token và retry request
4. Logout → Clear tokens và redirect to login

## 🎨 UI/UX Features

### Material-UI Components

- **Navigation**: AppBar, Drawer (responsive)
- **Forms**: TextField, Button, Select with validation
- **Display**: Card, Grid, Typography, Chip
- **Feedback**: Snackbar, CircularProgress, Alert
- **Layout**: Container, Box, Stack

### Responsive Design

- Mobile-first approach
- Breakpoints: xs, sm, md, lg, xl
- Responsive Grid layout
- Mobile navigation drawer

### User Notifications

NotificationContext cung cấp global notification system:

```javascript
const { showSuccess, showError, showWarning, showInfo } = useNotification();

showSuccess('Item added to cart!');
showError('Failed to process order');
```

## 🔒 Security

- JWT token storage trong localStorage
- Auto token refresh trước khi expire
- Protected routes yêu cầu authentication
- Axios interceptors xử lý unauthorized errors
- Nginx security headers (X-Frame-Options, CSP, etc.)

## 📝 Assumptions & Decisions

### API Integration
- API Gateway là điểm duy nhất để giao tiếp với backend
- JWT access token có thời gian expire ngắn
- Refresh token được sử dụng để renew access token

### State Management
- Context API được chọn thay vì Redux (đơn giản hơn cho app size này)
- AuthContext: Global authentication state
- CartContext: Shopping cart state với API sync
- NotificationContext: Global snackbar notifications

### Routing
- React Router với client-side routing
- Protected routes redirect về login khi chưa authenticated
- Nested routes cho consistency

### Build & Deployment
- Vite build tạo optimized production bundle
- Nginx serve static files trong Docker
- Multi-stage build giảm image size
- Environment variables baked in at build time

## 🐛 Troubleshooting

### Port conflicts

Nếu port 3000 hoặc 5173 đã được sử dụng:

**Development:**
```bash
# Vite tự động chọn port khác nếu 5173 bận
npm run dev
```

**Docker:**
```yaml
# Sửa trong docker-compose.yaml
ports:
  - "3001:80"  # Thay 3000 bằng port khác
```

### API Connection Issues

Kiểm tra API Gateway đang chạy:
```bash
curl http://localhost:8000/health
```

Kiểm tra CORS configuration trong API Gateway nếu gặp CORS errors.

### Build Errors

Clear cache và reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📚 Additional Documentation

- [API Design](../docs/api-design.md)
- [Architecture Overview](../docs/architecture-overview.md)
- [Run Instructions](../docs/run-instructions.md)

## 👥 Development Team

Service 13 - Frontend Web Interface

## 📄 License

Part of BookStore Microservices Assignment 5


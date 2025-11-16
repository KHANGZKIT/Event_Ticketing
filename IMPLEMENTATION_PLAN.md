# 🚀 Kế hoạch Triển khai - High Priority Features

## 📋 Tổng quan

Tài liệu này mô tả chi tiết cách triển khai 5 tính năng ưu tiên cao nhất của dự án Event Ticketing.

---

## 1. 💳 Payment Integration

### Mục tiêu
Tích hợp payment gateway (MoMo, VNPay) để hoàn thiện flow thanh toán thực tế.

### Hiện trạng
- ✅ Model `Payment` đã có trong DB schema
- ✅ Order có status `pending`, `paid`, `failed`, `cancelled`
- ❌ Chưa có payment service
- ❌ Chưa có webhook handlers
- ❌ Checkout hiện tại set order status = `paid` ngay (chưa qua payment)

### Các bước triển khai

#### Bước 1: Tạo Payment Service Module
```
services/events/src/modules/payments/
├── payments.routes.js
├── payments.controller.js
├── payments.service.js
├── payments.schema.js
├── providers/
│   ├── momo.provider.js
│   ├── vnpay.provider.js
│   └── base.provider.js
└── webhooks/
    ├── momo.webhook.js
    └── vnpay.webhook.js
```

#### Bước 2: Cập nhật Checkout Flow
1. **Thay đổi checkout service**:
   - Tạo Order với status = `pending` (thay vì `paid`)
   - Tạo Payment record với status = `init`
   - Trả về `paymentUrl` để redirect user

2. **Payment initiation**:
   ```javascript
   POST /api/payments/create
   {
     "orderId": "...",
     "provider": "momo" | "vnpay",
     "returnUrl": "...",
     "cancelUrl": "..."
   }
   ```

3. **Webhook handlers**:
   - `POST /api/payments/webhooks/momo`
   - `POST /api/payments/webhooks/vnpay`
   - Verify signature
   - Update Payment status
   - Update Order status
   - Release holds nếu payment failed

#### Bước 3: Cập nhật Frontend
- PurchaseUI: Redirect đến payment gateway
- Handle return từ payment gateway
- Polling hoặc webhook để check payment status

### Dependencies cần thêm
```json
{
  "crypto": "^1.0.1",  // đã có
  "axios": "^1.13.2",  // đã có
  "moment": "^2.29.4"   // cho timestamp
}
```

### Environment Variables
```env
# services/events/.env
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_ENVIRONMENT=sandbox|production

VNPAY_TMN_CODE=your_tmn_code
VNPAY_SECRET_KEY=your_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### Ước tính thời gian
- **Payment Service**: 2-3 ngày
- **MoMo Integration**: 1-2 ngày
- **VNPay Integration**: 1-2 ngày
- **Webhook Handlers**: 1 ngày
- **Frontend Integration**: 1-2 ngày
- **Testing**: 1-2 ngày

**Tổng: 7-12 ngày**

---

## 2. 🧪 Testing

### Mục tiêu
Thiết lập testing framework và viết tests cho các module quan trọng.

### Hiện trạng
- ❌ Không có test files
- ❌ Không có test framework setup
- ❌ Không có test scripts

### Các bước triển khai

#### Bước 1: Setup Testing Framework
```bash
npm install --save-dev jest @jest/globals supertest
```

Cấu hình `jest.config.js`:
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^@app/db$': '<rootDir>/../../packages/db/src/client.js'
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/server.js'
  ]
};
```

#### Bước 2: Test Structure
```
services/
├── auth/
│   └── src/
│       └── __tests__/
│           ├── modules/
│           │   └── auth/
│           │       ├── auth.service.test.js
│           │       └── auth.controller.test.js
│           └── middlewares/
│               └── authGuard.test.js
└── events/
    └── src/
        └── __tests__/
            ├── modules/
            │   ├── events/
            │   ├── shows/
            │   ├── holds/
            │   ├── orders/
            │   └── tickets/
            └── integration/
                └── checkout-flow.test.js
```

#### Bước 3: Viết Tests theo thứ tự ưu tiên

**Priority 1 - Core Services:**
1. Auth service (login, register, JWT)
2. Holds service (create, release, consume)
3. Orders service (checkout)
4. Tickets service (check-in)

**Priority 2 - Controllers:**
1. Events controller
2. Shows controller
3. Holds controller

**Priority 3 - Integration Tests:**
1. Full checkout flow (hold → checkout → ticket)
2. Payment flow (pending → paid)
3. Check-in flow

#### Bước 4: Test Database Setup
- Dùng test database riêng
- Setup/teardown scripts
- Seed test data

### Test Scripts trong package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:auth": "jest services/auth",
    "test:events": "jest services/events"
  }
}
```

### Ước tính thời gian
- **Setup framework**: 0.5 ngày
- **Core service tests**: 3-4 ngày
- **Controller tests**: 2-3 ngày
- **Integration tests**: 2-3 ngày
- **CI/CD integration**: 1 ngày

**Tổng: 8.5-11.5 ngày**

---

## 3. 🔒 Security Enhancements

### Mục tiêu
Tăng cường bảo mật cho ứng dụng.

### Hiện trạng
- ✅ Helmet middleware (có)
- ✅ CORS (có)
- ✅ JWT authentication (có)
- ⚠️ Rate limiting (có config nhưng chưa implement đầy đủ)
- ❌ Input sanitization
- ❌ CSRF protection
- ❌ Request validation đầy đủ

### Các bước triển khai

#### Bước 1: Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
// services/gateway/src/middlewares/rateLimit.js
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // 5 requests
  message: 'Too many login attempts, please try again later'
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 100 // 100 requests
});
```

#### Bước 2: Input Sanitization
```bash
npm install express-validator
```

```javascript
// services/events/src/middlewares/sanitize.js
import { body, validationResult } from 'express-validator';

export const sanitizeInput = [
  body('email').trim().normalizeEmail(),
  body('fullName').trim().escape(),
  // ...
];
```

#### Bước 3: CSRF Protection
```bash
npm install csurf
```

```javascript
// services/gateway/src/middlewares/csrf.js
import csrf from 'csurf';

export const csrfProtection = csrf({ cookie: true });
```

#### Bước 4: Security Headers (enhance Helmet)
```javascript
// services/gateway/src/middlewares/security.js
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
});
```

#### Bước 5: Password Policy
- Minimum length: 8 characters
- Require uppercase, lowercase, number
- Password hashing với bcrypt (đã có)

#### Bước 6: SQL Injection Prevention
- Prisma đã protect, nhưng cần review raw queries
- Validate all inputs

### Ước tính thời gian
- **Rate limiting**: 0.5 ngày
- **Input sanitization**: 1 ngày
- **CSRF protection**: 0.5 ngày
- **Security headers**: 0.5 ngày
- **Password policy**: 0.5 ngày
- **Security audit**: 1 ngày

**Tổng: 4 ngày**

---

## 4. ⚠️ Error Handling

### Mục tiêu
Cải thiện xử lý lỗi để có thông báo rõ ràng và logging tốt hơn.

### Hiện trạng
- ✅ Basic error handler (ZodError, status codes)
- ⚠️ Error handling không nhất quán
- ❌ Structured error responses
- ❌ Error logging
- ❌ Error tracking

### Các bước triển khai

#### Bước 1: Custom Error Classes
```javascript
// packages/shared/src/errors/AppError.js
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, issues = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.issues = issues;
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message, conflicts = []) {
    super(message, 409, 'CONFLICT');
    this.conflicts = conflicts;
  }
}
```

#### Bước 2: Enhanced Error Handler
```javascript
// services/events/src/middlewares/error.js
import { ZodError } from 'zod';
import { AppError } from '@app/shared/errors/AppError';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        issues: err.issues
      }
    });
  }

  // Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.issues && { issues: err.issues }),
        ...(err.conflicts && { conflicts: err.conflicts })
      }
    });
  }

  // Unknown errors
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
```

#### Bước 3: Async Error Wrapper
```javascript
// services/events/src/utils/asyncHandler.js
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage:
export const checkout = asyncHandler(async (req, res) => {
  const result = await checkoutService(req.userId, req.body);
  res.status(201).json(result);
});
```

#### Bước 4: Error Logging với Winston/Pino
```bash
npm install winston
```

```javascript
// services/events/src/utils/logger.js
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Ước tính thời gian
- **Custom error classes**: 0.5 ngày
- **Enhanced error handler**: 1 ngày
- **Async error wrapper**: 0.5 ngày
- **Logging setup**: 1 ngày
- **Refactor existing code**: 2 ngày

**Tổng: 5 ngày**

---

## 5. 📊 Logging & Monitoring

### Mục tiêu
Thiết lập logging và monitoring để theo dõi hệ thống.

### Hiện trạng
- ✅ Basic logging với `morgan` (HTTP requests)
- ❌ Structured logging
- ❌ Error tracking
- ❌ Metrics collection
- ❌ APM

### Các bước triển khai

#### Bước 1: Structured Logging với Winston
```bash
npm install winston winston-daily-rotate-file
```

```javascript
// packages/shared/src/logger/index.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Daily rotate file
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Error log
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});
```

#### Bước 2: Request Logging Middleware
```javascript
// services/events/src/middlewares/requestLogger.js
import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
}
```

#### Bước 3: Metrics Collection
```bash
npm install prom-client
```

```javascript
// services/events/src/metrics/index.js
import client from 'prom-client';

export const register = new client.Registry();

// HTTP metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Business metrics
export const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created'
});

export const ticketsCheckedIn = new client.Counter({
  name: 'tickets_checked_in_total',
  help: 'Total number of tickets checked in'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(ordersCreated);
register.registerMetric(ticketsCheckedIn);
```

#### Bước 4: Metrics Endpoint
```javascript
// services/events/src/app.js
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

#### Bước 5: Error Tracking (Sentry - Optional)
```bash
npm install @sentry/node
```

```javascript
// services/events/src/utils/sentry.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

export { Sentry };
```

#### Bước 6: Health Check Endpoint
```javascript
// services/events/src/app.js
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'events',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(c => c === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Ước tính thời gian
- **Structured logging**: 1 ngày
- **Request logging**: 0.5 ngày
- **Metrics collection**: 1.5 ngày
- **Health checks**: 0.5 ngày
- **Error tracking (optional)**: 1 ngày

**Tổng: 4.5-5.5 ngày**

---

## 📅 Timeline Tổng thể

### Phase 1 (Tuần 1-2): Foundation
- Error Handling (5 ngày)
- Logging & Monitoring (5 ngày)

### Phase 2 (Tuần 3-4): Security & Testing
- Security Enhancements (4 ngày)
- Testing Setup & Core Tests (6 ngày)

### Phase 3 (Tuần 5-6): Payment
- Payment Integration (10 ngày)

**Tổng thời gian ước tính: 30 ngày (6 tuần)**

---

## 🎯 Thứ tự ưu tiên đề xuất

1. **Error Handling** - Cần thiết ngay, ảnh hưởng đến tất cả modules
2. **Logging & Monitoring** - Quan trọng để debug và monitor
3. **Security Enhancements** - Bảo vệ hệ thống
4. **Testing** - Đảm bảo chất lượng
5. **Payment Integration** - Hoàn thiện business flow

---

## 📝 Notes

- Mỗi feature nên được implement trong branch riêng
- Code review trước khi merge
- Update documentation sau mỗi feature
- Test thoroughly trước khi deploy

---

*Cập nhật: $(date)*


# Event Ticketing System

Một hệ thống bán vé sự kiện hoàn chỉnh được xây dựng theo kiến trúc **Microservices / SOA** với đầy đủ các tính năng: xác thực, phân quyền RBAC, quản lý sự kiện & suất diễn, sơ đồ ghế ngồi, giữ ghế real-time, thanh toán trực tuyến, check-in QR và dashboard quản trị.

> 🚀 **Quick Start**: Xem [SETUP.md](./SETUP.md) để setup dự án nhanh chóng với dữ liệu mẫu đầy đủ.

---

## ✨ Tính năng chính

### 🔐 Xác thực & Phân quyền
- JWT Auth (register/login) với mã hóa bcrypt
- RBAC với 3 vai trò: `admin`, `staff`, `user`
- Token verification chung giữa các services

### 🎫 Quản lý Sự kiện
- CRUD sự kiện (Event) với soft delete
- Quản lý suất diễn (Show) với trạng thái `scheduled`, `cancelled`, `completed`
- Hỗ trợ phân loại sự kiện (category)
- Quản lý địa điểm (Venue)

### 🪑 Sơ đồ ghế & Giữ chỗ
- Seatmap templates (JSON) với price tiers
- Giữ ghế real-time với Redis TTL
- WebSocket thông báo trạng thái ghế (Socket.IO)
- Availability API: `sold` / `held` / `available`

### 💳 Thanh toán & Đơn hàng
- Checkout flow với idempotency key
- Tích hợp thanh toán đa cổng: MoMo, VNPay
- Quản lý mã giảm giá (Coupon) - fixed & percent
- Trạng thái đơn hàng: `pending`, `paid`, `failed`, `cancelled`

### 🎟️ Vé & Check-in
- Tạo vé với mã QR unique
- Check-in idempotent qua mã QR
- Ngăn chặn double-booking qua unique constraint

### 📊 Dashboard & Thống kê
- Real-time analytics cho admin
- Theo dõi doanh thu, số vé bán
- Monitor holds đang active

---

## 🧱 Kiến trúc hệ thống

```
Event_Ticketing/
├── services/
│   ├── auth/           # JWT Authentication + RBAC
│   ├── events/         # Events/Shows/Seatmap/Holds/Orders/Payments/Tickets/Dashboard
│   └── gateway/        # API Gateway (Reverse Proxy)
├── packages/
│   └── db/             # Prisma schema & client (shared workspace)
├── frontend/
│   ├── HomePage/       # Trang chủ hiển thị sự kiện
│   ├── LoginUI/        # Đăng nhập/Đăng ký
│   ├── Ticketbox/      # Chi tiết sự kiện
│   ├── shows/          # Danh sách suất diễn
│   ├── seatmapUI/      # Chọn ghế ngồi
│   ├── PurchaseUI/     # Thanh toán
│   ├── my_ticket/      # Vé của tôi
│   ├── DashboardUI/    # Quản trị viên
│   └── shared/         # CSS/JS dùng chung
├── scripts/            # Utility scripts (scraping, seeding, migration)
├── docs/               # API docs, Postman collection, diagrams
└── docker-compose.yml  # PostgreSQL 16 + Redis 7
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js (ESM), Express 5 |
| **Database** | PostgreSQL 16 + Prisma ORM |
| **Cache/Queue** | Redis 7 (holds, real-time) |
| **Auth** | JWT (HS256), bcrypt |
| **Real-time** | Socket.IO |
| **Validation** | Zod |
| **QR Code** | qrcode library |
| **Dev Tools** | npm workspaces, nodemon |
| **Container** | Docker Compose |

---

## 🗃 Database Schema

Prisma schema với **12 models** chính:

```
┌─────────────────────────────────────────────────────────────┐
│  RBAC                                                        │
│  ├── User (email, passwordHash, fullName)                   │
│  ├── Role (admin, staff, user)                              │
│  └── UserRole (many-to-many)                                │
├─────────────────────────────────────────────────────────────┤
│  Venue & SeatMap                                            │
│  ├── Venue (name, city, address)                            │
│  └── SeatMap (name, schema JSON)                            │
├─────────────────────────────────────────────────────────────┤
│  Event & Show                                               │
│  ├── Event (name, city, cover, category, description)       │
│  ├── Show (startsAt, venue, seatMapId, status)              │
│  └── ShowTicketType (name, price, capacity)                 │
├─────────────────────────────────────────────────────────────┤
│  Order & Payment                                            │
│  ├── Order (userId, showId, amount, status, couponId)       │
│  ├── Payment (provider, providerRef, status)                │
│  ├── Ticket (showId, seatId, code, checkedInAt)             │
│  ├── Coupon (code, discountType, discountValue)             │
│  └── IdempotencyKey (checkout safety)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Environment Variables

### packages/db/prisma/.env
```env
DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public"
```

### services/auth/.env
```env
PORT=4101
JWT_SECRET=your_super_secret_256bits
```

### services/events/.env
```env
PORT=4102
JWT_SECRET=your_super_secret_256bits
HOLD_TTL_SECONDS=300
REDIS_URL=redis://localhost:6379

# Payment providers
MOMO_PARTNER_CODE=...
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
```

### services/gateway/.env
```env
PORT=4000
AUTH_URL=http://localhost:4101
EVENTS_URL=http://localhost:4102
```

> ⚠️ **Lưu ý:** `JWT_SECRET` phải giống nhau giữa tất cả services.

---

## 📦 Cài đặt & Chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Khởi động Docker (PostgreSQL + Redis)
```bash
docker-compose up -d
```

### 3. Migrate database
```bash
npm run -w packages/db migrate:dev -- --name init
# hoặc quick sync:
npm run -w packages/db db:push
```

### 4. Seed dữ liệu
```bash
npm run seed:auto    # Seed tự động
npm run seed:users   # Seed users
```

### 5. Chạy services
```bash
npm run -w services/auth dev      # Port 4101
npm run -w services/events dev    # Port 4102
npm run -w services/gateway dev   # Port 4000
```

---

## 🔌 API Endpoints

### Gateway Routes (Port 4000)

| Route | Service | Description |
|-------|---------|-------------|
| `/api/auth/*` | auth:4101 | Đăng ký, đăng nhập |
| `/api/events/*` | events:4102 | CRUD sự kiện |
| `/api/shows/*` | events:4102 | Suất diễn & seatmap |
| `/api/holds/*` | events:4102 | Giữ ghế |
| `/api/orders/*` | events:4102 | Đơn hàng |
| `/api/checkout/*` | events:4102 | Thanh toán |
| `/api/tickets/*` | events:4102 | Vé & check-in |
| `/api/payments/*` | events:4102 | Payment callbacks |
| `/api/coupons/*` | events:4102 | Mã giảm giá |
| `/api/dashboard/*` | events:4102 | Admin stats |

### Auth API
```bash
POST /api/auth/register    # { email, password, fullName }
POST /api/auth/login       # { email, password } → { token }
GET  /api/auth/me          # Bearer → { id, email, roles }
```

### Events API
```bash
GET    /api/events              # Danh sách sự kiện
GET    /api/events/:id          # Chi tiết sự kiện
GET    /api/events/:id/shows    # Suất diễn của sự kiện
POST   /api/events              # Tạo sự kiện (admin)
PUT    /api/events/:id          # Cập nhật (admin)
DELETE /api/events/:id          # Xóa mềm (admin)
```

### Shows & Seatmap API
```bash
GET /api/shows/:id              # Chi tiết suất diễn
GET /api/shows/:id/seatmap      # Sơ đồ ghế
GET /api/shows/:id/availability # Trạng thái ghế (sold/held/available)
```

### Holds API (Redis-based)
```bash
POST   /api/holds               # { showId, seats } → hold ghế (TTL 300s)
DELETE /api/holds/:id           # Hủy hold
GET    /api/holds/active        # Holds đang active (admin)
```

### Checkout & Orders API
```bash
POST /api/checkout              # { showId, seats, paymentProvider, couponCode? }
GET  /api/orders/my             # Đơn hàng của user
GET  /api/orders/:id            # Chi tiết đơn hàng
```

### Tickets API
```bash
GET  /api/tickets/my            # Vé của user
POST /api/tickets/:id/checkin   # Check-in (staff)
GET  /api/tickets/code/:code    # Lookup bằng mã QR
```

---

## 🧪 Scripts hữu ích

| Script | Mô tả |
|--------|-------|
| `npm run scrape:ticketbox` | Scrape sự kiện từ Ticketbox |
| `npm run scrape:single` | Scrape một sự kiện cụ thể |
| `npm run export:data` | Export dữ liệu ra JSON |
| `npm run import:data` | Import dữ liệu từ JSON |
| `npm run migrate:seatmap` | Migrate seatmap vào DB |
| `npm run check:holds` | Kiểm tra Redis holds |
| `npm run seed:auto` | Seed dữ liệu tự động |

---

## 📁 Frontend Modules

| Module | Mô tả |
|--------|-------|
| **HomePage** | Trang chủ với slider, danh sách sự kiện theo category |
| **LoginUI** | Form đăng nhập/đăng ký với validation |
| **Ticketbox** | Chi tiết sự kiện, gallery, thông tin địa điểm |
| **shows** | Danh sách suất diễn của một sự kiện |
| **seatmapUI** | Chọn ghế với real-time availability |
| **PurchaseUI** | Xác nhận đơn hàng, chọn phương thức thanh toán |
| **my_ticket** | Xem vé đã mua, mã QR check-in |
| **DashboardUI** | Admin dashboard với charts, thống kê |

---

## 🧭 Gateway Proxy Mapping

```
Frontend (Port 5500)
    ↓
Gateway (Port 4000)
    ├→ /api/auth/*     → http://localhost:4101/auth
    ├→ /api/events/*   → http://localhost:4102/events
    ├→ /api/shows/*    → http://localhost:4102/shows
    ├→ /api/holds/*    → http://localhost:4102/holds
    ├→ /api/orders/*   → http://localhost:4102/orders
    ├→ /api/checkout/* → http://localhost:4102/checkout
    ├→ /api/tickets/*  → http://localhost:4102/tickets
    ├→ /api/payments/* → http://localhost:4102/payments
    └→ /api/dashboard/*→ http://localhost:4102/dashboard
```

---

## 🚨 Troubleshooting

| Lỗi | Nguyên nhân & Giải pháp |
|-----|-------------------------|
| `JWT_SECRET must have a value` | Thiếu `JWT_SECRET` trong `.env` |
| `workspace:* install error` | Chạy `npm install` ở thư mục root |
| `Prisma P1012` | Chỉ được có 1 `datasource db` trong schema |
| `SeatMap Not Found` | `Show.seatMapId` null hoặc thiếu template JSON |
| `401 on /holds` | Thiếu Bearer token hoặc `JWT_SECRET` không khớp |
| `Redis connection failed` | Đảm bảo Redis đang chạy (docker-compose up) |
| `Hold expired` | TTL mặc định 300s, cần checkout trước khi hết hạn |

---

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Hướng dẫn cài đặt chi tiết
- [ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md) - Luồng kiến trúc hệ thống
- [docs/API_TESTING.md](./docs/API_TESTING.md) - Hướng dẫn test API
- [docs/postman_collection.json](./docs/postman_collection.json) - Postman collection

---

## 🧑‍💻 Dev Notes

- **Keep controllers thin** → delegate to services
- **Validate inputs** với Zod at controller boundary
- **Soft delete** (`deletedAt`) + proper DB indexes
- **Idempotency** cho checkout để tránh duplicate orders
- **Redis holds** với TTL để tránh lock ghế vĩnh viễn
- **WebSocket** broadcast khi hold/release để sync realtime

---

## 📌 Roadmap

- [x] Redis-based holds (multi-instance safe)
- [x] Checkout với Order + Ticket transaction
- [x] Payment integration (MoMo, VNPay)
- [x] Ticket QR & check-in
- [x] Dashboard analytics
- [x] Coupon system
- [ ] Email notifications
- [ ] Mobile app
- [ ] CI/CD pipeline

---

## License

MIT (for learning/demo purposes).

---

**Repository:** [github.com/KHANGZKIT/Event_Ticketing](https://github.com/KHANGZKIT/Event_Ticketing)

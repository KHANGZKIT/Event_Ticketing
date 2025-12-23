<div align="center">

# 🎫 Event Ticketing System

**A Modern, Scalable Event Ticketing Platform Built with Microservices Architecture**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red?logo=redis)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API Documentation](#-api-documentation) • [Demo](#-demo)

</div>

---

## 📖 About

A comprehensive **event ticketing system** designed for scalability and real-time performance. Built with **microservices architecture**, this platform handles everything from event management to payment processing, real-time seat reservations, and QR code-based check-ins.

### 🎯 Key Highlights

- **Real-time Seat Management**: Socket.IO-powered live updates with Redis-backed seat holds
- **Secure Payment Integration**: MoMo & VNPay payment gateways with idempotency
- **Role-Based Access Control**: JWT authentication with admin, staff, and user roles
- **Smart Coupons**: Fixed and percentage discount codes with usage limits
- **QR Code Ticketing**: Secure ticket generation and idempotent check-in system
- **Admin Dashboard**: Real-time analytics and comprehensive event management

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with bcrypt password hashing
- Role-based access control (RBAC): `admin`, `staff`, `user`
- Shared token verification across all microservices
- Secure session management

### 🎭 Event Management
- Full CRUD operations with soft delete support
- Multi-venue support with detailed location data
- Category-based event organization
- Rich event metadata (description, cover images, pricing tiers)
- Show/session scheduling with status tracking

### 🪑 Seating & Reservations
- Dynamic seatmap templates with JSON schemas
- Real-time seat availability tracking
- Redis-powered temporary holds with TTL (5 minutes default)
- WebSocket seat status updates
- Prevention of double-booking with database constraints

### 💳 Payments & Orders
- Secure checkout flow with idempotency keys
- Multiple payment provider support (MoMo, VNPay)
- Coupon system with fixed/percentage discounts
- Order lifecycle management: `pending` → `paid` → `completed`
- Automatic ticket generation post-payment

### 🎟️ Ticketing & Check-in
- Unique QR code generation for each ticket
- Idempotent check-in system
- Mobile-friendly ticket display
- Staff check-in interface
- Ticket history tracking

### 📊 Analytics & Monitoring
- Real-time revenue tracking
- Event performance metrics
- Active hold monitoring
- Customer lifetime value analytics
- Exportable reports

---

## 🏗 Architecture

### System Overview

```
┌──────────────┐
│   Frontend   │ → Static HTML/CSS/JS (Live Server 5500)
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│                     API Gateway (4000)                    │
│              Reverse Proxy & Request Routing              │
└───┬─────────────┬─────────────┬────────────────┬─────────┘
    │             │             │                │
    ↓             ↓             ↓                ↓
┌───────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────┐
│   Auth    │ │   Events   │ │   Payments   │ │Dashboard │
│  Service  │ │  Service   │ │   Gateway    │ │ Service  │
│  (4101)   │ │  (4102)    │ │              │ │          │
└─────┬─────┘ └──────┬─────┘ └──────┬───────┘ └────┬─────┘
      │              │              │              │
      └──────────────┴──────────────┴──────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
      ┌─────▼──────┐                  ┌────▼────┐
      │ PostgreSQL │                  │  Redis  │
      │  Database  │                  │  Cache  │
      │   (5432)   │                  │ (6379)  │
      └────────────┘                  └─────────┘
```

### Project Structure

```
Event_Ticketing/
├── 📂 services/
│   ├── auth/              # Authentication & User Management
│   ├── events/            # Core Business Logic (Events/Shows/Orders/Tickets)
│   └── gateway/           # API Gateway & Reverse Proxy
│
├── 📦 packages/
│   └── db/                # Shared Prisma Schema & Client
│
├── 🎨 frontend/
│   ├── HomePage/          # Landing Page with Event Listings
│   ├── LoginUI/           # Authentication Interface
│   ├── Ticketbox/         # Event Details & Gallery
│   ├── shows/             # Show Selection
│   ├── seatmapUI/         # Interactive Seat Map
│   ├── PurchaseUI/        # Checkout & Payment
│   ├── my_ticket/         # User Ticket Portal
│   ├── DashboardUI/       # Admin Control Panel
│   └── shared/            # Reusable CSS/JS Components
│
├── 🛠 scripts/            # Utility Scripts (Scraping, Seeding, Migration)
├── 📚 docs/               # API Documentation & Postman Collections
├── 🐳 docker-compose.yml  # Container Orchestration
└── 📄 package.json        # NPM Workspaces Configuration
```

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | Runtime Environment |
| **Express** | 5.x | Web Framework |
| **Prisma** | 5.x | ORM & Database Toolkit |
| **PostgreSQL** | 16 | Relational Database |
| **Redis** | 7.x | Cache & Real-time Holds |
| **Socket.IO** | 4.x | WebSocket Real-time Updates |
| **JWT** | HS256 | Authentication Tokens |
| **Bcrypt** | - | Password Hashing |
| **Zod** | - | Schema Validation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Vanilla JavaScript** | Core Logic (ES6+) |
| **HTML5/CSS3** | Modern UI Structure |
| **Chart.js** | Dashboard Analytics |
| **QRCode.js** | Ticket QR Generation |
| **Font Awesome** | Icon Library |

### DevOps
- **Docker Compose** - Container orchestration
- **NPM Workspaces** - Monorepo management
- **Nodemon** - Development hot-reload
- **Git** - Version control

---

## 🗃 Database Schema

The system uses **Prisma ORM** with 12 core models:

```sql
┌─────────────────────────────────────────────────────────────┐
│  👥 User Management                                          │
│  ├── User         (id, email, fullName, passwordHash)       │
│  ├── Role         (ADMIN, STAFF, USER)                      │
│  └── UserRole     (many-to-many junction)                   │
├─────────────────────────────────────────────────────────────┤
│  🏛 Venue & Templates                                        │
│  ├── Venue        (name, city, address, capacity)           │
│  └── SeatMap      (name, schema JSON, pricing tiers)        │
├─────────────────────────────────────────────────────────────┤
│  🎭 Events & Shows                                           │
│  ├── Event        (name, description, category, cover)      │
│  ├── Show         (startsAt, venue, status, seatMapId)      │
│  └── TicketType   (name, price, capacity, available)        │
├─────────────────────────────────────────────────────────────┤
│  💰 Commerce                                                 │
│  ├── Order        (userId, amount, status, couponId)        │
│  ├── Payment      (provider, amount, status, metadata)      │
│  ├── Ticket       (code, QR, seatId, checkedInAt)           │
│  ├── Coupon       (code, discount, usageLimit, expiresAt)   │
│  └── Idempotency  (key, requestHash, createdAt)             │
└─────────────────────────────────────────────────────────────┘
```

**Key Relationships:**
- Event → Shows (1:N)
- Show → Tickets (1:N)
- User → Orders (1:N)
- Order → Payment (1:1)
- Order → Tickets (1:N)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **Docker** & **Docker Compose**
- **Git**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/KHANGZKIT/Event_Ticketing.git
   cd Event_Ticketing
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start infrastructure**
   ```bash
   docker-compose up -d
   ```

4. **Configure environment variables**
   
   Create `.env` files in each service directory:

   **packages/db/prisma/.env**
   ```env
   DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public"
   ```

   **services/auth/.env**
   ```env
   PORT=4101
   JWT_SECRET=your_super_secret_256bits_key_here
   ```

   **services/events/.env**
   ```env
   PORT=4102
   JWT_SECRET=your_super_secret_256bits_key_here
   HOLD_TTL_SECONDS=300
   REDIS_URL=redis://localhost:6379
   
   # Payment Providers (Optional)
   MOMO_PARTNER_CODE=
   MOMO_ACCESS_KEY=
   MOMO_SECRET_KEY=
   VNPAY_TMN_CODE=
   VNPAY_HASH_SECRET=
   ```

   **services/gateway/.env**
   ```env
   PORT=4000
   AUTH_URL=http://localhost:4101
   EVENTS_URL=http://localhost:4102
   ```

   > ⚠️ **Important**: `JWT_SECRET` must be identical across all services!

5. **Setup database**
   ```bash
   # Run migrations
   npm run -w packages/db migrate:dev -- --name init
   
   # Or use quick sync (for development)
   npm run -w packages/db db:push
   ```

6. **Seed sample data**
   ```bash
   npm run seed:auto     # Automated seeding
   npm run seed:users    # Seed users only
   ```

7. **Start services**

   Open 3 terminal windows:

   ```bash
   # Terminal 1 - Auth Service
   npm run -w services/auth dev

   # Terminal 2 - Events Service
   npm run -w services/events dev

   # Terminal 3 - Gateway
   npm run -w services/gateway dev
   ```

8. **Open frontend**
   
   Use Live Server on port 5500 or access:
   ```
   http://localhost:5500/frontend/HomePage/
   ```

---

## 📡 API Documentation

### Gateway Endpoints

All requests go through the API Gateway at `http://localhost:4000`

### 🔐 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create new account | ❌ |
| POST | `/api/auth/login` | User login | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |

**Request Example:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password",
    "fullName": "John Doe"
  }'
```

### 🎭 Events

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/events` | List all events | ❌ |
| GET | `/api/events/:id` | Get event details | ❌ |
| GET | `/api/events/:id/shows` | Get event shows | ❌ |
| POST | `/api/events` | Create event | ✅ (admin) |
| PATCH | `/api/events/:id` | Update event | ✅ (admin) |
| DELETE | `/api/events/:id` | Soft delete event | ✅ (admin) |

### 🎪 Shows & Seating

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/shows/:id` | Get show details | ❌ |
| GET | `/api/shows/:id/seatmap` | Get seat map | ❌ |
| GET | `/api/shows/:id/availability` | Check seat status | ❌ |

### 🔒 Holds (Real-time)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/holds` | Reserve seats | ✅ |
| DELETE | `/api/holds/:id` | Release hold | ✅ |
| GET | `/api/holds/active` | List active holds | ✅ (admin) |

**Hold Request:**
```bash
curl -X POST http://localhost:4000/api/holds \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "showId": "show_123",
    "seats": ["A1", "A2", "A3"]
  }'
```

### 💳 Checkout & Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/checkout` | Create order | ✅ |
| GET | `/api/orders/my` | My orders | ✅ |
| GET | `/api/orders/:id` | Order details | ✅ |

### 🎟️ Tickets

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tickets/my` | My tickets | ✅ |
| POST | `/api/tickets/:id/checkin` | Check-in ticket | ✅ (staff) |
| GET | `/api/tickets/code/:code` | Lookup by QR | ✅ (staff) |

### 📊 Dashboard (Admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard/stats` | Get statistics | ✅ (admin) |
| GET | `/api/dashboard/revenue` | Revenue analytics | ✅ (admin) |
| GET | `/api/dashboard/active-holds` | Monitor holds | ✅ (admin) |

---

## 🧪 Testing

### Manual API Testing

Import the Postman collection from `docs/postman_collection.json`

### Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run scrape:ticketbox` | Scrape events from Ticketbox.vn |
| `npm run scrape:single` | Scrape specific event |
| `npm run export:data` | Export data to JSON |
| `npm run import:data` | Import data from JSON |
| `npm run migrate:seatmap` | Migrate seatmap templates |
| `npm run check:holds` | Check Redis holds status |

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| `JWT_SECRET must have a value` | Add `JWT_SECRET` to all service `.env` files |
| `workspace:* install error` | Run `npm install` from project root |
| `Prisma P1012` | Ensure only one `datasource db` in schema |
| `SeatMap Not Found` | Verify `Show.seatMapId` is set correctly |
| `401 Unauthorized on /holds` | Check Bearer token and `JWT_SECRET` consistency |
| `Redis connection failed` | Verify Redis is running: `docker-compose ps` |
| `Hold expired` | Complete checkout within 300 seconds (5 minutes) |
| `Double booking error` | Database constraint working correctly - seats already sold |

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup guide with sample data
- **[ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md)** - System architecture and data flow
- **[docs/API_TESTING.md](./docs/API_TESTING.md)** - API testing guide
- **[docs/postman_collection.json](./docs/postman_collection.json)** - Postman API collection

---

## 🎯 Roadmap

### ✅ Completed
- [x] Microservices architecture with API Gateway
- [x] JWT authentication with RBAC
- [x] Redis-based seat holds (multi-instance safe)
- [x] Transaction-safe checkout (Order + Tickets)
- [x] Payment integration (MoMo, VNPay)
- [x] QR code ticketing & check-in
- [x] Real-time WebSocket updates
- [x] Admin dashboard with analytics
- [x] Coupon discount system
- [x] Soft delete with audit trails

### 🔄 In Progress  
- [ ] Email notification system
- [ ] Advanced search & filtering
- [ ] Multi-language support

### 📋 Planned
- [ ] Mobile app (React Native)
- [ ] CI/CD pipeline
- [ ] Kubernetes deployment
- [ ] Performance monitoring (Prometheus/Grafana)
- [ ] Automated testing suite
- [ ] GraphQL API layer

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Keep controllers thin - delegate business logic to services
- Validate all inputs with Zod at controller boundaries
- Use soft delete (`deletedAt`) for data retention
- Implement idempotency for critical operations
- Add database indexes for frequently queried fields
- Document all API endpoints
- Write meaningful commit messages

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Commercial Use

This software is provided for **learning and demonstration purposes**. Feel free to use it as a foundation for your own projects.

---

## 👨‍💻 Author

**KHANGZKIT**

- GitHub: [@KHANGZKIT](https://github.com/KHANGZKIT)
- Repository: [Event_Ticketing](https://github.com/KHANGZKIT/Event_Ticketing)

---

## 🙏 Acknowledgments

- **Ticketbox.vn** - Event data source for seeding
- **Prisma** - Excellent ORM documentation
- **Socket.IO** - Real-time communication framework
- **Express.js** - Fast, unopinionated web framework

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ and ☕ by KHANGZKIT

</div>

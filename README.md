# Event Ticketing (SOA / Modular Monolith → Microservices)

A small-but-solid event ticketing system designed to help you learn realistic backend patterns: auth, RBAC, events & shows, seatmaps, seat holds, availability, checkout & tickets. Starts as a **modular monolith** and can be split into **services**.

---

## ✨ Features (current)

- JWT Auth (register/login) + RBAC via roles (`admin`, `staff`, `user`)
- Events & Shows CRUD (soft delete)
- Seatmap templates (JSON) → expanded to seats
- Holds (in‑memory) with TTL → Availability exposes `sold` / `held` / `available`
- Prisma/PostgreSQL schema with `User`, `Role`, `UserRole`, `Event`, `Show`, `Order`, `Ticket`

> Roadmap: Redis-based holds, Checkout (Order + Ticket transaction), Check-in (QR / scan).

---

## 🧱 Architecture

```
services/
  auth/         # JWT, roles
  events/       # Events/Shows/Seatmap + Holds + Availability
  orders/       # (next) Checkout & tickets
  gateway/      # Reverse proxy / API gateway
packages/
  db/           # Prisma schema & client (workspace package)
  shared/       # (optional) shared middlewares & utils
```

**Phase A (now):** multiple services sharing a single DB package `@app/db`.

**Phase B (later):** split DB per service, move holds to Redis, integrate payment.

---

## 🛠 Tech Stack

- Runtime: **Node.js (ESM)**, **Express**
- ORM: **Prisma** + **PostgreSQL**
- Auth: **JWT (HS256)**
- Validation: **Zod**
- Dev: **npm workspaces**, **nodemon**
- (Optional) **Redis** for holds (production)

---

## 📦 Monorepo Layout (example)

```
Event_Ticketing/
├─ services/
│  ├─ auth/
│  │  └─ src/
│  │     ├─ app.js, server.js
│  │     └─ modules/auth/* (controller/service/routes/schema)
│  ├─ events/
│  │  └─ src/
│  │     ├─ app.js, server.js
│  │     └─ modules/{events,shows,holds}/*
│  └─ gateway/
│     └─ src/* (http-proxy or reverse proxy)
├─ packages/
│  ├─ db/
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  └─ seatmaps/
│  │  │     └─ m1.json (example template)
│  │  └─ src/client.ts|js (Prisma client export)
│  └─ shared/ (optional)
└─ .env (root, optional for gateway) + per-service .env
```

---

## 🔐 Environment Variables

Create **.env** for each service that runs a server, plus one for `packages/db`.

### packages/db/prisma/.env

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/event_ticketing?schema=public"
```

### services/auth/.env

```
PORT=4101
JWT_SECRET=your_super_secret_256bits
ADMIN_EMAIL=admin@example.com    # for seeding/granting admin later
```

### services/events/.env

```
PORT=4102
JWT_SECRET=your_super_secret_256bits   # MUST match auth
HOLD_TTL_SECONDS=300                   # optional
```

### services/gateway/.env (example)

```
PORT=4000
AUTH_URL=http://localhost:4101
EVENTS_URL=http://localhost:4102
ORDERS_URL=http://localhost:4103
```

> **Note:** `JWT_SECRET` must be identical across services so they can verify tokens issued by `auth`.

---

## 🗃 Database & Prisma

### Install deps (root)

```bash
npm install
```

### Dev migrate (from repo root)

```bash
npm run -w packages/db migrate:dev -- --name init
```

If you only need a quick sync for local dev (no migration file):

```bash
npm run -w packages/db db:push   # alias for `prisma db push`
```

### Seed (roles, sample event/show)

Add a seed script (example) and run:

```bash
npm run -w packages/db db:seed
```

### Open Prisma Studio

```bash
npm run -w packages/db db
```

---

## ▶️ Run Services (dev)

Each service has its own script, e.g.:

```bash
npm run -w services/auth dev
npm run -w services/events dev
npm run -w services/gateway dev
```

Typical dev scripts:

```json
"dev": "nodemon src/server.js"
```

> Windows note: use the `-w <workspace_path>` flag (e.g., `-w services/auth`).

---

## 🔐 Auth API (quick)

**POST /api/auth/register**

```json
{ "email": "user@example.com", "password": "pass123", "fullName": "User" }
```

**POST /api/auth/login** → `{ token }`

**GET /api/auth/me** (Bearer) → `{ id, email, fullName, roles: ["user", ...] }`

RBAC helper (example): `requireRole('admin')` for admin endpoints.

---

## 🎫 Events & Shows

- **GET /api/events** — list events
- **GET /api/events/:id** — event detail
- **GET /api/events/:id/shows** — shows of an event
- **POST /api/events** (admin)
- **PUT /api/events/:id** (admin)
- **DELETE /api/events/:id** (admin, soft delete)

**Seatmap & Availability**

- **GET /api/shows/:id/seatmap** → `{ showId, template, seats[] }`
- **GET /api/shows/:id/availability** → `{ showId, availability: [{ seatId, state }] }`

  - `state ∈ {"sold", "held", "available"}` (priority: sold > held > available)

---

## 🪑 Seatmap Template (example: `packages/db/prisma/seatmaps/m1.json`)

```json
{
  "id": "m1",
  "name": "My Dinh Basic",
  "priceTiers": { "VIP": 1200000, "A": 800000, "B": 500000 },
  "zones": [
    {
      "id": "VIP",
      "rows": [
        { "id": "A", "from": 1, "to": 20 },
        { "id": "B", "from": 1, "to": 20 }
      ]
    },
    {
      "id": "A",
      "rows": [
        { "id": "C", "from": 1, "to": 25 },
        { "id": "D", "from": 1, "to": 25 }
      ]
    },
    {
      "id": "B",
      "rows": [
        { "id": "E", "from": 1, "to": 30 },
        { "id": "F", "from": 1, "to": 30 }
      ]
    }
  ],
  "format": "ROW_NUM"
}
```

---

## 🕒 Holds & Availability (dev, in‑memory)

- **POST /api/holds** (Bearer)

```json
{ "showId": "<uuid>", "seats": ["A1", "A2"] }
```

→ `201 { "holdId": "...", "expiresAt": 173... }`

- **DELETE /api/holds/:id** (Bearer)
  → `204 No Content`

- **GET /api/shows/:id/availability**
  → marks seats as `sold` (from DB tickets) and `held` (from in‑memory store).

> Production: replace with Redis `SETNX hold:<showId>:<seatId> <holdId> EX 300` & `HSET holdmeta:<holdId> ...`.

---

## 🧪 Quick cURL Cheatsheet

```bash
# Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpass"}'

# Seatmap
curl -s http://localhost:4000/api/shows/<SHOW_ID>/seatmap | jq .

# Hold seats
curl -i -X POST http://localhost:4000/api/holds \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d "{\"showId\":\"<SHOW_ID>\",\"seats\":[\"A1\",\"A2\"]}"

# Availability (should show A1/A2 as held)
curl -s http://localhost:4000/api/shows/<SHOW_ID>/availability | jq '.availability[] | select(.state!="available")'
```

---

## 🧭 Gateway Mapping (example)

```
/api/auth     -> http://localhost:4101/auth
/api/events   -> http://localhost:4102/events
/api/shows    -> http://localhost:4102/shows
/api/holds    -> http://localhost:4102/holds
/api/checkout -> http://localhost:4103/checkout   (future)
/api/orders   -> http://localhost:4103/orders     (future)
```

> Convention: services mount routes **without** `/api` prefix; gateway adds `/api`.

---

## 🚨 Troubleshooting

- **JWT error: `secretOrPrivateKey must have a value`** → missing `JWT_SECRET` in `.env`.
- **`workspace:*` install error** → use npm workspaces correctly; run `npm install` at repo root.
- **Prisma P1012: multiple datasources** → ensure only **one** `datasource db` & one `generator` in `schema.prisma`.
- **`SeatMap Not Found`** → `Show.seatMapId` is null or template JSON missing; also ensure `deletedAt` is null.
- **401 on /holds** → missing Bearer token; verify `JWT_SECRET` matches between services.
- **`Invalid where: id undefined`** → ensure `req.userId` is set by `authGuard` (note casing: `userId` not `userID`).
- **Windows path quirks** → use explicit `.js` extensions in ESM imports.

---

## 📌 Roadmap

- Redis-based holds (multi-instance safe)
- Checkout: `POST /checkout` → create `Order(pending)` + `Ticket[]` (unique `[showId,seatId]`) → mark `paid`
- Webhooks for payment providers
- Ticket QR & `POST /tickets/:id/checkin` (idempotent)
- Observability: request logs, metrics
- CI: lint, type-check, migration check

---

## 🧑‍💻 Dev Notes

- Keep controllers thin → delegate to services.
- Validate inputs with Zod at controller boundary.
- Prefer **soft delete** (`deletedAt`) + proper DB indexes.
- For microservices: avoid distributed transactions; use outbox/idempotency.

---

## License

MIT (for learning/demo purposes).

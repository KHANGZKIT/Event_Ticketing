# Event Ticketing – Kiến Trúc & Luồng Dịch Vụ

Tài liệu này tóm tắt cách các thành phần trong dự án giao tiếp với nhau, dịch vụ chạy ở đâu và cần cấu hình gì để toàn bộ flow (từ frontend → thanh toán) hoạt động ổn định.

---

## 1. Tổng quan

```
Frontend (tĩnh) ──(HTTP)──> Gateway (cổng 4000)
                                │
                                ├── /api/auth/*   → Auth service (cổng 4101)
                                └── /api/* khác   → Events service (cổng 4102)

Events service ↔ PostgreSQL (orders/payments/…)  
Events service ↔ Redis (session hold ghế)  
Events service ↔ MoMo/VNPay (webhook + query)
```

- **Frontend**: các file HTML/CSS/JS thuần trong `frontend/`. Có thể được phục vụ tĩnh bởi gateway (`http://localhost:4000/frontend/...`) hoặc mở bằng Live Server khi dev (cần chỉnh CSP/CORS cho phù hợp).
- **Gateway** (`services/gateway/`): reverse proxy và điểm vào duy nhất của client. Ngoài proxy, gateway cũng phục vụ luôn thư mục `frontend/` để giảm CORS/CSP.
- **Auth service** (`services/auth/`): đăng ký, đăng nhập, refresh token. Sử dụng Prisma + Postgres chung với events.
- **Events service** (`services/events/`): quản lý events, shows, holds ghế, orders, payments. Đây là service lớn nhất, chịu trách nhiệm kết nối MoMo/VNPay.
- **Hạ tầng**: PostgreSQL + Redis được spin bằng `docker-compose` theo hướng dẫn trong `SETUP.md`.

---

## 2. Gateway Service (port 4000)

- **Mục tiêu**: gom API, kiểm soát auth và tránh CORS phức tạp cho frontend.
- **Code chính**: `services/gateway/src/server.js`
  - middlewares: `helmet`, `cors({ origin: true, credentials: true })`, rate limit, requestID.
  - phục vụ static: `app.use('/frontend', express.static(...))` → cho phép truy cập `http://localhost:4000/frontend/...`.
  - route table nằm ở `services/gateway/src/config/config.js`. Ví dụ:
    - `/api/auth` → `AUTH_SVC_URL` (mặc định `http://localhost:4101`).
    - `/api/payments`, `/api/orders`, … → `EVENT_SVC_URL` (mặc định `http://localhost:4102`).
  - Với mỗi request, gateway chọn route có prefix dài nhất, chạy `authGuard(route)` nếu cần, rồi `forward(...)` đến service đích.
- **Env tối thiểu**:
  ```env
  PORT=4000
  AUTH_SVC_URL=http://localhost:4101
  EVENT_SVC_URL=http://localhost:4102
  ```

### Lưu ý khi dev
- Nếu frontend mở bằng Live Server (vd `127.0.0.1:5502`), cần đảm bảo các service backend thêm origin đó vào danh sách CORS. Cách đơn giản nhất vẫn là vào qua gateway `http://localhost:4000/frontend/...`.

---

## 3. Auth Service (port 4101)

- **Code chính**: `services/auth/src/app.js`
  - Middlewares: `helmet`, `cors` với danh sách origin cho phép (đã thêm các port 4000/5500-5503). Có thể override bằng env `CORS_ORIGINS`.
  - Router: `app.use('/auth', authRoutes)` (đăng ký, đăng nhập, refresh, profile, v.v.).
  - Lỗi chung xử lý bởi `errorHandler`.
- **Env tối thiểu** (tham khảo `SETUP.md`):
  ```env
  PORT=4101
  JWT_SECRET=super_secret_key
  DATABASE_URL=postgresql://admin:secret@localhost:5432/eventdb?schema=public
  ```
- **Database**: dùng chung schema với events thông qua package `packages/db`.

---

## 4. Events Service (port 4102)

- **Code chính**: `services/events/src/app.js`
  - Middlewares: `express.json`, `cors` (danh sách origin tương tự Auth, hỗ trợ override bằng `CORS_ORIGINS`), `helmet`, `morgan`.
  - Router chính:
    - `/api/events` → danh sách & chi tiết sự kiện.
    - `/api/shows` → quản lý buổi diễn, seatmap.
    - `/api/holds` → giữ ghế (kết hợp Redis).
    - `/api/orders` → tạo đơn, cập nhật trạng thái.
    - `/api/payments` → thanh toán (MoMo, VNPay).
    - `/api/tickets` → quản lý vé, QR check-in.
    - `/api/dashboard` → cho admin.
  - Trong `server.js`, trước khi lắng nghe port, service chạy `ensureRedis()` để chắc chắn redis sẵn sàng (dùng cho holds).
- **Env tối thiểu**:
  ```env
  PORT=4102
  JWT_SECRET=super_secret_key (phải giống Auth)
  DATABASE_URL=postgresql://admin:secret@localhost:5432/eventdb?schema=public
  REDIS_URL=redis://localhost:6379
  API_BASE_URL=http://localhost:4000
  FRONTEND_URL=http://localhost:4000
  MOMO_* (partnerCode, accessKey, secretKey, returnURL...)
  VNPAY_* (tmnCode, secretKey, url, returnURL, bankCode)
  ```

### Redis flow (giữ ghế)
1. Frontend gọi `/api/holds` để giữ ghế trong khoảng thời gian `HOLD_TTL_SECONDS` (default 900 giây).
2. Redis lưu các key hold → nếu user thanh toán thành công, `holds.release` được gọi để giải phóng.
3. Cron hoặc logic check sẽ tự động giải phóng hold hết hạn.

### Payment flow
1. FE gọi `POST /api/payments/create` (gateway proxy sang events). `payments.service.createPayment`:
   - xác thực order thuộc user, trạng thái pending.
   - tạo/ cập nhật record `payment` trong DB.
   - dùng provider (MoMo/VNPay) để sinh `paymentUrl` trả cho FE.
2. User thanh toán trên trang MoMo/VNPay → được redirect về `GET /api/payments/return/:provider` (gateway → events).
3. `handleReturnCallback`:
   - VNPay: parse query params, verify chữ ký bằng `processWebhook` trước khi redirect FE.
   - MoMo: hiện tại đã hỗ trợ verify trực tiếp chữ ký từ query rồi sync sang DB; nếu lỗi, service fallback sang `syncPaymentStatusFromProvider` (gọi MoMo query API).
4. Webhook server-to-server (`POST /api/payments/webhooks/:provider`):
   - `processWebhook` gọi `provider.verifySignature`, parse data, tìm payment tương ứng.
   - `applyPaymentStatus` cập nhật `payments` + `orders`, tạo vé nếu cần.
5. FE `payment-return.html` poll `/api/payments/status/:orderId` để lấy kết quả cuối.

---

## 5. Frontend Flow

- Các HTML tĩnh nằm trong `frontend/…`. Điểm chính:
  - `HomePage/source/TrangChu.html`: load list events qua `../js/events.js`. File này cấu hình CSP, nên nếu chạy bằng Live Server cần đảm bảo `connect-src` cho phép endpoint backend bạn sử dụng (vd thêm `http://127.0.0.1:4000`).
  - `LoginUI/LogRegUI.html`: submit form tới `/api/auth/...` thông qua file `traffic.js`/`logreg.js`.
  - `PurchaseUI/payment-return.html` (+ `payment-return.js`): đọc `orderId`, gọi `/api/payments/status/:orderId` để render trạng thái.

### Lưu ý khi dev frontend
- Nếu muốn tiếp tục dùng Live Server (127.x:5502/5503), cần:
  1. Thêm origin này vào `CORS_ORIGINS` của các service backend.
  2. Sửa CSP trong các file HTML để `connect-src`/`style-src` cho phép domain tương ứng (hoặc bỏ thẳng CSP khi dev).
- Để tránh phải sửa nhiều, nên truy cập qua gateway `http://localhost:4000/frontend/...` (cùng origin với API).

---

## 6. Cấu hình & Script hỗ trợ

- Tài liệu setup chi tiết: `SETUP.md`, `PURCHASE_UI_SETUP.md`.
- Chạy DB/Redis: `docker-compose up -d` (ở thư mục gốc).
- Migration/seed:
  ```bash
  npm run -w packages/db migrate:dev
  npm run -w packages/db db:seed
  npm run seed:auto          # seed events/shows/tickets demo
  ```
- Service dev mode:
  ```bash
  npm run -w services/auth dev
  npm run -w services/events dev
  npm run -w services/gateway dev
  ```

---

## 7. Checklist vận hành

| Thành phần | Port | Yêu cầu chính | Ghi chú |
|-----------|------|---------------|---------|
| Gateway   | 4000 | `AUTH_SVC_URL`, `EVENT_SVC_URL` | Nên dùng làm entry point cho toàn bộ FE |
| Auth      | 4101 | `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS` | JWT secret phải trùng với events |
| Events    | 4102 | `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, cấu hình MoMo/VNPay | Khởi động sau khi Redis sẵn sàng |
| PostgreSQL| 5432 | Docker compose | chứa toàn bộ dữ liệu |
| Redis     | 6379 | Docker compose | giữ ghế, queue |

---

## 8. Gợi ý mở rộng

- **CI/CD**: thêm scripts build cho từng service; dùng PM2 hoặc Docker Compose để deploy.
- **Giám sát**: gateway có thể log request ID, từ đó trace qua các service (đã có middleware `requestID`).
- **Bảo mật**: production nên siết CSP/CORS chính xác domain thật, bật HTTPS (reverse proxy Nginx/CloudFront).

---

Bất kỳ thay đổi flow nào (ví dụ thêm cổng thanh toán mới, thêm microservice mới) nên cập nhật tài liệu này để giữ bức tranh tổng thể luôn rõ ràng.


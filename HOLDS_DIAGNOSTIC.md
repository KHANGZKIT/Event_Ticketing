# Diagnostic Guide - Hold API không hoạt động

## Kiểm tra toàn bộ flow

### 1. Frontend → Gateway
- **URL:** `http://localhost:4000/api/holds`
- **Method:** POST
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Body:** `{ showId, seats, ttlSec }`

### 2. Gateway → Events Service
- **Target URL:** `http://localhost:4102/api/holds` (từ HOLD_SVC_URL)
- **Rewrite:** `/api/holds` → `/api/holds` (giữ nguyên)
- **Auth:** Required (đã thêm `auth: true`)

### 3. Events Service
- **Route:** `app.use('/api/holds', holdsRouter, holdsConsumeRouter)`
- **Controller:** `holds.redis.controller.js`
- **Auth:** `authGuard` middleware trong holdsRouter

## Các vấn đề có thể xảy ra

### Vấn đề 1: Gateway không match route
**Triệu chứng:** HTTP 404 từ gateway
**Kiểm tra:**
```powershell
# Xem logs gateway khi gọi API
# Phải thấy: [gateway] POST /api/holds → route: /api/holds
```

**Giải pháp:**
- Đảm bảo gateway đã khởi động lại sau khi sửa config
- Kiểm tra `.env` có `HOLD_SVC_URL=http://localhost:4102`

### Vấn đề 2: Gateway auth block request
**Triệu chứng:** HTTP 401 từ gateway
**Kiểm tra:**
- Token có hợp lệ không
- Token có trong localStorage không

**Giải pháp:**
- Đăng nhập lại để lấy token mới
- Kiểm tra JWT_SECRET giống nhau giữa gateway và auth service

### Vấn đề 3: Events service không nhận request
**Triệu chứng:** Gateway forward nhưng events service không log
**Kiểm tra:**
```powershell
# Test trực tiếp events service (bỏ qua gateway)
curl -X POST http://localhost:4102/api/holds `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{\"showId\":\"test\",\"seats\":[\"A1\"],\"ttlSec\":900}'
```

**Giải pháp:**
- Kiểm tra events service đang chạy trên port 4102
- Kiểm tra route `/api/holds` có được mount không

### Vấn đề 4: Redis connection
**Triệu chứng:** HTTP 500 với message về Redis
**Kiểm tra:**
```powershell
docker exec event_ticketing-redis-1 redis-cli ping
# Phải trả về PONG
```

**Giải pháp:**
- Khởi động Redis: `docker-compose up -d redis`
- Kiểm tra REDIS_URL trong `.env` của events service

### Vấn đề 5: Seatmap không tồn tại
**Triệu chứng:** HTTP 404 với message "Seatmap not found"
**Kiểm tra:**
- ShowId có tồn tại không
- Show có seatmap không

**Giải pháp:**
- Kiểm tra showId trong database
- Đảm bảo show có seatMapId

## Test từng bước

### Bước 1: Test Gateway health
```powershell
curl http://localhost:4000/api/health
# Phải trả về: {"ok":true,"service":"gateway",...}
```

### Bước 2: Test Events Service health
```powershell
curl http://localhost:4102/health
# Phải trả về: {"status":"ok","service":"events"}
```

### Bước 3: Test Gateway route matching
```powershell
# Xem logs gateway khi gọi bất kỳ API nào
# Phải thấy log: [gateway] METHOD /path → route: /prefix
```

### Bước 4: Test Hold API qua Gateway
```powershell
# Lấy token từ DevTools Console: localStorage.getItem('accessToken')
$token = "YOUR_TOKEN"

curl -X POST http://localhost:4000/api/holds `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"showId\":\"YOUR_SHOW_ID\",\"seats\":[\"A1\"],\"ttlSec\":900}'
```

### Bước 5: Test Hold API trực tiếp Events Service
```powershell
# Bỏ qua gateway, test trực tiếp
curl -X POST http://localhost:4102/api/holds `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"showId\":\"YOUR_SHOW_ID\",\"seats\":[\"A1\"],\"ttlSec\":900}'
```

## Logs cần kiểm tra

### Gateway logs:
```
[gateway] POST /api/holds → route: /api/holds
```

### Events Service logs:
```
[POST /holds] Request: { userId, showId, seats, ttlSec }
[holds.create] Fetching seatmap for showId: ...
[holds.create] Creating Redis pipeline for holdId: ...
[POST /holds] Service result: { ok: true, holdId: ... }
```

## Đã sửa

1. ✅ Thêm `auth: true` vào route config của holds trong gateway
2. ✅ Thêm logging chi tiết trong gateway và events service
3. ✅ Error handling tốt hơn

## Sau khi sửa

1. **Khởi động lại Gateway:**
   ```powershell
   npm run -w services/gateway dev
   ```

2. **Khởi động lại Events Service:**
   ```powershell
   npm run -w services/events dev
   ```

3. **Kiểm tra logs** khi gọi API từ frontend

4. **Nếu vẫn lỗi**, copy logs từ cả 2 service để debug tiếp


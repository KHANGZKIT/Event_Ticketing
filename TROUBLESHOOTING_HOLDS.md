# Khắc phục lỗi HTTP 500 khi tạo Hold

## Nguyên nhân có thể

### 1. Redis chưa chạy (Phổ biến nhất)
Lỗi HTTP 500 thường xảy ra khi Redis server chưa được khởi động.

**Kiểm tra:**
```bash
# Kiểm tra Redis có đang chạy không
redis-cli ping
# Nếu trả về "PONG" thì Redis đang chạy
# Nếu lỗi "Could not connect" thì Redis chưa chạy
```

**Khởi động Redis:**
```bash
# Nếu dùng Docker Compose
docker-compose up -d redis

# Hoặc khởi động Redis trực tiếp (nếu đã cài đặt)
redis-server
```

### 2. Redis URL không đúng
Kiểm tra file `services/events/.env`:
```env
REDIS_URL=redis://localhost:6379
```

### 3. Redis chưa được kết nối trong code
Service events cần đảm bảo Redis được kết nối trước khi xử lý request.

**Kiểm tra trong `services/events/src/server.js`:**
- Phải có `ensureRedis()` được gọi khi server khởi động

## Các lỗi đã được sửa

1. **Error handling trong idempotency.js**
   - Thêm try-catch để tránh crash khi parse JSON
   - Trả về null thay vì throw error

2. **Error handling trong holds.redis.service.js**
   - Thêm error handling cho Redis connection
   - Trả về lỗi 503 rõ ràng khi Redis không kết nối được

3. **Cấu trúc try-catch**
   - Sửa lỗi cấu trúc try-catch không đúng

## Cách kiểm tra

### Bước 1: Kiểm tra Redis
```bash
# Terminal 1: Khởi động Redis (nếu chưa chạy)
docker-compose up redis

# Terminal 2: Kiểm tra kết nối
redis-cli ping
```

### Bước 2: Kiểm tra logs của service events
Xem console/logs của service events để thấy lỗi chi tiết:
```bash
# Nếu chạy với nodemon
npm run -w services/events dev

# Xem logs để tìm lỗi Redis connection
```

### Bước 3: Test API trực tiếp
```bash
# Đảm bảo đã đăng nhập và có token
curl -X POST http://localhost:4000/api/holds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "showId": "your-show-id",
    "seats": ["A1", "A2"],
    "ttlSec": 900
  }'
```

## Lỗi thường gặp

### "ECONNREFUSED" hoặc "connect"
- **Nguyên nhân:** Redis chưa chạy hoặc URL sai
- **Giải pháp:** Khởi động Redis và kiểm tra REDIS_URL

### "Seat not found"
- **Nguyên nhân:** Ghế không tồn tại trong seatmap
- **Giải pháp:** Kiểm tra showId và seatId có đúng không

### "Seats sold" hoặc "Seat(s) already held"
- **Nguyên nhân:** Ghế đã được bán hoặc đang được giữ bởi người khác
- **Giải pháp:** Chọn ghế khác

## Debug

Thêm logging để debug:
```javascript
// Trong holds.redis.controller.js
console.log('[POST /holds]', { userId, showId, seats, ttlSec });

// Trong holds.redis.service.js  
console.log('[createHold]', { userId, showId, seats });
console.log('[redis status]', redis.status);
```

## Sau khi sửa

1. Khởi động lại service events:
   ```bash
   npm run -w services/events dev
   ```

2. Kiểm tra Redis connection trong logs:
   ```
   [redis] connected: redis://localhost:6379 pong= PONG
   ```

3. Thử lại tạo hold từ frontend


# Debug Guide - HTTP 500 khi tạo Hold

## Đã thêm logging chi tiết

Sau khi khởi động lại service events, bạn sẽ thấy logs chi tiết khi gọi API `/holds`:

### Logs sẽ hiển thị:

1. **Request info:**
   ```
   [POST /holds] Request: { userId, idemKey, showId, seats, ttlSec }
   ```

2. **Seatmap loading:**
   ```
   [holds.create] Fetching seatmap for showId: ...
   [holds.create] Valid seats: [...] ... (total: X)
   ```

3. **Redis operations:**
   ```
   [holds.create] Creating Redis pipeline for holdId: ...
   [holds.create] Executing pipeline...
   [holds.create] Pipeline result: [...]
   ```

4. **Errors (nếu có):**
   ```
   [POST /holds] Unhandled error: ...
   [POST /holds] Error stack: ...
   ```

## Cách debug

### Bước 1: Khởi động lại service events
```powershell
# Dừng service hiện tại (Ctrl+C)
# Chạy lại:
npm run -w services/events dev
```

### Bước 2: Thử tạo hold từ frontend
- Mở DevTools Console và Network tab
- Chọn ghế và click "Thanh toán"
- Xem logs trong terminal chạy service events

### Bước 3: Kiểm tra logs

**Nếu thấy lỗi về seatmap:**
```
[holds.create] Seatmap not found or invalid for showId: ...
```
→ Kiểm tra xem showId có tồn tại và có seatmap không

**Nếu thấy lỗi về seat:**
```
[holds.create] Seat X not found in seatmap
```
→ Kiểm tra tên ghế có đúng format không (ví dụ: "D6", "D7")

**Nếu thấy lỗi về Redis:**
```
[holds.create] Pipeline errors: [...]
```
→ Kiểm tra Redis connection và logs

**Nếu thấy lỗi về userId:**
```
[POST /holds] Missing userId in req.user
```
→ Kiểm tra authentication token

## Các lỗi thường gặp

### 1. "Seatmap not found"
- **Nguyên nhân:** Show không có seatmap hoặc showId sai
- **Giải pháp:** Kiểm tra showId và đảm bảo show có seatmap

### 2. "Seat X not found in seatmap"
- **Nguyên nhân:** Tên ghế không khớp với seatmap
- **Giải pháp:** Kiểm tra format tên ghế (có thể là "D6" thay vì "d6")

### 3. "Pipeline errors"
- **Nguyên nhân:** Redis connection issue hoặc Redis chưa kết nối
- **Giải pháp:** 
  ```powershell
  docker-compose up -d redis
  # Kiểm tra logs service events có "[redis] connected" không
  ```

### 4. "Missing userId"
- **Nguyên nhân:** Token không hợp lệ hoặc authGuard không set req.user
- **Giải pháp:** Kiểm tra token trong localStorage và đảm bảo đã đăng nhập

## Test trực tiếp với curl

```powershell
# Lấy token từ localStorage (DevTools Console)
$token = "YOUR_TOKEN_HERE"

# Test API
curl -X POST http://localhost:4000/api/holds `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"showId\":\"your-show-id\",\"seats\":[\"D6\",\"D7\"],\"ttlSec\":900}'
```

## Sau khi sửa

1. Khởi động lại service events
2. Xem logs chi tiết
3. Copy error message và stack trace nếu vẫn lỗi
4. Gửi logs để debug tiếp


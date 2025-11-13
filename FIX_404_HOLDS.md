# Sửa lỗi HTTP 404 cho /api/holds

## Vấn đề
Gateway trả về 404 khi gọi `/api/holds`, nghĩa là route không được match hoặc service chưa chạy.

## Đã sửa

1. **Gateway config** - Đã thêm `rewrite: '/api/holds'` để đảm bảo path đúng
2. **Logging** - Thêm log chi tiết trong gateway để debug route matching

## Cách khắc phục

### Bước 1: Khởi động lại Gateway
```powershell
# Dừng gateway hiện tại (Ctrl+C)
# Chạy lại:
npm run -w services/gateway dev
```

### Bước 2: Kiểm tra logs
Khi gọi `/api/holds`, bạn sẽ thấy log trong gateway:
```
[gateway] POST /api/holds → route: /api/holds
```

Nếu thấy `→ route: NO_MATCH`, có nghĩa là route không được match.

### Bước 3: Kiểm tra service events đang chạy
```powershell
# Kiểm tra service events có đang chạy không
# Port 4102 phải đang listen
netstat -ano | findstr :4102
```

### Bước 4: Test trực tiếp service events
```powershell
# Test trực tiếp service events (bỏ qua gateway)
curl -X POST http://localhost:4102/api/holds `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{\"showId\":\"test-id\",\"seats\":[\"D6\"],\"ttlSec\":900}'
```

Nếu test trực tiếp thành công nhưng qua gateway lỗi 404 → vấn đề ở gateway routing.

## Kiểm tra

1. **Gateway .env có đúng không:**
   ```
   HOLD_SVC_URL=http://localhost:4102
   ```

2. **Service events có mount route không:**
   - File: `services/events/src/app.js`
   - Phải có: `app.use('/api/holds', holdsRouter, holdsConsumeRouter);`

3. **Gateway có route config không:**
   - File: `services/gateway/src/config/config.js`
   - Phải có: `{ prefix: '/api/holds', target: ensureUrl('HOLD_SVC_URL'), rewrite: '/api/holds' }`

## Sau khi sửa

1. Khởi động lại cả gateway và events service
2. Thử lại từ frontend
3. Xem logs trong cả 2 service để debug


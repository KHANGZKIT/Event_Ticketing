# Checklist - Kiểm tra Hold API

## ✅ Đã kiểm tra và sửa

1. ✅ **Gateway config** - Đã thêm `auth: true` cho route `/api/holds`
2. ✅ **Gateway .env** - Có `HOLD_SVC_URL=http://localhost:4102`
3. ✅ **Events service route** - Có mount `/api/holds`
4. ✅ **Redis** - Đang chạy và accessible
5. ✅ **Services health** - Cả gateway và events đều OK

## 🔍 Cần kiểm tra thêm

### 1. Gateway có forward Authorization header không?
Gateway proxy đã giữ nguyên headers (trừ hop-by-hop), nên Authorization header sẽ được forward.

### 2. JWT_SECRET có giống nhau không?
Gateway và Events service cần cùng JWT_SECRET để verify token.

**Kiểm tra:**
```powershell
# Gateway .env
Get-Content services\gateway\.env | Select-String "JWT_SECRET"

# Events service .env  
Get-Content services\events\.env | Select-String "JWT_SECRET"
```

### 3. Token format có đúng không?
Token phải có format: `Bearer <token>`

**Kiểm tra trong frontend:**
```javascript
// Trong DevTools Console
const token = localStorage.getItem('accessToken');
console.log('Token:', token);
```

## 🧪 Test từng bước

### Test 1: Gateway route matching
```powershell
# Khởi động lại gateway và xem logs
npm run -w services/gateway dev

# Trong browser, gọi API holds
# Phải thấy log: [gateway] POST /api/holds → route: /api/holds
```

### Test 2: Gateway auth
```powershell
# Test với token
$token = "YOUR_TOKEN"
curl -X POST http://localhost:4000/api/holds `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"showId\":\"test\",\"seats\":[\"A1\"],\"ttlSec\":900}'
```

**Nếu lỗi 401:**
- Token không hợp lệ
- JWT_SECRET không khớp
- Token đã hết hạn

### Test 3: Events service trực tiếp
```powershell
# Bỏ qua gateway
curl -X POST http://localhost:4102/api/holds `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"showId\":\"test\",\"seats\":[\"A1\"],\"ttlSec\":900}'
```

**Nếu thành công:** Vấn đề ở gateway
**Nếu lỗi:** Vấn đề ở events service

## 📋 Logs cần xem

### Gateway logs (khi gọi API):
```
[gateway] POST /api/holds → route: /api/holds
```

### Events service logs (khi nhận request):
```
[POST /holds] Request: { userId, showId, seats, ttlSec }
[holds.create] Fetching seatmap for showId: ...
```

## 🚨 Lỗi thường gặp

### 1. "No matching route"
- Gateway chưa khởi động lại sau khi sửa config
- Route config sai

### 2. "Missing token" hoặc "Invalid token"
- Token không được gửi từ frontend
- Token không hợp lệ
- JWT_SECRET không khớp

### 3. "Seatmap not found"
- ShowId không tồn tại
- Show không có seatmap

### 4. "Redis connection failed"
- Redis chưa chạy
- REDIS_URL sai

## ✅ Sau khi sửa

1. **Khởi động lại Gateway:**
   ```powershell
   npm run -w services/gateway dev
   ```

2. **Khởi động lại Events Service:**
   ```powershell
   npm run -w services/events dev
   ```

3. **Kiểm tra JWT_SECRET giống nhau:**
   ```powershell
   # So sánh 2 file .env
   $gw = (Get-Content services\gateway\.env | Select-String "JWT_SECRET").Line
   $ev = (Get-Content services\events\.env | Select-String "JWT_SECRET").Line
   Write-Host "Gateway: $gw"
   Write-Host "Events: $ev"
   ```

4. **Test từ frontend** và xem logs cả 2 service


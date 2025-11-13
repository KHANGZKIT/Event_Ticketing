# Hướng dẫn tích hợp PurchaseUI

## Đã hoàn thành

### 1. Cập nhật HOLD_TTL_SECONDS thành 15 phút (900 giây)
- File: `services/events/src/modules/holds/holds.redis.service.js`
- Default TTL đã được cập nhật từ 300 giây (5 phút) thành 900 giây (15 phút)

**Lưu ý:** Để áp dụng, cập nhật file `.env` của service events:
```
HOLD_TTL_SECONDS=900
```

### 2. Tích hợp API Hold vào SeatmapUI
- File: `frontend/seatmapUI/script/seatmap.js`
- Đã thêm:
  - Hàm `getAuthToken()` để lấy token từ localStorage/sessionStorage
  - Hàm `isAuthenticated()` để kiểm tra đăng nhập
  - Tích hợp API `POST /api/holds` khi bấm "Thanh toán" trong modal
  - Chuyển hướng đến PurchaseUI với dữ liệu hold

### 3. Liên kết SeatmapUI → PurchaseUI
- Khi bấm "Thanh toán" trong modal checkout:
  - Tạo hold với API (15 phút TTL)
  - Lưu dữ liệu vào sessionStorage
  - Chuyển đến `/frontend/PurchaseUI/thanhToan.html` với params:
    - `showId`: ID của show
    - `holdId`: ID của hold vừa tạo
    - `seats`: Danh sách ghế đã chọn
    - `eventId`: ID của event (nếu có)

### 4. Navigation Header trong PurchaseUI
- File: `frontend/PurchaseUI/thanhToan.html`
- Đã thêm liên kết:
  - Logo → Trang chủ (`/frontend/HomePage/source/TrangChu.html`)
  - "Vé của tôi" → My Tickets (`/frontend/my_ticket/source/my_ticket.html`)
  - "Chọn lại vé" → Quay lại SeatmapUI

### 5. Tích hợp dữ liệu vào PurchaseUI
- File: `frontend/PurchaseUI/thanhToanJS.js`
- Đã thêm:
  - Đọc dữ liệu từ URL params và sessionStorage
  - Load thông tin show/event từ API
  - Hiển thị thông tin ghế đã chọn
  - Countdown timer dựa trên `expiresAt` từ hold (15 phút)
  - Tính giá từ dữ liệu ghế thực tế
  - Nút "Chọn lại vé" quay lại seatmapUI

## Luồng hoạt động

1. **User chọn ghế** (SeatmapUI)
   - User chọn ghế trên seatmap
   - Click "Đặt vé" → Mở modal checkout

2. **Tạo Hold** (SeatmapUI → API)
   - User click "Thanh toán" trong modal
   - Kiểm tra đăng nhập
   - Gọi `POST /api/holds` với:
     ```json
     {
       "showId": "...",
       "seats": ["A1", "A2"],
       "ttlSec": 900
     }
     ```
   - Nhận `holdId` và `expiresAt`

3. **Chuyển đến PurchaseUI**
   - Lưu dữ liệu vào sessionStorage
   - Redirect với URL params
   - PurchaseUI load dữ liệu và hiển thị form

4. **Thanh toán** (PurchaseUI)
   - Countdown 15 phút từ `expiresAt`
   - User điền form
   - Click "Next" để tiếp tục (có thể tích hợp payment sau)

## Cấu hình cần thiết

### Environment Variables
Đảm bảo file `services/events/.env` có:
```env
HOLD_TTL_SECONDS=900
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_256bits_change_this_in_production
```

### API Endpoints được sử dụng
- `POST /api/holds` - Tạo hold (cần authentication)
- `GET /api/shows/:id` - Lấy thông tin show
- `GET /api/events/:id` - Lấy thông tin event

## Lưu ý

1. **Authentication**: User phải đăng nhập trước khi đặt vé
2. **Hold expiration**: Hold sẽ tự động hết hạn sau 15 phút
3. **SessionStorage**: Dữ liệu purchase được lưu trong sessionStorage, sẽ mất khi đóng tab
4. **Error handling**: Cần xử lý các trường hợp:
   - Hold đã hết hạn
   - Ghế đã bị người khác đặt
   - Mất kết nối API


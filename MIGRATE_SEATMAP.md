# Hướng dẫn Migrate SeatMap từ cũ sang mới

## Vấn đề

Các Show cũ đang dùng `seatMapId` (string như "map_theater_balcony"), trong khi hệ thống mới dùng `seatMapDbId` (UUID từ bảng SeatMap).

## Giải pháp

### 1. Tự động migrate (Đã thêm vào code)

Code đã được cập nhật để **tự động migrate** khi:
- Show có `seatMapId` nhưng chưa có `seatMapDbId`
- Tìm thấy SeatMap trong DB khớp với `seatMapId`
- Tự động update `seatMapDbId` cho show đó

**Lợi ích:** Không cần chạy script, tự động migrate khi có request

### 2. Chạy script migrate thủ công (Tùy chọn)

Nếu muốn migrate tất cả shows một lúc:

```powershell
npm run migrate:seatmap
```

Script sẽ:
- Tìm tất cả shows có `seatMapId` nhưng chưa có `seatMapDbId`
- Tìm SeatMap trong DB khớp với `seatMapId` (theo id hoặc name)
- Update `seatMapDbId` cho các shows tìm thấy
- Báo cáo kết quả: migrated và failed

## Cách hoạt động

### Logic tìm SeatMap:

1. **Tìm theo UUID** - Nếu `seatMapId` là UUID, tìm trực tiếp trong bảng SeatMap
2. **Tìm theo name** - Nếu không phải UUID, tìm SeatMap có name chứa `seatMapId`
3. **Fallback file** - Nếu không tìm thấy trong DB, load từ file JSON

### Ví dụ mapping:

- `seatMapId = "map_theater_balcony"` → Tìm SeatMap có name chứa "theater" và "balcony"
- `seatMapId = "map_arena_oval"` → Tìm SeatMap có name chứa "arena" và "oval"
- `seatMapId = UUID` → Tìm trực tiếp theo id

## Sau khi migrate

1. **Khởi động lại Events Service:**
   ```powershell
   npm run -w services/events dev
   ```

2. **Test tạo hold** - Show sẽ tự động được migrate khi có request

3. **Kiểm tra logs** - Sẽ thấy:
   ```
   [getSeatMap] Auto-migrated show <id>: map_theater_balcony → <uuid>
   ```

## Lưu ý

- Shows đã có `seatMapDbId` sẽ không bị ảnh hưởng
- `seatMapId` cũ vẫn được giữ lại (backup)
- Nếu muốn xóa `seatMapId` sau khi migrate, uncomment dòng trong script
- Nếu không tìm thấy SeatMap trong DB, vẫn có thể load từ file JSON (backward compatible)

## Troubleshooting

### Show không tự động migrate

**Nguyên nhân:** Không tìm thấy SeatMap trong DB khớp với `seatMapId`

**Giải pháp:**
1. Kiểm tra bảng SeatMap có record với name tương ứng không
2. Chạy script migrate để xem chi tiết
3. Map thủ công nếu cần

### Vẫn lỗi "Seatmap not found"

**Nguyên nhân:** 
- Show không có cả `seatMapId` và `seatMapDbId`
- SeatMap không tồn tại trong DB và file

**Giải pháp:**
1. Gán seatmap cho show qua Prisma Studio hoặc API
2. Đảm bảo SeatMap tồn tại trong bảng SeatMap


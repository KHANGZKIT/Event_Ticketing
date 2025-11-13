# Sửa lỗi "Seatmap not found" khi tạo Hold

## Vấn đề

Lỗi: `Seatmap not found or invalid for showId: 8a24948f-41cd-410e-8431-ddb7f21b7633`

## Nguyên nhân

1. **Show không có seatMapId** - Show chưa được gán seatmap
2. **Code kiểm tra sai** - Code đang kiểm tra `seatmap.seats` nhưng `getSeatMap` trả về `seatmap.template.seats`

## Đã sửa

1. ✅ **Sửa logic kiểm tra** - Kiểm tra đúng `seatmap.template.seats`
2. ✅ **Thêm logging** - Log chi tiết để debug
3. ✅ **Fallback** - Hỗ trợ cả `seatmap.template.seats` và `seatmap.seats`

## Cách kiểm tra Show có seatmap

### Cách 1: Qua API
```powershell
# Kiểm tra show có seatmap không
curl http://localhost:4000/api/shows/8a24948f-41cd-410e-8431-ddb7f21b7633/seatmap
```

Nếu trả về 404 → Show không có seatmap

### Cách 2: Qua Database
```sql
SELECT id, "seatMapId", "seatMapDbId" 
FROM "Show" 
WHERE id = '8a24948f-41cd-410e-8431-ddb7f21b7633';
```

Nếu `seatMapId` và `seatMapDbId` đều NULL → Show chưa có seatmap

### Cách 3: Qua Prisma Studio
```powershell
npm run -w packages/db db
# Mở browser: http://localhost:5555
# Tìm Show với id = 8a24948f-41cd-410e-8431-ddb7f21b7633
# Kiểm tra cột seatMapId
```

## Cách sửa Show không có seatmap

### Option 1: Gán seatmap khi tạo show
Khi tạo show mới, đảm bảo có `seatMapId`:
```javascript
{
  eventId: "...",
  seatMapId: "map_concert_hall_large", // hoặc ID từ DB
  ...
}
```

### Option 2: Update show hiện có
```sql
UPDATE "Show" 
SET "seatMapId" = 'map_concert_hall_large' 
WHERE id = '8a24948f-41cd-410e-8431-ddb7f21b7633';
```

Hoặc qua API (nếu có endpoint update):
```powershell
curl -X PUT http://localhost:4000/api/shows/8a24948f-41cd-410e-8431-ddb7f21b7633 `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer TOKEN" `
  -d '{\"seatMapId\":\"map_concert_hall_large\"}'
```

## Danh sách seatmap có sẵn

Xem trong thư mục `packages/db/seatmaps/`:
- `map_concert_hall_large.json`
- `map_stadium_large.json`
- `map_theater_balcony.json`
- ... và nhiều file khác

Hoặc xem trong `seatmaps_pack.json` để biết tất cả seatmap IDs.

## Sau khi sửa

1. **Khởi động lại Events Service:**
   ```powershell
   npm run -w services/events dev
   ```

2. **Kiểm tra logs** khi tạo hold:
   ```
   [holds.create] Seatmap response: { hasSeatmap: true, hasTemplate: true, hasSeats: true, seatsCount: 140 }
   ```

3. **Nếu vẫn lỗi**, kiểm tra show có seatMapId trong database

## Lưu ý

- Show phải có `seatMapId` hoặc `seatMapDbId` mới có thể tạo hold
- Seatmap file phải tồn tại trong `packages/db/seatmaps/` hoặc trong database
- Nếu seatmap không tồn tại, sẽ lỗi khi load template


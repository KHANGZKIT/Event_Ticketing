# Hướng dẫn đồng bộ hóa Seatmaps vào Database

Script này giúp bạn:
1. ✅ Seed tất cả seatmaps từ files vào database
2. ✅ Cập nhật tất cả shows để có `seatMapDbId` đúng
3. ✅ Migrate từ `seatMapId` cũ sang `seatMapDbId` mới
4. ✅ Đảm bảo tất cả shows đều có seatmap

## Cách sử dụng

### 1. Chạy script đồng bộ hóa

```bash
node scripts/sync_seatmaps_to_db.js
```

Script sẽ:
- Đọc tất cả seatmap files từ `packages/db/seatmaps/`
- Thêm các seatmap mới vào database
- Cập nhật các seatmap đã có nếu schema thay đổi
- Migrate `seatMapId` cũ sang `seatMapDbId` mới
- Gán seatmap cho các shows chưa có

### 2. Các seatmap hiện có

Hiện tại có **25 seatmaps** bao gồm:

#### Venues phổ biến:
- `map_arena_oval` - Multi-purpose Arena – Oval
- `map_arena_360` - Arena 360° – Full Circle (MỚI)
- `map_stadium_large` - Stadium – Large Capacity
- `map_sports_arena` - Sports Arena
- `map_horseshoe_md` - Mỹ Đình – Horseshoe

#### Theaters & Concert Halls:
- `map_concert_hall_large` - Concert Hall – Large
- `map_concert_premium` - Premium Concert Hall – Multi-zone
- `map_theater_balcony` - Indoor Theater – Balcony
- `map_indoor_classic` - Indoor Theater – Classic
- `map_opera_house` - Opera House – Classic (MỚI)

#### Outdoor & Special:
- `map_beach_open` - Beach Open Air – Split
- `map_festival_field` - Festival Field – Deep
- `map_outdoor_stage` - Outdoor Stage
- `map_amphitheater` - Amphitheater – Outdoor (MỚI)

#### Compact & Small:
- `map_cityhall_compact` - City Hall – Compact Split
- `map_square_compact` - Square – Compact
- `map_small_venue` - Small Venue
- `map_music_club` - Music Club – Standing & Seated

#### Conference & Workshop:
- `map_conference_center` - Conference Center
- `map_convention_flat` - Convention Hall – Flat
- `map_workshop_room` - Workshop Room – Classroom Style (MỚI)

#### Cinema:
- `map_cinema_standard` - Cinema – Standard Layout (MỚI)

#### Special:
- `map_bowl_wide` - Stadium Bowl – Wide
- `map_qk7_split` - Quận 7 – Split Blocks

## Cấu trúc Seatmap

Mỗi seatmap file có cấu trúc:

```json
{
  "id": "map_xxx",
  "name": "Tên hiển thị",
  "priceTiers": {
    "VIP": 1000000,
    "A": 700000,
    "B": 450000
  },
  "zones": [
    {
      "id": "VIP",
      "rows": [
        {
          "id": "A",
          "from": 1,
          "to": 24
        }
      ]
    }
  ],
  "format": "ROW_NUM",
  "meta": {
    "stagePosition": "north",
    "type": "arena"
  }
}
```

## Thêm seatmap mới

1. Tạo file JSON mới trong `packages/db/seatmaps/`
2. Đặt tên file: `map_xxx.json`
3. Đảm bảo có đầy đủ các trường: `id`, `name`, `priceTiers`, `zones`
4. Chạy lại script `sync_seatmaps_to_db.js`

## Kiểm tra kết quả

Sau khi chạy script, bạn có thể kiểm tra:

```sql
-- Xem tất cả seatmaps
SELECT id, name, "createdAt" FROM "SeatMap" ORDER BY name;

-- Xem shows có seatmap
SELECT COUNT(*) FROM "Show" WHERE "seatMapDbId" IS NOT NULL AND "deletedAt" IS NULL;

-- Xem shows chưa có seatmap
SELECT id, "eventId", "seatMapId", "seatMapDbId" 
FROM "Show" 
WHERE "seatMapDbId" IS NULL AND "deletedAt" IS NULL;
```

## Lưu ý

- Script sẽ **không xóa** seatmaps đã có trong DB
- Script sẽ **cập nhật** schema nếu file thay đổi
- Shows sẽ được gán seatmap ngẫu nhiên nếu không tìm thấy seatmap phù hợp
- Script an toàn, có thể chạy nhiều lần

## Troubleshooting

### Lỗi: "Cannot find module '@prisma/client'"
```bash
cd packages/db
npm install
```

### Lỗi: "DATABASE_URL not found"
Đảm bảo file `.env` có trong `packages/db/prisma/` với:
```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### Shows vẫn chưa có seatmap
Chạy lại script, script sẽ tự động gán seatmap cho các shows còn thiếu.


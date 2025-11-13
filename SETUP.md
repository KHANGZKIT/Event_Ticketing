# 🚀 Hướng dẫn Setup Dự án Event Ticketing

Hướng dẫn này giúp team setup và chạy dự án với dữ liệu mẫu đầy đủ.

## 📋 Yêu cầu hệ thống

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **Docker & Docker Compose**: (để chạy PostgreSQL và Redis)
- **Git**: để clone repository

## 🎯 Quick Start (Setup nhanh)

### Bước 1: Clone và cài đặt dependencies

```bash
# Clone repository
git clone <repository-url>
cd Event_Ticketing

# Cài đặt tất cả dependencies
npm install
```

### Bước 2: Khởi động Database và Redis

```bash
# Khởi động PostgreSQL và Redis bằng Docker
docker-compose up -d

# Kiểm tra containers đang chạy
docker-compose ps
```

### Bước 3: Setup Environment Variables

Tạo các file `.env` cho từng service:

#### `packages/db/prisma/.env`
```env
DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public"
```

#### `services/auth/.env`
```env
PORT=4101
JWT_SECRET=your_super_secret_jwt_key_256bits_minimum_length_required
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=Admin123
```

#### `services/events/.env`
```env
PORT=4102
JWT_SECRET=your_super_secret_jwt_key_256bits_minimum_length_required
DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public"
REDIS_URL=redis://localhost:6379
HOLD_TTL_SECONDS=900
```

#### `services/gateway/.env`
```env
PORT=4000
AUTH_URL=http://localhost:4101
EVENTS_URL=http://localhost:4102
```

> ⚠️ **Lưu ý**: `JWT_SECRET` phải **GIỐNG NHAU** ở tất cả services (auth và events)

### Bước 4: Setup Database

```bash
# Chạy migrations
npm run -w packages/db migrate:dev

# Hoặc nếu chỉ cần sync schema (không tạo migration file)
npm run -w packages/db db:push
```

### Bước 5: Seed dữ liệu mẫu

```bash
# Seed roles và admin user
npm run -w packages/db db:seed

# Seed events, shows, users, và seatmaps (dữ liệu đầy đủ)
npm run seed:auto
```

> 💡 **Lưu ý**: Script `seed:auto` sẽ:
> - Tạo 400 users mẫu (tự động)
> - Seed seatmap templates
> - Tạo events và shows với dữ liệu từ Ticketbox
> - Gán seatmaps cho shows
> - Update cover images cho events

> ⚠️ **Nếu muốn seed lại từ đầu**: `RESET_EVENTS=true npm run seed:auto`

### Bước 6: Khởi động các services

Mở **3 terminal windows** và chạy:

**Terminal 1 - Auth Service:**
```bash
npm run -w services/auth dev
```

**Terminal 2 - Events Service:**
```bash
npm run -w services/events dev
```

**Terminal 3 - Gateway:**
```bash
npm run -w services/gateway dev
```

### Bước 7: Truy cập ứng dụng

- **Frontend**: Mở file `frontend/HomePage/source/TrangChu.html` trong browser
- **API Gateway**: http://localhost:4000
- **Prisma Studio** (xem database): `npm run -w packages/db db`

## 🔑 Tài khoản mặc định

Sau khi seed, bạn có thể đăng nhập với:

- **Admin**: 
  - Email: `admin@gmail.com`
  - Password: `Admin123`

- **Users mẫu**: 
  - Email: `user1@gmail.com`, `user2@gmail.com`, ...
  - Password: `Password@123`

## 📊 Dữ liệu mẫu

Sau khi chạy `seed:auto`, bạn sẽ có:

- ✅ **400 users** với role `user`
- ✅ **1 admin user** (`admin@gmail.com`)
- ✅ **~20-30 events** với thông tin đầy đủ
- ✅ **Multiple shows** cho mỗi event
- ✅ **Seatmap templates** (25+ templates)
- ✅ **Shows đã gán seatmap**

## 🛠 Scripts hữu ích

```bash
# Seed lại toàn bộ (xóa events/shows cũ, tạo mới)
RESET_EVENTS=true npm run seed:auto

# Seed chỉ users (nếu cần thêm users)
npm run seed:users

# Sync seatmaps từ file JSON vào database
npm run sync:seatmaps

# Update seatmaps cho shows chưa có
npm run update:seatmaps

# Xem Prisma Studio (GUI để xem database)
npm run -w packages/db db

# Cleanup database (xóa tất cả dữ liệu)
npm run dev:clean
```

## 🐛 Troubleshooting

### Lỗi kết nối database

```bash
# Kiểm tra PostgreSQL đang chạy
docker-compose ps

# Xem logs
docker-compose logs postgres

# Restart containers
docker-compose restart
```

### Lỗi JWT Secret

Đảm bảo `JWT_SECRET` trong `.env` của `auth` và `events` **GIỐNG NHAU**.

### Lỗi Port đã được sử dụng

```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### Reset toàn bộ database

```bash
# Xóa volumes và tạo lại
docker-compose down -v
docker-compose up -d

# Chạy lại migrations và seed
npm run -w packages/db migrate:dev
npm run -w packages/db db:seed
npm run seed:users
npm run seed:auto
```

## 📝 Cấu trúc Frontend

Frontend được đặt trong thư mục `frontend/`:

- `HomePage/` - Trang chủ
- `LoginUI/` - Đăng nhập/Đăng ký
- `Ticketbox/` - Tìm kiếm và chi tiết sự kiện
- `seatmapUI/` - Chọn ghế
- `PurchaseUI/` - Thanh toán
- `my_ticket/` - Vé của tôi
- `DashboardUI/` - Dashboard admin

Mở các file HTML trực tiếp trong browser hoặc dùng Live Server extension.

## 🔄 Workflow phát triển

1. **Start services**: Chạy auth, events, gateway
2. **Develop**: Sửa code, services tự reload (nodemon)
3. **Test**: Test qua frontend hoặc API
4. **Database changes**: 
   - Sửa `packages/db/prisma/schema.prisma`
   - Chạy `npm run -w packages/db migrate:dev`

## 📚 Tài liệu thêm

- [README.md](./README.md) - Tổng quan dự án
- [SEATMAP_SYNC_README.md](./SEATMAP_SYNC_README.md) - Hướng dẫn seatmap
- [PURCHASE_UI_SETUP.md](./PURCHASE_UI_SETUP.md) - Setup Purchase UI

## 💡 Tips

- Dùng **Prisma Studio** để xem và chỉnh sửa dữ liệu trực tiếp: `npm run -w packages/db db`
- Frontend API base URL: `http://localhost:4000/api`
- Check logs của services để debug
- Dùng Postman/Insomnia để test API

## 🆘 Cần giúp đỡ?

Nếu gặp vấn đề, kiểm tra:
1. Docker containers đang chạy
2. Environment variables đã đúng
3. Ports không bị conflict
4. Database đã được migrate và seed


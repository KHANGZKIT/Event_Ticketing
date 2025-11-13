@echo off
REM Script tự động setup dự án Event Ticketing cho Windows
REM Chạy: setup.bat

echo 🚀 Bắt đầu setup Event Ticketing...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js chưa được cài đặt. Vui lòng cài Node.js ^>= 18.x
    exit /b 1
)

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker chưa được cài đặt. Vui lòng cài Docker
    exit /b 1
)

echo ✓ Node.js và Docker đã được cài đặt

REM Step 1: Install dependencies
echo.
echo 📦 Đang cài đặt dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Lỗi khi cài đặt dependencies
    exit /b 1
)

REM Step 2: Start Docker containers
echo.
echo 🐳 Đang khởi động PostgreSQL và Redis...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Lỗi khi khởi động Docker containers
    exit /b 1
)

REM Wait for PostgreSQL
echo ⏳ Đang chờ PostgreSQL sẵn sàng...
timeout /t 5 /nobreak >nul

REM Step 3: Create .env files if not exist
echo.
echo 📝 Kiểm tra environment files...

if not exist "packages\db\prisma\.env" (
    echo DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public" > packages\db\prisma\.env
    echo ✓ Đã tạo packages/db/prisma/.env
)

if not exist "services\auth\.env" (
    (
        echo PORT=4101
        echo JWT_SECRET=your_super_secret_jwt_key_256bits_minimum_length_required_for_production_use
        echo ADMIN_EMAIL=admin@gmail.com
        echo ADMIN_PASSWORD=Admin123
    ) > services\auth\.env
    echo ✓ Đã tạo services/auth/.env
)

if not exist "services\events\.env" (
    (
        echo PORT=4102
        echo JWT_SECRET=your_super_secret_jwt_key_256bits_minimum_length_required_for_production_use
        echo DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public"
        echo REDIS_URL=redis://localhost:6379
        echo HOLD_TTL_SECONDS=900
    ) > services\events\.env
    echo ✓ Đã tạo services/events/.env
)

if not exist "services\gateway\.env" (
    (
        echo PORT=4000
        echo AUTH_URL=http://localhost:4101
        echo EVENTS_URL=http://localhost:4102
    ) > services\gateway\.env
    echo ✓ Đã tạo services/gateway/.env
)

REM Step 4: Run migrations
echo.
echo 🗄️  Đang chạy database migrations...
call npm run -w packages/db db:push
if %ERRORLEVEL% NEQ 0 (
    call npm run -w packages/db migrate:dev
)

REM Step 5: Seed data
echo.
echo 🌱 Đang seed dữ liệu mẫu...
echo   → Seed roles và admin...
call npm run -w packages/db db:seed

echo   → Seed events, shows, users và seatmaps...
call npm run seed:auto

echo.
echo ✅ Setup hoàn tất!
echo.
echo 📋 Tiếp theo:
echo   1. Chạy services trong 3 terminal riêng:
echo      Terminal 1: npm run -w services/auth dev
echo      Terminal 2: npm run -w services/events dev
echo      Terminal 3: npm run -w services/gateway dev
echo.
echo   2. Mở frontend: frontend\HomePage\source\TrangChu.html
echo.
echo   3. Đăng nhập với:
echo      Admin: admin@gmail.com / Admin123
echo      User: user1@gmail.com / Password@123

pause


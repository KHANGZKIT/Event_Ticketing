#!/bin/bash

# Script tự động setup dự án Event Ticketing
# Chạy: bash setup.sh

set -e  # Exit on error

echo "🚀 Bắt đầu setup Event Ticketing..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js chưa được cài đặt. Vui lòng cài Node.js >= 18.x${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker chưa được cài đặt. Vui lòng cài Docker${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js và Docker đã được cài đặt${NC}"

# Step 1: Install dependencies
echo -e "\n${YELLOW}📦 Đang cài đặt dependencies...${NC}"
npm install

# Step 2: Start Docker containers
echo -e "\n${YELLOW}🐳 Đang khởi động PostgreSQL và Redis...${NC}"
docker-compose up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Đang chờ PostgreSQL sẵn sàng...${NC}"
sleep 5

# Step 3: Check if .env files exist, create if not
echo -e "\n${YELLOW}📝 Kiểm tra environment files...${NC}"

# Database .env
if [ ! -f "packages/db/prisma/.env" ]; then
    echo "DATABASE_URL=\"postgresql://admin:secret@localhost:5432/eventdb?schema=public\"" > packages/db/prisma/.env
    echo -e "${GREEN}✓ Đã tạo packages/db/prisma/.env${NC}"
fi

# Auth .env
if [ ! -f "services/auth/.env" ]; then
    cat > services/auth/.env << EOF
PORT=4101
JWT_SECRET=your_super_secret_jwt_key_256bits_minimum_length_required_for_production_use
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=Admin123
EOF
    echo -e "${GREEN}✓ Đã tạo services/auth/.env${NC}"
fi

# Events .env
if [ ! -f "services/events/.env" ]; then
    cat > services/events/.env << EOF
PORT=4102
JWT_SECRET=your_super_secret_jwt_key_256bits_minimum_length_required_for_production_use
DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public"
REDIS_URL=redis://localhost:6379
HOLD_TTL_SECONDS=900
EOF
    echo -e "${GREEN}✓ Đã tạo services/events/.env${NC}"
fi

# Gateway .env
if [ ! -f "services/gateway/.env" ]; then
    cat > services/gateway/.env << EOF
PORT=4000
AUTH_URL=http://localhost:4101
EVENTS_URL=http://localhost:4102
EOF
    echo -e "${GREEN}✓ Đã tạo services/gateway/.env${NC}"
fi

# Step 4: Run migrations
echo -e "\n${YELLOW}🗄️  Đang chạy database migrations...${NC}"
npm run -w packages/db db:push || npm run -w packages/db migrate:dev

# Step 5: Seed data
echo -e "\n${YELLOW}🌱 Đang seed dữ liệu mẫu...${NC}"
echo -e "${YELLOW}  → Seed roles và admin...${NC}"
npm run -w packages/db db:seed

echo -e "${YELLOW}  → Seed events, shows, users và seatmaps...${NC}"
npm run seed:auto

echo -e "\n${GREEN}✅ Setup hoàn tất!${NC}"
echo -e "\n${GREEN}📋 Tiếp theo:${NC}"
echo -e "  1. Chạy services trong 3 terminal riêng:"
echo -e "     ${YELLOW}Terminal 1:${NC} npm run -w services/auth dev"
echo -e "     ${YELLOW}Terminal 2:${NC} npm run -w services/events dev"
echo -e "     ${YELLOW}Terminal 3:${NC} npm run -w services/gateway dev"
echo -e "\n  2. Mở frontend: ${YELLOW}frontend/HomePage/source/TrangChu.html${NC}"
echo -e "\n  3. Đăng nhập với:"
echo -e "     ${YELLOW}Admin:${NC} admin@gmail.com / Admin123"
echo -e "     ${YELLOW}User:${NC} user1@gmail.com / Password@123"


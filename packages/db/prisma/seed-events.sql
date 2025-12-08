-- ============================================
-- 🎭 SEED EVENTS với ẢNH CHẤT LƯỢNG CAO
-- Nguồn: Pexels, Pixabay (Free, High-res)
-- ============================================

-- Xóa data cũ (optional)
DELETE FROM "Ticket" WHERE 1=1;
DELETE FROM "Show" WHERE 1=1;
DELETE FROM "Event" WHERE 1=1;
DELETE FROM "Coupon" WHERE 1=1;

-- ============================================
-- 🎫 MÃ GIẢM GIÁ
-- ============================================
INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "usageLimit", "usedCount", "expiresAt", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'NEWYEAR2025', 'percent', 25, 100, 0, '2025-01-31 23:59:59', NOW(), NOW()),
  (gen_random_uuid(), 'STUDENT50K', 'fixed', 50000, 200, 0, '2025-06-30 23:59:59', NOW(), NOW()),
  (gen_random_uuid(), 'VIP100K', 'fixed', 100000, 50, 0, '2025-03-31 23:59:59', NOW(), NOW()),
  (gen_random_uuid(), 'FLASH30', 'percent', 30, 30, 0, '2025-01-15 23:59:59', NOW(), NOW()),
  (gen_random_uuid(), 'WELCOME10', 'percent', 10, 500, 0, '2025-12-31 23:59:59', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 🎭 SỰ KIỆN VỚI ẢNH ĐẸP
-- ============================================

INSERT INTO "Event" (id, name, description, city, category, "startsAt", cover, "createdAt", "updatedAt")
VALUES 
  -- Concert - Ảnh sân khấu neon đẹp
  ('evt-001', 'SON TUNG M-TP: SKY TOUR 2025', 
   'Đại nhạc hội hoành tráng nhất năm với sự trở lại của Sơn Tùng M-TP. Trải nghiệm âm nhạc đỉnh cao với dàn âm thanh ánh sáng hiện đại bậc nhất.', 
   'Hà Nội', 'concert', '2025-02-14 19:00:00', 
   'https://i.ytimg.com/vi/Z2DvdjaEQtE/maxresdefault.jpg', 
   NOW(), NOW()),
  
  -- Theater - Ảnh sân khấu kịch
  ('evt-002', 'Vở kịch: TRƯƠNG CHI - MỊ NƯƠNG', 
   'Câu chuyện tình yêu bất hủ được tái hiện hoành tráng. Dàn diễn viên tài năng, đạo cụ lộng lẫy.', 
   'Hà Nội', 'theater', '2025-01-20 19:30:00', 
   'https://i.ytimg.com/vi/NO3f6gAxfbE/maxresdefault.jpg', 
   NOW(), NOW()),
  
  -- Sports - Ảnh bóng đá
  ('evt-003', 'AFF CUP 2025: VIỆT NAM vs THÁI LAN', 
   'Trận chung kết lượt về AFF Cup 2025. Cơ hội lịch sử để tuyển Việt Nam bảo vệ ngôi vương!', 
   'Hà Nội', 'sports', '2025-01-25 19:00:00', 
   'https://media.techz.vn/media2019/upload2019/2025/01/02/truc-tiep-viet-nam-vs-thai-lan-chung-ket-aff-cup-2024_02012025155031.jpg', 
   NOW(), NOW()),
  
  -- Festival EDM - Ảnh lễ hội đèn neon
  ('evt-004', 'RAVOLUTION MUSIC FESTIVAL 2025', 
   'Lễ hội âm nhạc điện tử lớn nhất Việt Nam với DJ quốc tế: Martin Garrix, Tiësto, Alan Walker...', 
   'Hà Nội', 'festival', '2025-03-15 16:00:00', 
   'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800', 
   NOW(), NOW()),
  
  -- Comedy - Ảnh sân khấu micro
  ('evt-005', 'TRẤN THÀNH LIVE SHOW: CƯỜI ĐỂ YÊU THƯƠNG', 
   'Đêm hài kịch đặc biệt với Trấn Thành và dàn nghệ sĩ hàng đầu. Một đêm cười nghiêng ngả!', 
   'TP.HCM', 'comedy', '2025-02-28 20:00:00', 
   'https://images.pexels.com/photos/3692912/pexels-photo-3692912.jpeg?auto=compress&cs=tinysrgb&w=800', 
   NOW(), NOW()),
  
  -- Opera/Musical - Ảnh nhạc kịch
  ('evt-006', 'THE PHANTOM OF THE OPERA', 
   'Vở nhạc kịch Broadway huyền thoại lần đầu tiên được trình diễn tại Việt Nam với dàn diễn viên quốc tế.', 
   'TP.HCM', 'theater', '2025-04-10 19:00:00', 
   'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800', 
   NOW(), NOW()),
  
  -- K-pop Concert - Ảnh concert đông người
  ('evt-007', 'BLACKPINK WORLD TOUR: BORN PINK VIETNAM', 
   'Nhóm nhạc nữ hàng đầu thế giới BLACKPINK đến Việt Nam! Trải nghiệm bữa tiệc âm nhạc và vũ đạo đỉnh cao.', 
   'TP.HCM', 'concert', '2025-05-20 18:00:00', 
   'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800', 
   NOW(), NOW()),
  
  -- Stand-up Comedy - Ảnh spotlight
  ('evt-008', 'SAIGON STAND-UP COMEDY NIGHT', 
   'Đêm hài độc thoại với các comedian tài năng nhất Việt Nam. Tiếng cười không giới hạn!', 
   'TP.HCM', 'comedy', '2025-01-18 20:00:00', 
   'https://images.pexels.com/photos/1916821/pexels-photo-1916821.jpeg?auto=compress&cs=tinysrgb&w=800', 
   NOW(), NOW()),
   
  -- Classical Concert - Ảnh nhạc cổ điển
  ('evt-009', 'ĐÊM NHẠC GIAO HƯỞNG: BEETHOVEN & MOZART', 
   'Dàn nhạc giao hưởng quốc gia trình diễn những tác phẩm bất hủ của Beethoven và Mozart.', 
   'Hà Nội', 'concert', '2025-03-08 20:00:00', 
   'https://images.pexels.com/photos/995301/pexels-photo-995301.jpeg?auto=compress&cs=tinysrgb&w=800', 
   NOW(), NOW()),
   
  -- Movie Premiere - Ảnh thảm đỏ
  ('evt-010', 'PREMIERE: MAI 2 - BỘ PHIM TẾT 2025', 
   'Buổi công chiếu đặc biệt phim Tết Mai 2 với sự tham gia của đạo diễn và dàn diễn viên.', 
   'TP.HCM', 'premiere', '2025-01-28 18:00:00', 
   'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800', 
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 🪑 SEATMAPS (Sơ đồ ghế)
-- ============================================

INSERT INTO "SeatMap" (id, name, schema, "createdAt")
VALUES 
  -- Sơ đồ lớn cho concert (100 ghế VIP, 200 Standard, 300 Economy)
  ('seatmap-large', 'Concert Hall - 600 seats', 
   '{"rows": 20, "seatsPerRow": 30, "priceTiers": {"VIP": 2000000, "Standard": 1000000, "Economy": 500000}, "seats": []}',
   NOW()),
  
  -- Sơ đồ theater (50 ghế Premium, 100 Standard)
  ('seatmap-theater', 'Theater - 150 seats',
   '{"rows": 10, "seatsPerRow": 15, "priceTiers": {"Premium": 800000, "Standard": 400000}, "seats": []}',
   NOW()),
  
  -- Sơ đồ nhỏ cho comedy club (80 ghế)
  ('seatmap-small', 'Comedy Club - 80 seats',
   '{"rows": 8, "seatsPerRow": 10, "priceTiers": {"Front": 500000, "Back": 300000}, "seats": []}',
   NOW()),
   
  -- Sơ đồ sân vận động
  ('seatmap-stadium', 'Stadium - 1000 seats',
   '{"rows": 50, "seatsPerRow": 20, "priceTiers": {"VIP": 3000000, "Hạng A": 1500000, "Hạng B": 800000, "Hạng C": 400000}, "seats": []}',
   NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 🎬 SHOWS (Suất chiếu)
-- ============================================

INSERT INTO "Show" (id, "eventId", "startsAt", venue, "seatMapId", status, "createdAt", "updatedAt")
VALUES 
  -- Son Tung Concert (2 suất)
  ('show-001-a', 'evt-001', '2025-02-14 19:00:00', 'Sân vận động Mỹ Đình', 'seatmap-large', 'scheduled', NOW(), NOW()),
  ('show-001-b', 'evt-001', '2025-02-15 19:00:00', 'Sân vận động Mỹ Đình', 'seatmap-large', 'scheduled', NOW(), NOW()),
  
  -- Truong Chi Theater (3 suất)
  ('show-002-a', 'evt-002', '2025-01-20 19:30:00', 'Nhà hát Lớn Hà Nội', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  ('show-002-b', 'evt-002', '2025-01-21 19:30:00', 'Nhà hát Lớn Hà Nội', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  ('show-002-c', 'evt-002', '2025-01-22 14:30:00', 'Nhà hát Lớn Hà Nội', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  
  -- AFF Cup (1 trận)
  ('show-003-a', 'evt-003', '2025-01-25 19:00:00', 'Sân vận động Mỹ Đình', 'seatmap-stadium', 'scheduled', NOW(), NOW()),
  
  -- EDM Festival (1 ngày)
  ('show-004-a', 'evt-004', '2025-03-15 16:00:00', 'Công viên Yên Sở', 'seatmap-large', 'scheduled', NOW(), NOW()),
  
  -- Tran Thanh Comedy (2 suất)
  ('show-005-a', 'evt-005', '2025-02-28 20:00:00', 'Nhà hát Hòa Bình', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  ('show-005-b', 'evt-005', '2025-03-01 20:00:00', 'Nhà hát Hòa Bình', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  
  -- Phantom Opera (3 suất)
  ('show-006-a', 'evt-006', '2025-04-10 19:00:00', 'Nhà hát TP.HCM', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  ('show-006-b', 'evt-006', '2025-04-11 19:00:00', 'Nhà hát TP.HCM', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  ('show-006-c', 'evt-006', '2025-04-12 14:00:00', 'Nhà hát TP.HCM', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  
  -- Blackpink Concert (2 đêm)
  ('show-007-a', 'evt-007', '2025-05-20 18:00:00', 'Sân vận động Phú Thọ', 'seatmap-large', 'scheduled', NOW(), NOW()),
  ('show-007-b', 'evt-007', '2025-05-21 18:00:00', 'Sân vận động Phú Thọ', 'seatmap-large', 'scheduled', NOW(), NOW()),
  
  -- Stand-up Comedy (1 đêm)
  ('show-008-a', 'evt-008', '2025-01-18 20:00:00', 'Soul Live Project Q1', 'seatmap-small', 'scheduled', NOW(), NOW()),
  
  -- Classical Concert (1 đêm)
  ('show-009-a', 'evt-009', '2025-03-08 20:00:00', 'Nhà hát Lớn Hà Nội', 'seatmap-theater', 'scheduled', NOW(), NOW()),
  
  -- Movie Premiere (1 buổi)
  ('show-010-a', 'evt-010', '2025-01-28 18:00:00', 'CGV Landmark 81', 'seatmap-small', 'scheduled', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ✅ HOÀN THÀNH! 
-- 10 Events + 4 SeatMaps + 18 Shows + 5 Coupons
-- ============================================

-- ============================================
-- 🖼️ UPDATE ẢNH CHO TẤT CẢ EVENTS
-- ============================================

UPDATE "Event" SET cover = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-001';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-002';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-003';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-004';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/3692912/pexels-photo-3692912.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-005';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-006';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-007';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/1916821/pexels-photo-1916821.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-008';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/995301/pexels-photo-995301.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-009';
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'evt-010';

-- Update các event khác (nếu có) với ảnh random
UPDATE "Event" SET cover = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE cover IS NULL OR cover LIKE '%ytimg%' OR cover LIKE '%techz%';

-- ✅ Done!

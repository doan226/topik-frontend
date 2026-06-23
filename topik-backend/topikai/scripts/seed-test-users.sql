-- Tài khoản test: đăng nhập A / 1 (FREE) và A1 / 1 (PREMIUM)
-- Chạy: mysql -u root -p topik_db < scripts/seed-test-users.sql
-- Hash BCrypt (cost 10) cho mật khẩu "1"

USE topik_db;

-- Sửa tài khoản đã tồn tại trên production (Railway / MySQL ngoài Render)
UPDATE users SET
  password = '$2a$10$ayJdSa20GWhU8mAvBhxQWuyiKdBzTFL8IS2pE9aGzUKmQMseGivtO',
  email = 'a@test.topik.local',
  is_verified = 1,
  verification_code = NULL,
  role = 'FREE_USER',
  reminder_enabled = 1
WHERE username = 'A';

UPDATE users SET
  password = '$2a$10$ayJdSa20GWhU8mAvBhxQWuyiKdBzTFL8IS2pE9aGzUKmQMseGivtO',
  email = 'a1@test.topik.local',
  is_verified = 1,
  verification_code = NULL,
  role = 'PREMIUM_USER',
  reminder_enabled = 1
WHERE username IN ('A1', 'a1');

-- Đổi a1 → A1 nếu chưa có A1
UPDATE users SET username = 'A1'
WHERE username = 'a1'
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM users WHERE username = 'A1') t);

INSERT INTO users (username, password, email, is_verified, verification_code, role, reminder_enabled, created_at)
VALUES
  ('A',  '$2a$10$ayJdSa20GWhU8mAvBhxQWuyiKdBzTFL8IS2pE9aGzUKmQMseGivtO', 'a@test.topik.local',  1, NULL, 'FREE_USER',    1, NOW()),
  ('A1', '$2a$10$ayJdSa20GWhU8mAvBhxQWuyiKdBzTFL8IS2pE9aGzUKmQMseGivtO', 'a1@test.topik.local', 1, NULL, 'PREMIUM_USER', 1, NOW())
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  email = VALUES(email),
  is_verified = 1,
  verification_code = NULL,
  role = VALUES(role),
  reminder_enabled = 1;

SELECT id, username, email, role, is_verified FROM users WHERE username IN ('A', 'A1');

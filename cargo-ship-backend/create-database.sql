-- 创建数据库
CREATE DATABASE IF NOT EXISTS cargo_ships_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 显示数据库
SHOW DATABASES LIKE 'cargo_ships_db';

-- 使用数据库
USE cargo_ships_db;

-- 显示确认消息
SELECT 'Database cargo_ships_db created successfully!' AS message;

-- ========================================
-- 数据库验证脚本
-- ========================================

USE cargo_ships_db;

-- 1. 显示所有表
SHOW TABLES;

-- 2. 查看迁移记录表
SELECT * FROM migrations;

-- 3. 统计各表记录数
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- 4. 查看角色数据
SELECT id, name, description, is_system, is_active
FROM roles
ORDER BY name;

-- 5. 查看权限数据（前10条）
SELECT id, name, resource, action, description
FROM permissions
ORDER BY name
LIMIT 10;

-- 6. 查看角色权限关联（administrator角色）
SELECT
    r.name AS role_name,
    p.name AS permission_name,
    p.resource,
    p.action
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'administrator'
ORDER BY p.name
LIMIT 10;

-- 7. 查看users表结构
DESCRIBE users;

-- 8. 查看permissions表结构
DESCRIBE permissions;

-- 9. 查看外键约束
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    REFERENCED_TABLE_SCHEMA = 'cargo_ships_db'
    AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 10. 查看索引
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'cargo_ships_db'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

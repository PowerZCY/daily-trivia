-- 第一步：彻底删除 dailyt schema（连里面的表、序列、权限全炸）
-- 为防止误操作，该SQL注释掉，只有初始化时才使用！
-- DROP SCHEMA IF EXISTS dailyt CASCADE;

-- 第二步：重新创建干净的 dailyt schema
CREATE SCHEMA dailyt;

-- 第三步：把所有权给 postgres（防止任何权限问题）
ALTER SCHEMA dailyt OWNER TO postgres;

-- 第四步：给常用角色全开权限（本地开发保险起见）
GRANT ALL ON SCHEMA dailyt TO postgres;
GRANT ALL ON SCHEMA dailyt TO anon;
GRANT ALL ON SCHEMA dailyt TO authenticated;
GRANT ALL ON SCHEMA dailyt TO service_role;

-- 第五步：以后在这个 schema 里建的表默认关闭 RLS（本地开发神器）
ALTER DEFAULT PRIVILEGES IN SCHEMA dailyt REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA dailyt GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA dailyt GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
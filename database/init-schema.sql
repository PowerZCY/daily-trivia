-- 第一步：彻底删除 dailyt schema（连里面的表、序列、权限全炸）
-- 为防止误操作，该SQL注释掉，只有初始化时才使用！
-- DROP SCHEMA IF EXISTS dailyt CASCADE;

-- 第二步：重新创建干净的 dailyt schema
CREATE SCHEMA dailyt;

-- 第三步：把所有权给 postgres（防止任何权限问题）
ALTER SCHEMA dailyt OWNER TO postgres;

REVOKE ALL ON SCHEMA dailyt FROM anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA dailyt FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA dailyt FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dailyt FROM anon, authenticated, service_role;

REVOKE ALL ON SCHEMA dailyt FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA dailyt FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA dailyt FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dailyt FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'dailyt_app'
  ) THEN
    CREATE ROLE dailyt_app
      LOGIN
      PASSWORD 'XXXdailyt_app';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO dailyt_app;
GRANT USAGE ON SCHEMA dailyt TO dailyt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dailyt TO dailyt_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA dailyt TO dailyt_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA dailyt TO dailyt_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dailyt
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dailyt
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dailyt_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dailyt
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO dailyt_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dailyt
  GRANT EXECUTE ON FUNCTIONS TO dailyt_app;
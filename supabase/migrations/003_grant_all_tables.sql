-- ============================================================
-- Chronicle — grant service_role access to all tables
--
-- The sb_secret_* key format doesn't inherit Supabase's default
-- role grants. Run this once in the Supabase SQL Editor.
-- ============================================================

-- All existing tables
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;

-- All future tables and sequences created in this schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO service_role, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role, authenticated;

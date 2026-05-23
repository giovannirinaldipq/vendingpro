-- Migra admin.users para usar Supabase Auth como fonte de identidade.
-- Mantemos a tabela admin.users como profile + role. O campo password_hash
-- vira legado (nullable) e a criação de admin passa por auth.users.

-- Torna password_hash nullable se existir
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'admin' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    EXECUTE 'ALTER TABLE admin.users ALTER COLUMN password_hash DROP NOT NULL';
  END IF;
END $$;

-- Garante uma FK fraca para auth.users (sem cascata pra não derrubar histórico).
DO $$ BEGIN
  ALTER TABLE admin.users
    ADD CONSTRAINT admin_users_auth_fk
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin.users(is_active) WHERE is_active = true;

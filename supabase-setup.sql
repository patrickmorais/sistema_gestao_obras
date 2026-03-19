-- ============================================================
-- SUPABASE SETUP – Sistema Gestão de Obras (SGO)
-- Execute este script no SQL Editor do Supabase Dashboard:
--   https://supabase.com/dashboard → seu projeto → SQL Editor
-- ============================================================

-- =====================
-- 0. PERFIS DE USUÁRIO (estende auth.users)
-- =====================
-- A tabela auth.users é gerenciada automaticamente pelo Supabase Auth.
-- A tabela abaixo armazena dados complementares de cada usuário.
-- ============================================================
-- CORREÇÃO: "Database error saving new user"
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Garantir que a tabela profiles existe
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT,
  email       TEXT,
  telefone    TEXT,
  cargo       TEXT DEFAULT 'Usuário',
  avatar_url  TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas (caso existam) e recriar
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated full access" ON profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Recriar trigger com tratamento de erro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome, email, cargo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Usuário')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================
-- 6. TABELA OBRAS
-- =====================
CREATE TABLE IF NOT EXISTS obras (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo      TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'Não iniciada'
              CHECK (status IN ('Não iniciada', 'Em andamento', 'Atrasada', 'Concluída', 'Paralisada')),
  nome        TEXT NOT NULL,
  cliente     TEXT NOT NULL,
  cidade      TEXT NOT NULL,
  progresso   SMALLINT NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID REFERENCES auth.users(id)
);

ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON obras;
CREATE POLICY "Authenticated full access"
  ON obras FOR ALL
  USING (auth.role() = 'authenticated');

-- Trigger: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_obras_updated ON obras;
CREATE TRIGGER trg_obras_updated
  BEFORE UPDATE ON obras
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =====================
-- 7. TABELA ORÇAMENTO_OBRA
-- =====================
CREATE TABLE IF NOT EXISTS orcamento_obra (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo           TEXT NOT NULL UNIQUE,
  obra             TEXT NOT NULL,
  cliente          TEXT NOT NULL,
  status_obra      TEXT NOT NULL DEFAULT 'Em Orçamento'
                   CHECK (status_obra IN ('Em Orçamento', 'Orçamento Aprovado', 'Paralisada')),
  status_proposta  TEXT NOT NULL DEFAULT 'Em revisão'
                   CHECK (status_proposta IN ('Em revisão', 'Aprovado', 'Rejeitado')),
  custo            NUMERIC(14,2) NOT NULL DEFAULT 0,
  preco            NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  user_id          UUID REFERENCES auth.users(id)
);

ALTER TABLE orcamento_obra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON orcamento_obra;
CREATE POLICY "Authenticated full access"
  ON orcamento_obra FOR ALL
  USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_orcamento_obra_updated ON orcamento_obra;
CREATE TRIGGER trg_orcamento_obra_updated
  BEFORE UPDATE ON orcamento_obra
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =====================
-- 8. TABELA CATÁLOGO DE INSUMOS
-- =====================
CREATE TABLE IF NOT EXISTS catalogo_insumo (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo           NUMERIC(8,0) NOT NULL UNIQUE,
  descricao        VARCHAR(270) NOT NULL,
  tipo             VARCHAR(30) NOT NULL,
  unidade          VARCHAR(3) NOT NULL,
  grupo            VARCHAR(30),
  base             VARCHAR(30),
  custo_unitario   NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  user_id          UUID REFERENCES auth.users(id)
);

ALTER TABLE catalogo_insumo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON catalogo_insumo;
CREATE POLICY "Authenticated full access"
  ON catalogo_insumo FOR ALL
  USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_catalogo_insumo_updated ON catalogo_insumo;
CREATE TRIGGER trg_catalogo_insumo_updated
  BEFORE UPDATE ON catalogo_insumo
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =====================
-- 9. TABELA CATÁLOGO SINAPI
-- =====================
CREATE TABLE IF NOT EXISTS catalogo_sinapi (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo           NUMERIC(8,0) NOT NULL UNIQUE,
  descricao        VARCHAR(270) NOT NULL,
  unidade          VARCHAR(10),
  grupo            VARCHAR(60),
  origem_preco     VARCHAR(60),
  estado           VARCHAR(2),
  preco            NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  user_id          UUID REFERENCES auth.users(id)
);

ALTER TABLE catalogo_sinapi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON catalogo_sinapi;
CREATE POLICY "Authenticated full access"
  ON catalogo_sinapi FOR ALL
  USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_catalogo_sinapi_updated ON catalogo_sinapi;
CREATE TRIGGER trg_catalogo_sinapi_updated
  BEFORE UPDATE ON catalogo_sinapi
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
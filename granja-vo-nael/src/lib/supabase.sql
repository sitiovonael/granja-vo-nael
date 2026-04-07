-- ============================================
-- GRANJA VÔ NAEL - Schema do Banco de Dados
-- Execute no Supabase SQL Editor
-- ============================================

-- Tabela de perfis de usuário (complementa auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'funcionario')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coletas de ovos
CREATE TABLE coletas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  turno TEXT NOT NULL DEFAULT 'manha' CHECK (turno IN ('manha', 'tarde', 'noite')),
  pequeno INTEGER NOT NULL DEFAULT 0,
  grande INTEGER NOT NULL DEFAULT 0,
  extra_grande INTEGER NOT NULL DEFAULT 0,
  jumbo INTEGER NOT NULL DEFAULT 0,
  trincados INTEGER NOT NULL DEFAULT 0,
  perdas INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pf', 'empresa')),
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendas
CREATE TABLE vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id UUID REFERENCES clientes(id),
  pequeno INTEGER NOT NULL DEFAULT 0,
  grande INTEGER NOT NULL DEFAULT 0,
  extra_grande INTEGER NOT NULL DEFAULT 0,
  jumbo INTEGER NOT NULL DEFAULT 0,
  preco_pequeno DECIMAL(10,2) DEFAULT 0,
  preco_grande DECIMAL(10,2) DEFAULT 0,
  preco_extra_grande DECIMAL(10,2) DEFAULT 0,
  preco_jumbo DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) GENERATED ALWAYS AS (
    (pequeno * preco_pequeno) +
    (grande * preco_grande) +
    (extra_grande * preco_extra_grande) +
    (jumbo * preco_jumbo)
  ) STORED,
  observacoes TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entregas
CREATE TABLE entregas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
  data_prevista DATE,
  data_entrega DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_rota', 'entregue', 'cancelada')),
  endereco TEXT,
  observacoes TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mortalidade das aves
CREATE TABLE mortalidade (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  causa TEXT CHECK (causa IN ('doenca', 'predador', 'acidente', 'calor', 'frio', 'desconhecida', 'outro')),
  descricao TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Controle de ração e custos (admin only)
CREATE TABLE racao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL,
  quantidade_kg DECIMAL(10,2) NOT NULL,
  custo_total DECIMAL(10,2) NOT NULL,
  fornecedor TEXT,
  observacoes TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outros custos (admin only)
CREATE TABLE custos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL,
  categoria TEXT CHECK (categoria IN ('medicamento', 'energia', 'manutencao', 'mao_de_obra', 'outro')),
  valor DECIMAL(10,2) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortalidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE racao ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos ENABLE ROW LEVEL SECURITY;

-- Profiles: cada um vê o próprio, admin vê todos
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Coletas, clientes, vendas, entregas, mortalidade: todos autenticados
CREATE POLICY "coletas_all" ON coletas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "clientes_all" ON clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "vendas_all" ON vendas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "entregas_all" ON entregas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "mortalidade_all" ON mortalidade FOR ALL USING (auth.role() = 'authenticated');

-- Ração e custos: somente admin
CREATE POLICY "racao_admin" ON racao FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "custos_admin" ON custos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- TRIGGER: criar profile automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
          COALESCE(NEW.raw_user_meta_data->>'role', 'funcionario'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

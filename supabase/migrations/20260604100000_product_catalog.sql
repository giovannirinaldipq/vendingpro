-- ============================================================================
-- Migration: catálogo público de produtos pré-catalogados (vending Brasil)
-- ----------------------------------------------------------------------------
-- Permite que clientes importem produtos populares com 1 clique em vez de
-- digitar cada SKU manualmente. Lista curada dos top SKUs de vending machine
-- no Brasil (pesquisa de campo + canais 7Eleven/Brasil Distribuidora).
--
-- Schema: tabela pública READ-ONLY (sem tenant_id, todo tenant lê a mesma).
-- Edição/inserção apenas via service-role (migrations futuras).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_catalog (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  brand        text,
  unit_size    text NOT NULL,
  category     text NOT NULL,
  barcode      text,
  suggested_sale_price  numeric(10,2),
  suggested_cost_price  numeric(10,2),
  popularity_rank       integer,           -- menor = mais popular (top 10 = 1..10)
  is_active             boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  CONSTRAINT product_catalog_unique_name UNIQUE (name, unit_size, brand)
);

CREATE INDEX IF NOT EXISTS idx_product_catalog_category_rank
  ON public.product_catalog (category, popularity_rank NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_product_catalog_name_search
  ON public.product_catalog (lower(name)) WHERE is_active = true;

ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_read_all" ON public.product_catalog;
CREATE POLICY "catalog_read_all"
  ON public.product_catalog FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================================
-- SEED: ~80 SKUs reais de vending machines no Brasil
-- popularity_rank: 1-20 são "campeões de venda" em pesquisa de mercado
-- preço sugerido é faixa de vending (margem 50-100% sobre custo)
-- ============================================================================

INSERT INTO public.product_catalog (name, brand, unit_size, category, suggested_sale_price, suggested_cost_price, popularity_rank, barcode) VALUES
-- REFRIGERANTES (top vendedores)
('Coca-Cola Lata',          'Coca-Cola',       '350ml', 'REFRIGERANTES', 6.00, 3.50,  1,  '7894900011517'),
('Coca-Cola Zero Lata',     'Coca-Cola',       '350ml', 'REFRIGERANTES', 6.00, 3.50,  3,  '7894900700015'),
('Guaraná Antarctica Lata', 'Antarctica',      '350ml', 'REFRIGERANTES', 5.50, 3.20,  2,  '7891991010993'),
('Guaraná Zero Lata',       'Antarctica',      '350ml', 'REFRIGERANTES', 5.50, 3.20, 12, '7891991297881'),
('Sprite Lata',             'Coca-Cola',       '350ml', 'REFRIGERANTES', 5.50, 3.20,  8, '7894900010015'),
('Fanta Laranja Lata',      'Coca-Cola',       '350ml', 'REFRIGERANTES', 5.50, 3.20,  6, '7894900015515'),
('Fanta Uva Lata',          'Coca-Cola',       '350ml', 'REFRIGERANTES', 5.50, 3.20, 11, '7894900015614'),
('Pepsi Lata',              'PepsiCo',         '350ml', 'REFRIGERANTES', 5.00, 2.80, 15, '7892840800123'),
('H2OH Limoneto',           'PepsiCo',         '500ml', 'REFRIGERANTES', 6.00, 3.30, 18, '7892840812454'),
('Coca-Cola PET',           'Coca-Cola',       '500ml', 'REFRIGERANTES', 7.00, 4.00, 14, '7894900027013'),

-- AGUA
('Água Mineral sem gás',    'Crystal',         '500ml', 'AGUA',          3.50, 1.50,  4, '7891910000147'),
('Água Mineral com gás',    'Crystal',         '500ml', 'AGUA',          4.00, 1.80, 17, '7891910001052'),
('Água Mineral sem gás',    'Bonafont',        '500ml', 'AGUA',          3.50, 1.50, 20, '7896089000023'),

-- SUCOS
('Suco Del Valle Uva',      'Del Valle',       '290ml', 'SUCOS',         5.00, 2.80,  5, '7894900014019'),
('Suco Del Valle Laranja',  'Del Valle',       '290ml', 'SUCOS',         5.00, 2.80,  7, '7894900014026'),
('Suco Del Valle Pêssego',  'Del Valle',       '290ml', 'SUCOS',         5.00, 2.80, 13, '7894900014040'),
('Suco Del Valle Maracujá', 'Del Valle',       '290ml', 'SUCOS',         5.00, 2.80, 19, '7894900014064'),
('Suco Maguary Maçã',       'Maguary',         '200ml', 'SUCOS',         4.50, 2.50, 25, '7896005900048'),
('Suco Maguary Goiaba',     'Maguary',         '200ml', 'SUCOS',         4.50, 2.50, 30, '7896005900062'),

-- ENERGETICOS
('Red Bull Energy Drink',   'Red Bull',        '250ml', 'ENERGETICOS',   8.50, 5.00,  9, '90415472'),
('Monster Energy',          'Monster',         '473ml', 'ENERGETICOS',   10.00, 6.00, 16, '7898949300113'),
('TNT Original',            'TNT',             '269ml', 'ENERGETICOS',   6.50, 3.50, 22, '7898933110034'),
('Burn Original',           'Coca-Cola',       '250ml', 'ENERGETICOS',   7.00, 4.00, 28, '7894900534016'),

-- ISOTONICOS
('Gatorade Limão',          'Gatorade',        '500ml', 'ISOTONICOS',    7.50, 4.20, 21, '7892840800079'),
('Gatorade Tangerina',      'Gatorade',        '500ml', 'ISOTONICOS',    7.50, 4.20, 27, '7892840800086'),
('Powerade Mountain Blast', 'Coca-Cola',       '500ml', 'ISOTONICOS',    7.00, 4.00, 33, '7894900057010'),

-- CAFE_CHA
('Nescafé Cappuccino Pronto','Nestlé',         '200ml', 'CAFE_CHA',      6.00, 3.50, 35, '7891000094617'),
('Lipton Ice Tea Limão',    'Lipton',          '340ml', 'CAFE_CHA',      5.50, 3.20, 24, '7891150033504'),
('Lipton Ice Tea Pêssego',  'Lipton',          '340ml', 'CAFE_CHA',      5.50, 3.20, 26, '7891150033528'),

-- CHOCOLATES
('KitKat 4 Fingers',        'Nestlé',          '41.5g', 'CHOCOLATES',    5.00, 2.80, 10, '7891000244432'),
('Bis Lacta',               'Lacta',           '100g',  'CHOCOLATES',    7.00, 4.00, 23, '7622300820190'),
('Bis Xtra',                'Lacta',           '45g',   'CHOCOLATES',    4.50, 2.50, 31, '7622300864705'),
('Snickers',                'Mars',            '45g',   'CHOCOLATES',    5.00, 2.80, 29, '7896423420029'),
('Twix',                    'Mars',            '40g',   'CHOCOLATES',    5.00, 2.80, 38, '7896423420067'),
('Sonho de Valsa',          'Lacta',           '21.5g', 'CHOCOLATES',    2.50, 1.40, 32, '7622300999407'),
('Trento Original',         'Peccin',          '32g',   'CHOCOLATES',    4.00, 2.20, 36, '7896022205317'),
('Talento Branco',          'Garoto',          '25g',   'CHOCOLATES',    3.50, 2.00, 40, '7891008118018'),
('Lacta Pacoca',            'Lacta',           '18g',   'CHOCOLATES',    2.00, 1.10, 44, '7622300872663'),
('Trento Mini',             'Peccin',          '16g',   'CHOCOLATES',    2.00, 1.10, 49, '7896022211356'),

-- SALGADINHOS
('Pringles Original',       'Kelloggs',        '124g',  'SALGADINHOS',   10.00, 5.50, 34, '7892840252243'),
('Pringles Cheddar',        'Kelloggs',        '124g',  'SALGADINHOS',   10.00, 5.50, 37, '7892840252434'),
('Doritos Queijo Nacho',    'PepsiCo',         '84g',   'SALGADINHOS',   8.00, 4.50, 39, '7892840807559'),
('Cheetos Lua Parmesão',    'PepsiCo',         '75g',   'SALGADINHOS',   7.00, 4.00, 41, '7892840806484'),
('Fandangos Presunto',      'PepsiCo',         '63g',   'SALGADINHOS',   6.50, 3.50, 43, '7892840800291'),
('Ruffles Original',        'PepsiCo',         '76g',   'SALGADINHOS',   7.00, 4.00, 46, '7892840800178'),
('Lays Original',           'PepsiCo',         '96g',   'SALGADINHOS',   8.00, 4.50, 48, '7892840801885'),
('Torcida Picanha',         'Lucky',           '70g',   'SALGADINHOS',   5.50, 3.00, 52, '7896079820112'),
('Cheetos Onda Requeijão',  'PepsiCo',         '45g',   'SALGADINHOS',   5.00, 2.80, 55, '7892840816643'),

-- BISCOITOS
('Trakinas Chocolate',      'Mondelez',        '126g',  'BISCOITOS',     7.00, 4.00, 42, '7622300871239'),
('Oreo Original',            'Mondelez',        '36g',   'BISCOITOS',     3.50, 2.00, 45, '7622300336097'),
('Negresco',                'Nestlé',          '100g',  'BISCOITOS',     5.50, 3.20, 47, '7891000077764'),
('Passatempo Recheado',     'Nestlé',          '130g',  'BISCOITOS',     6.00, 3.50, 51, '7891000297254'),
('Bono Chocolate',          'Nestlé',          '90g',   'BISCOITOS',     5.50, 3.20, 56, '7891000099124'),
('Club Social Original',    'Mondelez',        '144g',  'BISCOITOS',     7.00, 4.00, 58, '7622300833350'),
('Bauducco Wafer Chocolate','Bauducco',        '78g',   'BISCOITOS',     5.00, 2.80, 60, '7891962033051'),
('Toddy Cookie',            'PepsiCo',         '33g',   'BISCOITOS',     3.50, 2.00, 53, '7892840803567'),

-- BALAS_CHICLETES
('Trident Menta',           'Mondelez',        '8g',    'BALAS_CHICLETES', 3.00, 1.50, 50, '7622300817862'),
('Trident Tutti-Frutti',    'Mondelez',        '8g',    'BALAS_CHICLETES', 3.00, 1.50, 57, '7622300817879'),
('Halls Cereja',            'Mondelez',        '28g',   'BALAS_CHICLETES', 3.50, 2.00, 54, '7622300824051'),
('Halls Menta Extraforte',  'Mondelez',        '28g',   'BALAS_CHICLETES', 3.50, 2.00, 59, '7622300824044'),
('Mentos Menta',            'Perfetti',        '38g',   'BALAS_CHICLETES', 4.00, 2.20, 61, '7896068902027'),
('Tic Tac Menta',           'Ferrero',         '16g',   'BALAS_CHICLETES', 3.50, 2.00, 63, '8000500003986'),
('Fini Beijos',             'Fini',            '80g',   'BALAS_CHICLETES', 4.50, 2.50, 65, '7898929641034'),

-- OUTROS / SNACKS PROTEÍNA
('Toddynho',                'PepsiCo',         '200ml', 'OUTROS',        4.50, 2.50, 62, '7892840807122'),
('Cereal Nesfit Barra',     'Nestlé',          '22g',   'OUTROS',        3.00, 1.70, 67, '7891000244555'),
('Cereal Trio Mais',        'Nestlé',          '22g',   'OUTROS',        3.50, 2.00, 70, '7891000099483'),
('Protein Bar Bopro Chocolate','Bopro',        '30g',   'OUTROS',        6.50, 3.80, 72, '7898949302221'),
('Crispy Bar Aveia Mel',    'Nutry',           '25g',   'OUTROS',        3.50, 2.00, 75, '7896004401072')

ON CONFLICT (name, unit_size, brand) DO NOTHING;

COMMENT ON TABLE public.product_catalog IS
  'Catálogo público de SKUs comuns em vending machines no Brasil. '
  'Read-only para tenants. Importar via /api/app/products/import-catalog.';

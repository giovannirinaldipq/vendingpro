-- ============================================================================
-- Migration: expandir catalogo publico de produtos (~120 SKUs adicionais)
-- Categorias novas: cafes prontos, cervejas sem alcool, saudaveis, lacticinios,
-- sorvetes, conveniencia, e mais variacoes de snacks/chocolates/bebidas.
-- ============================================================================

INSERT INTO public.product_catalog (name, brand, unit_size, category, suggested_sale_price, suggested_cost_price, popularity_rank, barcode) VALUES

-- CAFES PRONTOS
('Starbucks Frappuccino Mocha',    'Starbucks',     '281ml', 'CAFE_CHA',      12.00, 7.00, 76, '0048500202937'),
('Starbucks Frappuccino Vanilla',  'Starbucks',     '281ml', 'CAFE_CHA',      12.00, 7.00, 77, '0048500202944'),
('Nescafe Smoovlatte Cappuccino',  'Nestle',        '270ml', 'CAFE_CHA',       7.00, 4.00, 78, '7891000094624'),
('Nescafe Smoovlatte Mocha',       'Nestle',        '270ml', 'CAFE_CHA',       7.00, 4.00, 79, '7891000094631'),
('3 Coracoes Cappuccino Pronto',   '3 Coracoes',    '240ml', 'CAFE_CHA',       6.50, 3.80, 80, '7896005800041'),
('3 Coracoes Cafe Gelado',         '3 Coracoes',    '240ml', 'CAFE_CHA',       6.50, 3.80, 81, '7896005800058'),
('Cafe do Ponto Espresso Pronto',  'Cafe do Ponto', '200ml', 'CAFE_CHA',       6.00, 3.50, 82, '7891000315019'),
('Cha Leao Fuze Ice Tea Limao',    'Leao',          '300ml', 'CAFE_CHA',       5.00, 2.80, 83, '7891098000101'),
('Cha Leao Fuze Ice Tea Pessego',  'Leao',          '300ml', 'CAFE_CHA',       5.00, 2.80, 84, '7891098000118'),
('Mate Leao Natural',              'Leao',          '340ml', 'CAFE_CHA',       5.00, 2.80, 85, '7891098000125'),

-- CERVEJAS SEM ALCOOL
('Heineken 0.0 Long Neck',    'Heineken',    '330ml', 'CERVEJAS_ZERO', 8.00, 4.80, 86, '8712000900014'),
('Brahma 0.0 Lata',           'Ambev',       '350ml', 'CERVEJAS_ZERO', 5.50, 3.20, 87, '7891149101900'),
('Budweiser Zero Lata',       'Ambev',       '350ml', 'CERVEJAS_ZERO', 6.00, 3.50, 88, '7891149108800'),
('Corona Cero Long Neck',     'Ambev',       '330ml', 'CERVEJAS_ZERO', 8.50, 5.00, 89, '7501064199813'),
('Stella Artois 0.0 Lata',    'Ambev',       '350ml', 'CERVEJAS_ZERO', 7.00, 4.20, 90, '7891149105700'),

-- SAUDAVEIS / BARRAS PROTEICAS
('Bold Bar Cookies',           'Bold',        '60g',  'SAUDAVEIS', 9.00, 5.50, 91, '7898958662011'),
('Bold Bar Brownie',           'Bold',        '60g',  'SAUDAVEIS', 9.00, 5.50, 92, '7898958662028'),
('Bold Bar Pacoca',            'Bold',        '60g',  'SAUDAVEIS', 9.00, 5.50, 93, '7898958662035'),
('Nutry Barra Nuts Sementes',  'Nutry',       '30g',  'SAUDAVEIS', 4.50, 2.50, 94, '7896004402017'),
('Nutry Barra Nuts Cranberry', 'Nutry',       '30g',  'SAUDAVEIS', 4.50, 2.50, 95, '7896004402024'),
('Trio Barra Cereal Banana',   'Trio',        '25g',  'SAUDAVEIS', 3.50, 2.00, 96, '7891000099490'),
('Trio Barra Cereal Morango',  'Trio',        '25g',  'SAUDAVEIS', 3.50, 2.00, 97, '7891000099506'),
('Nature Valley Granola Mel',  'General Mills','42g', 'SAUDAVEIS', 5.00, 3.00, 98, '0016000439863'),
('Banana Brasil Passa',        'Banana Brasil','86g', 'SAUDAVEIS', 4.00, 2.20, 99, '7898396510011'),
('Mix de Nuts Natural',        'Kobber',      '40g',  'SAUDAVEIS', 6.00, 3.50, 100, '7891000100011'),
('Protein Bar Chocolate',      'Max Titanium','40g',  'SAUDAVEIS', 7.00, 4.00, 101, '7898946200011'),
('Whey Bar Coco',              'Probiotica',  '40g',  'SAUDAVEIS', 6.50, 3.80, 102, '7896438200011')

ON CONFLICT (name, unit_size, brand) DO NOTHING;

INSERT INTO public.product_catalog (name, brand, unit_size, category, suggested_sale_price, suggested_cost_price, popularity_rank, barcode) VALUES

-- IOGURTES / LACTICINIOS
('YoPro Morango',              'Danone',      '250ml', 'LACTICINIOS', 8.00, 5.00, 103, '7891025115014'),
('YoPro Natural',              'Danone',      '250ml', 'LACTICINIOS', 8.00, 5.00, 104, '7891025115021'),
('Danone Activia Ameixa',     'Danone',      '170g',  'LACTICINIOS', 5.00, 3.00, 105, '7891025102014'),
('Vigor Grego Morango',        'Vigor',       '100g',  'LACTICINIOS', 4.50, 2.80, 106, '7891025300014'),
('Yakult',                     'Yakult',      '80ml',  'LACTICINIOS', 3.50, 2.00, 107, '7891156000012'),
('Neston Vitamina Morango',    'Nestle',      '280ml', 'LACTICINIOS', 6.00, 3.50, 108, '7891000094648'),

-- SORVETES / PICOLES
('Magnum Classic',             'Kibon',       '69g',  'SORVETES', 9.00, 5.50, 109, '7891150026001'),
('Magnum White',               'Kibon',       '69g',  'SORVETES', 9.00, 5.50, 110, '7891150026018'),
('Cornetto Chocolate',         'Kibon',       '72g',  'SORVETES', 7.00, 4.00, 111, '7891150027015'),
('Kibon Eskibon',              'Kibon',       '48g',  'SORVETES', 5.00, 3.00, 112, '7891150028012'),
('Kibon Tablito',              'Kibon',       '64g',  'SORVETES', 5.50, 3.20, 113, '7891150029019'),
('Chicabon',                   'Kibon',       '62g',  'SORVETES', 5.00, 3.00, 114, '7891150030015'),
('Picole Fruttare Morango',    'Kibon',       '60g',  'SORVETES', 5.50, 3.20, 115, '7891150031012'),

-- CONVENIENCIA
('Preservativo Jontex Sensitive', 'Jontex',   '3un',  'CONVENIENCIA', 12.00, 7.00, 116, '7896222720016'),
('Preservativo Olla Lubrificado', 'Olla',     '3un',  'CONVENIENCIA', 10.00, 6.00, 117, '7896049540011'),
('Absorvente Intimus Gel Normal', 'Intimus',  '8un',  'CONVENIENCIA', 8.00, 4.80, 118, '7896007540013'),
('Lenco Umedecido Huggies',       'Huggies',  '16un', 'CONVENIENCIA', 6.00, 3.50, 119, '7896007548019'),
('Carregador Portatil 5000mAh',   'Generico', '1un',  'CONVENIENCIA', 35.00, 18.00, 120, NULL),
('Fone de Ouvido Intra',          'Generico', '1un',  'CONVENIENCIA', 20.00, 8.00, 121, NULL),
('Alcool Gel 70 Sache',           'Asseptgel','52ml', 'CONVENIENCIA', 4.00, 2.00, 122, '7898943090011'),

-- REFRIGERANTES (variacoes extras)
('Schweppes Citrus Lata',      'Coca-Cola',   '350ml', 'REFRIGERANTES', 5.50, 3.20, 124, '7894900050011'),
('Schweppes Tonica Lata',      'Coca-Cola',   '350ml', 'REFRIGERANTES', 5.50, 3.20, 125, '7894900050028'),
('Kuat Guarana Lata',          'Coca-Cola',   '350ml', 'REFRIGERANTES', 5.00, 2.80, 126, '7894900060010'),
('Sukita Laranja Lata',        'Ambev',       '350ml', 'REFRIGERANTES', 5.00, 2.80, 127, '7891149103010'),
('Dolly Guarana Lata',         'Dolly',       '350ml', 'REFRIGERANTES', 4.00, 2.20, 128, '7896042100011'),

-- AGUA (variacoes)
('Agua Mineral sem gas Minalba',   'Minalba',     '500ml', 'AGUA', 3.50, 1.50, 130, '7896065200011'),
('Agua Mineral com gas Sao Lourenco','Sao Lourenco','500ml', 'AGUA', 5.00, 2.50, 131, '7891025100010'),
('Agua de Coco Kero Coco',     'Kero Coco',   '330ml', 'AGUA', 6.00, 3.50, 132, '7894900700022'),
('Aquarius Fresh Limao',       'Coca-Cola',   '510ml', 'AGUA', 5.00, 2.80, 133, '7894900080018'),

-- SUCOS (variacoes)
('Suco Del Valle Manga',       'Del Valle',   '290ml', 'SUCOS', 5.00, 2.80, 134, '7894900014057'),
('Suco Del Valle Goiaba',      'Del Valle',   '290ml', 'SUCOS', 5.00, 2.80, 135, '7894900014071'),
('Suco Natural One Laranja',   'Natural One', '300ml', 'SUCOS', 9.00, 5.50, 136, '7898936430011'),
('Suco Do Bem Laranja',        'Do Bem',      '200ml', 'SUCOS', 6.00, 3.50, 137, '7891000315026'),
('Suco Kapo Morango',          'Coca-Cola',   '200ml', 'SUCOS', 3.50, 2.00, 138, '7894900090017')

ON CONFLICT (name, unit_size, brand) DO NOTHING;

INSERT INTO public.product_catalog (name, brand, unit_size, category, suggested_sale_price, suggested_cost_price, popularity_rank, barcode) VALUES

-- ENERGETICOS (variacoes)
('Monster Ultra',              'Monster',     '473ml', 'ENERGETICOS', 10.00, 6.00, 139, '7898949300120'),
('Red Bull Tropical',          'Red Bull',    '250ml', 'ENERGETICOS', 9.00, 5.50, 140, '90415473'),
('Red Bull Sugar Free',        'Red Bull',    '250ml', 'ENERGETICOS', 8.50, 5.00, 141, '90415474'),
('Reign Melon Mania',          'Monster',     '473ml', 'ENERGETICOS', 9.00, 5.50, 142, '7898949300137'),
('C4 Energy Cherry',           'Nutrabolt',   '473ml', 'ENERGETICOS', 12.00, 7.00, 143, '8420000000011'),

-- CHOCOLATES (variacoes)
('Diamante Negro',             'Lacta',       '90g',  'CHOCOLATES', 7.00, 4.00, 144, '7622300820206'),
('Laka',                       'Lacta',       '90g',  'CHOCOLATES', 7.00, 4.00, 145, '7622300820213'),
('Shot',                       'Lacta',       '90g',  'CHOCOLATES', 7.00, 4.00, 146, '7622300820220'),
('Suflair',                    'Nestle',      '50g',  'CHOCOLATES', 5.00, 2.80, 147, '7891000244449'),
('Prestigio',                  'Nestle',      '33g',  'CHOCOLATES', 4.00, 2.20, 148, '7891000244456'),
('Charge',                     'Nestle',      '40g',  'CHOCOLATES', 4.50, 2.50, 149, '7891000244463'),
('Kinder Bueno',               'Ferrero',     '43g',  'CHOCOLATES', 7.00, 4.20, 150, '8000500066027'),
('Ferrero Rocher',             'Ferrero',     '37.5g','CHOCOLATES', 6.00, 3.50, 151, '8000500001011'),
('MMs Chocolate',              'Mars',        '45g',  'CHOCOLATES', 5.50, 3.20, 152, '7896423420036'),
('MMs Amendoim',               'Mars',        '45g',  'CHOCOLATES', 5.50, 3.20, 153, '7896423420043'),
('Alpino',                     'Nestle',      '25g',  'CHOCOLATES', 3.50, 2.00, 154, '7891000244470'),
('Ouro Branco',                'Lacta',       '20g',  'CHOCOLATES', 2.50, 1.40, 155, '7622300999414'),

-- SALGADINHOS (variacoes)
('Doritos Sweet Chili',        'PepsiCo',     '84g',  'SALGADINHOS', 8.00, 4.50, 156, '7892840807566'),
('Cheetos Bola Queijo',        'PepsiCo',     '37g',  'SALGADINHOS', 5.00, 2.80, 157, '7892840816650'),
('Sensacoes Frango Grelhado',  'PepsiCo',     '80g',  'SALGADINHOS', 8.00, 4.50, 158, '7892840808013'),
('Pringles Sour Cream',        'Kelloggs',    '124g', 'SALGADINHOS', 10.00, 5.50, 159, '7892840252441'),
('Elma Chips Stax Original',   'PepsiCo',     '156g', 'SALGADINHOS', 12.00, 6.50, 160, '7892840810016'),
('Amendoim Japones Dori',      'Dori',        '70g',  'SALGADINHOS', 5.00, 2.80, 161, '7896058500011'),
('Pipoca Yoki Manteiga',       'Yoki',        '50g',  'SALGADINHOS', 4.50, 2.50, 162, '7891095100019'),

-- BISCOITOS (variacoes)
('Bauducco Wafer Morango',     'Bauducco',    '78g',  'BISCOITOS', 5.00, 2.80, 163, '7891962033068'),
('Bauducco Choco Biscuit',     'Bauducco',    '80g',  'BISCOITOS', 6.00, 3.50, 164, '7891962033075'),
('Piraque Recheado Chocolate', 'Piraque',     '76g',  'BISCOITOS', 4.50, 2.50, 165, '7896024720016'),
('Adria Tortinha Morango',     'Adria',       '140g', 'BISCOITOS', 6.50, 3.80, 166, '7896085000011'),
('Mabel Rosquinha Coco',       'Mabel',       '70g',  'BISCOITOS', 4.00, 2.20, 167, '7896071000011'),
('Cookies Toddy Baunilha',     'PepsiCo',     '33g',  'BISCOITOS', 3.50, 2.00, 168, '7892840803574'),

-- BALAS E CHICLETES (variacoes)
('Trident Fresh Herbal',       'Mondelez',    '8g',   'BALAS_CHICLETES', 3.00, 1.50, 169, '7622300817886'),
('Halls Extra Forte',          'Mondelez',    '28g',  'BALAS_CHICLETES', 3.50, 2.00, 170, '7622300824068'),
('7Belo Morango',              'Arcor',       '150g', 'BALAS_CHICLETES', 5.00, 2.80, 171, '7898142850011'),
('Freegells Eucalipto',        'Riclan',      '29g',  'BALAS_CHICLETES', 3.50, 2.00, 172, '7891151000011'),
('Mentos Fruit',               'Perfetti',    '38g',  'BALAS_CHICLETES', 4.00, 2.20, 173, '7896068902034'),
('Fini Tubes Morango',         'Fini',        '80g',  'BALAS_CHICLETES', 5.00, 2.80, 174, '7898929641041'),
('Bala Juquinha Amendoim',     'Santa Rita',  '40g',  'BALAS_CHICLETES', 3.00, 1.50, 175, '7896060000011'),

-- ISOTONICOS (variacoes)
('Gatorade Morango',           'Gatorade',    '500ml', 'ISOTONICOS', 7.50, 4.20, 176, '7892840800093'),
('Gatorade Maracuja',          'Gatorade',    '500ml', 'ISOTONICOS', 7.50, 4.20, 177, '7892840800109'),
('Powerade Frutas Citricas',   'Coca-Cola',   '500ml', 'ISOTONICOS', 7.00, 4.00, 178, '7894900057027'),

-- SANDUICHES / WRAPS
('Sanduiche Natural Frango',   'Generico',    '150g', 'SANDUICHES', 10.00, 5.50, 179, NULL),
('Sanduiche Natural Atum',     'Generico',    '150g', 'SANDUICHES', 10.00, 5.50, 180, NULL),
('Wrap Frango Caesar',         'Generico',    '180g', 'SANDUICHES', 12.00, 6.50, 181, NULL),
('Pao de Queijo Forno de Minas','Forno de Minas','240g','SANDUICHES', 8.00, 4.50, 182, '7896074600011'),
('Coxinha Congelada',          'Sadia',       '120g', 'SANDUICHES', 7.00, 4.00, 183, '7893000000011'),

-- OUTROS
('Leite Integral UHT',        'Parmalat',    '200ml', 'OUTROS', 4.00, 2.20, 184, '7891097000011'),
('Achocolatado Toddynho',     'PepsiCo',     '200ml', 'OUTROS', 4.50, 2.50, 185, '7892840807139'),
('Nescau Prontinho',          'Nestle',      '200ml', 'OUTROS', 4.50, 2.50, 186, '7891000094655'),
('Piracanjuba Whey Zero Lactose','Piracanjuba','250ml','OUTROS', 7.00, 4.20, 187, '7898215151012'),
('Sustagen Kids Chocolate',    'Mead Johnson','200ml', 'OUTROS', 6.00, 3.50, 188, '7891000100028')

ON CONFLICT (name, unit_size, brand) DO NOTHING;

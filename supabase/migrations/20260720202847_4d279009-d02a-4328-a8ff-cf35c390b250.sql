
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique ON public.products(barcode) WHERE barcode IS NOT NULL;

DELETE FROM public.price_alerts;
DELETE FROM public.favorites;
DELETE FROM public.reports;
DELETE FROM public.price_history;
DELETE FROM public.clicks;
DELETE FROM public.offers;
DELETE FROM public.products;
DELETE FROM public.stores;
DELETE FROM public.categories;
DELETE FROM public.brands;

INSERT INTO public.categories (slug, name, sort_order) VALUES
  ('alimentos','Alimentos',1),('bebidas','Bebidas',2),('limpeza','Limpeza',3),('higiene','Higiene',4),
  ('acougue','Açougue',5),('hortifruti','Hortifruti',6),('padaria','Padaria',7),('pet-shop','Pet Shop',8);

INSERT INTO public.stores (slug, name, description, city, state, address, cep, phone, email, opening_hours, latitude, longitude, trust_score, status, logo_url, banner_url, about, featured_product_ids) VALUES
  ('bom-preco','Supermercado Bom Preço','Rede tradicional com preços acessíveis para toda família.','Curitiba','PR','Av. República Argentina, 1234','80620-010','(41) 3200-1000','contato@bompreco.com.br','Seg-Sáb 07h-22h, Dom 08h-20h',-25.443300,-49.284400,4.6,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=bompreco','https://picsum.photos/seed/bompreco-b/1200/300','Fundado em 1987, o Bom Preço leva economia ao paranaense com foco em produtos essenciais.','{}'::uuid[]),
  ('atacadao-parana','Atacadão Paraná','Atacarejo com preços de atacado para consumidor final.','Londrina','PR','Rua Higienópolis, 2500','86020-060','(43) 3300-2000','sac@atacadaopr.com.br','Seg-Dom 07h-22h',-23.310200,-51.163300,4.3,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=atacadao','https://picsum.photos/seed/atacadao-b/1200/300','Atacarejo com foco em compras grandes para famílias e pequenos comércios.','{}'::uuid[]),
  ('mercado-economico','Mercado Econômico','Preços baixos todos os dias no seu bairro.','Maringá','PR','Av. Colombo, 1800','87020-000','(44) 3100-3000','contato@mercadoeconomico.com.br','Seg-Sáb 08h-21h',-23.421000,-51.933800,4.4,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=economico','https://picsum.photos/seed/economico-b/1200/300','Mercado de bairro com atendimento próximo e preços competitivos.','{}'::uuid[]),
  ('condor','Condor Super Center','Grande rede paranaense com variedade e qualidade.','Curitiba','PR','Av. Sete de Setembro, 5000','80240-000','(41) 3300-4000','sac@condor.com.br','Seg-Dom 08h-22h',-25.442800,-49.271000,4.7,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=condor','https://picsum.photos/seed/condor-b/1200/300','A maior rede supermercadista paranaense, com mais de 40 anos de história.','{}'::uuid[]),
  ('muffato','Super Muffato','Tradição paranaense em atacarejo e supermercado.','Cascavel','PR','Av. Brasil, 4500','85810-000','(45) 3200-5000','contato@muffato.com.br','Seg-Dom 07h30-22h30',-24.955700,-53.455200,4.5,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=muffato','https://picsum.photos/seed/muffato-b/1200/300','Fundado em Cascavel em 1974, atua em três estados com atacarejo e supermercados.','{}'::uuid[]),
  ('carrefour','Carrefour Bairro','Rede internacional com opções para todos os bolsos.','Curitiba','PR','Av. Cândido de Abreu, 1400','80530-000','(41) 3400-6000','sac@carrefour.com.br','Seg-Dom 07h-23h',-25.415500,-49.269300,4.4,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=carrefour','https://picsum.photos/seed/carrefour-b/1200/300','Presente no Brasil desde 1975, com formatos hiper, bairro e express.','{}'::uuid[]),
  ('max-atacadista','Max Atacadista','Preços de atacado para você economizar mais.','Ponta Grossa','PR','Av. Vicente Machado, 950','84010-320','(42) 3220-7000','contato@maxatacadista.com.br','Seg-Sáb 07h-22h',-25.094600,-50.163900,4.2,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=max','https://picsum.photos/seed/max-b/1200/300','Atacarejo regional com foco no consumidor final e pequenos negócios.','{}'::uuid[]),
  ('angeloni','Angeloni','Rede premium com produtos selecionados.','Curitiba','PR','R. Comendador Araújo, 700','80420-000','(41) 3500-8000','sac@angeloni.com.br','Seg-Dom 08h-22h',-25.434100,-49.284700,4.8,'approved','https://api.dicebear.com/7.x/shapes/svg?seed=angeloni','https://picsum.photos/seed/angeloni-b/1200/300','Rede fundada em 1958 em Criciúma, com padrão premium e forte presença no Sul.','{}'::uuid[]);

INSERT INTO public.brands (slug, name, country, description) VALUES
  ('camil','Camil','Brasil','Grãos e alimentos.'),('tio-joao','Tio João','Brasil','Arroz e derivados.'),('uniao','União','Brasil','Açúcar e adoçantes.'),
  ('soya','Soya','Brasil','Óleos e margarinas.'),('liza','Liza','Brasil','Óleo de soja.'),('mae-terra','Mãe Terra','Brasil','Alimentos orgânicos.'),
  ('coca-cola','Coca-Cola','EUA','Refrigerantes e bebidas.'),('guarana-antarctica','Guaraná Antarctica','Brasil','Refrigerante de guaraná.'),('del-valle','Del Valle','Brasil','Sucos e néctares.'),
  ('crystal','Crystal','Brasil','Água mineral.'),('skol','Skol','Brasil','Cervejas.'),('brahma','Brahma','Brasil','Cervejas.'),
  ('heineken','Heineken','Holanda','Cerveja premium.'),('concha-y-toro','Concha y Toro','Chile','Vinhos.'),('omo','OMO','Brasil','Sabão em pó.'),
  ('ariel','Ariel','EUA','Detergentes.'),('ype','Ypê','Brasil','Produtos de limpeza.'),('veja','Veja','Brasil','Multiuso e limpeza.'),
  ('cif','Cif','EUA','Limpeza pesada.'),('bombril','Bombril','Brasil','Palha de aço e limpeza.'),('comfort','Comfort','EUA','Amaciantes.'),
  ('dove','Dove','Reino Unido','Higiene e beleza.'),('nivea','Nivea','Alemanha','Cuidados pessoais.'),('palmolive','Palmolive','EUA','Sabonetes e higiene.'),
  ('colgate','Colgate','EUA','Higiene bucal.'),('oral-b','Oral-B','EUA','Higiene bucal.'),('sorriso','Sorriso','Brasil','Higiene bucal.'),
  ('neve','Neve','Brasil','Papel higiênico.'),('sofit','Sofit','Brasil','Bebidas à base de soja.'),('sadia','Sadia','Brasil','Alimentos e congelados.'),
  ('perdigao','Perdigão','Brasil','Alimentos e congelados.'),('seara','Seara','Brasil','Carnes e embutidos.'),('aurora','Aurora','Brasil','Carnes e alimentos.'),
  ('wickbold','Wickbold','Brasil','Pães e panificados.'),('pullman','Pullman','Brasil','Pães industrializados.'),('panco','Panco','Brasil','Panificação.'),
  ('pedigree','Pedigree','EUA','Alimentos para cães.'),('whiskas','Whiskas','EUA','Alimentos para gatos.'),('golden','Golden','Brasil','Rações premium.'),('premier','Premier Pet','Brasil','Alimentos para pets.');

WITH raw(pname, cat_slug, brand_slug, unit) AS (VALUES
  ('Arroz Branco Tipo 1 5kg','alimentos','tio-joao','pacote'),('Arroz Parboilizado 5kg','alimentos','camil','pacote'),
  ('Feijão Carioca 1kg','alimentos','camil','pacote'),('Feijão Preto 1kg','alimentos','camil','pacote'),
  ('Açúcar Refinado 5kg','alimentos','uniao','pacote'),('Açúcar Cristal 5kg','alimentos','uniao','pacote'),
  ('Óleo de Soja 900ml','alimentos','soya','garrafa'),('Óleo de Girassol 900ml','alimentos','liza','garrafa'),
  ('Café Torrado e Moído 500g','alimentos','mae-terra','pacote'),('Macarrão Espaguete 500g','alimentos','camil','pacote'),
  ('Macarrão Parafuso 500g','alimentos','camil','pacote'),('Farinha de Trigo 1kg','alimentos','uniao','pacote'),
  ('Farinha de Mandioca 1kg','alimentos','camil','pacote'),('Sal Refinado 1kg','alimentos','uniao','pacote'),
  ('Molho de Tomate 340g','alimentos','sadia','sache'),('Extrato de Tomate 340g','alimentos','sadia','lata'),
  ('Milho Verde em Conserva 200g','alimentos','sadia','lata'),('Ervilha em Conserva 200g','alimentos','sadia','lata'),
  ('Atum em Óleo 170g','alimentos','sadia','lata'),('Sardinha em Óleo 125g','alimentos','sadia','lata'),
  ('Leite Condensado 395g','alimentos','sadia','lata'),('Creme de Leite 200g','alimentos','sadia','caixa'),
  ('Leite Integral UHT 1L','alimentos','sofit','caixa'),('Leite Desnatado UHT 1L','alimentos','sofit','caixa'),
  ('Iogurte Natural 170g','alimentos','sadia','pote'),('Achocolatado em Pó 400g','alimentos','sadia','pacote'),
  ('Biscoito Recheado Chocolate 130g','alimentos','panco','pacote'),('Biscoito Cream Cracker 200g','alimentos','panco','pacote'),
  ('Aveia em Flocos 250g','alimentos','mae-terra','pacote'),('Manteiga com Sal 200g','alimentos','soya','pote'),
  ('Refrigerante Cola 2L','bebidas','coca-cola','garrafa'),('Refrigerante Guaraná 2L','bebidas','guarana-antarctica','garrafa'),
  ('Refrigerante Laranja 2L','bebidas','coca-cola','garrafa'),('Suco de Uva Integral 1L','bebidas','del-valle','garrafa'),
  ('Suco de Laranja 1L','bebidas','del-valle','garrafa'),('Água Mineral 1,5L','bebidas','crystal','garrafa'),
  ('Água com Gás 500ml','bebidas','crystal','garrafa'),('Cerveja Pilsen Lata 350ml','bebidas','skol','lata'),
  ('Cerveja Long Neck 355ml','bebidas','heineken','garrafa'),('Cerveja Puro Malte 350ml','bebidas','brahma','lata'),
  ('Vinho Tinto Suave 750ml','bebidas','concha-y-toro','garrafa'),('Vinho Tinto Seco 750ml','bebidas','concha-y-toro','garrafa'),
  ('Energético 269ml','bebidas','coca-cola','lata'),('Isotônico 500ml','bebidas','coca-cola','garrafa'),
  ('Chá Gelado Limão 1,5L','bebidas','del-valle','garrafa'),('Café Solúvel 100g','bebidas','mae-terra','pote'),
  ('Achocolatado Pronto 200ml','bebidas','sadia','caixa'),('Leite de Coco 200ml','bebidas','sofit','garrafa'),
  ('Suco em Pó Laranja 25g','bebidas','del-valle','sache'),('Água Tônica 350ml','bebidas','crystal','lata'),
  ('Sabão em Pó 1kg','limpeza','omo','pacote'),('Sabão Líquido 500ml','limpeza','omo','garrafa'),
  ('Amaciante Concentrado 2L','limpeza','comfort','garrafa'),('Detergente Líquido 500ml','limpeza','ype','garrafa'),
  ('Água Sanitária 2L','limpeza','ype','garrafa'),('Desinfetante Pinho 500ml','limpeza','veja','garrafa'),
  ('Multiuso 500ml','limpeza','veja','garrafa'),('Limpa Vidros 500ml','limpeza','veja','garrafa'),
  ('Lava Louças Líquido 500ml','limpeza','ype','garrafa'),('Esponja Multiuso Unidade','limpeza','bombril','unidade'),
  ('Palha de Aço 8 unidades','limpeza','bombril','pacote'),('Saco de Lixo 50L 30un','limpeza','ype','pacote'),
  ('Papel Toalha 2 rolos','limpeza','neve','pacote'),('Álcool 70% 1L','limpeza','ype','garrafa'),
  ('Álcool em Gel 500ml','limpeza','ype','frasco'),('Cera Líquida 750ml','limpeza','veja','garrafa'),
  ('Removedor de Manchas 500ml','limpeza','ariel','garrafa'),('Limpador de Pisos 5L','limpeza','cif','galao'),
  ('Alvejante 1L','limpeza','ype','garrafa'),('Lustra Móveis 200ml','limpeza','veja','frasco'),
  ('Sabonete em Barra 90g','higiene','dove','unidade'),('Sabonete Líquido 250ml','higiene','palmolive','frasco'),
  ('Shampoo Antiqueda 400ml','higiene','dove','frasco'),('Condicionador Hidratante 400ml','higiene','dove','frasco'),
  ('Creme para Pentear 300ml','higiene','nivea','frasco'),('Desodorante Aerossol 150ml','higiene','nivea','aerossol'),
  ('Desodorante Roll-on 50ml','higiene','nivea','roll-on'),('Creme Dental 90g','higiene','colgate','tubo'),
  ('Creme Dental Whitening 90g','higiene','oral-b','tubo'),('Enxaguante Bucal 500ml','higiene','colgate','frasco'),
  ('Escova de Dente Média','higiene','oral-b','unidade'),('Fio Dental 100m','higiene','colgate','unidade'),
  ('Papel Higiênico Folha Dupla 12 rolos','higiene','neve','pacote'),('Absorvente Noturno 8 unidades','higiene','nivea','pacote'),
  ('Fralda Descartável G 30 unidades','higiene','nivea','pacote'),('Lenço Umedecido 100 unidades','higiene','nivea','pacote'),
  ('Perfume Feminino 100ml','higiene','nivea','frasco'),('Hidratante Corporal 400ml','higiene','nivea','frasco'),
  ('Protetor Solar FPS 50 120ml','higiene','nivea','frasco'),('Barbeador Descartável 4un','higiene','nivea','pacote'),
  ('Alcatra Bovina kg','acougue','sadia','kg'),('Picanha Bovina kg','acougue','sadia','kg'),
  ('Costela Bovina kg','acougue','sadia','kg'),('Coxão Mole kg','acougue','sadia','kg'),
  ('Coxão Duro kg','acougue','sadia','kg'),('Patinho Moído kg','acougue','sadia','kg'),
  ('Contra-Filé kg','acougue','sadia','kg'),('Bife de Frango kg','acougue','perdigao','kg'),
  ('Peito de Frango kg','acougue','perdigao','kg'),('Coxa e Sobrecoxa kg','acougue','perdigao','kg'),
  ('Frango Inteiro Congelado kg','acougue','sadia','kg'),('Lombo Suíno kg','acougue','aurora','kg'),
  ('Bacon Fatiado 500g','acougue','seara','pacote'),('Linguiça Toscana 500g','acougue','seara','pacote'),
  ('Salsicha Hot Dog 500g','acougue','seara','pacote'),
  ('Banana Prata kg','hortifruti','mae-terra','kg'),('Banana Nanica kg','hortifruti','mae-terra','kg'),
  ('Maçã Fuji kg','hortifruti','mae-terra','kg'),('Maçã Gala kg','hortifruti','mae-terra','kg'),
  ('Laranja Pera kg','hortifruti','mae-terra','kg'),('Mamão Formosa kg','hortifruti','mae-terra','kg'),
  ('Melancia kg','hortifruti','mae-terra','kg'),('Uva Rubi kg','hortifruti','mae-terra','kg'),
  ('Abacaxi Unidade','hortifruti','mae-terra','unidade'),('Manga Palmer kg','hortifruti','mae-terra','kg'),
  ('Tomate kg','hortifruti','mae-terra','kg'),('Cebola kg','hortifruti','mae-terra','kg'),
  ('Batata Inglesa kg','hortifruti','mae-terra','kg'),('Cenoura kg','hortifruti','mae-terra','kg'),
  ('Alface Unidade','hortifruti','mae-terra','unidade'),('Rúcula Molho','hortifruti','mae-terra','maco'),
  ('Brócolis Unidade','hortifruti','mae-terra','unidade'),('Couve-Flor Unidade','hortifruti','mae-terra','unidade'),
  ('Pimentão Verde kg','hortifruti','mae-terra','kg'),('Pepino kg','hortifruti','mae-terra','kg'),
  ('Pão Francês kg','padaria','wickbold','kg'),('Pão de Forma Integral 500g','padaria','wickbold','pacote'),
  ('Pão de Forma Tradicional 500g','padaria','pullman','pacote'),('Pão de Queijo Congelado 400g','padaria','sadia','pacote'),
  ('Baguete Unidade','padaria','wickbold','unidade'),('Croissant Unidade','padaria','wickbold','unidade'),
  ('Bolo de Chocolate 500g','padaria','panco','unidade'),('Torta de Frango 500g','padaria','panco','unidade'),
  ('Rosca Doce Unidade','padaria','panco','unidade'),('Sonho de Padaria Unidade','padaria','panco','unidade'),
  ('Ração Cão Adulto 15kg','pet-shop','pedigree','saco'),('Ração Cão Filhote 10kg','pet-shop','pedigree','saco'),
  ('Ração Gato Adulto 10kg','pet-shop','whiskas','saco'),('Ração Gato Filhote 3kg','pet-shop','whiskas','saco'),
  ('Ração Premium Cão 15kg','pet-shop','golden','saco'),('Petisco Cão Bifinho 500g','pet-shop','pedigree','pacote'),
  ('Petisco Gato 60g','pet-shop','whiskas','pacote'),('Areia Sanitária Gato 4kg','pet-shop','premier','saco'),
  ('Coleira Cão M','pet-shop','premier','unidade'),('Guia para Cão 1,20m','pet-shop','premier','unidade'),
  ('Sachê Gato Sabor Frango 85g','pet-shop','whiskas','sache'),('Sachê Cão Sabor Carne 100g','pet-shop','pedigree','sache'),
  ('Shampoo Pet Antipulgas 500ml','pet-shop','premier','frasco'),('Osso Mordedor Natural','pet-shop','premier','unidade'),
  ('Brinquedo Interativo Gato','pet-shop','premier','unidade')
),
numbered AS (
  SELECT row_number() OVER () AS rn, pname, cat_slug, brand_slug, unit,
    lower(regexp_replace(
      translate(pname, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'),
      '[^a-zA-Z0-9]+','-','g')) AS raw_slug
  FROM raw
)
INSERT INTO public.products (slug, name, brand, brand_id, category_id, image_url, description, barcode, unit, status)
SELECT trim(both '-' from n.raw_slug), n.pname, b.name, b.id, c.id,
  'https://picsum.photos/seed/' || trim(both '-' from n.raw_slug) || '/400/400',
  n.pname || ' — comparação de preços em supermercados do Paraná.',
  '789' || lpad((1000000000 + n.rn * 137)::text, 10, '0'), n.unit, 'active'
FROM numbered n
JOIN public.categories c ON c.slug = n.cat_slug
JOIN public.brands b ON b.slug = n.brand_slug;

WITH product_store_pairs AS (
  SELECT p.id AS product_id, s.id AS store_id, s.slug AS store_slug, p.slug AS product_slug,
    300 + (('x' || substr(md5(p.slug), 1, 8))::bit(32)::int & 32767) % 19700 AS base_cents,
    (('x' || substr(md5(p.slug || s.slug), 1, 8))::bit(32)::int & 32767) % 31 - 15 AS pct_var,
    row_number() OVER (PARTITION BY p.id ORDER BY md5(p.slug || s.slug)) AS pick
  FROM public.products p CROSS JOIN public.stores s
)
INSERT INTO public.offers (product_id, store_id, price_cents, url, in_stock)
SELECT product_id, store_id,
  GREATEST(199, (base_cents * (100 + pct_var) / 100)::int),
  'https://' || store_slug || '.com.br/produto/' || product_slug,
  (('x' || substr(md5(product_slug || store_slug || 'stk'), 1, 8))::bit(32)::int & 15) <> 0
FROM product_store_pairs WHERE pick <= 4;

DO $$
DECLARE admin_uid uuid; pro_id uuid;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'kmkz.clan@gmail.com' LIMIT 1;
  SELECT id INTO pro_id FROM public.merchant_plans WHERE slug='pro';
  IF admin_uid IS NOT NULL AND pro_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.merchant_subscriptions WHERE user_id = admin_uid) THEN
    INSERT INTO public.merchant_subscriptions (user_id, plan_id, status, current_period_end, created_at)
      VALUES (admin_uid, pro_id, 'active', now() + interval '15 days', now() - interval '45 days');
  END IF;
END $$;

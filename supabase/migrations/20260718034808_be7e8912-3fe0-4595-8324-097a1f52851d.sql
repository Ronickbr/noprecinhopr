
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'merchant', 'user');
CREATE TYPE public.store_status AS ENUM ('pending', 'approved', 'suspended');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile + default 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORES ============
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  trust_score NUMERIC(3,2) NOT NULL DEFAULT 4.0 CHECK (trust_score >= 0 AND trust_score <= 5),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status store_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT INSERT, UPDATE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved stores are public" ON public.stores FOR SELECT USING (status = 'approved' OR auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchants create own stores" ON public.stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Merchants update own stores" ON public.stores FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Admins manage stores" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  description TEXT,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(brand,'')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(description,'')), 'C')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_search_idx ON public.products USING GIN (search_vector);
CREATE INDEX products_category_idx ON public.products (category_id);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are public" ON public.products FOR SELECT USING (true);
CREATE POLICY "Merchants insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'merchant') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ OFFERS ============
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  url TEXT NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, store_id)
);
CREATE INDEX offers_product_price_idx ON public.offers (product_id, price_cents);
CREATE INDEX offers_store_idx ON public.offers (store_id);
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offers are public" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Merchants manage own store offers" ON public.offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = offers.store_id AND s.owner_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = offers.store_id AND s.owner_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- ============ PRICE HISTORY ============
CREATE TABLE public.price_history (
  id BIGSERIAL PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  price_cents INT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX price_history_offer_idx ON public.price_history (offer_id, captured_at DESC);
GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT ALL ON public.price_history TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price history is public" ON public.price_history FOR SELECT USING (true);

-- Auto-track price changes
CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.price_cents IS DISTINCT FROM OLD.price_cents) THEN
    INSERT INTO public.price_history (offer_id, price_cents) VALUES (NEW.id, NEW.price_cents);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER offers_price_history AFTER INSERT OR UPDATE OF price_cents ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.track_price_change();

-- ============ CLICKS ============
CREATE TABLE public.clicks (
  id BIGSERIAL PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clicks_offer_idx ON public.clicks (offer_id, created_at DESC);
GRANT INSERT ON public.clicks TO anon, authenticated;
GRANT SELECT ON public.clicks TO authenticated;
GRANT ALL ON public.clicks TO service_role;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log clicks" ON public.clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Merchants read own store clicks" ON public.clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.offers o JOIN public.stores s ON s.id = o.store_id WHERE o.id = clicks.offer_id AND s.owner_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- ============ FAVORITES ============
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PRICE ALERTS ============
CREATE TABLE public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price_cents INT NOT NULL CHECK (target_price_cents > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alerts" ON public.price_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED: Categories ============
INSERT INTO public.categories (slug, name, sort_order) VALUES
  ('eletronicos', 'Eletrônicos', 1),
  ('informatica', 'Informática', 2),
  ('celulares', 'Celulares', 3),
  ('casa-cozinha', 'Casa & Cozinha', 4),
  ('moda', 'Moda', 5),
  ('esporte', 'Esporte & Fitness', 6),
  ('beleza', 'Beleza', 7),
  ('livros', 'Livros', 8);

-- ============ SEED: Stores ============
INSERT INTO public.stores (slug, name, logo_url, description, trust_score, status) VALUES
  ('techstore', 'TechStore', 'https://api.dicebear.com/7.x/shapes/svg?seed=techstore', 'Especialista em eletrônicos e informática', 4.7, 'approved'),
  ('megashop', 'MegaShop', 'https://api.dicebear.com/7.x/shapes/svg?seed=megashop', 'Tudo para sua casa em um só lugar', 4.5, 'approved'),
  ('fashionplus', 'FashionPlus', 'https://api.dicebear.com/7.x/shapes/svg?seed=fashionplus', 'Moda para todos os estilos', 4.3, 'approved'),
  ('esportemax', 'EsporteMax', 'https://api.dicebear.com/7.x/shapes/svg?seed=esportemax', 'Equipamentos esportivos profissionais', 4.6, 'approved'),
  ('livrariapaz', 'Livraria Paz', 'https://api.dicebear.com/7.x/shapes/svg?seed=livrariapaz', 'A maior livraria online do país', 4.8, 'approved'),
  ('belezanet', 'BelezaNet', 'https://api.dicebear.com/7.x/shapes/svg?seed=belezanet', 'Cosméticos e perfumaria', 4.4, 'approved'),
  ('casaclara', 'CasaClara', 'https://api.dicebear.com/7.x/shapes/svg?seed=casaclara', 'Móveis, decoração e utilidades', 4.2, 'approved'),
  ('mobilemania', 'MobileMania', 'https://api.dicebear.com/7.x/shapes/svg?seed=mobilemania', 'Smartphones e acessórios', 4.5, 'approved'),
  ('galaxytech', 'GalaxyTech', 'https://api.dicebear.com/7.x/shapes/svg?seed=galaxytech', 'Tecnologia com melhor preço', 4.1, 'approved'),
  ('universonet', 'UniversoNet', 'https://api.dicebear.com/7.x/shapes/svg?seed=universonet', 'Marketplace multi-categoria', 4.0, 'approved');

-- ============ SEED: Products ============
-- Insert 60 products across 8 categories with generated images
INSERT INTO public.products (slug, name, brand, category_id, image_url, description)
SELECT
  p.slug, p.name, p.brand,
  (SELECT id FROM public.categories WHERE slug = p.cat_slug),
  'https://picsum.photos/seed/' || p.slug || '/600/600',
  p.description
FROM (VALUES
  -- Eletrônicos
  ('smart-tv-55-4k-samsung', 'Smart TV 55" 4K UHD', 'Samsung', 'eletronicos', 'Smart TV com resolução 4K, HDR, Tizen OS e conectividade completa.'),
  ('smart-tv-50-4k-lg', 'Smart TV 50" 4K NanoCell', 'LG', 'eletronicos', 'TV NanoCell com processador AI e webOS.'),
  ('soundbar-jbl-bar-500', 'Soundbar JBL Bar 500', 'JBL', 'eletronicos', 'Barra de som 5.1 com Dolby Atmos e subwoofer wireless.'),
  ('fone-sony-wh1000xm5', 'Fone Sony WH-1000XM5', 'Sony', 'eletronicos', 'Cancelamento de ruído líder de mercado, 30h de bateria.'),
  ('caixa-jbl-charge-5', 'Caixa JBL Charge 5', 'JBL', 'eletronicos', 'Portátil, à prova d''água IP67, 20h de bateria.'),
  ('echo-dot-5-alexa', 'Echo Dot 5ª Geração', 'Amazon', 'eletronicos', 'Smart speaker com Alexa e som aprimorado.'),
  ('camera-canon-eos-r50', 'Câmera Canon EOS R50', 'Canon', 'eletronicos', 'Mirrorless APS-C 24MP com vídeo 4K.'),
  ('projetor-xgimi-halo', 'Projetor XGIMI Halo+', 'XGIMI', 'eletronicos', 'Projetor portátil 1080p com Android TV.'),
  -- Informática
  ('notebook-macbook-air-m3', 'MacBook Air M3 13"', 'Apple', 'informatica', 'Chip M3, 8GB RAM, 256GB SSD, 18h de bateria.'),
  ('notebook-dell-xps-13', 'Dell XPS 13 Plus', 'Dell', 'informatica', 'Intel Core i7, 16GB, 512GB SSD, tela InfinityEdge.'),
  ('notebook-lenovo-ideapad-3', 'Lenovo IdeaPad 3', 'Lenovo', 'informatica', 'Ryzen 5, 8GB, 256GB SSD - ótimo custo-benefício.'),
  ('monitor-lg-ultragear-27', 'Monitor LG UltraGear 27"', 'LG', 'informatica', 'IPS 165Hz 1ms para gamers exigentes.'),
  ('monitor-dell-u2723qe', 'Monitor Dell UltraSharp 27" 4K', 'Dell', 'informatica', 'Cores calibradas de fábrica, USB-C 90W.'),
  ('teclado-keychron-k2', 'Teclado Keychron K2 V2', 'Keychron', 'informatica', 'Mecânico wireless, layout 75%, hot-swap.'),
  ('mouse-logitech-mx-master-3s', 'Mouse Logitech MX Master 3S', 'Logitech', 'informatica', 'Ergonômico wireless com sensor 8000 DPI.'),
  ('ssd-samsung-980-pro-1tb', 'SSD Samsung 980 Pro 1TB NVMe', 'Samsung', 'informatica', 'PCIe 4.0 até 7000MB/s de leitura.'),
  -- Celulares
  ('iphone-15-128gb', 'iPhone 15 128GB', 'Apple', 'celulares', 'Chip A16 Bionic, câmera 48MP, USB-C.'),
  ('iphone-15-pro-256gb', 'iPhone 15 Pro 256GB', 'Apple', 'celulares', 'Titânio, A17 Pro, câmera pro triplo.'),
  ('galaxy-s24-256gb', 'Samsung Galaxy S24 256GB', 'Samsung', 'celulares', 'Snapdragon 8 Gen 3, Galaxy AI.'),
  ('galaxy-a55-256gb', 'Samsung Galaxy A55 5G', 'Samsung', 'celulares', 'Tela 6.6" AMOLED 120Hz, câmera 50MP.'),
  ('motorola-edge-50-pro', 'Motorola Edge 50 Pro', 'Motorola', 'celulares', 'Curvado 144Hz, câmera 50MP OIS.'),
  ('xiaomi-14-256gb', 'Xiaomi 14 256GB', 'Xiaomi', 'celulares', 'Snapdragon 8 Gen 3, câmeras Leica.'),
  ('redmi-note-13-pro', 'Redmi Note 13 Pro 5G', 'Xiaomi', 'celulares', 'Câmera 200MP, tela AMOLED 120Hz.'),
  ('pixel-8-128gb', 'Google Pixel 8 128GB', 'Google', 'celulares', 'Tensor G3, câmera com IA, 7 anos de updates.'),
  -- Casa & Cozinha
  ('airfryer-mondial-af-31', 'Air Fryer Mondial 5L', 'Mondial', 'casa-cozinha', 'Fritadeira sem óleo 5L, timer 60min.'),
  ('cafeteira-nespresso-vertuo', 'Nespresso Vertuo Next', 'Nespresso', 'casa-cozinha', 'Cafeteira com centrifusion, 5 tamanhos.'),
  ('liquidificador-oster-1400', 'Liquidificador Oster 1400W', 'Oster', 'casa-cozinha', '12 velocidades, jarra de vidro 1.5L.'),
  ('panela-pressao-eletrica-electrolux', 'Panela Elétrica Electrolux 5L', 'Electrolux', 'casa-cozinha', 'Multifuncional 14 programas.'),
  ('robo-aspirador-roborock-q5', 'Robô Aspirador Roborock Q5+', 'Roborock', 'casa-cozinha', 'Mapeamento LiDAR, esvaziamento automático.'),
  ('purificador-agua-electrolux', 'Purificador Electrolux PA26G', 'Electrolux', 'casa-cozinha', 'Refrigerado, alta capacidade.'),
  ('microondas-panasonic-32l', 'Microondas Panasonic 32L Inverter', 'Panasonic', 'casa-cozinha', 'Tecnologia Inverter, 10 receitas.'),
  -- Moda
  ('tenis-nike-air-max-97', 'Nike Air Max 97', 'Nike', 'moda', 'Ícone dos anos 90 com amortecimento Air.'),
  ('tenis-adidas-ultraboost-22', 'Adidas Ultraboost 22', 'Adidas', 'moda', 'Corrida com espuma Boost e Primeknit.'),
  ('camiseta-lacoste-polo-classic', 'Polo Lacoste L.12.12', 'Lacoste', 'moda', 'Piquet 100% algodão, icônica.'),
  ('jaqueta-north-face-nuptse', 'Jaqueta The North Face Nuptse', 'The North Face', 'moda', 'Puffer com pluma de ganso 700-fill.'),
  ('mochila-jansport-superbreak', 'Mochila JanSport SuperBreak', 'JanSport', 'moda', 'Clássica 25L, garantia vitalícia.'),
  ('oculos-rayban-aviator', 'Ray-Ban Aviator Classic', 'Ray-Ban', 'moda', 'Lentes G-15, armação dourada.'),
  ('relogio-casio-g-shock-ga2100', 'Casio G-Shock GA-2100 CasiOak', 'Casio', 'moda', 'Analógico-digital octogonal, WR200.'),
  -- Esporte
  ('bicicleta-caloi-explorer', 'Caloi Explorer Sport 29', 'Caloi', 'esporte', 'MTB aro 29, 24 marchas Shimano.'),
  ('esteira-eletrica-movement-lx160', 'Esteira Movement LX160', 'Movement', 'esporte', 'Motor 2.5HP, 16km/h, dobrável.'),
  ('halteres-ajustaveis-bowflex-552', 'Halteres Ajustáveis Bowflex 552', 'Bowflex', 'esporte', 'De 2 a 24kg em um par.'),
  ('smartwatch-garmin-forerunner-265', 'Garmin Forerunner 265', 'Garmin', 'esporte', 'GPS multibanda, AMOLED, 15 dias.'),
  ('bola-nike-nk-strike', 'Bola Nike Strike Serie A', 'Nike', 'esporte', 'Oficial Serie A italiana, futsal.'),
  ('kit-yoga-completo-vollo', 'Kit Yoga Vollo Completo', 'Vollo', 'esporte', 'Tapete 6mm + blocos + faixa.'),
  -- Beleza
  ('perfume-dior-sauvage-100ml', 'Dior Sauvage EDT 100ml', 'Dior', 'beleza', 'Amadeirado aromático, best-seller.'),
  ('perfume-chanel-no5-100ml', 'Chanel N°5 EDP 100ml', 'Chanel', 'beleza', 'Floral aldeídico atemporal.'),
  ('base-mac-studio-fix', 'Base MAC Studio Fix Fluid', 'MAC', 'beleza', 'Cobertura média, matte, FPS 15.'),
  ('secador-babyliss-6614be', 'Secador Babyliss 6614BE 2200W', 'Babyliss', 'beleza', 'Íons, difusor, 6 combinações.'),
  ('creme-nivea-soft-200ml', 'Creme Nivea Soft 200ml', 'Nivea', 'beleza', 'Hidratação para rosto, mãos e corpo.'),
  ('paleta-urban-decay-naked3', 'Paleta Urban Decay Naked3', 'Urban Decay', 'beleza', '12 sombras rose-toned.'),
  -- Livros
  ('livro-o-poder-do-habito', 'O Poder do Hábito', 'Charles Duhigg', 'livros', 'Best-seller sobre formação de hábitos.'),
  ('livro-sapiens', 'Sapiens - Uma Breve História', 'Yuval Noah Harari', 'livros', 'A jornada da humanidade contada de forma envolvente.'),
  ('livro-mindset', 'Mindset - A Nova Psicologia', 'Carol Dweck', 'livros', 'Como pensar diferente muda tudo.'),
  ('livro-atomic-habits', 'Hábitos Atômicos', 'James Clear', 'livros', 'Pequenas mudanças, resultados extraordinários.'),
  ('livro-1984-orwell', '1984', 'George Orwell', 'livros', 'Clássico distópico.'),
  ('livro-crime-e-castigo', 'Crime e Castigo', 'Dostoiévski', 'livros', 'Grande clássico russo.'),
  ('livro-a-arte-da-guerra', 'A Arte da Guerra', 'Sun Tzu', 'livros', 'Tratado militar chinês milenar.'),
  ('livro-o-alquimista', 'O Alquimista', 'Paulo Coelho', 'livros', 'Fábula sobre seguir seus sonhos.')
) AS p(slug, name, brand, cat_slug, description);

-- ============ SEED: Offers with realistic price variation per store ============
-- Each product gets 3-6 offers across random stores, plus 90d of history
DO $$
DECLARE
  prod RECORD;
  store_rec RECORD;
  base_price INT;
  n_offers INT;
  variance NUMERIC;
  offer_price INT;
BEGIN
  FOR prod IN SELECT id, slug FROM public.products LOOP
    -- base price by simple hash
    base_price := 5000 + (abs(hashtext(prod.slug)) % 495000); -- R$50 to R$5000
    n_offers := 3 + (abs(hashtext(prod.slug)) % 4); -- 3 to 6 offers

    FOR store_rec IN SELECT id FROM public.stores ORDER BY random() LIMIT n_offers LOOP
      variance := 0.85 + (random() * 0.30); -- ±15%
      offer_price := (base_price * variance)::INT;
      INSERT INTO public.offers (product_id, store_id, price_cents, url, in_stock)
      VALUES (prod.id, store_rec.id, offer_price, 'https://example.com/produto/' || prod.slug, random() > 0.1)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Backfill 90 days of price history (~1 point every 3 days per offer)
INSERT INTO public.price_history (offer_id, price_cents, captured_at)
SELECT
  o.id,
  (o.price_cents * (0.90 + random() * 0.20))::INT,
  now() - (d || ' days')::interval
FROM public.offers o
CROSS JOIN generate_series(3, 90, 3) AS d;

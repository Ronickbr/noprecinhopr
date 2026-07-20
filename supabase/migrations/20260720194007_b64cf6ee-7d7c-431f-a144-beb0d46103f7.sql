
-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  country TEXT,
  website TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands are readable by anyone" ON public.brands FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add brand_id to products (optional relation)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id);

-- Approval requests (queue for new stores/products/brands/categories)
CREATE TYPE public.approval_kind AS ENUM ('store', 'product', 'brand', 'category');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.approval_kind NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requester sees own requests" ON public.approval_requests FOR SELECT USING (auth.uid() = requester_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own requests" ON public.approval_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Admins manage requests" ON public.approval_requests FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX approval_requests_status_idx ON public.approval_requests(status, created_at DESC);

-- Reports (denúncias)
CREATE TYPE public.report_target AS ENUM ('product', 'store', 'user', 'offer');
CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter sees own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins manage reports" ON public.reports FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX reports_status_idx ON public.reports(status, created_at DESC);

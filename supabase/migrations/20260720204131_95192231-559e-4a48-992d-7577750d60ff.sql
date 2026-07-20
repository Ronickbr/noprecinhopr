
-- Restrict anon SELECT to non-sensitive columns only (hide email, phone, and internal owner_user_id)
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (
  id, slug, name, logo_url, description, trust_score, status,
  created_at, updated_at, banner_url, secondary_banner_url, about,
  featured_product_ids, city, state, address, cep, opening_hours,
  latitude, longitude
) ON public.stores TO anon;

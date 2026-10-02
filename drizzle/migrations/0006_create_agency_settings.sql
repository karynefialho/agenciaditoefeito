CREATE TABLE public.agency_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_settings TO authenticated;
GRANT ALL ON public.agency_settings TO service_role;
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage settings" ON public.agency_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
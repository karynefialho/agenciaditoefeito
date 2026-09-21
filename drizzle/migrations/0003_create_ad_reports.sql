CREATE TABLE public.ad_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  spend numeric(12,2) NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  results integer NOT NULL DEFAULT 0,
  result_label text NOT NULL DEFAULT 'Resultados',
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_reports TO authenticated;
GRANT ALL ON public.ad_reports TO service_role;

ALTER TABLE public.ad_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage ad reports" ON public.ad_reports
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "members read ad reports" ON public.ad_reports
  FOR SELECT TO authenticated
  USING (is_client_member(auth.uid(), client_id));

CREATE TRIGGER ad_reports_touch_updated_at
  BEFORE UPDATE ON public.ad_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX ad_reports_client_period_idx ON public.ad_reports (client_id, period_start DESC);
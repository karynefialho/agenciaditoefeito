CREATE TABLE public.meta_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.meta_oauth_sessions TO service_role;

ALTER TABLE public.meta_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS whatsapp_phone text;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS notified_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  phone text not null,
  kind text not null,
  body text not null,
  status text not null default 'sent',
  error_message text,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read whatsapp log"
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
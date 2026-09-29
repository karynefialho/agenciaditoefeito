-- Script Completo de Inicialização do Banco de Dados para a Agência Dito Efeito no Supabase
-- Execute este script uma única vez no painel do Supabase -> SQL Editor.

-- 1. Enumerações e Tipos
CREATE TYPE public.app_role AS ENUM ('admin', 'client');
CREATE TYPE public.post_status AS ENUM ('pending', 'approved', 'rejected', 'publishing', 'published', 'failed');
CREATE TYPE public.post_kind AS ENUM ('image', 'carousel', 'reel', 'story');

-- 2. Tabela de Perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. Tabela de Roles / Permissões
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Trigger Automática de Novos Usuários (O 1º usuário vira ADMIN automaticamente!)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'client');
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Tabela de Clientes & Marcas
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ig_username text,
  ig_user_id text,
  ig_picture_url text,
  whatsapp_phone text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.client_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (client_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.client_members TO authenticated;
GRANT ALL ON public.client_members TO service_role;
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_client_member(_user_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.client_members WHERE user_id = _user_id AND client_id = _client_id)
$$;

CREATE POLICY "admins manage clients" ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members read clients" ON public.clients FOR SELECT TO authenticated
  USING (public.is_client_member(auth.uid(), id));

CREATE POLICY "admins manage members" ON public.client_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "read own membership" ON public.client_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 6. Tabela do Instagram Accounts
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  ig_user_id text NOT NULL,
  access_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.instagram_accounts TO service_role;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

-- 7. Tabela de Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.post_kind NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  status public.post_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback text,
  published_at timestamptz,
  ig_media_id text,
  error_message text,
  notified_ready_at timestamptz,
  notified_published_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage posts" ON public.posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members read posts" ON public.posts FOR SELECT TO authenticated
  USING (public.is_client_member(auth.uid(), client_id));
CREATE POLICY "members review posts" ON public.posts FOR UPDATE TO authenticated
  USING (public.is_client_member(auth.uid(), client_id))
  WITH CHECK (public.is_client_member(auth.uid(), client_id));

-- 8. Tabela de Mídias dos Posts
CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_media TO authenticated;
GRANT ALL ON public.post_media TO service_role;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage media" ON public.post_media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members read media" ON public.post_media FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.is_client_member(auth.uid(), p.client_id)));

CREATE INDEX IF NOT EXISTS posts_due_idx ON public.posts (status, scheduled_at);

-- 9. Tabela de Mensagens WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  phone text NOT NULL,
  kind text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read whatsapp log" ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Tabela Meta OAuth Sessions
CREATE TABLE IF NOT EXISTS public.meta_oauth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.meta_oauth_sessions TO service_role;
ALTER TABLE public.meta_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- 11. Tabela Ad Reports
CREATE TABLE IF NOT EXISTS public.ad_reports (
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

CREATE POLICY "admins manage ad reports" ON public.ad_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members read ad reports" ON public.ad_reports FOR SELECT TO authenticated
  USING (public.is_client_member(auth.uid(), client_id));

-- 12. Triggers de atualização de data
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN new.updated_at = now(); RETURN new; END; $$;

DROP TRIGGER IF EXISTS posts_touch ON public.posts;
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS ad_reports_touch_updated_at ON public.ad_reports;
CREATE TRIGGER ad_reports_touch_updated_at BEFORE UPDATE ON public.ad_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 13. Criar Bucket de Armazenamento para Mídias dos Posts (Storage)
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "read post media files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'post-media');
CREATE POLICY "upload post media files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-media');
CREATE POLICY "update post media files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'post-media');
CREATE POLICY "delete post media files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-media');

-- 14. Tabela de Configurações da Agência (WhatsApp API, Z-API, Evolution, etc.)
CREATE TABLE IF NOT EXISTS public.agency_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.agency_settings TO authenticated;
GRANT ALL ON public.agency_settings TO service_role;
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage agency settings" ON public.agency_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

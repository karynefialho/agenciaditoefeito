create type public.app_role as enum ('admin', 'client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins read roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email)
  on conflict (id) do nothing;

  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'client');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ig_username text,
  ig_user_id text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;

create table public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (client_id, user_id)
);
grant select, insert, delete on public.client_members to authenticated;
grant all on public.client_members to service_role;
alter table public.client_members enable row level security;

create or replace function public.is_client_member(_user_id uuid, _client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_members where user_id = _user_id and client_id = _client_id)
$$;

create policy "admins manage clients" on public.clients for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "members read clients" on public.clients for select to authenticated
  using (public.is_client_member(auth.uid(), id));

create policy "admins manage members" on public.client_members for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "read own membership" on public.client_members for select to authenticated
  using (auth.uid() = user_id);

create table public.instagram_accounts (
  client_id uuid primary key references public.clients(id) on delete cascade,
  ig_user_id text not null,
  access_token text not null,
  updated_at timestamptz not null default now()
);
grant all on public.instagram_accounts to service_role;
alter table public.instagram_accounts enable row level security;

create type public.post_status as enum ('pending', 'approved', 'rejected', 'publishing', 'published', 'failed');
create type public.post_kind as enum ('image', 'carousel', 'reel', 'story');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind public.post_kind not null default 'image',
  caption text not null default '',
  scheduled_at timestamptz not null,
  status public.post_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  feedback text,
  published_at timestamptz,
  ig_media_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;

create policy "admins manage posts" on public.posts for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "members read posts" on public.posts for select to authenticated
  using (public.is_client_member(auth.uid(), client_id));
create policy "members review posts" on public.posts for update to authenticated
  using (public.is_client_member(auth.uid(), client_id))
  with check (public.is_client_member(auth.uid(), client_id));

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  path text not null,
  media_type text not null default 'image',
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.post_media to authenticated;
grant all on public.post_media to service_role;
alter table public.post_media enable row level security;

create policy "admins manage media" on public.post_media for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "members read media" on public.post_media for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and public.is_client_member(auth.uid(), p.client_id)));

create index posts_due_idx on public.posts (status, scheduled_at);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger posts_touch before update on public.posts
for each row execute function public.touch_updated_at();

create policy "read post media files" on storage.objects for select to authenticated
  using (bucket_id = 'post-media');
create policy "upload post media files" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media');
create policy "update post media files" on storage.objects for update to authenticated
  using (bucket_id = 'post-media');
create policy "delete post media files" on storage.objects for delete to authenticated
  using (bucket_id = 'post-media');
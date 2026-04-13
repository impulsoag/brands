-- ============================================================
-- BRANDS DASHBOARD — Schema Oficial Supabase
-- Execute no Supabase > SQL Editor para aplicar migrações
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
-- Gerenciado via Supabase Auth + trigger
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  email      text,
  nome       text,
  role       text not null default 'viewer'
    check (role in ('admin', 'viewer'))
);

-- ── 2. INFLUENCERS ───────────────────────────────────────────
create table if not exists public.influencers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  nome            text not null,
  handle          text not null unique,
  link_perfil     text,
  link_landing    text,
  foto_url        text,
  is_active       boolean default true,
  last_checked_at timestamptz
);

-- ── 3. SESSIONS ──────────────────────────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  session_id   text not null unique,
  influencer   text,
  device_type  text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text
);

-- ── 4. EVENTS ────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  evento      text not null,
  session_id  text,
  page_url    text,
  cta_name    text,
  props       jsonb default '{}',
  section     text,
  language    text,
  depth       integer,
  referrer    text,
  question_id text
);

-- ── 5. LEADS ─────────────────────────────────────────────────
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nome        text,
  numero      text,
  device_type text,
  influencer  text,
  utm_source  text,
  combo       text,
  session_id  text,
  status      text not null default 'Novo Lead'
    check (status in ('Novo Lead', 'Em Contato', 'Em Negociação', 'Fechado'))
);

-- ── 6. BUGS ──────────────────────────────────────────────────
create table if not exists public.bugs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  type          text,
  message       text,
  error         text,
  session_id    text,
  event_id      text,
  page_url      text,
  referrer      text,
  function_name text,
  payload       jsonb
);

-- ── ÍNDICES ───────────────────────────────────────────────────
create index if not exists sessions_session_id_idx   on public.sessions  (session_id);
create index if not exists sessions_created_at_idx   on public.sessions  (created_at desc);
create index if not exists sessions_influencer_idx   on public.sessions  (influencer);

create index if not exists events_session_id_idx     on public.events    (session_id);
create index if not exists events_created_at_idx     on public.events    (created_at desc);
create index if not exists events_evento_idx         on public.events    (evento);

create index if not exists leads_created_at_idx      on public.leads     (created_at desc);
create index if not exists leads_influencer_idx      on public.leads     (influencer);
create index if not exists leads_status_idx          on public.leads     (status);
create index if not exists leads_session_id_idx      on public.leads     (session_id);

create index if not exists bugs_created_at_idx       on public.bugs      (created_at desc);
create index if not exists bugs_session_id_idx       on public.bugs      (session_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.influencers enable row level security;
alter table public.sessions    enable row level security;
alter table public.events      enable row level security;
alter table public.leads       enable row level security;
alter table public.bugs        enable row level security;

-- PROFILES: só o próprio usuário lê/edita
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- INFLUENCERS: leitura autenticada, escrita admin
create policy "influencers_select_auth"
  on public.influencers for select
  using (auth.role() = 'authenticated');

create policy "influencers_insert_auth"
  on public.influencers for insert
  with check (auth.role() = 'authenticated');

create policy "influencers_update_auth"
  on public.influencers for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "influencers_delete_auth"
  on public.influencers for delete
  using (auth.role() = 'authenticated');

-- SESSIONS: apenas INSERT público (landing pages sem login)
create policy "sessions_insert_public"
  on public.sessions for insert
  with check (true);

-- SELECT apenas autenticado (dashboard)
create policy "sessions_select_auth"
  on public.sessions for select
  using (auth.role() = 'authenticated');

-- EVENTS: apenas INSERT público
create policy "events_insert_public"
  on public.events for insert
  with check (true);

-- SELECT apenas autenticado
create policy "events_select_auth"
  on public.events for select
  using (auth.role() = 'authenticated');

-- LEADS: INSERT público (conversão via edge function), gestão autenticada
create policy "leads_insert_public"
  on public.leads for insert
  with check (true);

create policy "leads_select_auth"
  on public.leads for select
  using (auth.role() = 'authenticated');

create policy "leads_update_auth"
  on public.leads for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "leads_delete_auth"
  on public.leads for delete
  using (auth.role() = 'authenticated');

-- BUGS: apenas INSERT público (edge function envia erros)
create policy "bugs_insert_public"
  on public.bugs for insert
  with check (true);

create policy "bugs_select_auth"
  on public.bugs for select
  using (auth.role() = 'authenticated');

-- ── REALTIME ──────────────────────────────────────────────────
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.influencers;

-- ── TRIGGER: criar profile ao cadastrar usuário ───────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), 'viewer');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

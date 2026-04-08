-- ============================================================
-- BRANDS DASHBOARD — Schema Supabase
-- Execute este SQL no Supabase > SQL Editor
-- ============================================================

-- ── 1. LEADS ────────────────────────────────────────────────
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nome        text,
  numero      text,
  influencer  text,
  combo       text,
  origem      text,
  intencao    text,
  status      text not null default 'Nova'
    check (status in ('Nova','Contatado','Fechado','Perdido'))
);

-- Se a tabela já existia, adicione a coluna com:
-- alter table public.leads add column if not exists nome text;

-- ── 2. SESSIONS ─────────────────────────────────────────────
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  session_id   text,
  influencer   text,
  origin       text,
  device_type  text,
  utm_source   text,
  total_time   integer default 0,
  page_count   integer default 1
);

-- ── 3. EVENTS ───────────────────────────────────────────────
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  evento       text not null,
  depth        integer,
  time_seconds integer,
  pagina       text,
  page_url     text,
  influencer   text,
  cta_name     text,
  question     text,
  utm_source   text
);

-- ── ÍNDICES para performance ─────────────────────────────────
create index if not exists leads_created_at_idx    on public.leads    (created_at desc);
create index if not exists leads_influencer_idx    on public.leads    (influencer);
create index if not exists leads_status_idx        on public.leads    (status);
create index if not exists sessions_created_at_idx on public.sessions (created_at desc);
create index if not exists sessions_session_id_idx on public.sessions (session_id);
create index if not exists events_created_at_idx   on public.events   (created_at desc);
create index if not exists events_evento_idx       on public.events   (evento);
create index if not exists events_influencer_idx   on public.events   (influencer);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Habilita RLS mas permite leitura pública (dashboard sem auth)
-- Troque por políticas com autenticação quando quiser proteger

alter table public.leads    enable row level security;
alter table public.sessions enable row level security;
alter table public.events   enable row level security;

-- Política: leitura pública (anon pode SELECT)
create policy "leads_select_public"
  on public.leads for select using (true);

create policy "sessions_select_public"
  on public.sessions for select using (true);

create policy "events_select_public"
  on public.events for select using (true);

-- Política: insert público (landing pages podem inserir sem login)
create policy "leads_insert_public"
  on public.leads for insert with check (true);

create policy "sessions_insert_public"
  on public.sessions for insert with check (true);

create policy "events_insert_public"
  on public.events for insert with check (true);

-- Política: update em leads (para mudar status no dashboard)
create policy "leads_update_public"
  on public.leads for update using (true) with check (true);

-- ── REALTIME ─────────────────────────────────────────────────
-- Habilita replication para as 3 tabelas (necessário para Realtime funcionar)
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.events;

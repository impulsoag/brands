# Brand Dashboard — Guia de Configuração

Siga os passos abaixo para colocar o painel em produção.

---

## 1. Configurar o Supabase

### 1.1 Criar o projeto
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **URL do projeto** e as duas chaves: `anon` e `service_role`

### 1.2 Executar o SQL
1. No painel Supabase, vá em **SQL Editor**
2. Cole e execute o conteúdo abaixo (cria as três tabelas + índices + RLS):

```sql
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  event_id      text unique,
  evento        text not null,
  session_id    text,
  anonymous_id  text,
  pagina        text,
  page_url      text,
  referrer      text,
  user_agent    text,
  language      text,
  device_type   text,
  screen        text,
  page_load_time numeric,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_term      text,
  utm_content   text,
  influencer    text,
  combo         text,
  question      text,
  question_id   text,
  depth         integer,
  time_seconds  integer,
  cta_name      text,
  phone         text,
  brand_name    text,
  origin        text,
  created_at    timestamptz default now()
);

create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  session_id    text unique not null,
  anonymous_id  text,
  influencer    text,
  origin        text,
  device_type   text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  page_count    integer default 1,
  total_time    integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  numero       text not null,
  brand_name   text,
  combo        text,
  origem       text,
  influencer   text,
  pagina       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  intencao     text default 'Novo',
  status       text default 'Nova',
  created_at   timestamptz default now()
);

create index if not exists idx_events_session_id  on public.events(session_id);
create index if not exists idx_events_evento       on public.events(evento);
create index if not exists idx_events_created_at   on public.events(created_at desc);
create index if not exists idx_events_influencer   on public.events(influencer);
create index if not exists idx_leads_created_at    on public.leads(created_at desc);
create index if not exists idx_sessions_created_at on public.sessions(created_at desc);

alter table public.events   enable row level security;
alter table public.sessions enable row level security;
alter table public.leads    enable row level security;

create policy "service_role_insert_events"   on public.events   for insert with check (true);
create policy "service_role_insert_sessions" on public.sessions for insert with check (true);
create policy "service_role_insert_leads"    on public.leads    for insert with check (true);
create policy "service_role_update_sessions" on public.sessions for update using (true);
create policy "anon_select_events"           on public.events   for select using (true);
create policy "anon_select_sessions"         on public.sessions for select using (true);
create policy "anon_select_leads"            on public.leads    for select using (true);
create policy "anon_update_leads"            on public.leads    for update using (true);
```

---

## 2. Deploy da Edge Function

### 2.1 Instalar a CLI do Supabase (se ainda não tiver)
```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (via scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2.2 Autenticar e linkar o projeto
```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
# O project-ref está na URL do seu projeto: https://SEU_PROJECT_REF.supabase.co
```

### 2.3 Deploy da função
```bash
cd admin-dashboard
supabase functions deploy track
```

### 2.4 URL do endpoint
Após o deploy, o endpoint será:
```
https://SEU_PROJECT_REF.supabase.co/functions/v1/track
```

Copie essa URL — ela vai ser usada nas landing pages.

---

## 3. Configurar variáveis de ambiente locais

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite com suas credenciais reais
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

> **Nunca commite o `.env` real!** O `.gitignore` já o exclui.

---

## 4. Conectar GitHub ao Netlify (CI/CD automático)

### 4.1 Criar repositório no GitHub
```bash
cd admin-dashboard
git init
git add .
git commit -m "feat: brand dashboard inicial"
git remote add origin https://github.com/SEU_USUARIO/brand-dashboard.git
git push -u origin main
```

### 4.2 Configurar no Netlify
1. Acesse [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
2. Conecte ao GitHub e selecione o repositório `brand-dashboard`
3. O Netlify detecta automaticamente o `netlify.toml` — apenas confirme
4. Vá em **Site settings → Environment variables** e adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua anon key

A partir daí, **todo push na branch `main` dispara um deploy automático**.

---

## 5. Configurar as landing pages dos influenciadores

Em cada landing page, o `trackEvent.js v4.0` precisa apontar para o endpoint correto:

```javascript
// Exemplo de configuração no trackEvent.js de cada landing page
window.TRACK_ENDPOINT = 'https://SEU_PROJECT_REF.supabase.co/functions/v1/track'

// O campo "influencer" identifica de qual página veio o evento
window.TRACK_CONFIG = {
  influencer: 'nome-do-influenciador',  // ex: 'joao_silva', 'maria_fitness'
  origin: 'instagram',                   // ou 'tiktok', 'youtube', etc.
}
```

### Estrutura de URL recomendada por influenciador
```
https://landing.suamarca.com.br/?inf=joao_silva&utm_source=instagram&utm_campaign=verao2025
```

O trackEvent.js captura automaticamente os parâmetros UTM da URL.

---

## 6. Rodando localmente

```bash
cd admin-dashboard
npm install
cp .env.example .env   # preencha com suas credenciais
npm run dev            # http://localhost:5173
```

---

## 7. Estrutura de arquivos

```
admin-dashboard/
├── index.html                    ← entry point do Vite
├── src/
│   ├── main.jsx                  ← bootstrap React
│   ├── App.jsx                   ← router principal
│   ├── index.css                 ← design system completo
│   ├── lib/supabase.js           ← cliente Supabase
│   ├── pages/
│   │   ├── Overview.jsx          ← /overview — visão geral + gráficos
│   │   ├── Leads.jsx             ← /leads — marcas captadas
│   │   ├── Events.jsx            ← /events — eventos rastreados
│   │   └── Sessions.jsx          ← /sessions — sessões de usuários
│   └── components/
│       ├── Sidebar.jsx           ← navegação lateral
│       └── StatCard.jsx          ← card de métrica reutilizável
├── supabase/functions/track/
│   └── index.ts                  ← Edge Function (recebe eventos em batch)
├── .env.example                  ← template de variáveis
├── netlify.toml                  ← configuração de deploy
├── vite.config.js                ← build com code splitting
└── package.json
```

---

## 8. Próximos passos sugeridos

- [ ] Adicionar autenticação (Supabase Auth ou senha simples no Netlify)
- [ ] Ativar Supabase Realtime nos cards de overview para atualização em tempo real
- [ ] Adicionar paginação nas tabelas de Leads e Eventos
- [ ] Criar página de configurações para gerenciar influenciadores cadastrados
- [ ] Exportar relatório de leads como CSV

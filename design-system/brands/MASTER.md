# Design System Master — Brands SaaS

Salvo em `design-system/brands/MASTER.md` — fonte da verdade para todas as decisões de UI futuras.

---

## Tema

**Light mode fixo.** Sem toggle de tema, sem dark mode. Interface limpa, profissional, alta legibilidade.

---

## Paleta de Cores

| Role | Token | Hex | Uso |
|------|-------|-----|-----|
| Brand | `--brand` | `#250fef` | Azul elétrico — sidebar ativa, links, focus, badges |
| Brand Hover | `--brand-hover` | `#1e0cd1` | Hover de elementos brand |
| Brand Active | `--brand-active` | `#1708a8` | Active/pressed de elementos brand |
| CTA | `--cta` | `#000000` | Botões primários de ação |
| CTA Hover | `--cta-hover` | `#18181B` | Hover de botões CTA |
| CTA Active | `--cta-active` | `#27272A` | Active de botões CTA |
| Background | `--bg` | `#FAFAFA` | Fundo geral off-white |
| Surface | `--surface` | `#FFFFFF` | Cards, modais, sidebar |
| Surface Alt | `--surface-alt` | `#F4F4F5` | Hover, inputs, thead de tabelas |
| Border | `--border` | `#E4E4E7` | Bordas padrão |
| Border Strong | `--border-strong` | `#D4D4D8` | Bordas de destaque, focus |
| Text Primary | `--text-primary` | `#0A0A0A` | Títulos, valores |
| Text Secondary | `--text-secondary` | `#52525B` | Body, labels |
| Text Muted | `--text-muted` | `#A1A1AA` | Placeholders, meta, timestamps |

**Diferenciação estratégica:**
- `#250fef` (azul elétrico) está reservado para navegação e estados de sistema — não usar em botões de ação.
- `#000000` (preto CTA) direciona o usuário para a ação desejada com máximo contraste.

### Acentos semânticos

| Role | Token | Hex |
|------|-------|-----|
| Verde | `--accent-green` | `#22c55e` |
| Amarelo | `--accent-yellow` | `#f59e0b` |
| Vermelho | `--accent-red` | `#ef4444` |
| Roxo | `--accent-purple` | `#8b5cf6` |
| Cyan | `--accent-cyan` | `#06b6d4` |
| Laranja | `--accent-orange` | `#f97316` |

---

## Tipografia

**Font:** Inter (Google Fonts)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

| Escala | Tamanho | Peso | Uso |
|--------|---------|------|-----|
| `--text-xs` | 11px | 500 | Labels, badges |
| `--text-sm` | 13px | 400 | Body, tabelas |
| `--text-base` | 14px | 400 | Padrão |
| `--text-lg` | 16px | 600 | Subtítulos |
| `--text-xl` | 20px | 700 | Títulos de página |
| `--text-2xl` | 26px | 700 | Stat values |

---

## Espaçamento

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-xs` | 4px | Gaps inline |
| `--space-sm` | 8px | Icon gaps |
| `--space-md` | 16px | Padding padrão |
| `--space-lg` | 24px | Seções |
| `--space-xl` | 32px | Page padding |

---

## Padrões de Componente

- **Cards:** `background: #FFFFFF`, `border: 1px solid #E4E4E7`, `border-radius: 10px`, `box-shadow: 0 1px 3px rgba(0,0,0,.04)` — manter
- **Badges:** pill shape `border-radius: 20px`, bg com 15% opacidade da cor semântica — manter
- **Botões primários:** `background: #000000` (CTA preto), `color: #fff`, `border-radius: 6px`, hover `#18181B`, active `#27272A`
- **Botões secundários:** `background: #F4F4F5`, `border: 1px solid #E4E4E7`, hover escurece texto
- **Tabelas:** header `background: #F4F4F5`, row hover `#F4F4F5`, zebra sutil — manter
- **Sidebar:** `background: #FFFFFF`, `border-right: 1px solid #E4E4E7`, link ativo `background: #250fef` com texto branco
- **Inputs:** border `#E4E4E7`, focus border `#D4D4D8`, background `#FAFAFA`
- **Gráficos (Recharts):** tooltip light `#FFFFFF` com borda `#E4E4E7`; cores: brand blue, green, purple, amber

---

## Melhorias Pendentes

### #1 — Code Splitting com React.lazy (Performance)

**Problema:** `App.jsx` importa todas as páginas de forma estática. Bundle inicial carrega código desnecessário.

**Impacto:** Redução de 40-60% no tempo de carregamento inicial.

```jsx
const Overview = React.lazy(() => import('./pages/Overview.jsx'))
// ...
<Suspense fallback={<div className="loading-spinner" />}>
  <Routes>...</Routes>
</Suspense>
```

### #2 — Skeleton Screens (Perceived Performance)

**Problema:** Spinner genérico enquanto busca dados do Supabase.

```css
.skeleton {
  background: linear-gradient(90deg, #F4F4F5 25%, #E4E4E7 50%, #F4F4F5 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease infinite;
  border-radius: var(--radius-sm);
}

@keyframes skeleton-pulse {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Login Pattern

**Layout:** Split-screen 60/40 — brand area à esquerda, form à direita.

### Brand Area (esquerda, 60%)
- Gradient: `linear-gradient(135deg, #250fef 0%, #1e0cd1 60%, #1708a8 100%)`
- Decoração: 2 círculos `radial-gradient` em posição absolute (canto superior direito + inferior esquerdo)
- Conteúdo: logo topo, headline central (`48px bold`), stats glassmorphism no rodapé
- Stats card: `background: rgba(255,255,255,.10)`, `backdrop-filter: blur(10px)`, `border-radius: 12px`

### Form Area (direita, 40%)
- Background `#FFFFFF`, padding `60px`, `min-width: 400px`
- Título: `28px bold #0A0A0A`
- Inputs: `height: 44px`, `border: 1.5px solid #E4E4E7`, `border-radius: 8px`
- Focus: `border-color: #250fef`, `box-shadow: 0 0 0 3px rgba(37,15,239,.10)`
- Erro: `border-color: #EF4444`, `box-shadow: 0 0 0 3px rgba(239,68,68,.10)`
- Botão: preto `#000000`, `height: 44px`, hover `#18181B`, com ícone `ArrowRight`

### Animações
- Brand: `slideInLeft 600ms cubic-bezier(0.16, 1, 0.3, 1)`
- Form: `fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both`

### Mobile (`< 768px`)
- Brand area: `display: none`
- Form: `width: 100%`, padding `32px 24px`, logo Brands exibido no topo

---

## Ordem de Execução Recomendada

**#1** (1h, performance mensurável) → **#2** (2-3h, maior impacto UX)

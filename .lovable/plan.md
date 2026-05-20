# Migração para SPA Vite + Netlify

Vou converter o projeto de TanStack Start (full-stack Cloudflare) para uma SPA Vite pura que roda 100% no Netlify, mantendo todo o visual, fluxo e a análise por IA.

## Arquitetura nova

```text
Frontend (SPA)              Netlify Function (serverless)
─────────────────           ──────────────────────────────
React Router DOM            netlify/functions/analyze.ts
Vite SPA build       ──►    POST /.netlify/functions/analyze
dist/ + index.html          → chama Lovable AI Gateway
                            → usa LOVABLE_API_KEY (env Netlify)
```

## Mudanças

### Stack
- Remover: `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`, `@cloudflare/vite-plugin`, `@lovable.dev/vite-tanstack-config`, `wrangler.jsonc`, `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/integrations/supabase/auth-*.ts`, `src/integrations/supabase/client.server.ts`.
- Adicionar: `react-router-dom`, `vite` config padrão com `@vitejs/plugin-react` + `@tailwindcss/vite` + `vite-tsconfig-paths`.

### Roteamento
- Novo `src/main.tsx` com `createRoot` + `<BrowserRouter>`.
- Novo `src/App.tsx` com `<Routes>`:
  - `/` → `Landing` (atual `routes/index.tsx`)
  - `/analyze` → `Analyze`
  - `/result` → `Result`
- Substituir todos `Link to=` e `useNavigate` do TanStack pelos equivalentes do `react-router-dom`.
- Substituir `useRouterState` no `AudioPlayer` por `useLocation`.
- Remover `createFileRoute`, `head()` (mover meta para `index.html`).

### Análise IA (serverless)
- Criar `netlify/functions/analyze.ts` (TypeScript) que:
  - Recebe `{ imageDataUrl }` por POST.
  - Lê `process.env.LOVABLE_API_KEY` (configurada no painel do Netlify).
  - Faz a mesma chamada para `https://ai.gateway.lovable.dev/v1/chat/completions` com o mesmo `SYSTEM_PROMPT` e modelo `google/gemini-2.5-flash`.
  - Retorna o mesmo `AnalyzeResponse`.
- Novo `src/lib/face-analysis.ts` (sem `createServerFn`): mantém `TIERS`, tipos, e exporta `analyzeFace(imageDataUrl)` que faz `fetch("/.netlify/functions/analyze", ...)`.

### Config
- `vite.config.ts` reescrito: plugin react + tailwind + tsconfig-paths, `build.outDir = "dist"`.
- `tsconfig.json` ajustado (remover refs a TanStack).
- `netlify.toml`:
  ```toml
  [build]
    command = "npm run build"
    publish = "dist"
    functions = "netlify/functions"

  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
- `index.html` na raiz com metas SEO, fonts, e `<div id="root">`.
- `package.json`: scripts `dev`/`build`/`preview` apontando para vite puro.

### Preservado integralmente
- Todo o CSS / design system (`src/styles.css`), classes `glass`, `neon-ring`, etc.
- Componentes shadcn em `src/components/ui/*`.
- `AudioPlayer` (só troca o hook de rota).
- Toda a UX do scanner, loading cinematográfico, resultado, tier ladder, métricas.
- `public/audio/play-hard-hardstyle.mp3`.

## Passo extra (você precisa fazer no Netlify)

Depois do deploy, no painel do Netlify:
1. **Site settings → Environment variables → Add variable**
2. Key: `LOVABLE_API_KEY`
3. Value: (a chave que você usa no Lovable Cloud — posso te indicar onde pegar)
4. Redeploy.

Sem isso, a análise vai retornar “Configure sua chave de API”.

## Riscos / avisos
- Esta migração **substitui a estrutura toda** do projeto. O preview do Lovable continuará funcionando porque é Vite, mas a versão publicada `face-optima.lovable.app` passará a ser SPA (sem SSR — sem prejuízo para esse app).
- Server functions, Supabase server middleware e qualquer rota `/api/*` deixam de existir. Só sobra a Netlify Function de análise.

Confirma que posso aplicar a migração?

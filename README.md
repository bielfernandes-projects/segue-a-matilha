# 🐺 Segue a Matilha

**Party game multiplayer em tempo real (4 a 20 jogadores)** — PWA instalável. A resposta certa não importa: o segredo é adivinhar o que a **MAIORIA da matilha** vai escrever.

Rodada após rodada, todos respondem uma pergunta sem resposta factual; uma IA agrupa as respostas pelo sentido (semântica) e a rodada é pontuada. Quem acerta a resposta mais popular leva 2 Fichas de AUmigos; quem só acompanha o grupo, 1; o Lobo Solitário fica com 0.

> **v2 · serverless** · Stack: React 19 + Vite + Tailwind v4 (PWA) · **Vercel Functions (REST) + Supabase Postgres (estado) + Supabase Realtime Broadcast (tempo real)** · Juiz de IA via OpenRouter com fallback offline.

---

## ✨ Funcionalidades

- **Salas em tempo real** por código de 4 letras + QR Code + link de convite.
- **100% serverless** — sem Socket.IO, sem timers em memória: o estado da sala vive no Postgres (JSONB) e o tempo real usa o broadcast do Supabase Realtime.
- **Server-authoritative** — todo o estado do jogo vive no servidor; o client é um espelho (anti-cheat por natureza). Durante a fase de resposta, o snapshot público **omite a resposta dos outros jogadores**.
- **Concorrência otimista** — cada atualização de sala usa uma coluna `version` (`UPDATE ... WHERE version = ?`), com re-leitura e re-aplicação em caso de conflito (até 3 tentativas).
- **Reconexão resiliente** — token de sessão no `localStorage` (coluna `sessions`); ao reconectar via `/api/rooms/rejoin`, volta exatamente onde estava.
- **Heartbeat** — o client envia `/api/rooms/:code/heartbeat` a cada 20s; jogadores sem heartbeat por 45s são marcados como desconectados (fora da rodada em curso). O heartbeat só persiste quando há mudança real de presença (evita escrita desnecessária no banco).
- **Atualizações suaves** — a resposta é marcada **otimisticamente** no client; enquanto a IA julga, o servidor emite `game:judging` e todos veem o overlay "IA fazendo a contagem...". Se o Realtime cair, o client faz polling leve de `GET /state` a cada 4s até reconectar.
- **Promoção automática de Host** — se o Host cair, o próximo conectado assume; a sala entra em estado `paused` até isso acontecer.
- **Reveal sem timers no servidor** — cada round guarda um `deadline` absoluto; qualquer client dispara o reveal quando o tempo acaba (o servidor valida o deadline).
- **Juiz de IA (OpenRouter)** com `temperature: 0`, timeout e **fallback determinístico offline** (rodada marcada como "offline" na tela).
- **Dois modos de jogo**: Modo A (limite de rodadas) e Modo B (corrida até uma meta de pontos).
- **Pódio com desempates** e suporte a vitória dividida (co-vencedores).
- **Banco de perguntas**: ~230 aprovadas no seed, sugestão de usuário (status `pending`) e **painel admin** para curadoria.
- **PWA instalável** com manifest, service worker e sons sintetizados via Web Audio API (sem arquivos de áudio).
- **20 raças de avatares caninos** com cor e bordão próprios.

---

## 🧩 Regras do Jogo

- **Setup**: o Host cria a sala (é o Jogador 1, joga normalmente e tem os botões de Iniciar / Avançar). 4 a 20 jogadores entram por código + nome + avatar.
- **Fluxo da rodada**: pergunta aleatória → fase de resposta secreta (com timer configurável) → revelação simultânea agrupada em clusters → pontuação → placar.
- **Pontuação (Fichas de AUmigos)**:
  - **A Matilha** (resposta mais popular): **2 pontos** — empate no topo dá 2 para todos os empatados.
  - **Os Perdidos** (resposta repetida, mas não vencedora): **1 ponto**.
  - **Lobo Solitário** (resposta única) ou "não respondeu": **0 pontos**.
  - Rodada em que **todos** deram respostas únicas: ninguém pontua.
- **Input**: 1 a 40 caracteres, editável até o fim do timer.
- **Modos**:
  - Modo A — Limite de Rodadas: 6 a 20 rodadas, encerra na última.
  - Modo B — Corrida de AUmigos: meta de 12 a 40 pontos; checada ao fim de cada rodada (com desempate se vários cruzarem juntos).
- **Desempate do pódio** (nesta ordem):
  1. Maior pontuação total.
  2. Menos Lobos Solitários (menos rodadas com 0 pontos).
  3. Maior sequência consecutiva de rodadas com 2 pontos (streak).
  4. Empate persistente → vitória dividida (co-vencedores).
- **Replay**: "Jogar Novamente" mantém a mesma sala e jogadores, zera pontos, mantém as configurações, reembaralha o pool de perguntas e o Host reinicia. Novos jogadores podem entrar entre partidas.

---

## 🏗️ Arquitetura

Monorepo com **npm workspaces**. O jogo roda 100% na Vercel: **Functions** para a API REST e **Realtime Broadcast** do Supabase para o tempo real. Não existe processo Node contínuo.

```
segue-a-matilha/
├── package.json                   # workspaces + scripts raiz
├── vercel.json                    # build do web + roteia /api/* → api/index
├── scripts/
│   └── build-api.mjs              # esbuild: serverless-src/index.ts → api/index.js (bundle único)
├── serverless-src/
│   └── index.ts                   # fonte da Vercel Function (export default buildApp())
├── api/
│   ├── package.json               # { "type": "commonjs" } — o bundle roda como CJS
│   └── index.js                   # bundle único gerado por build-api e VERSIONADO no git —
│                                  # a Vercel detecta a Function a partir do clone do repo
├── tsconfig.base.json             # config TS compartilhada
├── .env.example                   # variáveis de ambiente (referência)
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql          # tabela questions (RLS)
│       └── 0002_realtime.sql      # tabelas rooms (estado JSONB) e sessions
├── packages/shared/               # contrato entre server e web
│   └── src/
│       ├── protocol.ts            # eventos Realtime (SERVER_EVENTS)
│       ├── types.ts               # Room, Player, Cluster, Question, Phase…
│       ├── constants.ts           # limites (LIMITS) + configurações padrão
│       ├── ranking.ts             # pontuação 2/1/0, desempates, fim de jogo
│       └── avatars.ts             # 20 raças de avatares caninos
├── packages/game/                 # NÚCLEO do jogo (funções puras + persistência)
│   └── src/
│       ├── state.ts               # máquina de estados 100% pura e persistível
│       ├── persistence.ts         # Supabase (rooms/sessions) + withRoom otimista
│       ├── realtime.ts            # broadcast Realtime (best-effort, service role)
│       ├── app.ts                 # buildApp() — REST completo do jogo
│       ├── judge.ts               # chamada OpenRouter + contract {clusters, offline}
│       ├── fallback.ts            # agrupamento offline determinístico
│       ├── questions.ts           # sorteio de pergunta sem repetição
│       ├── config.ts              # env vars
│       └── index.ts               # exports públicos do pacote
├── apps/server/                   # dev server (não usado em produção)
│   └── src/
│       ├── index.ts               # buildApp() + seed + serve apps/web/dist
│       └── db/
│           ├── questionsSeed.ts   # ~230 perguntas aprovadas (PT-BR)
│           └── seed.ts            # seed automático na primeira subida
└── apps/web/                      # React + Vite + Tailwind (PWA)
    └── src/
        ├── main.tsx               # bootstrap + service worker
        ├── App.tsx                # roteamento por fase + modais + rejoin/QR
        ├── store.ts               # store Zustand (REST + subscribe Realtime)
        ├── lib/api.ts             # fetch com envelope { ok, error }
        ├── lib/realtime.ts        # supabase-js → canal room:{code}
        ├── services/sound.ts      # sons sintetizados (Web Audio)
        ├── index.css              # estilos globais / tema Tailwind
        └── components/            # Navbar, Home, Lobby, Question, Reveal,
                                   # Leaderboard, Podium, Paused + modais
```

### Como o tempo real funciona (sem Socket.IO)

1. Cada ação vira um `POST` REST que atualiza a sala no Postgres com **concorrência otimista** (`withRoom` em `packages/game/src/persistence.ts`).
2. Depois da escrita, o servidor faz um **broadcast Realtime** (service role) no canal `room:{code}` com o snapshot público — **best-effort**: se o canal cair, o client detecta (`connected = false`) e faz polling leve de `GET /state` a cada 4s até reconectar.
3. O client assina o canal `room:{code}` (`apps/web/src/lib/realtime.ts`) e troca o snapshot do store Zustand a cada `room:state`.
4. Eventos pontuais chegam por eventos do broadcast: `game:judging` (juiz começou a contar — overlay em todas as telas), `game:reveal` / `game:over` (sons).
5. **O timer não roda no servidor.** A rodada guarda um `deadline` absoluto; o client mostra a contagem regressiva localmente e, ao zerar, chama `POST /api/rooms/:code/reveal` (qualquer jogador — o servidor valida o deadline). O Host pode forçar o reveal a qualquer momento (`force: true`).

### Máquina de estados da partida

```
lobby → question → reveal → leaderboard → question → … → finished
   └──────────↳ paused (Host caiu / reconectando)
```

| Fase | Descrição |
|------|-----------|
| `lobby` | Jogadores entram; Host configura (modo, timer, alvo) e inicia. |
| `question` | Pergunta + `deadline` (timestamp absoluto); respostas editáveis até o timer. |
| `reveal` | Todos responderam, timer estourou ou Host forçou revelar → juiz de IA agrupa → pontuação calculada. |
| `leaderboard` | Placar; Host avança para a próxima rodada. |
| `finished` | Pódio com desempates + "Jogar Novamente". |
| `paused` | Host desconectado; promove automaticamente o próximo jogador conectado. |

### REST API

| Rota | Método | Auth | Descrição |
|------|--------|------|-----------|
| `/api/health` | GET | — | `{ ok, rooms, uptime }` |
| `/api/questions/suggest` | POST | — | Sugestão de pergunta → status `pending` |
| `/api/rooms` | POST | — | Cria sala (Host) → `{ room, joined: {roomCode, playerId, token} }` |
| `/api/rooms/:code/join` | POST | — | Entra na sala (nome + avatar) → `{ room, joined }` |
| `/api/rooms/rejoin` | POST | token | Reconecta sessão salva |
| `/api/rooms/:code/heartbeat` | POST | token | Mantém jogador conectado (20s no client) |
| `/api/rooms/:code/start` | POST | token | Host inicia a partida |
| `/api/rooms/:code/answer` | POST | token | Envia/edita resposta |
| `/api/rooms/:code/reveal` | POST | token | Revela (`force: true` só Host; sem force valida deadline) |
| `/api/rooms/:code/next` | POST | token | Host avança reveal → leaderboard → próxima rodada |
| `/api/rooms/:code/play-again` | POST | token | Host reinicia após `finished` |
| `/api/rooms/:code/leave` | POST | token | Sai da sala (limpa sessão; apaga sala se vazia) |
| `/api/rooms/:code/state` | GET | token | Snapshot público atual |
| `/api/admin/questions` | GET/POST | `x-admin-token` | Painel admin (listar/inserir) |
| `/api/admin/questions/:id` | PATCH/DELETE | `x-admin-token` | Aprovar/rejeitar/remover |

> Autenticação por sessão: envie o `token` no corpo (ou `?token=` no GET). Ele identifica `(room, player)` e expira se a sala sumir.

### Banco de dados (Supabase / Postgres)

Três tabelas:

- `public.questions(id text pk, text, status, author, category, created_at bigint)` — banco de perguntas (RLS: leitura liberada ao anon).
- `public.rooms(code text pk, state jsonb, phase text, version bigint, updated_at bigint, created_at bigint)` — estado da sala (JSONB). Escrita só via service role (RLS fechada).
- `public.sessions(token text pk, room_code text, player_id text, created_at bigint)` — sessões de reconexão.

- **Migração**: `supabase db push` (ou colar `0001` + `0002` no SQL Editor).
- **Seed automático**: na primeira subida com a tabela vazia, o dev server insere as ~230 perguntas aprovadas do `questionsSeed.ts`.

### Juiz de IA (OpenRouter) + fallback

`packages/game/src/judge.ts` chama `POST /api/v1/chat/completions` com `temperature: 0` e `response_format: {type:'json_object'}` para agrupar as respostas da rodada pelo sentido, devolvendo `{ clusters: [{rotulo, respostas: [...]}], offline }`.

- Timeout via `AbortController` (6s) e sem retry. Enquanto o juiz responde, o servidor emite `game:judging` para todos os clientes (overlay "IA fazendo a contagem..." na tela de pergunta).
- Sem `OPENROUTER_API_KEY`, erro ou resposta fora do shape esperado → **`fallback.ts`**: normaliza (trim, lowercase, remove acentos via NFD, remove pontuação, colapsa espaços) + colapsa plurais simples (`es`/`os`/`as`), agrupando por igualdade. A rodada é marcada `offline: true` e o aviso aparece na tela de revelação.

---

## 🚀 Rodando localmente

Pré-requisitos: **Node.js 20+**, um projeto Supabase (tabelas + chaves) e, opcionalmente, o CLI do Supabase.

```bash
# 1. Instalar dependências (raiz do monorepo)
npm install

# 2. Criar as variáveis de ambiente
#    cp .env.example .env            (raiz — chaves server-side)
#    cp .env.example .env            (apps/web — só VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)

# 3. Aplicar migrações no Supabase
#    supabase link --project-ref SEU_REF
#    supabase db push

# 4. Buildar o web (gerar apps/web/dist) e subir o dev server
npm run build
npm run dev:server     # http://localhost:3000 (API + estático do web)

# 5. (Alternativa) Vite dev com proxy /api → :3000
npm run dev:web        # http://localhost:5173
```

### Scripts (raiz)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Sobe apenas o dev server (tsx watch) |
| `npm run dev:web` | Vite dev server (proxy `/api` para o servidor) |
| `npm run build` | Build do web (`tsc --noEmit && vite build`) e do server (esbuild CJS) |
| `npm run build:api` | Gera `api/index.js` (bundle único da Vercel Function via esbuild) |
| `npm run start` | Sobe o dev server via `tsx src/index.ts` |
| `npm run lint` | `tsc --noEmit` em todos os workspaces |
| `npm run test` | Vitest (`packages/game`) |
| `npm run typecheck` | Alias para lint |

### Variáveis de ambiente

**Server-side (`.env` na raiz / env vars da Vercel):**

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `SUPABASE_URL` | ✅ | — | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Chave service role (nunca expor no client) |
| `OPENROUTER_API_KEY` | — | — | Sem ela, o juiz roda 100% offline |
| `OPENROUTER_MODEL` | — | `openai/gpt-4o-mini` | Modelo do juiz |
| `ADMIN_TOKEN` | — | `matilha-admin` | Token do painel admin (header `x-admin-token`) |
| `PORT` | — | `3000` | Porta do dev server |

**Web (build-time, em `apps/web/.env` e na Vercel):**

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | ✅ | URL do projeto Supabase (pública) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Chave anon (pública) — usada pelo client Realtime |

---

## ✅ Testes

```bash
npm test
```

Cobertura atual em `packages/game/test` (Vitest, 19 testes):

- `ranking.test.ts` (12): pontuação 2/1/0, empate no topo, rodada 100% única, streak, lobos solitários e ordem de desempate do pódio.
- `state.test.ts` (7): criar/entrar/iniciar/submeter/revelar/avançar/play-again, snapshot público (anti-cheat: esconde resposta alheia na fase `question` mas expõe `hasAnswered`) e idempotência do reveal.

---

## ☁️ Deploy (Vercel)

O jogo roda inteiro na Vercel — **sem processo contínuo**.

```bash
vercel --prod
```

O `vercel.json` manda o framework Vite buildar `apps/web` e roteia `/api/*` para a Function. A Function é **pré-bundlada** (`scripts/build-api.mjs` → `api/index.js`): o esbuild embrulha `@segue/game`, `@segue/shared`, express, supabase-js e dotenv num único arquivo CJS (a pasta `api/` tem `package.json` com `type: commonjs`). Isso evita o problema de imports ESM de pacotes com fonte TypeScript em runtime serverless.

> ⚠️ **`api/index.js` é versionado no git (não está no `.gitignore`).** Deploys conectados ao Git só enxergam arquivos commitados: a Vercel clona o repo e detecta as Functions do diretório `api/` **antes** de rodar o build command. Se o bundle ficar só no `.gitignore`, a pasta `api/` chega vazia no clone e nenhuma Function é publicada (todos os `/api/*` respondem 404 "The page could not be found"). Por isso, depois de alterar o jogo, rode `npm run build:api` e **commite o bundle atualizado** junto.

A Function roda na região **`gru1`** (São Paulo, via `vercel.json → regions`), a mesma do projeto Supabase, para minimizar a latência de rede e cold starts.

Passos:

1. Na Vercel, configure as env vars **server-side**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `ADMIN_TOKEN`.
2. Configure as env vars **do build do front** (preview/production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Rodar as migrações no Supabase (SQL Editor ou `supabase db push`).

> Domínio: o subdomínio automático do projeto é `https://segue-a-matilha.vercel.app`. Um alias como `segueamatilha.vercel.app` exige a flag **custom domains** habilitada no projeto (Settings → Domains); sem ela, o alias cai no login do Vercel.

---

## 📌 Roadmap / fora da v2

- Wrap Android (Capacitor).
- Animações elaboradas de revelação.
- i18n (EN/ES).
- Avatares personalizados (upload de imagem).
- Endereços de sala duráveis (a sala expira após inatividade total — `ROOM_EXPIRE_MS`).

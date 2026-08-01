# 🐺 Segue a Matilha

**Party game multiplayer em tempo real (4 a 20 jogadores)** — PWA instalável. A resposta certa não importa: o segredo é adivinhar o que a **MAIORIA da matilha** vai escrever.

Rodada após rodada, todos respondem uma pergunta sem resposta factual; uma IA agrupa as respostas pelo sentido (semântica) e a rodada é pontuada. Quem acerta a resposta mais popular leva 2 Fichas de AUmigos; quem só acompanha o grupo, 1; o Lobo Solitário fica com 0.

> **v1** · Stack: React 19 + Vite + Tailwind v4 (PWA) · Node.js + TypeScript + Socket.IO · Supabase (Postgres) · Juiz de IA via OpenRouter com fallback offline.

---

## ✨ Funcionalidades

- **Salas em tempo real** por código de 4 letras + QR Code + link de convite.
- **Servidor-authoritative** — todo o estado do jogo vive no servidor; o client é um espelho (anti-cheat por natureza).
- **Reconexão resiliente** — token de sessão no `localStorage`; ao reconectar, volta exatamente onde estava.
- **Promoção automática de Host** — se o Host cair, o próximo conectado assume; a sala entra em estado `paused` até isso acontecer.
- **Juiz de IA (OpenRouter)** com `temperature: 0`, timeout de 5s + 1 retry, e **fallback determinístico offline** (rodada marcada como "offline" na tela).
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
- **Input**: 1 a 40 caracteres, editável até o fim do timer (espelha apagar e reescrever do jogo físico).
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

Monorepo com **npm workspaces**.

```
segue-a-matilha/
├── package.json                   # workspaces + scripts raiz
├── tsconfig.base.json             # config TS compartilhada
├── .env.example                   # variáveis de ambiente (referência)
├── supabase/
│   └── migrations/
│       └── 0001_init.sql          # migração Postgres (rodar no SQL Editor)
├── packages/shared/               # contrato entre server e web
│   └── src/
│       ├── protocol.ts            # eventos de socket (client → server / server → client)
│       ├── types.ts               # Room, Player, Cluster, Question, Phase…
│       ├── constants.ts           # limites (LIMITS) + configurações padrão
│       ├── ranking.ts             # pontuação 2/1/0, desempates, fim de jogo
│       └── avatars.ts             # 20 raças de avatares caninos
├── apps/server/                   # Node + TS + Express + Socket.IO + Supabase
│   └── src/
│       ├── index.ts               # HTTP (Express) + Socket.IO + REST admin/suggest + static do web
│       ├── config.ts              # env vars (busca .env em cwd, ../, ../../)
│       ├── ai/
│       │   ├── judge.ts           # chamada OpenRouter (temp 0, retry, timeout) + contract {clusters, offline}
│       │   └── fallback.ts        # agrupamento offline determinístico (normalização + plural)
│       ├── game/
│       │   ├── roomManager.ts     # criar/entrar/reconectar/tokens/promoção de host/expiração 2h
│       │   ├── gameLoop.ts        # máquina de estados, timer, reveal, próximas rodadas, play again
│       │   └── questions.ts       # cache de perguntas aprovadas + sorteio sem repetição
│       ├── db/
│       │   ├── supabase.ts        # cliente tipado (supabase-js) + queries
│       │   ├── questionsSeed.ts   # ~230 perguntas aprovadas (PT-BR)
│       │   └── seed.ts            # seed automático na primeira subida (tabela vazia)
│       ├── socket/
│       │   ├── index.ts           # createSocketServer(app, rooms, loop) → httpServer
│       │   ├── handlers.ts        # handlers de todos os eventos do client
│       │   ├── broadcast.ts       # emitRoomState / emitNamed
│       │   └── snapshot.ts        # serialização do Room → snapshot público
│       └── test/
│           └── ranking.test.ts    # 12 testes Vitest (pontuação e desempates)
└── apps/web/                      # React + Vite + Tailwind (PWA)
    └── src/
        ├── main.tsx               # bootstrap + connectSocket + service worker
        ├── App.tsx                # roteamento por fase + modais + auto-join por ?code=
        ├── store.ts               # store Zustand (espelha o snapshot do servidor)
        ├── lib/socket.ts          # socket.io-client + rejoin por token + emitAck
        ├── services/sound.ts      # sons sintetizados (Web Audio)
        ├── index.css              # estilos globais / tema Tailwind
        └── components/            # Navbar, Home, Lobby, Question, Reveal,
                                   # Leaderboard, Podium, Paused + modais
```

### Máquina de estados da partida (server-authoritative)

```
lobby → question → reveal → leaderboard → question → … → finished
   └──────────↳ paused (Host caiu / reconectando)
```

| Fase | Descrição |
|------|-----------|
| `lobby` | Jogadores entram; Host configura (modo, timer, alvo) e inicia. |
| `question` | Pergunta + `deadline` (timestamp absoluto); respostas editáveis até o timer; broadcast só da contagem agregada. |
| `reveal` | Todos responderam, timer estourou ou Host forçou revelar → juiz de IA agrupa → pontuação calculada e transmitida. |
| `leaderboard` | Placar em tempo real; Host avança para a próxima rodada. |
| `finished` | Pódio com desempates + "Jogar Novamente". |
| `paused` | Host desconectado; promove automaticamente o próximo jogador conectado. |

### Contrato de socket

**Client → Server** (`CLIENT_EVENTS`):

| Evento | Payload |
|--------|---------|
| `room:create` | `{ hostName, avatarId, settings? }` |
| `room:join` | `{ roomCode, playerName, avatarId }` |
| `room:rejoin` | `{ token }` |
| `room:leave` | `{}` |
| `game:start` | `{}` |
| `round:answer` | `{ answer }` |
| `round:force-reveal` | `{}` (Host) |
| `game:next` | `{}` (Host) |
| `game:play-again` | `{}` (Host) |

**Server → Client** (`SERVER_EVENTS`): `room:state` (snapshot completo), `room:joined` (`{roomCode, playerId, token}`), `room:error`, `game:round-start`, `game:answer-count`, `game:reveal`, `game:leaderboard`, `game:over`, `room:host-changed`, `room:player-removed`.

Reconexão: o client guarda o token; ao `connect`, emite `room:rejoin` com o token e o servidor devolve o snapshot e o token renovado.

### REST API

| Rota | Método | Auth | Descrição |
|------|--------|------|-----------|
| `/api/health` | GET | — | `{ ok, rooms, uptime }` |
| `/api/questions/suggest` | POST | — | Sugestão de pergunta → status `pending` |
| `/api/admin/questions` | GET | `x-admin-token` | Lista perguntas (`?status=` filtra) |
| `/api/admin/questions` | POST | `x-admin-token` | Insere pergunta direto |
| `/api/admin/questions/:id` | PATCH | `x-admin-token` | Aprova / rejeita |
| `/api/admin/questions/:id` | DELETE | `x-admin-token` | Remove pergunta |

### Banco de dados (Supabase / Postgres)

Uma tabela — `public.questions(id text pk, text, status, author, category, created_at bigint)` — com RLS habilitado (o servidor usa a *service role*, que ignora RLS; uma policy libera leitura de perguntas aprovadas ao anon).

- **Migração**: colar `supabase/migrations/0001_init.sql` no SQL Editor do projeto Supabase.
- **Seed automático**: na primeira subida com a tabela vazia, o servidor insere as ~230 perguntas aprovadas do `questionsSeed.ts`.
- Partidas são **efêmeras** (vivem em memória): só as perguntas persistem.

### Juiz de IA (OpenRouter) + fallback

`apps/server/src/ai/judge.ts` chama `POST /api/v1/chat/completions` com `temperature: 0` e `response_format: {type:'json_object'}` para agrupar as respostas da rodada pelo sentido, devolvendo `{ clusters: [{rotulo, respostas: [...]}], offline }`.

- Timeout de 5s (`LIMITS.JUDGE_TIMEOUT_MS`) via `AbortController` + 1 retry (`LIMITS.JUDGE_RETRIES`).
- Sem `OPENROUTER_API_KEY`, erro ou resposta fora do shape esperado → **`fallback.ts`**: normaliza (trim, lowercase, remove acentos via NFD, remove pontuação, colapsa espaços) + colapsa plurais simples (`es`/`os`/`as`), agrupando por igualdade. A rodada é marcada `offline: true` e o aviso aparece na tela de revelação.

---

## 🚀 Rodando localmente

Pré-requisitos: **Node.js 20+** (desenvolvido com Node 24) e um projeto Supabase (tabela + service role).

```bash
# 1. Instalar dependências (raiz do monorepo)
npm install

# 2. Criar as variáveis de ambiente (raiz) — veja .env.example
#    cp .env.example .env  (no Windows: Copy-Item .env.example .env)

# 3. Criar a tabela no Supabase
#    Supabase Dashboard → SQL Editor → colar supabase/migrations/0001_init.sql → Run

# 4. Subir servidor (API + Socket.IO) e web (Vite dev, proxy /socket.io e /api → :3000)
npm run dev:server     # http://localhost:3000
npm run dev:web        # http://localhost:5173
```

### Scripts (raiz)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Sobe apenas o servidor (tsx watch) |
| `npm run dev:server` | Idem, explícito |
| `npm run dev:web` | Vite dev server (com proxy para o servidor) |
| `npm run build` | Build do web (`tsc --noEmit && vite build`) e do server (esbuild CJS) |
| `npm run start` | Sobe o servidor via `tsx src/index.ts` |
| `npm run lint` | `tsc --noEmit` em todos os workspaces |
| `npm run test` | Vitest (server) |
| `npm run typecheck` | Alias para lint |

O servidor serve `apps/web/dist` (build de produção) se existir — o front não precisa de host separado.

### Variáveis de ambiente (`.env`)

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `SUPABASE_URL` | ✅ | — | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Chave service role (nunca expor no client) |
| `OPENROUTER_API_KEY` | — | — | Sem ela, o juiz roda 100% offline |
| `OPENROUTER_MODEL` | — | `openai/gpt-4o-mini` | Modelo do juiz |
| `ADMIN_TOKEN` | — | `matilha-admin` | Token do painel admin (header `x-admin-token`) |
| `PORT` | — | `3000` | Porta do servidor |

**Web (build-time):** `VITE_SERVER_URL` — se o front for publicado como estático (ex.: Vercel) e o servidor Node rodar em outro host, aponte para ele (ex.: `https://api.seu-dominio.com`). Vazio = conecta na mesma origem.

---

## ✅ Testes

```bash
npm run test --workspace @segue/server
```

Cobertura atual (`apps/server/test/ranking.test.ts`, 12 testes): pontuação 2/1/0, empate no topo, rodada 100% única, streak, lobos solitários e ordem de desempate do pódio.

---

## ☁️ Deploy

> ⚠️ **Atenção**: o servidor usa **Socket.IO com conexões persistentes e estado em memória** (salas). Isso **não funciona em funções serverless efêmeras** (Vercel/Functions). Para um deploy multiplayer funcional, o processo Node precisa de um host com processo contínuo (ex.: Render, Railway, Fly.io, uma VM), com o front podendo ser servido pelo próprio servidor (estático) ou publicado como estático no Vercel/Netlify com o proxy apontando para o host do servidor.

Fluxo sugerido para produção:

1. Rodar a migração no Supabase.
2. Subir o server (`npm run build` → `node apps/server/dist/server.cjs`) em um host de processo contínuo com as env vars.
3. (Opcional) publicar `apps/web/dist` como site estático.

---

## 📌 Roadmap / fora da v1

- Wrap Android (Capacitor).
- Animações elaboradas de revelação.
- i18n (EN/ES).
- Avatares personalizados (upload de imagem).
- Endereços de sala duráveis (a sala expira após 2h de inatividade total).

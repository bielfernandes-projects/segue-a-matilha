-- Segue a Matilha - estado de jogo persistido (serverless-friendly)
-- Rode no SQL Editor do Supabase (Dashboard -> SQL Editor) DEPOIS da 0001.
--
-- Motivo: o jogo passa a rodar 100% em funcoes serverless (Vercel), que nao
-- mantem estado em memoria. Toda sala vira uma linha em `rooms` (estado JSONB)
-- e o acesso ao vivo usa o Realtime Broadcast do Supabase. Apenas a service
-- role acessa essas tabelas (via funcoes); o anon NAO tem permissao direta.

-- Sala de jogo: estado completo em JSONB + colunas para queries e concorrencia.
create table if not exists public.rooms (
  code       text primary key,
  state      jsonb not null,
  phase      text not null,
  version    bigint not null default 1,
  updated_at bigint not null,
  created_at bigint not null
);

create index if not exists idx_rooms_phase      on public.rooms (phase);
create index if not exists idx_rooms_updated_at on public.rooms (updated_at);

-- Sessoes: token <-> (sala, jogador) para reconexao/refresh.
create table if not exists public.sessions (
  token      text primary key,
  room_code  text not null references public.rooms(code) on delete cascade,
  player_id  text not null,
  created_at bigint not null
);

create index if not exists idx_sessions_room_code on public.sessions (room_code);

-- RLS: sem acesso direto pelo anon (toda mutacao passa pelas funcoes com a
-- service role, que ignora RLS). O Realtime Broadcast nao le essas tabelas.
alter table public.rooms    enable row level security;
alter table public.sessions enable row level security;

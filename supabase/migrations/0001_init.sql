-- Segue a Matilha - migracao inicial
-- Cole este SQL no SQL Editor do Supabase (Dashboard -> SQL Editor) e rode.
-- Obs: o seed das ~230 perguntas aprovadas e feito automaticamente pelo servidor
-- na primeira vez que ele subir (tabela vazia => insere o pool inicial).

create table if not exists public.questions (
  id         text primary key,
  text       text not null,
  status     text not null default 'pending' check (status in ('approved', 'pending', 'rejected')),
  author     text,
  category   text,
  created_at bigint not null
);

alter table public.questions enable row level security;

-- Apenas o servidor usa a service role (que ignora RLS).
-- O anon pode ler apenas perguntas aprovadas (fallback se algo vazar pro client).
drop policy if exists "anon_read_approved" on public.questions;
create policy "anon_read_approved" on public.questions
  for select to anon
  using (status = 'approved');

create index if not exists idx_questions_status on public.questions (status);

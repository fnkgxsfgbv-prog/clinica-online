-- Coluna necessária para vincular frequência à sessão (backfill e app).
alter table public."frequência"
  add column if not exists sessao_id bigint references public.sessoes (id);

create index if not exists frequencia_sessao_id_idx
  on public."frequência" (sessao_id);

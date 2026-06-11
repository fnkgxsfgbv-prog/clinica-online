-- Metadados do PDF importado no plano terapêutico.

alter table public.paciente_plano_terapeutico
  add column if not exists pdf_storage_path text,
  add column if not exists pdf_nome_arquivo text,
  add column if not exists pdf_importado_em timestamptz;

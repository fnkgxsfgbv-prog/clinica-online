-- Preenche evolucoes.user_id a partir do paciente (RLS exige auth.uid() = user_id).
-- Rode no SQL Editor do Supabase ou: npm run db:backfill-evolucoes-user-id

UPDATE public.evolucoes AS e
SET user_id = (p.user_id::text)::uuid
FROM public.pacientes AS p
WHERE p.user_id IS NOT NULL
  AND e.paciente_id::text = p.id::text
  AND e.user_id::text IS DISTINCT FROM p.user_id::text;

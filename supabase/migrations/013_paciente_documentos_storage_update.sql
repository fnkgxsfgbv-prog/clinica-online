-- Permite atualizar arquivos já existentes no bucket privado do paciente.

drop policy if exists "paciente_documentos_storage_update_own" on storage.objects;

create policy "paciente_documentos_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'paciente-documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'paciente-documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

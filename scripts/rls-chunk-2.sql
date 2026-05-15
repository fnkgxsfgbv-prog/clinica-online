create policy "frequencia_select_own" on public."frequência" for select using (auth.uid() = user_id);
create policy "frequencia_insert_own" on public."frequência" for insert with check (auth.uid() = user_id);
create policy "frequencia_update_own" on public."frequência" for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "frequencia_delete_own" on public."frequência" for delete using (auth.uid() = user_id);

create policy "evolucoes_select_own" on public.evolucoes for select using (auth.uid() = user_id);
create policy "evolucoes_insert_own" on public.evolucoes for insert with check (auth.uid() = user_id);
create policy "evolucoes_update_own" on public.evolucoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "evolucoes_delete_own" on public.evolucoes for delete using (auth.uid() = user_id);

import { NextResponse } from "next/server";

import { TABLES } from "../../lib/db/tables";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const runtime = "nodejs";

export async function carregarSessaoDoUsuario(
  sessaoId: string,
  userId: string
) {
  const supabase = await createSupabaseServerClient();

  const tentativas = [sessaoId];
  const numerico = Number(sessaoId);
  if (Number.isFinite(numerico) && String(numerico) !== sessaoId) {
    tentativas.push(String(numerico));
  }

  for (const id of tentativas) {
    const { data, error } = await supabase
      .from(TABLES.SESSOES)
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) return { ok: false as const, erro: error.message };
    if (data) return { ok: true as const, supabase, sessao: data };
  }

  return { ok: false as const, erro: "Sessão não encontrada." };
}

export function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

/**
 * Valida RLS e isolamento básico.
 * Uso: node --env-file=.env.local scripts/validate-security.mjs
 * Opcional: TEST_EMAIL e TEST_PASSWORD no .env.local
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_EMAIL;
const testPassword = process.env.TEST_PASSWORD;

if (!url || !anonKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const tables = ["pacientes", "sessoes", "frequência", "evolucoes"];

function anonClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function countRows(client, table) {
  const { data, error, count } = await client
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    return { table, error: error.message, count: null };
  }

  return { table, error: null, count: count ?? data?.length ?? 0 };
}

async function main() {
  console.log("=== Validação de segurança PsicoDesk ===\n");
  console.log("Projeto:", url.replace(/^https:\/\//, "").split(".")[0]);

  const client = anonClient();

  console.log("\n1) Acesso anônimo (sem login):");
  let anonLeak = false;

  for (const table of tables) {
    const result = await countRows(client, table);
    if (result.error) {
      console.log(`   ${table}: bloqueado/erro — ${result.error}`);
    } else if (result.count > 0) {
      console.log(`   ${table}: FALHA — ${result.count} linha(s) visíveis sem auth`);
      anonLeak = true;
    } else {
      console.log(`   ${table}: OK — 0 linhas`);
    }
  }

  if (anonLeak) {
    console.log(
      "\n⚠ RLS provavelmente NÃO está ativo. Execute supabase/migrations/001_enable_rls.sql no SQL Editor."
    );
  } else {
    console.log("\n✓ Acesso anônimo bloqueado (RLS parece ativo).");
  }

  if (!testEmail || !testPassword) {
    console.log(
      "\n2) Login de teste: pulado (adicione TEST_EMAIL e TEST_PASSWORD no .env.local para testar auth)."
    );
    process.exit(anonLeak ? 1 : 0);
  }

  console.log("\n2) Login com credenciais de teste:");
  const authed = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data: signIn, error: signInError } =
    await authed.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

  if (signInError) {
    console.error("   Erro no login:", signInError.message);
    process.exit(1);
  }

  console.log("   Logado como:", signIn.user.email);

  console.log("\n3) Dados do usuário autenticado:");
  for (const table of tables) {
    const result = await countRows(authed, table);
    if (result.error) {
      console.log(`   ${table}: erro — ${result.error}`);
    } else {
      console.log(`   ${table}: ${result.count} linha(s) (esperado: só deste user)`);
    }
  }

  await authed.auth.signOut();
  console.log("\n✓ Validação com login concluída.");
  process.exit(anonLeak ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

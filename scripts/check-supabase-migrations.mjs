/**
 * Verifica tabelas-chave das migrations recentes no Supabase de produção.
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_ACCESS_TOKEN no .env.local
 *
 * Uso: node --env-file=.env.local scripts/check-supabase-migrations.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!url || !token) {
  console.error(
    "Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_ACCESS_TOKEN no .env.local"
  );
  process.exit(1);
}

const projectRef = url.replace(/^https:\/\//, "").split(".")[0];

const checks = [
  { nome: "paciente_documentos", sql: "SELECT to_regclass('public.paciente_documentos') AS ok" },
  { nome: "paciente_anamnese", sql: "SELECT to_regclass('public.paciente_anamnese') AS ok" },
  {
    nome: "documento_modelos",
    sql: "SELECT to_regclass('public.documento_modelos') AS ok",
  },
];

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${body}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

console.log("=== PsicoDesk — verificação de migrations (produção) ===\n");
console.log("Projeto:", projectRef, "\n");

let faltando = 0;

for (const { nome, sql } of checks) {
  try {
    const result = await query(sql);
    const regclass = Array.isArray(result) ? result[0]?.ok : null;
    const ok = regclass != null && String(regclass).length > 0;
    if (ok) {
      console.log(`✓ ${nome}`);
    } else {
      console.log(`✗ ${nome} — tabela não encontrada`);
      faltando += 1;
    }
  } catch (e) {
    console.log(`? ${nome} — não foi possível verificar:`, e.message);
    faltando += 1;
  }
}

console.log("\nMigrations locais (aplicar se faltar algo):");
console.log("  npm run db:apply-documentos   # 010–013");
console.log("  npm run db:apply-anamnese     # 011–014");
console.log("  npm run db:apply-modelos      # 015");
console.log("  npm run db:fix-sessoes-delete # 016");

process.exit(faltando > 0 ? 1 : 0);

/**
 * Verifica tabelas-chave das migrations recentes no Supabase de produção.
 *
 * Com SUPABASE_ACCESS_TOKEN: consulta via Management API (completo).
 * Sem token: usa REST + anon key do .env.local (tabelas expostas ao PostgREST).
 *
 * Uso: node --env-file=.env.local scripts/check-supabase-migrations.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url) {
  console.error("Requer NEXT_PUBLIC_SUPABASE_URL no .env.local");
  process.exit(1);
}

const projectRef = url.replace(/^https:\/\//, "").split(".")[0];

const checks = [
  { nome: "paciente_documentos", sql: "SELECT to_regclass('public.paciente_documentos') AS ok" },
  { nome: "paciente_anamnese", sql: "SELECT to_regclass('public.paciente_anamnese') AS ok" },
  {
    nome: "paciente_plano_terapeutico",
    sql: "SELECT to_regclass('public.paciente_plano_terapeutico') AS ok",
    restSelect: "id",
  },
  {
    nome: "plano_terapeutico_pdf (020)",
    sql: `
      SELECT count(*)::int AS ok
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'paciente_plano_terapeutico'
        AND column_name = 'pdf_storage_path'
    `,
    restSelect: "pdf_storage_path",
  },
  {
    nome: "documento_modelos",
    sql: "SELECT to_regclass('public.documento_modelos') AS ok",
  },
];

async function queryManagement(sql) {
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

async function queryRest(select) {
  const res = await fetch(`${url}/rest/v1/paciente_plano_terapeutico?select=${select}&limit=0`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  const body = await res.text();
  if (res.status === 404 || /relation .* does not exist/i.test(body)) {
    return false;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${body.slice(0, 200)}`);
  }
  return true;
}

console.log("=== PsicoDesk — verificação de migrations (produção) ===\n");
console.log("Projeto:", projectRef);
console.log(
  "Modo:",
  token ? "Management API" : anonKey ? "REST (anon key)" : "indisponível",
  "\n"
);

if (!token && !anonKey) {
  console.error(
    "Requer SUPABASE_ACCESS_TOKEN ou NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local"
  );
  process.exit(1);
}

let faltando = 0;

for (const check of checks) {
  const { nome, sql, restSelect } = check;
  try {
    let ok = false;

    if (token) {
      const result = await queryManagement(sql);
      const row = Array.isArray(result) ? result[0] : null;
      if (restSelect) {
        ok = Number(row?.ok) > 0 || (row?.ok != null && String(row.ok).length > 0);
      } else {
        ok = row?.ok != null && String(row.ok).length > 0;
      }
    } else if (restSelect) {
      ok = await queryRest(restSelect);
    } else {
      console.log(`? ${nome} — requer SUPABASE_ACCESS_TOKEN para verificar`);
      continue;
    }

    if (ok) {
      console.log(`✓ ${nome}`);
    } else {
      console.log(`✗ ${nome} — não encontrado`);
      faltando += 1;
    }
  } catch (e) {
    console.log(`? ${nome} — não foi possível verificar:`, e.message);
    faltando += 1;
  }
}

console.log("\nMigrations locais (aplicar se faltar algo):");
console.log("  npm run db:apply-documentos        # 010–013");
console.log("  npm run db:apply-anamnese          # 011–014");
console.log("  npm run db:apply-plano-terapeutico # 019–020");
console.log("  npm run db:apply-modelos           # 015");
console.log("  npm run db:fix-sessoes-delete      # 016");

process.exit(faltando > 0 ? 1 : 0);

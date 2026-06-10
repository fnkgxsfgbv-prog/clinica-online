/**
 * Verifica colunas usadas pelo app na tabela `pacientes` (produção).
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_ACCESS_TOKEN no .env.local
 *
 * Uso: node --env-file=.env.local scripts/check-supabase-columns.mjs
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

/** Colunas referenciadas pelo app (insert/select). Ausência não quebra se houver fallback. */
const COLUNAS_PACIENTES = [
  "id",
  "user_id",
  "nome",
  "status",
  "telefone",
  "data_nascimento",
  "cid",
  "observacoes",
  "valor_sessao",
  "data_inicio_atendimento",
  "convenio",
  "responsavel",
  "diagnostico",
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
  return JSON.parse(body);
}

async function colunasDaTabela(tabela) {
  const rows = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tabela}'
    ORDER BY ordinal_position
  `);
  return new Set((rows || []).map((r) => r.column_name));
}

console.log("=== PsicoDesk — colunas Supabase (produção) ===\n");
console.log("Projeto:", projectRef, "\n");

try {
  const existentes = await colunasDaTabela("pacientes");
  const faltando = COLUNAS_PACIENTES.filter((c) => !existentes.has(c));
  const extras = [...existentes].filter((c) => !COLUNAS_PACIENTES.includes(c));

  console.log("Tabela pacientes — colunas no banco:", [...existentes].join(", "));
  console.log("");

  if (faltando.length === 0) {
    console.log("✓ Todas as colunas esperadas pelo app existem.");
  } else {
    console.log("Colunas esperadas pelo app mas ausentes (fallback ativo no código):");
    for (const col of faltando) {
      console.log(`  - ${col}`);
    }
  }

  if (extras.length > 0) {
    console.log("\nColunas extras no banco (ignoradas pelo app):");
    for (const col of extras) {
      console.log(`  + ${col}`);
    }
  }

  if (existentes.has("valor")) {
    console.log(
      "\n⚠ Coluna legada `valor` detectada — o app usa `valor_sessao`; não envie `valor` em inserts."
    );
  }

  process.exit(faltando.length > 0 ? 0 : 0);
} catch (e) {
  console.error("Falha na verificação:", e.message);
  process.exit(1);
}

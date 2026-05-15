/**
 * Aplica 003 + 002 no Supabase (coluna sessao_id + backfill frequência).
 *
 * Adicione SUPABASE_ACCESS_TOKEN em .env.local e rode:
 *   node --env-file=.env.local scripts/run-backfill-frequencia.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!url || !token) {
  console.error(
    "Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_ACCESS_TOKEN no .env.local"
  );
  process.exit(1);
}

const projectRef = url.replace(/^https:\/\//, "").split(".")[0];

const files = [
  "003_add_sessao_id_frequencia.sql",
  "004_fix_frequencia_vinculos.sql",
  "002_backfill_frequencia.sql",
];

function stripComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

async function runQuery(query, label) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const body = await res.text();
  if (!res.ok) {
    console.error(`Falha em ${label}:`, res.status, body);
    process.exit(1);
  }
  console.log(`OK: ${label}`);
  if (body) console.log(body);
}

for (const file of files) {
  const sql = stripComments(
    readFileSync(join(__dirname, "../supabase/migrations", file), "utf8")
  );
  await runQuery(sql, file);
}

const verify = `
select
  (select count(*) from public.sessoes where lower(trim(status)) = 'presente') as sessoes_presente,
  (select count(*) from public."frequência" where lower(trim(status)) = 'presente') as freq_presente,
  (select count(*) from public."frequência" where sessao_id is not null) as freq_com_sessao;
`;

await runQuery(verify.trim(), "verificação");

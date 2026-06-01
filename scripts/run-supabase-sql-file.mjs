/**
 * Executa um ficheiro .sql no projeto remoto (Management API).
 * Requer: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_ACCESS_TOKEN no .env.local
 *
 * Uso:
 *   node --env-file=.env.local scripts/run-supabase-sql-file.mjs supabase/migrations/008_evolucoes_rls_via_paciente.sql
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const rel = process.argv[2];

if (!rel) {
  console.error("Uso: node .../run-supabase-sql-file.mjs <caminho-relativo-ao-repo>.sql");
  process.exit(1);
}

if (!url || !token) {
  console.error(
    "Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_ACCESS_TOKEN no .env.local"
  );
  process.exit(1);
}

const sqlPath = resolve(join(__dirname, ".."), rel);
const sqlRaw = readFileSync(sqlPath, "utf8");
const query = sqlRaw
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .trim();

const projectRef = url.replace(/^https:\/\//, "").split(".")[0];

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
  console.error("Falha:", res.status, body);
  process.exit(1);
}

console.log("OK:", rel);
console.log(body || "(sem resposta)");

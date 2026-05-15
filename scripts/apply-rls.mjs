/**
 * Aplica RLS no Supabase via Management API.
 *
 * 1. Crie um token em https://supabase.com/dashboard/account/tokens
 * 2. Adicione ao .env.local: SUPABASE_ACCESS_TOKEN=sbp_...
 * 3. Rode: node --env-file=.env.local scripts/apply-rls.mjs
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
const sql = readFileSync(
  join(__dirname, "../supabase/migrations/001_enable_rls.sql"),
  "utf8"
);

// Remove comentários para a API
const query = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .trim();

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
  console.error("Falha ao aplicar RLS:", res.status, body);
  process.exit(1);
}

console.log("RLS aplicado com sucesso no projeto", projectRef);
console.log(body || "(sem resposta)");

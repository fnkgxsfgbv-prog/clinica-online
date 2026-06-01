/**
 * Configuração “site profissional”: sync Auth Supabase + deploy + lembretes.
 *
 * .env.local recomendado:
 *   SUPABASE_ACCESS_TOKEN=sbp_...
 *   NEXT_PUBLIC_SITE_URL=https://clinica-online-ten.vercel.app
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const envFile = resolve(root, ".env.local");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnvLocal();

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://clinica-online-ten.vercel.app";

console.log("=== PsicoDesk — produção comercial ===\n");
console.log("URL:", siteUrl);

if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.log("\n→ Sync Supabase Auth (redirect URLs)…");
  const sync = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/sync-supabase-production-url.mjs"),
      siteUrl,
    ],
    { cwd: root, env: process.env, stdio: "inherit" }
  );
  if (sync.status !== 0) process.exit(sync.status ?? 1);
} else {
  console.log(
    "\n⚠ Sem SUPABASE_ACCESS_TOKEN — pulei sync Auth.\n" +
      "  Crie em https://supabase.com/dashboard/account/tokens\n" +
      `  Depois: npm run production:sync-supabase-auth -- ${siteUrl}\n`
  );
}

console.log("\n→ Deploy Vercel (produção)…");
const deploy = spawnSync("npm", ["run", "site:deploy"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (deploy.status !== 0) process.exit(deploy.status ?? 1);

console.log(
  "\n✓ Próximos passos manuais:\n" +
    "  1. Vercel → Domains → adicionar domínio próprio (ex.: app.seudominio.com.br)\n" +
    "  2. Supabase → Auth → URL Configuration → confirmar Site URL e redirects\n" +
    "  3. Mac: npm run psicodesk:producao (se ainda não fez)\n" +
    "  4. Testar: login, esqueci senha, /privacidade\n"
);

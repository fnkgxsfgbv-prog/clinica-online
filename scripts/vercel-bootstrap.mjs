/**
 * Liga o diretório a um projeto Vercel, envia NEXT_PUBLIC_* para Production/Preview,
 * faz deploy de produção a partir do código local (não depende do GitHub na UI da Vercel)
 * e, se existir SUPABASE_ACCESS_TOKEN, atualiza redirect URLs no Supabase Auth.
 *
 * Requisitos em .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Autenticação Vercel (uma das opções):
 *   VERCEL_TOKEN no .env.local — https://vercel.com/account/tokens
 *   ou `vercel login` na máquina (a CLI usa credenciais guardadas; não passe -t).
 *
 * Opcional:
 *   VERCEL_TEAM               — slug ou id da equipa Vercel (flag -S)
 *   VERCEL_PROJECT_NAME       — nome do projeto (default: clinica-online)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const envFile = resolve(root, ".env.local");
  if (!existsSync(envFile)) {
    console.error(
      "Falta .env.local. Copie de .env.example e preencha as chaves Supabase (e opcionalmente VERCEL_TOKEN)."
    );
    process.exit(1);
  }
  const raw = readFileSync(envFile, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!k) continue;
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

function npxVercel(args, opts = {}) {
  const { input } = opts;
  let stdio = opts.stdio;
  if (!stdio) {
    stdio = input != null ? ["pipe", "inherit", "inherit"] : "inherit";
  }
  /** @type {import("node:child_process").SpawnSyncOptions} */
  const options = {
    cwd: root,
    env: {
      ...process.env,
      VERCEL_NO_UPDATE_NOTIFY: "1",
    },
    stdio,
  };
  if (Array.isArray(stdio) && stdio[1] === "pipe") {
    options.encoding = "utf8";
  }
  if (input != null) options.input = input;
  const r = spawnSync("npx", ["--yes", "vercel@48.8.0", ...args], options);
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
  return r;
}

function extractDeployUrl(stdout) {
  if (!stdout || typeof stdout !== "string") return null;
  const lines = stdout.split("\n");
  for (const line of lines) {
    if (/^\s*Production:\s*/i.test(line)) {
      const m = line.match(/https:\/\/\S+/);
      if (m) return m[0].replace(/[)\],.]+$/, "");
    }
  }
  for (const line of lines) {
    const m = line.match(/(https:\/\/[a-z0-9-]+\.vercel\.app)\b/i);
    if (m) return m[1];
  }
  return null;
}

loadEnvLocal();

const token = process.env.VERCEL_TOKEN?.trim();
const team = process.env.VERCEL_TEAM?.trim();
const project =
  process.env.VERCEL_PROJECT_NAME?.trim() || "clinica-online";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!token) {
  console.warn(
    "Sem VERCEL_TOKEN: a CLI vai usar o login global (`vercel login`). Se falhar, crie um token em https://vercel.com/account/tokens e defina VERCEL_TOKEN no .env.local.\n"
  );
}
if (!url || !anon) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local."
  );
  process.exit(1);
}

function globalFlags() {
  const f = [];
  if (token) f.push("-t", token);
  if (team) f.push("-S", team);
  return f;
}

console.log("→ vercel link (projeto:", project + ")");
npxVercel([
  ...globalFlags(),
  "link",
  "--yes",
  "--project",
  project,
]);

const targets = ["production", "preview"];
const pairs = [
  ["NEXT_PUBLIC_SUPABASE_URL", url],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anon],
];

for (const target of targets) {
  for (const [name, value] of pairs) {
    console.log("→ vercel env add", name, target);
    npxVercel(
      [...globalFlags(), "env", "add", name, target, "--force"],
      { input: `${value}\n` }
    );
  }
}

console.log("→ vercel deploy --prod");
const deploy = npxVercel(
  [...globalFlags(), "deploy", "--prod", "--yes"],
  { stdio: ["inherit", "pipe", "inherit"] }
);

const deployUrl = extractDeployUrl(deploy.stdout);
if (deployUrl) {
  console.log("\nProdução:", deployUrl);
} else {
  console.warn(
    "\nNão consegui ler o URL no output da CLI; veja o link “Production” acima ou o dashboard Vercel."
  );
}

if (deployUrl && process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.log("\n→ production:sync-supabase-auth");
  const sync = spawnSync(
    process.execPath,
    [resolve(root, "scripts/sync-supabase-production-url.mjs"), deployUrl],
    { cwd: root, env: process.env, stdio: "inherit" }
  );
  if (sync.status !== 0) {
    console.error(
      "\nO deploy concluiu mas o sync Supabase falhou. Corrija e rode:\n" +
        `  npm run production:sync-supabase-auth -- ${deployUrl}\n`
    );
    process.exit(sync.status ?? 1);
  }
} else if (deployUrl) {
  console.log(
    "\n(Sem SUPABASE_ACCESS_TOKEN no .env.local — pulei o sync Auth. Quando tiver token, rode:)\n" +
      `  npm run production:sync-supabase-auth -- ${deployUrl}\n`
  );
}

/**
 * Carrega .env.local (sem dependências) e roda push-with-github-token.sh.
 * Assim você coloca GITHUB_TOKEN uma vez no .env.local e roda: npm run push:github
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!/^[_A-Za-z][_A-Za-z0-9]*$/.test(k)) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvLocal();

if (!process.env.GITHUB_TOKEN) {
  console.error(
    "Adicione ao .env.local (não commite):\n  GITHUB_TOKEN=ghp_...\n" +
      "Token: https://github.com/settings/tokens (classic, escopo repo)\n" +
      "Ou rode: GITHUB_TOKEN=ghp_... npm run push:github"
  );
  process.exit(1);
}

const r = spawnSync("bash", [path.join(__dirname, "push-with-github-token.sh")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(r.status === null ? 1 : r.status);

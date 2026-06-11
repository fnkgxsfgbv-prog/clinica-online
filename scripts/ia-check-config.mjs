/**
 * Verificação leve de IA para CI (sem chamada paga à API).
 * Uso: node scripts/ia-check-config.mjs
 */

import { spawnSync } from "node:child_process";

const alvo = ["app/lib/openai-config.test.ts", "app/lib/ia-client.test.ts"];

const r = spawnSync("npm", ["test", "--", ...alvo], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (r.status !== 0) {
  process.exit(r.status ?? 1);
}

console.log("Configuração de IA: testes de módulo OK.");

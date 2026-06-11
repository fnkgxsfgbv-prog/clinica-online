/**
 * Verifica se a IA clínica está configurada e responde.
 * Uso: node --env-file=.env.local scripts/ia-check.mjs
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function runNode(scriptBody) {
  const r = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", scriptBody],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    }
  );
  return {
    ok: r.status === 0,
    stdout: r.stdout?.trim() || "",
    stderr: r.stderr?.trim() || "",
    status: r.status ?? 1,
  };
}

console.log("=== PsicoDesk — verificação de IA ===\n");

const config = runNode(`
import { iaNaNuvemDisponivel, resolverConfigOpenAi } from "./app/lib/openai-config.ts";
const cfg = resolverConfigOpenAi();
console.log(JSON.stringify({
  disponivel: iaNaNuvemDisponivel(),
  baseUrl: cfg.baseUrl,
  model: cfg.model,
  usarGateway: cfg.usarGateway,
  temCredencial: Boolean(cfg.apiKey),
}));
`);

if (!config.ok) {
  console.error("Falha ao ler configuração:", config.stderr || config.stdout);
  process.exit(1);
}

const info = JSON.parse(config.stdout);
console.log("Credencial:", info.temCredencial ? "sim" : "não");
console.log("Gateway:", info.usarGateway ? "sim" : "não");
console.log("Base URL:", info.baseUrl);
console.log("Modelo:", info.model);
console.log("");

if (!info.disponivel) {
  console.log("IA indisponível neste ambiente.");
  console.log("");
  console.log("Produção na Vercel: OIDC automático (AI Gateway).");
  console.log("Local: defina OPENAI_API_KEY ou AI_GATEWAY_API_KEY no .env.local");
  console.log("       ou rode: vercel env pull");
  process.exit(1);
}

console.log("Testando chamada mínima à IA…");

const probe = runNode(`
import { chamarModeloClinico } from "./app/lib/ia-client.ts";
const resposta = await chamarModeloClinico({
  temperature: 0,
  responseFormat: "json_object",
  messages: [
    { role: "system", content: "Responda JSON: {\\"ok\\":true}" },
    { role: "user", content: "ping" },
  ],
});
console.log(resposta.slice(0, 120));
`);

if (!probe.ok) {
  console.error("Falha na chamada:", probe.stderr || probe.stdout);
  process.exit(1);
}

console.log("Resposta:", probe.stdout);
console.log("\n✓ IA operacional.");

/**
 * Define secret de Actions no GitHub (ex.: VERCEL_TOKEN).
 * Uso: GITHUB_TOKEN=ghp_... VERCEL_TOKEN=vcp_... node scripts/set-github-secret.mjs
 */

import { spawnSync } from "node:child_process";
import pkg from "tweetsodium";

const { seal: sealSecret } = pkg;

const repo = "fnkgxsfgbv-prog/clinica-online";
const secretName = process.env.SECRET_NAME?.trim() || "VERCEL_TOKEN";
const secretValue = process.env.VERCEL_TOKEN?.trim() || process.env.SECRET_VALUE?.trim();
const githubToken = process.env.GITHUB_TOKEN?.trim();

if (!githubToken) {
  console.error("Defina GITHUB_TOKEN");
  process.exit(1);
}
if (!secretValue) {
  console.error("Defina VERCEL_TOKEN (ou SECRET_VALUE)");
  process.exit(1);
}

function ghApi(path, { method = "GET", body } = {}) {
  const r = spawnSync(
    "curl",
    [
      "-sS",
      "-w",
      "\n%{http_code}",
      "-X",
      method,
      "-H",
      `Authorization: Bearer ${githubToken}`,
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "X-GitHub-Api-Version: 2022-11-28",
      ...(body
        ? ["-H", "Content-Type: application/json", "-d", JSON.stringify(body)]
        : []),
      `https://api.github.com${path}`,
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  const lines = r.stdout.trim().split("\n");
  const code = lines.pop();
  const text = lines.join("\n");
  const parsed = text ? JSON.parse(text) : null;
  if (Number(code) >= 400) {
    console.error(`GitHub API ${method} ${path} → ${code}`, parsed?.message || text);
    process.exit(1);
  }
  return { code, body: parsed };
}

const { body: publicKey } = ghApi(
  `/repos/${repo}/actions/secrets/public-key`
);

const encryptedBytes = sealSecret(
  Buffer.from(secretValue, "utf8"),
  Buffer.from(publicKey.key, "base64")
);

ghApi(`/repos/${repo}/actions/secrets/${secretName}`, {
  method: "PUT",
  body: {
    encrypted_value: Buffer.from(encryptedBytes).toString("base64"),
    key_id: publicKey.key_id,
  },
});

console.log(`Secret ${secretName} configurado em ${repo}.`);

/**
 * Define secret de Actions no GitHub (ex.: VERCEL_TOKEN).
 * Uso: GITHUB_TOKEN=ghp_... VERCEL_TOKEN=vcp_... node scripts/set-github-secret.mjs
 */

import { spawnSync } from "node:child_process";
import { createPublicKey, publicEncrypt } from "node:crypto";

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
  return JSON.parse(r.stdout);
}

const { key_id: keyId, key: publicKeyB64 } = ghApi(
  `/repos/${repo}/actions/secrets/public-key`
);

const publicKey = createPublicKey({
  key: Buffer.from(publicKeyB64, "base64"),
  format: "der",
  type: "spki",
});

const encrypted = publicEncrypt(
  { key: publicKey, padding: 4 /* RSA_PKCS1_OAEP_PADDING */ },
  Buffer.from(secretValue, "utf8")
);

ghApi(`/repos/${repo}/actions/secrets/${secretName}`, {
  method: "PUT",
  body: {
    encrypted_value: encrypted.toString("base64"),
    key_id: keyId,
  },
});

console.log(`Secret ${secretName} configurado em ${repo}.`);

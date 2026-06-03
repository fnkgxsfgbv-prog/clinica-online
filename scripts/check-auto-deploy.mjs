/**
 * Verifica se o deploy automático (GitHub Actions → Vercel) está configurado.
 * Uso: node scripts/check-auto-deploy.mjs
 */

const REPO = "fnkgxsfgbv-prog/clinica-online";
const WORKFLOW = "vercel-production.yml";

console.log("Deploy automático: push na main → GitHub Actions → Vercel produção\n");
console.log("Repositório:", REPO);
console.log("Workflow:", `.github/workflows/${WORKFLOW}`);
console.log("");
console.log("Configuração única no GitHub:");
console.log("  1. https://github.com/" + REPO + "/settings/secrets/actions");
console.log("  2. New repository secret → nome: VERCEL_TOKEN");
console.log("  3. Valor: token em https://vercel.com/account/settings/tokens");
console.log("     (escopo: joaopcvoliveira-7251's projects ou Full Account)");
console.log("");
console.log("Para enviar código (PAT com escopos repo + workflow):");
console.log("  GITHUB_TOKEN=ghp_... npm run push:github");
console.log("");
console.log("Depois disso, cada push na main publica sozinho — não precisa npm run site:deploy.");

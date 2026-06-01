/**
 * Atualiza Site URL e Redirect URLs (uri_allow_list) do Auth no projeto Supabase.
 *
 * Precisa de token com permissões auth_config_write (token de conta Supabase).
 * Crie em: https://supabase.com/dashboard/account/tokens
 *
 * Uso:
 *   PRODUCTION_URL=https://seu-app.vercel.app \
 *     node --env-file=.env.local scripts/sync-supabase-production-url.mjs
 *
 * Ou:
 *   node --env-file=.env.local scripts/sync-supabase-production-url.mjs https://seu-app.vercel.app
 */

const token = process.env.SUPABASE_ACCESS_TOKEN;
const productionUrlRaw =
  process.argv[2]?.trim() || process.env.PRODUCTION_URL?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  (supabaseUrl
    ? supabaseUrl.replace(/^https:\/\//, "").split(".")[0]
    : null);

if (!token || !productionUrlRaw) {
  console.error(
    "Defina SUPABASE_ACCESS_TOKEN e passe a URL de produção:\n" +
      "  node --env-file=.env.local scripts/sync-supabase-production-url.mjs https://seu-app.vercel.app\n" +
      "ou use PRODUCTION_URL=https://..."
  );
  process.exit(1);
}

if (!projectRef) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_PROJECT_REF no .env.local."
  );
  process.exit(1);
}

const productionUrl = productionUrlRaw.replace(/\/$/, "");
const base = "https://api.supabase.com/v1";
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

function parseAllowList(raw) {
  if (!raw || typeof raw !== "string") return new Set();
  return new Set(
    raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

const getRes = await fetch(
  `${base}/projects/${projectRef}/config/auth`,
  { headers: { Authorization: headers.Authorization } }
);

if (!getRes.ok) {
  console.error(
    "Falha ao ler config de auth:",
    getRes.status,
    await getRes.text()
  );
  process.exit(1);
}

const current = await getRes.json();
const allow = parseAllowList(current.uri_allow_list);

allow.add(productionUrl);
allow.add(`${productionUrl}/**`);
allow.add(`${productionUrl}/login`);
allow.add(`${productionUrl}/login/**`);
allow.add(`${productionUrl}/login/redefinir-senha`);
allow.add(`${productionUrl}/login/esqueci-senha`);

// desenvolvimento local comum (mantém)
allow.add("http://localhost:3000");
allow.add("http://localhost:3000/**");

const patchBody = {
  site_url: productionUrl,
  uri_allow_list: [...allow].join("\n"),
};

const patchRes = await fetch(`${base}/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers,
  body: JSON.stringify(patchBody),
});

if (!patchRes.ok) {
  console.error(
    "Falha ao atualizar auth:",
    patchRes.status,
    await patchRes.text()
  );
  process.exit(1);
}

console.log("Supabase Auth atualizado:");
console.log("  site_url:", productionUrl);
console.log(
  "  uri_allow_list (primeiros 500 chars):",
  patchBody.uri_allow_list.slice(0, 500) +
    (patchBody.uri_allow_list.length > 500 ? "..." : "")
);

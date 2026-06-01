/**
 * Corrige evolucoes.user_id a partir de pacientes.user_id (RLS exige auth.uid() = user_id).
 *
 * Ordem de execução:
 * 1) Se existir SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL → atualiza via API (recomendado).
 * 2) Senão, se existir SUPABASE_ACCESS_TOKEN → roda o SQL via API de gerenciamento.
 * 3) Senão → imprime o SQL para colar no Dashboard → SQL.
 *
 * Uso:
 *   npm run db:backfill-evolucoes-user-id
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;

const sqlPath = join(
  __dirname,
  "../supabase/migrations/007_backfill_evolucoes_user_id.sql"
);

function stripComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

async function runQueryManagement(projectRef, query, label) {
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
    console.error(`Falha em ${label}:`, res.status, body);
    process.exit(1);
  }
  console.log(`OK: ${label}`);
  if (body) console.log(body);
}

async function backfillViaServiceRole() {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: evos, error: e0 } = await admin
    .from("evolucoes")
    .select("id, paciente_id, user_id");

  if (e0) {
    console.error("Erro ao listar evolucoes:", e0.message);
    process.exit(1);
  }

  const cachePaciente = new Map();

  async function userIdDoPaciente(pid) {
    if (cachePaciente.has(pid)) return cachePaciente.get(pid);
    const { data: pac, error: pe } = await admin
      .from("pacientes")
      .select("user_id")
      .eq("id", pid)
      .maybeSingle();
    if (pe) {
      console.error("Erro paciente", pid, pe.message);
      cachePaciente.set(pid, undefined);
      return undefined;
    }
    const uid = pac?.user_id ?? undefined;
    cachePaciente.set(pid, uid);
    return uid;
  }

  let atualizadas = 0;
  for (const row of evos || []) {
    const pid = row.paciente_id;
    if (pid == null || pid === "") continue;

    const dono = await userIdDoPaciente(pid);
    if (!dono) continue;
    if (row.user_id === dono) continue;

    const { error: ue } = await admin
      .from("evolucoes")
      .update({ user_id: dono })
      .eq("id", row.id);

    if (ue) console.error("Erro update evolucao", row.id, ue.message);
    else atualizadas += 1;
  }

  console.log(`Concluído (service role). Linhas atualizadas: ${atualizadas}.`);

  const { count, error: cErr } = await admin
    .from("evolucoes")
    .select("id", { count: "exact", head: true })
    .is("user_id", null);

  if (!cErr) {
    console.log(`Evoluções ainda sem user_id: ${count ?? "?"}`);
  }
}

const sqlRaw = readFileSync(sqlPath, "utf8");

if (url && serviceKey) {
  console.log("Usando SUPABASE_SERVICE_ROLE_KEY…");
  await backfillViaServiceRole();
  process.exit(0);
}

if (url && token) {
  console.log("Usando SUPABASE_ACCESS_TOKEN (API de gerenciamento)…");
  const projectRef = url.replace(/^https:\/\//, "").split(".")[0];
  const sql = stripComments(sqlRaw);
  await runQueryManagement(projectRef, sql, "007_backfill_evolucoes_user_id");
  await runQueryManagement(
    projectRef,
    `select count(*) filter (where user_id is null) as evolucoes_sem_user_id, count(*) as total from public.evolucoes;`.trim(),
    "verificação"
  );
  process.exit(0);
}

console.error(
  "Configure no .env.local pelo menos:\n" +
    "  NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role),\n" +
    "ou\n" +
    "  NEXT_PUBLIC_SUPABASE_URL e SUPABASE_ACCESS_TOKEN (Account → Access Tokens).\n"
);
console.error("Ou execute manualmente no SQL Editor do Supabase:\n");
console.log("---");
console.log(sqlRaw);
console.log("---");
process.exit(1);

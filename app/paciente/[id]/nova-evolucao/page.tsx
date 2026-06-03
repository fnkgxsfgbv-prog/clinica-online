"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth";
import { listEvolucoesPorPacientePorId } from "../../../lib/db/evolucoes";
import { listSessoesPorPaciente } from "../../../lib/db/sessoes";
import {
  resolverSessaoParaEvolucao,
  urlEvolucaoSessao,
} from "../../../lib/evolucao-sessao";
import { requireUserClient } from "../../../lib/require-user-client";

export default function NovaEvolucaoRedirect() {
  const router = useRouter();
  const params = useParams();

  const pacienteId = useMemo(() => {
    const raw = params.id;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) return raw[0] ?? "";
    return "";
  }, [params.id]);

  useEffect(() => {
    async function redirecionar() {
      if (!pacienteId) {
        router.replace("/pacientes");
        return;
      }

      const user = await requireUserClient(router, getCurrentUser);
      if (!user) return;

      const [sessoesRes, evolucoesRes] = await Promise.all([
        listSessoesPorPaciente(user.id, pacienteId),
        listEvolucoesPorPacientePorId(user.id, pacienteId),
      ]);

      const sessaoId = resolverSessaoParaEvolucao(
        sessoesRes.data || [],
        evolucoesRes.data || []
      );

      if (sessaoId) {
        router.replace(urlEvolucaoSessao(sessaoId));
        return;
      }

      router.replace(
        `/paciente/${pacienteId}?aba=sessoes&evolucao=sem-sessao`
      );
    }

    void redirecionar();
  }, [pacienteId, router]);

  return (
    <div className="clinic-page">
      <p className="empty-text">Abrindo evolução na sessão…</p>
    </div>
  );
}

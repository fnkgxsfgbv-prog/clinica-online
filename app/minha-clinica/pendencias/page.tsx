"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import FlashMessage from "../../components/FlashMessage";
import PendenciasCadastroEditor from "../../components/PendenciasCadastroEditor";
import PendenciasIntegracaoLista from "../../components/PendenciasIntegracaoLista";
import PendenciasRotinaLista from "../../components/PendenciasRotinaLista";
import { getCurrentUser } from "../../lib/auth";
import {
  isPendenciaCadastro,
  isPendenciaTipoId,
  listarLinhasPendencia,
  listarPacientesPendencia,
  obterItemChecklist,
  type PendenciaTipoId,
} from "../../lib/checklist-clinica";
import { listFrequenciasResumo } from "../../lib/db/frequencia";
import { listPacientes } from "../../lib/db/pacientes";
import { listSessoes } from "../../lib/db/sessoes";
import { requireUserClient } from "../../lib/require-user-client";
import type { Frequencia, Paciente, Sessao } from "../../types";

export default function PendenciasPage() {
  return (
    <Suspense
      fallback={
        <div className="clinic-page">
          <p className="empty-text">Carregando pendências…</p>
        </div>
      }
    >
      <PendenciasConteudo />
    </Suspense>
  );
}

function PendenciasConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get("tipo") || "";
  const tipo = isPendenciaTipoId(tipoParam) ? tipoParam : null;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pacientesPendentes, setPacientesPendentes] = useState<Paciente[]>([]);
  const [linhasIntegracao, setLinhasIntegracao] = useState<
    ReturnType<typeof listarLinhasPendencia>
  >([]);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");

      if (!tipo) {
        setErro("Tipo de pendência inválido ou não informado.");
        setCarregando(false);
        return;
      }

      const user = await requireUserClient(router, getCurrentUser);
      if (!user) {
        setCarregando(false);
        return;
      }

      const [pacientesRes, sessoesRes, frequenciasRes] = await Promise.all([
        listPacientes(user.id),
        listSessoes(user.id),
        listFrequenciasResumo(user.id),
      ]);

      const loadError =
        pacientesRes.error?.message ||
        sessoesRes.error?.message ||
        frequenciasRes.error?.message;

      if (loadError) {
        setErro("Erro ao carregar pendências: " + loadError);
        setCarregando(false);
        return;
      }

      const pacientes = (pacientesRes.data || []) as Paciente[];
      const sessoes = (sessoesRes.data || []) as Sessao[];
      const frequencias = (frequenciasRes.data || []) as Frequencia[];

      const item = obterItemChecklist(tipo, pacientes, sessoes, frequencias);
      if (!item) {
        setErro("Pendência não encontrada.");
        setCarregando(false);
        return;
      }

      setTitulo(item.titulo);
      setDescricao(item.descricao);

      if (isPendenciaCadastro(tipo)) {
        setPacientesPendentes(listarPacientesPendencia(tipo, pacientes, sessoes));
        setLinhasIntegracao([]);
      } else {
        setPacientesPendentes([]);
        setLinhasIntegracao(
          listarLinhasPendencia(tipo, pacientes, sessoes, frequencias)
        );
      }

      setCarregando(false);
    }

    void carregar();
  }, [router, tipo]);

  return (
    <div className="clinic-page">
      <div className="clinic-layout clinic-layout-single">
        <main className="clinic-content">
          <div className="pendencias-page-header">
            <Link className="pendencias-back-link" href="/minha-clinica?aba=dados">
              ← Voltar para Minha clínica
            </Link>
            <div className="pendencias-page-title">
              <h1>{titulo || "Pendências"}</h1>
              {descricao ? <p>{descricao}</p> : null}
            </div>
          </div>

          {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

          {carregando ? (
            <p className="empty-text">Carregando itens…</p>
          ) : !erro && tipo && isPendenciaCadastro(tipo) ? (
            <PendenciasCadastroEditor
              tipo={tipo}
              pacientesIniciais={pacientesPendentes}
            />
          ) : !erro && tipo === "rotina-sem-sessao-recente" ? (
            <PendenciasRotinaLista linhas={linhasIntegracao} />
          ) : !erro && tipo ? (
            <PendenciasIntegracaoLista linhas={linhasIntegracao} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

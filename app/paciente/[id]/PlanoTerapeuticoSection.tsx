"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import FlashMessage from "../../components/FlashMessage";
import RichTextEditor, { sanitizarHtmlBasico } from "../../components/RichTextEditor";
import { getCurrentUser } from "../../lib/auth";
import {
  getPlanoTerapeuticoPorPaciente,
  salvarPlanoTerapeuticoPaciente,
} from "../../lib/db/plano-terapeutico";
import { planoTerapeuticoTemConteudo } from "../../lib/resumo-texto-clinico";
import { requireUserClient } from "../../lib/require-user-client";
import type { PacientePlanoTerapeutico } from "../../types";

export default function PlanoTerapeuticoSection({
  pacienteId,
}: {
  pacienteId: string | number;
}) {
  const router = useRouter();
  const [conteudo, setConteudo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [inicializado, setInicializado] = useState(false);
  const ultimoSnapshotRef = useRef("");
  const conteudoRef = useRef("");
  const salvandoRef = useRef(false);
  const salvarNovamenteDepoisRef = useRef(false);

  useEffect(() => {
    conteudoRef.current = conteudo;
  }, [conteudo]);

  const carregarPlano = useCallback(async () => {
    setCarregando(true);
    setErro("");
    setSucesso("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data, error } = await getPlanoTerapeuticoPorPaciente(user.id, pacienteId);

    if (error) {
      setErro("Erro ao carregar plano terapêutico: " + error.message);
      setCarregando(false);
      return;
    }

    const registro = (data || null) as PacientePlanoTerapeutico | null;
    const texto = registro?.conteudo || "";
    setConteudo(texto);
    ultimoSnapshotRef.current = texto;
    setUltimaAtualizacao(registro?.updated_at || null);
    setInicializado(true);
    setCarregando(false);
  }, [pacienteId, router]);

  useEffect(() => {
    void carregarPlano();
  }, [carregarPlano]);

  async function salvar(mostrarMensagem = true) {
    if (salvandoRef.current) {
      salvarNovamenteDepoisRef.current = true;
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);
    if (mostrarMensagem) {
      setErro("");
      setSucesso("");
    }

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      salvandoRef.current = false;
      setSalvando(false);
      return;
    }

    const textoAtual = sanitizarHtmlBasico(conteudoRef.current);
    const { data, error } = await salvarPlanoTerapeuticoPaciente({
      userId: user.id,
      pacienteId,
      conteudo: textoAtual,
    });

    if (error) {
      if (mostrarMensagem) {
        setErro("Erro ao salvar plano terapêutico: " + error.message);
      }
    } else {
      ultimoSnapshotRef.current = textoAtual;
      setConteudo(textoAtual);
      const registro = (data || null) as PacientePlanoTerapeutico | null;
      setUltimaAtualizacao(registro?.updated_at || new Date().toISOString());
      if (mostrarMensagem) {
        setSucesso("Plano terapêutico salvo.");
      }
    }

    salvandoRef.current = false;
    setSalvando(false);

    if (salvarNovamenteDepoisRef.current) {
      salvarNovamenteDepoisRef.current = false;
      void salvar(false);
    }
  }

  useEffect(() => {
    if (!inicializado || carregando) return;
    if (conteudo === ultimoSnapshotRef.current) return;

    const timer = window.setTimeout(() => {
      void salvar(false);
    }, 900);

    return () => window.clearTimeout(timer);
    // salvar usa refs para o conteúdo atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, conteudo, inicializado]);

  const rotuloAtualizacao = ultimaAtualizacao
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(ultimaAtualizacao))
    : null;

  if (carregando) {
    return <p className="patient-muted">Carregando plano terapêutico...</p>;
  }

  return (
    <div className="plano-terapeutico-section">
      <div className="plano-terapeutico-header">
        <div>
          <strong>Plano terapêutico do paciente</strong>
          <p className="patient-muted">
            Documento único e vivo do tratamento. Use metas, fases, técnicas e
            o que monitorar — isso orientará o seguimento nas sessões.
          </p>
          {rotuloAtualizacao ? (
            <p className="patient-muted plano-terapeutico-updated">
              Última atualização: {rotuloAtualizacao}
              {salvando ? " · salvando..." : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-green"
          disabled={salvando}
          onClick={() => void salvar(true)}
        >
          {salvando ? "Salvando..." : "Salvar plano"}
        </button>
      </div>

      {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
      {sucesso ? <FlashMessage kind="success">{sucesso}</FlashMessage> : null}

      {!planoTerapeuticoTemConteudo(conteudo) ? (
        <FlashMessage kind="info">
          Plano ainda não cadastrado. Escreva abaixo para habilitar o painel de
          seguimento nas sessões.
        </FlashMessage>
      ) : null}

      <RichTextEditor
        editorLabel="Plano terapêutico"
        placeholder="Ex.: Fase 1 — regulação emocional (4 semanas). Técnicas: respiração diafragmática, registro de pensamentos. Monitorar sono 2x/semana. Meta: reduzir crises de ansiedade em situações sociais..."
        value={conteudo}
        onChange={setConteudo}
      />
    </div>
  );
}

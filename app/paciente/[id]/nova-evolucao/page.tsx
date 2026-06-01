"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FlashMessage from "../../../components/FlashMessage";
import RichTextEditor, {
  pareceHtml,
  sanitizarHtmlBasico,
} from "../../../components/RichTextEditor";
import { getCurrentUser } from "../../../lib/auth";
import {
  insertEvolucao,
  listEvolucoesPorPaciente,
} from "../../../lib/db/evolucoes";
import { getPacienteById } from "../../../lib/db/pacientes";
import Janela from "../../../components/Janela";
import { dataIsoHoje } from "../../../lib/datas-paciente";
import EvolucaoHistoricoCard from "../../../components/EvolucaoHistoricoCard";
import { requireUserClient } from "../../../lib/require-user-client";
import { toFiniteNumberId } from "../../../lib/id";
import { mensagemErroSupabase } from "../../../lib/supabase-error";
import type { Evolucao } from "../../../types";

export default function NovaEvolucao() {
  const router = useRouter();
  const params = useParams();

  const paciente_id = params.id;
  const draftKey = useMemo(
    () => `evolucao-draft:${String(paciente_id ?? "")}`,
    [paciente_id]
  );
  const dirtyRef = useRef(false);
  const salvarDraftTimeout = useRef<number | null>(null);

  const [queixa, setQueixa] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [intervencao, setIntervencao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [plano, setPlano] = useState("");
  const [encaminhamentos, setEncaminhamentos] = useState("");

  const [humor, setHumor] = useState("");
  const [statusSessao, setStatusSessao] =
    useState("Realizada");

  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function lerDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  function gravarDraft(partial: Record<string, unknown>) {
    dirtyRef.current = true;
    if (salvarDraftTimeout.current != null) {
      window.clearTimeout(salvarDraftTimeout.current);
    }
    salvarDraftTimeout.current = window.setTimeout(() => {
      try {
        const base = (lerDraft() || {}) as Record<string, unknown>;
        localStorage.setItem(
          draftKey,
          JSON.stringify({ ...base, ...partial })
        );
      } catch {
        // ignore
      }
    }, 250);
  }

  function limparDraft() {
    dirtyRef.current = false;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const d = lerDraft();
    if (!d) return;
    if (typeof d.queixa === "string") setQueixa(d.queixa);
    if (typeof d.objetivo === "string") setObjetivo(d.objetivo);
    if (typeof d.intervencao === "string") setIntervencao(d.intervencao);
    if (typeof d.observacoes === "string") setObservacoes(d.observacoes);
    if (typeof d.plano === "string") setPlano(d.plano);
    if (typeof d.encaminhamentos === "string") setEncaminhamentos(d.encaminhamentos);
    if (typeof d.humor === "string") setHumor(d.humor);
    if (typeof d.statusSessao === "string") setStatusSessao(d.statusSessao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    function antesDeSair(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", antesDeSair);
    return () => window.removeEventListener("beforeunload", antesDeSair);
  }, []);

  useEffect(() => {
    void carregarEvolucoes();
    // carregarEvolucoes deve buscar o paciente inicial quando a página abre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarEvolucoes() {
    setErro("");
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await getPacienteById(user.id, paciente_id as string);
    if (error) {
      setErro("Paciente não encontrado ou sem permissão.");
      return;
    }

    const { data, error: evolucoesError } = await listEvolucoesPorPaciente(
      user.id,
      paciente_id as string
    );

    if (evolucoesError) {
      setErro(mensagemErroSupabase("carregar evoluções", evolucoesError));
      return;
    }

    setEvolucoes(
      ((data || []) as Evolucao[]).filter(
        (item) => item.status_sessao !== "anotacoes_sessao"
      )
    );
  }

  async function salvarEvolucao() {
    setErro("");
    setSucesso("");
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const pacienteIdNumero = toFiniteNumberId(paciente_id);
    if (pacienteIdNumero == null) {
      setErro("Paciente inválido. Volte e abra este paciente novamente.");
      return;
    }

    const { error } = await insertEvolucao({
      user_id: user.id,
      paciente_id: pacienteIdNumero,
      data: dataIsoHoje(),
      humor,
      status_sessao: statusSessao,
      queixa,
      objetivo,
      intervencao,
      observacoes,
      plano,
      encaminhamentos,
    });

    if (error) {
      setErro(mensagemErroSupabase("salvar evolução", error));
      return;
    }

    setSucesso("Evolução salva com sucesso.");

    setQueixa("");
    setObjetivo("");
    setIntervencao("");
    setObservacoes("");
    setPlano("");
    setEncaminhamentos("");
    setHumor("");
    setStatusSessao("Realizada");
    limparDraft();

    void carregarEvolucoes();
  }

  function Campo({
    titulo,
    valor,
  }: {
    titulo: string;
    valor?: string | null;
  }) {
    if (!valor) return null;

    return (
      <div className="patient-field">
        <p className="patient-field-title">
          {titulo}
        </p>

        {pareceHtml(valor) ? (
          <div
            className="patient-field-text rich-text-output"
            dangerouslySetInnerHTML={{ __html: sanitizarHtmlBasico(valor) }}
          />
        ) : (
          <p className="patient-field-text">
            {valor}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Janela titulo="Nova Evolução">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
        {sucesso ? (
          <FlashMessage kind="success">{sucesso}</FlashMessage>
        ) : null}

        <p className="patient-muted evolution-date-note">
          Evolução registrada automaticamente em{" "}
          {new Date().toLocaleDateString(
            "pt-BR"
          )}
        </p>

        <div className="form-grid">
          <div>
            <label className="label-form">
              Humor do paciente
            </label>

            <select
              value={humor}
              onChange={(e) => {
                const v = e.target.value;
                setHumor(v);
                gravarDraft({ humor: v });
              }}
              className="input"
            >
              <option value="">
                Selecionar
              </option>

              <option>
                Calmo
              </option>

              <option>
                Ansioso
              </option>

              <option>
                Triste
              </option>

              <option>
                Irritado
              </option>

              <option>
                Agitado
              </option>

              <option>
                Feliz
              </option>
            </select>
          </div>

          <div>
            <label className="label-form">
              Status da sessão
            </label>

            <select
              value={statusSessao}
              onChange={(e) => {
                const v = e.target.value;
                setStatusSessao(v);
                gravarDraft({ statusSessao: v });
              }}
              className="input"
            >
              <option>
                Realizada
              </option>

              <option>
                Cancelada
              </option>

              <option>
                Remarcada
              </option>
            </select>
          </div>

          <EvolucaoEditorField
            titulo="Queixa"
            placeholder="Descreva a queixa principal..."
            value={queixa}
            onChange={(v) => {
              setQueixa(v);
              gravarDraft({ queixa: v });
            }}
          />

          <EvolucaoEditorField
            titulo="Objetivo da sessão"
            placeholder="Descreva o objetivo da sessão..."
            value={objetivo}
            onChange={(v) => {
              setObjetivo(v);
              gravarDraft({ objetivo: v });
            }}
          />

          <EvolucaoEditorField
            titulo="Intervenção realizada"
            placeholder="Descreva as intervenções realizadas..."
            value={intervencao}
            onChange={(v) => {
              setIntervencao(v);
              gravarDraft({ intervencao: v });
            }}
          />

          <EvolucaoEditorField
            titulo="Observações"
            placeholder="Registre observações clínicas..."
            value={observacoes}
            onChange={(v) => {
              setObservacoes(v);
              gravarDraft({ observacoes: v });
            }}
          />

          <EvolucaoEditorField
            titulo="Plano terapêutico"
            placeholder="Registre o plano terapêutico..."
            value={plano}
            onChange={(v) => {
              setPlano(v);
              gravarDraft({ plano: v });
            }}
          />

          <EvolucaoEditorField
            titulo="Encaminhamentos"
            placeholder="Registre orientações ou encaminhamentos..."
            value={encaminhamentos}
            onChange={(v) => {
              setEncaminhamentos(v);
              gravarDraft({ encaminhamentos: v });
            }}
          />

          <button
            className="btn btn-green"
            onClick={salvarEvolucao}
          >
            Salvar evolução
          </button>
        </div>
      </Janela>

      <Janela titulo="Evoluções anteriores">
        {evolucoes.length === 0 ? (
          <p className="empty-text">
            Nenhuma evolução registrada.
          </p>
        ) : (
          <div className="session-list">
            {evolucoes.map((e) => (
              <EvolucaoHistoricoCard
                key={e.id}
                evolucao={e}
                rotuloPlano="Plano terapêutico"
              />
            ))}
          </div>
        )}
      </Janela>
    </div>
  );
}

function EvolucaoEditorField({
  titulo,
  value,
  onChange,
  placeholder,
}: {
  titulo: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="psico-card session-evolution-card evolution-rich-editor-card">
      <h3>{titulo}</h3>
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        editorLabel={titulo}
      />
    </div>
  );
}

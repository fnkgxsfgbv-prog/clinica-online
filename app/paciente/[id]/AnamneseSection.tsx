"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FlashMessage from "../../components/FlashMessage";
import FormularioCamposLista from "../../components/FormularioCamposLista";
import FormularioWorkflowSteps from "../../components/FormularioWorkflowSteps";
import { getCurrentUser } from "../../lib/auth";
import { extrairDadosClinicaDeUsuario } from "../../lib/dados-clinica";
import { getAnamnesePorPaciente } from "../../lib/db/anamnese";
import { salvarFormularioPdfDocumentoPaciente } from "../../lib/db/documentos";
import { baixarBlob } from "../../lib/download";
import { nomeArquivoFormulario } from "../../lib/formulario-export";
import { gerarFormularioPdfBlob } from "../../lib/pdf/formulario-paciente";
import {
  deletePacienteFormulario,
  listFormularioModelos,
  listPacienteFormularios,
  normalizarCamposModelo,
  salvarPacienteFormulario,
} from "../../lib/db/modelos";
import {
  criarFormularioModeloPronto,
  FORMULARIO_MODELOS_PRONTOS,
  indiceModeloPronto,
} from "../../lib/modelos/formulario-modelos-prontos";
import { requireUserClient } from "../../lib/require-user-client";
import type {
  AnamneseCampo,
  FormularioModelo,
  PacienteAnamnese,
  PacienteFormulario,
} from "../../types";

const CAMPOS_INICIAIS: AnamneseCampo[] = [
  ["queixa_principal", "Queixa principal", "O que trouxe o paciente para atendimento?"],
  ["motivo_consulta", "Motivo da consulta", "Demanda inicial, encaminhamento, expectativa do paciente..."],
  ["historia_atual", "História atual", "Quando começou, frequência, intensidade, fatores associados..."],
  ["historico_psicologico", "Histórico psicológico", "Atendimentos anteriores, abordagens, alta, interrupções..."],
  ["historico_psiquiatrico", "Histórico psiquiátrico", "Diagnósticos, internações, acompanhamento psiquiátrico..."],
  ["historico_medico", "Histórico médico", "Doenças, cirurgias, condições relevantes..."],
  ["medicamentos", "Medicamentos", "Nome, dose, frequência, prescritor..."],
  ["alergias", "Alergias", "Medicamentos, alimentos ou outras alergias conhecidas..."],
  ["historico_familiar", "Histórico familiar", "Composição familiar, vínculos, histórico de saúde mental..."],
  ["desenvolvimento_infancia", "Desenvolvimento e infância", "Gestação, marcos do desenvolvimento, infância, escola..."],
  ["sono", "Sono", "Qualidade do sono, insônia, pesadelos, rotina de descanso..."],
  ["alimentacao", "Alimentação", "Apetite, restrições, compulsões, alterações recentes..."],
  ["rotina", "Rotina", "Dia a dia, atividades, lazer, autocuidado..."],
  ["trabalho_estudos", "Trabalho / estudos", "Ocupação, desempenho, conflitos, afastamentos..."],
  ["relacionamentos", "Relacionamentos", "Família, parceiro(a), amizades, rede de apoio..."],
  ["uso_substancias", "Uso de substâncias", "Álcool, tabaco, outras substâncias, frequência..."],
  ["risco", "Risco / segurança", "Ideação suicida, automutilação, violência, fatores de proteção..."],
  ["objetivos_terapia", "Objetivos terapêuticos", "Metas combinadas, prioridades iniciais, foco do tratamento..."],
  ["observacoes", "Observações gerais", "Outras informações importantes da entrevista inicial..."],
].map(([id, titulo, placeholder]) => ({
  id,
  titulo,
  placeholder,
  resposta: "",
}));

const CAMPOS_LEGADOS = CAMPOS_INICIAIS.map((campo) => ({
  id: campo.id,
  titulo: campo.titulo,
}));

type FormularioDraft = {
  id?: string | number;
  modelo_id?: string | number | null;
  nome_formulario: string;
  campos: AnamneseCampo[];
  updated_at?: string | null;
};

function criarCamposIniciais() {
  return CAMPOS_INICIAIS.map((campo) => ({ ...campo }));
}

function criarDraftVazio(): FormularioDraft {
  return {
    nome_formulario: "Anamnese do paciente",
    campos: criarCamposIniciais(),
  };
}

function normalizarCamposLegados(data: PacienteAnamnese) {
  if (Array.isArray(data.campos) && data.campos.length > 0) {
    return normalizarCamposModelo(data.campos);
  }

  const bruto = data as unknown as Record<string, string | null | undefined>;
  return CAMPOS_LEGADOS.map((campo) => ({
    id: campo.id,
    titulo: campo.titulo,
    placeholder: "",
    resposta: bruto[campo.id] || "",
  }));
}

function normalizarPacienteFormulario(data: PacienteFormulario): FormularioDraft {
  return {
    id: data.id,
    modelo_id: data.modelo_id,
    nome_formulario: data.nome_formulario || "Formulário",
    campos: normalizarCamposModelo(data.campos),
    updated_at: data.updated_at,
  };
}

export default function AnamneseSection({
  pacienteId,
  pacienteNome,
  pacienteDataNascimento,
  onDocumentosChanged,
  onAbrirDocumentos,
}: {
  pacienteId: string | number;
  pacienteNome?: string;
  pacienteDataNascimento?: string | null;
  onDocumentosChanged?: () => Promise<void>;
  onAbrirDocumentos?: () => void;
}) {
  const router = useRouter();
  const [modelos, setModelos] = useState<FormularioModelo[]>([]);
  const [formularios, setFormularios] = useState<PacienteFormulario[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [formularioAtual, setFormularioAtual] =
    useState<FormularioDraft>(criarDraftVazio);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const ultimaAtualizacao = useMemo(() => {
    if (!formularioAtual.updated_at) return "";
    const data = new Date(formularioAtual.updated_at);
    if (Number.isNaN(data.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(data);
  }, [formularioAtual.updated_at]);

  const carregarFormularios = useCallback(async () => {
    setCarregando(true);
    setErro("");
    setSucesso("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const [modelosRes, formulariosRes, anamneseAntigaRes] = await Promise.all([
      listFormularioModelos(user.id),
      listPacienteFormularios(user.id, pacienteId),
      getAnamnesePorPaciente(user.id, pacienteId),
    ]);

    const erroCarga =
      modelosRes.error?.message ||
      formulariosRes.error?.message ||
      anamneseAntigaRes.error?.message;

    if (erroCarga) {
      setErro("Erro ao carregar formulários: " + erroCarga);
      setCarregando(false);
      return;
    }

    const modelosData = (modelosRes.data || []) as FormularioModelo[];
    const formulariosData = (formulariosRes.data || []) as PacienteFormulario[];
    setModelos(modelosData);
    setFormularios(formulariosData);

    if (formulariosData.length > 0) {
      setFormularioAtual(normalizarPacienteFormulario(formulariosData[0]));
    } else if (anamneseAntigaRes.data) {
      const antigo = anamneseAntigaRes.data as PacienteAnamnese;
      setFormularioAtual({
        nome_formulario: antigo.nome_formulario || "Anamnese do paciente",
        campos: normalizarCamposLegados(antigo),
        updated_at: antigo.updated_at,
      });
    } else {
      setFormularioAtual(criarDraftVazio());
    }

    if (!modeloSelecionado && modelosData[0]) {
      setModeloSelecionado(String(modelosData[0].id));
    }

    setCarregando(false);
  }, [modeloSelecionado, pacienteId, router]);

  useEffect(() => {
    void carregarFormularios();
  }, [carregarFormularios]);

  function aplicarModelo() {
    if (!modeloSelecionado) {
      setErro("Selecione um modelo de formulário primeiro.");
      return;
    }

    if (modeloSelecionado.startsWith("pronto:")) {
      const indice = Number(modeloSelecionado.replace("pronto:", ""));
      const modeloPronto = FORMULARIO_MODELOS_PRONTOS[indice];
      if (!modeloPronto) {
        setErro("Modelo pronto não encontrado.");
        return;
      }

      const instancia = criarFormularioModeloPronto(modeloPronto);
      setErro("");
      setSucesso("");
      setFormularioAtual({
        nome_formulario: instancia.nome,
        campos: instancia.campos,
      });
      return;
    }

    const modelo = modelos.find((item) => String(item.id) === modeloSelecionado);
    if (!modelo) {
      setErro("Crie ou selecione um modelo de formulário primeiro.");
      return;
    }

    setErro("");
    setSucesso("");
    setFormularioAtual({
      modelo_id: modelo.id,
      nome_formulario: modelo.nome,
      campos: normalizarCamposModelo(modelo.campos).map((campo) => ({
        ...campo,
        id: crypto.randomUUID(),
        resposta: "",
      })),
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    setSucesso("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setSalvando(false);
      return;
    }

    const { data, error } = await salvarPacienteFormulario({
      userId: user.id,
      pacienteId,
      formulario: formularioAtual,
    });

    if (error) {
      setErro("Erro ao salvar formulário: " + error.message);
      setSalvando(false);
      return;
    }

    const nomeFormulario = formularioAtual.nome_formulario || "Formulário";
    const clinica = extrairDadosClinicaDeUsuario(user);
    const pdfBlob = gerarFormularioPdfBlob({
      campos: formularioAtual.campos,
      nomeFormulario,
      pacienteNome,
      pacienteDataNascimento,
      clinica,
    });
    const documento = await salvarFormularioPdfDocumentoPaciente({
      userId: user.id,
      pacienteId,
      nomeArquivo: nomeArquivoFormulario(nomeFormulario, "pdf"),
      blob: pdfBlob,
    });

    if (documento.error) {
      setFormularioAtual(
        data ? normalizarPacienteFormulario(data as PacienteFormulario) : formularioAtual
      );
      setErro(
        "Formulário salvo, mas não foi possível salvar nos documentos: " +
          documento.error.message
      );
      setSalvando(false);
      return;
    }

    await carregarFormularios();
    await onDocumentosChanged?.();
    setSucesso(
      "Anamnese salva na pasta do paciente. O arquivo também está na aba Documentos."
    );
    setSalvando(false);
  }

  function carregarModeloPronto(nome: string) {
    const indice = indiceModeloPronto(nome);
    const modeloPronto = FORMULARIO_MODELOS_PRONTOS[indice];
    if (!modeloPronto || indice < 0) return;

    const instancia = criarFormularioModeloPronto(modeloPronto);
    setModeloSelecionado(`pronto:${indice}`);
    setErro("");
    setSucesso("");
    setFormularioAtual({
      nome_formulario: instancia.nome,
      campos: instancia.campos,
    });
  }

  async function excluirFormulario(id?: string | number) {
    if (!id) {
      setFormularioAtual(criarDraftVazio());
      return;
    }

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await deletePacienteFormulario(user.id, id);
    if (error) {
      setErro("Erro ao excluir formulário: " + error.message);
      return;
    }

    setSucesso("Formulário excluído.");
    await carregarFormularios();
  }

  function atualizarCampo(
    id: string,
    chave: "titulo" | "placeholder" | "resposta",
    valor: string
  ) {
    setFormularioAtual((atual) => ({
      ...atual,
      campos: atual.campos.map((campo) =>
        campo.id === id ? { ...campo, [chave]: valor } : campo
      ),
    }));
  }

  function adicionarCampo() {
    setFormularioAtual((atual) => ({
      ...atual,
      campos: [
        ...atual.campos,
        {
          id: crypto.randomUUID(),
          titulo: "Nova pergunta",
          placeholder: "Escreva aqui a orientação para este campo...",
          resposta: "",
        },
      ],
    }));
  }

  function excluirCampo(id: string) {
    setFormularioAtual((atual) => ({
      ...atual,
      campos: atual.campos.filter((campo) => campo.id !== id),
    }));
  }

  async function baixarFormularioAtual() {
    const nomeFormulario = formularioAtual.nome_formulario || "Formulário";
    const user = await getCurrentUser();
    const blob = gerarFormularioPdfBlob({
      campos: formularioAtual.campos,
      nomeFormulario,
      pacienteNome,
      pacienteDataNascimento,
      clinica: extrairDadosClinicaDeUsuario(user),
    });
    baixarBlob(blob, nomeArquivoFormulario(nomeFormulario, "pdf"));
  }

  if (carregando) {
    return <p className="empty-text">Carregando formulários...</p>;
  }

  return (
    <div className="session-list">
      {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
      {sucesso ? <FlashMessage kind="success">{sucesso}</FlashMessage> : null}

      <div className="psico-card">
        <div className="anamnese-header">
          <div>
            <strong>Anamnese — {pacienteNome || "paciente"}</strong>
            <p className="patient-muted" style={{ marginBottom: 0 }}>
              É aqui que você escreve as respostas. Ao salvar, o texto vai para a pasta
              Documentos deste paciente.
              {ultimaAtualizacao ? ` Última atualização: ${ultimaAtualizacao}.` : ""}
            </p>
          </div>

          <div className="anamnese-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => router.push("/modelos")}
            >
              Editar modelos
            </button>
            <button type="button" className="btn btn-outline" onClick={adicionarCampo}>
              + Campo extra
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={baixarFormularioAtual}
            >
              Baixar
            </button>
            <button
              type="button"
              className="btn btn-green"
              disabled={salvando}
              onClick={() => void salvar()}
            >
              {salvando ? "Salvando..." : "Salvar na pasta do paciente"}
            </button>
          </div>
        </div>

        <FormularioWorkflowSteps contexto="paciente" />

        <div className="anamnese-toolbar-principal">
          <select
            value={modeloSelecionado}
            onChange={(event) => setModeloSelecionado(event.target.value)}
          >
            <option value="">Selecionar modelo...</option>
            {FORMULARIO_MODELOS_PRONTOS.length > 0 ? (
              <optgroup label="Modelos prontos">
                {FORMULARIO_MODELOS_PRONTOS.map((modelo, indice) => (
                  <option key={`pronto-${modelo.nome}`} value={`pronto:${indice}`}>
                    {modelo.nome}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {modelos.length > 0 ? (
              <optgroup label="Meus modelos salvos">
                {modelos.map((modelo) => (
                  <option key={modelo.id} value={String(modelo.id)}>
                    {modelo.nome}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <button type="button" className="btn btn-outline" onClick={aplicarModelo}>
            Carregar modelo
          </button>
          <button
            type="button"
            className="btn btn-green"
            onClick={() => carregarModeloPronto("Anamnese TEA — 9 anos")}
          >
            Anamnese TEA — 9 anos
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => carregarModeloPronto("Anamnese TEA — Criança")}
          >
            TEA — Criança
          </button>
        </div>

        {sucesso && onAbrirDocumentos ? (
          <p className="patient-muted" style={{ marginTop: "-6px", marginBottom: "12px" }}>
            <button type="button" className="btn btn-outline" onClick={onAbrirDocumentos}>
              Ver na aba Documentos
            </button>
          </p>
        ) : null}

        {formularios.length > 0 ? (
          <div className="modelos-tabs">
            {formularios.map((formulario) => (
              <button
                key={formulario.id}
                type="button"
                className={
                  formularioAtual.id === formulario.id
                    ? "btn btn-green"
                    : "btn btn-outline"
                }
                onClick={() =>
                  setFormularioAtual(normalizarPacienteFormulario(formulario))
                }
              >
                {formulario.nome_formulario}
              </button>
            ))}
          </div>
        ) : null}

        <div className="anamnese-form-name">
          <label className="label-form">Nome do formulário</label>
          <input
            className="anamnese-title-input"
            value={formularioAtual.nome_formulario}
            onChange={(event) =>
              setFormularioAtual((atual) => ({
                ...atual,
                nome_formulario: event.target.value,
              }))
            }
            placeholder="Ex.: Anamnese infantil, Triagem inicial..."
          />
        </div>

        <FormularioCamposLista
          modo="paciente"
          campos={formularioAtual.campos}
          onAtualizar={atualizarCampo}
          onExcluir={excluirCampo}
        />

        <div className="anamnese-actions" style={{ marginTop: "18px" }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => void excluirFormulario(formularioAtual.id)}
          >
            Excluir formulário
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import CidSearchSelect from "../../../components/CidSearchSelect";
import FlashMessage from "../../../components/FlashMessage";
import Janela from "../../../components/Janela";
import { getCurrentUser } from "../../../lib/auth";
import { getPacienteById, updatePaciente } from "../../../lib/db/pacientes";
import {
  extrairDataInicioAtendimento,
  limparObservacoesPaciente,
} from "../../../lib/paciente-metadata";
import { STATUS_PACIENTE_OPCOES } from "../../../lib/status-paciente";
import { requireUserClient } from "../../../lib/require-user-client";
import { mensagemErroSupabase } from "../../../lib/supabase-error";

export default function EditarPacientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataInicioAtendimento, setDataInicioAtendimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [convenio, setConvenio] = useState("");
  const [cid, setCid] = useState("");
  const [valorSessao, setValorSessao] = useState("");
  const [status, setStatus] = useState("ativo");
  const [pacienteId, setPacienteId] = useState<string | number | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregarPaciente = useCallback(async () => {
    setErro("");
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { data, error } = await getPacienteById(user.id, id);

    if (error) {
      setErro("Erro ao carregar paciente: " + error.message);
      return;
    }

    if (!data) {
      setErro("Paciente não encontrado.");
      return;
    }

    setNome(data.nome || "");
    setDataNascimento(data.data_nascimento || "");
    setDataInicioAtendimento(extrairDataInicioAtendimento(data));
    setTelefone(data.telefone || "");
    setResponsavel(data.responsavel || "");
    setDiagnostico(data.diagnostico || "");
    setObservacoes(limparObservacoesPaciente(data.observacoes));
    setConvenio(data.convenio || "");
    setCid(data.cid || "");
    setValorSessao(String(data.valor_sessao || ""));
    setStatus(data.status || "ativo");
    setPacienteId(data.id);
  }, [id, router]);

  useEffect(() => {
    void carregarPaciente();
  }, [carregarPaciente]);

  async function salvarAlteracoes() {
    setErro("");
    setSucesso("");
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const idSalvar = pacienteId ?? id;
    const { data: atualizado, error } = await updatePaciente(user.id, idSalvar, {
      nome,
      data_nascimento: dataNascimento,
      data_inicio_atendimento: dataInicioAtendimento || null,
      telefone,
      responsavel,
      diagnostico,
      observacoes: limparObservacoesPaciente(observacoes),
      convenio,
      cid,
      valor_sessao: valorSessao,
      status,
    });

    if (error || !atualizado) {
      setErro(
        mensagemErroSupabase(
          "salvar alterações",
          error ?? { message: "Nenhuma alteração foi gravada." }
        )
      );
      return;
    }

    setSucesso("Paciente atualizado com sucesso.");
    setTimeout(() => {
      router.push("/pacientes");
    }, 800);
  }

  return (
    <div>
      <Janela titulo="Editar Paciente">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
        {sucesso ? (
          <FlashMessage kind="success">{sucesso}</FlashMessage>
        ) : null}

        <div className="form-grid patient-edit-form">
          <CampoFormulario label="Nome completo" htmlFor="editar-nome">
            <input
              id="editar-nome"
              className="psico-input"
              placeholder="Nome do paciente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Data de nascimento" htmlFor="editar-nascimento">
            <input
              id="editar-nascimento"
              className="psico-input"
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Data de início do atendimento" htmlFor="editar-inicio-atendimento">
            <input
              id="editar-inicio-atendimento"
              className="psico-input"
              type="date"
              value={dataInicioAtendimento}
              onChange={(e) => setDataInicioAtendimento(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Telefone" htmlFor="editar-telefone">
            <input
              id="editar-telefone"
              className="psico-input"
              placeholder="Telefone do paciente"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Responsável" htmlFor="editar-responsavel">
            <input
              id="editar-responsavel"
              className="psico-input"
              placeholder="Nome do responsável"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Diagnóstico" htmlFor="editar-diagnostico">
            <input
              id="editar-diagnostico"
              className="psico-input"
              placeholder="Diagnóstico principal"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Observações" htmlFor="editar-observacoes">
            <textarea
              id="editar-observacoes"
              className="psico-input"
              placeholder="Observações gerais"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Convênio" htmlFor="editar-convenio">
            <input
              id="editar-convenio"
              className="psico-input"
              placeholder="Convênio ou particular"
              value={convenio}
              onChange={(e) => setConvenio(e.target.value)}
            />
          </CampoFormulario>
          <CidSearchSelect
            id="editar-paciente-cid"
            value={cid}
            onChange={setCid}
            label="CIDs do paciente"
          />
          <CampoFormulario label="Valor da sessão" htmlFor="editar-valor">
            <input
              id="editar-valor"
              className="psico-input"
              placeholder="Valor da sessão"
              value={valorSessao}
              onChange={(e) => setValorSessao(e.target.value)}
            />
          </CampoFormulario>
          <CampoFormulario label="Status do paciente" htmlFor="editar-status">
            <select
              id="editar-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="psico-input"
            >
              {STATUS_PACIENTE_OPCOES.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </CampoFormulario>
          <button type="button" className="btn btn-green" onClick={salvarAlteracoes}>
            Salvar alterações
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.push("/pacientes")}
          >
            Cancelar
          </button>
        </div>
      </Janela>
    </div>
  );
}

function CampoFormulario({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="patient-edit-field">
      <label className="label-form" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

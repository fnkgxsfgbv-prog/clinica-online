"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth";
import { getPacienteById, updatePaciente } from "../../../lib/db/pacientes";
import Janela from "../../../components/Janela";

export default function EditarPacientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [convenio, setConvenio] = useState("");
  const [cid, setCid] = useState("");
  const [valorSessao, setValorSessao] = useState("");
  const [status, setStatus] = useState("ativo");

  const carregarPaciente = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await getPacienteById(user.id, id);

    if (error) {
      alert("Erro ao carregar paciente: " + error.message);
      return;
    }

    setNome(data.nome || "");
    setTelefone(data.telefone || "");
    setResponsavel(data.responsavel || "");
    setDiagnostico(data.diagnostico || "");
    setObservacoes(data.observacoes || "");
    setConvenio(data.convenio || "");
    setCid(data.cid || "");
    setValorSessao(String(data.valor_sessao || ""));
    setStatus(data.status || "ativo");
  }, [id]);

  useEffect(() => {
    void carregarPaciente();
  }, [carregarPaciente]);

  async function salvarAlteracoes() {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await updatePaciente(user.id, id, {
      nome,
      telefone,
      responsavel,
      diagnostico,
      observacoes,
      convenio,
      cid,
      valor_sessao: valorSessao,
      status,
    });

    if (error) {
      alert("Erro ao salvar alterações: " + error.message);
      return;
    }

    alert("Paciente atualizado com sucesso!");
    router.push("/pacientes");
  }

  return (
    <div>
      <Janela titulo="Editar Paciente">
        <div className="form-grid">
          <input
            className="psico-input"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="psico-input"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          <input
            className="psico-input"
            placeholder="Responsável"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
          <input
            className="psico-input"
            placeholder="Diagnóstico"
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
          />
          <textarea
            className="psico-input"
            placeholder="Observações"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
          <input
            className="psico-input"
            placeholder="Convênio"
            value={convenio}
            onChange={(e) => setConvenio(e.target.value)}
          />
          <input
            className="psico-input"
            placeholder="CID"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
          />
          <input
            className="psico-input"
            placeholder="Valor da sessão"
            value={valorSessao}
            onChange={(e) => setValorSessao(e.target.value)}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="alta">Alta</option>
            <option value="desistente">Desistente</option>
            <option value="inativo">Inativo</option>
            <option value="lista de espera">Lista de espera</option>
          </select>
          <button className="btn btn-green" onClick={salvarAlteracoes}>
            Salvar alterações
          </button>
          <button
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

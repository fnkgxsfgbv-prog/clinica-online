"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import supabase from "../../../lib/supabase";
import Janela from "../../../components/Janela";

export default function EditarPacientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [convenio, setConvenio] = useState("");
  const [cid, setCid] = useState("");
  const [valorSessao, setValorSessao] = useState("");
  const [status, setStatus] = useState("ativo");

  useEffect(() => {
    carregarPaciente();
  }, []);

  async function carregarPaciente() {
    const { data, error } = await supabase
      .from("pacientes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert("Erro ao carregar paciente: " + error.message);
      return;
    }

    setNome(data.nome || "");
    setTelefone(data.telefone || "");
    setConvenio(data.convenio || "");
    setCid(data.cid || "");
    setValorSessao(data.valor_sessao || "");
    setStatus(data.status || "ativo");
  }

  async function salvarAlteracoes() {
    const { error } = await supabase
      .from("pacientes")
      .update({
        nome,
        telefone,
        convenio,
        cid,
        valor_sessao: valorSessao,
        status,
      })
      .eq("id", id);

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

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
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
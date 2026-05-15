"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import {
  deletePacienteComDependencias,
  listPacientes,
} from "../lib/db/pacientes";
import Janela from "../components/Janela";
import type { Paciente } from "../types";

export default function PacientesPage() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarPacientes = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const user = await getCurrentUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await listPacientes(user.id);

    if (error) {
      setErro("Erro ao carregar pacientes: " + error.message);
      setPacientes([]);
      setCarregando(false);
      return;
    }

    setPacientes((data || []) as Paciente[]);
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    void carregarPacientes();
  }, [carregarPacientes]);

  function classeStatus(statusPaciente: string) {
    if (statusPaciente === "ativo") return "status-success";
    if (statusPaciente === "alta") return "status-warning";
    if (statusPaciente === "lista de espera") return "status-info";
    if (statusPaciente === "desistente") return "status-danger";
    return "status-neutral";
  }

  async function excluirPaciente(
    id: string | number,
    nome: string
  ) {
    const confirmar = confirm(`Tem certeza que deseja excluir ${nome}?`);
    if (!confirmar) return;

    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await deletePacienteComDependencias(user.id, id);

    if (error) {
      alert("Erro ao excluir paciente: " + error.message);
      return;
    }

    void carregarPacientes();
  }

  const filtrados = pacientes.filter((p) => {
    const nomeOk = (p.nome ?? "")
      .toLowerCase()
      .includes(busca.toLowerCase());
    const statusOk = status
      ? (p.status ?? "ativo").toLowerCase() === status.toLowerCase()
      : true;
    return nomeOk && statusOk;
  });

  return (
    <div className="patients-page">
      <Janela titulo="Pacientes">
        {erro && <p className="financeiro-erro">{erro}</p>}

        <div
          className="patients-toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <input
            placeholder="Buscar paciente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ maxWidth: "340px" }}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ maxWidth: "220px" }}
          >
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="alta">Alta</option>
            <option value="desistente">Desistente</option>
            <option value="inativo">Inativo</option>
            <option value="lista de espera">Lista de espera</option>
          </select>

          <button
            className="btn btn-green"
            onClick={() => router.push("/novo-paciente")}
          >
            + Adicionar paciente
          </button>
        </div>

        <div className="patients-table-wrap">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Convênio</th>
                <th>CID</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filtrados.map((p) => {
                const statusPaciente = p.status || "ativo";

                return (
                  <tr key={p.id}>
                    <td className="patients-name-cell">
                      <strong>{p.nome}</strong>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${classeStatus(
                          statusPaciente
                        )}`}
                      >
                        {statusPaciente}
                      </span>
                    </td>

                    <td>{p.convenio || "-"}</td>
                    <td>{p.cid || "-"}</td>
                    <td>{p.valor_sessao ? `R$ ${p.valor_sessao}` : "-"}</td>

                    <td className="patients-actions-cell">
                      <div className="patients-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => router.push(`/paciente/${p.id}`)}
                        >
                          Abrir
                        </button>

                        <button
                          className="btn btn-outline"
                          onClick={() =>
                            router.push(`/pacientes/${p.id}/editar`)
                          }
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-danger"
                          onClick={() => excluirPaciente(p.id, p.nome)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {carregando ? (
            <p className="empty-text" style={{ marginTop: "16px" }}>
              Carregando pacientes...
            </p>
          ) : filtrados.length === 0 ? (
            <p className="empty-text" style={{ marginTop: "16px" }}>
              {pacientes.length === 0
                ? "Nenhum paciente cadastrado."
                : "Nenhum paciente encontrado com esses filtros."}
            </p>
          ) : null}
        </div>
      </Janela>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../lib/supabase";
import Janela from "../components/Janela";

export default function PacientesPage() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    carregarPacientes();
  }, []);

  async function carregarPacientes() {
    const { data, error } = await supabase
      .from("pacientes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar pacientes: " + error.message);
      return;
    }

    setPacientes(data || []);
  }

  function classeStatus(statusPaciente: string) {
    if (statusPaciente === "ativo") return "status-success";
    if (statusPaciente === "alta") return "status-warning";
    if (statusPaciente === "lista de espera") return "status-info";
    if (statusPaciente === "desistente") return "status-danger";
    return "status-neutral";
  }

  async function excluirPaciente(id: string, nome: string) {
    const confirmar = confirm(`Tem certeza que deseja excluir ${nome}?`);
    if (!confirmar) return;

    await supabase.from("frequência").delete().eq("paciente_id", id);
    await supabase.from("sessoes").delete().eq("paciente_id", id);
    await supabase.from("evolucoes").delete().eq("paciente_id", id);

    const { error } = await supabase
      .from("pacientes")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao excluir paciente: " + error.message);
      return;
    }

    carregarPacientes();
  }

  const filtrados = pacientes.filter((p) => {
    const nomeOk = p.nome?.toLowerCase().includes(busca.toLowerCase());
    const statusOk = status ? p.status === status : true;
    return nomeOk && statusOk;
  });

  return (
    <div>
      <Janela titulo="Pacientes">
        <div
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

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Telefone</th>
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
                    <td>
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

                    <td>{p.telefone || "-"}</td>
                    <td>{p.convenio || "-"}</td>
                    <td>{p.cid || "-"}</td>
                    <td>{p.valor_sessao ? `R$ ${p.valor_sessao}` : "-"}</td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
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

          {filtrados.length === 0 && (
            <p className="empty-text" style={{ marginTop: "16px" }}>
              Nenhum paciente encontrado.
            </p>
          )}
        </div>
      </Janela>
    </div>
  );
}
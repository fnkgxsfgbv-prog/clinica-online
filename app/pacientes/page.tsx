"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { formatarCidParaExibicao } from "../lib/cid-psicologia";
import { requireUserClient } from "../lib/require-user-client";
import {
  deletePacienteComDependencias,
  listPacientesPaginated,
  PACIENTES_PAGE_SIZE,
} from "../lib/db/pacientes";
import FlashMessage from "../components/FlashMessage";
import Janela from "../components/Janela";
import type { Paciente } from "../types";

export default function PacientesPage() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [debouncedBusca, setDebouncedBusca] = useState("");
  const [status, setStatus] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");
  const [exclusaoPendente, setExclusaoPendente] = useState<{
    id: string | number;
    nome: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedBusca(busca), 400);
    return () => clearTimeout(t);
  }, [busca]);

  const carregarPrimeiraPagina = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data, error, count } = await listPacientesPaginated(user.id, {
      offset: 0,
      limit: PACIENTES_PAGE_SIZE,
      search: debouncedBusca,
      status: status || undefined,
    });

    if (error) {
      setErro("Erro ao carregar pacientes: " + error.message);
      setPacientes([]);
      setTotalCount(null);
      setCarregando(false);
      return;
    }

    setPacientes((data || []) as Paciente[]);
    setTotalCount(count ?? 0);
    setCarregando(false);
  }, [router, debouncedBusca, status]);

  useEffect(() => {
    void carregarPrimeiraPagina();
  }, [carregarPrimeiraPagina]);

  const carregarMais = useCallback(async () => {
    if (totalCount == null || pacientes.length >= totalCount) return;

    setCarregandoMais(true);
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregandoMais(false);
      return;
    }

    const { data, error } = await listPacientesPaginated(user.id, {
      offset: pacientes.length,
      limit: PACIENTES_PAGE_SIZE,
      search: debouncedBusca,
      status: status || undefined,
    });

    if (error) {
      setErro("Erro ao carregar mais pacientes: " + error.message);
      setCarregandoMais(false);
      return;
    }

    if (data?.length) {
      setPacientes((p) => [...p, ...(data as Paciente[])]);
    }

    setCarregandoMais(false);
  }, [
    pacientes.length,
    totalCount,
    debouncedBusca,
    status,
    router,
  ]);

  function classeStatus(statusPaciente: string) {
    if (statusPaciente === "ativo") return "status-success";
    if (statusPaciente === "alta") return "status-warning";
    if (statusPaciente === "lista de espera") return "status-info";
    if (statusPaciente === "desistente") return "status-danger";
    return "status-neutral";
  }

  function solicitarExclusao(id: string | number, nome: string) {
    setExclusaoPendente({ id, nome });
  }

  async function confirmarExclusaoPaciente() {
    if (!exclusaoPendente) return;

    const { id } = exclusaoPendente;
    setExclusaoPendente(null);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await deletePacienteComDependencias(user.id, id);

    if (error) {
      setErro("Erro ao excluir paciente: " + error.message);
      return;
    }

    setErro("");
    void carregarPrimeiraPagina();
  }

  const temMais =
    totalCount != null && pacientes.length < totalCount;

  return (
    <div className="patients-page">
      <Janela titulo="Pacientes">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

        {exclusaoPendente ? (
          <div
            className="psico-card"
            style={{
              marginBottom: "20px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px 16px",
              justifyContent: "space-between",
            }}
            role="status"
            aria-live="polite"
          >
            <p style={{ margin: 0 }}>
              Tem certeza que deseja excluir{" "}
              <strong>{exclusaoPendente.nome}</strong>? Esta ação não pode ser
              desfeita.
            </p>

            <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setExclusaoPendente(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void confirmarExclusaoPaciente()}
              >
                Excluir
              </button>
            </div>
          </div>
        ) : null}

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
            placeholder="Buscar paciente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ maxWidth: "340px" }}
            autoComplete="off"
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
              {pacientes.map((p) => {
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
                    <td>{formatarCidParaExibicao(p.cid)}</td>
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
                            router.push(`/paciente/${p.id}/editar`)
                          }
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-danger"
                          onClick={() => solicitarExclusao(p.id, p.nome)}
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
          ) : pacientes.length === 0 ? (
            <p className="empty-text" style={{ marginTop: "16px" }}>
              Nenhum paciente encontrado com esses filtros.
            </p>
          ) : null}

          {!carregando && temMais ? (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={carregandoMais}
                onClick={() => void carregarMais()}
              >
                {carregandoMais
                  ? "Carregando…"
                  : `Carregar mais (${pacientes.length} de ${totalCount})`}
              </button>
            </div>
          ) : null}
        </div>
      </Janela>
    </div>
  );
}

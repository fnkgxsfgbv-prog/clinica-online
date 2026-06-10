"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { formatarCidParaExibicao } from "../lib/cid-psicologia";
import {
  hrefPendencia,
  pendenciasCadastroPaciente,
} from "../lib/checklist-clinica";
import {
  classeStatusPaciente,
} from "../lib/status-paciente";
import { requireUserClient } from "../lib/require-user-client";
import {
  deletePacienteComDependencias,
  listPacientesPaginated,
  PACIENTES_PAGE_SIZE,
  resumoContagemPacientes,
  type ResumoContagemPacientes,
} from "../lib/db/pacientes";
import FlashMessage from "../components/FlashMessage";
import Janela from "../components/Janela";
import type { Paciente } from "../types";

function hrefTelefone(telefone: string | null | undefined) {
  const digits = String(telefone || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `tel:${digits}`;
}

export default function PacientesPage() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [resumo, setResumo] = useState<ResumoContagemPacientes | null>(null);
  const [busca, setBusca] = useState("");
  const [debouncedBusca, setDebouncedBusca] = useState("");
  const [status, setStatus] = useState("ativo");
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

  const carregarResumo = useCallback(async (userId: string) => {
    const { data, error } = await resumoContagemPacientes(userId);
    if (!error && data) {
      setResumo(data);
    }
  }, []);

  const carregarPrimeiraPagina = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const [listResult] = await Promise.all([
      listPacientesPaginated(user.id, {
        offset: 0,
        limit: PACIENTES_PAGE_SIZE,
        search: debouncedBusca,
        status: status || undefined,
      }),
      carregarResumo(user.id),
    ]);

    const { data, error, count } = listResult;

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
  }, [router, debouncedBusca, status, carregarResumo]);

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
    return classeStatusPaciente(statusPaciente);
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

  function abrirPaciente(id: string | number) {
    router.push(`/paciente/${id}`);
  }

  const temMais =
    totalCount != null && pacientes.length < totalCount;

  const filtroAtivo = debouncedBusca.trim() || status !== "ativo";

  return (
    <div className="patients-page">
      <Janela titulo="Pacientes">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

        {resumo ? (
          <p className="patients-summary">
            <span>{resumo.ativos} ativos</span>
            <span className="patients-summary-sep" aria-hidden>
              ·
            </span>
            <span>{resumo.listaEspera} lista de espera</span>
            <span className="patients-summary-sep" aria-hidden>
              ·
            </span>
            <span>{resumo.total} total</span>
            {filtroAtivo && totalCount != null ? (
              <>
                <span className="patients-summary-sep" aria-hidden>
                  ·
                </span>
                <span className="patients-summary-filtered">
                  {totalCount} neste filtro
                </span>
              </>
            ) : null}
          </p>
        ) : null}

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
                <th>Telefone</th>
                <th>Convênio</th>
                <th>CID</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {pacientes.map((p) => {
                const statusPaciente = p.status || "ativo";
                const pendencias = pendenciasCadastroPaciente(p);
                const telHref = hrefTelefone(p.telefone);

                return (
                  <tr
                    key={p.id}
                    className="patients-row-clickable"
                    tabIndex={0}
                    role="link"
                    aria-label={`Abrir prontuário de ${p.nome}`}
                    onClick={() => abrirPaciente(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        abrirPaciente(p.id);
                      }
                    }}
                  >
                    <td className="patients-name-cell">
                      <div className="patients-name-wrap">
                        <strong>{p.nome}</strong>
                        {pendencias.length > 0 ? (
                          <Link
                            href={hrefPendencia(pendencias[0].tipo)}
                            className="patients-cadastro-badge"
                            title={pendencias
                              .map((item) => item.titulo)
                              .join(" · ")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Cadastro incompleto
                          </Link>
                        ) : null}
                      </div>
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

                    <td className="patients-phone-cell">
                      {p.telefone?.trim() ? p.telefone : "—"}
                    </td>
                    <td>{p.convenio || "—"}</td>
                    <td>{formatarCidParaExibicao(p.cid)}</td>
                    <td>{p.valor_sessao ? `R$ ${p.valor_sessao}` : "—"}</td>

                    <td
                      className="patients-actions-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="patients-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          title="Agendar sessão"
                          onClick={() =>
                            router.push(`/agenda?paciente=${p.id}`)
                          }
                        >
                          Agendar
                        </button>

                        {telHref ? (
                          <a
                            className="btn btn-outline"
                            href={telHref}
                            title={`Ligar para ${p.nome}`}
                          >
                            Ligar
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled
                            title="Sem telefone cadastrado"
                          >
                            Ligar
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() =>
                            router.push(`/paciente/${p.id}/editar`)
                          }
                        >
                          Editar
                        </button>

                        <button
                          type="button"
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

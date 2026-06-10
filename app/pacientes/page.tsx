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
import { classeStatusPaciente } from "../lib/status-paciente";
import { requireUserClient } from "../lib/require-user-client";
import {
  deletePacienteComDependencias,
  listPacientesPaginated,
  PACIENTES_PAGE_SIZE,
  resumoContagemPacientes,
  type ResumoContagemPacientes,
} from "../lib/db/pacientes";
import ConfirmacaoModal from "../components/ConfirmacaoModal";
import FlashMessage from "../components/FlashMessage";
import Janela from "../components/Janela";
import EmptyState from "../components/ui/EmptyState";
import { PatientsSkeleton } from "../components/ui/Skeleton";
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
  const [excluindo, setExcluindo] = useState(false);
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
  }, [pacientes.length, totalCount, debouncedBusca, status, router]);

  function solicitarExclusao(id: string | number, nome: string) {
    setExclusaoPendente({ id, nome });
  }

  async function confirmarExclusaoPaciente() {
    if (!exclusaoPendente) return;

    const { id } = exclusaoPendente;
    setExcluindo(true);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setExcluindo(false);
      return;
    }

    const { error } = await deletePacienteComDependencias(user.id, id);

    setExcluindo(false);

    if (error) {
      setErro("Erro ao excluir paciente: " + error.message);
      return;
    }

    setExclusaoPendente(null);
    setErro("");
    void carregarPrimeiraPagina();
  }

  function abrirPaciente(id: string | number) {
    router.push(`/paciente/${id}`);
  }

  function renderAcoes(p: Paciente, compacto = false) {
    const telHref = hrefTelefone(p.telefone);

    return (
      <div className={compacto ? "patient-mobile-actions" : "patients-actions"}>
        <button
          type="button"
          className="btn btn-outline"
          title="Agendar sessão"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/agenda?paciente=${p.id}`);
          }}
        >
          Agendar
        </button>

        {telHref ? (
          <a
            className="btn btn-outline"
            href={telHref}
            title={`Ligar para ${p.nome}`}
            onClick={(e) => e.stopPropagation()}
          >
            Ligar
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            disabled
            title="Sem telefone cadastrado"
            onClick={(e) => e.stopPropagation()}
          >
            Ligar
          </button>
        )}

        <button
          type="button"
          className="btn btn-outline"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/paciente/${p.id}/editar`);
          }}
        >
          Editar
        </button>

        <button
          type="button"
          className="btn btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            solicitarExclusao(p.id, p.nome);
          }}
        >
          Excluir
        </button>
      </div>
    );
  }

  const temMais = totalCount != null && pacientes.length < totalCount;
  const filtroAtivo = debouncedBusca.trim() || status !== "ativo";

  return (
    <div className="patients-page">
      <ConfirmacaoModal
        aberto={exclusaoPendente != null}
        titulo="Excluir paciente"
        perigo
        confirmando={excluindo}
        rotuloConfirmar="Excluir"
        onCancelar={() => {
          if (!excluindo) setExclusaoPendente(null);
        }}
        onConfirmar={() => void confirmarExclusaoPaciente()}
      >
        <p>
          Tem certeza que deseja excluir{" "}
          <strong>{exclusaoPendente?.nome}</strong>? Esta ação não pode ser
          desfeita.
        </p>
      </ConfirmacaoModal>

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

        <div className="patients-toolbar">
          <input
            placeholder="Buscar paciente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoComplete="off"
          />

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
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

        {carregando ? (
          <PatientsSkeleton />
        ) : pacientes.length === 0 ? (
          <EmptyState
            titulo="Nenhum paciente encontrado"
            descricao={
              filtroAtivo
                ? "Tente outro termo de busca ou limpe os filtros."
                : "Cadastre o primeiro paciente da clínica."
            }
            icone="👤"
            acao={
              filtroAtivo
                ? undefined
                : { rotulo: "+ Adicionar paciente", href: "/novo-paciente" }
            }
          />
        ) : (
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
                          className={`status-badge ${classeStatusPaciente(statusPaciente)}`}
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
                        {renderAcoes(p)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="patients-mobile-list">
              {pacientes.map((p) => {
                const statusPaciente = p.status || "ativo";
                const pendencias = pendenciasCadastroPaciente(p);

                return (
                  <article
                    key={`mobile-${p.id}`}
                    className="patient-mobile-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => abrirPaciente(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        abrirPaciente(p.id);
                      }
                    }}
                  >
                    <div className="patient-mobile-card-header">
                      <strong>{p.nome}</strong>
                      <span
                        className={`status-badge ${classeStatusPaciente(statusPaciente)}`}
                      >
                        {statusPaciente}
                      </span>
                    </div>

                    {pendencias.length > 0 ? (
                      <Link
                        href={hrefPendencia(pendencias[0].tipo)}
                        className="patients-cadastro-badge"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Cadastro incompleto
                      </Link>
                    ) : null}

                    <div className="patient-mobile-meta">
                      <span>
                        Tel.: {p.telefone?.trim() ? p.telefone : "—"}
                      </span>
                      <span>Convênio: {p.convenio || "—"}</span>
                      <span>CID: {formatarCidParaExibicao(p.cid)}</span>
                      <span>
                        Valor: {p.valor_sessao ? `R$ ${p.valor_sessao}` : "—"}
                      </span>
                    </div>

                    {renderAcoes(p, true)}
                  </article>
                );
              })}
            </div>

            {temMais ? (
              <div className="patients-load-more">
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
        )}
      </Janela>
    </div>
  );
}

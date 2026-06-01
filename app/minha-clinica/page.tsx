"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import FlashMessage from "../components/FlashMessage";
import { getCurrentUser } from "../lib/auth";
import { listPacientes } from "../lib/db/pacientes";
import {
  getProfilePhotoPath,
  removerFotoPerfil,
  resolverUrlFotoPerfil,
  uploadFotoPerfil,
} from "../lib/db/profile-photo";
import { listSessoes } from "../lib/db/sessoes";
import { baixarBlob } from "../lib/download";
import { extrairDataInicioAtendimento } from "../lib/paciente-metadata";
import { dataIsoHoje, formatarDataPaciente } from "../lib/datas-paciente";
import { dataReferenciaISO } from "../lib/financeiro";
import { timestampDataHora } from "../lib/ordenar-datas";
import { requireUserClient } from "../lib/require-user-client";
import { isStatusCancelada, isStatusFaltou } from "../lib/status";
import supabase from "../lib/supabase";
import type { Paciente, Sessao } from "../types";

type UserProfile = {
  email: string;
  nome: string;
  telefone: string;
  nomeClinica: string;
  crp: string;
  endereco: string;
  cidade: string;
  observacoes: string;
  fotoUrl: string;
  fotoPath: string;
  criadoEm: string;
};

type ProfileForm = Omit<UserProfile, "email" | "fotoUrl" | "fotoPath" | "criadoEm">;
type ClinicInsight = {
  titulo: string;
  valor: number;
  descricao: string;
  tom?: "ok" | "warn";
};

function formatarData(data?: string | null) {
  const formatada = formatarDataPaciente(data);
  return formatada === "Não informada" ? "-" : formatada;
}

function csvCell(value: unknown) {
  const cell = String(value ?? "");
  if (/[",\n;]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function baixarCsv(nomeArquivo: string, linhas: unknown[][]) {
  const csv = "\uFEFF" + linhas.map((linha) => linha.map(csvCell).join(";")).join("\n");
  baixarBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), nomeArquivo);
}

function statusNormalizado(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function pacienteAtivo(paciente: Paciente) {
  const status = statusNormalizado(paciente.status);
  return !status || status === "ativo";
}

function sessoesDoMes(sessoes: Sessao[]) {
  const mesAtual = dataIsoHoje().slice(0, 7);
  return sessoes.filter((sessao) => String(sessao.data || "").startsWith(mesAtual));
}

function montarChecklistClinica(pacientes: Paciente[]): ClinicInsight[] {
  const ativos = pacientes.filter(pacienteAtivo);

  return [
    {
      titulo: "Sem telefone",
      valor: ativos.filter((paciente) => !String(paciente.telefone || "").trim()).length,
      descricao: "Pacientes ativos sem contato cadastrado.",
      tom: "warn",
    },
    {
      titulo: "Sem nascimento",
      valor: ativos.filter((paciente) => !paciente.data_nascimento).length,
      descricao: "Importante para idade cronológica e aniversários.",
      tom: "warn",
    },
    {
      titulo: "Sem CID",
      valor: ativos.filter((paciente) => !String(paciente.cid || "").trim()).length,
      descricao: "Prontuários que ainda podem ser completados.",
      tom: "warn",
    },
    {
      titulo: "Sem início",
      valor: ativos.filter((paciente) => !extrairDataInicioAtendimento(paciente)).length,
      descricao: "Falta data de início do atendimento.",
      tom: "warn",
    },
  ];
}

function montarLembretesClinicos(
  pacientes: Paciente[],
  sessoes: Sessao[]
): ClinicInsight[] {
  const hoje = dataIsoHoje();
  const mesAtual = hoje.slice(5, 7);
  const sessoesMes = sessoesDoMes(sessoes);
  const limiteRecente = new Date();
  limiteRecente.setDate(limiteRecente.getDate() - 30);

  const pacientesAtivos = pacientes.filter(pacienteAtivo);
  const pacientesSemSessaoRecente = pacientesAtivos.filter((paciente) => {
    const ultimaSessao = sessoes
      .filter((sessao) => String(sessao.paciente_id) === String(paciente.id))
      .map((sessao) => timestampDataHora(sessao.data, sessao.hora))
      .filter((ts) => ts > 0)
      .sort((a, b) => b - a)[0];

    return !ultimaSessao || ultimaSessao < limiteRecente.getTime();
  }).length;

  return [
    {
      titulo: "Aniversários do mês",
      valor: pacientesAtivos.filter((paciente) =>
        String(paciente.data_nascimento || "").slice(5, 7) === mesAtual
      ).length,
      descricao: "Pacientes ativos com aniversário neste mês.",
    },
    {
      titulo: "Sessões de hoje",
      valor: sessoes.filter(
        (sessao) => dataReferenciaISO(sessao.data) === hoje
      ).length,
      descricao: "Atendimentos previstos para hoje.",
    },
    {
      titulo: "Faltas/cancelamentos",
      valor: sessoesMes.filter(
        (sessao) =>
          isStatusFaltou(sessao.status) || isStatusCancelada(sessao.status)
      ).length,
      descricao: "Ocorrências registradas no mês atual.",
      tom: "warn",
    },
    {
      titulo: "Sem sessão recente",
      valor: pacientesSemSessaoRecente,
      descricao: "Pacientes ativos sem sessão nos últimos 30 dias.",
      tom: "warn",
    },
  ];
}

export default function MinhaClinicaPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    nome: "",
    telefone: "",
    nomeClinica: "",
    crp: "",
    endereco: "",
    cidade: "",
    observacoes: "",
  });
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");

      const user = await requireUserClient(router, getCurrentUser);
      if (!user) {
        setCarregando(false);
        return;
      }

      const [pacientesRes, sessoesRes] = await Promise.all([
        listPacientes(user.id),
        listSessoes(user.id),
      ]);

      const loadError = pacientesRes.error?.message || sessoesRes.error?.message;
      if (loadError) {
        setErro("Erro ao carregar dados da clínica: " + loadError);
      }

      const metadata = user.user_metadata || {};
      const fotoPath = getProfilePhotoPath(metadata);
      const perfilAtual = {
        email: user.email || "-",
        nome:
          String(metadata.name || metadata.full_name || "")
            .trim() || "Profissional",
        telefone: String(metadata.phone || ""),
        nomeClinica: String(metadata.clinic_name || "PsicoDesk"),
        crp: String(metadata.crp || ""),
        endereco: String(metadata.clinic_address || ""),
        cidade: String(metadata.clinic_city || ""),
        observacoes: String(metadata.clinic_notes || ""),
        fotoUrl: await resolverUrlFotoPerfil(metadata),
        fotoPath,
        criadoEm: formatarData(user.created_at),
      };

      setPerfil(perfilAtual);
      setForm({
        nome: perfilAtual.nome,
        telefone: perfilAtual.telefone,
        nomeClinica: perfilAtual.nomeClinica,
        crp: perfilAtual.crp,
        endereco: perfilAtual.endereco,
        cidade: perfilAtual.cidade,
        observacoes: perfilAtual.observacoes,
      });
      setPacientes((pacientesRes.data || []) as Paciente[]);
      setSessoes((sessoesRes.data || []) as Sessao[]);
      setCarregando(false);
    }

    void carregar();
  }, [router]);

  const pacientesAtivos = pacientes.filter(pacienteAtivo).length;
  const checklistClinica = montarChecklistClinica(pacientes);
  const lembretesClinicos = montarLembretesClinicos(pacientes, sessoes);

  function atualizarCampo(campo: keyof ProfileForm, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function cancelarEdicao() {
    if (perfil) {
      setForm({
        nome: perfil.nome,
        telefone: perfil.telefone,
        nomeClinica: perfil.nomeClinica,
        crp: perfil.crp,
        endereco: perfil.endereco,
        cidade: perfil.cidade,
        observacoes: perfil.observacoes,
      });
    }
    setEditando(false);
    setErro("");
  }

  async function salvarDados() {
    setSalvando(true);
    setErro("");
    setMensagem("");

    const nome = form.nome.trim();
    const nomeClinica = form.nomeClinica.trim();
    if (!nome || !nomeClinica) {
      setErro("Informe o nome profissional e o nome da clínica.");
      setSalvando(false);
      return;
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: nome,
        full_name: nome,
        phone: form.telefone.trim(),
        clinic_name: nomeClinica,
        crp: form.crp.trim(),
        clinic_address: form.endereco.trim(),
        clinic_city: form.cidade.trim(),
        clinic_notes: form.observacoes.trim(),
        avatar_path: perfil?.fotoPath || null,
      },
    });

    if (error) {
      setErro("Erro ao salvar dados da clínica: " + error.message);
      setSalvando(false);
      return;
    }

    const atualizado = {
      email: data.user.email || perfil?.email || "-",
      nome,
      telefone: form.telefone.trim(),
      nomeClinica,
      crp: form.crp.trim(),
      endereco: form.endereco.trim(),
      cidade: form.cidade.trim(),
      observacoes: form.observacoes.trim(),
      fotoUrl: perfil?.fotoUrl || "",
      fotoPath: perfil?.fotoPath || "",
      criadoEm: perfil?.criadoEm || formatarData(data.user.created_at),
    };

    setPerfil(atualizado);
    setForm({
      nome: atualizado.nome,
      telefone: atualizado.telefone,
      nomeClinica: atualizado.nomeClinica,
      crp: atualizado.crp,
      endereco: atualizado.endereco,
      cidade: atualizado.cidade,
      observacoes: atualizado.observacoes,
    });
    setMensagem("Dados da clínica atualizados.");
    setEditando(false);
    setSalvando(false);
  }

  async function atualizarFoto(file?: File) {
    if (!file) return;

    setEnviandoFoto(true);
    setErro("");
    setMensagem("");
    const fotoAnterior = perfil?.fotoUrl || "";
    const previewUrl = URL.createObjectURL(file);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      URL.revokeObjectURL(previewUrl);
      setEnviandoFoto(false);
      return;
    }

    setPerfil((atual) => (atual ? { ...atual, fotoUrl: previewUrl } : atual));

    const previousPath = perfil?.fotoPath || getProfilePhotoPath(user.user_metadata || {});
    const upload = await uploadFotoPerfil({
      userId: user.id,
      file,
      previousPath,
    });

    if (upload.error) {
      URL.revokeObjectURL(previewUrl);
      setPerfil((atual) => (atual ? { ...atual, fotoUrl: fotoAnterior } : atual));
      setErro("Erro ao enviar foto: " + upload.error.message);
      setEnviandoFoto(false);
      return;
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(user.user_metadata || {}),
        avatar_path: upload.path,
      },
    });

    if (error) {
      await removerFotoPerfil(upload.path);
      URL.revokeObjectURL(previewUrl);
      setPerfil((atual) => (atual ? { ...atual, fotoUrl: fotoAnterior } : atual));
      setErro("Erro ao salvar foto no perfil: " + error.message);
      setEnviandoFoto(false);
      return;
    }

    const fotoUrl = await resolverUrlFotoPerfil(data.user.user_metadata || {});
    setPerfil((atual) =>
      atual
        ? { ...atual, fotoPath: upload.path, fotoUrl }
        : atual
    );
    URL.revokeObjectURL(previewUrl);
    setMensagem("Foto profissional atualizada.");
    setEnviandoFoto(false);
  }

  async function removerFoto() {
    if (!perfil?.fotoPath) return;

    setEnviandoFoto(true);
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setEnviandoFoto(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        ...(user.user_metadata || {}),
        avatar_path: null,
      },
    });

    if (error) {
      setErro("Erro ao remover foto do perfil: " + error.message);
      setEnviandoFoto(false);
      return;
    }

    await removerFotoPerfil(perfil.fotoPath);
    setPerfil((atual) =>
      atual
        ? { ...atual, fotoPath: "", fotoUrl: "" }
        : atual
    );
    setMensagem("Foto profissional removida.");
    setEnviandoFoto(false);
  }

  function exportarPacientes() {
    baixarCsv("pacientes-clinica.csv", [
      ["Nome", "Status", "Telefone", "Nascimento", "Início do atendimento", "CID", "Convênio", "Valor da sessão"],
      ...pacientes.map((paciente) => [
        paciente.nome,
        paciente.status || "ativo",
        paciente.telefone || "",
        paciente.data_nascimento || "",
        extrairDataInicioAtendimento(paciente),
        paciente.cid || "",
        paciente.convenio || "",
        paciente.valor_sessao || paciente.valor || "",
      ]),
    ]);
  }

  function exportarSessoes() {
    baixarCsv("sessoes-clinica.csv", [
      ["Paciente", "Data", "Hora", "Status", "Valor"],
      ...sessoes.map((sessao) => [
        sessao.paciente_nome || "",
        sessao.data,
        sessao.hora || "",
        sessao.status || "",
        sessao.valor || "",
      ]),
    ]);
  }

  return (
    <div className="clinic-page">
      <div className="clinic-layout clinic-layout-single">
        <main className="clinic-content">
          {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
          {mensagem ? <FlashMessage kind="success">{mensagem}</FlashMessage> : null}

          {carregando ? (
            <p className="empty-text">Carregando dados da clínica...</p>
          ) : (
            <>
            <section className="clinic-card clinic-data-card clinic-summary-card">
              <div className="clinic-data-banner clinic-edit-banner">
                <span>Dados da clínica e da conta profissional</span>
                {editando ? (
                  <div className="clinic-edit-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={cancelarEdicao}
                      disabled={salvando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-green"
                      onClick={() => void salvarDados()}
                      disabled={salvando}
                    >
                      {salvando ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-green"
                    onClick={() => setEditando(true)}
                  >
                    Editar dados
                  </button>
                )}
              </div>

              {editando ? (
                <div className="clinic-edit-grid">
                  <label>
                    <span>Nome profissional</span>
                    <input
                      value={form.nome}
                      onChange={(event) => atualizarCampo("nome", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Telefone</span>
                    <input
                      value={form.telefone}
                      onChange={(event) => atualizarCampo("telefone", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Nome da clínica</span>
                    <input
                      value={form.nomeClinica}
                      onChange={(event) => atualizarCampo("nomeClinica", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>CRP / registro</span>
                    <input
                      value={form.crp}
                      onChange={(event) => atualizarCampo("crp", event.target.value)}
                      placeholder="Ex.: CRP 00/00000"
                    />
                  </label>
                  <label>
                    <span>Endereço / atendimento</span>
                    <input
                      value={form.endereco}
                      onChange={(event) => atualizarCampo("endereco", event.target.value)}
                      placeholder="Rua, número, sala ou modalidade online"
                    />
                  </label>
                  <label>
                    <span>Cidade</span>
                    <input
                      value={form.cidade}
                      onChange={(event) => atualizarCampo("cidade", event.target.value)}
                    />
                  </label>
                  <label className="clinic-edit-full">
                    <span>Observações da clínica</span>
                    <textarea
                      value={form.observacoes}
                      onChange={(event) => atualizarCampo("observacoes", event.target.value)}
                      placeholder="Informações internas, horários, orientações ou descrição curta."
                    />
                  </label>
                </div>
              ) : (
                <div className="clinic-data-grid">
                  <div className="clinic-photo-panel">
                    <div className="clinic-logo-placeholder">
                      {perfil?.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={perfil.fotoUrl} alt="Foto profissional" />
                      ) : (
                        perfil?.nome.slice(0, 1).toUpperCase() || "P"
                      )}
                    </div>
                    <label className="clinic-photo-upload">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={enviandoFoto}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void atualizarFoto(file);
                        }}
                      />
                      {enviandoFoto ? "Enviando..." : "Trocar foto"}
                    </label>
                    {perfil?.fotoPath ? (
                      <button
                        type="button"
                        className="clinic-photo-remove"
                        onClick={() => void removerFoto()}
                        disabled={enviandoFoto}
                      >
                        Remover foto
                      </button>
                    ) : null}
                  </div>
                  <div>
                    <span>Profissional</span>
                    <strong>{perfil?.nome}</strong>
                    <span>E-mail</span>
                    <strong>{perfil?.email}</strong>
                    <span>Telefone</span>
                    <strong>{perfil?.telefone || "-"}</strong>
                    <span>CRP / registro</span>
                    <strong>{perfil?.crp || "-"}</strong>
                  </div>
                  <div>
                    <span>Nome da clínica</span>
                    <strong>{perfil?.nomeClinica}</strong>
                    <span>Endereço / atendimento</span>
                    <strong>{perfil?.endereco || "-"}</strong>
                    <span>Cidade</span>
                    <strong>{perfil?.cidade || "-"}</strong>
                    <span>Pacientes ativos</span>
                    <strong>{pacientesAtivos} de {pacientes.length}</strong>
                    <span>Sessões registradas</span>
                    <strong>{sessoes.length}</strong>
                    <span>Conta ativa desde</span>
                    <strong>{perfil?.criadoEm}</strong>
                  </div>
                  {perfil?.observacoes ? (
                    <div className="clinic-notes-card">
                      <span>Observações</span>
                      <strong>{perfil.observacoes}</strong>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <div className="clinic-tools-grid">
              <section className="clinic-card clinic-tool-card">
                <div className="clinic-tool-header">
                  <div>
                    <h2>Backup e exportação</h2>
                    <p>Baixe planilhas simples para guardar uma cópia dos dados principais.</p>
                  </div>
                </div>
                <div className="clinic-export-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={exportarPacientes}
                    disabled={pacientes.length === 0}
                  >
                    Baixar pacientes
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={exportarSessoes}
                    disabled={sessoes.length === 0}
                  >
                    Baixar sessões
                  </button>
                </div>
              </section>

              <section className="clinic-card clinic-tool-card">
                <div className="clinic-tool-header">
                  <div>
                    <h2>Checklist da clínica</h2>
                    <p>Itens de cadastro que podem atrapalhar prontuários e lembretes.</p>
                  </div>
                </div>
                <div className="clinic-insight-list">
                  {checklistClinica.map((item) => (
                    <div
                      key={item.titulo}
                      className={`clinic-insight-item${item.valor > 0 ? " is-warn" : " is-ok"}`}
                    >
                      <strong>{item.valor}</strong>
                      <div>
                        <span>{item.titulo}</span>
                        <p>{item.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="clinic-card clinic-tool-card clinic-tool-card-wide">
                <div className="clinic-tool-header">
                  <div>
                    <h2>Lembretes clínicos</h2>
                    <p>Alertas rápidos para acompanhar rotina, faltas e pacientes sem movimentação.</p>
                  </div>
                </div>
                <div className="clinic-insight-list clinic-insight-list-wide">
                  {lembretesClinicos.map((item) => (
                    <div
                      key={item.titulo}
                      className={`clinic-insight-item${item.tom === "warn" && item.valor > 0 ? " is-warn" : " is-ok"}`}
                    >
                      <strong>{item.valor}</strong>
                      <div>
                        <span>{item.titulo}</span>
                        <p>{item.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

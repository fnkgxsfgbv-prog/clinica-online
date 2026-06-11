"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ContaTemaPanel from "../components/ContaTemaPanel";
import FlashMessage from "../components/FlashMessage";
import { PageSkeleton } from "../components/ui/Skeleton";
import BackupClinicaPanel from "../components/BackupClinicaPanel";
import PendenciasClinica from "../components/PendenciasClinica";
import SincronizarDadosButton from "../components/SincronizarDadosButton";
import { getCurrentUser } from "../lib/auth";
import type { BackupClinicaPerfil } from "../lib/backup-clinica";
import { montarChecklistUnificado } from "../lib/checklist-clinica";
import { listFrequenciasResumo } from "../lib/db/frequencia";
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
import { formatarDataPaciente } from "../lib/datas-paciente";
import { requireUserClient } from "../lib/require-user-client";
import supabase from "../lib/supabase";
import type { Frequencia, Paciente, Sessao } from "../types";

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

type AbaConta = "perfil" | "dados" | "conta";

const ABAS_CONTA: Array<{ id: AbaConta; label: string }> = [
  { id: "perfil", label: "Perfil" },
  { id: "dados", label: "Dados" },
  { id: "conta", label: "Conta" },
];

function normalizarAbaConta(valor: string | null): AbaConta {
  if (valor === "dados" || valor === "conta") return valor;
  return "perfil";
}

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

export default function MinhaClinicaPage() {
  return (
    <Suspense
      fallback={
        <div className="clinic-page">
          <PageSkeleton linhas={5} />
        </div>
      }
    >
      <MinhaClinicaConteudo />
    </Suspense>
  );
}

function MinhaClinicaConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aba = normalizarAbaConta(searchParams.get("aba"));
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
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  const [userId, setUserId] = useState("");
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

      setUserId(user.id);

      const [pacientesRes, sessoesRes, frequenciasRes] = await Promise.all([
        listPacientes(user.id),
        listSessoes(user.id),
        listFrequenciasResumo(user.id),
      ]);

      const loadError =
        pacientesRes.error?.message ||
        sessoesRes.error?.message ||
        frequenciasRes.error?.message;
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
      setFrequencias((frequenciasRes.data || []) as Frequencia[]);
      setCarregando(false);
    }

    void carregar();
  }, [router]);

  const pacientesAtivos = pacientes.filter(pacienteAtivo).length;
  const checklistCompleto = montarChecklistUnificado(
    pacientes,
    sessoes,
    frequencias
  );
  const lembretesRotina = checklistCompleto.filter(
    (item) => item.categoria === "rotina"
  );

  const perfilBackup: BackupClinicaPerfil | undefined = perfil
    ? {
        nome: form.nome || perfil.nome,
        telefone: form.telefone || perfil.telefone,
        nomeClinica: form.nomeClinica || perfil.nomeClinica,
        crp: form.crp || perfil.crp,
        endereco: form.endereco || perfil.endereco,
        cidade: form.cidade || perfil.cidade,
        observacoes: form.observacoes || perfil.observacoes,
      }
    : undefined;

  async function recarregarDadosClinica() {
    if (!userId) return;
    const [pacientesRes, sessoesRes, frequenciasRes] = await Promise.all([
      listPacientes(userId),
      listSessoes(userId),
      listFrequenciasResumo(userId),
    ]);
    if (!pacientesRes.error) {
      setPacientes((pacientesRes.data || []) as Paciente[]);
    }
    if (!sessoesRes.error) {
      setSessoes((sessoesRes.data || []) as Sessao[]);
    }
    if (!frequenciasRes.error) {
      setFrequencias((frequenciasRes.data || []) as Frequencia[]);
    }
  }

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
            <PageSkeleton linhas={6} />
          ) : (
            <>
            <div className="conta-tabs-bar" role="tablist" aria-label="Seções da conta">
              {ABAS_CONTA.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={aba === item.id}
                  className={aba === item.id ? "conta-tab is-active" : "conta-tab"}
                  onClick={() =>
                    router.replace(`/minha-clinica?aba=${item.id}`, {
                      scroll: false,
                    })
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            {aba === "perfil" ? (
            <section className="clinic-card clinic-data-card clinic-summary-card">
              <div className="clinic-data-banner clinic-edit-banner">
                <span>Perfil profissional e identidade da clínica</span>
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
            ) : null}

            {aba === "dados" ? (
            <div className="clinic-tools-grid">
              <PendenciasClinica
                itens={checklistCompleto}
                titulo="Pendências da clínica"
                linkPreferencias={false}
              />

              <section className="clinic-card clinic-tool-card clinic-tool-card-wide">
                <div className="clinic-tool-header">
                  <div>
                    <h2>Backup e exportação</h2>
                    <p>
                      Baixe cópias completas dos dados ou restaure um backup
                      anterior.
                    </p>
                  </div>
                </div>
                <div className="clinic-export-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={exportarPacientes}
                    disabled={pacientes.length === 0}
                  >
                    Baixar pacientes (CSV)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={exportarSessoes}
                    disabled={sessoes.length === 0}
                  >
                    Baixar sessões (CSV)
                  </button>
                </div>
                {userId ? (
                  <BackupClinicaPanel
                    userId={userId}
                    perfil={perfilBackup}
                    temDadosBasicos={
                      pacientes.length > 0 ||
                      sessoes.length > 0 ||
                      frequencias.length > 0
                    }
                    onConcluido={recarregarDadosClinica}
                  />
                ) : null}
              </section>

              <section className="clinic-card clinic-tool-card">
                <div className="clinic-tool-header">
                  <div>
                    <h2>Manutenção dos dados</h2>
                    <p>
                      Alinha presenças na frequência com sessões da agenda quando
                      algo parecer desatualizado.
                    </p>
                  </div>
                </div>
                <SincronizarDadosButton className="btn btn-outline" />
              </section>

              <section className="clinic-card clinic-tool-card clinic-tool-card-wide">
                <div className="clinic-tool-header">
                  <div>
                    <h2>Lembretes da rotina</h2>
                    <p>Alertas rápidos para acompanhar o dia a dia da clínica.</p>
                  </div>
                </div>
                <div className="clinic-insight-list clinic-insight-list-wide">
                  {lembretesRotina.map((item) => (
                    <div
                      key={item.id}
                      className={`clinic-insight-item${
                        item.tom === "warn" && item.valor > 0 ? " is-warn" : " is-ok"
                      }`}
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
            ) : null}

            {aba === "conta" ? (
              <div className="clinic-tools-grid conta-tab-grid">
                <ContaTemaPanel email={perfil?.email} />
                <section className="clinic-card clinic-tool-card">
                  <div className="clinic-tool-header">
                    <div>
                      <h2>Onde configurar o restante</h2>
                      <p>Preferências ficam perto de onde você usa.</p>
                    </div>
                  </div>
                  <ul className="conta-context-links">
                    <li>
                      <strong>Agenda</strong> — visualização, duração e valor padrão
                      (botão Configurar na própria Agenda).
                    </li>
                    <li>
                      <strong>Financeiro</strong> — comportamento do filtro de mês
                      (em Período do relatório).
                    </li>
                    <li>
                      <strong>Perfil e backup</strong> — abas Perfil e Dados desta
                      tela.
                    </li>
                  </ul>
                </section>
              </div>
            ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

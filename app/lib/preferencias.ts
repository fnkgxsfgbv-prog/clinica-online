import type { User } from "@supabase/supabase-js";

import { mesAtualChave } from "./mes";
import supabase from "./supabase";

export const PREFS_METADATA_KEY = "psicodesk_prefs";
export const PREFS_LOCAL_KEY = "psicodesk-prefs";
export const THEME_STORAGE_KEY = "psicodesk-theme";

export type TemaPreferencia = "light" | "dark";
export type MesModoPreferencia = "automatico" | "ultimo";
export type AgendaVisualizacao = "day" | "week" | "month";
export type AgendaModo = "geral" | "dia";

export type PreferenciasUsuario = {
  tema: TemaPreferencia;
  mesModo: MesModoPreferencia;
  mesUltimo: string;
  valorSessaoPadrao: string;
  duracaoSessaoMinutos: number;
  agendaVisualizacao: AgendaVisualizacao;
  agendaModo: AgendaModo;
  ocultarPacientesInativos: boolean;
  avisoViradaMes: boolean;
  emailResumoSemanal: boolean;
};

const DURACOES_VALIDAS = [30, 40, 45, 50, 60, 90] as const;

function normalizarTema(valor: unknown): TemaPreferencia {
  return valor === "light" ? "light" : "dark";
}

function normalizarMesModo(valor: unknown): MesModoPreferencia {
  return valor === "ultimo" ? "ultimo" : "automatico";
}

function normalizarAgendaVisualizacao(valor: unknown): AgendaVisualizacao {
  if (valor === "day" || valor === "month") return valor;
  return "week";
}

function normalizarAgendaModo(valor: unknown): AgendaModo {
  return valor === "dia" ? "dia" : "geral";
}

function normalizarDuracao(valor: unknown): number {
  const n = Number(valor);
  if (DURACOES_VALIDAS.includes(n as (typeof DURACOES_VALIDAS)[number])) {
    return n;
  }
  return 50;
}

function normalizarMesUltimo(valor: unknown): string {
  const mes = String(valor || "").trim();
  return /^\d{4}-\d{2}$/.test(mes) ? mes : "";
}

function normalizarBoolean(valor: unknown, padrao: boolean): boolean {
  if (typeof valor === "boolean") return valor;
  return padrao;
}

export function preferenciasPadrao(): PreferenciasUsuario {
  return {
    tema: "dark",
    mesModo: "automatico",
    mesUltimo: mesAtualChave(),
    valorSessaoPadrao: "",
    duracaoSessaoMinutos: 50,
    agendaVisualizacao: "week",
    agendaModo: "geral",
    ocultarPacientesInativos: false,
    avisoViradaMes: true,
    emailResumoSemanal: false,
  };
}

export function mesclarPreferencias(
  parcial?: Partial<PreferenciasUsuario> | null
): PreferenciasUsuario {
  const padrao = preferenciasPadrao();
  if (!parcial) return padrao;

  return {
    tema: normalizarTema(parcial.tema ?? padrao.tema),
    mesModo: normalizarMesModo(parcial.mesModo ?? padrao.mesModo),
    mesUltimo:
      normalizarMesUltimo(parcial.mesUltimo) ||
      normalizarMesUltimo(padrao.mesUltimo) ||
      mesAtualChave(),
    valorSessaoPadrao: String(parcial.valorSessaoPadrao ?? padrao.valorSessaoPadrao),
    duracaoSessaoMinutos: normalizarDuracao(
      parcial.duracaoSessaoMinutos ?? padrao.duracaoSessaoMinutos
    ),
    agendaVisualizacao: normalizarAgendaVisualizacao(
      parcial.agendaVisualizacao ?? padrao.agendaVisualizacao
    ),
    agendaModo: normalizarAgendaModo(parcial.agendaModo ?? padrao.agendaModo),
    ocultarPacientesInativos: normalizarBoolean(
      parcial.ocultarPacientesInativos,
      padrao.ocultarPacientesInativos
    ),
    avisoViradaMes: normalizarBoolean(
      parcial.avisoViradaMes,
      padrao.avisoViradaMes
    ),
    emailResumoSemanal: normalizarBoolean(
      parcial.emailResumoSemanal,
      padrao.emailResumoSemanal
    ),
  };
}

export function lerPreferenciasDeMetadata(
  metadata: Record<string, unknown> | null | undefined
): PreferenciasUsuario {
  const bruto = metadata?.[PREFS_METADATA_KEY];
  if (!bruto || typeof bruto !== "object") {
    return preferenciasPadrao();
  }
  return mesclarPreferencias(bruto as Partial<PreferenciasUsuario>);
}

export function lerPreferenciasLocal(): PreferenciasUsuario | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PREFS_LOCAL_KEY);
    if (!raw) return null;
    return mesclarPreferencias(JSON.parse(raw) as Partial<PreferenciasUsuario>);
  } catch {
    return null;
  }
}

export function gravarPreferenciasLocal(prefs: PreferenciasUsuario): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PREFS_LOCAL_KEY, JSON.stringify(prefs));
  window.localStorage.setItem(THEME_STORAGE_KEY, prefs.tema);
}

export function aplicarTemaNoDocumento(tema: TemaPreferencia): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = tema;
}

export function mesInicialPreferido(): string {
  const prefs = lerPreferenciasLocal();
  if (prefs?.mesModo === "ultimo" && prefs.mesUltimo) {
    return prefs.mesUltimo;
  }
  return mesAtualChave();
}

export function deveSeguirMesCalendario(): boolean {
  const prefs = lerPreferenciasLocal();
  return prefs?.mesModo !== "ultimo";
}

export function persistirMesSelecionado(mes: string): void {
  if (!mes) return;
  const prefs = lerPreferenciasLocal() ?? preferenciasPadrao();
  gravarPreferenciasLocal({ ...prefs, mesUltimo: mes });
}

let timerSalvarNuvem: number | undefined;

export function agendarSalvarPreferenciasNuvem(
  prefs: PreferenciasUsuario,
  delayMs = 800
): void {
  if (typeof window === "undefined") return;

  if (timerSalvarNuvem != null) window.clearTimeout(timerSalvarNuvem);
  timerSalvarNuvem = window.setTimeout(() => {
    void salvarPreferenciasUsuario(prefs);
  }, delayMs);
}

export async function carregarPreferenciasUsuario(
  user?: User | null
): Promise<PreferenciasUsuario> {
  const atual = user ?? (await supabase.auth.getUser()).data.user;
  if (!atual) {
    return lerPreferenciasLocal() ?? preferenciasPadrao();
  }

  const prefs = lerPreferenciasDeMetadata(atual.user_metadata || {});
  gravarPreferenciasLocal(prefs);
  aplicarTemaNoDocumento(prefs.tema);
  return prefs;
}

export async function salvarPreferenciasUsuario(
  prefs: PreferenciasUsuario
): Promise<{ error?: string }> {
  const normalizadas = mesclarPreferencias(prefs);
  gravarPreferenciasLocal(normalizadas);
  aplicarTemaNoDocumento(normalizadas.tema);

  const { data: userData } = await supabase.auth.getUser();
  const metadata = userData.user?.user_metadata || {};

  const { error } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      [PREFS_METADATA_KEY]: normalizadas,
    },
  });

  if (error) return { error: error.message };
  return {};
}

export const OPCOES_DURACAO_SESSAO = DURACOES_VALIDAS;

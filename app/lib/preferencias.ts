import type { User } from "@supabase/supabase-js";

import {
  normalizarDashboardBlocosOcultos,
  normalizarDashboardBlocosOrdem,
  ordemPadraoDashboard,
  type DashboardBlocoId,
} from "./dashboard-blocos";
import { mesAtualChave } from "./mes";
import supabase from "./supabase";

export const PREFS_METADATA_KEY = "psicodesk_prefs";
export const PREFS_LOCAL_KEY = "psicodesk-prefs";
export const DASHBOARD_LAYOUT_KEY = "psicodesk-dashboard-layout";
export const THEME_STORAGE_KEY = "psicodesk-theme";
export const AVISO_VIRADA_MES_KEY = "psicodesk-aviso-virada-mes";

export type TemaPreferencia = "light" | "dark" | "system";
export type TemaEfetivo = "light" | "dark";
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
  usarIaClinica: boolean;
  usarSugestaoPlanoPreSessao: boolean;
  dashboardBlocosOcultos: DashboardBlocoId[];
  dashboardBlocosOrdem: DashboardBlocoId[];
};

export type DashboardLayoutPreferencias = Pick<
  PreferenciasUsuario,
  "dashboardBlocosOcultos" | "dashboardBlocosOrdem"
>;

const DURACOES_VALIDAS = [30, 40, 45, 50, 60, 90] as const;

function normalizarTema(valor: unknown): TemaPreferencia {
  if (valor === "light" || valor === "dark" || valor === "system") {
    return valor;
  }
  return "dark";
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
    usarIaClinica: true,
    usarSugestaoPlanoPreSessao: true,
    dashboardBlocosOcultos: [],
    dashboardBlocosOrdem: ordemPadraoDashboard(),
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
    usarIaClinica: normalizarBoolean(
      parcial.usarIaClinica,
      padrao.usarIaClinica
    ),
    usarSugestaoPlanoPreSessao: normalizarBoolean(
      parcial.usarSugestaoPlanoPreSessao,
      padrao.usarSugestaoPlanoPreSessao
    ),
    dashboardBlocosOcultos: normalizarDashboardBlocosOcultos(
      parcial.dashboardBlocosOcultos ?? padrao.dashboardBlocosOcultos
    ),
    dashboardBlocosOrdem: normalizarDashboardBlocosOrdem(
      parcial.dashboardBlocosOrdem ?? padrao.dashboardBlocosOrdem
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
  gravarLayoutDashboardLocal({
    dashboardBlocosOcultos: prefs.dashboardBlocosOcultos,
    dashboardBlocosOrdem: prefs.dashboardBlocosOrdem,
  });
}

export function lerLayoutDashboardLocal(): DashboardLayoutPreferencias | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DashboardLayoutPreferencias>;
    return {
      dashboardBlocosOcultos: normalizarDashboardBlocosOcultos(
        parsed.dashboardBlocosOcultos
      ),
      dashboardBlocosOrdem: normalizarDashboardBlocosOrdem(
        parsed.dashboardBlocosOrdem
      ),
    };
  } catch {
    return null;
  }
}

export function gravarLayoutDashboardLocal(
  layout: DashboardLayoutPreferencias
): void {
  if (typeof window === "undefined") return;

  const normalizado: DashboardLayoutPreferencias = {
    dashboardBlocosOcultos: normalizarDashboardBlocosOcultos(
      layout.dashboardBlocosOcultos
    ),
    dashboardBlocosOrdem: normalizarDashboardBlocosOrdem(
      layout.dashboardBlocosOrdem
    ),
  };

  window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(normalizado));
}

function mesclarLayoutDashboard(
  prefs: PreferenciasUsuario
): PreferenciasUsuario {
  const layoutLocal = lerLayoutDashboardLocal();
  if (!layoutLocal) return prefs;

  return mesclarPreferencias({
    ...prefs,
    dashboardBlocosOcultos: layoutLocal.dashboardBlocosOcultos,
    dashboardBlocosOrdem: layoutLocal.dashboardBlocosOrdem,
  });
}

export function temaEfetivoDoSistema(): TemaEfetivo {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function resolverTemaEfetivo(tema: TemaPreferencia): TemaEfetivo {
  if (tema === "system") return temaEfetivoDoSistema();
  return tema;
}

/** Cor da barra do Safari / PsicoDesk (standalone). */
export const COR_BARRA_PSICODESK: Record<TemaEfetivo, string> = {
  dark: "#1a2027",
  light: "#eef2f5",
};

export function aplicarCorBarraPsicodesk(tema: TemaPreferencia): void {
  if (typeof document === "undefined") return;

  const cor = COR_BARRA_PSICODESK[resolverTemaEfetivo(tema)];
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", cor);
}

export function aplicarTemaNoDocumento(tema: TemaPreferencia): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolverTemaEfetivo(tema);
  aplicarCorBarraPsicodesk(tema);
}

export function inscreverMudancaTemaSistema(
  callback: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => callback();
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
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

export function deveMostrarAvisoViradaMes(): boolean {
  const prefs = lerPreferenciasLocal();
  return prefs?.avisoViradaMes !== false;
}

export function avisoViradaMesJaDispensado(mesAtual: string): boolean {
  if (typeof window === "undefined" || !mesAtual) return false;
  return window.localStorage.getItem(AVISO_VIRADA_MES_KEY) === mesAtual;
}

export function dispensarAvisoViradaMes(mesAtual: string): void {
  if (typeof window === "undefined" || !mesAtual) return;
  window.localStorage.setItem(AVISO_VIRADA_MES_KEY, mesAtual);
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

export function iaClinicaHabilitadaNasPreferencias(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return lerPreferenciasDeMetadata(metadata).usarIaClinica;
}

export async function carregarPreferenciasUsuario(
  user?: User | null
): Promise<PreferenciasUsuario> {
  const atual = user ?? (await supabase.auth.getUser()).data.user;
  if (!atual) {
    const local = lerPreferenciasLocal();
    return mesclarLayoutDashboard(local ?? preferenciasPadrao());
  }

  const prefs = mesclarLayoutDashboard(
    lerPreferenciasDeMetadata(atual.user_metadata || {})
  );
  gravarPreferenciasLocal(prefs);
  aplicarTemaNoDocumento(prefs.tema);
  return prefs;
}

export async function salvarPreferenciasUsuario(
  prefs: PreferenciasUsuario
): Promise<{ error?: string }> {
  const normalizadas = mesclarPreferencias(prefs);
  gravarPreferenciasLocal(normalizadas);
  gravarLayoutDashboardLocal({
    dashboardBlocosOcultos: normalizadas.dashboardBlocosOcultos,
    dashboardBlocosOrdem: normalizadas.dashboardBlocosOrdem,
  });
  aplicarTemaNoDocumento(normalizadas.tema);

  const { data: userData } = await supabase.auth.getUser();
  const metadata = userData.user?.user_metadata || {};

  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      [PREFS_METADATA_KEY]: normalizadas,
    },
  });

  if (error) return { error: error.message };

  if (data.user) {
    const confirmadas = mesclarLayoutDashboard(
      lerPreferenciasDeMetadata(data.user.user_metadata || {})
    );
    gravarPreferenciasLocal(confirmadas);
  }

  return {};
}

export const OPCOES_DURACAO_SESSAO = DURACOES_VALIDAS;

export const DASHBOARD_BLOCO_IDS = [
  "agenda-hoje",
  "metric-pacientes",
  "metric-sessoes",
  "metric-comparecimento",
  "metric-receita",
  "pendencias",
  "proximas-sessoes",
  "aniversariantes",
] as const;

export type DashboardBlocoId = (typeof DASHBOARD_BLOCO_IDS)[number];

export const DASHBOARD_BLOCO_LABELS: Record<DashboardBlocoId, string> = {
  "agenda-hoje": "Agenda de hoje",
  "metric-pacientes": "Pacientes ativos",
  "metric-sessoes": "Sessões hoje",
  "metric-comparecimento": "Comparecimento",
  "metric-receita": "Receita próximas",
  pendencias: "Pendências da clínica",
  "proximas-sessoes": "Próximas sessões",
  aniversariantes: "Aniversariantes do mês",
};

export function normalizarDashboardBlocosOcultos(
  valor: unknown
): DashboardBlocoId[] {
  if (!Array.isArray(valor)) return [];
  const validos = new Set<string>(DASHBOARD_BLOCO_IDS);
  return valor.filter(
    (item): item is DashboardBlocoId =>
      typeof item === "string" && validos.has(item)
  );
}

export function dashboardBlocoVisivel(
  id: DashboardBlocoId,
  ocultos: DashboardBlocoId[]
) {
  return !ocultos.includes(id);
}

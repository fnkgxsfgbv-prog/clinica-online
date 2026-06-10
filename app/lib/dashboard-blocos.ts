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

export type DashboardGrupoRender =
  | { tipo: "single"; id: DashboardBlocoId }
  | { tipo: "metrics"; ids: DashboardBlocoId[] };

export function ordemPadraoDashboard(): DashboardBlocoId[] {
  return [...DASHBOARD_BLOCO_IDS];
}

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

export function normalizarDashboardBlocosOrdem(
  valor: unknown
): DashboardBlocoId[] {
  const padrao = ordemPadraoDashboard();
  if (!Array.isArray(valor)) return padrao;

  const validos = new Set<string>(DASHBOARD_BLOCO_IDS);
  const ordem: DashboardBlocoId[] = [];

  for (const item of valor) {
    if (
      typeof item === "string" &&
      validos.has(item) &&
      !ordem.includes(item as DashboardBlocoId)
    ) {
      ordem.push(item as DashboardBlocoId);
    }
  }

  for (const id of padrao) {
    if (!ordem.includes(id)) ordem.push(id);
  }

  return ordem;
}

export function dashboardBlocoVisivel(
  id: DashboardBlocoId,
  ocultos: DashboardBlocoId[]
) {
  return !ocultos.includes(id);
}

export function blocosVisiveisOrdenados(
  ordem: DashboardBlocoId[],
  ocultos: DashboardBlocoId[]
) {
  return ordem.filter((id) => dashboardBlocoVisivel(id, ocultos));
}

export function moverBlocoDashboard(
  ordem: DashboardBlocoId[],
  id: DashboardBlocoId,
  direcao: "up" | "down"
): DashboardBlocoId[] {
  const idx = ordem.indexOf(id);
  if (idx < 0) return ordem;

  const delta = direcao === "up" ? -1 : 1;
  const novoIdx = idx + delta;
  if (novoIdx < 0 || novoIdx >= ordem.length) return ordem;

  const next = [...ordem];
  [next[idx], next[novoIdx]] = [next[novoIdx], next[idx]];
  return next;
}

export function blocoPodeSubir(ordem: DashboardBlocoId[], id: DashboardBlocoId) {
  return ordem.indexOf(id) > 0;
}

export function blocoPodeDescer(
  ordem: DashboardBlocoId[],
  id: DashboardBlocoId
) {
  const idx = ordem.indexOf(id);
  return idx >= 0 && idx < ordem.length - 1;
}

function isMetricBloco(id: DashboardBlocoId) {
  return id.startsWith("metric-");
}

/** Agrupa métricas consecutivas na ordem para manter o grid de indicadores. */
export function agruparBlocosDashboard(
  ordem: DashboardBlocoId[],
  ocultos: DashboardBlocoId[]
): DashboardGrupoRender[] {
  const visiveis = blocosVisiveisOrdenados(ordem, ocultos);
  const grupos: DashboardGrupoRender[] = [];

  for (const id of visiveis) {
    if (isMetricBloco(id)) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.tipo === "metrics") {
        ultimo.ids.push(id);
        continue;
      }
      grupos.push({ tipo: "metrics", ids: [id] });
      continue;
    }

    grupos.push({ tipo: "single", id });
  }

  return grupos;
}

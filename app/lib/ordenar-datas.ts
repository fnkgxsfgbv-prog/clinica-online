import { dataReferenciaISO } from "./financeiro";

export type OrdemCronologica = "asc" | "desc";

/** Timestamp local para comparar data + hora (ordem cronológica). */
export function timestampDataHora(
  data?: string | null,
  hora?: string | null
): number {
  const iso = dataReferenciaISO(data);
  if (!iso) return 0;

  const [ano, mes, dia] = iso.split("-").map(Number);
  const partesHora = String(hora || "00:00").trim().split(":");
  const h = Number(partesHora[0]);
  const m = Number(partesHora[1]);

  return new Date(
    ano,
    mes - 1,
    dia,
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
    0,
    0
  ).getTime();
}

export function compararCronologico(
  a: { data?: string | null; hora?: string | null },
  b: { data?: string | null; hora?: string | null },
  ordem: OrdemCronologica = "asc"
): number {
  const diff =
    timestampDataHora(a.data, a.hora) - timestampDataHora(b.data, b.hora);
  if (diff !== 0) return ordem === "asc" ? diff : -diff;

  return 0;
}

export function ordenarCronologico<T>(
  itens: T[],
  ler: (item: T) => { data?: string | null; hora?: string | null },
  ordem: OrdemCronologica = "asc"
): T[] {
  return [...itens].sort((x, y) => compararCronologico(ler(x), ler(y), ordem));
}

/** Chaves `AAAA-MM` em ordem cronológica. */
export function compararChaveMes(
  a: string,
  b: string,
  ordem: OrdemCronologica = "asc"
): number {
  if (a === "sem-data") return ordem === "asc" ? 1 : -1;
  if (b === "sem-data") return ordem === "asc" ? -1 : 1;

  const diff = a.localeCompare(b);
  return ordem === "asc" ? diff : -diff;
}

export function ordenarChavesMes(
  chaves: string[],
  ordem: OrdemCronologica = "asc"
): string[] {
  return [...chaves].sort((a, b) => compararChaveMes(a, b, ordem));
}

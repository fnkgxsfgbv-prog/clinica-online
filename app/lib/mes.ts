import { dataIsoHoje } from "./datas-paciente";
import { chaveMes } from "./frequencia-utils";

/** Chave `AAAA-MM` do mês civil atual (fuso local). */
export function mesAtualChave(): string {
  const m = chaveMes(dataIsoHoje());
  return m && m !== "sem-data" ? m : "";
}

const MES_CALENDARIO_KEY = "psicodesk-mes-calendario";
const LEGACY_FINANCEIRO_MES_KEY = "psicodesk-financeiro-mes-calendario";

/** Garante que o mês civil atual apareça nas opções do filtro. */
export function mesesComMesAtual(meses: string[]): string[] {
  const chaves = new Set(
    meses.filter((m) => m && m !== "sem-data")
  );
  const atual = mesAtualChave();
  if (atual) chaves.add(atual);
  return Array.from(chaves);
}

/**
 * Detecta virada de mês entre visitas (localStorage) e grava o mês civil atual.
 * Retorna `mudou: true` quando o usuário volta após o calendário ter virado.
 */
export function detectarViradaMesCalendario(): {
  mudou: boolean;
  mesAtual: string;
} {
  const mesAtual = mesAtualChave();
  if (typeof window === "undefined") {
    return { mudou: false, mesAtual };
  }

  const gravado =
    window.localStorage.getItem(MES_CALENDARIO_KEY) ??
    window.localStorage.getItem(LEGACY_FINANCEIRO_MES_KEY);

  if (mesAtual) {
    window.localStorage.setItem(MES_CALENDARIO_KEY, mesAtual);
  }

  return {
    mudou: Boolean(gravado && mesAtual && gravado !== mesAtual),
    mesAtual,
  };
}

/** Mês numérico `MM` → nome em português (capitalizado). */
export const NOME_MES_PT: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

/**
 * Rótulo legível a partir da chave `AAAA-MM` (ex.: saída de chaveMes) ou vazia / `sem-data`.
 */
/** Mês civil anterior à chave `AAAA-MM` (ou `null` se inválida). */
export function mesAnteriorChave(chave: string): string | null {
  if (!chave || chave === "sem-data") return null;
  const [anoStr, mesStr] = chave.split("-");
  let ano = Number(anoStr);
  let mes = Number(mesStr);
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
    return null;
  }
  mes -= 1;
  if (mes < 1) {
    mes = 12;
    ano -= 1;
  }
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function labelMesAno(chave: string): string {
  if (!chave) return "Todos os meses";
  if (chave === "sem-data") return "Sem data";

  const [ano, mes] = chave.split("-");
  const nome = NOME_MES_PT[mes];
  if (!nome || !ano) return chave;

  return `${nome} de ${ano}`;
}

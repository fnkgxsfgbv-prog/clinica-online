/**
 * Valores a tentar em `.eq("paciente_id", …)` quando o tipo no banco
 * pode não coincidir com o que veio da URL (ex.: "5" vs 5, "00012" vs 12).
 */
export function valoresPacienteIdParaQuery(
  pacienteId: string | number
): Array<string | number> {
  if (pacienteId == null || pacienteId === "") return [];

  const s = String(pacienteId).trim();
  if (!s) return [];

  const n = Number(s);
  if (!Number.isFinite(n)) return [s];

  if (String(n) === s) return [n];

  return [n, s];
}

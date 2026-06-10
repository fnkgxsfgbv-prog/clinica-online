export const STATUS_PACIENTE_OPCOES = [
  { value: "ativo", label: "Ativo" },
  { value: "alta", label: "Alta" },
  { value: "desistente", label: "Desistente" },
  { value: "inativo", label: "Inativo" },
  { value: "lista de espera", label: "Lista de espera" },
] as const;

export function rotuloStatusPaciente(status?: string | null) {
  const valor = String(status || "").trim() || "ativo";
  const opcao = STATUS_PACIENTE_OPCOES.find((item) => item.value === valor);
  return opcao?.label ?? valor;
}

export function classeStatusPaciente(status?: string | null) {
  const valor = String(status || "").trim() || "ativo";
  if (valor === "ativo") return "status-success";
  if (valor === "alta") return "status-warning";
  if (valor === "lista de espera") return "status-info";
  if (valor === "desistente") return "status-danger";
  return "status-neutral";
}

export function pacienteEstaAtivo(status?: string | null) {
  const valor = String(status || "").trim().toLowerCase();
  return !valor || valor === "ativo";
}

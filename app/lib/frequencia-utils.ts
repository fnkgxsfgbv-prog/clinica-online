import type { Frequencia, Paciente, Sessao } from "../types";
import { dataReferenciaISO } from "./financeiro";
import { normalizarNome } from "./status";

export function chaveMes(data?: string | null) {
  if (!data) return "sem-data";

  const texto = String(data).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}`;

  return "sem-data";
}

export function indicePacientes(pacientes: Paciente[]) {
  const porId = new Map<string, Paciente>();
  const porNome = new Map<string, Paciente>();

  for (const paciente of pacientes) {
    porId.set(String(paciente.id), paciente);
    const nome = normalizarNome(paciente.nome);
    if (nome && !porNome.has(nome)) {
      porNome.set(nome, paciente);
    }
  }

  return { porId, porNome };
}

export function resolverPaciente(
  porId: Map<string, Paciente>,
  porNome: Map<string, Paciente>,
  pacienteId?: string | number | null,
  pacienteNome?: string | null
): Paciente | undefined {
  if (pacienteId != null && pacienteId !== "") {
    const porIdDireto = porId.get(String(pacienteId));
    if (porIdDireto) return porIdDireto;
  }

  const nome = normalizarNome(pacienteNome);
  if (nome) return porNome.get(nome);
  return undefined;
}

/** Uma linha por sessão (id mais alto); entradas sem sessao_id permanecem todas. */
export function deduplicarFrequenciasPorSessao(
  frequencias: Frequencia[]
): Frequencia[] {
  const porSessao = new Map<string, Frequencia>();
  const semSessao: Frequencia[] = [];

  for (const f of frequencias) {
    if (f.sessao_id == null || f.sessao_id === "") {
      semSessao.push(f);
      continue;
    }
    const sid = String(f.sessao_id);
    const atual = porSessao.get(sid);
    if (!atual || Number(f.id) > Number(atual.id)) {
      porSessao.set(sid, f);
    }
  }

  return [...semSessao, ...porSessao.values()];
}

/** Chave estável paciente + data (para bloquear financeiro duplicado). */
export function chavePacienteData(
  pacienteId?: string | number | null,
  pacienteNome?: string | null,
  data?: string | null
): string | null {
  const iso = dataReferenciaISO(data);
  if (!iso) return null;
  if (pacienteId != null && pacienteId !== "") {
    return `id:${pacienteId}:${iso}`;
  }
  const nome = normalizarNome(pacienteNome);
  if (nome) return `nome:${nome}:${iso}`;
  return null;
}

/** Preenche data/nome/id em memória a partir de pacientes e sessões. */
export function enriquecerFrequencias(
  frequencias: Frequencia[],
  pacientes: Paciente[],
  sessoes: Sessao[]
): Frequencia[] {
  const { porId, porNome } = indicePacientes(pacientes);
  const sessoesPorId = new Map(sessoes.map((s) => [String(s.id), s]));

  return frequencias.map((f) => {
    const sessao =
      f.sessao_id != null ? sessoesPorId.get(String(f.sessao_id)) : undefined;

    const paciente =
      resolverPaciente(porId, porNome, f.paciente_id, f.paciente_nome) ??
      (sessao
        ? resolverPaciente(
            porId,
            porNome,
            sessao.paciente_id,
            sessao.paciente_nome
          )
        : undefined);

    return {
      ...f,
      paciente_id: paciente?.id ?? f.paciente_id ?? sessao?.paciente_id,
      paciente_nome:
        paciente?.nome ?? f.paciente_nome ?? sessao?.paciente_nome ?? null,
      data: f.data || sessao?.data || f.data,
    };
  });
}

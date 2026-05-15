import type { Frequencia, Paciente, Sessao } from "../types";
import {
  indicePacientes,
  resolverPaciente,
} from "./frequencia-utils";
import { parseValorBr } from "./moeda";
import { isStatusPresente } from "./status";

export type ResumoFinanceiro = {
  id: string | number;
  nome: string;
  presencas: number;
  valor: number;
  total: number;
};

function valorSessaoPaciente(paciente?: Paciente) {
  if (!paciente) return 0;
  return parseValorBr(paciente.valor_sessao ?? paciente.valor);
}

function valorPresenca(paciente: Paciente | undefined, sessao?: Sessao) {
  const valorSessao = parseValorBr(sessao?.valor);
  if (valorSessao > 0) return valorSessao;
  return valorSessaoPaciente(paciente);
}

function chavePaciente(paciente: Paciente) {
  return String(paciente.id);
}

function resolverPacienteFrequencia(
  porId: Map<string, Paciente>,
  porNome: Map<string, Paciente>,
  frequencia: Frequencia,
  sessoes: Sessao[]
) {
  const porNomeDireto = resolverPaciente(
    porId,
    porNome,
    null,
    frequencia.paciente_nome
  );
  if (porNomeDireto) return porNomeDireto;

  const porIdDireto = resolverPaciente(
    porId,
    porNome,
    frequencia.paciente_id,
    frequencia.paciente_nome
  );
  if (porIdDireto) return porIdDireto;

  if (frequencia.sessao_id != null) {
    const sessao = sessoes.find(
      (s) => String(s.id) === String(frequencia.sessao_id)
    );
    if (sessao) {
      return resolverPaciente(
        porId,
        porNome,
        sessao.paciente_id,
        sessao.paciente_nome
      );
    }
  }

  return undefined;
}

export function calcularResumoFinanceiro(
  pacientes: Paciente[],
  frequencias: Frequencia[],
  sessoes: Sessao[] = []
): ResumoFinanceiro[] {
  const { porId, porNome } = indicePacientes(pacientes);

  const resumos = new Map<
    string,
    {
      id: string | number;
      nome: string;
      presencas: number;
      total: number;
      paciente?: Paciente;
    }
  >();
  const sessoesContadas = new Set<string>();

  function obterResumo(chave: string, nome: string, paciente?: Paciente) {
    let item = resumos.get(chave);
    if (!item) {
      item = {
        id: paciente?.id ?? chave,
        nome: paciente?.nome ?? nome,
        presencas: 0,
        total: 0,
        paciente,
      };
      resumos.set(chave, item);
    } else if (paciente && !item.paciente) {
      item.paciente = paciente;
      item.id = paciente.id;
      item.nome = paciente.nome;
    }
    return item;
  }

  for (const frequencia of frequencias) {
    if (!isStatusPresente(frequencia.status)) continue;

    const paciente = resolverPacienteFrequencia(
      porId,
      porNome,
      frequencia,
      sessoes
    );

    const nomeExibicao =
      paciente?.nome || frequencia.paciente_nome || "Paciente";
    const chave = paciente
      ? chavePaciente(paciente)
      : `nome:${nomeExibicao}`;

    const resumo = obterResumo(chave, nomeExibicao, paciente);
    resumo.presencas += 1;

    if (frequencia.sessao_id != null) {
      sessoesContadas.add(String(frequencia.sessao_id));
    }

    const sessaoRelacionada = sessoes.find(
      (s) => String(s.id) === String(frequencia.sessao_id)
    );

    resumo.total += valorPresenca(paciente, sessaoRelacionada);
  }

  for (const sessao of sessoes) {
    if (!isStatusPresente(sessao.status)) continue;
    if (sessoesContadas.has(String(sessao.id))) continue;

    const paciente = resolverPaciente(
      porId,
      porNome,
      sessao.paciente_id,
      sessao.paciente_nome
    );

    if (!paciente) continue;

    const resumo = obterResumo(
      chavePaciente(paciente),
      paciente.nome,
      paciente
    );
    resumo.presencas += 1;
    sessoesContadas.add(String(sessao.id));
    resumo.total += valorPresenca(paciente, sessao);
  }

  return Array.from(resumos.values())
    .map((item) => ({
      id: item.id,
      nome: item.nome,
      presencas: item.presencas,
      valor:
        item.presencas > 0
          ? item.total / item.presencas
          : valorSessaoPaciente(item.paciente),
      total: item.total,
    }))
    .filter((item) => item.presencas > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
}

import type { Paciente, Sessao } from "../types";
import { dataReferenciaISO } from "./financeiro";
import { ordenarCronologico } from "./ordenar-datas";

export function dataIsoLocal(data: Date = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function dataIsoHoje() {
  return dataIsoLocal(new Date());
}

/** Dia civil seguinte a `AAAA-MM-DD` (fuso local). */
export function dataIsoAmanhaAPartirDe(dataIso: string): string {
  const iso = dataReferenciaISO(dataIso);
  if (!iso) return dataIsoHoje();
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() + 1);
  return dataIsoLocal(data);
}

export function criarDataLocalISO(data?: string | null) {
  const iso = dataReferenciaISO(data);
  if (!iso) return null;

  const [ano, mes, dia] = iso.split("-").map(Number);
  const parsed = new Date(ano, mes - 1, dia);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Exibe data civil em DD/MM/AAAA (nunca ISO AAAA-MM-DD). */
export function formatarDataPaciente(data?: string | null) {
  const iso = dataReferenciaISO(data);
  if (!iso) return "Não informada";

  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHoraSessao(
  data?: string | null,
  hora?: string | null
) {
  const dataFormatada = formatarDataPaciente(data);
  if (dataFormatada === "Não informada") return dataFormatada;

  const horaLimpa = String(hora || "").trim();
  return horaLimpa ? `${dataFormatada} às ${horaLimpa}` : dataFormatada;
}

export function calcularIdadeCronologica(dataNascimento?: string | null) {
  const nascimento = criarDataLocalISO(dataNascimento);
  if (!nascimento) return "Idade não informada";

  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  let dias = hoje.getDate() - nascimento.getDate();

  if (dias < 0) {
    meses -= 1;
    const ultimoDiaMesAnterior = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      0
    ).getDate();
    dias += ultimoDiaMesAnterior;
  }

  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  const partes = [`${anos} ${anos === 1 ? "ano" : "anos"}`];
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mês" : "meses"}`);
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "dia" : "dias"}`);

  return partes.join(", ");
}

export function formatarNascimentoComIdade(dataNascimento?: string | null) {
  const data = formatarDataPaciente(dataNascimento);
  if (data === "Não informada") return data;
  return `${data} (${calcularIdadeCronologica(dataNascimento)})`;
}

export function obterDataPrimeiraSessao(sessoes: Sessao[]) {
  const [primeira] = ordenarCronologico(
    sessoes,
    (sessao) => ({ data: sessao.data, hora: sessao.hora }),
    "asc"
  );

  if (!primeira?.data) return "Sem sessão registrada";
  return formatarDataPaciente(primeira.data);
}

export function listarAniversariantesDoMes(pacientes: Paciente[]) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();

  return pacientes
    .map((paciente) => {
      const nascimento = criarDataLocalISO(paciente.data_nascimento);
      if (!nascimento || nascimento.getMonth() !== mesAtual) return null;

      const aniversarioEsteAno = new Date(
        hoje.getFullYear(),
        nascimento.getMonth(),
        nascimento.getDate()
      );
      const diffDias = Math.ceil(
        (aniversarioEsteAno.getTime() - new Date(
          hoje.getFullYear(),
          hoje.getMonth(),
          hoje.getDate()
        ).getTime()) / 86400000
      );
      const idade = hoje.getFullYear() - nascimento.getFullYear();
      const fazAnos = diffDias >= 0 ? idade : idade;

      return {
        paciente,
        dia: nascimento.getDate(),
        data: formatarDataPaciente(paciente.data_nascimento),
        idade: fazAnos,
        diffDias,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.dia - b.dia);
}

export function rotuloDistanciaAniversario(diffDias: number) {
  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Amanhã";
  if (diffDias > 1) return `Em ${diffDias} dias`;
  if (diffDias === -1) return "Ontem";
  return `Foi há ${Math.abs(diffDias)} dias`;
}

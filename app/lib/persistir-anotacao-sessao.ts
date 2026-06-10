import { insertEvolucao, updateEvolucao } from "./db/evolucoes";
import { dataIsoHoje } from "./datas-paciente";
import { toFiniteNumberId } from "./id";
import {
  obterRegistroAnotacoesSessao,
  temConteudoTexto,
} from "./sessao-anotacoes";
import type { Evolucao, Sessao } from "../types";

export async function persistirAnotacaoSessao(params: {
  userId: string;
  sessao: Sessao;
  texto: string;
  evolucoes: Evolucao[];
}) {
  const { userId, sessao, texto, evolucoes } = params;
  const conteudo = texto.trim();
  if (!temConteudoTexto(conteudo)) {
    return { error: null, skipped: true as const };
  }

  const registro = obterRegistroAnotacoesSessao(evolucoes, sessao.id);
  const pacienteIdNumero = toFiniteNumberId(sessao.paciente_id);
  if (pacienteIdNumero == null) {
    return {
      error: {
        message:
          "Paciente inválido nesta sessão. Atualize a página e tente novamente.",
      },
      skipped: false as const,
    };
  }

  const payload = {
    user_id: userId,
    sessao_id: Number(sessao.id),
    paciente_id: pacienteIdNumero,
    data: dataIsoHoje(),
    status_sessao: "anotacoes_sessao",
    queixa: registro?.queixa || "",
    objetivo: registro?.objetivo || "",
    intervencao: registro?.intervencao || "",
    observacoes: conteudo,
    plano: registro?.plano || "",
    encaminhamentos: registro?.encaminhamentos || "",
  };

  const res = registro?.id
    ? await updateEvolucao(userId, registro.id, payload)
    : await insertEvolucao(payload);

  return { error: res.error, skipped: false as const };
}

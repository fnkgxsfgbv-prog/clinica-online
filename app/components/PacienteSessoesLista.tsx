"use client";

import { useRouter } from "next/navigation";

import type { Evolucao, Sessao } from "../types";

type SessaoComRotulo = Sessao & { rotuloDataHora?: string };

type Props = {
  sessoes: SessaoComRotulo[];
  anotacoesPorSessao: Record<string, Evolucao>;
  vazio: string;
};

function textoResumoAnotacao(texto?: string | null) {
  const limpo = String(texto || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return "";
  return limpo.length > 140 ? `${limpo.slice(0, 140)}…` : limpo;
}

function rotuloDataHora(sessao: SessaoComRotulo) {
  if (sessao.rotuloDataHora) return sessao.rotuloDataHora;

  const t = String(sessao.data ?? "").trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  let dia: string;
  let mes: string;
  let ano: string;

  if (iso) {
    ano = iso[1];
    mes = iso[2];
    dia = iso[3];
  } else if (br) {
    dia = br[1];
    mes = br[2];
    ano = br[3];
  } else {
    return t || "Data não informada";
  }

  const dataPt = `${dia}/${mes}/${ano}`;
  const h = String(sessao.hora ?? "").trim();
  return h ? `${dataPt} às ${h}` : dataPt;
}

export default function PacienteSessoesLista({
  sessoes,
  anotacoesPorSessao,
  vazio,
}: Props) {
  const router = useRouter();

  if (sessoes.length === 0) {
    return <p className="empty-text">{vazio}</p>;
  }

  return (
    <div className="session-list">
      {sessoes.map((s) => {
        const anotacoes = anotacoesPorSessao[String(s.id)];
        const preSessao = textoResumoAnotacao(anotacoes?.objetivo);
        const anotacaoSessao = textoResumoAnotacao(anotacoes?.observacoes);
        const observacaoSessao = textoResumoAnotacao(anotacoes?.plano);
        const temAnotacoes = preSessao || anotacaoSessao || observacaoSessao;

        return (
          <div key={s.id} className="lista-card patient-session-card">
            <div className="patient-session-main">
              <div>
                <strong>{rotuloDataHora(s)}</strong>
                <p>Status: {s.status || "Agendada"}</p>
              </div>

              {temAnotacoes ? (
                <div className="patient-session-notes-preview">
                  <strong>Anotações salvas nesta sessão</strong>
                  {preSessao ? (
                    <p>
                      <span>Pré-sessão:</span> {preSessao}
                    </p>
                  ) : null}
                  {anotacaoSessao ? (
                    <p>
                      <span>Anotações:</span> {anotacaoSessao}
                    </p>
                  ) : null}
                  {observacaoSessao ? (
                    <p>
                      <span>Observações:</span> {observacaoSessao}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="patient-session-no-notes">
                  Nenhuma anotação salva nesta sessão.
                </p>
              )}
            </div>

            <div className="patient-session-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => router.push(`/sessao/${s.id}`)}
              >
                Abrir sessão
              </button>
              <button
                type="button"
                className="btn btn-green"
                onClick={() => router.push(`/sessao/${s.id}?modo=anotacoes`)}
              >
                Ver anotações
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

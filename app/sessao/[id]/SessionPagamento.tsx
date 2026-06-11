"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import FlashMessage from "../../components/FlashMessage";
import { getCurrentUser } from "../../lib/auth";
import { getPacienteById } from "../../lib/db/pacientes";
import { FORMAS_PAGAMENTO } from "../../lib/forma-pagamento";
import {
  labelStatusPagamento,
  normalizarStatusPagamento,
  resumoPagamentoSessao,
  valorCobrancaSessao,
} from "../../lib/pagamento-sessao";
import type { Paciente, Sessao } from "../../types";

type CobrancaResposta = {
  tipo: "mercadopago" | "pix_estatico";
  valor: number;
  copiaCola: string;
  qrCodeBase64?: string;
  link?: string;
  paymentId?: string;
  status?: string;
};

type Props = {
  sessao: Sessao;
  onAtualizado: () => void;
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default function SessionPagamento({
  sessao,
  onAtualizado,
}: Props) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const resumo = useMemo(() => resumoPagamentoSessao(sessao), [sessao]);
  const valor = useMemo(
    () => valorCobrancaSessao(sessao, paciente),
    [sessao, paciente]
  );

  const [copiaCola, setCopiaCola] = useState(resumo.copiaCola);
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [linkPagamento, setLinkPagamento] = useState(resumo.link);
  const [statusPagamento, setStatusPagamento] = useState(resumo.status);
  const [formaPagamento, setFormaPagamento] = useState(
    sessao.forma_pagamento || "pix"
  );
  const [carregandoCobranca, setCarregandoCobranca] = useState(false);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    const atual = resumoPagamentoSessao(sessao);
    setCopiaCola(atual.copiaCola);
    setLinkPagamento(atual.link);
    setStatusPagamento(atual.status);
    setFormaPagamento(sessao.forma_pagamento || "pix");
  }, [
    sessao.id,
    sessao.status_pagamento,
    sessao.forma_pagamento,
    sessao.pagamento_pix_copia_cola,
    sessao.pagamento_link,
    sessao.pago_em,
  ]);

  useEffect(() => {
    async function carregarPaciente() {
      if (!sessao.paciente_id) return;

      const user = await getCurrentUser();
      if (!user) return;

      const { data } = await getPacienteById(user.id, sessao.paciente_id);
      if (data) setPaciente(data as Paciente);
    }

    void carregarPaciente();
  }, [sessao.paciente_id]);

  const verificarPagamento = useCallback(async () => {
    setVerificando(true);
    setErro("");

    try {
      const resposta = await fetch(`/api/pagamentos/sessao/${sessao.id}`);
      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErro(String(corpo.erro || "Não foi possível verificar o pagamento."));
        return;
      }

      setStatusPagamento(normalizarStatusPagamento(corpo.statusPagamento));
      setCopiaCola(String(corpo.copiaCola || ""));
      setLinkPagamento(String(corpo.link || ""));

      if (corpo.statusPagamento === "pago") {
        setMensagem("Pagamento confirmado.");
        onAtualizado();
      }
    } catch {
      setErro("Falha de rede ao verificar pagamento.");
    } finally {
      setVerificando(false);
    }
  }, [sessao.id, onAtualizado]);

  useEffect(() => {
    if (statusPagamento !== "pendente" || !sessao.pagamento_referencia) return;

    const timer = window.setInterval(() => {
      void verificarPagamento();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [statusPagamento, sessao.pagamento_referencia, verificarPagamento]);

  async function gerarCobranca() {
    setCarregandoCobranca(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(`/api/pagamentos/sessao/${sessao.id}`, {
        method: "POST",
      });
      const corpo = (await resposta.json()) as CobrancaResposta & { erro?: string };

      if (!resposta.ok) {
        setErro(String(corpo.erro || "Não foi possível gerar a cobrança."));
        return;
      }

      setCopiaCola(corpo.copiaCola || "");
      setQrCodeBase64(corpo.qrCodeBase64 || "");
      setLinkPagamento(corpo.link || "");
      setStatusPagamento("pendente");
      setFormaPagamento("pix");
      setMensagem(
        corpo.tipo === "mercadopago"
          ? "Cobrança Pix gerada. Aguardando pagamento."
          : "Código Pix gerado. Envie ao paciente ou peça para colar no app do banco."
      );
    } catch {
      setErro("Falha de rede ao gerar cobrança.");
    } finally {
      setCarregandoCobranca(false);
    }
  }

  async function copiarCodigoPix() {
    if (!copiaCola.trim()) return;

    try {
      await navigator.clipboard.writeText(copiaCola);
      setMensagem("Código Pix copiado.");
    } catch {
      setErro("Não foi possível copiar automaticamente. Selecione o código manualmente.");
    }
  }

  async function salvarPagamentoManual(status: "pago" | "pendente") {
    setSalvandoStatus(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(`/api/pagamentos/sessao/${sessao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusPagamento: status,
          formaPagamento: formaPagamento,
        }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErro(String(corpo.erro || "Erro ao salvar pagamento."));
        return;
      }

      setStatusPagamento(status);
      setMensagem(
        status === "pago" ? "Pagamento registrado." : "Pagamento marcado como pendente."
      );
      onAtualizado();
    } catch {
      setErro("Falha de rede ao salvar pagamento.");
    } finally {
      setSalvandoStatus(false);
    }
  }

  const statusClasse =
    statusPagamento === "pago"
      ? "is-pago"
      : statusPagamento === "cancelado"
        ? "is-cancelado"
        : "is-pendente";

  return (
    <section className="session-pagamento" aria-label="Pagamento da sessão">
      <div className="session-pagamento-header">
        <div>
          <strong>Pagamento</strong>
          <p>Cobrança direta pelo PsicoDesk — Pix ou registro manual.</p>
        </div>
        <span className={`session-pagamento-status ${statusClasse}`}>
          {labelStatusPagamento(statusPagamento)}
        </span>
      </div>

      <div className="session-pagamento-grid">
        <div className="session-pagamento-card">
          <span>Valor da sessão</span>
          <strong>{formatarMoeda(valor)}</strong>
        </div>
        {sessao.pago_em ? (
          <div className="session-pagamento-card">
            <span>Pago em</span>
            <strong>
              {new Date(sessao.pago_em).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </strong>
          </div>
        ) : null}
      </div>

      {statusPagamento !== "pago" ? (
        <div className="session-pagamento-acoes">
          <button
            type="button"
            className="btn btn-green"
            disabled={carregandoCobranca || valor <= 0}
            onClick={() => void gerarCobranca()}
          >
            {carregandoCobranca ? "Gerando…" : "Gerar cobrança Pix"}
          </button>

          {copiaCola ? (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void copiarCodigoPix()}
              >
                Copiar código Pix
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={verificando}
                onClick={() => void verificarPagamento()}
              >
                {verificando ? "Verificando…" : "Verificar pagamento"}
              </button>
            </>
          ) : null}

          {linkPagamento ? (
            <a
              className="btn btn-outline"
              href={linkPagamento}
              target="_blank"
              rel="noreferrer"
            >
              Abrir link de pagamento
            </a>
          ) : null}
        </div>
      ) : null}

      {copiaCola ? (
        <div className="session-pagamento-pix">
          {qrCodeBase64 ? (
            <img
              className="session-pagamento-qr"
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code Pix"
            />
          ) : null}
          <label className="session-pagamento-pix-label" htmlFor="pix-copia-cola">
            Pix copia e cola
          </label>
          <textarea
            id="pix-copia-cola"
            readOnly
            rows={4}
            value={copiaCola}
          />
        </div>
      ) : null}

      <div className="session-pagamento-manual">
        <label htmlFor="forma-pagamento">Forma de pagamento</label>
        <select
          id="forma-pagamento"
          value={formaPagamento}
          onChange={(event) => setFormaPagamento(event.target.value)}
        >
          {FORMAS_PAGAMENTO.map((forma) => (
            <option key={forma.id} value={forma.id}>
              {forma.label}
            </option>
          ))}
        </select>

        <div className="session-pagamento-manual-botoes">
          {statusPagamento !== "pago" ? (
            <button
              type="button"
              className="btn btn-outline"
              disabled={salvandoStatus}
              onClick={() => void salvarPagamentoManual("pago")}
            >
              Marcar como pago
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              disabled={salvandoStatus}
              onClick={() => void salvarPagamentoManual("pendente")}
            >
              Voltar para pendente
            </button>
          )}
        </div>
      </div>

      {valor <= 0 ? (
        <p className="session-pagamento-aviso">
          Informe o valor da sessão na agenda ou o valor padrão do paciente para
          gerar cobrança.
        </p>
      ) : null}

      {mensagem ? <FlashMessage kind="success">{mensagem}</FlashMessage> : null}
      {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
    </section>
  );
}

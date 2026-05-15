"use client";

import { useCallback, useEffect, useState } from "react";

import { getCurrentUser } from "../lib/auth";
import { carregarFrequenciasCompleto } from "../lib/db/frequencia";
import {
  calcularResumoFinanceiro,
  type ResumoFinanceiro,
} from "../lib/financeiro";
import { isStatusPresente } from "../lib/status";
import Janela from "../components/Janela";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default function FinanceiroPage() {
  const [dados, setDados] = useState<ResumoFinanceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const user = await getCurrentUser();

    if (!user) {
      setErro("Sessão expirada. Faça login novamente.");
      setDados([]);
      setCarregando(false);
      return;
    }

    const {
      pacientes,
      sessoes,
      frequencias,
      error: loadError,
    } = await carregarFrequenciasCompleto(user.id);

    if (loadError) {
      setErro(loadError.message);
      setDados([]);
      setCarregando(false);
      return;
    }

    const resumo = calcularResumoFinanceiro(
      pacientes,
      frequencias,
      sessoes
    );

    if (
      resumo.length === 0 &&
      (frequencias || []).some((f) => isStatusPresente(f.status))
    ) {
      setErro(
        "Há presenças na frequência, mas sem vínculo com pacientes. Tente sair e entrar de novo; se persistir, confira se está na conta correta."
      );
    }

    setDados(resumo);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const totalGeral = dados.reduce((acc, item) => acc + item.total, 0);
  const totalPresencas = dados.reduce(
    (acc, item) => acc + item.presencas,
    0
  );

  return (
    <div className="financeiro-page">
      <Janela titulo="Financeiro">
        <div className="financeiro-header">
          <div>
            <h1 className="financeiro-title">Resumo Financeiro</h1>
            <p className="financeiro-subtitle">
              Valores com base em presenças registradas na frequência.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void carregar()}
            disabled={carregando}
          >
            Atualizar
          </button>
        </div>

        {erro && <p className="financeiro-erro">{erro}</p>}

        <div className="financeiro-totais">
          <div className="financeiro-total-card">
            <span className="financeiro-total-label">Total geral</span>
            <strong className="financeiro-total-valor">
              {formatarMoeda(totalGeral)}
            </strong>
          </div>

          <div className="financeiro-total-card">
            <span className="financeiro-total-label">Presenças</span>
            <strong className="financeiro-total-valor">
              {totalPresencas}
            </strong>
          </div>

          <div className="financeiro-total-card">
            <span className="financeiro-total-label">Pacientes</span>
            <strong className="financeiro-total-valor">{dados.length}</strong>
          </div>
        </div>

        {carregando ? (
          <p className="empty-text">Carregando resumo...</p>
        ) : dados.length === 0 && !erro ? (
          <p className="empty-text">
            Nenhuma presença registrada ainda. Marque sessões como
            &quot;Presente&quot; na agenda ou na tela da sessão para gerar o
            resumo financeiro.
          </p>
        ) : (
          <div className="financeiro-lista">
            {dados.map((p) => (
              <div key={p.id} className="psico-row financeiro-row">
                <div>
                  <strong className="financeiro-paciente-nome">
                    {p.nome}
                  </strong>
                  <p className="financeiro-paciente-meta">
                    {p.presencas} presença(s)
                  </p>
                </div>

                <div className="financeiro-valores">
                  <span className="financeiro-valor-sessao">
                    {formatarMoeda(p.valor)} / sessão
                  </span>
                  <strong className="financeiro-valor-total">
                    {formatarMoeda(p.total)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </Janela>
    </div>
  );
}

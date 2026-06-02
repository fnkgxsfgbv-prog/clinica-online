"use client";

import Link from "next/link";
import { useState } from "react";

import FlashMessage from "../components/FlashMessage";
import Janela from "../components/Janela";
import SincronizarDadosButton from "../components/SincronizarDadosButton";
import { usePreferencias } from "../components/PreferenciasProvider";
import {
  OPCOES_DURACAO_SESSAO,
  type PreferenciasUsuario,
} from "../lib/preferencias";

export default function PreferenciasPage() {
  const { preferencias, carregando, salvando, atualizarPreferencias } =
    usePreferencias();
  const [form, setForm] = useState<PreferenciasUsuario | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const prefs = form ?? preferencias;
  const alterado = form !== null;

  function atualizarCampo<K extends keyof PreferenciasUsuario>(
    campo: K,
    valor: PreferenciasUsuario[K]
  ) {
    setForm((atual) => ({ ...(atual ?? preferencias), [campo]: valor }));
  }

  async function salvar() {
    setErro("");
    setMensagem("");
    const result = await atualizarPreferencias(prefs, { imediato: true });
    if (result.error) {
      setErro("Erro ao salvar preferências: " + result.error);
      return;
    }
    setForm(null);
    setMensagem("Preferências salvas na sua conta.");
  }

  function cancelar() {
    setForm(null);
    setErro("");
  }

  return (
    <div className="preferencias-page">
      <Janela titulo="Preferências">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
        {mensagem ? <FlashMessage kind="success">{mensagem}</FlashMessage> : null}

        {carregando ? (
          <p className="empty-text">Carregando preferências…</p>
        ) : (
          <>
            <p className="preferencias-intro">
              Configure o comportamento do PsicoDesk. As opções são salvas na sua
              conta e acompanham você em qualquer navegador.
            </p>

            <div className="preferencias-actions-top">
              {alterado ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={cancelar}
                    disabled={salvando}
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    className="btn btn-green"
                    onClick={() => void salvar()}
                    disabled={salvando}
                  >
                    {salvando ? "Salvando…" : "Salvar preferências"}
                  </button>
                </>
              ) : (
                <span className="preferencias-saved-hint">
                  Alterações locais são sincronizadas ao salvar.
                </span>
              )}
            </div>

            <div className="preferencias-grid">
              <section className="clinic-card preferencias-card">
                <h2>Aparência e período</h2>
                <p>Tema e comportamento do filtro de mês no Financeiro e Frequência.</p>

                <label className="preferencias-field">
                  <span>Tema</span>
                  <select
                    value={prefs.tema}
                    onChange={(e) =>
                      atualizarCampo(
                        "tema",
                        e.target.value === "light" ? "light" : "dark"
                      )
                    }
                  >
                    <option value="dark">Escuro</option>
                    <option value="light">Claro</option>
                  </select>
                </label>

                <label className="preferencias-field">
                  <span>Filtro de mês</span>
                  <select
                    value={prefs.mesModo}
                    onChange={(e) =>
                      atualizarCampo(
                        "mesModo",
                        e.target.value === "ultimo" ? "ultimo" : "automatico"
                      )
                    }
                  >
                    <option value="automatico">
                      Sempre o mês atual (acompanha virada do calendário)
                    </option>
                    <option value="ultimo">
                      Lembrar o último mês escolhido
                    </option>
                  </select>
                </label>

                <label className="preferencias-check">
                  <input
                    type="checkbox"
                    checked={prefs.avisoViradaMes}
                    onChange={(e) =>
                      atualizarCampo("avisoViradaMes", e.target.checked)
                    }
                  />
                  <span>Mostrar aviso quando o calendário virar de mês</span>
                </label>
              </section>

              <section className="clinic-card preferencias-card">
                <h2>Agenda e pacientes</h2>
                <p>Padrões ao agendar sessões e navegar na agenda.</p>

                <label className="preferencias-field">
                  <span>Visualização inicial da agenda</span>
                  <select
                    value={prefs.agendaVisualizacao}
                    onChange={(e) =>
                      atualizarCampo(
                        "agendaVisualizacao",
                        e.target.value === "day"
                          ? "day"
                          : e.target.value === "month"
                            ? "month"
                            : "week"
                      )
                    }
                  >
                    <option value="week">Semana</option>
                    <option value="day">Dia</option>
                    <option value="month">Mês</option>
                  </select>
                </label>

                <label className="preferencias-field">
                  <span>Modo da agenda</span>
                  <select
                    value={prefs.agendaModo}
                    onChange={(e) =>
                      atualizarCampo(
                        "agendaModo",
                        e.target.value === "dia" ? "dia" : "geral"
                      )
                    }
                  >
                    <option value="geral">Agenda geral</option>
                    <option value="dia">Sessões por dia</option>
                  </select>
                </label>

                <label className="preferencias-field">
                  <span>Duração padrão da sessão (minutos)</span>
                  <select
                    value={String(prefs.duracaoSessaoMinutos)}
                    onChange={(e) =>
                      atualizarCampo(
                        "duracaoSessaoMinutos",
                        Number(e.target.value)
                      )
                    }
                  >
                    {OPCOES_DURACAO_SESSAO.map((min) => (
                      <option key={min} value={min}>
                        {min} min
                      </option>
                    ))}
                  </select>
                </label>

                <label className="preferencias-field">
                  <span>Valor padrão para paciente novo</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 150,00"
                    value={prefs.valorSessaoPadrao}
                    onChange={(e) =>
                      atualizarCampo("valorSessaoPadrao", e.target.value)
                    }
                  />
                </label>

                <label className="preferencias-check">
                  <input
                    type="checkbox"
                    checked={prefs.ocultarPacientesInativos}
                    onChange={(e) =>
                      atualizarCampo("ocultarPacientesInativos", e.target.checked)
                    }
                  />
                  <span>Ocultar pacientes inativos na agenda</span>
                </label>
              </section>

              <section className="clinic-card preferencias-card">
                <h2>Sistema e dados</h2>
                <p>Alinhe presenças, frequência e sessões quando algo parecer desatualizado.</p>

                <SincronizarDadosButton
                  className="btn btn-green"
                  onConcluido={() =>
                    setMensagem("Sincronização concluída. Recarregue telas abertas se necessário.")
                  }
                />

                <div className="preferencias-status">
                  <strong>Status</strong>
                  <ul>
                    <li>Conta conectada ao Supabase</li>
                    <li>Preferências sincronizadas na nuvem ao salvar</li>
                    <li>Manutenção de frequência roda automaticamente na 1ª visita da aba</li>
                  </ul>
                </div>

                <p className="preferencias-help">
                  Backup completo e dados da clínica ficam em{" "}
                  <Link href="/minha-clinica">Minha clínica</Link>.
                </p>
              </section>

              <section className="clinic-card preferencias-card preferencias-card-wide">
                <h2>Guia rápido</h2>
                <div className="preferencias-help-grid">
                  <div>
                    <strong>Fechamento do mês</strong>
                    <p>
                      No Financeiro, use o bloco de fechamento para comparar totais
                      e exportar Excel do mês encerrado.
                    </p>
                  </div>
                  <div>
                    <strong>Sincronizar dados</strong>
                    <p>
                      Corrige vínculos entre presenças na frequência e sessões na
                      agenda. Use se o financeiro mostrar avisos de integração.
                    </p>
                  </div>
                  <div>
                    <strong>Documentos e PDFs</strong>
                    <p>
                      Nome da clínica, CRP e cidade (de Minha clínica) entram
                      automaticamente em PDFs e planilhas quando disponíveis.
                    </p>
                  </div>
                  <div>
                    <strong>E-mail semanal</strong>
                    <p>
                      <label className="preferencias-check preferencias-check-inline">
                        <input
                          type="checkbox"
                          checked={prefs.emailResumoSemanal}
                          onChange={(e) =>
                            atualizarCampo("emailResumoSemanal", e.target.checked)
                          }
                        />
                        <span>Quero receber resumo semanal (em breve)</span>
                      </label>
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {alterado ? (
              <div className="preferencias-actions-bottom">
                <button
                  type="button"
                  className="btn btn-green"
                  onClick={() => void salvar()}
                  disabled={salvando}
                >
                  {salvando ? "Salvando…" : "Salvar preferências"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </Janela>
    </div>
  );
}

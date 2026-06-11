"use client";

import Link from "next/link";

import { usePreferencias } from "./PreferenciasProvider";
import {
  aplicarTemaNoDocumento,
  preferenciasPadrao,
  type TemaPreferencia,
} from "../lib/preferencias";
import { TEXTO_PRIVACIDADE_IA } from "../lib/ia-aviso";

type Props = {
  email?: string;
};

export default function ContaTemaPanel({ email }: Props) {
  const { preferencias, salvando, atualizarPreferencias } = usePreferencias();

  function alterarTema(tema: TemaPreferencia) {
    aplicarTemaNoDocumento(tema);
    void atualizarPreferencias({ tema }, { salvarNuvem: true });
  }

  function restaurarPadroes() {
    const padrao = preferenciasPadrao();
    aplicarTemaNoDocumento(padrao.tema);
    void atualizarPreferencias(padrao, { salvarNuvem: true });
  }

  return (
    <section className="clinic-card clinic-tool-card">
      <div className="clinic-tool-header">
        <div>
          <h2>Aparência e conta</h2>
          <p>
            Tema do PsicoDesk e informações da sua sessão.
            {salvando ? " Salvando…" : null}
          </p>
        </div>
      </div>

      <div className="context-prefs-fields">
        {email ? (
          <div className="conta-info-row">
            <span className="context-prefs-label">E-mail da conta</span>
            <strong>{email}</strong>
          </div>
        ) : null}

        <label>
          <span className="context-prefs-label">Tema</span>
          <select
            value={preferencias.tema}
            onChange={(e) => alterarTema(e.target.value as TemaPreferencia)}
          >
            <option value="system">Padrão do sistema</option>
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
          </select>
          <span className="context-prefs-hint">
            Também disponível no menu do seu perfil (canto superior).
          </span>
        </label>

        <label className="context-prefs-check">
          <input
            type="checkbox"
            checked={preferencias.emailResumoSemanal}
            onChange={(e) =>
              void atualizarPreferencias(
                { emailResumoSemanal: e.target.checked },
                { salvarNuvem: true }
              )
            }
          />
          <span>
            Resumo semanal por e-mail{" "}
            <em className="conta-em-breve">(em breve)</em>
          </span>
        </label>
        <span className="context-prefs-hint">
          Sua preferência já fica salva; o envio automático será ativado em uma
          próxima atualização.
        </span>

        <div className="conta-ia-prefs">
          <h3>Recursos de IA</h3>
          <label className="context-prefs-check">
            <input
              type="checkbox"
              checked={preferencias.usarIaClinica}
              onChange={(e) =>
                void atualizarPreferencias(
                  { usarIaClinica: e.target.checked },
                  { salvarNuvem: true }
                )
              }
            />
            <span>Usar IA para organizar PDF e lembretes na sessão</span>
          </label>
          <span className="context-prefs-hint">{TEXTO_PRIVACIDADE_IA}</span>
        </div>

        <div className="conta-actions-row">
          <button
            type="button"
            className="btn btn-outline"
            onClick={restaurarPadroes}
            disabled={salvando}
          >
            Restaurar padrões do app
          </button>
        </div>

        <p className="conta-legal-links">
          <Link href="/termos">Termos de uso</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacidade">Privacidade</Link>
        </p>
      </div>
    </section>
  );
}

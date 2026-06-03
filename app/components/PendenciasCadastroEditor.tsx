"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import CidSearchSelect from "./CidSearchSelect";
import FlashMessage from "./FlashMessage";
import { getCurrentUser } from "../lib/auth";
import {
  rotuloCampoPendenciaCadastro,
  type PendenciaTipoId,
} from "../lib/checklist-clinica";
import { updatePaciente } from "../lib/db/pacientes";
import {
  extrairDataInicioAtendimento,
  limparObservacoesPaciente,
  salvarDataInicioNasObservacoes,
} from "../lib/paciente-metadata";
import { requireUserClient } from "../lib/require-user-client";
import { mensagemErroSupabase } from "../lib/supabase-error";
import type { Paciente } from "../types";

type Props = {
  tipo: PendenciaTipoId;
  pacientesIniciais: Paciente[];
  onListaAtualizada?: (restantes: number) => void;
};

export default function PendenciasCadastroEditor({
  tipo,
  pacientesIniciais,
  onListaAtualizada,
}: Props) {
  const router = useRouter();
  const [pendentes, setPendentes] = useState(pacientesIniciais);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      pacientesIniciais.map((paciente) => [
        String(paciente.id),
        valorInicialCampo(tipo, paciente),
      ])
    )
  );
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [salvandoTodos, setSalvandoTodos] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const rotuloCampo = rotuloCampoPendenciaCadastro(tipo);
  const preenchidos = useMemo(
    () =>
      pendentes.filter((paciente) =>
        String(valores[String(paciente.id)] || "").trim()
      ).length,
    [pendentes, valores]
  );

  function atualizarValor(id: string | number, valor: string) {
    setValores((atual) => ({ ...atual, [String(id)]: valor }));
  }

  function removerPaciente(id: string | number) {
    setPendentes((atual) => {
      const proximo = atual.filter((p) => String(p.id) !== String(id));
      onListaAtualizada?.(proximo.length);
      return proximo;
    });
  }

  async function salvarPaciente(paciente: Paciente, silencioso = false) {
    const chave = String(paciente.id);
    const valor = String(valores[chave] || "").trim();

    if (!valor) {
      if (!silencioso) {
        setErro(`Informe ${rotuloCampo.toLowerCase()} para ${paciente.nome}.`);
      }
      return false;
    }

    if (!silencioso) {
      setSalvandoId(chave);
    }
    setErro("");
    if (!silencioso) setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      if (!silencioso) setSalvandoId(null);
      return false;
    }

    const payload = montarPayloadPendencia(tipo, paciente, valor);
    const { error } = await updatePaciente(user.id, paciente.id, payload);

    if (error) {
      setErro(mensagemErroSupabase("salvar", error));
      if (!silencioso) setSalvandoId(null);
      return false;
    }

    removerPaciente(paciente.id);
    if (!silencioso) {
      setMensagem(`${paciente.nome} atualizado.`);
      setSalvandoId(null);
    }
    return true;
  }

  async function salvarTodosPreenchidos() {
    const fila = pendentes.filter((paciente) =>
      String(valores[String(paciente.id)] || "").trim()
    );

    if (fila.length === 0) {
      setErro("Preencha ao menos um campo antes de salvar.");
      return;
    }

    setSalvandoTodos(true);
    setErro("");
    setMensagem("");

    let salvos = 0;
    for (const paciente of fila) {
      const ok = await salvarPaciente(paciente, true);
      if (ok) salvos += 1;
      else break;
    }

    if (salvos > 0) {
      setMensagem(
        salvos === 1
          ? "1 paciente atualizado."
          : `${salvos} pacientes atualizados.`
      );
    }

    setSalvandoTodos(false);
  }

  if (pendentes.length === 0) {
    return (
      <section className="clinic-card clinic-tool-card">
        <div className="clinic-insight-item is-ok">
          <strong>0</strong>
          <div>
            <span>Nenhum item pendente</span>
            <p>Tudo certo nesta categoria.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="clinic-card clinic-tool-card clinic-tool-card-wide">
      <div className="clinic-tool-header">
        <div>
          <h2>
            {pendentes.length} {pendentes.length === 1 ? "paciente" : "pacientes"}
          </h2>
          <p>
            Preencha {rotuloCampo.toLowerCase()} na tabela e salve aqui mesmo —
            sem abrir ficha por ficha.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-green"
          disabled={salvandoTodos || preenchidos === 0}
          onClick={() => void salvarTodosPreenchidos()}
        >
          {salvandoTodos
            ? "Salvando…"
            : `Salvar preenchidos (${preenchidos})`}
        </button>
      </div>

      {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
      {mensagem ? <FlashMessage kind="success">{mensagem}</FlashMessage> : null}

      <div className="pendencias-table-wrap">
        <table className="pendencias-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>{rotuloCampo}</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pendentes.map((paciente) => {
              const chave = String(paciente.id);
              const salvando = salvandoId === chave || salvandoTodos;

              return (
                <tr key={chave}>
                  <td className="pendencias-table-nome">
                    <strong>{paciente.nome}</strong>
                    <Link href={`/paciente/${paciente.id}`} className="pendencias-table-link">
                      Abrir ficha
                    </Link>
                  </td>
                  <td>{renderCampo(tipo, chave, valores[chave] || "", (valor) =>
                    atualizarValor(chave, valor)
                  )}</td>
                  <td className="pendencias-table-acoes">
                    <button
                      type="button"
                      className="btn btn-green btn-sm"
                      disabled={salvando || !String(valores[chave] || "").trim()}
                      onClick={() => void salvarPaciente(paciente)}
                    >
                      {salvandoId === chave ? "Salvando…" : "Salvar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function valorInicialCampo(tipo: PendenciaTipoId, paciente: Paciente): string {
  switch (tipo) {
    case "cadastro-sem-telefone":
      return String(paciente.telefone || "");
    case "cadastro-sem-nascimento":
      return String(paciente.data_nascimento || "");
    case "cadastro-sem-cid":
      return String(paciente.cid || "");
    case "cadastro-sem-inicio":
      return extrairDataInicioAtendimento(paciente);
    case "cadastro-sem-valor":
      return String(paciente.valor_sessao || paciente.valor || "");
    default:
      return "";
  }
}

function montarPayloadPendencia(
  tipo: PendenciaTipoId,
  paciente: Paciente,
  valor: string
): Partial<Paciente> {
  switch (tipo) {
    case "cadastro-sem-telefone":
      return { telefone: valor };
    case "cadastro-sem-nascimento":
      return { data_nascimento: valor };
    case "cadastro-sem-cid":
      return { cid: valor };
    case "cadastro-sem-inicio":
      return {
        observacoes: salvarDataInicioNasObservacoes(
          limparObservacoesPaciente(paciente.observacoes),
          valor
        ),
      };
    case "cadastro-sem-valor":
      return { valor_sessao: valor };
    default:
      return {};
  }
}

function renderCampo(
  tipo: PendenciaTipoId,
  id: string,
  valor: string,
  onChange: (valor: string) => void
) {
  switch (tipo) {
    case "cadastro-sem-nascimento":
    case "cadastro-sem-inicio":
      return (
        <input
          type="date"
          className="psico-input pendencias-table-input"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "cadastro-sem-cid":
      return (
        <CidSearchSelect
          id={`pendencia-cid-${id}`}
          value={valor}
          onChange={onChange}
          label=""
        />
      );
    case "cadastro-sem-valor":
      return (
        <input
          type="text"
          inputMode="decimal"
          className="psico-input pendencias-table-input"
          placeholder="Ex.: 150,00"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          type="text"
          className="psico-input pendencias-table-input"
          placeholder="Telefone"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

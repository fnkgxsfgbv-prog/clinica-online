"use client";

import { useMemo, useState } from "react";

import {
  CID_PSICOLOGIA_OPCOES,
  extrairCodigosCid,
  formatarCidsParaSalvar,
} from "../lib/cid-psicologia";

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CidSearchSelect({
  value,
  onChange,
  id,
  label = "CID",
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label?: string;
}) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const codigosSelecionados = useMemo(() => extrairCodigosCid(value), [value]);

  const opcoesFiltradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return CID_PSICOLOGIA_OPCOES.slice(0, 18);

    return CID_PSICOLOGIA_OPCOES.filter((opcao) => {
      const texto = normalizar(
        `${opcao.codigo} ${opcao.nome} ${opcao.grupo}`
      );
      return texto.includes(termo);
    }).slice(0, 24);
  }, [busca]);

  function selecionar(codigo: string) {
    const proximos = codigosSelecionados.includes(codigo)
      ? codigosSelecionados
      : [...codigosSelecionados, codigo];

    onChange(formatarCidsParaSalvar(proximos));
    setBusca("");
    setAberto(true);
  }

  function remover(codigo: string) {
    onChange(
      formatarCidsParaSalvar(
        codigosSelecionados.filter((item) => item !== codigo)
      )
    );
  }

  return (
    <div className="cid-select-field">
      <label className="label-form" htmlFor={`${id}-search`}>
        {label}
      </label>
      <div className="cid-selected-value cid-selected-chips">
        {codigosSelecionados.length > 0 ? (
          codigosSelecionados.map((codigo) => (
            <button
              key={codigo}
              type="button"
              className="cid-chip"
              onClick={() => remover(codigo)}
              title="Remover CID"
            >
              {codigo}
              <span aria-hidden="true">×</span>
            </button>
          ))
        ) : (
          "Nenhum CID selecionado"
        )}
      </div>
      <input
        id={`${id}-search`}
        className="psico-input cid-search-input"
        value={busca}
        onFocus={() => setAberto(true)}
        onChange={(event) => {
          setBusca(event.target.value);
          setAberto(true);
        }}
        placeholder="Pesquisar CID por código ou nome..."
        autoComplete="off"
      />

      {aberto ? (
        <div className="cid-options-list">
          {opcoesFiltradas.length > 0 ? (
            opcoesFiltradas.map((opcao) => {
              const selecionado = codigosSelecionados.includes(opcao.codigo);

              return (
                <button
                  key={opcao.codigo}
                  type="button"
                  className={selecionado ? "is-selected" : ""}
                  onClick={() => selecionar(opcao.codigo)}
                >
                  <strong>{opcao.codigo}</strong>
                  <span>{opcao.nome}</span>
                  <small>{opcao.grupo}</small>
                </button>
              );
            })
          ) : (
            <p>Nenhum CID encontrado.</p>
          )}
        </div>
      ) : null}

      <div className="cid-select-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setAberto((atual) => !atual)}
        >
          {aberto ? "Fechar opções" : "Ver principais CIDs"}
        </button>
        {codigosSelecionados.length > 0 ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onChange("")}
          >
            Limpar CIDs
          </button>
        ) : null}
      </div>
    </div>
  );
}

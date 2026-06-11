import { describe, expect, it } from "vitest";

import { gerarPixCopiaCola } from "./pix-brcode";
import {
  normalizarStatusPagamento,
  referenciaPagamentoSessao,
  valorCobrancaSessao,
} from "./pagamento-sessao";
import type { Paciente, Sessao } from "../types";

describe("gerarPixCopiaCola", () => {
  it("gera payload Pix válido com valor", () => {
    const codigo = gerarPixCopiaCola({
      chave: "contato@psicodesk.app",
      valor: 150,
      nomeRecebedor: "Maria Silva",
      cidade: "São Paulo",
      txid: "S123",
    });

    expect(codigo.startsWith("000201")).toBe(true);
    expect(codigo.endsWith(codigo.slice(-4))).toBe(true);
    expect(codigo).toContain("br.gov.bcb.pix");
    expect(codigo).toContain("contato@psicodesk.app");
    expect(codigo).toContain("150.00");
  });

  it("exige chave Pix", () => {
    expect(() =>
      gerarPixCopiaCola({
        chave: "",
        nomeRecebedor: "Maria",
        cidade: "SP",
      })
    ).toThrow(/chave Pix/i);
  });
});

describe("pagamento-sessao", () => {
  it("calcula valor da sessão com fallback do paciente", () => {
    const sessao = { id: 1, paciente_id: 2, data: "2026-05-01", valor: 0 } as Sessao;
    const paciente = {
      id: 2,
      nome: "João",
      valor_sessao: "200",
    } as Paciente;

    expect(valorCobrancaSessao(sessao, paciente)).toBe(200);
  });

  it("normaliza status de pagamento", () => {
    expect(normalizarStatusPagamento("PAGO")).toBe("pago");
    expect(normalizarStatusPagamento("")).toBe("pendente");
  });

  it("monta referência externa estável", () => {
    expect(referenciaPagamentoSessao("user-1", 99)).toBe(
      "psicodesk:user-1:sessao:99"
    );
  });
});

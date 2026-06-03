import { describe, expect, it } from "vitest";

import {
  normalizarBackupClinica,
  resumoBackupClinica,
  refArquivoDocumento,
} from "./backup-clinica";
import type { Paciente, PacienteDocumento } from "../types";

describe("normalizarBackupClinica", () => {
  it("converte backup v1 para v2", () => {
    const payload = normalizarBackupClinica({
      versao: 1,
      exportadoEm: "2026-06-01T12:00:00.000Z",
      pacientes: [{ id: 1, nome: "Ana" } as Paciente],
      sessoes: [],
      frequencias: [],
    });

    expect(payload?.versao).toBe(2);
    expect(payload?.pacientes).toHaveLength(1);
    expect(payload?.evolucoes).toEqual([]);
  });

  it("rejeita versão desconhecida", () => {
    expect(normalizarBackupClinica({ versao: 99 })).toBeNull();
  });
});

describe("resumoBackupClinica", () => {
  it("conta arquivos omitidos", () => {
    const resumo = resumoBackupClinica({
      versao: 2,
      exportadoEm: "2026-06-01T12:00:00.000Z",
      pacientes: [],
      sessoes: [],
      frequencias: [],
      evolucoes: [],
      anamneses: [],
      formularios: [],
      documentos: [],
      arquivosDocumentos: [{ ref: "a", nome_arquivo: "x.pdf", omitido: true }],
      documentoModelos: [],
      formularioModelos: [],
      modeloArquivos: [],
      arquivosModelos: [],
    });

    expect(resumo.arquivosDocumentosOmitidos).toBe(1);
    expect(resumo.arquivosDocumentos).toBe(0);
  });
});

describe("refArquivoDocumento", () => {
  it("gera ref estável por id", () => {
    expect(
      refArquivoDocumento({ id: 42, paciente_id: 1 } as PacienteDocumento)
    ).toBe("doc:42");
  });
});

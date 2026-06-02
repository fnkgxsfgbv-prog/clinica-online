import { baixarBlob } from "./download";
import type { Frequencia, Paciente, Sessao } from "../types";

export type BackupClinicaPayload = {
  versao: 1;
  exportadoEm: string;
  pacientes: Paciente[];
  sessoes: Sessao[];
  frequencias: Frequencia[];
};

export function montarBackupClinica(
  pacientes: Paciente[],
  sessoes: Sessao[],
  frequencias: Frequencia[]
): BackupClinicaPayload {
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    pacientes,
    sessoes,
    frequencias,
  };
}

export function baixarBackupClinica(payload: BackupClinicaPayload): void {
  const stamp = payload.exportadoEm.slice(0, 10);
  const json = JSON.stringify(payload, null, 2);
  baixarBlob(
    new Blob([json], { type: "application/json;charset=utf-8" }),
    `psicodesk-backup-${stamp}.json`
  );
}

import { labelMesAno } from "./mes";
import {
  avisoViradaMesJaDispensado,
  deveMostrarAvisoViradaMes,
  deveSeguirMesCalendario,
  dispensarAvisoViradaMes,
} from "./preferencias";

export type AvisoViradaMes = {
  mesAnterior: string;
  mesAtual: string;
};

export function criarAvisoViradaMes(
  mudou: boolean,
  mesAnterior: string,
  mesAtual: string
): AvisoViradaMes | null {
  if (!mudou || !mesAtual || !mesAnterior) return null;
  if (!deveMostrarAvisoViradaMes()) return null;
  if (avisoViradaMesJaDispensado(mesAtual)) return null;
  return { mesAnterior, mesAtual };
}

export function textoAvisoViradaMes(aviso: AvisoViradaMes): string {
  const de = labelMesAno(aviso.mesAnterior);
  const para = labelMesAno(aviso.mesAtual);
  const ajuste = deveSeguirMesCalendario()
    ? " O filtro foi ajustado para o mês atual."
    : " Confira o mês selecionado nos filtros.";
  return `O calendário virou de ${de} para ${para}.${ajuste}`;
}

export { dispensarAvisoViradaMes };

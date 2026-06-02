"use client";

import FlashMessage from "./FlashMessage";
import {
  dispensarAvisoViradaMes,
  textoAvisoViradaMes,
  type AvisoViradaMes,
} from "../lib/aviso-virada-mes";

type Props = {
  aviso: AvisoViradaMes | null;
  onDispensar: () => void;
};

export default function AvisoViradaMesBanner({ aviso, onDispensar }: Props) {
  if (!aviso) return null;

  function dispensar() {
    if (!aviso) return;
    dispensarAvisoViradaMes(aviso.mesAtual);
    onDispensar();
  }

  return (
    <FlashMessage kind="info">
      <div className="aviso-virada-mes">
        <p>{textoAvisoViradaMes(aviso)}</p>
        <button
          type="button"
          className="btn btn-outline aviso-virada-mes-btn"
          onClick={dispensar}
        >
          Entendi
        </button>
      </div>
    </FlashMessage>
  );
}

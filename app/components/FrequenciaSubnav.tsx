"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FrequenciaSubnav() {
  const pathname = usePathname();
  const historicoAtivo = pathname.startsWith("/frequencia/historico");

  return (
    <nav className="frequencia-subnav" aria-label="Seções de frequência">
      <Link
        href="/frequencia"
        className={!historicoAtivo ? "frequencia-subnav-link is-active" : "frequencia-subnav-link"}
      >
        Controle do mês
      </Link>
      <Link
        href="/frequencia/historico"
        className={
          historicoAtivo ? "frequencia-subnav-link is-active" : "frequencia-subnav-link"
        }
      >
        Histórico
      </Link>
    </nav>
  );
}

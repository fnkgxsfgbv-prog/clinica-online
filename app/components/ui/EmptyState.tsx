import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
  titulo: string;
  descricao?: string;
  icone?: ReactNode;
  acao?: {
    rotulo: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  compact?: boolean;
  inline?: boolean;
};

export default function EmptyState({
  titulo,
  descricao,
  icone,
  acao,
  className = "",
  compact = false,
  inline = false,
}: Props) {
  return (
    <div
      className={`ds-empty${compact ? " ds-empty--compact" : ""}${
        inline ? " ds-empty--inline" : ""
      } ${className}`.trim()}
    >
      {icone ? <div className="ds-empty-icon">{icone}</div> : null}
      <strong className="ds-empty-title">{titulo}</strong>
      {descricao ? <p className="ds-empty-desc">{descricao}</p> : null}
      {acao ? (
        acao.href ? (
          <Link href={acao.href} className="btn btn-green ds-empty-action">
            {acao.rotulo}
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-green ds-empty-action"
            onClick={acao.onClick}
          >
            {acao.rotulo}
          </button>
        )
      ) : null}
    </div>
  );
}

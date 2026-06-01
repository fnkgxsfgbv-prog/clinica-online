import Link from "next/link";
import type { ReactNode } from "react";

import LoginLegalFooter from "./LoginLegalFooter";

type Props = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export default function LegalDocument({ title, updatedAt, children }: Props) {
  return (
    <div className="login-page legal-page-wrap">
      <article className="legal-document">
        <header className="legal-document-header">
          <Link href="/login" className="legal-back-link">
            ← Voltar ao login
          </Link>
          <h1>{title}</h1>
          <p className="legal-updated">Última atualização: {updatedAt}</p>
        </header>
        <div className="legal-document-body">{children}</div>
        <LoginLegalFooter />
      </article>
    </div>
  );
}

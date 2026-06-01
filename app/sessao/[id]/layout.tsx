import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sessão — PsicoDesk",
  description: "Detalhe da sessão, evolução e frequência.",
};

export default function SessaoLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

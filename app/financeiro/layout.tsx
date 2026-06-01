import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Financeiro — PsicoDesk",
  description: "Resumo financeiro por paciente.",
};

export default function FinanceiroLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

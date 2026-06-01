import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Entrar — PsicoDesk",
  description: "Acesso ao sistema.",
};

export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

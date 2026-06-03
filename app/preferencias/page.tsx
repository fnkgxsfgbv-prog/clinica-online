"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PreferenciasRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/minha-clinica?aba=conta");
  }, [router]);

  return (
    <div className="clinic-page">
      <p className="empty-text">Redirecionando para Minha clínica…</p>
    </div>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditarPacienteRedirect() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/pacientes/${id}/editar`);
    }
  }, [id, router]);

  return (
    <p style={{ color: "#94a3b8", padding: "24px" }}>
      Redirecionando...
    </p>
  );
}

import type { Metadata } from "next";

import LegalDocument from "../components/LegalDocument";

export const metadata: Metadata = {
  title: "Termos de uso — PsicoDesk",
  description: "Termos de uso do sistema PsicoDesk.",
};

export default function TermosPage() {
  return (
    <LegalDocument title="Termos de uso" updatedAt="22 de maio de 2026">
      <section>
        <h2>1. Aceite</h2>
        <p>
          Ao acessar o PsicoDesk você concorda com estes termos. O sistema é
          destinado a profissionais e equipes autorizadas pela titular da conta.
        </p>
      </section>

      <section>
        <h2>2. Uso permitido</h2>
        <p>Você deve utilizar o sistema para:</p>
        <ul>
          <li>Gestão legítima de consultório ou clínica de psicologia</li>
          <li>Registros compatíveis com o Código de Ética e a legislação</li>
          <li>Proteção da confidencialidade dos pacientes</li>
        </ul>
      </section>

      <section>
        <h2>3. Conta e senha</h2>
        <p>
          Cada profissional deve ter login próprio. Não compartilhe senha. Você
          é responsável pelas ações feitas na sua conta.
        </p>
      </section>

      <section>
        <h2>4. Disponibilidade</h2>
        <p>
          Buscamos manter o serviço disponível, mas podem ocorrer manutenções ou
          indisponibilidades temporárias. Recomendamos exportar backups
          periodicamente em Minha clínica.
        </p>
      </section>

      <section>
        <h2>5. Responsabilidade clínica</h2>
        <p>
          O PsicoDesk é ferramenta de apoio administrativo e de registro. O
          conteúdo clínico, diagnósticos e decisões terapêuticas são de
          responsabilidade exclusiva da profissional habilitada.
        </p>
      </section>

      <section>
        <h2>6. Alterações</h2>
        <p>
          Estes termos podem ser atualizados. A data no topo da página indica a
          versão vigente.
        </p>
      </section>
    </LegalDocument>
  );
}

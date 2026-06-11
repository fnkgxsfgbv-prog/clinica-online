import type { Metadata } from "next";

import LegalDocument from "../components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacidade e LGPD — PsicoDesk",
  description: "Política de privacidade e tratamento de dados pessoais.",
};

export default function PrivacidadePage() {
  return (
    <LegalDocument title="Privacidade e LGPD" updatedAt="28 de maio de 2026">
      <section>
        <h2>1. Quem somos</h2>
        <p>
          O PsicoDesk é um sistema de gestão para clínicas e consultórios de
          psicologia. Os dados são armazenados em infraestrutura na nuvem
          (Supabase e Vercel), com acesso restrito por conta de usuário.
        </p>
      </section>

      <section>
        <h2>2. Dados tratados</h2>
        <p>Podemos tratar, conforme o uso do sistema:</p>
        <ul>
          <li>Dados de login (e-mail, identificador de conta)</li>
          <li>Dados cadastrais de pacientes e responsáveis</li>
          <li>Registros clínicos: sessões, evoluções, anamneses, documentos</li>
          <li>Dados financeiros e de frequência vinculados ao atendimento</li>
        </ul>
        <p>
          Dados sensíveis de saúde devem ser inseridos apenas quando necessários
          ao atendimento e com base legal adequada (incluindo tutela da saúde e
          exercício profissional, conforme a LGPD).
        </p>
      </section>

      <section>
        <h2>3. Finalidade</h2>
        <p>
          Os dados são usados para organizar o consultório, registrar
          atendimentos, emitir documentos e apoiar a rotina administrativa da
          profissional responsável pela conta.
        </p>
      </section>

      <section>
        <h2>4. Compartilhamento</h2>
        <p>
          Não vendemos dados. O acesso técnico fica limitado aos provedores de
          hospedagem e banco de dados necessários para operar o serviço. Cada
          conta de usuário enxerga apenas os próprios pacientes e registros
          (isolamento por profissional).
        </p>
      </section>

      <section id="ia">
        <h2>5. Recursos de inteligência artificial (opcional)</h2>
        <p>
          Algumas funções do PsicoDesk podem usar modelos de linguagem via Vercel
          AI Gateway, somente quando você ativa &quot;Recursos de IA&quot; em Minha
          clínica. Nesse caso, trechos do plano terapêutico e, quando aplicável,
          um resumo da última evolução clínica podem ser enviados para gerar
          lembretes de sessão ou organizar planos importados de PDF.
        </p>
        <ul>
          <li>
            Não enviamos o nome completo do paciente nesses prompts de IA.
          </li>
          <li>
            Os resultados são sugestões de apoio; não substituem julgamento
            clínico nem diagnóstico.
          </li>
          <li>
            Você pode desativar a IA a qualquer momento; o sistema continua com
            resumos automáticos locais do plano.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Segurança</h2>
        <p>
          Utilizamos autenticação, conexão criptografada (HTTPS) e políticas de
          acesso no banco (RLS). Recomendamos senha forte, não compartilhar
          login e usar o endereço oficial do sistema em produção.
        </p>
      </section>

      <section>
        <h2>7. Retenção e exclusão</h2>
        <p>
          Os registros permanecem enquanto a conta estiver ativa e forem
          necessários ao consultório. A profissional pode exportar dados em
          Minha clínica e solicitar orientação sobre exclusão de conta ou
          registros ao responsável pelo sistema.
        </p>
      </section>

      <section>
        <h2>8. Direitos do titular (LGPD)</h2>
        <p>
          Pacientes e titulares podem solicitar informações, correção ou
          exclusão, quando aplicável, entrando em contato com a psicóloga
          responsável pelo tratamento (controladora do caso clínico) ou com o
          canal de suporte indicado pela clínica que utiliza o PsicoDesk.
        </p>
      </section>

      <section>
        <h2>9. Contato</h2>
        <p>
          Dúvidas sobre esta política: utilize o canal de suporte da sua clínica
          ou o e-mail de contato informado no cadastro da conta PsicoDesk.
        </p>
      </section>
    </LegalDocument>
  );
}

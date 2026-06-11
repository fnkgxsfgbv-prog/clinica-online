import { resolverConfigOpenAi } from "./openai-config";

const TIMEOUT_MS = 25_000;
const MAX_RETRIES = 1;

export type MensagemModeloClinico = {
  role: "system" | "user";
  content: string;
};

export type OpcoesModeloClinico = {
  messages: MensagemModeloClinico[];
  temperature?: number;
  responseFormat?: "json_object" | "text";
  /** Trunca só a mensagem do usuário (ex.: PDF longo). */
  maxCharsConteudoUsuario?: number;
};

type RespostaChat = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

function truncarMensagens(
  messages: MensagemModeloClinico[],
  maxCharsConteudoUsuario?: number
): MensagemModeloClinico[] {
  if (!maxCharsConteudoUsuario) return messages;

  return messages.map((msg) =>
    msg.role === "user" && msg.content.length > maxCharsConteudoUsuario
      ? { ...msg, content: msg.content.slice(0, maxCharsConteudoUsuario) }
      : msg
  );
}

export async function chamarModeloClinico(
  opcoes: OpcoesModeloClinico
): Promise<string> {
  const { apiKey, baseUrl, model } = resolverConfigOpenAi();
  if (!apiKey) {
    throw new Error("IA indisponível: credenciais não configuradas.");
  }

  const body = {
    model,
    temperature: opcoes.temperature ?? 0.3,
    ...(opcoes.responseFormat === "json_object"
      ? { response_format: { type: "json_object" as const } }
      : {}),
    messages: truncarMensagens(
      opcoes.messages,
      opcoes.maxCharsConteudoUsuario
    ),
  };

  let ultimoErro: Error | null = null;

  for (let tentativa = 0; tentativa <= MAX_RETRIES; tentativa += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const resposta = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const corpo = (await resposta.json()) as RespostaChat;
      if (!resposta.ok) {
        throw new Error(
          corpo.error?.message || `Erro na IA (${resposta.status}).`
        );
      }

      const conteudo = corpo.choices?.[0]?.message?.content?.trim() || "";
      if (!conteudo) {
        throw new Error("A IA retornou resposta vazia.");
      }

      return conteudo;
    } catch (error) {
      ultimoErro =
        error instanceof Error
          ? error.name === "AbortError"
            ? new Error("Tempo esgotado ao consultar a IA.")
            : error
          : new Error("Erro ao consultar a IA.");
      if (tentativa < MAX_RETRIES) continue;
    } finally {
      clearTimeout(timer);
    }
  }

  throw ultimoErro ?? new Error("Erro ao consultar a IA.");
}

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import FlashMessage from "../../components/FlashMessage";
import LoginLegalFooter from "../../components/LoginLegalFooter";
import { mensagemErroAuth } from "../../lib/auth-messages";
import { loginRedirectPath } from "../../lib/site-url";
import supabase from "../../lib/supabase";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: loginRedirectPath("/login/redefinir-senha") }
      );

      if (error) {
        setErro(mensagemErroAuth(error));
        return;
      }

      setEnviado(true);
    } catch (caught) {
      setErro(mensagemErroAuth(caught as Parameters<typeof mensagemErroAuth>[0]));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Recuperar senha</h1>
        <p className="login-subtitle">
          Enviaremos um link para o seu e-mail. O link abre o PsicoDesk para você
          definir uma nova senha.
        </p>

        {enviado ? (
          <FlashMessage kind="success">
            Se existir uma conta com esse e-mail, você receberá o link em instantes.
            Verifique também a pasta de spam.
          </FlashMessage>
        ) : null}

        {erro ? (
          <FlashMessage kind="error" id="esqueci-erro">
            {erro}
          </FlashMessage>
        ) : null}

        {!enviado ? (
          <>
            <label className="login-field-label" htmlFor="esqueci-email">
              Email
            </label>
            <input
              id="esqueci-email"
              className="psico-input"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={enviando}
            />
            <button
              className="btn btn-green"
              type="submit"
              disabled={enviando}
            >
              {enviando ? "Enviando…" : "Enviar link"}
            </button>
          </>
        ) : null}

        <Link className="login-text-link" href="/login">
          Voltar ao login
        </Link>
      </form>
      <LoginLegalFooter />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import FlashMessage from "../components/FlashMessage";
import LoginLegalFooter from "../components/LoginLegalFooter";
import { mensagemErroLogin } from "../lib/auth-messages";
import supabase from "../lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const senhaAtualizada = searchParams.get("senha") === "atualizada";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErro(mensagemErroLogin(error));
        return;
      }
    } catch (caught) {
      setErro(mensagemErroLogin(caught as Parameters<typeof mensagemErroLogin>[0]));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h1>PsicoDesk</h1>
        <p className="login-subtitle">Acesse sua conta</p>

        {senhaAtualizada ? (
          <FlashMessage kind="success">
            Senha atualizada com sucesso. Faça login com a nova senha.
          </FlashMessage>
        ) : null}

        {erro ? (
          <FlashMessage kind="error" id="login-erro">
            {erro}
          </FlashMessage>
        ) : null}

        <label className="login-field-label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className="psico-input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "login-erro" : undefined}
        />

        <label className="login-field-label" htmlFor="login-password">
          Senha
        </label>
        <input
          id="login-password"
          className="psico-input"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "login-erro" : undefined}
        />

        <Link className="login-text-link login-forgot-link" href="/login/esqueci-senha">
          Esqueci minha senha
        </Link>

        <button className="btn btn-green" type="submit">
          Entrar
        </button>
      </form>
      <LoginLegalFooter />
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="login-page login-page-loading">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}

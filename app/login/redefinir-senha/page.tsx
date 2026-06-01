"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import FlashMessage from "../../components/FlashMessage";
import LoginLegalFooter from "../../components/LoginLegalFooter";
import { mensagemErroAuth } from "../../lib/auth-messages";
import supabase from "../../lib/supabase";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPronto(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronto(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    if (password.length < 8) {
      setErro("Use pelo menos 8 caracteres na nova senha.");
      return;
    }

    if (password !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErro(mensagemErroAuth(error));
        return;
      }

      await supabase.auth.signOut();
      router.push("/login?senha=atualizada");
      router.refresh();
    } catch (caught) {
      setErro(mensagemErroAuth(caught as Parameters<typeof mensagemErroAuth>[0]));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Nova senha</h1>

        {!pronto ? (
          <>
            <p className="login-subtitle">
              Abra o link que enviamos por e-mail neste navegador. Se o link
              expirou, solicite outro em &quot;Esqueci minha senha&quot;.
            </p>
            <Link className="login-text-link" href="/login/esqueci-senha">
              Solicitar novo link
            </Link>
          </>
        ) : (
          <>
            <p className="login-subtitle">Defina a nova senha da sua conta.</p>

            {erro ? (
              <FlashMessage kind="error" id="redefinir-erro">
                {erro}
              </FlashMessage>
            ) : null}

            <label className="login-field-label" htmlFor="nova-senha">
              Nova senha
            </label>
            <input
              id="nova-senha"
              className="psico-input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={salvando}
            />

            <label className="login-field-label" htmlFor="confirmar-senha">
              Confirmar senha
            </label>
            <input
              id="confirmar-senha"
              className="psico-input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
              disabled={salvando}
            />

            <button
              className="btn btn-green"
              type="submit"
              disabled={salvando}
            >
              {salvando ? "Salvando…" : "Salvar nova senha"}
            </button>
          </>
        )}

        <Link className="login-text-link" href="/login">
          Voltar ao login
        </Link>
      </form>
      <LoginLegalFooter />
    </div>
  );
}

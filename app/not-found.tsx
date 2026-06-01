import Link from "next/link";

export default function NotFound() {
  return (
    <div className="login-page">
      <div className="login-card status-page-card">
        <h1>Página não encontrada</h1>
        <p className="login-subtitle">
          O endereço que você abriu não existe ou foi movido.
        </p>
        <div className="status-page-actions">
          <Link className="btn btn-green" href="/">
            Ir ao painel
          </Link>
          <Link className="btn btn-outline" href="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

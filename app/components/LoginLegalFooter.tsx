import Link from "next/link";

export default function LoginLegalFooter() {
  return (
    <footer className="login-legal-footer">
      <Link href="/privacidade">Privacidade e LGPD</Link>
      <span aria-hidden="true">·</span>
      <Link href="/termos">Termos de uso</Link>
    </footer>
  );
}

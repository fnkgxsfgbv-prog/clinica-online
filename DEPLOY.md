## Colocar no ar (Vercel)

### Caminho mais prático (o seu caso)

O código já aponta para **`fnkgxsfgbv-prog/clinica-online`**. Faltam **só 2 coisas**:

**A) Enviar os commits do Mac para o GitHub** (uma vez; o Cursor não tem sua senha):

```bash
cd /Users/jpcoutinho/clinica-online
GITHUB_TOKEN=ghp_SEU_TOKEN_AQUI npm run push:github
```

([Criar token](https://github.com/settings/tokens) → classic → marcar **repo**.)

**B) Na Vercel** → **Add New → Project** → **Add GitHub Account** / autorize a conta **`fnkgxsfgbv-prog`** → importe **`fnkgxsfgbv-prog/clinica-online`** → nas variáveis de ambiente coloque `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Deploy**.

Depois do deploy: `npm run production:sync-supabase-auth -- https://SUA_URL.vercel.app` (com `SUPABASE_ACCESS_TOKEN` no `.env.local`).

---

### 1. Repositório no GitHub (primeira vez)

Se o repo **ainda não existe** na conta que a Vercel usa (`joaopcvoliveira-sudo`):

1. Crie um [Personal Access Token](https://github.com/settings/tokens) com permissão **repo** (classic) ou fine-grained com escrita no repositório.
2. No projeto:

```bash
cd /Users/jpcoutinho/clinica-online
GITHUB_TOKEN=ghp_SEU_TOKEN \
GITHUB_OWNER=joaopcvoliveira-sudo \
  npm run github:init-push
```

Isso cria `joaopcvoliveira-sudo/clinica-online` (privado), ajusta `origin` e faz `git push`.

Se o repo **já existir** e só faltar enviar commits:

```bash
git push -u origin main
```

### 2. Vercel — forma mais simples

1. Abra [vercel.com](https://vercel.com) e faça login.
2. **Add New… → Project** → importe `fnkgxsfgbv-prog/clinica-online`.
3. Em **Environment Variables**, adicione (copie do seu `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. Anote a URL (ex.: `https://clinica-online-xxx.vercel.app`).

Com isso, cada `git push` na `main` gera um deploy novo (integração Git da Vercel).
O workflow `.github/workflows/vercel-production.yml` **só roda** se você criar também os secrets `VERCEL_*` lá no GitHub; senão você pode ignorá-lo ou apagar o arquivo para não confusion.

### 3. Supabase — login na URL de produção

Com a URL da Vercel em mãos e um **personal access token** do Supabase
([tokens](https://supabase.com/dashboard/account/tokens), com permissão de auth/config):

Coloque em `.env.local`:

```bash
SUPABASE_ACCESS_TOKEN=sbp_...
```

Rode:

```bash
npm run production:sync-supabase-auth -- https://SUA_URL.vercel.app
```

Isso atualiza **Site URL** e **Redirect URLs** do Auth para incluir seu domínio de produção (e mantém `localhost`).

### 4. Confirmar na Vercel

No projeto na Vercel → **Settings → Environment Variables**:
Production / Preview devem ter as mesmas variáveis `NEXT_PUBLIC_*` que funcionam localmente.

### 5. Testar produção na máquina (opcional)

```bash
npm run preview:prod
```

Serve em `http://localhost:3000` usando build de produção (sem hospedar).

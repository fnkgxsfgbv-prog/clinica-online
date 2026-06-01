## Site “de verdade” (sem manter o Cursor / VS Code aberto)

**URL atual:** https://clinica-online-ten.vercel.app/login

**Publicar mudanças:** `npm run site:deploy`

**App PsicoDesk no Mac (Dock):** após mudar de localhost para produção, rode `npm run psicodesk:producao`, feche o app (Cmd+Q) e abra de novo.

**Pacote comercial (recomendado):** `npm run producao:comercial` — deploy + sync Auth (se `SUPABASE_ACCESS_TOKEN` estiver no `.env.local`).

### Domínio próprio (ex.: `app.suaclinica.com.br`)

1. Vercel → projeto **clinica-online** → **Settings → Domains** → Add.
2. No registrador do domínio, crie o registro DNS que a Vercel indicar (geralmente CNAME).
3. Atualize `NEXT_PUBLIC_SITE_URL` no `.env.local` e na Vercel.
4. Rode de novo: `npm run production:sync-supabase-auth -- https://SEU_DOMINIO`
5. Rode `npm run psicodesk:producao` com `PRODUCTION_URL=https://SEU_DOMINIO`

### Recuperação de senha

Fluxo: `/login/esqueci-senha` → e-mail Supabase → `/login/redefinir-senha`.

No Supabase Dashboard → **Authentication → URL Configuration**, inclua:

- `https://clinica-online-ten.vercel.app/login/redefinir-senha` (ou seu domínio)

O script `production:sync-supabase-auth` já adiciona `/**` do domínio de produção.

O programa de desenvolvimento só serve para **editar código**. Para **usar a clínica no dia a dia**, o site tem de estar **hospedado** (ex.: Vercel). Passo típico:

1. **Conta na [Vercel](https://vercel.com)** e projeto ligado ao teu repositório GitHub **ou** deploy pela CLI (abaixo).
2. **Variáveis de ambiente** na Vercel: as mesmas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` que tens no `.env.local`.
3. **Login na produção**: depois do primeiro deploy, corre (com `SUPABASE_ACCESS_TOKEN` no `.env.local`):

   `npm run production:sync-supabase-auth -- https://TEU_DOMINIO.vercel.app`

4. Abres o **URL da Vercel** no browser e usas a app como cliente final — **podes fechar o editor**.

Atalhos: `npm run vercel:bootstrap` (deploy a partir da pasta, vê secção abaixo) ou `npm run vercel:deploy` se o projeto já estiver ligado.

---

## Colocar no ar (Vercel)

### Tudo num comando (recomendado)

Não precisa de importar o GitHub na UI da Vercel: o deploy usa o código **desta pasta**.

1. Crie um [token Vercel](https://vercel.com/account/tokens) (escopo da conta ou equipa onde queres o projeto).
2. No `.env.local`, além do Supabase, acrescente **`VERCEL_TOKEN`** (e opcionalmente **`VERCEL_TEAM`** se o projeto for numa equipa; **`VERCEL_PROJECT_NAME`** se não quiseres o nome default `clinica-online`).
3. Na pasta do projeto:

```bash
npm run vercel:bootstrap
```

Isto corre `vercel link`, define `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Production** e **Preview**, faz **`vercel deploy --prod`**, e se existir **`SUPABASE_ACCESS_TOKEN`** no `.env.local` corre também o sync de Auth no Supabase.

Integração Git na Vercel (deploy a cada push) continua opcional; podes ligar o repo mais tarde no dashboard.

### Caminho mais prático (o seu caso)

O código já aponta para **`fnkgxsfgbv-prog/clinica-online`**. Faltam **só 2 coisas**:

**A) Enviar os commits do Mac para o GitHub**

1. Crie um [token GitHub](https://github.com/settings/tokens) (classic, escopo **repo**).
2. Coloque no `.env.local` (uma linha, não commite):

   `GITHUB_TOKEN=ghp_...`

3. Rode:

```bash
cd /Users/jpcoutinho/clinica-online
npm run push:github
```

(Alternativa sem arquivo: `GITHUB_TOKEN=ghp_... npm run push:github` — o script `push-github.mjs` lê `.env.local` se existir.)

**B) Na Vercel** → **Add New → Project** → importe **`fnkgxsfgbv-prog/clinica-online`** → nas variáveis de ambiente coloque `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Deploy**.

**Conta GitHub certa na Vercel (causa típica de “repo não aparece”)**  
O `origin` deste projeto é `fnkgxsfgbv-prog/clinica-online` — ou seja, o **dono do repo no GitHub** é o utilizador **`fnkgxsfgbv-prog`**. Na página **New Project**, o menu do canto (namespace) lista só as contas GitHub ligadas ao teu login Vercel. Se aí só aparecer **`joaopcvoliveira-sudo`**, são **duas contas diferentes**: instalar a app Vercel em [GitHub → Settings → Installations](https://github.com/settings/installations) enquanto estás em `fnkgxsfgbv-prog` **não** faz esse repositório aparecer para uma Vercel que só tem OAuth de `joaopcvoliveira-sudo`.

**Correção (recomendada):** no menu do namespace → **Add GitHub Account** → inicia sessão no GitHub com a conta **`fnkgxsfgbv-prog`** (a que possui o repo) → escolhe esse namespace → importa **`clinica-online`**.

**Alternativa:** manter só `joaopcvoliveira-sudo` na Vercel e ter o código em `joaopcvoliveira-sudo/clinica-online` (ver secção 1 abaixo com `GITHUB_OWNER=joaopcvoliveira-sudo`).

**Deploy sem UI (CLI):** com Node no projeto: `npm run vercel:login` (uma vez; faz download da CLI via `npx`), depois `npm run vercel:link` na pasta do repo e `npm run vercel:deploy` — usa a mesma conta GitHub que tiveres ligado no fluxo da CLI.

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

O workflow opcional de GitHub Actions foi removido do repo: pushes com PAT
só com escopo **repo** falham em arquivos sob `.github/workflows/` sem escopo **workflow**.
Para CI na Vercel, use a integração Git da Vercel (Import Repository).

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

# PsicoDesk (clinica-online)

Sistema de gestão para clínica psicológica — Next.js + Supabase.

## Site em produção (uso no dia a dia)

**URL fixa:** https://clinica-online-ten.vercel.app/login

Funciona no navegador, no notebook da equipe e no app Mac **sem** ligar o servidor local.

| Ação | Comando |
|------|---------|
| Publicar alterações | `npm run site:deploy` (roda testes antes) |
| Conferir migrations Supabase | `npm run db:check-migrations` |
| Pacote comercial (deploy + auth) | `npm run producao:comercial` |
| Ver URL pública | `npm run site:url` |
| App Mac → produção | `npm run psicodesk:producao` (depois Cmd+Q e reabrir o PsicoDesk) |

**Profissional:** login com recuperação de senha, páginas `/privacidade` e `/termos`.

Detalhes de Vercel, GitHub e Supabase Auth: [DEPLOY.md](./DEPLOY.md).

## Desenvolvimento (só para programar)

```bash
npm install
npm run dev:bg    # servidor em http://localhost:3000
npm run dev:stop
```

`localhost` é **apenas** para editar código no seu Mac. Não use esse endereço no caderno de outras pessoas.

## Testes

```bash
npm test
npm run build
```

# Campus — Agenda acadêmica

Sistema de planejamento de aulas com login, docentes, disciplinas, salas, carga horária e impressão em PDF.

## Recursos

- Acesso com usuário e senha; cadastro inicial da conta administradora.
- Semestre letivo selecionado no login (ex.: 2026.2) e semestre do curso por aula (ex.: 2º semestre).
- Cadastro por etapas: disciplina/docente, sala/turno/semestre do curso e dias/horários.
- Disciplinas de 60h exigem 4 aulas semanais; de 90h, 6 aulas.
- Conflitos de docente e sala; vínculos antigos com turma são preservados.
- Agenda de segunda a sábado e impressão por semestre do curso e turno.
- Matutino: 07:30–12:50; vespertino: 13:00–18:20; noturno: 18:30–21:50.
- Intervalos fixos de 10 minutos a cada duas aulas de manhã e à tarde; noite sem intervalo.
- Interface adaptável a celular e tablet.

## Rodar localmente

Requisitos: Node.js 22.13 ou superior e npm.

```sh
npm ci
npm run build
```

Na primeira instalação, aplique cada arquivo `.sql` da pasta `drizzle`, em ordem numérica, com:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/NOME_DO_ARQUIVO.sql
```

Aplique cada migração apenas uma vez no mesmo banco. Depois:

```sh
npm run dev
```

Abra http://localhost:5173. Na primeira execução, clique em **Criar sua conta**. Não há senha padrão no código.

O banco local e as sessões ficam em `.wrangler/state`, que não é enviado ao GitHub. Faça backup dessa pasta antes de migrar de computador.

## Publicação online

O aplicativo suporta Vercel com Next.js e banco remoto Turso/libSQL, além do modo original Cloudflare Workers/D1. GitHub armazena o código; GitHub Pages sozinho não executa a API, o login e o banco de dados deste projeto.

O projeto contém uma integração com Sites em `.openai/hosting.json`. A hospedagem requer acesso à conta proprietária desse projeto ou configuração de um novo ambiente. Os dados locais não são transferidos automaticamente.

## Verificação

```sh
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

O script legado `scripts/test-api.mjs` não está adaptado ao login e aos campos atuais; não o execute contra dados reais.

## Tecnologias

React, TypeScript, Vinext/Vite, Cloudflare Workers, D1/SQLite, Drizzle e componentes Radix.

## Publicar na Vercel

A Vercel usa Next.js e um banco remoto Turso/libSQL. O modo local existente continua usando Cloudflare D1 (`npm run dev`).

1. Importe este repositório na Vercel. O arquivo `vercel.json` define Next.js, `npm ci`, `npm run build:vercel` e saída `.next`.
2. Crie um banco Turso e configure **somente no servidor** as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Não use prefixo `NEXT_PUBLIC_` nem coloque tokens no GitHub.
3. Antes do primeiro uso, coloque essas variáveis em `.env.local` no computador e execute `npm run db:turso`. O comando aplica as migrações em ordem e registra as já executadas. Use em banco novo; não use sobre uma cópia antiga sem histórico de migrações.
4. Faça Redeploy na Vercel. Mantenha a proteção de acesso da Vercel até criar a conta administradora em **Criar sua conta**. O primeiro cadastro assume a administração.
5. Cadastre o semestre letivo e os demais dados. Os dados e a conta do banco local não são copiados automaticamente; a transferência deve ser planejada separadamente.

O build não exige credenciais e não altera bancos. Sem as variáveis e migrações, o site compila, mas o login retorna indisponibilidade. Não use arquivos SQLite no armazenamento temporário da Vercel: os dados não persistiriam.

Teste da conexão, migrações e conflitos (Node 24): `node scripts/test-vercel-db.mjs`.
Para testar Next.js localmente: configure o banco, execute `npm run build:vercel` e `npm run start:vercel`.

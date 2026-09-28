# Campus — Agenda acadêmica local

Site estático para organizar aulas, docentes, disciplinas, salas, semestres e cargas horárias. Pode ser hospedado na Vercel sem servidor de aplicação, banco online ou variáveis secretas.

## Onde ficam os dados

Os dados ficam no IndexedDB do navegador, separados por endereço do site, navegador e aparelho. Cadastros, horários, usuário e senha não são enviados a uma API. A Vercel entrega apenas os arquivos do site.

- Use sempre o endereço de produção. Prévias e domínios diferentes têm dados separados.
- Não há sincronização entre computadores ou celulares.
- Limpar os dados do site ou fechar uma sessão anônima pode apagar as informações. Faça backup regularmente.
- O login é um controle local de acesso à interface, não criptografia nem proteção contra alguém com acesso ao perfil do navegador. Senhas são armazenadas como hash com salt; a sessão fica limitada ao navegador e expira em 8 horas.

## Vercel

Importe `Reinaldopompeu/campus-agenda` ou faça Redeploy após a atualização da branch `main`. O `vercel.json` define:

- Framework: Next.js
- Instalação: `npm ci`
- Build: `npm run build:vercel`
- Saída: `out`

Não configure Turso, D1 ou credenciais de banco. Remova overrides antigos do projeto que apontem para `dist/server` ou `.next`. O build produz somente páginas estáticas; não há endpoints `/api`.

Na primeira visita ao endereço definitivo, clique em **Criar sua conta**. Depois cadastre o semestre letivo e os demais registros, ou importe seu backup.

## Backup e restauração

Abra **Dados e backup**, no topo do sistema:

1. **Exportar backup** baixa um JSON com todos os cadastros e horários (não apenas a agenda filtrada).
2. **Importar backup** valida o arquivo e mostra a quantidade de registros.
3. **Confirmar restauração** substitui os cadastros e horários; antes solicita o download de uma cópia dos dados atuais. Confira se o navegador concluiu o download.

Backups não incluem usuário, senha ou sessões. A restauração mantém o acesso já criado no navegador de destino. O arquivo contém dados acadêmicos legíveis: guarde-o em local seguro. Backups antigos com distribuições incompletas são preservados e sinalizados pela agenda para ajuste.

## Transferir os dados da versão antiga

O banco antigo em `.wrangler/state` permanece intacto. Exporte uma cópia local com Node 24:

```sh
node scripts/export-old-data.mjs caminho/do/banco.sqlite backups/campus-migracao.json
```

Escolha o banco D1 com as tabelas acadêmicas, não `metadata.sqlite`. O exportador abre o banco somente para leitura e não inclui tabelas de autenticação. Importe o JSON em **Dados e backup**. O arquivo não é enviado ao GitHub.

## Executar no computador

Requisitos: Node.js 24 e npm.

```sh
npm ci
npm run dev
```

Abra http://localhost:5173. Para testar os arquivos estáticos:

```sh
npm run build
npm start
```

Os arquivos antigos de servidor estão em `legacy/server` apenas como referência. Não são executados pelo site atual. Os dados do banco antigo não são importados automaticamente.

## Verificação

```sh
node scripts/test-local.mjs
npm run build:vercel
```

Os testes cobrem acesso local, recarga, cadastros, exigência de 4 aulas para 60h, conflitos, gravações concorrentes, falha de armazenamento e restauração. A grade mantém segunda a sábado, intervalos fixos, turnos e impressão filtrada.

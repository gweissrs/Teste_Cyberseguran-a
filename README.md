# Laboratório de Testes de Segurança: Login Vulnerável x Seguro

> ## ⚠️ INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
> O `sistema-vulneravel/` tem falhas **propositais**. Ele serve só para estudo, nesta máquina (`127.0.0.1`).
> Nunca o coloque na internet nem em rede compartilhada, e nunca reutilize o código dele em um projeto real.
> Use somente dados **fictícios**. Testar sistemas de terceiros sem autorização é crime (Lei 12.737/2012).

Dois sistemas de login com as **mesmas telas e rotas**:

| | Sistema Vulnerável | Sistema Seguro |
|---|---|---|
| Endereço | <http://127.0.0.1:3001> | <http://127.0.0.1:3002> |
| Cabeçalho | 🟥 vermelho | 🟩 verde |
| Banco | `login_vulneravel` | `login_seguro` |

Uma suíte de testes (`npm run atacar`) executa **os mesmos ataques** contra os dois e mostra o resultado lado a lado.

---

## Pré-requisitos
- **Windows 10/11** (também funciona em Linux/macOS)
- **Node.js 20.19+, 22.12+ ou 24+**. O recomendado é o **Node 22 LTS**. Essas são as versões exigidas pelo Prisma 7.8.0, e o `setup` confere.
- **PostgreSQL** rodando em `127.0.0.1:5432`, com usuário `postgres` e senha **`senai`**
- (Opcional) pgAdmin, Postman e OWASP ZAP para a demonstração

## Como rodar (PowerShell)
Abra o PowerShell **na pasta do projeto**:

```powershell
npm run setup        # 1. instala tudo, cria bancos, gera segredos, migra e popula (pode repetir)
npm run ambos        # 2. sobe os dois sistemas (deixe este terminal aberto)
```

Em **outro** terminal:

```powershell
npm run atacar       # 3. roda os 8 ataques nos dois sistemas e mostra a tabela
```

Depois abra **<http://127.0.0.1:3001>** e **<http://127.0.0.1:3002>** no navegador.

> **Use sempre `127.0.0.1`, não `localhost`.** A whitelist de CORS e o cookie do sistema seguro dependem da origem exata. Por isso `http://localhost:3002` é tratado como **outro site**.

Os mesmos comandos funcionam no **cmd** (Prompt de Comando). Os scripts são em Node, sem nada exclusivo de bash.

### Todos os scripts
| Comando | O que faz |
|---|---|
| `npm run setup` | Confere o Node, testa o Postgres, instala dependências, cria os bancos, gera `JWT_SECRET`/`CRYPTO_KEY` (só se não existirem), roda `generate` + `migrate deploy` + `seed` |
| `npm run ambos` | Sobe os dois sistemas com nodemon (VULNERAVEL em vermelho, SEGURO em verde) |
| `npm run vulneravel` / `npm run seguro` | Sobe só um dos sistemas |
| `npm run atacar` | Suíte de testes de segurança (`testes/ataques.js`) |
| `npm run reset` | Zera os dois bancos e roda o seed de novo |
| `npm run audit` | `npm audit` nos dois sistemas (teste de dependências / SCA) |

## Usuários de teste (fictícios)
| E-mail | Senha | Perfil | CPF (fictício) | Uso |
|---|---|---|---|---|
| `ana@teste.com` | `Ana@12345` | user | 123.456.789-09 | usuária "atacante" nos testes |
| `bruno@teste.com` | `Bruno@12345` | user | 987.654.321-00 | vítima do IDOR |
| `admin@teste.com` | `Admin@12345` | **admin** | 111.444.777-35 | vê a lista de usuários |
| `alvo@teste.com` | `Alvo@12345` | user | 529.982.247-25 | só para o teste de força bruta |

Os mesmos usuários existem nos dois bancos. No seguro, a senha fica como **hash bcrypt** e o CPF como **cifra AES-256-GCM**.

---

## As 8 vulnerabilidades e as correções
| # | OWASP | No sistema vulnerável | Impacto em linguagem simples | Correção no seguro |
|---|---|---|---|---|
| 1 | A03 Injection | Login monta o SQL juntando texto (`$queryRawUnsafe`). `admin@teste.com' --` entra como admin | Qualquer pessoa entra como administrador **sem saber a senha** | `prisma.usuario.findUnique` (parametrizado) + validação zod |
| 2 | A02 Falhas criptográficas | Senha salva em texto puro | Se o banco vazar, **todas as senhas** ficam expostas (e as pessoas repetem senhas em outros sites) | Hash **bcryptjs** custo 12 |
| 3 | A02 Falhas criptográficas | CPF salvo em texto puro | Vazamento de **dado pessoal**, com multa e processo pela LGPD | **AES-256-GCM**, IV aleatório, `iv:authTag:cifra` |
| 4 | A07 Autenticação | "Token" = id do usuário, em `localStorage`. `Bearer 3` vira o admin | Trocar um número dá acesso à conta de outra pessoa | **JWT HS256** assinado, `exp` 15 min, cookie `httpOnly` + `sameSite=strict`, `algorithms: ['HS256']` fixo |
| 5 | A01 Controle de acesso (IDOR) | `/api/usuarios/:id` devolve qualquer id | Um usuário lê os dados (até a senha) de **todos** os outros | Só o dono (`sub === id`) ou admin. Senão, **403** |
| 6 | A01 Escalação de privilégio | Rota de admin só **esconde o botão** | Usuário comum vira "admin" chamando a rota direto | Middleware `somenteAdmin` no servidor. Senão, **403** |
| 7 | A07 Força bruta + enumeração | Tentativas ilimitadas; "e-mail não encontrado" x "senha incorreta" | Robôs testam milhões de senhas e descobrem quem tem conta | Rate limit (IP + e-mail, 5 por 15 min, **429**), mensagem única e tempo constante |
| 8 | A05 Configuração (CORS) | `origin: true` + `credentials: true` | Qualquer site aberto no navegador da vítima usa a API em nome dela | Whitelist `http://127.0.0.1:3002`, métodos restritos |

**Também corrigido no seguro:** `helmet` (CSP e outros cabeçalhos), validação com `zod`, campo `senha` nunca devolvido (`select`), erros genéricos (`{"erro":"erro interno"}`) no lugar de stack trace, e **log de segurança (A09)** de cada login falho, com data/hora, IP e e-mail, nunca a senha.

Os pontos do código estão marcados com `// VULNERABILIDADE: ...` (vulnerável) e `// CORREÇÃO: ...` (seguro).

### Exemplo de saída do `npm run atacar`
```
TESTE                                | VULNERÁVEL (3001)        | SEGURO (3002)
-------------------------------------+--------------------------+-------------------------
T1 SQL Injection no login            | ❌ EXPLORADO (200)       | ✅ BLOQUEADO (401)
T2 Senha legível no banco            | ❌ EXPLORADO (DB)        | ✅ BLOQUEADO (DB)
T3 CPF legível no banco              | ❌ EXPLORADO (DB)        | ✅ BLOQUEADO (DB)
T4 Token falsificado                 | ❌ EXPLORADO (200)       | ✅ BLOQUEADO (401/401)
T5 IDOR (ana lê dados do bruno)      | ❌ EXPLORADO (200)       | ✅ BLOQUEADO (403)
T6 Escalação (ana na rota admin)     | ❌ EXPLORADO (200)       | ✅ BLOQUEADO (403)
T7a Enumeração de usuários           | ❌ EXPLORADO (401/401)   | ✅ BLOQUEADO (401/401)
T7b Força bruta (10 tentativas)      | ❌ EXPLORADO (401)       | ✅ BLOQUEADO (429)
T8 CORS reflete origem maliciosa     | ❌ EXPLORADO (204)       | ✅ BLOQUEADO (204)
```
Abaixo da tabela, o script imprime as **evidências** (status HTTP e trecho da resposta) de cada teste.

---

## Conceitos importantes
- **JWT não é criptografia.** O JWT é **assinado**, não cifrado. O payload é só base64: qualquer pessoa lê (teste em <https://jwt.io>). A assinatura garante que ninguém **alterou** o conteúdo. Por isso o nosso JWT só leva o id (`sub`) e a `role`, nunca CPF ou senha.
- **Hash não é criptografia.** O hash (bcrypt) é uma **via de mão única**: não dá para "desfazer", só comparar (`bcrypt.compare`). Serve para **senhas**, que o sistema nunca precisa ler de volta. A criptografia (AES) tem **volta**: com a chave, decifra. Serve para o **CPF**, que precisa ser mostrado ao dono.
- **ORM não é proteção automática.** O Prisma protege quando usamos `findUnique`/`findMany`, mas `$queryRawUnsafe` com texto concatenado reabre o SQL Injection. O nome *Unsafe* é o aviso.
- **Esconder no front não é segurança.** Qualquer pessoa chama a API pelo Postman ou curl. Toda regra de acesso precisa ser validada **na API**.
- **CORS não é autenticação.** O CORS só controla o que **outro site, dentro do navegador**, pode ler. Ele não impede chamadas via curl, Postman ou scripts. A proteção real é o JWT + autorização.
- **Por que o CPF pode ser criptografado e o e-mail não?** O login precisa **buscar** o usuário pelo e-mail (`WHERE email = ...`). Com AES de IV aleatório, o mesmo e-mail gera uma cifra diferente a cada vez, e a busca (e o `@unique`) deixaria de funcionar. O CPF nunca é usado como chave de busca, então pode ser cifrado sem perda. (Sistemas reais que precisam cifrar o e-mail guardam um *hash de busca* em outra coluna.)
- **Logout com JWT.** O JWT é *stateless*: o servidor não guarda sessões. Apagar o cookie no logout **não invalida o token**. Se alguém o copiou antes, ele vale até expirar. Por isso a expiração é curta (**15 min**). Em produção se usa **blacklist** de tokens ou **refresh tokens** revogáveis.
- **O "seguro" ainda não está pronto para produção.** Falta **HTTPS/TLS**: sem ele, senha e cookie trafegam **legíveis** na rede. No laboratório isso não importa porque tudo roda em `127.0.0.1`. Um sistema real ainda precisaria de:
  - HTTPS (TLS) com `secure: true` no cookie e HSTS
  - refresh token e revogação de sessão
  - MFA (autenticação em dois fatores)
  - gestão de segredos (cofre, rotação de chaves) no lugar do `.env`
  - monitoramento e alertas (SIEM), rate limit em banco compartilhado (Redis)
  - política de senhas, verificação de e-mail, recuperação de conta segura
  - testes de segurança no CI (SAST, DAST, SCA)

---

## Estrutura
```
./
├── README.md · package.json · .gitignore · .gitattributes
├── scripts/            setup.js, reset.js, criar-bancos.js, gerar-segredos.js, audit.js, util.js
├── sistema-vulneravel/ package.json, prisma.config.ts, .env.example, nodemon.json
│   ├── prisma/         schema.prisma, seed.js, migrations/
│   ├── public/         login.html, cadastro.html, area-restrita.html, app.js, style.css
│   └── src/            server.js, lib/prisma.js, routes/, controllers/, middlewares/, generated/ (gerado)
├── sistema-seguro/     (mesma estrutura +) src/lib/crypto.js, jwt.js, senha.js, validacao.js, log.js,
│                       middlewares/auth.js, somenteAdmin.js, rateLimit.js, erros.js
├── testes/             ataques.js, roteiro-de-testes.md, SistemaLogin.postman_collection.json, zap.md
└── apresentacao/       roteiro.md
```

### API (igual nos dois)
| Método | Rota | Observação |
|---|---|---|
| POST | `/api/auth/cadastro` | nome, email, senha, cpf |
| POST | `/api/auth/login` | email, senha |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | dados de quem está logado (usado pela área restrita) |
| GET | `/api/usuarios/:id` | |
| GET | `/api/admin/usuarios` | só admin (no seguro) |

---

## Solução de problemas no Windows
| Problema | Solução |
|---|---|
| **`npm` bloqueado no PowerShell** ("execução de scripts foi desabilitada") | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e abra o PowerShell de novo. Ou use o **cmd**. |
| **Porta 3001/3002 em uso** (`EADDRINUSE`) | `netstat -ano \| findstr :3001` mostra o PID na última coluna. Encerre com `taskkill /PID <número> /F`. |
| **Postgres parado** (`ECONNREFUSED 127.0.0.1:5432`) | `Win + R` → `services.msc` → `postgresql-x64-<versão>` → **Iniciar**. |
| **Erro de autenticação no Postgres** (`28P01`, "autenticação do tipo senha falhou") | A senha do `postgres` não é `senai`. No pgAdmin: *Login/Group Roles → postgres → Definition*. Ou no SQL Shell: `ALTER USER postgres WITH PASSWORD 'senai';` |
| **Node antigo** | O `setup` avisa. Instale o Node 22 LTS em <https://nodejs.org>. |
| **Login do seguro não "segura" a sessão** | Você abriu por `localhost`. Use `http://127.0.0.1:3002`. |
| **Seguro responde 429 para `alvo@teste.com`** | É o rate limit, que está em memória. Reinicie os servidores (Ctrl+C e `npm run ambos`). O `npm run reset` **não** zera esse contador. |
| **"CRYPTO_KEY ausente"** | Rode `npm run setup`. Ele cria o `.env` com os segredos. |
| **Apaguei o `.env` do seguro** | Um segredo novo não decifra os CPFs antigos. Rode `npm run setup` e depois `npm run reset`. |

---

## Decisões técnicas
Registro dos pontos em que a implementação interpretou ou complementou o prompt.

1. **Rota extra `GET /api/auth/me` (nos dois sistemas).** No seguro, o JWT fica em cookie `httpOnly`, e o JavaScript da página não consegue ler o id do usuário. A área restrita precisa de uma rota que diga "quem sou eu". Para manter as APIs iguais, a rota também existe no vulnerável, onde confia no `Bearer <id>`. Ela é usada pelo teste T4(a).
2. **Login do vulnerável faz duas consultas** (uma só pelo e-mail, outra por e-mail + senha), ambas com `$queryRawUnsafe` concatenado. Assim existe ao mesmo tempo a enumeração ("e-mail não encontrado" x "senha incorreta") e o SQL Injection com `admin@teste.com' --`.
3. **Login bem-sucedido zera o contador do rate limit** daquele IP + e-mail (`limiteLogin.resetKey`). É uma prática comum e mantém a suíte idempotente: a tentativa errada de T7a na conta da ana não se acumula entre execuções. O T7a usa um e-mail inexistente **aleatório** a cada execução pelo mesmo motivo.
4. **Entrada inválida no login do seguro responde 401 "credenciais inválidas"**, não 400. Assim o payload de SQL Injection (que não é um e-mail válido) recebe a mesma resposta de qualquer falha, sem dar pistas. No cadastro, a validação responde 400 com os detalhes.
5. **Helmet:** a diretiva `upgrade-insecure-requests` da CSP e o HSTS ficam **desligados fora de produção**, porque o laboratório roda em `http://` e não existe HTTPS para onde "subir" as requisições. Em `NODE_ENV=production` ficam ligados.
6. **`cross-env NODE_ENV=development` no script `dev`.** Além do comando pedido (`nodemon --watch src --exec tsx src/server.js`), o `dev` define `NODE_ENV` via `cross-env`, que funciona no Windows. O `nodemon.json` ignora `src/generated/`.
7. **`db:reset`** = `prisma migrate reset --force && prisma generate && prisma db seed`. O `&&` funciona igual no cmd e no PowerShell (o npm executa os scripts pelo cmd no Windows). O `npm run reset` da raiz chama esse script nos dois sistemas.
8. **`npm run audit` usa `scripts/audit.js`** para rodar o segundo audit mesmo quando o primeiro encontra problemas (o `npm audit` sai com código 1).
9. **Alertas do `npm audit`.** Os alertas (moderados e altos) vêm de **ferramentas de desenvolvimento**: do **CLI `prisma@7.8.0`** e das dependências dele (`@prisma/dev`, `mysql2`, `deepmerge-ts`, `@hono/node-server`, `valibot`) e do `minimatch` usado pelo `nodemon`. O CLI entra na árvore porque o `@prisma/client` o declara como *peer dependency*. A correção sugerida é o Prisma 8 (*breaking change*), e o prompt exige a versão fixa 7.8.0, por isso a versão foi mantida. Esses pacotes são ferramentas de desenvolvimento (CLI e servidor local `prisma dev`) e não fazem parte do caminho das requisições da aplicação. É um bom exemplo real de SCA para a apresentação: **o alerta precisa ser analisado, não só contado.**
10. **Custo do bcrypt = 12** (o prompt pede ≥ 10). Em computadores lentos, cada login leva cerca de 0,3 s, e o hash fictício usa o mesmo custo.
11. **IV de 12 bytes** no AES-256-GCM, o tamanho recomendado pelo NIST para GCM. O formato salvo é `iv:authTag:cifra` em hexadecimal.
12. **e-mail em minúsculas no seguro** (zod `toLowerCase`), para que `Ana@Teste.com` e `ana@teste.com` sejam a mesma conta e a mesma chave do rate limit.
13. **O cadastro do seguro responde 409 "e-mail já cadastrado"**, o que tecnicamente permite enumerar e-mails pelo cadastro. A mensagem foi mantida por usabilidade e é limitada pelo fato de exigir CPF válido. Em produção, o caminho seria responder sempre "verifique seu e-mail" e mandar a confirmação por e-mail.
14. **Node 25 no desenvolvimento.** O laboratório foi validado com Node 25.5 (aceito pelo Prisma: `>=24.0`). O recomendado para as máquinas da escola continua sendo o Node 22 LTS.
15. **Express 5.** As rotas `async` repassam os erros ao middleware de erro sem precisar de `try/catch`.
16. **Rate limit por IP + e-mail** usa `ipKeyGenerator` do `express-rate-limit` v8, que normaliza endereços IPv6 conforme a documentação da versão.

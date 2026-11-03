# Roteiro de Testes de Segurança (manual)

**Escopo autorizado:** somente `http://127.0.0.1:3001` (vulnerável) e `http://127.0.0.1:3002` (seguro), nesta máquina.
**Ferramentas:** navegador (DevTools), Postman (`SistemaLogin.postman_collection.json`), pgAdmin, OWASP ZAP.
**Pré-condição geral:** `npm run reset` executado, servidores reiniciados (`npm run ambos`), acesso por `127.0.0.1` (não `localhost`).

**Usuários de teste:** `ana@teste.com` / `Ana@12345` · `bruno@teste.com` / `Bruno@12345` · `admin@teste.com` / `Admin@12345` (admin) · `alvo@teste.com` / `Alvo@12345`.

> Preencha a coluna **Resultado obtido** durante a execução. Os valores já preenchidos foram obtidos na validação do laboratório.

| ID | Objetivo | Pré-condição | Passos | Dados de entrada | Resultado esperado | Resultado obtido | Severidade | Recomendação |
|---|---|---|---|---|---|---|---|---|
| CT-01 | Verificar SQL Injection no login (A03) | Nenhuma | 1. Abrir `/login.html`. 2. Preencher e-mail e senha. 3. Clicar em Entrar. | E-mail: `admin@teste.com' --` · Senha: `qualquer` | Vulnerável: entra como **Administrador**. Seguro: "credenciais inválidas" (401). | 3001: 200, logado como admin. 3002: 401 | **Crítica** | Consultas parametrizadas (`findUnique`); nunca `$queryRawUnsafe` com concatenação; validar entrada. |
| CT-02 | Verificar exposição de erro do banco | Nenhuma | Login com uma aspa simples no e-mail. | E-mail: `'` · Senha: `x` | Vulnerável: mostra erro do Postgres, SQL e stack trace. Seguro: mensagem genérica. | 3001: 500 com SQL e stack. 3002: 401 genérico | Média | Middleware global de erro; detalhes só no log do servidor. |
| CT-03 | Verificar armazenamento de senha (A02) | pgAdmin conectado | 1. Abrir a tabela `Usuario` em cada banco. 2. Ver a coluna `senha`. | — | Vulnerável: `Ana@12345` legível. Seguro: começa com `$2b$12$`. | 3001: texto puro. 3002: hash bcrypt | **Crítica** | Hash bcrypt (custo ≥ 10) com salt; nunca armazenar a senha original. |
| CT-04 | Verificar armazenamento do CPF (A02) | pgAdmin conectado | Ver a coluna `cpf` nos dois bancos. | — | Vulnerável: 11 dígitos legíveis. Seguro: `iv:authTag:cifra`. | 3001: `12345678909`. 3002: cifrado | Alta | AES-256-GCM com chave no `.env` e IV aleatório. |
| CT-05 | Falsificar o token de sessão (A07) | Logado como ana | 1. DevTools > Application > Local Storage. 2. Trocar `token` para o id do admin (ex.: `3`) e `role` para `admin`. 3. Recarregar a área restrita. | `token = 3` | Vulnerável: vira Administrador. Seguro: não há token legível; JWT alterado → 401. | 3001: virou admin. 3002: 401 | **Crítica** | JWT assinado (HS256) com `algorithms` fixo, expiração curta, cookie httpOnly. |
| CT-06 | Acessar dados de outro usuário (IDOR, A01) | Logado como ana | Chamar `GET /api/usuarios/<id do bruno>` (Postman). | id do bruno | Vulnerável: 200 com dados (e senha!) do bruno. Seguro: 403. | 3001: 200. 3002: 403 | Alta | Verificar no servidor se `token.sub === id` ou se é admin. |
| CT-07 | Acessar rota de admin sem ser admin (A01) | Logado como ana | Chamar `GET /api/admin/usuarios`. | — | Vulnerável: 200 com todos os usuários. Seguro: 403. | 3001: 200. 3002: 403 | **Crítica** | Middleware `somenteAdmin` no servidor; esconder botão não é controle de acesso. |
| CT-08 | Área restrita sem login | Sem login (aba anônima) | 1. Abrir `/area-restrita.html`. 2. No vulnerável, criar `token=1` no Local Storage e recarregar. | — | Vulnerável: a única barreira é o JavaScript da página. Seguro: API responde 401 e a página volta ao login. | 3001: entrou com token forjado. 3002: 401 | Alta | Toda checagem de acesso deve ser feita pela API. |
| CT-09 | Enumeração de usuários (A07) | Nenhuma | Login com e-mail inexistente e depois com e-mail válido e senha errada. | `naoexiste@teste.com` / `ana@teste.com` + `errada` | Vulnerável: mensagens diferentes. Seguro: as duas "credenciais inválidas". | 3001: "e-mail não encontrado" x "senha incorreta". 3002: iguais | Média | Mensagem única + tempo de resposta constante (hash fictício). |
| CT-10 | Força bruta (A07) | Servidores recém-iniciados | Enviar 10 logins errados seguidos para a mesma conta (Postman Runner). | `alvo@teste.com` + senhas erradas | Vulnerável: aceita todas (401). Seguro: 429 a partir da 6ª. | 3001: 10x 401. 3002: 429 na 6ª | Alta | Rate limit por IP + e-mail, bloqueio temporário, log e alerta. |
| CT-11 | CORS permissivo (A05) | Nenhuma | `OPTIONS /api/auth/login` com header `Origin: http://site-malicioso.local`. | Origin maliciosa | Vulnerável: `Access-Control-Allow-Origin` reflete a origem. Seguro: header ausente. | 3001: reflete. 3002: ausente | Média | Whitelist de origens; métodos e headers restritos. |
| CT-12 | Logout invalida a sessão? | Logado | 1. Copiar o valor do cookie/token. 2. Clicar em Sair. 3. Reenviar a requisição com o valor copiado. | token copiado | Vulnerável: o "id" vale para sempre. Seguro: JWT copiado continua válido **até expirar (15 min)**. | 3001: vale sempre. 3002: vale até expirar | Média | Expiração curta; em produção, blacklist ou refresh tokens. |
| CT-13 | Log de tentativas falhas (A09) | Terminal do `npm run ambos` visível | Errar a senha uma vez em cada sistema. | `ana@teste.com` + `errada` | Vulnerável: nada registrado. Seguro: linha `[SEGURANÇA]` com data, IP e e-mail (sem senha). | 3001: nenhum log. 3002: registrado | Média | Registrar eventos de segurança e monitorar. |
| CT-14 | Dependências vulneráveis (SCA) | Internet | `npm run audit` | — | Relatório do `npm audit` para os dois sistemas. | Ver saída (alertas vêm de pacotes de desenvolvimento do Prisma CLI) | Baixa | Rodar SCA no CI; atualizar dependências. |

## Escala de severidade usada
- **Crítica:** acesso total sem credencial ou vazamento em massa (ex.: SQLi, admin sem senha).
- **Alta:** acesso a dados de terceiros ou dado pessoal exposto.
- **Média:** facilita outros ataques (enumeração, CORS, erro detalhado).
- **Baixa:** risco indireto ou dependente de condições específicas.

## Reteste
Após cada correção, repita o caso de teste no sistema seguro e rode `npm run atacar` para o reteste automatizado dos 8 itens.

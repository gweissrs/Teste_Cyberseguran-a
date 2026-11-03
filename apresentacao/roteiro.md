# Roteiro da Apresentação: Testes de Segurança de Software
**Duração:** 10 minutos · **Integrantes:** 5 · **Material:** os dois sistemas de login, pgAdmin, terminal com `npm run atacar`

## Linha do tempo
| Tempo | Bloco (item exigido) | Integrante |
|---|---|---|
| 0:00 – 1:30 | 1. Conceito | Integrante 1 |
| 1:30 – 3:00 | 2. Aplicação + aspectos legais | Integrante 2 |
| 3:00 – 4:30 | 3. Exemplo prático | Integrante 3 |
| 4:30 – 6:00 | 4. Rotina de trabalho + 5. Ferramentas | Integrante 4 |
| 6:00 – 8:30 | 6. Demonstração ao vivo | Integrante 5 |
| 8:30 – 10:00 | 7. Problemas encontrados + encerramento | Integrantes 1 e 2 |
| **Total** | | **10:00** |

---

## Bloco 1: Conceito (Integrante 1 · 1:30)
**Slide:** "O que é teste de segurança?"

> "Teste de segurança é o processo de **procurar falhas antes que um atacante encontre**. O objetivo não é ver se o sistema funciona, e sim ver se ele **resiste ao uso indevido**: alguém tentando entrar sem senha, ver dados de outra pessoa ou derrubar o serviço."

> "Ele verifica três coisas: **confidencialidade** (só quem pode vê), **integridade** (ninguém altera sem permissão) e **disponibilidade** (o sistema continua no ar)."

**Dois conceitos que confundem muita gente:**
> "Primeiro: **JWT não é criptografia**. O JWT é *assinado*, não *cifrado*. Qualquer pessoa consegue ler o conteúdo; a assinatura só garante que ninguém **alterou**. Por isso nunca colocamos senha ou CPF dentro dele."

> "Segundo: **hash não é criptografia**. O hash, como o bcrypt, não tem volta: serve para senha. A criptografia, como o AES, tem volta com a chave: serve para dados que precisamos mostrar, como o CPF."

---

## Bloco 2: Aplicação (Integrante 2 · 1:30)
**Slide:** "Quando testar?"

> "Testamos **antes de publicar**, **depois de cada mudança importante**, em **auditorias periódicas** e quando a lei exige, como a **LGPD**, que obriga a proteger dados pessoais."

> "A referência mundial é o **OWASP Top 10**, a lista das falhas mais comuns em aplicações web. As 8 falhas do nosso projeto estão nessa lista: Injection, Falhas criptográficas, Quebra de controle de acesso, Falhas de autenticação e Configuração incorreta."

**Slide:** "Aspectos legais ⚖️"
> "Atenção: **testar um sistema sem autorização é crime no Brasil**. A **Lei 12.737/2012**, a Lei Carolina Dieckmann, criou o **art. 154-A do Código Penal**: invadir dispositivo alheio dá pena de prisão. E se dados pessoais vazarem, a empresa responde pela **LGPD (Lei 13.709/2018)**, com multa de até **2% do faturamento, limitada a R$ 50 milhões por infração**."

> "Por isso a primeira etapa de qualquer teste é o **escopo e a autorização por escrito**. No nosso trabalho, o único alvo é o nosso próprio computador: `127.0.0.1`."

---

## Bloco 3: Exemplo prático (Integrante 3 · 1:30)
**Slide:** tabela das 8 falhas (ver "Resumo para a turma")

> "Construímos **dois sistemas de login idênticos**: mesmas telas, mesmas rotas. O **vermelho** tem 8 falhas propositais, que são comuns no mercado. O **verde** corrige cada uma."

> "Por exemplo: no vermelho, o login monta o SQL juntando o texto digitado: isso é **SQL Injection**. A senha está em **texto puro** no banco. O 'token' de sessão é só o **número do usuário**: troque 1 por 3 e você vira o admin. E a área de admin só **esconde o botão**, mas a rota continua aberta."

> "No verde usamos **consulta parametrizada**, **bcrypt**, **AES-256** para o CPF, **JWT assinado** em cookie protegido, checagem de permissão **no servidor**, **limite de tentativas** e **CORS restrito**."

---

## Bloco 4: Rotina de trabalho + Ferramentas (Integrante 4 · 1:30)
**Slide:** "As 7 etapas de um teste de segurança"
1. **Escopo e autorização**: o que pode ser testado, por quem, até quando (por escrito!)
2. **Reconhecimento**: mapear telas, rotas, tecnologias
3. **Modelagem de ameaças**: "o que um atacante tentaria aqui?"
4. **Testes automatizados**: SAST (código), DAST (sistema rodando), SCA (dependências)
5. **Testes manuais**: lógica e permissões, que ferramenta nenhuma entende
6. **Relatório com severidade**: Baixa, Média, Alta, Crítica, com a recomendação de correção
7. **Reteste**: confirmar que a correção funcionou

> "No nosso projeto: o `roteiro-de-testes.md` é o relatório com severidade, e o `npm run atacar` é o reteste automático."

**Slide:** "Ferramentas"
| Ferramenta | Para quê |
|---|---|
| **OWASP ZAP** | DAST gratuito: varre o site e aponta falhas |
| **Burp Suite** | Interceptar e modificar requisições (padrão dos pentesters) |
| **Postman** | Enviar requisições de ataque direto na API |
| **npm audit / Snyk** | SCA: dependências com falhas conhecidas |
| **SonarQube** | SAST: analisa o código-fonte |

> "Curiosidade: o `npm audit` achou alertas no nosso projeto, e eles estavam numa ferramenta de desenvolvimento, não no sistema. Alerta precisa ser **analisado**, não só contado."

---

## Bloco 5: Demonstração ao vivo (Integrante 5 · 2:30)
**Tela:** navegador com as duas abas lado a lado + pgAdmin + terminal.

1. **SQL Injection (40 s):** no **vermelho** (`http://127.0.0.1:3001`), digite o e-mail `admin@teste.com' --` e qualquer senha → "Olá, Administrador". Repita no **verde** → "credenciais inválidas".
   > "O `--` transforma a checagem de senha em comentário. No seguro o texto é tratado como dado, não como código."
2. **IDOR (40 s):** no Postman, rode "00 Login normal (ana)" e depois "T5 IDOR — ana lê dados do bruno" na pasta do vulnerável → aparecem os dados **e a senha** do Bruno. Na pasta do seguro, login da ana e "T5 IDOR" → **403**.
3. **Senha legível no banco (30 s):** pgAdmin, os dois bancos lado a lado, tabela `Usuario`: `Ana@12345` x `$2b$12$...`, e CPF `12345678909` x `a1b2...:...:...`.
4. **Tabela final (40 s):** no terminal, `npm run atacar`.
   > "Os mesmos 8 ataques, automáticos: **tudo vermelho no sistema vulnerável, tudo verde no seguro**."

> Se algo falhar, mostre o **vídeo de backup** e siga em frente.

---

## Bloco 6: Problemas encontrados (Integrantes 1 e 2 · 1:30)
**Integrante 1:**
> "O que essas falhas causariam num sistema real? **SQL Injection e escalação**: o atacante vira administrador. **IDOR e CPF legível**: vazamento de dados pessoais de todos os clientes. **Senha em texto puro**: como as pessoas repetem senhas, o vazamento atinge também o e-mail e o banco delas."

**Integrante 2:**
> "As consequências são **multa pela LGPD**, processo, **perda de confiança** e prejuízo financeiro. E corrigir depois de publicar custa muito mais do que testar antes."

> "Por isso testar segurança não é um extra: é parte do desenvolvimento. **Obrigado! Perguntas?**"

---

## Checklist pré-apresentação ✅
- [ ] PostgreSQL rodando (`services.msc` → `postgresql-x64-…` em "Em execução")
- [ ] `npm run reset` executado (bancos limpos, sem cadastros de ensaio)
- [ ] **Reiniciar os servidores** (`Ctrl+C` e `npm run ambos`), o que zera o contador do rate limit
- [ ] Abas abertas em **`http://127.0.0.1:3001`** e **`http://127.0.0.1:3002`** (nunca `localhost`)
- [ ] pgAdmin aberto com a tabela `Usuario` dos **dois** bancos lado a lado
- [ ] Postman com a coleção `testes/SistemaLogin.postman_collection.json` importada
- [ ] Segundo terminal pronto com `npm run atacar` digitado
- [ ] Fonte do terminal e do navegador **aumentada** (Ctrl + `+`)
- [ ] **Gravação de backup da demo** (Win + G grava a tela no Windows) num pendrive
- [ ] Notificações desligadas e sem dados reais na tela
- [ ] Ensaio cronometrado: 10 minutos

---

## Perguntas prováveis (e respostas curtas)
1. **"Por que o sistema seguro não usa HTTPS?"**
   Porque é um laboratório local (`127.0.0.1`): os dados não saem do computador. Em produção o HTTPS é **obrigatório**. Sem ele, senha e cookie trafegam legíveis na rede. Deixamos isso documentado como pendência, junto com `secure: true` no cookie.
2. **"Se o JWT pode ser lido, por que é seguro?"**
   Porque a segurança dele é a **assinatura**, não o sigilo. Se alguém mudar `role: user` para `admin`, a assinatura deixa de bater e o servidor recusa (o teste T4 mostra isso). Por isso o JWT não carrega dado sensível.
3. **"O logout invalida mesmo o token?"**
   Não totalmente. O logout apaga o cookie, mas o JWT é *stateless*: se alguém copiou o token antes, ele vale até expirar. Por isso usamos expiração curta (15 min). Em produção se usa blacklist ou refresh tokens.
4. **"Usar Prisma já não protege contra SQL Injection?"**
   Só se usarmos as funções normais (`findUnique`). O sistema vulnerável usa o Prisma com `$queryRawUnsafe` e texto concatenado, e a injeção funciona. Ferramenta não substitui boas práticas.
5. **"Qual a diferença entre hash e criptografia?"**
   Hash não tem volta: só dá para comparar (ideal para senha). Criptografia tem volta com a chave (ideal para o CPF, que precisa ser exibido).
6. **"Qual a diferença entre teste de segurança e pentest?"**
   Teste de segurança é o conjunto todo: análise de código, scanners, revisão de configuração, testes manuais. O **pentest** é um tipo específico, em que um especialista **simula um ataque real**, com autorização e escopo definidos. Todo pentest é um teste de segurança, mas nem todo teste de segurança é um pentest.
7. **"Por que não basta esconder o botão de admin?"**
   Porque o atacante não precisa da tela: ele chama a API direto pelo Postman. Toda regra de acesso tem que ser conferida no servidor.
8. **"O CORS não impediria esses ataques?"**
   Não. O CORS só limita o que **outros sites dentro do navegador** conseguem ler. Postman e curl ignoram o CORS. Ele é uma camada a mais, não autenticação.

---

## Resumo para a turma (1 página)

### Teste de segurança
Procurar falhas **antes** do atacante, **com autorização**, seguindo: escopo → reconhecimento → ameaças → testes automáticos → testes manuais → relatório → reteste.

### Conceitos-chave
- **Hash ≠ criptografia:** hash (bcrypt) não tem volta e serve para senhas. Criptografia (AES) volta com a chave e serve para dados como o CPF.
- **JWT ≠ criptografia:** é **assinado**, não cifrado. Qualquer um lê, ninguém altera.
- **ORM não é proteção automática:** `$queryRawUnsafe` + concatenação = SQL Injection.
- **Esconder no front não é segurança:** a API precisa validar tudo.
- **CORS não é autenticação.**
- **Sem HTTPS não há sistema seguro em produção.**
- **Lei:** testar sem autorização é crime (Lei 12.737/2012, art. 154-A do CP). Vazamento de dados gera punição pela LGPD (Lei 13.709/2018).

### As 8 falhas do projeto
| # | Falha (OWASP) | Ataque | Correção |
|---|---|---|---|
| 1 | SQL Injection (A03) | `admin@teste.com' --` entra como admin | Consulta parametrizada |
| 2 | Senha em texto puro (A02) | Ler o banco | Hash bcrypt |
| 3 | CPF em texto puro (A02) | Ler o banco | AES-256-GCM |
| 4 | Token previsível (A07) | `Bearer 3` vira admin | JWT assinado (HS256, 15 min, cookie httpOnly) |
| 5 | IDOR (A01) | Trocar o id na URL | Só o dono ou admin (403) |
| 6 | Escalação de privilégio (A01) | Chamar a rota admin direto | `somenteAdmin` no servidor (403) |
| 7 | Força bruta + enumeração (A07) | Tentativas ilimitadas e mensagens diferentes | Rate limit (429) + mensagem única |
| 8 | CORS permissivo (A05) | Qualquer site usa a API | Whitelist de origens |

### Ferramentas
OWASP ZAP · Burp Suite · Postman · npm audit / Snyk · SonarQube

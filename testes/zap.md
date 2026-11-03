# OWASP ZAP — Varredura automatizada (DAST) nos dois sistemas

O **OWASP ZAP** (Zed Attack Proxy) é um scanner gratuito de segurança para aplicações web. Ele navega pelo site, envia requisições de ataque e lista os alertas por risco. É um **teste dinâmico (DAST)**: analisa o sistema rodando, sem olhar o código.

> ⚠️ **Só escaneie sistemas que você tem autorização para testar.** Aqui o alvo é apenas `127.0.0.1`. Escanear sites de terceiros sem permissão é crime (Lei 12.737/2012).

## 1. Instalação (Windows)
1. Baixe o instalador **Windows (64)** em <https://www.zaproxy.org/download/>.
2. O ZAP precisa de Java. O instalador do Windows já traz o Java embutido. Se pedir, instale o **Java 17+**.
3. Abra o **ZAP**. Na pergunta sobre persistir a sessão, escolha *"No, I do not want to persist this session"*.

## 2. Preparação
1. Na raiz do projeto, rode `npm run reset` e depois `npm run ambos`.
2. Confirme no navegador que `http://127.0.0.1:3001` e `http://127.0.0.1:3002` abrem.

## 3. Automated Scan — sistema vulnerável
1. Na aba **Quick Start**, clique em **Automated Scan**.
2. **URL to attack:** `http://127.0.0.1:3001`
3. Marque **Use traditional spider**. O *ajax spider* é opcional e precisa de navegador.
4. Clique em **Attack** e aguarde (de 2 a 5 minutos).
5. Abra a aba **Alerts** (embaixo, à esquerda).
6. Gere o relatório: **Report > Generate Report**, template *Traditional HTML Report*, arquivo `zap-vulneravel.html`.

## 4. Automated Scan — sistema seguro
1. **File > New Session** (para não misturar os alertas).
2. Repita o passo 3 com `http://127.0.0.1:3002`.
3. Salve o relatório como `zap-seguro.html`.

> O ataque ativo do ZAP faz muitas tentativas de login. No sistema seguro isso pode ativar o rate limit (429): é o comportamento esperado. Para voltar ao normal, reinicie os servidores.

## 5. O que comparar
| Alerta típico do ZAP | Vulnerável (3001) | Seguro (3002) | Por quê |
|---|---|---|---|
| Content Security Policy (CSP) Header Not Set | aparece | **não aparece** | o seguro usa `helmet` |
| Missing Anti-clickjacking Header | aparece | **não aparece** | `X-Frame-Options` / `frame-ancestors` do helmet |
| X-Content-Type-Options Header Missing | aparece | **não aparece** | `nosniff` do helmet |
| Server Leaks Information via "X-Powered-By" | aparece | **não aparece** | o helmet remove o header |
| Cross-Domain Misconfiguration (CORS) | pode aparecer | não aparece | `origin: true` x whitelist |
| SQL Injection | pode aparecer no `/api/auth/login`* | não aparece | concatenação x consulta parametrizada |
| Application Error Disclosure | pode aparecer* | não aparece | stack trace na resposta x erro genérico |

\* O spider tradicional encontra principalmente as páginas HTML. A API recebe JSON via `fetch`, e o ZAP nem sempre descobre esses endpoints sozinho. Para testar a API com o ZAP:
1. Em **Tools > Options > Network > Local Servers/Proxies**, veja a porta do proxy (padrão `8080`).
2. No Postman, em **Settings > Proxy**, ative *Use custom proxy* `127.0.0.1:8080`.
3. Rode as requisições da coleção `SistemaLogin.postman_collection.json`. Elas aparecem em **Sites** no ZAP.
4. Clique com o botão direito em `http://127.0.0.1:3001` > **Attack > Active Scan**.

## 6. Limitações (fale isso na apresentação)
- Ferramenta automática **não substitui** teste manual: o ZAP não sabe que a "ana" não deveria ver os dados do "bruno" (IDOR), nem que a rota de admin está aberta. Falhas de **lógica e de autorização** exigem um testador humano. Por isso existem o `roteiro-de-testes.md` e o `npm run atacar`.
- Alguns alertas são **falsos positivos** e precisam ser analisados antes de entrar no relatório.
- Mesmo no sistema seguro aparecem alertas informativos, por exemplo a falta de HTTPS. Isso é esperado num laboratório local (veja o README).

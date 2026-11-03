// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
import { prisma } from "../lib/prisma.js";

// Executa SQL "cru" e anexa a query ao erro (que depois vaza na resposta).
async function executarSql(sql) {
  try {
    return await prisma.$queryRawUnsafe(sql);
  } catch (erro) {
    erro.sql = sql;
    throw erro;
  }
}

// POST /api/auth/cadastro
export async function cadastro(req, res) {
  const { nome, email, senha, cpf } = req.body ?? {};
  // Sem nenhuma validação de entrada (formato de e-mail, tamanho da senha, CPF...).
  const usuario = await prisma.usuario.create({
    // VULNERABILIDADE: Senha em texto puro — gravada exatamente como digitada; um vazamento do banco expõe todas as senhas
    // VULNERABILIDADE: CPF em texto puro — dado pessoal sensível (LGPD) fica legível no banco e nos backups
    data: { nome, email, senha, cpf },
  });
  res.status(201).json({ mensagem: "cadastro realizado", usuario });
}

// POST /api/auth/login
// VULNERABILIDADE: Força bruta — não há limite de tentativas; um script testa milhares de senhas por minuto
export async function login(req, res) {
  const { email = "", senha = "" } = req.body ?? {};

  // VULNERABILIDADE: SQL Injection — o SQL é montado concatenando o texto digitado pelo usuário e
  // executado com $queryRawUnsafe. Com o e-mail  admin@teste.com' --  o resto da query (a checagem
  // de senha) vira comentário e o atacante entra como admin sem saber a senha.
  const porEmail = await executarSql(`SELECT * FROM "Usuario" WHERE "email" = '${email}'`);

  // VULNERABILIDADE: Enumeração de usuários — mensagens diferentes revelam quais e-mails estão cadastrados
  if (porEmail.length === 0) return res.status(401).json({ erro: "e-mail não encontrado" });

  const resultado = await executarSql(
    `SELECT * FROM "Usuario" WHERE "email" = '${email}' AND "senha" = '${senha}'`
  );
  if (resultado.length === 0) return res.status(401).json({ erro: "senha incorreta" });

  const usuario = resultado[0];
  // VULNERABILIDADE: Token previsível — o "token" devolvido é o próprio id do usuário (sem assinatura nem expiração)
  res.json({ mensagem: "login realizado", token: String(usuario.id), usuario });
}

// POST /api/auth/logout
export async function logout(req, res) {
  // Não há sessão no servidor: o "token" (id) continua valendo para sempre.
  res.json({ mensagem: "logout realizado (só no navegador)" });
}

// GET /api/auth/me — dados do usuário dono do "token"
export async function eu(req, res) {
  res.json(req.usuario);
}

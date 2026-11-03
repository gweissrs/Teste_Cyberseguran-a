import { prisma, camposPublicos } from "../lib/prisma.js";
import { criptografar, descriptografar } from "../lib/crypto.js";
import { gerarHash, conferirSenha, HASH_FICTICIO } from "../lib/senha.js";
import { emitirToken, opcoesCookie, NOME_COOKIE } from "../lib/jwt.js";
import { esquemaCadastro, esquemaLogin } from "../lib/validacao.js";
import { registrarEvento } from "../lib/log.js";
import { limiteLogin, chaveLogin } from "../middlewares/rateLimit.js";

const MSG_FALHA = "credenciais inválidas";
const QUINZE_MIN = 15 * 60 * 1000;

// POST /api/auth/cadastro
export async function cadastro(req, res) {
  // CORREÇÃO: Validação com zod — dados fora do formato são recusados com 400
  const resultado = esquemaCadastro.safeParse(req.body ?? {});
  if (!resultado.success) {
    return res.status(400).json({ erro: "dados inválidos", detalhes: resultado.error.issues.map((i) => i.message) });
  }
  const { nome, email, senha, cpf } = resultado.data;

  const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (existente) return res.status(409).json({ erro: "e-mail já cadastrado" });

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senha: await gerarHash(senha), // CORREÇÃO: Hash bcrypt — a senha original nunca é gravada
      cpf: criptografar(cpf), // CORREÇÃO: CPF cifrado com AES-256-GCM (iv:authTag:cifra)
      // a role NÃO vem do body: todo cadastro novo é "user"
    },
    select: { id: true, nome: true, email: true, role: true }, // CORREÇÃO: select sem o campo senha
  });
  res.status(201).json({ mensagem: "cadastro realizado", usuario });
}

// POST /api/auth/login  (protegido pelo limiteLogin na rota)
export async function login(req, res) {
  const entrada = esquemaLogin.safeParse(req.body ?? {});
  if (!entrada.success) {
    // Entrada inválida (ex.: "admin@teste.com' --" não é um e-mail) recebe a MESMA resposta genérica.
    registrarEvento("login falho (entrada inválida)", req, req.body?.email);
    return res.status(401).json({ erro: MSG_FALHA });
  }
  const { email, senha } = entrada.data;

  // CORREÇÃO: Consulta parametrizada (prisma.usuario.findUnique) — o e-mail vai como DADO, nunca
  // como parte do SQL. Nada de $queryRawUnsafe com concatenação.
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, nome: true, email: true, role: true, senha: true },
  });

  // CORREÇÃO: Tempo constante contra enumeração — se o e-mail não existe, compara com um hash
  // fictício para a resposta demorar o mesmo que uma senha errada.
  const senhaOk = await conferirSenha(senha, usuario?.senha ?? HASH_FICTICIO);

  if (!usuario || !senhaOk) {
    registrarEvento("login falho", req, email);
    // CORREÇÃO: Mensagem única "credenciais inválidas" — não revela se o e-mail existe
    return res.status(401).json({ erro: MSG_FALHA });
  }

  // Login certo zera o contador de tentativas desta combinação IP + e-mail.
  await limiteLogin.resetKey(chaveLogin(req));

  // CORREÇÃO: JWT HS256 em cookie httpOnly + sameSite=strict (o front-end não tem acesso ao token)
  res.cookie(NOME_COOKIE, emitirToken(usuario), { ...opcoesCookie(), maxAge: QUINZE_MIN });
  const { senha: _omitida, ...publico } = usuario; // CORREÇÃO: Nunca devolver o campo senha
  res.json({ mensagem: "login realizado", usuario: publico });
}

// POST /api/auth/logout
export async function logout(req, res) {
  // CORREÇÃO: Logout limpa o cookie. Atenção: o JWT é stateless — uma cópia feita antes continua
  // válida até expirar (15 min). Em produção: blacklist de tokens ou refresh tokens.
  res.clearCookie(NOME_COOKIE, opcoesCookie());
  res.json({ mensagem: "logout realizado" });
}

// GET /api/auth/me — dados do dono do JWT (rota protegida pelo middleware autenticar)
export async function eu(req, res) {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id }, select: camposPublicos });
  if (!usuario) return res.status(401).json({ erro: "não autenticado" });
  res.json({ ...usuario, cpf: descriptografar(usuario.cpf) });
}

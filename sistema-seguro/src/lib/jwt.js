// Emissão e verificação de JWT.
// Lembre: JWT é ASSINADO, não cifrado. O payload é base64 legível por qualquer um,
// por isso aqui só vão o id (sub) e a role — nunca CPF ou senha.
import jwt from "jsonwebtoken";

const EXPIRACAO = "15m";
export const NOME_COOKIE = "token";

function segredo() {
  const s = process.env.JWT_SECRET ?? "";
  if (s.length < 32) throw new Error("JWT_SECRET ausente ou curto demais no .env. Rode npm run setup.");
  return s;
}

// CORREÇÃO: JWT assinado (HS256) com segredo forte do .env e expiração curta (15 min)
export function emitirToken(usuario) {
  return jwt.sign({ role: usuario.role }, segredo(), {
    algorithm: "HS256",
    expiresIn: EXPIRACAO,
    subject: String(usuario.id),
  });
}

// CORREÇÃO: jwt.verify com algorithms: ['HS256'] fixo — rejeita tokens "alg: none",
// tokens assinados com outro algoritmo e qualquer payload alterado (a assinatura deixa de bater).
export function verificarToken(token) {
  return jwt.verify(token, segredo(), { algorithms: ["HS256"] });
}

// CORREÇÃO: Cookie httpOnly (JavaScript da página não lê) + sameSite=strict (não vai em requisições de outros sites)
export function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: "strict",
    // Em produção (HTTPS) o `secure` é OBRIGATÓRIO: o cookie só trafega cifrado.
    // Aqui fica desligado em desenvolvimento porque o laboratório roda em http://127.0.0.1.
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

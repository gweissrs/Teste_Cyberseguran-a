import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { registrarEvento } from "../lib/log.js";

const JANELA_MIN = Number(process.env.RATE_LIMIT_JANELA_MIN) || 15;
const MAX_TENTATIVAS = 5;

// Chave do contador = IP + e-mail. Assim o bloqueio atinge só a conta atacada
// (ex.: alvo@teste.com) e não derruba o login de outras pessoas no mesmo IP.
export function chaveLogin(req) {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  return `${ipKeyGenerator(req.ip)}|${email}`;
}

// CORREÇÃO: Rate limit (express-rate-limit) — 5 tentativas por janela (RATE_LIMIT_JANELA_MIN, padrão 15 min)
// por IP + e-mail; a partir da 6ª, 429. O contador fica na MEMÓRIA do servidor (reiniciar zera).
export const limiteLogin = rateLimit({
  windowMs: JANELA_MIN * 60 * 1000,
  limit: MAX_TENTATIVAS,
  keyGenerator: chaveLogin,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    registrarEvento("login bloqueado (rate limit)", req, req.body?.email);
    res.status(429).json({ erro: `muitas tentativas. Tente novamente em ${JANELA_MIN} minutos.` });
  },
});

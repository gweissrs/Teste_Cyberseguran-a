import { NOME_COOKIE, verificarToken } from "../lib/jwt.js";
import { esquemaId } from "../lib/validacao.js";

// CORREÇÃO: Autenticação na API — lê o JWT do cookie httpOnly e verifica assinatura, algoritmo e
// expiração. Sem token válido: 401. (A checagem do front-end vira só conveniência.)
export function autenticar(req, res, next) {
  const token = req.cookies?.[NOME_COOKIE];
  if (!token) return res.status(401).json({ erro: "não autenticado" });
  try {
    const payload = verificarToken(token);
    req.usuario = { sub: payload.sub, id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    // assinatura inválida, alg: none, payload alterado ou token expirado
    return res.status(401).json({ erro: "token inválido ou expirado" });
  }
}

// CORREÇÃO: Controle de acesso por objeto (contra IDOR) — só libera se o id pedido for o do
// próprio usuário (token.sub === id) ou se ele for admin; senão, 403.
export function donoOuAdmin(req, res, next) {
  const id = esquemaId.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ erro: "id inválido" });
  if (req.usuario.sub === String(id.data) || req.usuario.role === "admin") return next();
  return res.status(403).json({ erro: "acesso negado" });
}

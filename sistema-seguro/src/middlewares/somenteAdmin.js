// CORREÇÃO: Autorização no servidor — a role vem do JWT já verificado (não do front, não do body).
// Usuário comum que chamar a rota direto (Postman/curl) recebe 403.
export function somenteAdmin(req, res, next) {
  if (req.usuario?.role !== "admin") return res.status(403).json({ erro: "acesso restrito a administradores" });
  next();
}

// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
import { prisma } from "../lib/prisma.js";

// VULNERABILIDADE: Token previsível (Broken Authentication) — o "token" é só o id do usuário
// enviado em "Authorization: Bearer <id>". Não há assinatura nem expiração: quem trocar
// "Bearer 1" por "Bearer 3" vira outro usuário (inclusive o admin) sem saber a senha.
export async function identificarUsuario(req, res, next) {
  const cabecalho = req.headers.authorization ?? "";
  const id = Number(cabecalho.replace("Bearer ", ""));
  if (!id) return res.status(401).json({ erro: "faça login" });

  // A API confia cegamente no número recebido.
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return res.status(401).json({ erro: "usuário não existe" });

  req.usuario = usuario;
  next();
}

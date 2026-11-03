// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
import { prisma } from "../lib/prisma.js";

// GET /api/usuarios/:id
// VULNERABILIDADE: IDOR (Insecure Direct Object Reference) — devolve QUALQUER id pedido, sem
// conferir se ele pertence a quem está logado. Basta trocar o número na URL para ler dados alheios.
export async function buscarPorId(req, res) {
  const usuario = await prisma.usuario.findUnique({ where: { id: Number(req.params.id) } });
  if (!usuario) return res.status(404).json({ erro: "usuário não encontrado" });
  res.json(usuario); // devolve tudo, inclusive senha e CPF
}

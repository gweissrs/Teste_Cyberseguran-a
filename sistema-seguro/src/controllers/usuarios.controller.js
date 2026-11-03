import { prisma, camposPublicos } from "../lib/prisma.js";
import { descriptografar } from "../lib/crypto.js";

// GET /api/usuarios/:id — só chega aqui depois de autenticar + donoOuAdmin
export async function buscarPorId(req, res) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(req.params.id) },
    select: camposPublicos, // CORREÇÃO: select sem o campo senha
  });
  if (!usuario) return res.status(404).json({ erro: "usuário não encontrado" });
  res.json({ ...usuario, cpf: descriptografar(usuario.cpf) });
}

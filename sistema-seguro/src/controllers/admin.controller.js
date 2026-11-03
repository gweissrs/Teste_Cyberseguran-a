import { prisma, camposPublicos } from "../lib/prisma.js";
import { descriptografar } from "../lib/crypto.js";

// GET /api/admin/usuarios — só chega aqui depois de autenticar + somenteAdmin
export async function listarUsuarios(req, res) {
  const usuarios = await prisma.usuario.findMany({ select: camposPublicos, orderBy: { id: "asc" } });
  res.json(usuarios.map((u) => ({ ...u, cpf: descriptografar(u.cpf) })));
}

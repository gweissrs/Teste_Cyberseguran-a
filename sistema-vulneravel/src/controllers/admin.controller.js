// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
import { prisma } from "../lib/prisma.js";

// GET /api/admin/usuarios
// VULNERABILIDADE: Escalação de privilégio — a API não confere a role. O botão "admin" só é
// escondido no front-end; qualquer usuário logado chama esta rota direto (Postman/curl) e lista todos.
export async function listarUsuarios(req, res) {
  const usuarios = await prisma.usuario.findMany({ orderBy: { id: "asc" } });
  res.json(usuarios); // inclui senha e CPF de todos
}

// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
import { Router } from "express";
import { buscarPorId } from "../controllers/usuarios.controller.js";
import { identificarUsuario } from "../middlewares/auth.js";

export const usuariosRoutes = Router();

// Exige um "token" qualquer, mas não verifica se o id pedido é do próprio usuário (IDOR).
usuariosRoutes.get("/:id", identificarUsuario, buscarPorId);

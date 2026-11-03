// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
import { Router } from "express";
import { listarUsuarios } from "../controllers/admin.controller.js";
import { identificarUsuario } from "../middlewares/auth.js";

export const adminRoutes = Router();

// Só exige estar "logado": falta o middleware que checa role === 'admin'.
adminRoutes.get("/usuarios", identificarUsuario, listarUsuarios);

import { Router } from "express";
import { buscarPorId } from "../controllers/usuarios.controller.js";
import { autenticar, donoOuAdmin } from "../middlewares/auth.js";

export const usuariosRoutes = Router();

// CORREÇÃO: JWT verificado + dono do recurso ou admin (senão 403)
usuariosRoutes.get("/:id", autenticar, donoOuAdmin, buscarPorId);

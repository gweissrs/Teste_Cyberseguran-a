import { Router } from "express";
import { listarUsuarios } from "../controllers/admin.controller.js";
import { autenticar } from "../middlewares/auth.js";
import { somenteAdmin } from "../middlewares/somenteAdmin.js";

export const adminRoutes = Router();

// CORREÇÃO: Middleware somenteAdmin no servidor (não basta esconder o botão)
adminRoutes.get("/usuarios", autenticar, somenteAdmin, listarUsuarios);

// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
import { Router } from "express";
import { cadastro, login, logout, eu } from "../controllers/auth.controller.js";
import { identificarUsuario } from "../middlewares/auth.js";

export const authRoutes = Router();

authRoutes.post("/cadastro", cadastro);
authRoutes.post("/login", login); // sem rate limit
authRoutes.post("/logout", logout);
authRoutes.get("/me", identificarUsuario, eu);

import { Router } from "express";
import { cadastro, login, logout, eu } from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/auth.js";
import { limiteLogin } from "../middlewares/rateLimit.js";

export const authRoutes = Router();

authRoutes.post("/cadastro", cadastro);
authRoutes.post("/login", limiteLogin, login); // CORREÇÃO: Rate limit por IP + e-mail no login
authRoutes.post("/logout", logout);
authRoutes.get("/me", autenticar, eu);

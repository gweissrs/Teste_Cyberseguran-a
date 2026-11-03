// =====================================================================
//  INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
//  Sistema com falhas propositais, para uso didático em rede local.
// =====================================================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./routes/auth.routes.js";
import { usuariosRoutes } from "./routes/usuarios.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { tratarErros } from "./middlewares/erros.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORTA = Number(process.env.PORT ?? 3001);
const HOST = "127.0.0.1"; // nunca 0.0.0.0: o laboratório fica acessível só nesta máquina

// VULNERABILIDADE: CORS mal configurado — `origin: true` reflete QUALQUER origem e, com
// credentials: true, qualquer site aberto no navegador da vítima pode chamar esta API em nome dela.
app.use(cors({ origin: true, credentials: true }));

// Sem helmet: nenhum cabeçalho de segurança (CSP, X-Frame-Options, etc.).
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => res.redirect("/login.html"));
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/admin", adminRoutes);

app.use(tratarErros);

app.listen(PORTA, HOST, () => {
  console.log("\x1b[41m\x1b[37m INTENCIONALMENTE INSEGURO — NÃO PUBLICAR \x1b[0m");
  console.log(`Sistema VULNERÁVEL rodando em http://${HOST}:${PORTA}`);
  console.log(`Acesse por http://127.0.0.1:${PORTA} (não use "localhost").`);
});

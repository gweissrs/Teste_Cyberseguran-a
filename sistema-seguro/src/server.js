// Sistema SEGURO: mesmas telas e rotas do vulnerável, com as 8 falhas corrigidas.
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./routes/auth.routes.js";
import { usuariosRoutes } from "./routes/usuarios.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { tratarErros } from "./middlewares/erros.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORTA = Number(process.env.PORT ?? 3002);
const HOST = "127.0.0.1"; // nunca 0.0.0.0: o laboratório fica acessível só nesta máquina
const EM_PRODUCAO = process.env.NODE_ENV === "production";

// Falha cedo se os segredos não existirem (evita subir um servidor "meio seguro").
if (!/^[0-9a-f]{64}$/i.test(process.env.JWT_SECRET ?? "") || !/^[0-9a-f]{64}$/i.test(process.env.CRYPTO_KEY ?? "")) {
  console.error("JWT_SECRET e/ou CRYPTO_KEY ausentes no .env. Rode `npm run setup` na raiz do projeto.");
  process.exit(1);
}

// Cabeçalhos de segurança (CSP, X-Frame-Options, nosniff...). A CSP padrão do helmet bloqueia
// scripts inline: por isso todo o JavaScript do front está em arquivos .js externos.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Em http://127.0.0.1 não há HTTPS para onde "subir" as requisições; em produção fica ligado.
        upgradeInsecureRequests: EM_PRODUCAO ? [] : null,
      },
    },
    strictTransportSecurity: EM_PRODUCAO, // HSTS só faz sentido com HTTPS
  })
);

// CORREÇÃO: CORS com whitelist — só a própria origem do sistema seguro recebe permissão;
// credenciais só para ela e apenas os métodos usados pela aplicação.
app.use(
  cors({
    origin: ["http://127.0.0.1:3002"],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10kb" })); // limita o tamanho do corpo
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => res.redirect("/login.html"));
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", (req, res) => res.status(404).json({ erro: "rota não encontrada" }));

app.use(tratarErros);

app.listen(PORTA, HOST, () => {
  console.log(`Sistema SEGURO rodando em http://${HOST}:${PORTA}`);
  console.log(`Acesse por http://127.0.0.1:${PORTA} (não use "localhost": CORS e cookie dependem da origem exata).`);
});

// Configuração do Prisma 7: a URL do banco fica aqui (não no schema.prisma).
// O Prisma 7 não carrega o .env sozinho, por isso o import do dotenv.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.js" },
  datasource: { url: env("DATABASE_URL") },
});

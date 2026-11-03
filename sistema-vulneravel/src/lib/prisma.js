// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
// Cliente do Prisma 7 com driver adapter (obrigatório). Importa do caminho
// gerado em src/generated/prisma — nunca de "@prisma/client".
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

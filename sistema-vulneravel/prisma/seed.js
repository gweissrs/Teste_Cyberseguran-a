// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
// Seed idempotente (upsert por e-mail): pode rodar várias vezes sem erro.
// Todos os dados são FICTÍCIOS.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const usuarios = [
  { nome: "Ana Souza", email: "ana@teste.com", senha: "Ana@12345", cpf: "12345678909", role: "user" },
  { nome: "Bruno Lima", email: "bruno@teste.com", senha: "Bruno@12345", cpf: "98765432100", role: "user" },
  { nome: "Administrador", email: "admin@teste.com", senha: "Admin@12345", cpf: "11144477735", role: "admin" },
  { nome: "Conta Alvo", email: "alvo@teste.com", senha: "Alvo@12345", cpf: "52998224725", role: "user" },
];

for (const u of usuarios) {
  // VULNERABILIDADE: Senha e CPF em texto puro — o seed grava os valores exatamente como digitados
  await prisma.usuario.upsert({ where: { email: u.email }, update: u, create: u });
  console.log(`✔ seed: ${u.email}`);
}

await prisma.$disconnect();

// npm run setup — prepara TUDO do zero e pode ser rodado várias vezes.
import fs from "node:fs";
import path from "node:path";
import { RAIZ, SISTEMAS, cor, rodar, checarVersaoNode } from "./util.js";

console.log(cor.negrito("\n=== Setup do Laboratório de Testes de Segurança ===\n"));

// 1) Versão do Node (Prisma 7.8.0)
checarVersaoNode();

// 2) Dependências da raiz (pg, concurrently, cross-env...), necessárias
//    para os próximos passos. Só instala se ainda não estiverem presentes.
if (!fs.existsSync(path.join(RAIZ, "node_modules", "pg"))) rodar("npm install", RAIZ);

// Imports dinâmicos: só funcionam depois que o `pg` está instalado.
const { testarConexao, criarBancos } = await import("./criar-bancos.js");
const { gerarSegredos } = await import("./gerar-segredos.js");

// 3) Conexão com o Postgres (mensagem clara se a senha 'senai' falhar)
await testarConexao();

// 4) Dependências dos dois sistemas
for (const { dir } of SISTEMAS) rodar("npm install", dir);

// 5) Bancos   6) .env + segredos (sem sobrescrever os existentes)
await criarBancos();
gerarSegredos();

// 7) Prisma: generate + migrate deploy (não interativo) + seed (idempotente)
for (const { dir } of SISTEMAS) {
  rodar("npm run db:generate", dir);
  rodar("npm run db:migrate", dir);
  rodar("npm run db:seed", dir);
}

console.log(cor.verde(cor.negrito("\n✔ Setup concluído!")));
console.log("Próximos passos:");
console.log("  npm run ambos     (sobe os dois sistemas)");
console.log("  npm run atacar    (em OUTRO terminal: roda a suíte de ataques)");
console.log(cor.amarelo("Acesse SEMPRE por http://127.0.0.1:3001 e http://127.0.0.1:3002 (não use 'localhost').\n"));

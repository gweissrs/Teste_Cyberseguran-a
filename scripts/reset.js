// npm run reset — zera os dois bancos e roda o seed de novo.
// Ordem explícita: o Prisma 7 não roda generate/seed automaticamente.
import { SISTEMAS, cor, rodar } from "./util.js";

for (const { nome, dir } of SISTEMAS) {
  console.log(cor.negrito(`\n=== Resetando ${nome} ===`));
  rodar("npm run db:reset", dir);
}
console.log(cor.verde("\n✔ Bancos resetados e populados novamente."));
console.log(
  cor.amarelo(
    "Atenção: o contador do rate limit fica na MEMÓRIA do servidor seguro.\n" +
      "Para zerá-lo também, reinicie os servidores (Ctrl+C e npm run ambos)."
  )
);

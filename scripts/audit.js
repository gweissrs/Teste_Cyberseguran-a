// npm run audit — teste de dependências (SCA) com `npm audit` nos dois sistemas.
// Feito em Node para que o segundo audit rode mesmo se o primeiro achar problemas
// (o npm audit termina com código 1 quando encontra vulnerabilidades).
import { SISTEMAS, cor, rodar } from "./util.js";

let problemas = 0;
for (const { nome, dir } of SISTEMAS) {
  console.log(cor.negrito(`\n=== npm audit: ${nome} ===`));
  if (rodar("npm audit", dir, { permitirFalha: true }) !== 0) problemas++;
}
console.log(
  problemas
    ? cor.amarelo(`\n${problemas} sistema(s) com alertas de dependências. Veja acima.`)
    : cor.verde("\n✔ Nenhuma vulnerabilidade conhecida nas dependências dos dois sistemas.")
);

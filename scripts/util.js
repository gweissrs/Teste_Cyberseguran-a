// Funções utilitárias compartilhadas pelos scripts (setup, reset, audit).
// Tudo em Node puro: funciona igual no PowerShell e no cmd do Windows.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SISTEMAS = [
  { nome: "sistema-vulneravel", dir: path.join(RAIZ, "sistema-vulneravel") },
  { nome: "sistema-seguro", dir: path.join(RAIZ, "sistema-seguro") },
];

export const cor = {
  vermelho: (t) => `\x1b[31m${t}\x1b[0m`,
  verde: (t) => `\x1b[32m${t}\x1b[0m`,
  amarelo: (t) => `\x1b[33m${t}\x1b[0m`,
  ciano: (t) => `\x1b[36m${t}\x1b[0m`,
  cinza: (t) => `\x1b[90m${t}\x1b[0m`,
  negrito: (t) => `\x1b[1m${t}\x1b[0m`,
};

// Executa um comando mostrando a saída no terminal. `shell: true` faz o
// Windows encontrar npm.cmd / npx.cmd sem precisarmos de sintaxe de bash.
export function rodar(comando, cwd = RAIZ, { permitirFalha = false } = {}) {
  console.log(cor.ciano(`\n> ${comando}`) + `  (em ${path.relative(RAIZ, cwd) || "."})`);
  const r = spawnSync(comando, { cwd, stdio: "inherit", shell: true });
  if (r.status !== 0 && !permitirFalha) {
    console.error(cor.vermelho(`\nFalhou: "${comando}" (código ${r.status}).`));
    process.exit(1);
  }
  return r.status;
}

// O Prisma 7.8.0 exige Node ^20.19 || ^22.12 || >=24.0 (campo "engines" do pacote).
export function checarVersaoNode() {
  const [maior, menor] = process.versions.node.split(".").map(Number);
  const ok = (maior === 20 && menor >= 19) || (maior === 22 && menor >= 12) || maior >= 24;
  if (!ok) {
    console.error(
      cor.vermelho(
        `\n✖ Node.js ${process.versions.node} é incompatível com o Prisma 7.8.0.\n` +
          "  Versões aceitas: 20.19+, 22.12+ ou 24+. Recomendado: Node 22 LTS (https://nodejs.org)."
      )
    );
    process.exit(1);
  }
  console.log(cor.verde(`✔ Node.js ${process.versions.node} compatível com o Prisma 7.8.0`));
}

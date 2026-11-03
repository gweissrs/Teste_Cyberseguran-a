// Cria os arquivos .env a partir dos .env.example e gera JWT_SECRET e
// CRYPTO_KEY do sistema seguro com crypto.randomBytes(32).toString('hex').
// NUNCA sobrescreve segredos existentes: trocar a CRYPTO_KEY tornaria
// impossível decifrar os CPFs já gravados no banco.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SISTEMAS } from "./util.js";

const SEGREDOS = ["JWT_SECRET", "CRYPTO_KEY"];

function lerOuCriarEnv(dir) {
  const env = path.join(dir, ".env");
  const exemplo = path.join(dir, ".env.example");
  if (!fs.existsSync(env)) {
    fs.copyFileSync(exemplo, env);
    console.log(`✔ ${path.basename(dir)}/.env criado a partir do .env.example`);
  } else {
    console.log(`• ${path.basename(dir)}/.env já existe (mantido)`);
  }
  return env;
}

export function gerarSegredos() {
  for (const { nome, dir } of SISTEMAS) {
    const arquivo = lerOuCriarEnv(dir);
    if (nome !== "sistema-seguro") continue;

    let conteudo = fs.readFileSync(arquivo, "utf8");
    for (const chave of SEGREDOS) {
      const regex = new RegExp(`^${chave}=(.*)$`, "m");
      const atual = conteudo.match(regex)?.[1]?.replace(/"/g, "").trim();
      if (atual && /^[0-9a-f]{64}$/i.test(atual)) {
        console.log(`• ${chave} já existe (mantido)`);
        continue;
      }
      const novo = crypto.randomBytes(32).toString("hex");
      conteudo = regex.test(conteudo)
        ? conteudo.replace(regex, `${chave}="${novo}"`)
        : conteudo.trimEnd() + `\n${chave}="${novo}"\n`;
      console.log(`✔ ${chave} gerado (32 bytes aleatórios)`);
    }
    fs.writeFileSync(arquivo, conteudo);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) gerarSegredos();

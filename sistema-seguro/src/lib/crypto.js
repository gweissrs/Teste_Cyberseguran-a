// Criptografia de dados pessoais (CPF) com o módulo `crypto` nativo do Node.
// CORREÇÃO: AES-256-GCM — chave de 32 bytes no .env, IV aleatório por registro,
// autenticação (authTag) que detecta qualquer alteração no valor cifrado.
// Formato salvo no banco: iv:authTag:cifra (tudo em hexadecimal).
import crypto from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12; // 96 bits: tamanho recomendado para o GCM

function chave() {
  const hex = process.env.CRYPTO_KEY ?? "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("CRYPTO_KEY ausente ou inválida no .env (esperado: 64 caracteres hex = 32 bytes). Rode npm run setup.");
  }
  return Buffer.from(hex, "hex");
}

export function criptografar(texto) {
  const iv = crypto.randomBytes(TAMANHO_IV); // IV novo a cada registro: o mesmo CPF gera cifras diferentes
  const cifrador = crypto.createCipheriv(ALGORITMO, chave(), iv);
  const cifra = Buffer.concat([cifrador.update(String(texto), "utf8"), cifrador.final()]);
  const authTag = cifrador.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${cifra.toString("hex")}`;
}

export function descriptografar(valor) {
  const [iv, authTag, cifra] = String(valor).split(":");
  const decifrador = crypto.createDecipheriv(ALGORITMO, chave(), Buffer.from(iv, "hex"));
  decifrador.setAuthTag(Buffer.from(authTag, "hex")); // se alguém alterou a cifra, final() lança erro
  return Buffer.concat([decifrador.update(Buffer.from(cifra, "hex")), decifrador.final()]).toString("utf8");
}

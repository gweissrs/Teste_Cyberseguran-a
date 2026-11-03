// Hash de senhas com bcryptjs (JavaScript puro: não precisa compilar nada no Windows).
import bcrypt from "bcryptjs";

// CORREÇÃO: Hash com bcrypt custo 12 (≥ 10) — cada +1 no custo dobra o tempo de um ataque de força bruta offline.
export const CUSTO_BCRYPT = 12;

export function gerarHash(senha) {
  return bcrypt.hash(senha, CUSTO_BCRYPT);
}

export function conferirSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

// CORREÇÃO: Tempo de resposta constante — quando o e-mail não existe, comparamos a senha com este
// hash fictício (mesmo custo). Assim a resposta demora o mesmo e não revela se a conta existe.
export const HASH_FICTICIO = bcrypt.hashSync("hash-ficticio-para-igualar-o-tempo", CUSTO_BCRYPT);

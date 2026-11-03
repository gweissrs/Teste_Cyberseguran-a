// Validação de entradas com zod: tudo que vem do cliente é conferido antes de usar.
import { z } from "zod";

// Confere os dois dígitos verificadores do CPF (algoritmo oficial da Receita).
function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(cpf.slice(0, 9));
  const d2 = digito(cpf.slice(0, 9) + d1);
  return cpf.endsWith(`${d1}${d2}`);
}

const email = z.string().trim().toLowerCase().pipe(z.email({ message: "e-mail inválido" }));

// CORREÇÃO: Validação de entrada (zod) — e-mail válido, senha ≥ 8, CPF com 11 dígitos e dígitos verificadores corretos
export const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "nome muito curto").max(100),
  email,
  // bcrypt só considera os primeiros 72 bytes, por isso o limite máximo
  senha: z.string().min(8, "a senha deve ter pelo menos 8 caracteres").max(72),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, "")) // aceita "123.456.789-09" ou "12345678909"
    .refine((v) => v.length === 11, "o CPF deve ter 11 dígitos")
    .refine(cpfValido, "CPF inválido"),
});

export const esquemaLogin = z.object({
  email,
  senha: z.string().min(1).max(72),
});

export const esquemaId = z.coerce.number().int().positive();

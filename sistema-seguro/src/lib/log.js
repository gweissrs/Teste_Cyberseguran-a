// CORREÇÃO: Log de segurança (OWASP A09) — registra data/hora, IP e e-mail de cada login falho.
// NUNCA registra a senha. O e-mail passa por JSON.stringify para que quebras de linha
// digitadas pelo atacante não forjem linhas falsas no log (log injection).
export function registrarEvento(evento, req, email) {
  const quando = new Date().toISOString();
  console.warn(`[SEGURANÇA] ${quando} ${evento} ip=${req.ip} email=${JSON.stringify(String(email ?? ""))}`);
}

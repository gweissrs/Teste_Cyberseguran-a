// CORREÇÃO: Middleware global de erro — o detalhe (mensagem, SQL, stack) fica só no console do
// servidor; o cliente recebe apenas { "erro": "erro interno" } com status 500.
// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  // JSON malformado no corpo da requisição é erro do cliente, não do servidor
  if (erro.type === "entity.parse.failed" || erro.type === "entity.too.large") {
    return res.status(400).json({ erro: "requisição inválida" });
  }
  console.error(`[ERRO] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`, erro);
  res.status(500).json({ erro: "erro interno" });
}

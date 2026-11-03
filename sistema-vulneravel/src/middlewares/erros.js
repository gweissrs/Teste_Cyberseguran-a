// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR

// VULNERABILIDADE: Vazamento de detalhes de erro — a mensagem do banco, o SQL executado e o
// stack trace vão para o cliente. O atacante enxerga a estrutura da query e ajusta o SQL Injection.
// (Comportamento complementar; a correção está no middleware global de erro do sistema seguro.)
// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  res.status(500).json({
    erro: erro.message,
    sql: erro.sql,
    stack: erro.stack,
  });
}

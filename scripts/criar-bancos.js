// Cria os bancos login_vulneravel e login_seguro (se ainda não existirem).
// Usa o pacote `pg` — não depende do psql estar no PATH do Windows.
import pg from "pg";
import { fileURLToPath } from "node:url";

export const CONEXAO_ADMIN = {
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  password: "senai", // senha SOMENTE do laboratório local
  database: "postgres",
};
const BANCOS = ["login_vulneravel", "login_seguro"];

// Testa a conexão, com mensagens claras para os erros mais comuns.
export async function testarConexao() {
  const cliente = new pg.Client(CONEXAO_ADMIN);
  try {
    await cliente.connect();
    const { rows } = await cliente.query("SHOW server_version");
    console.log(`✔ Conectado ao PostgreSQL ${rows[0].server_version} em 127.0.0.1:5432`);
  } catch (erro) {
    if (erro.code === "28P01") {
      console.error(
        "\n✖ O PostgreSQL recusou a senha do usuário 'postgres'.\n" +
          "  Este laboratório espera usuário 'postgres' com senha 'senai'.\n" +
          "  Corrija no pgAdmin (Login/Group Roles > postgres > Definition) ou rode no SQL Shell (psql):\n" +
          "    ALTER USER postgres WITH PASSWORD 'senai';"
      );
    } else if (erro.code === "ECONNREFUSED") {
      console.error(
        "\n✖ Não foi possível conectar em 127.0.0.1:5432. O PostgreSQL está rodando?\n" +
          "  Abra services.msc e inicie o serviço 'postgresql-x64-<versão>'."
      );
    } else {
      console.error("\n✖ Erro ao conectar no PostgreSQL:", erro.message);
    }
    process.exit(1);
  } finally {
    await cliente.end().catch(() => {});
  }
}

export async function criarBancos() {
  const cliente = new pg.Client(CONEXAO_ADMIN);
  await cliente.connect();
  try {
    for (const banco of BANCOS) {
      const { rowCount } = await cliente.query("SELECT 1 FROM pg_database WHERE datname = $1", [banco]);
      if (rowCount) {
        console.log(`• Banco ${banco} já existe`);
      } else {
        // O nome vem da lista fixa acima (não de entrada do usuário).
        await cliente.query(`CREATE DATABASE "${banco}"`);
        console.log(`✔ Banco ${banco} criado`);
      }
    }
  } finally {
    await cliente.end();
  }
}

// Permite rodar sozinho: node scripts/criar-bancos.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await testarConexao();
  await criarBancos();
}

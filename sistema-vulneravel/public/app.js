// INTENCIONALMENTE INSEGURO — NÃO PUBLICAR
// JavaScript do front-end (arquivo externo, sem scripts inline nem onclick).

const pagina = document.body.dataset.pagina;
const mensagem = document.getElementById("mensagem");

function mostrar(texto, tipo = "erro") {
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
}

// VULNERABILIDADE: Token previsível guardado em localStorage — qualquer script da página lê o
// "token" (que é só o id) e o usuário pode editá-lo no DevTools para virar outra pessoa.
function pegarToken() {
  return localStorage.getItem("token");
}

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(pegarToken() ? { Authorization: `Bearer ${pegarToken()}` } : {}),
    },
  });
  const dados = await resposta.json().catch(() => ({}));
  return { status: resposta.status, dados };
}

function valoresDoFormulario(form) {
  return Object.fromEntries(new FormData(form).entries());
}

// ---------- Tela de login ----------
if (pagina === "login") {
  document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { status, dados } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(valoresDoFormulario(e.target)),
    });
    if (status === 200) {
      localStorage.setItem("token", dados.token);
      localStorage.setItem("role", dados.usuario.role);
      window.location.href = "area-restrita.html";
    } else {
      // Mostra exatamente o que a API devolveu (inclusive erros do banco).
      mostrar(dados.erro ?? `erro ${status}`);
    }
  });
}

// ---------- Tela de cadastro ----------
if (pagina === "cadastro") {
  document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { status, dados } = await api("/api/auth/cadastro", {
      method: "POST",
      body: JSON.stringify(valoresDoFormulario(e.target)),
    });
    if (status === 201) {
      mostrar("Cadastro realizado! Redirecionando para o login...", "ok");
      setTimeout(() => (window.location.href = "login.html"), 1200);
    } else {
      mostrar(dados.erro ?? `erro ${status}`);
    }
  });
}

// ---------- Área restrita ----------
if (pagina === "area-restrita") {
  // VULNERABILIDADE: Controle de acesso só no front-end — este redirecionamento é a ÚNICA
  // "proteção". Basta criar a chave "token" no localStorage (ou chamar a API direto) para passar.
  const temToken = Boolean(pegarToken());
  if (!temToken) window.location.href = "login.html";

  (async () => {
    if (!temToken) return; // já está indo para o login
    const { status, dados } = await api("/api/auth/me");
    if (status !== 200) {
      localStorage.clear();
      window.location.href = "login.html";
      return;
    }
    document.getElementById("saudacao").textContent = `Olá, ${dados.nome}`;
    document.getElementById("dado-email").textContent = dados.email;
    document.getElementById("dado-cpf").textContent = dados.cpf;
    document.getElementById("dado-role").textContent = dados.role;

    // VULNERABILIDADE: Escalação de privilégio — a lista de admin é só ESCONDIDA aqui no front;
    // a rota /api/admin/usuarios responde para qualquer usuário logado.
    if (localStorage.getItem("role") === "admin") {
      const lista = await api("/api/admin/usuarios");
      const corpo = document.getElementById("tabela-usuarios");
      for (const u of lista.dados) {
        const linha = document.createElement("tr");
        for (const valor of [u.id, u.nome, u.email, u.role, u.cpf]) {
          const celula = document.createElement("td");
          celula.textContent = valor;
          linha.appendChild(celula);
        }
        corpo.appendChild(linha);
      }
      document.getElementById("secao-admin").classList.remove("escondido");
    }
  })();

  document.getElementById("btn-sair").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    localStorage.clear(); // apaga o "token" só no navegador
    window.location.href = "login.html";
  });
}

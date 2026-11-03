// JavaScript do front-end (arquivo externo: compatível com a CSP do helmet, sem inline/onclick).
// O token JWT fica num cookie httpOnly: este código NÃO consegue lê-lo, e isso é proposital.

const pagina = document.body.dataset.pagina;
const mensagem = document.getElementById("mensagem");

function mostrar(texto, tipo = "erro") {
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
}

// CORREÇÃO: Token em cookie httpOnly — o navegador envia o cookie sozinho (mesma origem);
// nada de localStorage, que qualquer script injetado na página conseguiria ler.
async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    ...opcoes,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
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
    if (status === 200) window.location.href = "area-restrita.html";
    else mostrar(dados.erro ?? `erro ${status}`);
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
      mostrar([dados.erro, ...(dados.detalhes ?? [])].filter(Boolean).join(" — ") || `erro ${status}`);
    }
  });
}

// ---------- Área restrita ----------
if (pagina === "area-restrita") {
  (async () => {
    // CORREÇÃO: Checagem de acesso na API — quem decide é o servidor (401 sem JWT válido);
    // o redirecionamento aqui é só para a experiência do usuário.
    const { status, dados } = await api("/api/auth/me");
    if (status !== 200) {
      window.location.href = "login.html";
      return;
    }
    document.getElementById("saudacao").textContent = `Olá, ${dados.nome}`;
    document.getElementById("dado-email").textContent = dados.email;
    document.getElementById("dado-cpf").textContent = dados.cpf;
    document.getElementById("dado-role").textContent = dados.role;

    // Mostrar a seção é só interface: a API /api/admin/usuarios também exige role admin (403).
    if (dados.role === "admin") {
      const lista = await api("/api/admin/usuarios");
      if (lista.status === 200) {
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
    }
  })();

  document.getElementById("btn-sair").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" }); // o servidor apaga o cookie
    window.location.href = "login.html";
  });
}

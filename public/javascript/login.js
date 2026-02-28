const form = document.querySelector('form');
const msg = document.getElementById('msg');


form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  try {
    const resposta = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      // Limpa rastros (se necessário)
      if (window.limparRastros) window.limparRastros();

      msg.innerText = 'Login efetuado com sucesso ✅';
      msg.style.color = 'green';

      // Atualiza histórico para impedir voltar
      window.history.replaceState(null, '', '/home');

      setTimeout(() => {
        window.location.href = '/home';
      }, 1000);

    } else {
      msg.innerText = 'Usuário ou senha inválidos ❌';
      msg.style.color = 'red';
    }

  } catch (erro) {
    msg.innerText = 'Erro ao conectar ao servidor ❌';
    msg.style.color = 'red';
    console.error('Erro fetch login:', erro);
  }
});
const btnLogout = document.getElementById('logout');
const msgLogout = document.getElementById('msgLogout');

btnLogout.addEventListener('click', async () => {
  try {
    const resposta = await fetch('/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (resposta.ok) {
      msgLogout.innerText = 'Sessão encerrada com sucesso ✅';
      msgLogout.style.color = 'green';

      window.history.replaceState(null, '', '/login');
      window.location.replace('/login');
    } else {
      msgLogout.innerText = 'Erro ao encerrar sessão ❌';
      msgLogout.style.color = 'red';
    }
  } catch (erro) {
    console.error('Erro no logout:', erro);
    msgLogout.innerText = 'Erro de conexão ao encerrar sessão ❌';
    msgLogout.style.color = 'red';
  }
});

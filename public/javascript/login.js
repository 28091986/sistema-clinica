const form = document.querySelector('form');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  try {
    const resposta = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // essencial para session
      body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      msg.innerText = 'Login efetuado com sucesso ✅';
      msg.style.color = 'green';

      setTimeout(() => {
        window.location.href = '/home'; // rota protegida
      }, 500);

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

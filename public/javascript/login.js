const form = document.querySelector('form');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  const resposta = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // 🔴 ESSENCIAL PARA SESSION
    body: JSON.stringify({
      email: usuario,
      senha: senha
    })
  });

  const dados = await resposta.json();

  if (dados.sucesso) {
    msg.innerText = 'Login efetuado com sucesso ✅';
    msg.style.color = 'green';

    setTimeout(() => {
      window.location.href = '/home'; // rota protegida
    }, 800);

  } else {
    msg.innerText = 'Usuário ou senha inválidos ❌';
    msg.style.color = 'red';
  }
});

const conteudo = document.getElementById('conteudo');
const botoes = document.querySelectorAll('.menu button');

botoes.forEach(btn => {
  btn.addEventListener('click', () => {
    // controla botão ativo
    botoes.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // carrega conteúdo
    carregarPagina(btn.dataset.page);
  });
});

function carregarPagina(page) {
  switch (page) {
 


    case 'pacientes':
      window.location.href = '/pacientes';
      break;

    case 'agendamentos':
      window.location.href = '/agendamentos';
      break;

    case 'historico':
      window.location.href = '/historico';
      break;

    case 'profissionais':
      window.location.href = '/profissionais';
      break;
case 'financeiro':
      window.location.href = '/financeiro';
  break;


    case 'configuracoes':
      conteudo.innerHTML = `
        <h2>Configurações</h2>
        <p>Usuários, permissões e sistema</p>
      `;
      break;
  }
}


document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  window.location.href = '/login';
});


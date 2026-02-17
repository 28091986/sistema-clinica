document.addEventListener('DOMContentLoaded', () => {
  carregarProfissionais();

  document
    .getElementById('btnNovoProfissional')
    .addEventListener('click', abrirModal);

  document
    .getElementById('cancelarProfissional')
    .addEventListener('click', fecharModal);

  document
    .getElementById('salvarProfissional')
    .addEventListener('click', salvarProfissional);
});

/* =========================
   LISTAR
========================= */
function carregarProfissionais() {
  fetch('/api/profissionais', { credentials: 'include' })
    .then(res => res.json())
    .then(lista => renderizarTabela(lista))
    .catch(() => alert('Erro ao carregar profissionais'));
}

function renderizarTabela(lista) {
  const tbody = document.getElementById('listaProfissionais');
  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center">
          Nenhum profissional cadastrado
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(p => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.especialidade}</td>
      <td>${p.ativo ? 'Ativo' : 'Inativo'}</td>
      <td>${formatarData(p.criado_em)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

/* =========================
   MODAL
========================= */
function abrirModal() {
  document.getElementById('modalProfissional').classList.add('ativo');
  limparFormulario();
}

function fecharModal() {
  document.getElementById('modalProfissional').classList.remove('ativo');
}

function limparFormulario() {
  document.getElementById('nome').value = '';
  document.getElementById('especialidade').value = '';
  document.getElementById('ativo').value = '1';
}

/* =========================
   SALVAR
========================= */
function salvarProfissional() {
  const nome = document.getElementById('nome').value.trim();
  const especialidade = document.getElementById('especialidade').value.trim();
  const ativo = document.getElementById('ativo').value;
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();
  const nivel = document.getElementById('nivel').value;

  if (!nome || !especialidade || !email || !senha) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }

  fetch('/api/profissionais', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome,
      especialidade,
      ativo,
      email,
      senha,
      nivel
    })
  })
  .then(res => res.json())
  .then(retorno => {
    if (!retorno.sucesso) {
      alert(retorno.erro || 'Erro ao salvar');
      return;
    }

    fecharModal();
    carregarProfissionais();
  })
  .catch(() => alert('Erro de conexão'));
}


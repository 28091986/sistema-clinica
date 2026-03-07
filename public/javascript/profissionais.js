document.addEventListener('DOMContentLoaded', () => {

  verificarPermissaoBotao();
  carregarProfissionais();

  const btnNovo = document.getElementById('btnNovoProfissional');
  const btnCancelar = document.getElementById('cancelarProfissional');
  const btnSalvar = document.getElementById('salvarProfissional');

  if (btnNovo) btnNovo.addEventListener('click', abrirModal);
  if (btnCancelar) btnCancelar.addEventListener('click', fecharModal);
  if (btnSalvar) btnSalvar.addEventListener('click', salvarProfissional);

});


/* =========================
   VERIFICAR PERMISSÃO
========================= */
function verificarPermissaoBotao() {

  fetch('/api/me', { credentials: 'include' })
    .then(res => {

      if (!res.ok) throw new Error();

      return res.json();

    })
    .then(usuario => {

      const botao = document.getElementById('btnNovoProfissional');

      if (!botao) return;

      if (usuario.nivel !== 'admin') {

        botao.disabled = true;
        botao.style.opacity = '0.5';
        botao.style.cursor = 'not-allowed';
        botao.title = 'Apenas administradores podem cadastrar profissionais';

      }

    })
    .catch(() => console.log('Erro ao verificar usuário'));

}


/* =========================
   LISTAR PROFISSIONAIS
========================= */
function carregarProfissionais() {

  fetch('/api/profissionais', { credentials: 'include' })
    .then(res => {

      if (!res.ok) throw new Error();

      return res.json();

    })
    .then(lista => renderizarTabela(lista))
    .catch(() => alert('Erro ao carregar profissionais'));

}


function renderizarTabela(lista) {

  const tbody = document.getElementById('listaProfissionais');

  if (!tbody) return;

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

  if (!data) return '-';

  return new Date(data).toLocaleDateString('pt-BR');

}


/* =========================
   MODAL
========================= */
function abrirModal() {

  const modal = document.getElementById('modalProfissional');

  if (modal) modal.classList.add('ativo');

  limparFormulario();

}


function fecharModal() {

  const modal = document.getElementById('modalProfissional');

  if (modal) modal.classList.remove('ativo');

}


function limparFormulario() {

  const nome = document.getElementById('nome');
  const especialidade = document.getElementById('especialidade');
  const ativo = document.getElementById('ativo');

  if (nome) nome.value = '';
  if (especialidade) especialidade.value = '';
  if (ativo) ativo.value = '1';

}


/* =========================
   SALVAR PROFISSIONAL
========================= */
function salvarProfissional() {

  const nome = document.getElementById('nome')?.value.trim();
  const especialidade = document.getElementById('especialidade')?.value.trim();
  const ativo = document.getElementById('ativo')?.value;
  const email = document.getElementById('email')?.value.trim();
  const senha = document.getElementById('senha')?.value.trim();
  const nivel = document.getElementById('nivel')?.value;

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
  .then(res => {

    if (!res.ok) return res.json().then(err => { throw err });

    return res.json();

  })
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
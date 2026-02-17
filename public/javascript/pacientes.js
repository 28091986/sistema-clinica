document.addEventListener('DOMContentLoaded', () => {
  carregarPacientes();

  const btnNovo = document.getElementById('btnNovo');
  const btnCancelar = document.getElementById('cancelarPaciente');
  const btnSalvar = document.getElementById('salvarPaciente');
  const modal = document.getElementById('modalPaciente');
  const inputBusca = document.getElementById('busca');

  if (btnNovo) btnNovo.addEventListener('click', abrirModalNovo);
  if (btnCancelar) btnCancelar.addEventListener('click', fecharModal);
  if (btnSalvar) btnSalvar.addEventListener('click', salvarPaciente);

  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target.id === 'modalPaciente') fecharModal();
    });
  }

  if (inputBusca) {
    inputBusca.addEventListener('input', () => {
      const termo = inputBusca.value.toLowerCase();

      const filtrados = pacientesCache.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        (p.telefone ?? '').toLowerCase().includes(termo) ||
        (p.email ?? '').toLowerCase().includes(termo)
      );

      renderizarTabela(filtrados);
    });
  }
});

/* =========================
   VARIÁVEIS
========================= */
let pacientesCache = [];
let pacienteEditando = null;

/* =========================
   MODAL
========================= */
function abrirModalNovo() {
  pacienteEditando = null;
  document.querySelector('#formPaciente h2').innerText = 'Novo Paciente';
  limparFormulario();
  document.getElementById('modalPaciente').classList.add('ativo');
}

function abrirModalEditar(paciente) {
  pacienteEditando = paciente.id;
  document.querySelector('#formPaciente h2').innerText = 'Editar Paciente';

  document.getElementById('nome').value = paciente.nome ?? '';
  document.getElementById('telefone').value = paciente.telefone ?? '';
  document.getElementById('email').value = paciente.email ?? '';
  document.getElementById('rua').value = paciente.rua ?? '';
  document.getElementById('numero').value = paciente.numero ?? '';
  document.getElementById('bairro').value = paciente.bairro ?? '';
  document.getElementById('cidade').value = paciente.cidade ?? '';
  document.getElementById('estado').value = paciente.estado ?? '';
  document.getElementById('data_nascimento').value =
    paciente.data_nascimento
      ? paciente.data_nascimento.split('T')[0]
      : '';

  document.getElementById('modalPaciente').classList.add('ativo');
}

function fecharModal() {
  document.getElementById('modalPaciente').classList.remove('ativo');
  limparFormulario();
}

/* =========================
   LISTAR / RENDERIZAR
========================= */
function carregarPacientes() {
  fetch('/api/pacientes', { credentials: 'include' })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar pacientes');
      return res.json();
    })
    .then(pacientes => {
      pacientesCache = pacientes;
      renderizarTabela(pacientesCache);
    })
    .catch(() => {
      mostrarToast('Erro ao carregar pacientes', 'erro');
    });
}

function renderizarTabela(lista) {
  const tbody = document.getElementById('listaPacientes');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center;">
          Nenhum paciente encontrado
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(p => {
    const statusTexto = p.status ?? 'Regular';
    const statusClasse = statusTexto.toLowerCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.telefone ?? ''}</td>
      <td>${p.email ?? ''}</td>
      <td>${p.rua ?? ''}</td>
      <td>${p.numero ?? ''}</td>
      <td>${p.bairro ?? ''}</td>
      <td>${p.cidade ?? ''}</td>
      <td>${p.estado ?? ''}</td>
      <td>${p.data_nascimento ? formatarData(p.data_nascimento) : ''}</td>
      <td>
        <span class="status ${statusClasse}">
          ${statusTexto}
        </span>
      </td>
      <td>
        <button class="btn-editar">Editar</button>
        <button class="btn-excluir">Excluir</button>
      </td>
    `;

    tr.querySelector('.btn-editar')
      .addEventListener('click', () => abrirModalEditar(p));

    tr.querySelector('.btn-excluir')
      .addEventListener('click', () => excluirPaciente(p.id));

    tbody.appendChild(tr);
  });
}

/* =========================
   SALVAR
========================= */
function salvarPaciente() {
  const paciente = {
    nome: document.getElementById('nome').value.trim(),
    telefone: document.getElementById('telefone').value,
    email: document.getElementById('email').value,
    rua: document.getElementById('rua').value,
    numero: document.getElementById('numero').value,
    bairro: document.getElementById('bairro').value,
    cidade: document.getElementById('cidade').value,
    estado: document.getElementById('estado').value,
    data_nascimento: document.getElementById('data_nascimento').value
  };

  if (!paciente.nome) {
    mostrarToast('Nome é obrigatório', 'erro');
    return;
  }

  const metodo = pacienteEditando ? 'PUT' : 'POST';
  const url = pacienteEditando
    ? `/api/pacientes/${pacienteEditando}`
    : '/api/pacientes';

  fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(paciente)
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao salvar paciente');
      return res.json();
    })
    .then(() => {
      fecharModal();
      carregarPacientes();
      mostrarToast('Paciente salvo com sucesso', 'sucesso');
    })
    .catch(err => mostrarToast(err.message, 'erro'));
}

/* =========================
   EXCLUIR
========================= */
function excluirPaciente(id) {
  if (!confirm('Tem certeza que deseja excluir este paciente?')) return;

  fetch(`/api/pacientes/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao excluir paciente');
      carregarPacientes();
      mostrarToast('Paciente excluído com sucesso', 'sucesso');
    })
    .catch(err => mostrarToast(err.message, 'erro'));
}

/* =========================
   UTIL
========================= */
function limparFormulario() {
  [
    'nome',
    'telefone',
    'email',
    'rua',
    'numero',
    'bairro',
    'cidade',
    'estado',
    'data_nascimento'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

/* =========================
   TOAST
========================= */
function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerText = mensagem;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

let editandoId = null;
let consultaSelecionada = null;
let statusSelecionado = null;

/* ============================
   INICIALIZAÇÃO
============================ */
document.addEventListener('DOMContentLoaded', async () => {
  await carregarConsultas();

  document.getElementById('btnNovaConsulta')
    .addEventListener('click', abrirModalNovaConsulta);

  document.getElementById('formConsulta')
    .addEventListener('submit', salvarConsulta);

  document.getElementById('cancelarConsulta')
    .addEventListener('click', fecharModal);

  document.getElementById('editarConsulta')
    .addEventListener('click', () => { editar(consultaSelecionada); fecharMenu(); });

  document.getElementById('excluirConsulta')
    .addEventListener('click', () => { excluir(consultaSelecionada); fecharMenu(); });

  document.getElementById('realizarConsulta')
    .addEventListener('click', () => {
      window.location.href = `/atendimentos/${consultaSelecionada}`;
    });

  // Fecha menu e modal ao clicar fora
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('menuAcoes');
    if (!menu.contains(e.target) && e.target.className !== 'btn-acoes') fecharMenu();

    const modal = document.getElementById('modalConsulta');
    const modalContent = modal.querySelector('.modal-content');
    if (modal.style.display === 'flex' && !modalContent.contains(e.target) && e.target.id !== 'btnNovaConsulta') {
      fecharModal();
    }
  });
});

/* ============================
   CARREGAR CONSULTAS
============================ */
async function carregarConsultas() {
  const res = await fetch('/api/consultas', { credentials: 'include' });
  const lista = await res.json();

  const tbody = document.getElementById('listaConsultas');
  tbody.innerHTML = '';

  lista.forEach(c => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td data-label="Paciente">${c.paciente_nome}</td>
      <td data-label="Data">${c.data}</td>
      <td data-label="Hora">${c.hora}</td>
      <td data-label="Tipo">${c.tipo || ''}</td>
      <td data-label="Especialidade">${c.especialidade || ''}</td>
      <td data-label="Profissional">${c.profissional_nome}</td>
      <td data-label="Status">${c.status}</td>
      <td data-label="Observações">${c.observacoes || ''}</td>
      <td data-label="Ações">
        <button class="btn-acoes">⋮</button>
      </td>
    `;

    const btn = tr.querySelector('.btn-acoes');
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      abrirMenu(event, c.id, c.status);
    });

    tbody.appendChild(tr);
  });
}

/* ============================
   MENU DE AÇÕES
============================ */
function abrirMenu(event, id, status) {
  consultaSelecionada = id;
  statusSelecionado = status;

  const menu = document.getElementById('menuAcoes');
  menu.style.display = 'block';
  menu.style.top = event.pageY + 'px';
  menu.style.left = event.pageX + 'px';

  const editarBtn = document.getElementById('editarConsulta');
  const excluirBtn = document.getElementById('excluirConsulta');
  const realizarBtn = document.getElementById('realizarConsulta');

  if (status === 'Realizada') {
    editarBtn.style.pointerEvents = 'none';
    editarBtn.style.opacity = '0.5';
    excluirBtn.style.pointerEvents = 'none';
    excluirBtn.style.opacity = '0.5';
    realizarBtn.style.display = 'none';
  } else {
    editarBtn.style.pointerEvents = 'auto';
    editarBtn.style.opacity = '1';
    excluirBtn.style.pointerEvents = 'auto';
    excluirBtn.style.opacity = '1';
    realizarBtn.style.display = 'block';
  }
}

function fecharMenu() {
  const menu = document.getElementById('menuAcoes');
  menu.style.display = 'none';
}

/* ============================
   MODAL CONSULTA
============================ */
async function abrirModalNovaConsulta() {
  editandoId = null;
  document.getElementById('formConsulta').reset();
  await Promise.all([carregarPacientes(), carregarProfissionais()]);
  abrirModal();
}

function abrirModal() {
  document.getElementById('modalConsulta').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modalConsulta').style.display = 'none';
}

/* ============================
   EDITAR
============================ */
async function editar(id) {
  const res = await fetch(`/api/consultas/${id}`, { credentials: 'include' });
  const c = await res.json();
  editandoId = id;

  await Promise.all([carregarPacientes(), carregarProfissionais()]);

  document.getElementById('paciente_id').value = c.paciente_id;
  document.getElementById('profissional_id').value = c.profissional_id;
  document.getElementById('data').value = c.data;
  document.getElementById('hora').value = c.hora;
  document.getElementById('tipo').value = c.tipo;
  document.getElementById('status').value = c.status;
  document.getElementById('observacoes').value = c.observacoes || '';

  abrirModal();
}

/* ============================
   EXCLUIR
============================ */
async function excluir(id) {
  if (!confirm('Deseja excluir esta consulta?')) return;

  await fetch(`/api/consultas/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  showToast('Consulta excluída com sucesso', 'sucesso');
  await carregarConsultas();
}

/* ============================
   SALVAR
============================ */
async function salvarConsulta(e) {
  e.preventDefault();

  const dados = {
    paciente_id: document.getElementById('paciente_id').value,
    profissional_id: document.getElementById('profissional_id').value,
    data: document.getElementById('data').value,
    hora: document.getElementById('hora').value,
    tipo: document.getElementById('tipo').value,
    status: document.getElementById('status').value,
    observacoes: document.getElementById('observacoes').value
  };

  if (!dados.paciente_id || !dados.profissional_id || !dados.data || !dados.hora) {
    showToast('Preencha todos os campos obrigatórios', 'erro');
    return;
  }

  const metodo = editandoId ? 'PUT' : 'POST';
  const url = editandoId ? `/api/consultas/${editandoId}` : '/api/consultas';

  await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dados)
  });

  fecharModal();
  showToast('Consulta salva com sucesso', 'sucesso');
  await carregarConsultas();
}

/* ============================
   CARREGAR PACIENTES
============================ */
async function carregarPacientes() {
  const res = await fetch('/api/pacientes', { credentials: 'include' });
  const lista = await res.json();

  const select = document.getElementById('paciente_id');
  select.innerHTML = '<option value="">Selecione</option>';

  lista.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nome;
    select.appendChild(opt);
  });
}

/* ============================
   CARREGAR PROFISSIONAIS
============================ */
async function carregarProfissionais() {
  const res = await fetch('/api/profissionais', { credentials: 'include' });
  const lista = await res.json();

  const select = document.getElementById('profissional_id');
  select.innerHTML = '<option value="">Selecione</option>';

  lista.filter(p => p.ativo).forEach(prof => {
    const opt = document.createElement('option');
    opt.value = prof.id;
    opt.textContent = `${prof.nome} - ${prof.especialidade}`;
    select.appendChild(opt);
  });
}

/* ============================
   TOASTS
============================ */
function showToast(msg, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

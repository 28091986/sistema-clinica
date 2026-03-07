let pacienteIdGlobal = null;
let usuarioLogado = null; // 🔥 Guarda o usuário logado

/* =========================
   FORMATAR DATA
========================= */
function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR');
}

/* =========================
   INICIALIZAÇÃO
========================= */
document.addEventListener('DOMContentLoaded', async () => {
  const partes = window.location.pathname.split('/');
  const consultaId = partes[partes.length - 1];

  if (!consultaId || isNaN(consultaId)) {
    document.body.innerHTML = `
      <h2>Acesso inválido</h2>
      <p>Este atendimento deve ser iniciado a partir de um agendamento.</p>
    `;
    return;
  }

  try {
    // 🔥 Buscar usuário logado
    const resUsuario = await fetch('/api/login/me', { credentials: 'include' });
    usuarioLogado = await resUsuario.json();

    carregarAtendimento(consultaId);

    const form = document.getElementById('formAtendimento');
    if (form) {
      form.addEventListener('submit', salvarAtendimento);
    }

    const btnHistorico = document.getElementById('btnHistorico');
    if (btnHistorico) {
      btnHistorico.addEventListener('click', abrirHistorico);
    }

  } catch (err) {
    console.error('Erro ao obter usuário logado:', err);
    document.body.innerHTML = `
      <h2>Erro</h2>
      <p>Não foi possível identificar o usuário logado.</p>
    `;
  }
});

/* =========================
   ABRIR HISTÓRICO
========================= */
function abrirHistorico() {
  if (!pacienteIdGlobal) {
    alert('Paciente não identificado');
    return;
  }

  window.location.href = `/historicoConsultas?paciente=${pacienteIdGlobal}`;
}

/* =========================
   CARREGAR ATENDIMENTO
========================= */
async function carregarAtendimento(consultaId) {
  try {
    // Buscar consulta
    const resConsulta = await fetch(`/api/consultas/${consultaId}`, {
      credentials: 'include'
    });

    if (!resConsulta.ok) throw new Error('Erro ao buscar consulta');

    const consulta = await resConsulta.json();

    // 🔥 Guarda paciente
    pacienteIdGlobal = consulta.paciente_id;

    preencherDadosPaciente(consulta);

    // 🔒 Bloquear se usuário não for admin ou profissional responsável
    const podeEditar = usuarioLogado.nivel === 'admin' || usuarioLogado.profissional_id === consulta.profissional_id;

    // Se já realizada ou usuário sem permissão, bloqueia
    if (consulta.status?.toLowerCase() === 'realizada' || !podeEditar) {
      bloquearAcoes();
      if (!podeEditar) {
        alert('Você não tem permissão para editar este atendimento.');
      }
    }

    // Buscar atendimento existente
    const resAtendimento = await fetch(`/api/atendimentos/consulta/${consultaId}`, { credentials: 'include' });

    if (resAtendimento.ok) {
      const atendimento = await resAtendimento.json();
      preencherFormulario(atendimento);
      bloquearAcoes();
    }

    document.getElementById('formAtendimento').style.display = 'block';

  } catch (err) {
    console.error('Erro no carregarAtendimento:', err);
    document.body.innerHTML = `
      <h2>Erro</h2>
      <p>${err.message}</p>
    `;
  }
}

/* =========================
   SALVAR ATENDIMENTO
========================= */
async function salvarAtendimento(e) {
  e.preventDefault();

  const form = e.target;
  const atendimentoId = form.dataset.id;
  const dados = Object.fromEntries(new FormData(form));

  try {
    const metodo = atendimentoId ? 'PUT' : 'POST';
    const url = atendimentoId
      ? `/api/atendimentos/${atendimentoId}`
      : '/api/atendimentos';

    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(dados)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.erro || 'Erro ao salvar atendimento');

    alert('Atendimento salvo com sucesso!');
    bloquearAcoes();

  } catch (err) {
    console.error('Erro ao salvar:', err);
    alert(err.message);
  }
}

/* =========================
   FUNÇÕES AUXILIARES
========================= */
function preencherDadosPaciente(c) {
  const container = document.querySelector('.dados-paciente');

  container.innerHTML = `
    <p><strong>Paciente:</strong> ${c.paciente_nome}</p>
    <p><strong>Data:</strong> ${formatarData(c.data)}</p>
    <p><strong>Hora:</strong> ${c.hora}</p>
    <p><strong>Profissional:</strong> ${c.profissional_nome}</p>
  `;

  document.querySelector('[name="consulta_id"]').value = c.id;
}

function preencherFormulario(dados) {
  for (const campo in dados) {
    const el = document.querySelector(`[name="${campo}"]`);
    if (el) el.value = dados[campo] ?? '';
  }

  document.getElementById('formAtendimento').dataset.id = dados.id;
}

function bloquearAcoes() {
  const form = document.getElementById('formAtendimento');

  if (!form) return;

  form.querySelectorAll('input, select, textarea, button')
    .forEach(el => el.disabled = true);
}
document.addEventListener('DOMContentLoaded', () => {
  carregarFinanceiro();

  document.getElementById('filtroStatus')
    .addEventListener('change', (e) => {
      carregarFinanceiro(e.target.value);
    });

  // Fechar modal
  document.getElementById('cancelarPagamento')
    .addEventListener('click', fecharModalPagamento);

  // Seleção do método de pagamento
  document.querySelectorAll('.botoes-metodo button')
    .forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const metodo = e.target.dataset.metodo;
        if (!pagamentoSelecionadoId) return;
        await registrarPagamento(pagamentoSelecionadoId, metodo);
        fecharModalPagamento();
        carregarFinanceiro();
      });
    });
});

let pagamentoSelecionadoId = null;

// ====================
// CARREGAR FINANCEIRO
// ====================
async function carregarFinanceiro(statusFiltro) {
  try {
    const url = statusFiltro ? `/api/financeiro?status=${statusFiltro}` : '/api/financeiro';
    const res = await fetch(url, { credentials: 'include' });
    
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.erro || 'Erro ao buscar financeiro');
    }

    const dados = await res.json();
    const tbody = document.getElementById('tabelaFinanceiro');
    tbody.innerHTML = '';

    if (!dados.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    dados.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${f.paciente}</td>
        <td>${f.tipo}</td>
        <td>${formatarData(f.data)}</td>
        <td>${f.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${f.status}</td>
        <td>
          ${f.status === 'Pendente' ? `<button class="btn-pagar" data-id="${f.id}">Pagar</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Adiciona evento para os botões "Pagar"
    document.querySelectorAll('.btn-pagar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        pagamentoSelecionadoId = e.target.dataset.id;
        abrirModalPagamento();
      });
    });

  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}

// ====================
// MODAL DE PAGAMENTO
// ====================
function abrirModalPagamento() {
  document.getElementById('modalPagamento').style.display = 'flex';
}

function fecharModalPagamento() {
  document.getElementById('modalPagamento').style.display = 'none';
  pagamentoSelecionadoId = null;
}

// ====================
// REGISTRAR PAGAMENTO
// ====================
async function registrarPagamento(id, metodo) {
  try {
    await fetch(`/api/financeiro/${id}/pagar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metodo })
    });
    alert(`Pagamento registrado: ${metodo}`);
  } catch (erro) {
    console.error(erro);
    alert('Erro ao registrar pagamento');
  }
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}
async function pagar(id, metodo, conta_id = null) {
  await fetch(`/api/financeiro/${id}/pagar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metodo, conta_id })
  });

  carregarFinanceiro();
}

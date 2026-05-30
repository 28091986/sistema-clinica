// 🔹 Inicializa Caixa como SPA
window.initCaixa = function() {
  document.getElementById('btnAbrirCaixa')
    .addEventListener('click', abrirCaixa);

  document.getElementById('btnFecharCaixa')
    .addEventListener('click', fecharCaixa);

  document.getElementById('btnRegistrarPagamento')
    .addEventListener('click', registrarPagamento);

  document.getElementById('lancamentoFinanceiro')
    .addEventListener('change', atualizarValorPagamento);

  // Inicia a tela conforme status do caixa
  iniciarCaixa();
};

let caixaAtual = null;

// ================= INICIALIZAÇÃO =================
async function iniciarCaixa() {
  try {
    const response = await fetch('/api/caixa/status', { credentials: 'include' });
    const data = await response.json();

    if (data.aberto) {
      caixaAtual = data.caixa;
      mostrarFinanceiro(caixaAtual);
      await carregarPendentes();
    } else {
      mostrarAbertura();
    }

  } catch (err) {
    console.error('Erro ao iniciar caixa:', err);
  }
}

// ================= CONTROLE DE TELAS =================
function mostrarAbertura() {
  document.getElementById('blocoAbrirCaixa').style.display = 'block';
  document.getElementById('blocoFinanceiro').style.display = 'none';
}

function mostrarFinanceiro(caixa) {
  document.getElementById('blocoAbrirCaixa').style.display = 'none';
  document.getElementById('blocoFinanceiro').style.display = 'block';

  document.getElementById('caixaId').textContent = caixa.id;
  document.getElementById('usuarioCaixa').textContent = caixa.usuario_nome || `ID ${caixa.usuario_abertura}`;
  document.getElementById('saldoInicialCaixa').textContent = Number(caixa.saldo_inicial).toFixed(2);
}

// ================= ABRIR CAIXA =================
async function abrirCaixa() {
  const saldoInicial = parseFloat(document.getElementById('saldoInicial').value);
  if (isNaN(saldoInicial) || saldoInicial < 0) {
    alert('Informe um saldo inicial válido.');
    return;
  }

  try {
    const res = await fetch('/api/caixa/abrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ saldo_inicial: saldoInicial })
    });
    const result = await res.json();

    if (result.sucesso) {
      await iniciarCaixa();
    } else {
      alert(result.erro || 'Erro ao abrir caixa.');
    }
  } catch (err) {
    console.error(err);
  }
}

// ================= FECHAR CAIXA =================
async function fecharCaixa() {
  if (!confirm('Deseja realmente fechar o caixa?')) return;

  try {
    const res = await fetch('/api/caixa/fechar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ saldo_final: 0 })
    });
    const result = await res.json();

    if (result.sucesso) {
      await iniciarCaixa();
    } else {
      alert(result.erro || 'Erro ao fechar caixa.');
    }
  } catch (err) {
    console.error(err);
  }
}

// ================= CARREGAR PENDENTES =================
async function carregarPendentes() {
  try {
    const select = document.getElementById('lancamentoFinanceiro');
    
    // Se o HTML do caixa ainda não estiver na tela, para a execução sem estourar erro
    if (!select) return;

    const res = await fetch('/api/pagamentos/pendentes', { credentials: 'include' });
    const lista = await res.json();

    select.innerHTML = '<option value="">Selecione</option>';

    lista.forEach(item => {
      const option = document.createElement('option');
      option.value = item.financeiro_id;
      option.dataset.valor = item.valor;
      option.textContent = `${item.paciente_nome} - ${item.descricao} - R$ ${Number(item.valor).toFixed(2)}`;
      select.appendChild(option);
    });

    // 🌟 VERIFICAÇÃO DE PONTE ENTRE TELAS:
    // Verifica se o usuário veio da tela de financeiro querendo pagar alguém
    const idParaPreencher = localStorage.getItem('pagamento_pendente_id');
    
    if (idParaPreencher) {
      // Aplica o ID no select do caixa
      select.value = idParaPreencher;
      
      // Dispara o evento de atualização de valores na tela do caixa
      atualizarValorPagamento();
      
      // Limpa a memória para que isso não aconteça toda vez que o caixa abrir
      localStorage.removeItem('pagamento_pendente_id');

      // Foca o cursor no campo de valor recebido para o operador apenas digitar o dinheiro
      setTimeout(() => {
        document.getElementById('valorRecebido')?.focus();
      }, 100);
    }

  } catch (err) {
    console.error('Erro ao carregar lançamentos pendentes:', err);
  }
}

// ================= ATUALIZAR VALOR AUTOMÁTICO =================
function atualizarValorPagamento() {
  const select = document.getElementById('lancamentoFinanceiro');
  const valor = select.selectedOptions[0]?.dataset.valor || 0;
  document.getElementById('valorPago').value = Number(valor).toFixed(2);
}

// ================= REGISTRAR PAGAMENTO =================
async function registrarPagamento() {
  const caixa_id = parseInt(document.getElementById('caixaId').textContent);
  const select = document.getElementById('lancamentoFinanceiro');
  const financeiro_id = parseInt(select.value);
  const valor_pago = parseFloat(select.selectedOptions[0]?.dataset.valor);
  const valor_recebido = parseFloat(document.getElementById('valorRecebido').value);
  const metodo_pagamento = document.getElementById('metodoPagamento').value;

  if (!financeiro_id || isNaN(valor_recebido) || !metodo_pagamento) {
    alert('Preencha todos os campos.');
    return;
  }

  try {
    const res = await fetch('/api/pagamentos/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ caixa_id, financeiro_id, valor_pago, valor_recebido, metodo_pagamento })
    });

    const result = await res.json();

    if (result.sucesso) {
      document.getElementById('mensagem').textContent =
        `Pagamento registrado. Troco: R$ ${Number(result.troco).toFixed(2)}`;

      if (result.pagamento_id) {
        window.open(`/api/recibos/${result.pagamento_id}`, '_blank');
      }

      document.getElementById('valorRecebido').value = '';
      document.getElementById('valorPago').value = '';
      document.getElementById('lancamentoFinanceiro').value = '';

      await carregarPendentes();
    } else {
      alert(result.erro || 'Erro ao registrar pagamento.');
    }
  } catch (err) {
    console.error(err);
  }
}
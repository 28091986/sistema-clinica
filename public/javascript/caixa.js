document.addEventListener('DOMContentLoaded', () => {
  iniciarFinanceiro();

  document.getElementById('btnAbrirCaixa')
    .addEventListener('click', abrirCaixa);

  document.getElementById('btnFecharCaixa')
    .addEventListener('click', fecharCaixa);

  document.getElementById('btnRegistrarPagamento')
    .addEventListener('click', registrarPagamento);

  document.getElementById('lancamentoFinanceiro')
    .addEventListener('change', atualizarValorPagamento);
});

/* =====================================================
   🔄 INICIALIZAÇÃO
===================================================== */
async function iniciarFinanceiro() {
  try {
    const response = await fetch('/api/caixa/status', {
      credentials: 'include'
    });

    const data = await response.json();

    if (data.aberto) {
      mostrarFinanceiro(data.caixa);
      await carregarPendentes();
    } else {
      mostrarAbertura();
    }

  } catch (err) {
    console.error('Erro ao iniciar financeiro:', err);
  }
}

/* =====================================================
   📦 CONTROLE DE TELAS
===================================================== */
function mostrarAbertura() {
  document.getElementById('blocoAbrirCaixa').style.display = 'block';
  document.getElementById('blocoFinanceiro').style.display = 'none';
}

function mostrarFinanceiro(caixa) {
  document.getElementById('blocoAbrirCaixa').style.display = 'none';
  document.getElementById('blocoFinanceiro').style.display = 'block';

  document.getElementById('caixaId').textContent = caixa.id;
  document.getElementById('usuarioCaixa').textContent =
    caixa.usuario_nome || `ID ${caixa.usuario_abertura}`;

  document.getElementById('saldoInicialCaixa').textContent =
    Number(caixa.saldo_inicial).toFixed(2);
}

/* =====================================================
   💰 ABRIR CAIXA
===================================================== */
async function abrirCaixa() {
  const saldoInicial = parseFloat(
    document.getElementById('saldoInicial').value
  );

  if (isNaN(saldoInicial) || saldoInicial < 0) {
    alert('Informe um saldo inicial válido.');
    return;
  }

  try {
    const response = await fetch('/api/caixa/abrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ saldo_inicial: saldoInicial })
    });

    const result = await response.json();

    if (result.sucesso) {
      await iniciarFinanceiro();
    } else {
      alert(result.erro || 'Erro ao abrir caixa.');
    }

  } catch (err) {
    console.error('Erro ao abrir caixa:', err);
  }
}

/* =====================================================
   🔒 FECHAR CAIXA
===================================================== */
async function fecharCaixa() {
  if (!confirm('Deseja realmente fechar o caixa?')) return;

  try {
    const response = await fetch('/api/caixa/fechar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ saldo_final: 0 })
    });

    const result = await response.json();

    if (result.sucesso) {
      await iniciarFinanceiro();
    } else {
      alert(result.erro || 'Erro ao fechar caixa.');
    }

  } catch (err) {
    console.error('Erro ao fechar caixa:', err);
  }
}

/* =====================================================
   📋 CARREGAR PENDENTES
===================================================== */
async function carregarPendentes() {
  try {
    const response = await fetch('/api/pagamentos/pendentes', {
      credentials: 'include'
    });

    const lista = await response.json();

    const select = document.getElementById('lancamentoFinanceiro');
    select.innerHTML = '<option value="">Selecione</option>';

    lista.forEach(item => {
      const option = document.createElement('option');
      option.value = item.financeiro_id;
      option.dataset.valor = item.valor;

      option.textContent =
        `${item.paciente_nome} - ${item.descricao} - R$ ${Number(item.valor).toFixed(2)}`;

      select.appendChild(option);
    });

  } catch (err) {
    console.error('Erro ao carregar pendentes:', err);
  }
}

/* =====================================================
   🔢 ATUALIZAR VALOR AUTOMÁTICO
===================================================== */
function atualizarValorPagamento() {
  const select = document.getElementById('lancamentoFinanceiro');
  const valor = select.selectedOptions[0]?.dataset.valor || 0;

  document.getElementById('valorPago').value =
    Number(valor).toFixed(2);
}

/* =====================================================
   🧾 REGISTRAR PAGAMENTO
===================================================== */
async function registrarPagamento() {
  const caixa_id = parseInt(document.getElementById('caixaId').textContent);

  const select = document.getElementById('lancamentoFinanceiro');
  const financeiro_id = parseInt(select.value);
  const valor_pago = parseFloat(select.selectedOptions[0]?.dataset.valor);

  const valor_recebido =
    parseFloat(document.getElementById('valorRecebido').value);

  const metodo_pagamento =
    document.getElementById('metodoPagamento').value;

  if (!financeiro_id || isNaN(valor_recebido) || !metodo_pagamento) {
    alert('Preencha todos os campos.');
    return;
  }

  try {
    const response = await fetch('/api/pagamentos/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        caixa_id,
        financeiro_id,
        valor_pago,
        valor_recebido,
        metodo_pagamento
      })
    });

    const result = await response.json();

    console.log("Resposta do servidor:", result); // IMPORTANTE

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
    console.error('Erro ao registrar pagamento:', err);
  }
}
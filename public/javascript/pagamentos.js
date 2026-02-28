

document.addEventListener('DOMContentLoaded', async () => {
  const caixaIdEl = document.getElementById('caixaId');
  const usuarioCaixaEl = document.getElementById('usuarioCaixa');
  const saldoInicialEl = document.getElementById('saldoInicialCaixa');
  const lancamentoSelect = document.getElementById('lancamentoFinanceiro');
  const valorPagoEl = document.getElementById('valorPago');
  const valorRecebidoEl = document.getElementById('valorRecebido');
  const metodoPagamentoEl = document.getElementById('metodoPagamento');
  const msg = document.getElementById('mensagem');

  // =============================
  // 1️⃣ Buscar caixa aberto
  // =============================
  try {
    const res = await fetch('/api/caixa/status', { credentials: 'include' });
    const data = await res.json();

    if (!data.aberto || !data.caixa) {
      msg.textContent = 'Nenhum caixa aberto.';
      return;
    }

    caixaIdEl.textContent = data.caixa.id;
    usuarioCaixaEl.textContent = data.caixa.usuario_nome || `ID ${data.caixa.usuario_abertura}`;
    saldoInicialEl.textContent = Number(data.caixa.saldo_inicial).toFixed(2);

  } catch (err) {
    console.error(err);
    msg.textContent = 'Erro ao carregar caixa.';
    return;
  }

  // =============================
  // 2️⃣ Buscar lançamentos pendentes
  // =============================
  try {
    const res = await fetch('/api/pagamentos/pendentes', { credentials: 'include' });
    const lancamentos = await res.json();

    lancamentoSelect.innerHTML = '<option value="">Selecione...</option>';

    lancamentos.forEach(l => {
      const option = document.createElement('option');
      option.value = l.financeiro_id; // ✅ PADRÃO CORRETO
      option.textContent = `${l.descricao} - R$ ${Number(l.valor).toFixed(2)} (Paciente: ${l.paciente_nome})`;
      option.dataset.valor = l.valor;
      lancamentoSelect.appendChild(option);
    });

  } catch (err) {
    console.error(err);
    msg.textContent = 'Erro ao carregar lançamentos.';
  }

  // =============================
  // 3️⃣ Atualizar valor automaticamente
  // =============================
  lancamentoSelect.addEventListener('change', () => {
    const selected = lancamentoSelect.selectedOptions[0];

    if (selected && selected.dataset.valor) {
      valorPagoEl.value = Number(selected.dataset.valor).toFixed(2);
    } else {
      valorPagoEl.value = '';
    }
  });

  // =============================
  // 4️⃣ Registrar pagamento
  // =============================
  document.getElementById('btnRegistrarPagamento')
    .addEventListener('click', async () => {

      const caixa_id = parseInt(caixaIdEl.textContent);
      const financeiro_id = parseInt(lancamentoSelect.value);
      const valor_recebido = parseFloat(valorRecebidoEl.value);
      const metodo_pagamento = metodoPagamentoEl.value;

      if (!caixa_id || !financeiro_id || isNaN(valor_recebido) || !metodo_pagamento) {
        msg.textContent = 'Preencha todos os campos corretamente.';
        return;
      }

      try {
        const res = await fetch('/api/pagamentos/registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            caixa_id,
            financeiro_id,
            valor_recebido,
            metodo_pagamento
          })
        });

        const result = await res.json();

        if (result.sucesso) {
          msg.textContent = `Pagamento registrado. Troco: R$ ${result.troco.toFixed(2)}`;

          lancamentoSelect.value = '';
          valorPagoEl.value = '';
          valorRecebidoEl.value = '';
          metodoPagamentoEl.value = '';
        } else {
          msg.textContent = result.erro;
        }

      } catch (err) {
        console.error(err);
        msg.textContent = 'Erro ao registrar pagamento.';
      }
    });
});



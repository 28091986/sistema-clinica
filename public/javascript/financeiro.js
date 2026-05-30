window.initFinanceiro = function() {
  carregarFinanceiro();

  document.getElementById('filtroStatus')
    .addEventListener('change', (e) => {
      carregarFinanceiro(e.target.value);
    });

  async function carregarFinanceiro(statusFiltro) {
    try {
      const url = statusFiltro ? `/api/financeiro?status=${statusFiltro}` : '/api/financeiro';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar financeiro');

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
            ${f.status === 'Pendente' ? `<button class="btn-enviar-caixa" data-id="${f.id}">Pagar no Caixa</button>` : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Evento do botão "Pagar no Caixa"
      document.querySelectorAll('.btn-enviar-caixa').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idFinanceiro = e.target.dataset.id;

          // 1. Salva o ID temporariamente no navegador
          localStorage.setItem('pagamento_pendente_id', idFinanceiro);

          // 2. Simula o clique no botão do seu menu principal que abre a tela do Caixa
          // Procure pelo ID real do botão do Caixa no seu menu lateral/superior (ex: 'menuCaixa', 'btn-caixa')
          const botaoMenuCaixa = document.getElementById('menuCaixa') || document.querySelector('[data-page="caixa"]');
          
          if (botaoMenuCaixa) {
            botaoMenuCaixa.click(); 
          } else {
            // Se você não usa cliques no menu para mudar de aba, chame a função global da sua SPA aqui:
            // Exemplo: window.mudarTela('caixa');
            alert('Por favor, clique na aba "Caixa" para concluir o pagamento. Os dados já foram enviados!');
          }
        });
      });

    } catch (erro) {
      console.error(erro);
      alert(erro.message);
    }
  }

  function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
  }
};
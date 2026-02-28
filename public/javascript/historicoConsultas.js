document.addEventListener('DOMContentLoaded', carregarHistorico);

async function carregarHistorico() {
  const params = new URLSearchParams(window.location.search);
  const pacienteId = params.get('paciente');

  if (!pacienteId) {
    alert('Paciente não informado');
    return;
  }

  try {
    // Atualizado para a rota correta
    const res = await fetch(`/api/atendimentos/historico/${pacienteId}`, {
      credentials: 'include'
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.erro || 'Erro ao buscar histórico do paciente');
    }

    const lista = await res.json();

    const tbody = document.getElementById('listaHistorico');
    tbody.innerHTML = '';

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="4">Nenhum histórico encontrado.</td></tr>`;
      return;
    }

    lista.forEach(item => {
      const tr = document.createElement('tr');

      const tdPaciente = document.createElement('td');
      tdPaciente.textContent = item.paciente_nome;

      const tdData = document.createElement('td');
      tdData.textContent = new Date(item.criado_em).toLocaleDateString('pt-BR');

      const tdDiagnostico = document.createElement('td');
      tdDiagnostico.textContent = item.diagnostico;

      const tdAcoes = document.createElement('td');
      const btn = document.createElement('button');
      btn.textContent = 'Ver';
      btn.addEventListener('click', () => {
        window.location.href = `/atendimentos/${item.consulta_id}`;
      });
      tdAcoes.appendChild(btn);

      tr.appendChild(tdPaciente);
      tr.appendChild(tdData);
      tr.appendChild(tdDiagnostico);
      tr.appendChild(tdAcoes);

      tbody.appendChild(tr);
    });

  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}
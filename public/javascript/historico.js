document.addEventListener('DOMContentLoaded', () => {
  carregarHistorico();
});

async function carregarHistorico() {
  try {
    const res = await fetch('/api/consultas/historico', {
      credentials: 'include'
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.erro || 'Erro ao buscar histórico');
    }

    const consultas = await res.json();
    const tbody = document.getElementById('tabelaHistorico');
    tbody.innerHTML = '';

    if (!consultas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">Nenhuma consulta realizada.</td>
        </tr>
      `;
      return;
    }

    consultas.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.paciente ?? ''}</td>
        <td>${c.profissional ?? ''}</td>
        <td>${c.especialidade ?? ''}</td>
        <td>${formatarData(c.data)}</td>
        <td>${c.hora ?? ''}</td>
        <td>${c.tipo ?? ''}</td>
        <td class="status">${c.status ?? ''}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}

function formatarData(data) {
  return data ? new Date(data).toLocaleDateString('pt-BR') : '';
}

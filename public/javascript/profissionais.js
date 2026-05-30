(function () {
  let editandoId = null;

  /* ==========================================================================
     INICIALIZAÇÃO
  ========================================================================== */
  window.initProfissionais = async function () {
    console.log('Inicializando profissionais...');

    await carregarProfissionais();
    await verificarPermissaoBotao();

    vincularEventos();
  };

  /* ==========================================================================
     EVENTOS
  ========================================================================== */
  function vincularEventos() {
    const modal = document.getElementById('modalProfissional');
    const btnNovo = document.getElementById('btnNovoProfissional');
    const btnSalvar = document.querySelector('.prof-btn-salvar');
    const btnCancelar = document.querySelector('.prof-btn-cancelar');

    if (btnNovo) btnNovo.onclick = abrirModalNovo;
    if (btnSalvar) btnSalvar.onclick = salvarProfissional;
    if (btnCancelar) btnCancelar.onclick = fecharModal;

    if (modal) {
      modal.onclick = function (e) {
        if (e.target === modal) fecharModal();
      };
    }
  }

  /* ==========================================================================
     MODAL
  ========================================================================== */
  function abrirModalNovo() {
    editandoId = null;

    const titulo = document.querySelector('.prof-form h2');
    if (titulo) titulo.textContent = 'Novo Profissional';

    limparFormulario();
    abrirModal();
  }

  function abrirModal() {
    const modal = document.getElementById('modalProfissional');
    if (modal) modal.style.display = 'flex';
  }

  function fecharModal() {
    const modal = document.getElementById('modalProfissional');

    if (modal) {
      modal.style.display = 'none';
      limparFormulario();

      const titulo = document.querySelector('.prof-form h2');
      if (titulo) titulo.textContent = 'Novo Profissional';
    }

    editandoId = null;
  }

  function limparFormulario() {
    const campos = {
      '.prof-input-nome': '',
      '.prof-input-especialidade': '',
      '.prof-input-email': '',
      '.prof-input-senha': '',
      '.prof-select-ativo': '1',
      '.prof-select-nivel': 'profissional'
    };

    Object.entries(campos).forEach(([selector, valor]) => {
      const campo = document.querySelector(selector);
      if (campo) campo.value = valor;
    });
  }

  /* ==========================================================================
     PERMISSÃO
  ========================================================================== */
  async function verificarPermissaoBotao() {
    const botao = document.getElementById('btnNovoProfissional');
    if (!botao) return;

    try {
      const res = await fetch('/api/me', {
        credentials: 'include'
      });

      const usuario = await res.json();

      if (usuario.nivel !== 'admin') {
        botao.disabled = true;
        botao.style.opacity = '0.5';
        botao.title = 'Apenas administradores';
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* ==========================================================================
     LISTAR
  ========================================================================== */
  async function carregarProfissionais() {
    try {
      const res = await fetch('/api/profissionais', {
        credentials: 'include'
      });

      const profissionais = await res.json();
      renderizarTabela(profissionais);

    } catch (err) {
      console.error('Erro ao carregar profissionais:', err);
    }
  }

  function renderizarTabela(lista) {
    const tbody = document.getElementById('listaProfissionais');
    if (!tbody) return;

    tbody.innerHTML = lista.map(prof => `
      <tr>
        <td>${prof.nome || ''}</td>
        <td>${prof.especialidade || ''}</td>
        <td>
          <span class="${Number(prof.ativo) ? 'status-ativo' : 'status-inativo'}">
            ${Number(prof.ativo) ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>${prof.email || ''}</td>
        <td>
          <button class="btn-editar" data-id="${prof.id}">
            Editar
          </button>

          <button class="btn-excluir" data-id="${prof.id}">
            Excluir
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-editar').forEach(btn => {
      btn.onclick = () => editarProfissional(btn.dataset.id);
    });

    tbody.querySelectorAll('.btn-excluir').forEach(btn => {
      btn.onclick = () => excluirProfissional(btn.dataset.id);
    });
  }

  /* ==========================================================================
     EDITAR
  ========================================================================== */
  async function editarProfissional(id) {
    try {
      const res = await fetch(`/api/profissionais/${id}`, {
        credentials: 'include'
      });

      const prof = await res.json();

      editandoId = id;

      document.querySelector('.prof-form h2').textContent = 'Editar Profissional';
      document.querySelector('.prof-input-nome').value = prof.nome || '';
      document.querySelector('.prof-input-especialidade').value = prof.especialidade || '';
      document.querySelector('.prof-input-email').value = prof.email || '';
      document.querySelector('.prof-input-senha').value = '';
      document.querySelector('.prof-select-ativo').value = prof.ativo;
      document.querySelector('.prof-select-nivel').value = prof.nivel;

      abrirModal();

    } catch (err) {
      console.error(err);
      alert('Erro ao carregar profissional');
    }
  }

  /* ==========================================================================
     SALVAR
  ========================================================================== */
  async function salvarProfissional(e) {
    if (e) e.preventDefault();

    const dados = {
      nome: document.querySelector('.prof-input-nome').value.trim(),
      especialidade: document.querySelector('.prof-input-especialidade').value.trim(),
      email: document.querySelector('.prof-input-email').value.trim(),
      senha: document.querySelector('.prof-input-senha').value.trim(),
      nivel: document.querySelector('.prof-select-nivel').value,
      ativo: Number(document.querySelector('.prof-select-ativo').value)
    };

    if (!dados.nome || !dados.especialidade || !dados.email) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    const url = editandoId
      ? `/api/profissionais/${editandoId}`
      : '/api/profissionais';

    const metodo = editandoId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: metodo,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      if (!res.ok) {
        const erro = await res.json();
        alert(erro.erro || 'Erro ao salvar');
        return;
      }

      fecharModal();
      await carregarProfissionais();

    } catch (err) {
      console.error(err);
      alert('Erro de conexão');
    }
  }

  /* ==========================================================================
     EXCLUIR
  ========================================================================== */
  async function excluirProfissional(id) {
    if (!confirm('Deseja excluir este profissional?')) return;

    try {
      await fetch(`/api/profissionais/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      await carregarProfissionais();

    } catch (err) {
      console.error(err);
      alert('Erro ao excluir');
    }
  }

})();
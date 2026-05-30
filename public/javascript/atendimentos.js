(function() {
    let pacienteIdGlobal = null;
    let usuarioLogado = null;

    function formatarData(data) {
        if (!data) return '';
        const d = new Date(data);
        if (isNaN(d)) return data; 
        return d.toLocaleDateString('pt-BR');
    }

    // FUNÇÃO PRINCIPAL
    window.initAtendimento = async function(consultaId) {
      

        if (!consultaId) {
            document.getElementById('conteudo').innerHTML = `
                <div class="card">
                    <h2>Acesso inválido</h2>
                    <p>Este atendimento deve ser iniciado a partir de um agendamento.</p>
                </div>`;
            return;
        }

        try {
            // 🔒 Usuário logado
            const resUsuario = await fetch('/api/login/me', { credentials: 'include' });
            if (!resUsuario.ok) throw new Error("Não autorizado");
            usuarioLogado = await resUsuario.json();

            // 📦 Carregar atendimento
            await carregarAtendimento(consultaId);

            // 🎯 Eventos
            const form = document.getElementById('formAtendimento');
            if (form) form.onsubmit = salvarAtendimento;

            const btnHist = document.getElementById('btnHistorico');
            if (btnHist) btnHist.onclick = abrirHistorico;

        } catch (err) {
            console.error('Erro na inicialização:', err);
            document.getElementById('conteudo').innerHTML =
                `<h2>Erro</h2><p>Falha ao carregar atendimento.</p>`;
        }
    };

    // FUNÇÃO DE CARREGAR ATENDIMENTO COM PERMISSÃO
    async function carregarAtendimento(consultaId) {
        const res = await fetch(`/api/atendimentos/consulta/${consultaId}`, {
            credentials: 'include'
        });
        if (!res.ok) {
            const erro = await res.text();
            console.error("Erro backend:", erro);
            throw new Error('Erro ao buscar atendimento');
        }

        const dados = await res.json();
        pacienteIdGlobal = dados.paciente_id;

        preencherDadosPaciente(dados);

        // 🔒 Lógica de permissão
        const podeEditar =
            usuarioLogado.nivel === 'admin' ||
            usuarioLogado.profissional_id === dados.profissional_id;

        const form = document.getElementById('formAtendimento');
        if (!podeEditar) {
            if (form) form.style.display = 'none'; // esconde formulário
            alert('Você não tem permissão para realizar esta consulta.');
            return; // interrompe execução
        }

        // ✏️ Preenche formulário se já existe atendimento
        if (dados.queixa_principal || dados.diagnostico) {
            preencherFormulario(dados);
            bloquearAcoes();
        }

        // Exibe formulário somente se permitido
        if (form) form.style.display = 'block';
    }

    function abrirHistorico() {
        if (!pacienteIdGlobal) return alert('Paciente não identificado');
        if (typeof window.carregarPagina === 'function') {
            window.carregarPagina('historico', pacienteIdGlobal);
        } else {
            window.location.href = `/historico?paciente=${pacienteIdGlobal}`;
        }
    }

    async function salvarAtendimento(e) {
        e.preventDefault();
        const form = e.target;
        const atendimentoId = form.dataset.id;
        const dados = Object.fromEntries(new FormData(form));

        try {
            const metodo = atendimentoId ? 'PUT' : 'POST';
            const url = atendimentoId ? `/api/atendimentos/${atendimentoId}` : '/api/atendimentos';

            const res = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(dados)
            });

            if (!res.ok) {
                const erro = await res.text();
                console.error(erro);
                throw new Error('Erro ao salvar');
            }

            alert('Atendimento finalizado com sucesso!');
            bloquearAcoes();
        } catch (err) {
            alert(err.message);
        }
    }

    function preencherDadosPaciente(c) {
        const container = document.querySelector('.dados-paciente');
        if (!container) return;

        container.innerHTML = `
            <div class="info-grid">
                <p><strong>Paciente:</strong> ${c.paciente_nome}</p>
                <p><strong>Data:</strong> ${formatarData(c.data)}</p>
                <p><strong>Hora:</strong> ${c.hora}</p>
                <p><strong>Profissional:</strong> ${c.profissional_nome}</p>
            </div>
        `;

        const inputConsulta = document.querySelector('[name="consulta_id"]');
        if (inputConsulta) inputConsulta.value = c.id;

        const inputPac = document.querySelector('[name="paciente_id"]');
        if (inputPac) inputPac.value = c.paciente_id;
    }

    function preencherFormulario(dados) {
        for (const campo in dados) {
            const el = document.querySelector(`[name="${campo}"]`);
            if (el) el.value = dados[campo] ?? '';
        }
        const form = document.getElementById('formAtendimento');
        if (form) form.dataset.id = dados.id;
    }

    function bloquearAcoes() {
        const form = document.getElementById('formAtendimento');
        if (!form) return;
        form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
        const btnSalvar = form.querySelector('button[type="submit"]');
        if (btnSalvar) btnSalvar.style.display = 'none';
    }

})();

async function iniciarAtendimento(idConsulta) {
    const res = await fetch(`/api/atendimentos/consulta/${idConsulta}`);
    const consulta = await res.json();

    document.querySelector('[name="consulta_id"]').value = consulta.id;
    document.querySelector('[name="paciente_id"]').value = consulta.paciente_id;

    document.querySelector('.dados-paciente').innerHTML = `
        <p><strong>Paciente:</strong> ${consulta.paciente_nome}</p>
        <p><strong>Profissional:</strong> ${consulta.profissional_nome}</p>
        <p><strong>Data:</strong> ${consulta.data} ${consulta.hora}</p>
    `;
}


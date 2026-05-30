/* =========================
   VARIÁVEIS GLOBAIS
========================= */
let pacientesCache = [];
let pacienteEditando = null;

// Esta função será chamada pelo home.js toda vez que a aba abrir
function inicializarModuloPacientes() {
    console.log("Módulo de Pacientes Iniciado");
    carregarPacientes();
    configurarEventosPacientes();
}

function configurarEventosPacientes() {
    const btnNovo = document.getElementById('btnNovo');
    const btnCancelar = document.getElementById('cancelarPaciente');
    const btnSalvar = document.getElementById('salvarPaciente');
    const modal = document.getElementById('modalPaciente');
    const inputBusca = document.getElementById('busca');

    // Usamos atribuição direta para evitar duplicidade de eventos ao trocar de aba
    if (btnNovo) btnNovo.onclick = abrirModalNovo;
    if (btnCancelar) btnCancelar.onclick = fecharModal;
    if (btnSalvar) btnSalvar.onclick = salvarPaciente;

    if (modal) {
        modal.onclick = (e) => {
            if (e.target.id === 'modalPaciente') fecharModal();
        };
    }

    if (inputBusca) {
        inputBusca.oninput = () => {
            const termo = inputBusca.value.toLowerCase();
            const filtrados = pacientesCache.filter(p =>
                p.nome.toLowerCase().includes(termo) ||
                (p.telefone ?? '').toLowerCase().includes(termo) ||
                (p.email ?? '').toLowerCase().includes(termo)
            );
            renderizarTabela(filtrados);
        };
    }
}

/* =========================
   LÓGICA DE MODAL
========================= */
function abrirModalNovo() {
    pacienteEditando = null;
    document.querySelector('#formPaciente h2').innerText = 'Novo Paciente';
    limparFormulario();
    document.getElementById('modalPaciente').classList.add('ativo');
}

function abrirModalEditar(paciente) {
    pacienteEditando = paciente.id;
    document.querySelector('#formPaciente h2').innerText = 'Editar Paciente';

    const campos = ['nome', 'telefone', 'email', 'rua', 'numero', 'bairro', 'cidade', 'estado'];
    campos.forEach(id => {
        document.getElementById(id).value = paciente[id] ?? '';
    });

    if (paciente.data_nascimento) {
        document.getElementById('data_nascimento').value = paciente.data_nascimento.split('T')[0];
    }

    document.getElementById('modalPaciente').classList.add('ativo');
}

function fecharModal() {
    const modal = document.getElementById('modalPaciente');
    if (modal) modal.classList.remove('ativo');
    limparFormulario();
}

/* =========================
   API / RENDERIZAÇÃO
========================= */
function carregarPacientes() {
    fetch('/api/pacientes', { credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error('Erro ao carregar pacientes');
            return res.json();
        })
        .then(pacientes => {
            pacientesCache = pacientes;
            renderizarTabela(pacientesCache);
        })
        .catch(err => mostrarToast(err.message, 'erro'));
}

function renderizarTabela(lista) {
    const tbody = document.getElementById('listaPacientes');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;">Nenhum paciente encontrado</td></tr>`;
        return;
    }

    lista.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.nome}</td>
            <td>${p.telefone ?? ''}</td>
            <td>${p.email ?? ''}</td>
            <td>${p.rua ?? ''}</td>
            <td>${p.numero ?? ''}</td>
            <td>${p.bairro ?? ''}</td>
            <td>${p.cidade ?? ''}</td>
            <td>${p.estado ?? ''}</td>
            <td>${p.data_nascimento ? formatarData(p.data_nascimento) : ''}</td>
            <td><span class="status ${(p.status ?? 'regular').toLowerCase()}">${p.status ?? 'Regular'}</span></td>
            <td>
                <button class="btn-editar">Editar</button>
                <button class="btn-excluir">Excluir</button>
            </td>
        `;

        tr.querySelector('.btn-editar').onclick = () => abrirModalEditar(p);
        tr.querySelector('.btn-excluir').onclick = () => excluirPaciente(p.id);
        tbody.appendChild(tr);
    });
}

function salvarPaciente() {
    const paciente = {
        nome: document.getElementById('nome').value.trim(),
        telefone: document.getElementById('telefone').value,
        email: document.getElementById('email').value,
        rua: document.getElementById('rua').value,
        numero: document.getElementById('numero').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        data_nascimento: document.getElementById('data_nascimento').value
    };

    if (!paciente.nome) {
        mostrarToast('Nome é obrigatório', 'erro');
        return;
    }

    const metodo = pacienteEditando ? 'PUT' : 'POST';
    const url = pacienteEditando ? `/api/pacientes/${pacienteEditando}` : '/api/pacientes';

    fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(paciente)
    })
    .then(res => {
        if (!res.ok) throw new Error('Erro ao salvar paciente');
        return res.json();
    })
    .then(() => {
        fecharModal();
        carregarPacientes();
        mostrarToast('Paciente salvo com sucesso', 'sucesso');
    })
    .catch(err => mostrarToast(err.message, 'erro'));
}

function excluirPaciente(id) {
    if (!confirm('Deseja excluir este paciente?')) return;
    fetch(`/api/pacientes/${id}`, { method: 'DELETE', credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error('Erro ao excluir');
            carregarPacientes();
            mostrarToast('Excluído com sucesso', 'sucesso');
        })
        .catch(err => mostrarToast(err.message, 'erro'));
}

/* =========================
   UTILITÁRIOS
========================= */
function limparFormulario() {
    const ids = ['nome', 'telefone', 'email', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'data_nascimento'];
    ids.forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; });
}

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function mostrarToast(msg, tipo) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
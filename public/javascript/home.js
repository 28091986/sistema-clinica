document.addEventListener('DOMContentLoaded', () => {
    const conteudo = document.getElementById('conteudo');
    const botoesMenu = document.querySelectorAll('.nav-item');
    const btnLogout = document.getElementById('logout');

   async function carregarPagina(page) {
    try {
        const response = await fetch(`/views/${page}.html`);
        if (!response.ok) throw new Error('Erro ao carregar página');

        const html = await response.text();
        conteudo.innerHTML = html;
      const btnAtalho = document.getElementById('btnAtendimentoRapido');

if (btnAtalho) {
    btnAtalho.addEventListener('click', (e) => {
        e.preventDefault();
        irParaAtendimentoRapido();
    });
}

        document.querySelectorAll('.shortcut-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
       const page = item.dataset.page;

        if (!page) return; // ignora quem não é SPA

        carregarPagina(page);
    });
});

        // Mapeamento de quais funções chamar para cada página
        const inicializadores = {
            'dashboard': window.initDashboard,
            'pacientes': window.inicializarModuloPacientes,
            'agendamentos': window.initAgendamentos,
            'financeiro': window.initFinanceiro,
            'caixa': window.initCaixa,
            'atendimentos': window.initAtendimentos,
            'profissionais': window.initProfissionais
        };

        const funcaoInit = inicializadores[page];

        // Verifica se a função existe e a executa
        if (typeof funcaoInit === 'function') {
            // Usamos await caso a função de inicialização seja assíncrona
            await funcaoInit();
        }

    } catch (error) {
        console.error("Erro na navegação:", error);
        conteudo.innerHTML = `<div class="erro">Não foi possível carregar a página: ${page}</div>`;
    }
}

    // ✅ FUNÇÃO FORA
    async function carregarUsuarioLogado() {
        try {
            const res = await fetch('/api/login/me', {
                credentials: 'include'
            });

            if (!res.ok) throw new Error("Não autenticado");

            const usuario = await res.json();

            const userArea = document.querySelector('.user-area');

           const nomeEl = document.getElementById('nomeUsuario');

            if (nomeEl) {
                nomeEl.textContent = `Olá, ${usuario.nome}`;
            }
        } catch (err) {
            console.error("Erro ao carregar usuário:", err);
        }
    }

    // Menu lateral
    botoesMenu.forEach(btn => {
        btn.onclick = () => {
            botoesMenu.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarPagina(btn.dataset.page);
        };
    });
    document.querySelectorAll('.shortcut-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        carregarPagina(page);
    });
});

    // Logout
    if (btnLogout) {
        btnLogout.onclick = () => {
            window.location.href = '/login'; 
        };
    }

    // ✅ CHAMA AQUI
    carregarUsuarioLogado();

    // Página inicial
    carregarPagina('dashboard'); 
});

/* =========================
   NAVEGAÇÃO PARA ATENDIMENTO
========================= */
window.navegarParaAtendimento = async function(idConsulta) {
    const conteudo = document.getElementById('conteudo');
    const botoesMenu = document.querySelectorAll('.nav-item');

    // Remove seleção do menu
    botoesMenu.forEach(b => b.classList.remove('active'));

    try {
        // 1. Carrega tela
        const response = await fetch(`/views/atendimentos.html`);
        if (!response.ok) throw new Error('Erro ao carregar atendimento');

        const html = await response.text();
        conteudo.innerHTML = html;

        // 2. Inicializa com ID da consulta
        if (typeof window.initAtendimento === 'function') {
            await window.initAtendimento(idConsulta);
        }

    

    } catch (error) {
        console.error("Erro ao abrir atendimento:", error);
        conteudo.innerHTML = `<div class="erro">Erro ao abrir prontuário.</div>`;
    }
};
async function excluir(id) {
    if (!confirm("Deseja realmente excluir este agendamento?")) return;

    try {
        const res = await fetch(`/api/consultas/${id}`, {
            method: 'DELETE',
            credentials: 'include' // <--- ESSENCIAL: Envia os cookies da sessão
        });

        if (res.ok) {
            await carregarConsultas(); // Recarrega a tabela
            fecharMenu();
        } else {
            const erro = await res.json();
            alert(`Erro: ${erro.erro}`); // Exibe a mensagem de "Permissão negada" do backend
        }
    } catch (err) {
        console.error("Erro na exclusão:", err);
        alert("Erro de conexão ao tentar excluir.");
    }
}

window.irParaAtendimentoRapido = async function() {
    try {
        const res = await fetch('/api/atendimentos/minhas-consultas');
        const consultas = await res.json();

        if (!consultas.length) {
            alert("Nenhuma consulta disponível hoje");
            return;
        }

        // 👉 pega a primeira consulta
        const consulta = consultas[0];

        // 👉 abre atendimento com dados
        navegarParaAtendimento(consulta.id);

    } catch (error) {
        console.error("Erro ao abrir atendimento rápido:", error);
    }
};
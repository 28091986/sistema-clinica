(function() {
    let editandoId = null;
    let consultaSelecionada = null;

    // Inicializador chamado pela Home.js
    window.initAgendamentos = async function() {
       
        
        await carregarConsultas();

        // Mapeamento de Elementos
        const btnNova = document.getElementById('btnNovaConsulta');
        const form = document.getElementById('formConsulta');
        const btnCancelar = document.getElementById('cancelarConsulta');
        const inputBusca = document.getElementById('busca');
        const filtroData = document.getElementById('filtroData');

        // Atribuição de Eventos (Usando onclick para evitar múltiplos listeners em SPA)
        if (btnNova) btnNova.onclick = abrirModalNovo;
        if (form) form.onsubmit = salvarConsulta;
        if (btnCancelar) btnCancelar.onclick = fecharModal;
        if (inputBusca) inputBusca.oninput = filtrarTabela;
        if (filtroData) filtroData.onchange = filtrarTabela;

        // Eventos do Menu de Ações
        const btnEd = document.getElementById('editarConsulta');
        const btnEx = document.getElementById('excluirConsulta');
        const btnRe = document.getElementById('realizarConsulta');

        if(btnEd) btnEd.onclick = () => { editar(consultaSelecionada); fecharMenu(); };
        if(btnEx) btnEx.onclick = () => { excluir(consultaSelecionada); fecharMenu(); };
        
        if (btnRe) {
            btnRe.onclick = () => {
                if (!consultaSelecionada) return;
                fecharMenu();
                // Verifica se a função global de navegação existe
                if (window.navegarParaAtendimento) {
                    window.navegarParaAtendimento(consultaSelecionada);
                } else {
                    window.location.href = `/atendimentos/${consultaSelecionada}`;
                }
            };
        }

        // Fechar ao clicar fora (Melhorado para SPA)
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('menuAcoes');
            const modal = document.getElementById('modalConsulta');
            
            // Se clicar fora do menu e não for no botão que abre o menu
            if (menu && menu.classList.contains('ativo') && !menu.contains(e.target) && !e.target.classList.contains('btn-acoes')) {
                fecharMenu();
            }
            // Fechar modal ao clicar no fundo escuro
            if (e.target === modal) {
                fecharModal();
            }
        });
    };

    async function carregarConsultas() {
        try {
            const res = await fetch('/api/consultas', { credentials: 'include' });
            if (!res.ok) throw new Error("Erro ao buscar dados");
            const consultas = await res.json();
            renderizarTabela(consultas);
        } catch (err) {
            console.error("Erro na API de consultas:", err);
            const tbody = document.getElementById('listaConsultas');
            if(tbody) tbody.innerHTML = '<tr><td colspan="9" style="color:red; text-align:center;">Erro de permissão ou conexão.</td></tr>';
        }
    }

    function renderizarTabela(lista) {
        const tbody = document.getElementById('listaConsultas');
        if (!tbody) return;

        // Adicionado data-label para o CSS Responsivo funcionar
        tbody.innerHTML = lista.map(c => `
            <tr>
                <td data-label="Paciente"><strong>${c.paciente_nome}</strong></td>
                <td data-label="Data">${formatarData(c.data)}</td>
                <td data-label="Hora">${c.hora}</td>
                <td data-label="Tipo">${c.tipo}</td>
                <td data-label="Especialidade">${c.especialidade || '-'}</td>
                <td data-label="Profissional">${c.profissional_nome}</td>
                <td data-label="Status">
                    <span class="status-badge status-${c.status.toLowerCase()}">${c.status}</span>
                </td>
                <td data-label="Ações">
                    <button 
                        class="btn-acoes" 
                        data-id="${c.id}" 
                        data-status="${c.status}"
                    >⋮</button>
                </td>
            </tr>
        `).join('');

        // Delegação de evento para os botões ⋮
        tbody.querySelectorAll('.btn-acoes').forEach(btn => {
            btn.onclick = (event) => {
                mostrarMenu(event, btn.dataset.id, btn.dataset.status);
            };
        });
    }

    window.mostrarMenu = function(event, id, status) {
        event.stopPropagation();
        consultaSelecionada = id;

        const menu = document.getElementById('menuAcoes');
        if (!menu) return;

        // Posicionamento dinâmico
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX - 150}px`;
        menu.classList.add('ativo');

        // Lógica do botão "Realizar"
        const btnRe = document.getElementById('realizarConsulta');
        if (btnRe) {
            btnRe.style.display = (status === 'Realizada' || status === 'Cancelada') ? 'none' : 'block';
        }
    };

    function fecharMenu() {
        const menu = document.getElementById('menuAcoes');
        if (menu) menu.classList.remove('ativo');
    }

    async function abrirModalNovo() {
        editandoId = null;
        const titulo = document.querySelector('.modal-content h2');
        if(titulo) titulo.innerText = "Novo Agendamento";
        
        const form = document.getElementById('formConsulta');
        if(form) form.reset();

        await carregarSelects().catch(() => console.warn("Erro ao carregar selects."));
        abrirModal();
    }

    async function carregarSelects() {
        const config = { credentials: 'include' };
        const [resPac, resProf] = await Promise.all([
            fetch('/api/pacientes', config),
            fetch('/api/profissionais', config)
        ]);

        if (!resPac.ok || !resProf.ok) return;

        const pac = await resPac.json();
        const prof = await resProf.json();

        const selPac = document.getElementById('paciente_id');
        const selProf = document.getElementById('profissional_id');

        if(selPac) selPac.innerHTML = '<option value="">Selecione o Paciente</option>' + 
            pac.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
        
        if(selProf) selProf.innerHTML = '<option value="">Selecione o Profissional</option>' + 
            prof.filter(p => p.ativo).map(p => `<option value="${p.id}">${p.nome} - ${p.especialidade || ''}</option>`).join('');
    }

    async function salvarConsulta(e) {
        e.preventDefault();
        const dados = {
            paciente_id: document.getElementById('paciente_id').value,
            profissional_id: document.getElementById('profissional_id').value,
            data: document.getElementById('data').value,
            hora: document.getElementById('hora').value,
            tipo: document.getElementById('tipo').value,
            status: document.getElementById('status').value,
            observacoes: document.getElementById('observacoes').value
        };

        const metodo = editandoId ? 'PUT' : 'POST';
        const url = editandoId ? `/api/consultas/${editandoId}` : '/api/consultas';

        try {
            const res = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados),
                credentials: 'include'
            });
            
            if(res.ok) {
                fecharModal();
                await carregarConsultas();
            } else {
                const txt = await res.text();
                alert("Erro ao salvar: " + txt);
            }
        } catch (err) { alert("Erro de conexão ao salvar."); }
    }

    async function editar(id) {
        try {
            const res = await fetch(`/api/consultas/${id}`, { credentials: 'include' });
            const c = await res.json();
            editandoId = id;
            
            await carregarSelects().catch(e => {});
            
            document.querySelector('.modal-content h2').innerText = "Editar Agendamento";
            
            document.getElementById('paciente_id').value = c.paciente_id;
            document.getElementById('profissional_id').value = c.profissional_id;
            document.getElementById('data').value = c.data;
            document.getElementById('hora').value = c.hora;
            document.getElementById('status').value = c.status;
            document.getElementById('tipo').value = c.tipo;
            document.getElementById('observacoes').value = c.observacoes || '';
            
            abrirModal();
        } catch (err) { alert("Erro ao carregar dados para edição."); }
    }

    async function excluir(id) {
        if(!confirm("Deseja realmente excluir?")) return;
        await fetch(`/api/consultas/${id}`, { method: 'DELETE', credentials: 'include' });
        await carregarConsultas();
    }

    function abrirModal() {
        const modal = document.getElementById('modalConsulta');
        if(modal) modal.style.display = 'flex';
    }

    function fecharModal() {
        const modal = document.getElementById('modalConsulta');
        if(modal) modal.style.display = 'none';
    }

    function formatarData(data) {
        if(!data) return '--/--/--';
        // Ajuste para evitar fuso horário invertendo a data
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function filtrarTabela() {
        const termoBusca = document.getElementById('busca').value.toLowerCase();
        const termoData = document.getElementById('filtroData').value;
        const linhas = document.querySelectorAll('#listaConsultas tr');

        linhas.forEach(linha => {
            const texto = linha.innerText.toLowerCase();
            const dataBr = linha.children[1].innerText; 
            
            const bateBusca = texto.includes(termoBusca);
            let bateData = true;
            if (termoData) {
                const [ano, mes, dia] = termoData.split('-');
                bateData = dataBr === `${dia}/${mes}/${ano}`;
            }

            linha.style.display = (bateBusca && bateData) ? '' : 'none';
        });
    }
})();

window.buscarConsultas = async function() {
    try {
        const res = await fetch('/api/consultas', { credentials: 'include' });
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (e) {
        console.error("Erro ao buscar consultas:", e);
        return [];
    }
}; 
async function carregarKPIs() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();

        document.getElementById('kpiPacientes').textContent = data.pacientesNovos;
        document.getElementById('kpiHoje').textContent = data.agendadosHoje;
        document.getElementById('kpiReceita').textContent = `R$ ${data.receita}`;
        document.getElementById('kpiProfissionais').textContent = data.profissionais;

       // document.getElementById('subHoje').textContent = data.mensagemHoje;

    } catch (error) {
        console.error('Erro ao carregar KPIs:', error);
    }
}

window.initDashboard = function() {
    console.log("Dashboard carregado");
    carregarKPIs();
}
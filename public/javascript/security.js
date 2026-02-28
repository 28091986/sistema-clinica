(function () {
  function limparRastros() {
    document.querySelectorAll('form').forEach(f => f.reset());
    document.querySelectorAll('input, select, textarea').forEach(el => {
      el.value = '';
      el.autocomplete = 'off';
    });
    sessionStorage.clear();
    localStorage.removeItem('usuario');
  }

  async function checarSessao() {
    // Só checa se não estiver na página de login
    if (window.location.pathname === '/login' || window.location.pathname === '/') return;

    try {
      const res = await fetch('/api/login/sessao', { credentials: 'include' });
      if (!res.ok) throw new Error('Não logado');
      const dados = await res.json();
      if (!dados.logado) throw new Error('Sessão inválida');
    } catch (erro) {
      limparRastros();
      window.location.replace('/login'); // redireciona seguro
    }
  }

  // Bloqueia cache
  function bloquearCache() {
    window.addEventListener('pageshow', e => {
      if (e.persisted || performance.navigation.type === 2) {
        limparRastros();
        checarSessao();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    limparRastros();
    checarSessao();
    bloquearCache();
  });

  window.addEventListener('beforeunload', limparRastros);

  window.limparRastros = limparRastros;
})();
export function verificarLogin(req, res, next) {
  if (req.session.usuario) return next();
  return res.status(401).json({ erro: 'Não autorizado' });
};

export function verificarPermissao(niveisPermitidos) {
  return (req, res, next) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    if (!niveisPermitidos.includes(req.session.usuario.nivel)) return res.status(403).json({ erro: 'Acesso negado' });
    next();
  };
};


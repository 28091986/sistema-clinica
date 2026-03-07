export function verificarLogin(req, res, next) {

  if (req.session.usuario) {
    return next();
  }

  return res.redirect('/login');

}

export function verificarPermissao(niveisPermitidos) {

  return (req, res, next) => {

    if (!req.session.usuario) {
      return res.redirect('/login');
    }

    if (!niveisPermitidos.includes(req.session.usuario.nivel)) {
      return res.status(403).send('Acesso negado');
    }

    next();

  };

}


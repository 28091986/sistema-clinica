import express from 'express';
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

// Retorna dados do usuário logado
router.get('/', verificarLogin, (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  res.json(req.session.usuario);
});

export default router;
import express from 'express';
import db from '../database/db.js';
import bcrypt from 'bcrypt';

const router = express.Router();



router.post('/',  async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ sucesso: false });
    }

    const [rows] = await db.query(`
      SELECT 
        u.id AS usuario_id,
        u.email,
        u.senha,
        u.nivel,
        u.ativo AS usuario_ativo,
        p.id AS profissional_id,
        p.nome,
        p.ativo AS profissional_ativo
      FROM usuarios u
      JOIN profissionais p ON p.usuario_id = u.id
      WHERE u.email = ?
      LIMIT 1
    `, [email]);

    if (!rows.length) {
      return res.json({ sucesso: false });
    }

    const usuario = rows[0];

    if (!usuario.usuario_ativo || !usuario.profissional_ativo) {
      return res.json({ sucesso: false });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha);

    if (!senhaOk) {
      return res.json({ sucesso: false });
    }

    req.session.usuario = {
      usuario_id: usuario.usuario_id,
      profissional_id: usuario.profissional_id,
      nome: usuario.nome,
      nivel: usuario.nivel,
      email: usuario.email
    };

    return res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro no login:', erro);
    return res.status(500).json({ sucesso: false });
  }
});

// Checar se tem sessão ativa
router.get('/sessao', (req, res) => {
  if (req.session.usuario) {
    res.json({ logado: true, usuario: req.session.usuario });
  } else {
   res.redirect('/login');

  }
});


router.post('/logout', (req, res) => {
  req.session.destroy(() => {

    res.clearCookie('clinica.sid');

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return res.json({ sucesso: true });

  });
});

// Checar se tem sessão ativa
router.get('/me', (req, res) => {
  if (req.session.usuario) {
    return res.json(req.session.usuario); // devolve usuário logado
  } else {
    return res.status(401).json({ erro: 'Não autenticado' });
  }
});

export default router;
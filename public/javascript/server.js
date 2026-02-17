
// server.js

import express from 'express';
import bcrypt from 'bcrypt';
import db from './javascript/db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT id, senha FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.json({ sucesso: false });
    }

    const usuario = rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.json({ sucesso: false });
    }

    return res.json({ sucesso: true });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ sucesso: false });
  }
});

export default router;

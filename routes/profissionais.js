import express from 'express';
import db from '../database/db.js';
import { verificarLogin, verificarPermissao } from '../middlewares/auth.js';
import bcrypt from 'bcrypt';


const router = express.Router();

router.get('/', verificarLogin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.nome,
        p.especialidade,
        p.ativo,
        u.email,
        u.nivel
      FROM profissionais p
      JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.nome
    `);

    res.json(rows);

  } catch (erro) {
    console.error('Erro ao buscar profissionais:', erro);
    res.status(500).json({ erro: 'Erro ao buscar profissionais' });
  }
});

router.post('/', verificarLogin, verificarPermissao(['admin']), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { nome, especialidade, ativo, email, senha, nivel } = req.body;

    const senhaHash = await bcrypt.hash(senha, 10);

    const [usuarioResult] = await connection.query(
      'INSERT INTO usuarios (email, senha, nivel, ativo) VALUES (?, ?, ?, ?)',
      [email, senhaHash, nivel, 1]
    );

    const usuario_id = usuarioResult.insertId;

    await connection.query(
      'INSERT INTO profissionais (usuario_id, nome, especialidade, ativo) VALUES (?, ?, ?, ?)',
      [usuario_id, nome, especialidade, ativo ?? 1]
    );

    await connection.commit();
    res.json({ sucesso: true });

  } catch (erro) {
    await connection.rollback();
    res.status(500).json({ erro: 'Erro ao cadastrar profissional' });
  } finally {
    connection.release();
  }
});

router.put('/:id', verificarLogin, async (req, res) => {
  try {
    const { nome, especialidade, ativo } = req.body;

    const [result] = await db.query(
      'UPDATE profissionais SET nome=?, especialidade=?, ativo=? WHERE id=?',
      [nome, especialidade, ativo ?? 1, req.params.id]
    );

    if (!result.affectedRows)
      return res.status(404).json({ erro: 'Profissional não encontrado' });

    res.json({ sucesso: true });

  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao atualizar profissional' });
  }
});

router.delete('/:id', verificarLogin, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM profissionais WHERE id=?',
      [req.params.id]
    );

    if (!result.affectedRows)
      return res.status(404).json({ erro: 'Profissional não encontrado' });

    res.json({ sucesso: true });

  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao excluir profissional' });
  }
});


export default router;
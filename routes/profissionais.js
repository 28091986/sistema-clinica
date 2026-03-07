import express from 'express';
import db from '../database/db.js';
import { verificarLogin, verificarPermissao } from '../middlewares/auth.js';
import bcrypt from 'bcrypt';

const router = express.Router();

/* =========================
   LISTAR PROFISSIONAIS
========================= */
router.get(
  '/',
  verificarLogin,
  verificarPermissao(['admin','recepcao']),
  async (req, res) => {
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

      res.status(500).json({
        erro: 'Erro ao buscar profissionais'
      });

    }
});

/* =========================
   CADASTRAR PROFISSIONAL
========================= */
router.post(
  '/',
  verificarLogin,
  verificarPermissao(['admin']),
  async (req, res) => {

    const connection = await db.getConnection();

    try {

      await connection.beginTransaction();

      const { nome, especialidade, ativo, email, senha } = req.body;

      const nivel = 'profissional';

      /* verificar email duplicado */
      const [existe] = await connection.query(
        'SELECT id FROM usuarios WHERE email=?',
        [email]
      );

      if (existe.length) {

        await connection.rollback();

        return res.status(400).json({
          erro: 'Email já cadastrado'
        });

      }

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

      console.error('Erro ao cadastrar profissional:', erro);

      res.status(500).json({
        erro: 'Erro ao cadastrar profissional'
      });

    } finally {

      connection.release();

    }

});

/* =========================
   ATUALIZAR PROFISSIONAL
========================= */
router.put(
  '/:id',
  verificarLogin,
  verificarPermissao(['admin']),
  async (req, res) => {

    try {

      const { nome, especialidade, ativo } = req.body;

      const [result] = await db.query(
        'UPDATE profissionais SET nome=?, especialidade=?, ativo=? WHERE id=?',
        [nome, especialidade, ativo ?? 1, req.params.id]
      );

      if (!result.affectedRows) {

        return res.status(404).json({
          erro: 'Profissional não encontrado'
        });

      }

      res.json({ sucesso: true });

    } catch (erro) {

      console.error('Erro ao atualizar profissional:', erro);

      res.status(500).json({
        erro: 'Erro ao atualizar profissional'
      });

    }

});

/* =========================
   EXCLUIR PROFISSIONAL
========================= */
router.delete(
  '/:id',
  verificarLogin,
  verificarPermissao(['admin']),
  async (req, res) => {

    try {

      const [result] = await db.query(
        'DELETE FROM profissionais WHERE id=?',
        [req.params.id]
      );

      if (!result.affectedRows) {

        return res.status(404).json({
          erro: 'Profissional não encontrado'
        });

      }

      res.json({ sucesso: true });

    } catch (erro) {

      console.error('Erro ao excluir profissional:', erro);

      res.status(500).json({
        erro: 'Erro ao excluir profissional'
      });

    }

});

export default router;
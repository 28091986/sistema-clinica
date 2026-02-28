import express from 'express';
import db from '../database/db.js';
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

/* LISTAR */
router.get('/', verificarLogin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM pacientes
      ORDER BY nome
    `);

    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar pacientes:', erro);
    res.status(500).json({ erro: 'Erro ao listar pacientes' });
  }
});

/* CRIAR */
router.post('/', verificarLogin, async (req, res) => {
  try {
    const {
      nome,
      telefone,
      email,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      data_nascimento
    } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    await db.query(`
      INSERT INTO pacientes
      (nome, telefone, email, rua, numero, bairro, cidade, estado, data_nascimento)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nome,
      telefone || null,
      email || null,
      rua || null,
      numero || null,
      bairro || null,
      cidade || null,
      estado || null,
      data_nascimento || null
    ]);

    res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro ao criar paciente:', erro);
    res.status(500).json({ erro: 'Erro ao criar paciente' });
  }
});

/* ATUALIZAR */
router.put('/:id', verificarLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      telefone,
      email,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      data_nascimento
    } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    await db.query(`
      UPDATE pacientes
      SET nome=?, telefone=?, email=?, rua=?, numero=?, bairro=?, cidade=?, estado=?, data_nascimento=?
      WHERE id=?
    `, [
      nome,
      telefone || null,
      email || null,
      rua || null,
      numero || null,
      bairro || null,
      cidade || null,
      estado || null,
      data_nascimento || null,
      id
    ]);

    res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro ao atualizar paciente:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar paciente' });
  }
});

/* EXCLUIR */
router.delete('/:id', verificarLogin, async (req, res) => {
  try {
    await db.query(`
      DELETE FROM pacientes WHERE id=?
    `, [req.params.id]);

    res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro ao excluir paciente:', erro);
    res.status(500).json({ erro: 'Erro ao excluir paciente' });
  }
});

export default router;
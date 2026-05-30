import express from 'express';
import db from '../database/db.js';
import { verificarLogin, verificarPermissao } from '../middlewares/auth.js';
import bcrypt from 'bcrypt';

const router = express.Router();

/* ==========================================================================
   LISTAR PROFISSIONAIS (Mantido original - Perfeito)
   ========================================================================== */
router.get('/', verificarLogin, verificarPermissao(['admin', 'recepcao']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id, p.nome, p.especialidade, p.ativo, u.email, u.nivel
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

/* ==========================================================================
   BUSCAR UM PROFISSIONAL POR ID (Corrige o 404 do Editar)
   ========================================================================== */
router.get('/:id', verificarLogin, verificarPermissao(['admin', 'recepcao']), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT 
        p.id, p.nome, p.especialidade, p.ativo, u.email, u.nivel
      FROM profissionais p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ erro: 'Profissional não encontrado' });
    }

    res.json(rows[0]); // Retorna apenas o objeto do profissional encontrado
  } catch (erro) {
    console.error('Erro ao buscar profissional por ID:', erro);
    res.status(500).json({ erro: 'Erro interno ao buscar profissional' });
  }
});

/* ==========================================================================
   CADASTRAR PROFISSIONAL (Mantido original - Perfeito)
   ========================================================================== */
router.post('/', verificarLogin, verificarPermissao(['admin']), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { nome, especialidade, ativo, email, senha, nivel } = req.body;

    const [existe] = await connection.query('SELECT id FROM usuarios WHERE email=?', [email]);
    if (existe.length) {
      await connection.rollback();
      return res.status(400).json({ erro: 'Email já cadastrado' });
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
    res.status(500).json({ erro: 'Erro ao cadastrar profissional' });
  } finally {
    connection.release();
  }
});

/* ==========================================================================
   ATUALIZAR PROFISSIONAL (Atualizado para atualizar Usuário também)
   ========================================================================== */
router.put('/:id', verificarLogin, verificarPermissao(['admin']), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { nome, especialidade, ativo, email, senha, nivel } = req.body;
    const profissionalId = req.params.id;

    // 1. Descobrir qual é o usuario_id desse profissional
    const [prof] = await connection.query('SELECT usuario_id FROM profissionais WHERE id = ?', [profissionalId]);
    if (!prof.length) {
      await connection.rollback();
      return res.status(404).json({ erro: 'Profissional não encontrado' });
    }
    const usuarioId = prof[0].usuario_id;

    // 2. Atualiza a tabela de profissionais
    await connection.query(
      'UPDATE profissionais SET nome=?, especialidade=?, ativo=? WHERE id=?',
      [nome, especialidade, ativo ?? 1, profissionalId]
    );

    // 3. Atualiza os dados básicos do usuário (Email, Nível, Ativo)
    await connection.query(
      'UPDATE usuarios SET email=?, nivel=?, ativo=? WHERE id=?',
      [email, nivel, ativo ?? 1, usuarioId]
    );

    // 4. Se uma nova senha foi enviada, atualiza a senha de forma segura
    if (senha && senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(senha, 10);
      await connection.query('UPDATE usuarios SET senha=? WHERE id=?', [senhaHash, usuarioId]);
    }

    await connection.commit();
    res.json({ sucesso: true });
  } catch (erro) {
    await connection.rollback();
    console.error('Erro ao atualizar profissional:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar profissional' });
  } finally {
    connection.release();
  }
});

/* ==========================================================================
   EXCLUIR PROFISSIONAL (Atualizado para deletar o Usuário em cascata)
   ========================================================================== */
/* ==========================================================================
   EXCLUIR PROFISSIONAL (Soft Delete - Corrige o erro 500 de chave estrangeira)
   ========================================================================== */
router.delete('/:id', verificarLogin, verificarPermissao(['admin']), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const profissionalId = req.params.id;

    // 1. Pega o usuario_id antes de atualizar
    const [prof] = await connection.query('SELECT usuario_id FROM profissionais WHERE id = ?', [profissionalId]);
    if (!prof.length) {
      await connection.rollback();
      return res.status(404).json({ erro: 'Profissional não encontrado' });
    }
    const usuarioId = prof[0].usuario_id;

    // 2. Desativa o profissional (ativo = 0)
    await connection.query('UPDATE profissionais SET ativo = 0 WHERE id = ?', [profissionalId]);

    // 3. Desativa o usuário correspondente (ativo = 0)
    await connection.query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [usuarioId]);

    await connection.commit();
    res.json({ sucesso: true, mensagem: 'Profissional desativado com sucesso!' });
  } catch (erro) {
    await connection.rollback();
    console.error('Erro ao desativar profissional:', erro);
    res.status(500).json({ erro: 'Erro ao desativar profissional. Verifique os vínculos.' });
  } finally {
    connection.release();
  }
});

export default router;
import express from 'express';
import db from '../database/db.js';
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

/* =========================
   GET ATENDIMENTO POR CONSULTA
========================= */
router.get('/consulta/:consultaId', verificarLogin, async (req, res) => {
  const { consultaId } = req.params;
  const usuario = req.session.usuario;

  try {
    const [rows] = await db.query(`
      SELECT c.*, p.nome AS paciente_nome, pr.nome AS profissional_nome, pr.id AS profissional_id
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      JOIN profissionais pr ON pr.id = c.profissional_id
      WHERE c.id = ?
    `, [consultaId]);

    if (!rows.length) return res.status(404).json({ erro: 'Consulta não encontrada' });

    const consulta = rows[0];

    // 🔒 Apenas admin ou profissional da consulta
    if (usuario.nivel !== 'admin' && usuario.profissional_id !== consulta.profissional_id) {
      return res.status(403).json({ erro: 'Acesso negado a este atendimento' });
    }

    res.json(consulta);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar atendimento' });
  }
});

/* =========================
   GET HISTÓRICO DE ATENDIMENTOS DE UM PACIENTE
========================= */
router.get('/historico/:pacienteId', verificarLogin, async (req, res) => {
  const { pacienteId } = req.params;
  const usuario = req.session.usuario;

  try {
    const [dados] = await db.query(`
      SELECT 
        a.id,
        a.consulta_id,
        p.nome AS paciente_nome,
        a.queixa_principal,
        a.diagnostico,
        a.conduta,
        a.medicamentos,
        a.observacoes,
        a.criado_em
      FROM atendimentos a
      JOIN consultas c ON a.consulta_id = c.id
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.paciente_id = ?
        AND (a.profissional_id = ? OR ? = 'admin')
      ORDER BY a.criado_em DESC
    `, [pacienteId, usuario.profissional_id, usuario.nivel]);

    res.json(dados);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

/* =========================
   GET TODOS ATENDIMENTOS (ADMIN)
========================= */
router.get('/', verificarLogin, async (req, res) => {
  const usuario = req.session.usuario;

  if (usuario.nivel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  try {
    const [rows] = await db.query(`
      SELECT 
        a.id,
        a.diagnostico,
        a.criado_em as data,
        p.nome as paciente_nome,
        pr.nome as profissional_nome
      FROM atendimentos a
      JOIN consultas c ON a.consulta_id = c.id
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN profissionais pr ON a.profissional_id = pr.id
      ORDER BY a.criado_em DESC
    `);

    res.json(rows);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar atendimentos' });
  }
});

/* =========================
   CRIAR ATENDIMENTO
========================= */
router.post('/', verificarLogin, async (req, res) => {
  const {
    consulta_id,
    queixa_principal,
    diagnostico,
    conduta,
    medicamentos,
    observacoes
  } = req.body;

  const usuario = req.session.usuario;

  try {
    // Buscar profissional da consulta
    const [consulta] = await db.query(`
      SELECT profissional_id
      FROM consultas
      WHERE id = ?
    `, [consulta_id]);

    if (!consulta.length) return res.status(404).json({ erro: 'Consulta não encontrada' });

    const profissional_id = consulta[0].profissional_id;

    // 🔒 Apenas admin ou profissional responsável
    if (usuario.nivel !== 'admin' && usuario.profissional_id !== profissional_id) {
      return res.status(403).json({ erro: 'Você não pode criar atendimento para esta consulta' });
    }

    await db.query(`
      INSERT INTO atendimentos (
        consulta_id,
        profissional_id,
        queixa_principal,
        diagnostico,
        conduta,
        medicamentos,
        observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      consulta_id,
      profissional_id,
      queixa_principal,
      diagnostico,
      conduta,
      medicamentos,
      observacoes
    ]);

    await db.query(`
      UPDATE consultas
      SET status = 'Realizada'
      WHERE id = ?
    `, [consulta_id]);

    res.json({ mensagem: 'Atendimento criado com sucesso' });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao criar atendimento' });
  }
});

/* =========================
   ATUALIZAR ATENDIMENTO
========================= */
router.put('/:id', verificarLogin, async (req, res) => {
  const atendimentoId = req.params.id;
  const usuario = req.session.usuario;
  const dados = req.body;

  try {
    // Verifica se o atendimento existe e quem é o profissional
    const [atendimento] = await db.query(`
      SELECT profissional_id
      FROM atendimentos
      WHERE id = ?
    `, [atendimentoId]);

    if (!atendimento.length) return res.status(404).json({ erro: 'Atendimento não encontrado' });

    if (usuario.nivel !== 'admin' && usuario.profissional_id !== atendimento[0].profissional_id) {
      return res.status(403).json({ erro: 'Você não pode editar este atendimento' });
    }

    await db.query(`
      UPDATE atendimentos
      SET queixa_principal=?, diagnostico=?, conduta=?, medicamentos=?, observacoes=?
      WHERE id=?
    `, [
      dados.queixa_principal,
      dados.diagnostico,
      dados.conduta,
      dados.medicamentos,
      dados.observacoes,
      atendimentoId
    ]);

    res.json({ mensagem: 'Atendimento atualizado com sucesso' });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao atualizar atendimento' });
  }
});

/* =========================
   EXCLUIR ATENDIMENTO
========================= */
router.delete('/:id', verificarLogin, async (req, res) => {
  const atendimentoId = req.params.id;
  const usuario = req.session.usuario;

  try {
    const [atendimento] = await db.query(`
      SELECT profissional_id
      FROM atendimentos
      WHERE id = ?
    `, [atendimentoId]);

    if (!atendimento.length) return res.status(404).json({ erro: 'Atendimento não encontrado' });

    if (usuario.nivel !== 'admin' && usuario.profissional_id !== atendimento[0].profissional_id) {
      return res.status(403).json({ erro: 'Você não pode excluir este atendimento' });
    }

    await db.query('DELETE FROM atendimentos WHERE id = ?', [atendimentoId]);

    res.json({ mensagem: 'Atendimento excluído com sucesso' });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao excluir atendimento' });
  }
});

export default router;
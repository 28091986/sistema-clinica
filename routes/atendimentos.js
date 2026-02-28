import express from 'express';
import db from '../database/db.js'
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/consulta/:consultaId', verificarLogin, async (req, res) => {
  const { consultaId } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT *
      FROM atendimentos
      WHERE consulta_id = ?
      LIMIT 1
    `, [consultaId]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Atendimento não encontrado' });
    }

    res.json(rows[0]);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar atendimento' });
  }
});

router.get('/historicoConsultas/:pacienteId', verificarLogin, async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const medicoId = req.session.usuario.profissional_id;

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
      AND a.profissional_id = ?
      ORDER BY a.criado_em DESC
    `, [pacienteId, medicoId]);

    res.json(dados);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

router.get('/', verificarLogin, async (req, res) => {
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
});


// POST /api/atendimentos
router.post('/', verificarLogin, async (req, res) => {
  const {
    consulta_id,
    queixa_principal,
    diagnostico,
    conduta,
    medicamentos,
    observacoes
  } = req.body;

  try {
    // buscar profissional da consulta
    const [consulta] = await db.query(`
      SELECT profissional_id
      FROM consultas
      WHERE id = ?
    `, [consulta_id]);

    if (consulta.length === 0) {
      return res.status(404).json({ erro: 'Consulta não encontrada' });

    }

    const profissional_id = consulta[0].profissional_id;

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

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar atendimento' });
  }
});

// GET /api/atendimentos/historico/:pacienteId
router.get('/historico/:pacienteId', verificarLogin, async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const medicoId = req.session.usuario.profissional_id;

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
      AND a.profissional_id = ?
      ORDER BY a.criado_em DESC
    `, [pacienteId, medicoId]);

    res.json(dados);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar histórico do paciente' });
  }
});

export default router;
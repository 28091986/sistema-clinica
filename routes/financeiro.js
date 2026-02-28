import express from 'express';
import db from '../database/db.js'
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', verificarLogin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT f.id,
             p.nome AS paciente,
             c.tipo AS tipo,
             c.data,
             f.valor,
             f.status
      FROM financeiro f
      JOIN consultas c ON f.consulta_id = c.id
      JOIN pacientes p ON c.paciente_id = p.id
    `;

    const params = [];
    if (status) {
      sql += ` WHERE f.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY c.data DESC`; // ORDER BY só aqui, no final

    const [rows] = await db.query(sql, params);
    res.json(rows);

  } catch (erro) {
    console.error('Erro financeiro:', erro);
    res.status(500).json({ erro: 'Erro ao buscar financeiro', detalhes: erro.message });
  }
});


router.put('/:id/pagar', verificarLogin, async (req, res) => {
  try {
    const { metodo, conta_id } = req.body; // agora também pode enviar conta_id

    if (!metodo) {
      return res.status(400).json({ erro: 'Método de pagamento é obrigatório' });
    }

    await db.query(
      `UPDATE financeiro 
       SET status='Pago', 
           data_pagamento=CURDATE(), 
           metodo_pagamento=?, 
           conta_id=?
       WHERE id=?`,
      [metodo, conta_id || null, req.params.id]
    );

    res.json({ mensagem: `Pagamento confirmado via ${metodo}` });

  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao confirmar pagamento', detalhes: erro.message });
  }
});


router.post('/gerar/:consultaId', verificarLogin, async (req, res) => {
  try {
    const { consultaId } = req.params;
    const [[consulta]] = await db.query('SELECT id FROM consultas WHERE id=?', [consultaId]);
    if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada' });

    await db.query('INSERT INTO financeiro (consulta_id, valor, status) VALUES (?, 150.00, "Pendente")', [consulta.id]);
    res.json({ mensagem: 'Cobrança gerada com sucesso' });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao gerar cobrança', detalhes: erro.message });
  }
});

router.get('/pendentes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.id, f.descricao, f.valor, f.paciente_id, p.nome AS paciente_nome
      FROM financeiro f
      LEFT JOIN pacientes p ON p.id = f.paciente_id
      WHERE f.status = 'Pendente'
      ORDER BY f.data_lancamento ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar lançamentos pendentes.' });
  }
});

export default router;
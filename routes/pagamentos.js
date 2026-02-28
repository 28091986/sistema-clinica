import express from 'express';
import db from '../database/db.js';

const router = express.Router();

/* =====================================================
   🔎 LISTAR LANÇAMENTOS FINANCEIROS PENDENTES
===================================================== */
router.get('/pendentes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        f.id AS financeiro_id,
        f.paciente_id,
        p.nome AS paciente_nome,
        f.descricao,
        f.valor,
        f.status,
        f.data_lancamento
      FROM financeiro f
      LEFT JOIN pacientes p ON p.id = f.paciente_id
      WHERE f.status = 'Pendente'
      ORDER BY f.data_lancamento ASC
    `);

    res.json(rows);

  } catch (err) {
    console.error('Erro ao buscar pendentes:', err);
    res.status(500).json({ erro: 'Erro ao buscar lançamentos pendentes.' });
  }
});

/* =====================================================
   💰 REGISTRAR PAGAMENTO
===================================================== */
router.post('/registrar', async (req, res) => {
  try {
    const usuario_id = req.session.usuario?.usuario_id;

    if (!usuario_id) {
      return res.status(401).json({ erro: 'Não autorizado.' });
    }

    const { caixa_id, financeiro_id, valor_recebido, metodo_pagamento } = req.body;

    if (!caixa_id || !financeiro_id || valor_recebido === undefined || !metodo_pagamento) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });
    }

    // 🔎 Buscar valor original do lançamento
    const [financeiroRows] = await db.query(
      'SELECT valor FROM financeiro WHERE id = ?',
      [financeiro_id]
    );

    if (!financeiroRows.length) {
      return res.status(404).json({ erro: 'Lançamento financeiro não encontrado.' });
    }

    const valor_pago = parseFloat(financeiroRows[0].valor);
    const valor_recebido_num = parseFloat(valor_recebido);
    const troco = valor_recebido_num - valor_pago;

    if (troco < 0) {
      return res.status(400).json({ erro: 'Valor recebido menor que o valor devido.' });
    }

    // 💾 Inserir pagamento e capturar ID
    const [insertResult] = await db.query(
      `INSERT INTO pagamentos 
       (financeiro_id, caixa_id, usuario_id, valor_pago, valor_recebido, troco, metodo_pagamento, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmado')`,
      [
        financeiro_id,
        caixa_id,
        usuario_id,
        valor_pago,
        valor_recebido_num,
        troco,
        metodo_pagamento
      ]
    );

    const pagamento_id = insertResult.insertId;

    // 🔄 Atualizar lançamento financeiro
    await db.query(
      `UPDATE financeiro 
       SET status = 'Pago',
           data_pagamento = NOW(),
           metodo_pagamento = ?
       WHERE id = ?`,
      [metodo_pagamento, financeiro_id]
    );

    // ✅ Resposta correta para abrir recibo
    res.json({
      sucesso: true,
      troco,
      pagamento_id
    });

  } catch (err) {
    console.error('Erro ao registrar pagamento:', err);
    res.status(500).json({ erro: 'Erro ao registrar pagamento.' });
  }
});

/* =====================================================
   📜 HISTÓRICO DE PAGAMENTOS
===================================================== */
router.get('/historico', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        pg.id,
        pg.financeiro_id,
        pg.valor_pago,
        pg.valor_recebido,
        pg.troco,
        pg.metodo_pagamento,
        pg.data_pagamento,
        pg.status,
        p.nome AS paciente_nome
      FROM pagamentos pg
      LEFT JOIN financeiro f ON f.id = pg.financeiro_id
      LEFT JOIN pacientes p ON p.id = f.paciente_id
      ORDER BY pg.data_pagamento DESC
    `);

    res.json(rows);

  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ erro: 'Erro ao buscar histórico de pagamentos.' });
  }
});

/* =====================================================
   🔄 ESTORNAR PAGAMENTO
===================================================== */
router.post('/estornar/:id', async (req, res) => {
  try {
    const pagamento_id = req.params.id;

    const [pagamentoRows] = await db.query(
      'SELECT financeiro_id FROM pagamentos WHERE id = ?',
      [pagamento_id]
    );

    if (!pagamentoRows.length) {
      return res.status(404).json({ erro: 'Pagamento não encontrado.' });
    }

    const financeiro_id = pagamentoRows[0].financeiro_id;

    await db.query(
      `UPDATE pagamentos 
       SET status = 'Cancelado'
       WHERE id = ?`,
      [pagamento_id]
    );

    await db.query(
      `UPDATE financeiro 
       SET status = 'Pendente', data_pagamento = NULL
       WHERE id = ?`,
      [financeiro_id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error('Erro ao estornar:', err);
    res.status(500).json({ erro: 'Erro ao estornar pagamento.' });
  }
});


export default router;
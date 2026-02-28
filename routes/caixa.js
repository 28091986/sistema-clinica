import express from 'express';
import db from '../database/db.js';

const router = express.Router();

// ===============================
// ABRIR CAIXA
// ===============================
router.post('/abrir', async (req, res) => {
  try {
    console.log('SESSION COMPLETA:', req.session);
    console.log('USUARIO SESSION:', req.session.usuario);

    // Receber saldo_inicial do frontend
    const { saldo_inicial } = req.body;

    if (saldo_inicial === undefined || saldo_inicial === null) {
      return res.status(400).json({ erro: 'Saldo inicial obrigatório.' });
    }

    const usuario_id = req.session.usuario?.usuario_id;
    if (!usuario_id) {
      return res.status(401).json({ erro: 'Não autorizado.' });
    }

    // Verificar se já existe caixa aberto hoje
    const [caixaAberto] = await db.query(
      `SELECT id FROM caixa 
       WHERE DATE(data_abertura) = CURDATE() 
       AND status = 'Aberto'`
    );

    if (caixaAberto.length > 0) {
      return res.status(400).json({ erro: 'Já existe caixa aberto hoje.' });
    }

    // Inserir caixa
    await db.query(
      `INSERT INTO caixa (data_abertura, usuario_abertura, saldo_inicial, status)
       VALUES (NOW(), ?, ?, 'Aberto')`,
      [usuario_id, saldo_inicial]
    );

    res.json({ sucesso: true });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao abrir caixa.' });
  }
});

// ===============================
// STATUS DO CAIXA
// ===============================
router.get('/status', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*,
              p.nome AS usuario_nome
       FROM caixa c
       LEFT JOIN profissionais p 
              ON p.usuario_id = c.usuario_abertura
       WHERE DATE(c.data_abertura) = CURDATE()
       ORDER BY c.id DESC
       LIMIT 1`
    );

    if (!rows.length) {
      return res.json({ aberto: false });
    }

    const caixa = rows[0];
    res.json({
      aberto: caixa.status === 'Aberto',
      caixa
    });

  } catch (erro) {
    console.error('Erro ao buscar status do caixa:', erro);
    res.status(500).json({ erro: 'Erro ao buscar status do caixa.' });
  }
});

// ===============================
// FECHAR CAIXA
// ===============================
router.post('/fechar', async (req, res) => {
  try {
    const usuario_id = req.session.usuario?.usuario_id;
    if (!usuario_id) {
      return res.status(401).json({ erro: 'Não autorizado.' });
    }

    // Receber saldo_final enviado pelo frontend
    const { saldo_final } = req.body;
    if (saldo_final === undefined || saldo_final === null) {
      return res.status(400).json({ erro: 'Saldo final obrigatório.' });
    }

    // Buscar caixa aberto mais recente
    const [caixa] = await db.query(
      `SELECT id FROM caixa
       WHERE status = 'Aberto'
       ORDER BY id DESC
       LIMIT 1`
    );

    if (!caixa.length) {
      return res.status(400).json({ erro: 'Nenhum caixa aberto.' });
    }

    const caixaId = caixa[0].id;

    // Atualizar caixa
    const [result] = await db.query(
      `UPDATE caixa
       SET data_fechamento = NOW(),
           usuario_fechamento = ?,
           saldo_final = ?,
           status = 'Fechado'
       WHERE id = ?`,
      [usuario_id, saldo_final, caixaId]
    );

    console.log("Caixa fechado com sucesso. ID:", caixaId);
    console.log("Resultado UPDATE:", result);

    res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro ao fechar caixa:', erro);
    res.status(500).json({ erro: 'Erro ao fechar caixa.' });
  }
});

export default router;
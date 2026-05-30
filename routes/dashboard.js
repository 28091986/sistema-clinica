import express from 'express';
import db from '../database/db.js';
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', verificarLogin, async (req, res) => {
  try {

    const [agendadosHoje] = await db.query(`
      SELECT COUNT(*) AS total
      FROM consultas
      WHERE DATE(data) = CURDATE()
      AND status = 'Agendada'
    `);
        const [pacientesNovos] = await db.query(`
        SELECT COUNT(*) AS total
        FROM pacientes
        WHERE MONTH(criado_em) = MONTH(CURDATE())
        AND YEAR(criado_em) = YEAR(CURDATE())
        `);

    const [profissionais] = await db.query(`
      SELECT COUNT(*) AS total
      FROM profissionais
      WHERE ativo = 1
    `);

    const [receita] = await db.query(`
      SELECT SUM(valor) AS total
      FROM consultas
      WHERE MONTH(data) = MONTH(CURDATE())
      AND status = 'Realizada'
    `);

    res.json({
      agendadosHoje: agendadosHoje[0].total || 0,
      pacientesNovos: pacientesNovos[0].total || 0,
      profissionais: profissionais[0].total || 0,
      receita: receita[0].total || 0,
      mensagemHoje: 'Atualizado em tempo real'
    });

  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({ erro: 'Erro ao carregar dashboard' });
  }
});

export default router;
import express from 'express';
import db from '../database/db.js';
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', verificarLogin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        c.paciente_id,
        c.profissional_id,
        p.nome AS paciente_nome,
        pr.nome AS profissional_nome,
        pr.especialidade,
        c.tipo,
        c.data,
        c.hora,
        c.status,
        c.observacoes
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      JOIN profissionais pr ON pr.id = c.profissional_id
      ORDER BY c.data DESC, c.hora DESC
    `);

    res.json(rows);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar consultas' });
  }
});

router.get('/historico', verificarLogin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        p.nome AS paciente,
        pr.nome AS profissional,
        pr.especialidade,
        c.tipo,
        c.data,
        c.hora,
        c.status
      FROM consultas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN profissionais pr ON c.profissional_id = pr.id
      WHERE c.status = 'Realizada'
      ORDER BY c.data DESC, c.hora DESC
    `);

    res.json(rows);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

router.get('/:id', verificarLogin, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        c.data,
        c.hora,
        c.tipo,
        c.valor,
        c.status,
        c.observacoes,
        p.id AS paciente_id,
        p.nome AS paciente_nome,
        pr.id AS profissional_id,
        pr.nome AS profissional_nome,
        pr.especialidade
      FROM consultas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN profissionais pr ON c.profissional_id = pr.id
      WHERE c.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Consulta não encontrada' });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

function obterValorPorTipo(tipo) {
  const tabela = {
    'Consulta': 200,
    'Retorno': 150,
    'Avaliação Neuropsicológica': 800,
    'Avaliação Neuropsicológica Personalizada': 1200
  };

  return tabela[tipo] || 0;
}

router.post('/', verificarLogin, async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      paciente_id,
      profissional_id,
      data,
      hora,
      tipo,
      status,
      observacoes
    } = req.body;

    if (!paciente_id || !profissional_id || !data || !hora) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    const valor = obterValorPorTipo(tipo);

    const [result] = await connection.query(`
      INSERT INTO consultas
      (paciente_id, profissional_id, data, hora, tipo, valor, status, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paciente_id,
      profissional_id,
      data,
      hora,
      tipo,
      valor,
      status || 'Agendada',
      observacoes || null
    ]);

    const consultaId = result.insertId;

    await connection.query(`
      INSERT INTO financeiro
      (consulta_id, paciente_id, profissional_id, descricao, valor, data_lancamento)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      consultaId,
      paciente_id,
      profissional_id,
      `Consulta - ${tipo}`,
      valor,
      data
    ]);

    await connection.commit();
    res.json({ sucesso: true });

  } catch (erro) {
    await connection.rollback();
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao criar consulta' });
  } finally {
    connection.release();
  }
});


/* Atualizar status */
router.patch('/:id', verificarLogin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusPermitidos = ['Agendada', 'Realizada', 'Cancelada', 'Faltou'];

  if (!status || !statusPermitidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido ou não informado' });
  }

  try {
    const [resultado] = await db.query(
      'UPDATE consultas SET status = ? WHERE id = ?',
      [status, id]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ erro: 'Consulta não encontrada' });
    }

    res.json({ mensagem: `Consulta atualizada para ${status}` });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao atualizar consulta' });
  }
});

export default router;
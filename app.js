import express from 'express';
import bcrypt from 'bcrypt';
import session from 'express-session';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database/db.js';



dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   CONFIG PRODUÇÃO
========================= */
app.set('trust proxy', 1); // necessário para HTTPS no Render

/* =========================
   MIDDLEWARES
========================= */
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =========================
   SESSION
========================= */
app.use(session({
  name: 'clinica.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 // 1 hora
  }
}));


/* =========================
   LOGIN MIDDLEWARE
========================= */
function verificarLogin(req, res, next) {
  if (req.session.usuario) return next();
  if (req.path.startsWith('/api')) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  res.redirect('/login');
}

/* =========================
   PERMISSÃO POR NÍVEL
========================= */
function verificarPermissao(niveisPermitidos) {
  return (req, res, next) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    if (!niveisPermitidos.includes(req.session.usuario.nivel)) return res.status(403).json({ erro: 'Acesso negado' });
    next();
  };
}

/* =========================
   ROTAS HTML
========================= */
app.get(['/', '/login'], (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'login.html'))
);

app.get('/home', verificarLogin, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'home.html'))
);

app.get('/atendimentos/:consultaId', verificarLogin, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'atendimentos.html'))
);

app.get(
  ['/pacientes', '/agendamentos', '/profissionais', '/atendimentos'],
  verificarLogin,
  (req, res) =>
    res.sendFile(path.join(__dirname, 'views', `${req.path.replace('/', '')}.html`))
);



app.get('/historico', verificarLogin, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'historico.html'))
);

app.get('/financeiro', verificarLogin, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'financeiro.html'))
);

app.get('/historicoConsultas', verificarLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'historicoConsultas.html'));
});



/* =========================
   API LOGIN
========================= */
app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ sucesso: false });
    }

    const [rows] = await db.query(`
      SELECT 
        u.id AS usuario_id,
        u.email,
        u.senha,
        u.nivel,
        u.ativo AS usuario_ativo,
        p.id AS profissional_id,
        p.nome,
        p.ativo AS profissional_ativo
      FROM usuarios u
      JOIN profissionais p ON p.usuario_id = u.id
      WHERE u.email = ?
      LIMIT 1
    `, [email]);

    if (!rows.length) {
      return res.json({ sucesso: false });
    }

    const usuario = rows[0];

    // Verifica se usuário está ativo
    if (!usuario.usuario_ativo) {
      return res.json({ sucesso: false });
    }

    // Verifica se profissional está ativo
    if (!usuario.profissional_ativo) {
      return res.json({ sucesso: false });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha);

    if (!senhaOk) {
      return res.json({ sucesso: false });
    }

    // Criar sessão
    req.session.usuario = {
      usuario_id: usuario.usuario_id,
      profissional_id: usuario.profissional_id,
      nome: usuario.nome,
      nivel: usuario.nivel,
      email: usuario.email
    };

    res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(500).json({ sucesso: false });
  }
});

/* =========================
   API PACIENTES
========================= */
/* =========================
   API PACIENTES
========================= */

/* LISTAR */
app.get('/api/pacientes', verificarLogin, async (req, res) => {
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
app.post('/api/pacientes', verificarLogin, async (req, res) => {
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
app.put('/api/pacientes/:id', verificarLogin, async (req, res) => {
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
      SET
        nome = ?,
        telefone = ?,
        email = ?,
        rua = ?,
        numero = ?,
        bairro = ?,
        cidade = ?,
        estado = ?,
        data_nascimento = ?
      WHERE id = ?
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
app.delete('/api/pacientes/:id', verificarLogin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`
      DELETE FROM pacientes
      WHERE id = ?
    `, [id]);

    res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro ao excluir paciente:', erro);
    res.status(500).json({ erro: 'Erro ao excluir paciente' });
  }
});


/* =========================
   API PROFISSIONAIS
========================= */
app.get('/api/profissionais', verificarLogin, async (req, res) => {
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
    res.status(500).json({ erro: 'Erro ao buscar profissionais' });
  }
});

app.post('/api/profissionais', verificarLogin, verificarPermissao(['admin']), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { nome, especialidade, ativo, email, senha, nivel } = req.body;

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
    res.status(500).json({ erro: 'Erro ao cadastrar profissional' });
  } finally {
    connection.release();
  }
});

app.put('/api/profissionais/:id', verificarLogin, async (req, res) => {
  try {
    const { nome, especialidade, ativo } = req.body;

    const [result] = await db.query(
      'UPDATE profissionais SET nome=?, especialidade=?, ativo=? WHERE id=?',
      [nome, especialidade, ativo ?? 1, req.params.id]
    );

    if (!result.affectedRows)
      return res.status(404).json({ erro: 'Profissional não encontrado' });

    res.json({ sucesso: true });

  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao atualizar profissional' });
  }
});

app.delete('/api/profissionais/:id', verificarLogin, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM profissionais WHERE id=?',
      [req.params.id]
    );

    if (!result.affectedRows)
      return res.status(404).json({ erro: 'Profissional não encontrado' });

    res.json({ sucesso: true });

  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao excluir profissional' });
  }
});

/* =========================
   API CONSULTAS
========================= */
app.get('/api/consultas', verificarLogin, async (req, res) => {
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


app.get('/api/consultas/historico', verificarLogin, async (req, res) => {
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

app.get('/api/consultas/:id', verificarLogin, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        c.data,
        c.hora,
        c.tipo,
        c.especialidade,
        c.valor,
        c.status,
        c.observacoes,
        p.id AS paciente_id,
        p.nome AS paciente_nome,
        pr.id AS profissional_id,
        pr.nome AS profissional_nome
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
    console.error('Erro ao buscar consulta:', error);
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


app.post('/api/consultas', verificarLogin, async (req, res) => {
  try {
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

    // Inserir consulta
    const [result] = await db.query(`
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

    // Criar lançamento financeiro automático
    await db.query(`
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

    res.json({ sucesso: true });

  } catch (erro) {
    console.error('Erro ao criar consulta:', erro);
    res.status(500).json({ erro: 'Erro ao criar consulta' });
  }
});


/* =========================
   API ATENDIMENTOS
========================= */

app.get('/api/atendimentos/consulta/:consultaId', verificarLogin, async (req, res) => {
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

app.get('/api/historicoConsultas/:pacienteId', verificarLogin, async (req, res) => {
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

app.get('/api/atendimentos', verificarLogin, async (req, res) => {
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
app.post('/api/atendimentos', verificarLogin, async (req, res) => {
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
    return res.json(null); 
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




/* =========================
   CANCELAR CONSULTA
========================= */
app.patch('/api/consultas/:id', verificarLogin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validar status
  const statusPermitidos = ['Agendada', 'Realizada', 'Cancelada', 'Faltou'];
  if (!status || !statusPermitidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido ou não informado' });
  }

  try {
    const [resultado] = await db.query(
      'UPDATE consultas SET status = ? WHERE id = ?',
      [status, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Consulta não encontrada' });
    }

    res.json({ mensagem: `Consulta atualizada para ${status}` });
  } catch (erro) {
    console.error('Erro ao atualizar status da consulta:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar status da consulta' });
  }
});

app.get('/api/historicoConsultas', verificarLogin, async (req, res) => {
  try {
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
      WHERE a.profissional_id = ?
      ORDER BY a.criado_em DESC
    `, [medicoId]);

    res.json(dados);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});


/* =========================
   FINANCEIRO
========================= */
app.get('/api/financeiro', verificarLogin, async (req, res) => {
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


app.put('/api/financeiro/:id/pagar', verificarLogin, async (req, res) => {
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


app.post('/api/financeiro/gerar/:consultaId', verificarLogin, async (req, res) => {
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




/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

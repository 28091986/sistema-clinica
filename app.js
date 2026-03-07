import express from 'express';
import bcrypt from 'bcrypt';
import session from 'express-session';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database/db.js';
import { verificarLogin, verificarPermissao } from './middlewares/auth.js';


dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ========== MIDDLEWARES ========== */
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  name: 'clinica.sid',
  secret: process.env.SESSION_SECRET || 'teste123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60
  }
}));




/* ========== CACHE ========== */
// Middleware para evitar cache em páginas protegidas
function noCache(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

/* ========== ROTAS HTML ========== */
app.get(['/', '/login'], (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'login.html'))
);

app.get('/home', verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'home.html'))
);

app.get('/atendimentos/:consultaId', verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'atendimentos.html'))
);

app.get(['/pacientes','/agendamentos','/profissionais','/atendimentos'], verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', `${req.path.replace('/', '')}.html`))
);

app.get('/historico', verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'historico.html'))
);

app.get('/financeiro', verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'financeiro.html'))
);

app.get('/historicoConsultas', verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'historicoConsultas.html'))
);

app.get('/caixa', verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'caixa.html'))
);

app.get('/pagamentos', verificarLogin, noCache, (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'pagamentos.html'))
);

/* ========== ROTAS LOGOUT ========== */
// Substitua a rota atual de logout por esta versão
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('clinica.sid');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.redirect('/login'); // redireciona direto
  });
});


/* ========== APIs ========== */
import loginRoutes from './routes/login.js';
import pacientesRoutes from './routes/pacientes.js';
import profissinaisRouter from './routes/profissionais.js';
import consultasRoutes from './routes/agendamentos.js';
import atendimentosRoutes from './routes/atendimentos.js';
import financeiroRoutes from './routes/financeiro.js';
import caixaRoutes from './routes/caixa.js';
import pagamentosRoutes from './routes/pagamentos.js';

import recibosRoutes from './routes/recibos.js'

import meRoutes from './routes/me.js';


app.use('/api/login', loginRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/profissionais', profissinaisRouter);
app.use('/api/consultas', consultasRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/pagamentos', pagamentosRoutes);
app.use('/api/recibos', recibosRoutes);

app.use('/api/me', meRoutes);

/* ========== SERVER ========== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.MYSQL_URL);

const db = mysql.createPool({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1), // remove a barra inicial
  port: dbUrl.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection()
  .then(conn => {
    console.log('✅ Conexão com MySQL bem-sucedida via MYSQL_URL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
  });

export default db;
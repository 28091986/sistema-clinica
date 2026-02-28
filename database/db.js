import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';

// Usa a URL completa do Railway
const db = mysql.createPool(process.env.MYSQL_URL);

db.getConnection()
  .then(conn => {
    console.log('✅ Conexão com MySQL bem-sucedida via MYSQL_URL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
  });

export default db;
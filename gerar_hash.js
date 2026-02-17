import bcrypt from 'bcrypt';

const senha = '140494'; // senha da Dra. Denise

const hash = await bcrypt.hash(senha, 10);
console.log('Hash gerado:', hash);

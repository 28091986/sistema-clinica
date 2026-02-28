// routes/recibos.js
import express from 'express';
import PDFDocument from 'pdfkit';
import db from '../database/db.js'; // ajuste se necessário
import { verificarLogin } from '../middlewares/auth.js';

const router = express.Router();

// ==========================================
// 🧾 GERAR RECIBO PDF
// ==========================================
router.get('/:id', verificarLogin, async (req, res) => {

   console.log('🔎 Rota recibo chamada');
  console.log('ID recebido:', req.params.id);
  const pagamentoId = req.params.id;

  try {
    // ===============================
    // Buscar pagamento + informações do paciente e profissional
    // ===============================
const [pagamento] = await db.query(`
  SELECT 
    p.*,
    pac.nome AS paciente_nome,
    pr.nome AS profissional_nome,
    f.descricao AS servico,
    f.valor AS valor_total
  FROM pagamentos p
  JOIN financeiro f ON f.id = p.financeiro_id
  JOIN pacientes pac ON pac.id = f.paciente_id
  JOIN profissionais pr ON pr.usuario_id = p.usuario_id
  WHERE p.id = ?
`, [pagamentoId]);

console.log('Resultado da query:', pagamento);

    if (!pagamento.length) {
      return res.status(404).send('Pagamento não encontrado');
    }

    const dados = pagamento[0];
    const numeroRecibo = String(dados.id).padStart(6, '0');
    const dataHora = new Date(dados.data_pagamento).toLocaleString('pt-BR');

    // ===============================
    // Gerar PDF
    // ===============================
    const doc = new PDFDocument({
      size: [226, 1000], // 80mm largura
      margin: 10
    });

    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(12).text('CLÍNICA VIDA PLENA', { align: 'center' });
    doc.fontSize(8).text('CNPJ: 00.000.000/0001-00', { align: 'center' });
    doc.text('Rua Exemplo, 123 - Centro', { align: 'center' });
    doc.moveDown(0.5);

    doc.text('--------------------------------');
    doc.text(`RECIBO Nº: ${numeroRecibo}`);
    doc.text(`DATA: ${dataHora}`);
    doc.text('--------------------------------');

    doc.text(`Paciente: ${dados.paciente_nome}`);
    doc.text(`Profissional: ${dados.profissional_nome}`);
    doc.text(`Serviço: ${dados.servico || 'Consulta'}`);
    doc.moveDown(0.5);

    doc.text('--------------------------------');

    doc.fontSize(11).text(
      `TOTAL: R$ ${Number(dados.valor_total).toFixed(2)}`,
      { align: 'right' }
    );

    doc.fontSize(9).text(`Forma: ${dados.metodo_pagamento}`);
    doc.text('--------------------------------');

    doc.moveDown(1);
    doc.fontSize(8).text('Obrigado pela preferência!', { align: 'center' });
    doc.text('Documento sem valor fiscal.', { align: 'center' });

    doc.end();

  } catch (erro) {
    console.error('Erro ao gerar recibo:', erro);
    res.status(500).send('Erro ao gerar recibo');
  }
});


export default router;
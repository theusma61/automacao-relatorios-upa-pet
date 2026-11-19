require('dotenv').config();
const { prisma } = require('../db');

(async () => {
  try {
    const exames = await prisma.exameLaudo.findMany({ take: 5, orderBy: { criadoEm: 'desc' } });
    console.log('Total exames:', exames.length);
    for (const ex of exames) {
      console.log('ID:', ex.id, 'Paciente:', ex.pacienteNome, 'laudoEstruturado type:', typeof ex.laudoEstruturado, 'Array?', Array.isArray(ex.laudoEstruturado), 'length:', ex.laudoEstruturado?.length);
      console.log('Sample:', JSON.stringify(ex.laudoEstruturado)?.substring(0, 200));
    }
  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

'use strict';

const { prisma } = require('./db');
const { syncModelosDoJson } = require('./gerenciador_modelos');
const { obterLayout } = require('./gerenciador_layout');

const USUARIOS_PADRAO = [
  {
    email: 'camilabastos@upapet.com.br',
    nome: 'Dra. Camila Bastos',
    role: 'admin',
    crmv: 'CRMV/MG: 22904',
    nomeClinica: 'Vetaro'
  },
  {
    email: 'matheusteteu00123@gmail.com',
    nome: 'Matheus Augusto',
    role: 'admin',
    crmv: null,
    nomeClinica: 'Vetaro'
  }
];

async function seedClinicaPadrao() {
  return await prisma.clinica.upsert({
    where: { id: 'clinica_upa_pet' },
    update: {},
    create: {
      id: 'clinica_upa_pet',
      nome: 'Vetaro - Clínica Veterinária',
      cidade: 'Belo Horizonte',
      estado: 'MG'
    }
  });
}

async function seedUsuarios(clinicaId = 'clinica_upa_pet') {
  for (const u of USUARIOS_PADRAO) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        nome: u.nome,
        role: u.role,
        crmv: u.crmv || null,
        nomeClinica: u.nomeClinica || 'Vetaro',
        clinicaId
      }
    });
  }
  const total = await prisma.usuario.count();
  console.log(`[seed] usuários: ${total} no banco PostgreSQL`);
}

async function seedModelos() {
  const res = await syncModelosDoJson();
  return res.novos + res.atualizados;
}

async function seedLayout() {
  await obterLayout(null);
  console.log('[seed] layout padrão institucional verificado.');
}

async function executarSeed() {
  const inicio = Date.now();
  const clinica = await seedClinicaPadrao();
  await seedUsuarios(clinica.id);
  await seedModelos();
  await seedLayout();
  console.log(`[seed] PostgreSQL inicializado em ${Date.now() - inicio} ms`);
}

if (require.main === module) {
  executarSeed()
    .catch((err) => {
      console.error('[seed] erro:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { executarSeed, seedUsuarios, seedModelos, seedLayout };

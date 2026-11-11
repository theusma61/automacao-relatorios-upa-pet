'use strict';

/**
 * Seed do banco SQLite — módulo de inicialização do banco.
 *
 * Usos:
 * - CLI:            node seed.js
 * - CLI legado:     node scripts/seed-sqlite.js  (delegado, para npm run db:seed)
 * - Automatico:     chamado em servidor_web.js no boot
 *
 * Contexto de deploy (Render): o arquivo upa_pet.db é gitignored e o disco do
 * container é efêmero — cada redeploy/restart recomeça sem banco. O seed aqui
 * repopula os modelos institucionais (./modelos_cirurgicos) quando a tabela
 * estiver vazia, sem afetar dados que já existem.
 *
 * Semântica (idempotente):
 * - usuarios: insere padrões somente quando ausentes (ON CONFLICT DO NOTHING);
 * - modelos: importa de ./modelos_cirurgicos SOLO se a tabela estiver vazia
 *   (não sobrescreve modelos criados ou editados via aplicação);
 * - layout: insere o layout padrão com INSERT OR IGNORE.
 */

const fs = require('fs');
const path = require('path');

const { getDatabase, getDbPath } = require('./db');

const PASTA_MODELOS = path.join(__dirname, 'modelos_cirurgicos');

const USUARIOS_PADRAO = [
  {
    email: 'camilabastos@upapet.com.br',
    nome: 'Dra. Camila Bastos',
    role: 'admin',
    crmv: 'CRMV/MG: 22904'
  },
  {
    email: 'matheusteteu00123@gmail.com',
    nome: 'Matheus Augusto',
    role: 'admin',
    crmv: null
  }
];

function seedUsuarios(db) {
  let insersions = 0;
  for (const u of USUARIOS_PADRAO) {
    const stmt = db.prepare(`
      INSERT INTO usuarios (email, nome, role, crmv)
      VALUES (@email, @nome, @role, @crmv)
      ON CONFLICT (email) DO NOTHING
    `);
    const info = stmt.run({
      email: u.email,
      nome: u.nome,
      role: u.role,
      crmv: u.crmv || null
    });
    insersions += info.changes > 0 ? 1 : 0;
  }
  const total = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
  console.log(`[seed] usuários: ${insersions} inserido(s), ${total} no banco`);
}

function seedModelos(db) {
  const existente = db
    .prepare('SELECT COUNT(*) AS n FROM modelos_cirurgicos')
    .get().n;
  if (existente > 0) {
    console.log(
      `[seed] modelos: ${existente} já no banco — importação pulada ` +
      '(preservando modelos criados/editados via aplicação)'
    );
    return 0;
  }

  if (!fs.existsSync(PASTA_MODELOS)) {
    console.log(`[seed] pasta ${PASTA_MODELOS} não existe — nada a importar`);
    return 0;
  }

  const arquivos = fs.readdirSync(PASTA_MODELOS).filter((f) => f.endsWith('.json'));
  const upsert = db.prepare(`
    INSERT INTO modelos_cirurgicos (
      id, nome, sinonimos, procedimento,
      diagnostico_pre_cirurgico, descricao_procedimento, evolucao_consideracoes
    ) VALUES (
      @id, @nome, @sinonimos, @procedimento,
      @diag, @desc, @evolucao
    )
  `);

  let importados = 0;
  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(
        fs.readFileSync(path.join(PASTA_MODELOS, arq), 'utf8')
      );
      if (!conteudo.id) conteudo.id = arq.replace('.json', '');
      upsert.run({
        id: String(conteudo.id).toLowerCase(),
        nome: conteudo.nome || '',
        sinonimos: JSON.stringify(
          Array.isArray(conteudo.sinonimos) ? conteudo.sinonimos : []
        ),
        procedimento: conteudo.procedimento || conteudo.nome || '',
        diag: conteudo.diagnosticoPreCirurgico || null,
        desc: conteudo.descricaoProcedimento || '',
        evolucao: conteudo.evolucaoConsideracoes || null
      });
      importados++;
    } catch (err) {
      console.error(`[seed] erro ao importar ${arq}:`, err.message);
    }
  }
  const total = db.prepare('SELECT COUNT(*) AS n FROM modelos_cirurgicos').get().n;
  console.log(`[seed] modelos: ${importados} importado(s) da pasta, ${total} no banco`);
  return importados;
}

function seedLayout(db) {
  const stmt = db.prepare(`
    INSERT INTO configuracoes_layout (
      id, font_family, font_size_body, font_size_titulo,
      margin_top, margin_bottom, margin_left, margin_right,
      line_height, paragraph_spacing, cor_primaria, cor_secundaria
    ) VALUES (
      'padrao', 'Calibri, sans-serif', '11pt', '14pt',
      '20mm', '20mm', '15mm', '15mm',
      '1.4', '8pt', '#1B365D', '#4A777A'
    )
    ON CONFLICT (id) DO NOTHING
  `);
  const info = stmt.run();
  console.log(
    `[seed] layout padrão: ${info.changes > 0 ? 'inserido' : 'já existente'}`
  );
}

function executarSeed() {
  const db = getDatabase();
  const inicio = Date.now();
  seedUsuarios(db);
  seedModelos(db);
  seedLayout(db);
  console.log(
    `[seed] completo em ${Date.now() - inicio} ms — banco em ${getDbPath()}`
  );
}

if (require.main === module) {
  executarSeed();
}

module.exports = { executarSeed, seedUsuarios, seedModelos, seedLayout };

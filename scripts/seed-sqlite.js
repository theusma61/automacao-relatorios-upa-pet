#!/usr/bin/env node
/**
 * Seed do banco SQLite — cria o schema e insere usuários/modelos padrão
 * somente quando as tabelas estiverem vazias (idempotente).
 *
 * Uso: node scripts/seed-sqlite.js
 *
 * - Usuários padrão: Dra. Camila (admin) e o e-mail do operador local (admin),
 *   conforme os dados padrão de usuarios.json.
 * - Modelos: importa todos os *.json de ./modelos_cirurgicos, se a pasta
 *   existir e contiver arquivos.
 */

const fs = require('fs');
const path = require('path');

const { getDatabase, getDbPath } = require('../db');

const PASTA_MODELOS = path.join(__dirname, '..', 'modelos_cirurgicos');

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
  console.log(`[seed] usuários: ${insersions} inseridos, ${total} no banco`);
}

function seedModelos(db) {
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
    ON CONFLICT (id) DO UPDATE SET
      nome = excluded.nome,
      sinonimos = excluded.sinonimos,
      procedimento = excluded.procedimento,
      diagnostico_pre_cirurgico = excluded.diagnostico_pre_cirurgico,
      descricao_procedimento = excluded.descricao_procedimento,
      evolucao_consideracoes = excluded.evolucao_consideracoes,
      atualizado_em = datetime('now')
  `);

  let importados = 0;
  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(fs.readFileSync(path.join(PASTA_MODELOS, arq), 'utf8'));
      if (!conteudo.id) conteudo.id = arq.replace('.json', '');
      upsert.run({
        id: String(conteudo.id).toLowerCase(),
        nome: conteudo.nome || '',
        sinonimos: JSON.stringify(Array.isArray(conteudo.sinonimos) ? conteudo.sinonimos : []),
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
  console.log(`[seed] modelos: ${importados} importados da pasta, ${total} no banco`);
  return importados;
}

function main() {
  const db = getDatabase();
  const inicio = Date.now();
  seedUsuarios(db);
  seedModelos(db);
  console.log(
    `[seed] completo em ${Date.now() - inicio} ms — banco em ${getDbPath()}`
  );
}

main();

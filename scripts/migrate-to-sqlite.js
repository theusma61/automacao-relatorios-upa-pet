#!/usr/bin/env node
/**
 * Migração de persistência: JSON -> SQLite
 *
 * - Cria o schema no banco SQLite (se necessário)
 * - Importa ./usuarios.json  -> tabela usuarios
 * - Importa ./modelos_cirurgicos/*.json -> tabela modelos_cirurgicos
 * - Idempotente: pode rodar várias vezes sem duplicar registros
 * - Os arquivos JSON originais são mantidos como backup de referência
 *
 * Uso: node scripts/migrate-to-sqlite.js
 */

const fs = require('fs');
const path = require('path');

const { getDatabase, getDbPath } = require('../db');

const USUARIOS_FILE = path.join(__dirname, '..', 'usuarios.json');
const PASTA_MODELOS = path.join(__dirname, '..', 'modelos_cirurgicos');

/** Lê e normaliza um usuário do formato antigo (usuarios.json). */
function normalizarUsuario(u) {
  const email = (u.email || '').toLowerCase().trim();
  if (!email) throw new Error(`Usuário sem e-mail: ${JSON.stringify(u)}`);

  const rolesValidos = ['admin', 'veterinario', 'assistente', 'pendente'];
  const role = rolesValidos.includes(u.role) ? u.role : 'pendente';

  return {
    email,
    nome: (u.nome || email.split('@')[0] || 'Desconhecido').trim() || 'Desconhecido',
    role,
    crmv: u.crmv || null,
    foto: u.foto || null
  };
}

function importarUsuarios(db) {
  if (!fs.existsSync(USUARIOS_FILE)) {
    console.log(`[migrate] ${USUARIOS_FILE} não existe — usuários pulados`)
    return 0;
  }

  let dados;
  try {
    dados = JSON.parse(fs.readFileSync(USUARIOS_FILE, 'utf8'));
  } catch (err) {
    throw new Error(`Falha ao ler ${USUARIOS_FILE}: ${err.message}`);
  }

  const lista = Array.isArray(dados.usuarios) ? dados.usuarios : [];
  const upsert = db.prepare(`
    INSERT INTO usuarios (email, nome, role, crmv, foto, criado_em)
    VALUES (@email, @nome, @role, @crmv, @foto, @criado_em)
    ON CONFLICT (email) DO UPDATE SET
      nome = CASE WHEN usuarios.nome IS NULL OR usuarios.nome = '' THEN excluded.nome ELSE usuarios.nome END,
      role = CASE WHEN usuarios.role = 'pendente' AND excluded.role IN ('admin','veterinario','assistente') THEN excluded.role ELSE usuarios.role END,
      crmv = CASE WHEN usuarios.crmv IS NULL THEN excluded.crmv ELSE usuarios.crmv END,
      foto  = CASE WHEN usuarios.foto IS NULL AND excluded.foto IS NOT NULL THEN excluded.foto ELSE usuarios.foto END,
      atualizado_em = datetime('now')
  `);

  let importados = 0;
  for (const u of lista) {
    try {
      const n = normalizarUsuario(u);
      upsert.run({
        email: n.email,
        nome: n.nome,
        role: n.role,
        crmv: n.crmv,
        foto: n.foto,
        // Criado em: se o JSON não traz, gera agora (coluna NOT NULL, sem default
        // aplicável quando o parâmetro é explícito null).
        criado_em: (u.criadoEm || u.criado_em) || new Date().toISOString(),
      });
      importados++;
    } catch (err) {
      console.warn(`[migrate] usuário ignorado:`, err.message);
    }
  }

  const total = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
  console.log(`[migrate] usuários: ${importados} processados de ${USUARIOS_FILE}, ${total} no banco`);
  return importados;
}

/** Lê e normaliza um modelo do formato antigo (modelos_cirurgicos/*.json). */
function normalizarModelo(m, idFallback) {
  const nome = (m.nome || '').trim();
  if (!nome) throw new Error(`Modelo sem nome: ${JSON.stringify(m)}`);

  let sinonimos = [];
  if (Array.isArray(m.sinonimos)) {
    sinonimos = m.sinonimos.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof m.sinonimos === 'string') {
    sinonimos = m.sinonimos.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const procedimento = (m.procedimento || nome).trim() || nome;
  const descricaoProcedimento = (m.descricaoProcedimento || '').trim() || procedimento;
  // Fallback garante que modelos históricos sem descrição não sejam descartados.

  return {
    id: (m.id ? String(m.id).toLowerCase() : idFallback)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/, '') || `modelo_${Date.now()}`,
    nome,
    // O banco guarda como string JSON (mesmo formato do seed); o melhor-sqlite3
    // não aceita arrays como parâmetro bind.
    sinonimos: JSON.stringify(sinonimos),
    procedimento,
    diag: m.diagnosticoPreCirurgico || null,
    desc: descricaoProcedimento || procedimento,
    evolucao: m.evolucaoConsideracoes || null
  };
}

function importarModelos(db) {
  if (!fs.existsSync(PASTA_MODELOS)) {
    console.log(`[migrate] ${PASTA_MODELOS} não existe — modelos pulados`)
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
  for (const arq of arquivos.sort()) {
    let conteudo;
    try {
      conteudo = JSON.parse(fs.readFileSync(path.join(PASTA_MODELOS, arq), 'utf8'));
    } catch (err) {
      console.warn(`[migrate] modelo ignorado (${arq}): ${err.message}`);
      continue;
    }
    try {
      const n = normalizarModelo(conteudo, arq.replace('.json', ''));
      upsert.run(n);
      importados++;
    } catch (err) {
      console.warn(`[migrate] modelo ignorado (${arq}): ${err.message}`);
    }
  }

  const total = db.prepare('SELECT COUNT(*) AS n FROM modelos_cirurgicos').get().n;
  console.log(`[migrate] modelos: ${importados} processados de ${PASTA_MODELOS}, ${total} no banco`);
  return importados;
}

function main() {
  const db = getDatabase();
  const inicio = Date.now();

  importarUsuarios(db);
  importarModelos(db);

  const usuarios = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
  const modelos = db.prepare('SELECT COUNT(*) AS n FROM modelos_cirurgicos').get().n;
  const layout = db.prepare('SELECT id FROM configuracoes_layout WHERE id = ?').get('padrao');

  console.log('');
  console.log('========================================================');
  console.log('  Migração concluída com sucesso.');
  console.log(`  Banco:   ${getDbPath()}`);
  console.log(`  Usuários:  ${usuarios}`);
  console.log(`  Modelos:  ${modelos}`);
  console.log(`  Layout:   ${layout ? 'ok (padrão inicializado)' : 'ausente'}`);
  console.log(`  Duração:  ${Date.now() - inicio} ms`);
  console.log('========================================================');
  console.log('  Os arquivos JSON (usuarios.json e modelos_cirurgicos/);')
  console.log('  permanecem no repositório como backup de referência.');
  console.log('  A aplicação lê e escreve exclusivamente o SQLite a partir');
  console.log('  agora. Para reprocessar a migração, rode este script.');
}

main();

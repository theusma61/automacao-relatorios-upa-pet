#!/usr/bin/env node
'use strict';

/**
 * Script de Migração: SQLite (upa_pet.db / JSONs) -> PostgreSQL (Prisma Multi-Tenant)
 * Usa `node:sqlite` nativo do Node 22.5+ / Node 24 (zero node-gyp) ou JSONs.
 */

const fs = require('fs');
const path = require('path');
const { prisma } = require('../db');

const SQLITE_PATH = process.env.DB_PATH || path.join(__dirname, '../upa_pet.db');

function abrirBancoSqliteOpcional(caminho) {
  if (!fs.existsSync(caminho)) return null;
  try {
    const { DatabaseSync } = require('node:sqlite');
    return new DatabaseSync(caminho, { open: true, readOnly: true });
  } catch (_) {}
  try {
    const Database = require('better-sqlite3');
    return new Database(caminho, { readonly: true });
  } catch (_) {}
  return null;
}

async function migrar() {
  console.log('🔄 Iniciando migração: SQLite / JSONs ➔ PostgreSQL...');

  const clinicaPadrao = await prisma.clinica.upsert({
    where: { id: 'clinica_upa_pet' },
    update: {},
    create: {
      id: 'clinica_upa_pet',
      nome: 'UPA PET - Clínica Veterinária',
      cidade: 'Belo Horizonte',
      estado: 'MG'
    }
  });

  let layoutOrigem = null;
  const sqliteDb = abrirBancoSqliteOpcional(SQLITE_PATH);
  if (sqliteDb) {
    try {
      layoutOrigem = sqliteDb.prepare('SELECT * FROM configuracoes_layout WHERE id = ?').get('padrao');
    } catch (_) {}
  }

  await prisma.configuracaoLayout.upsert({
    where: { id: 'padrao' },
    update: {
      fontFamily: layoutOrigem?.font_family || 'Calibri, sans-serif',
      fontSizeBody: layoutOrigem?.font_size_body || '11pt',
      fontSizeTitulo: layoutOrigem?.font_size_titulo || '14pt',
      marginTop: layoutOrigem?.margin_top || '20mm',
      marginBottom: layoutOrigem?.margin_bottom || '20mm',
      marginLeft: layoutOrigem?.margin_left || '15mm',
      marginRight: layoutOrigem?.margin_right || '15mm',
      lineHeight: layoutOrigem?.line_height || '1.4',
      paragraphSpacing: layoutOrigem?.paragraph_spacing || '8pt',
      corPrimaria: layoutOrigem?.cor_primaria || '#1B365D',
      corSecundaria: layoutOrigem?.cor_secundaria || '#4A777A'
    },
    create: {
      id: 'padrao',
      nome: 'Layout Institucional UPA PET',
      isPadrao: true,
      clinicaId: clinicaPadrao.id,
      fontFamily: layoutOrigem?.font_family || 'Calibri, sans-serif',
      fontSizeBody: layoutOrigem?.font_size_body || '11pt',
      fontSizeTitulo: layoutOrigem?.font_size_titulo || '14pt',
      marginTop: layoutOrigem?.margin_top || '20mm',
      marginBottom: layoutOrigem?.margin_bottom || '20mm',
      marginLeft: layoutOrigem?.margin_left || '15mm',
      marginRight: layoutOrigem?.margin_right || '15mm',
      lineHeight: layoutOrigem?.line_height || '1.4',
      paragraphSpacing: layoutOrigem?.paragraph_spacing || '8pt',
      corPrimaria: layoutOrigem?.cor_primaria || '#1B365D',
      corSecundaria: layoutOrigem?.cor_secundaria || '#4A777A'
    }
  });
  console.log('🎨 Layout padrão migrado (id = "padrao").');

  const usuariosParaMigrar = [];
  if (sqliteDb) {
    try {
      usuariosParaMigrar.push(...sqliteDb.prepare('SELECT * FROM usuarios').all());
    } catch (_) {}
  }
  if (usuariosParaMigrar.length === 0 && fs.existsSync(path.join(__dirname, '../usuarios.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, '../usuarios.json'), 'utf8'));
    usuariosParaMigrar.push(...(j.usuarios || []));
  }

  for (const u of usuariosParaMigrar) {
    const emailNorm = (u.email || '').toLowerCase().trim();
    if (!emailNorm) continue;
    const tema = ['light', 'dark', 'system'].includes(u.tema_preferencia) ? u.tema_preferencia : 'system';

    await prisma.usuario.upsert({
      where: { email: emailNorm },
      update: {
        nome: u.nome,
        role: u.role,
        crmv: u.crmv || null,
        foto: u.foto || null,
        temaPreferencia: tema
      },
      create: {
        email: emailNorm,
        nome: u.nome,
        role: u.role || 'pendente',
        crmv: u.crmv || (emailNorm.includes('camila') ? 'CRMV/MG: 22904' : null),
        nomeClinica: 'UPA PET',
        clinicaId: clinicaPadrao.id,
        foto: u.foto || null,
        temaPreferencia: tema
      }
    });
    console.log(`👤 Usuário migrado: ${u.nome} (${emailNorm}) [tema: ${tema}]`);
  }

  const modelosMap = new Map();
  const pastaModelos = path.join(__dirname, '../modelos_cirurgicos');
  if (fs.existsSync(pastaModelos)) {
    const arquivos = fs.readdirSync(pastaModelos).filter(f => f.endsWith('.json'));
    for (const arq of arquivos) {
      const conteudo = JSON.parse(fs.readFileSync(path.join(pastaModelos, arq), 'utf8'));
      const id = String(conteudo.id || arq.replace('.json', '')).toLowerCase();
      modelosMap.set(id, {
        id,
        nome: conteudo.nome,
        sinonimos: Array.isArray(conteudo.sinonimos)
          ? conteudo.sinonimos
          : String(conteudo.sinonimos || '').split(',').map(s => s.trim()).filter(Boolean),
        procedimento: conteudo.procedimento || conteudo.nome,
        diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
        descricaoProcedimento: conteudo.descricaoProcedimento || '',
        evolucaoConsideracoes: conteudo.evolucaoConsideracoes || ''
      });
    }
  }

  if (sqliteDb) {
    try {
      const rows = sqliteDb.prepare('SELECT * FROM modelos_cirurgicos').all();
      for (const r of rows) {
        let sinonimos = [];
        try {
          sinonimos = JSON.parse(r.sinonimos || '[]');
          if (!Array.isArray(sinonimos)) sinonimos = [];
        } catch (_) {
          sinonimos = String(r.sinonimos || '').split(',').map(s => s.trim()).filter(Boolean);
        }
        modelosMap.set(String(r.id).toLowerCase(), {
          id: String(r.id).toLowerCase(),
          nome: r.nome,
          sinonimos,
          procedimento: r.procedimento || r.nome,
          diagnosticoPreCirurgico: r.diagnostico_pre_cirurgico || '',
          descricaoProcedimento: r.descricao_procedimento || '',
          evolucaoConsideracoes: r.evolucao_consideracoes || ''
        });
      }
    } catch (_) {}
  }

  if (sqliteDb && typeof sqliteDb.close === 'function') {
    try { sqliteDb.close(); } catch (_) {}
  }

  for (const m of modelosMap.values()) {
    await prisma.modeloCirurgico.upsert({
      where: { id: m.id },
      update: {
        nome: m.nome,
        sinonimos: m.sinonimos,
        procedimento: m.procedimento,
        diagnosticoPreCirurgico: m.diagnosticoPreCirurgico,
        descricaoProcedimento: m.descricaoProcedimento,
        evolucaoConsideracoes: m.evolucaoConsideracoes,
        isGlobal: true,
        usuarioId: null
      },
      create: {
        id: m.id,
        nome: m.nome,
        sinonimos: m.sinonimos,
        procedimento: m.procedimento,
        diagnosticoPreCirurgico: m.diagnosticoPreCirurgico,
        descricaoProcedimento: m.descricaoProcedimento,
        evolucaoConsideracoes: m.evolucaoConsideracoes,
        isGlobal: true,
        usuarioId: null
      }
    });
    console.log(`🔪 Modelo global migrado: ${m.nome} (${m.id})`);
  }

  console.log('✅ Migração para PostgreSQL concluída com sucesso!');
}

migrar()
  .catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

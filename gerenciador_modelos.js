/**
 * Gerenciador de modelos cirúrgicos — camada de acesso ao banco SQLite
 * (migrado de modelos_cirurgicos/*.json; assinaturas mantidas por compatibilidade
 *  com servidor_web.js — ver docs/AI_AGENT_GUIDELINES.md §2.3)
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./db');

function linhaParaModelo(linha) {
  if (!linha) return null;
  let sinonimos = [];
  if (linha.sinonimos) {
    try {
      sinonimos = JSON.parse(linha.sinonimos);
      if (!Array.isArray(sinonimos)) sinonimos = [];
    } catch (e) {
      sinonimos = String(linha.sinonimos).split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return {
    id: linha.id,
    nome: linha.nome,
    sinonimos,
    procedimento: linha.procedimento,
    diagnosticoPreCirurgico: linha.diagnosticoPreCirurgico || '',
    descricaoProcedimento: linha.descricaoProcedimento,
    evolucaoConsideracoes: linha.evolucaoConsideracoes || ''
  };
}

/**
 * Lista todos os modelos cirúrgicos (ordem alfanumérica por nome, como sempre)
 */
function carregarModelosCirurgicos() {
  const db = getDatabase();
  return db
    .prepare(`
      SELECT id, nome, sinonimos, procedimento, diagnostico_pre_cirurgico,
             descricao_procedimento, evolucao_consideracoes
      FROM modelos_cirurgicos
      ORDER BY nome COLLATE NOCASE
    `)
    .all()
    .map(linhaParaModelo)
    .filter(Boolean);
}

function obterModeloPorId(id) {
  if (!id) return null;
  const db = getDatabase();
  const linha = db.prepare('SELECT * FROM modelos_cirurgicos WHERE id = ?').get(String(id));
  if (!linha) return null;
  return linhaParaModelo(linha);
}

function sanitizarId(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function salvarOuCriarModelo(dados) {
  if (!dados || typeof dados !== 'object') {
    throw new Error('Dados inválidos para o modelo cirúrgico.');
  }

  const nome = (dados.nome || '').trim();
  const procedimento = (dados.procedimento || nome).trim();
  const descricaoProcedimento = (dados.descricaoProcedimento || '').trim();
  const evolucaoConsideracoes = (dados.evolucaoConsideracoes || '').trim();
  const diagnosticoPreCirurgico = (dados.diagnosticoPreCirurgico || '').trim();

  if (!nome) {
    throw new Error('O nome do modelo cirúrgico é obrigatório.');
  }
  if (!descricaoProcedimento) {
    throw new Error('A descrição da técnica cirúrgica padronizada é obrigatória.');
  }

  // Define ID
  let id = dados.id ? sanitizarId(dados.id) : sanitizarId(nome);
  if (!id) {
    id = `modelo_${Date.now()}`;
  }

  // Normaliza sinonimos
  let sinonimos = [];
  if (Array.isArray(dados.sinonimos)) {
    sinonimos = dados.sinonimos.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof dados.sinonimos === 'string') {
    sinonimos = dados.sinonimos.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const modeloFinal = {
    id,
    nome,
    sinonimos,
    procedimento,
    diagnosticoPreCirurgico,
    descricaoProcedimento,
    evolucaoConsideracoes
  };

  const db = getDatabase();
  db.prepare(`
    INSERT INTO modelos_cirurgicos (
      id, nome, sinonimos, procedimento,
      diagnostico_pre_cirurgico, descricao_procedimento, evolucao_consideracoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      nome = excluded.nome,
      sinonimos = excluded.sinonimos,
      procedimento = excluded.procedimento,
      diagnostico_pre_cirurgico = excluded.diagnostico_pre_cirurgico,
      descricao_procedimento = excluded.descricao_procedimento,
      evolucao_consideracoes = excluded.evolucao_consideracoes,
      atualizado_em = datetime('now')
  `).run(
    modeloFinal.id,
    modeloFinal.nome,
    JSON.stringify(modeloFinal.sinonimos),
    modeloFinal.procedimento,
    modeloFinal.diagnosticoPreCirurgico,
    modeloFinal.descricaoProcedimento,
    modeloFinal.evolucaoConsideracoes
  );

  return modeloFinal;
}

function excluirModelo(id) {
  if (!id) throw new Error('ID do modelo não fornecido.');
  const db = getDatabase();
  const info = db
    .prepare('DELETE FROM modelos_cirurgicos WHERE id = ?')
    .run(String(id));
  return info.changes > 0;
}

/**
 * Sincroniza todos os modelos da pasta ./modelos_cirurgicos/*.json para o SQLite.
 *
 * Semântica (idempotente):
 *   - INSERT ... ON CONFLICT (id) DO UPDATE — upsert
 *   - Atualiza: nome, sinonimos, procedimento, diagnostico_pre_cirurgico,
 *     descricao_procedimento, evolucao_consideracoes
 *   - NÃO apaga modelos que existem no banco mas não estão nos JSONs
 *     (modelos criados/editados via UI permanecem).
 *
 * Retorno: { atualizados: number, novos: number, erros: string[] }
 */
function syncModelosDoJson() {
  const pastaModelos = path.join(__dirname, 'modelos_cirurgicos');

  if (!fs.existsSync(pastaModelos)) {
    return { atualizados: 0, novos: 0, erros: ['Pasta modelos_cirurgicos não existe.'] };
  }

  const arquivos = fs.readdirSync(pastaModelos).filter((f) => f.endsWith('.json'));
  const db = getDatabase();
  const upsert = db.prepare(`
    INSERT INTO modelos_cirurgicos (
      id, nome, sinonimos, procedimento,
      diagnostico_pre_cirurgico, descricao_procedimento, evolucao_consideracoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      nome = excluded.nome,
      sinonimos = excluded.sinonimos,
      procedimento = excluded.procedimento,
      diagnostico_pre_cirurgico = excluded.diagnostico_pre_cirurgico,
      descricao_procedimento = excluded.descricao_procedimento,
      evolucao_consideracoes = excluded.evolucao_consideracoes,
      atualizado_em = datetime('now')
  `);

  const antes = db.prepare('SELECT COUNT(*) AS n FROM modelos_cirurgicos').get().n;
  let erros = 0;
  const mensagensErro = [];

  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(
        fs.readFileSync(path.join(pastaModelos, arq), 'utf8')
      );
      if (!conteudo.id) conteudo.id = arq.replace('.json', '');

      upsert.run(
        String(conteudo.id).toLowerCase(),
        conteudo.nome || '',
        JSON.stringify(Array.isArray(conteudo.sinonimos) ? conteudo.sinonimos : []),
        conteudo.procedimento || conteudo.nome || '',
        conteudo.diagnosticoPreCirurgico || null,
        conteudo.descricaoProcedimento || '',
        conteudo.evolucaoConsideracoes || null
      );
    } catch (err) {
      erros++;
      mensagensErro.push(`erro ao sincronizar ${arq}: ${err.message}`);
    }
  }

  const depois = db.prepare('SELECT COUNT(*) AS n FROM modelos_cirurgicos').get().n;
  const novos = Math.max(0, depois - antes);
  const atualizados = Math.max(0, arquivos.length - novos);

  if (erros > 0) {
    console.warn(`[sync] modelos: ${atualizados} atualizado(s), ${novos} novo(s), ${erros} erro(s)`);
    mensagensErro.forEach((e) => console.error(`[sync] ${e}`));
  } else {
    console.log(`[sync] modelos: ${atualizados} atualizado(s), ${novos} novo(s), ${depois} total`);
  }

  return { atualizados, novos, erros: mensagensErro };
}

/**
 * Formata todos os modelos da biblioteca para ser incluídos no prompt da IA.
 * (compatibilidade com analisador_cirurgia.js)
 */
function obterTextoModelosParaPrompt() {
  const modelos = carregarModelosCirurgicos();
  let texto = "=== BIBLIOTECA DE MODELOS CIRÚRGICOS PADRONIZADOS (DRA. CAMILA BASTOS - UPA PET) ===\n\n";

  modelos.forEach((m, idx) => {
    texto += `[MODELO ${idx + 1}: ${m.nome.toUpperCase()}]\n`;
    texto += `Sinônimos / Palavras-chave: ${(m.sinonimos || []).join(', ')}\n`;
    texto += `PROCEDIMENTO: ${m.procedimento}\n`;
    texto += `DIAGNÓSTICO PRÉ-CIRÚRGICO: ${m.diagnosticoPreCirurgico}\n`;
    texto += `DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO:\n${m.descricaoProcedimento}\n`;
    texto += `EVOLUÇÃO E CONSIDERAÇÕES:\n${m.evolucaoConsideracoes}\n\n`;
    texto += `----------------------------------------------------\n\n`;
  });

  return texto;
}

/**
 * Inferencia de modelo por texto — busca o modelo mais provável a partir
 * das palavras-chave do procedimento (semântica leve, sem IA).
 *
 * Regras (ordem de prioridade):
 *   1. Nome exato (case-insensitive) do modelo
 *   2. Sinônimo (case-insensitive, palavra completa)
 *   3. Procedimento (case-insensitive, substring)
 *   4. Palavras-chave do procedimento do modelo
 *
 * Retorno: modelo completo (objeto) ou null.
 */
function inferirModeloPorTexto(procedimentoTexto) {
  if (!procedimentoTexto || typeof procedimentoTexto !== 'string') return null;
  const texto = procedimentoTexto.toLowerCase().trim();
  if (!texto) return null;

  const modelos = carregarModelosCirurgicos();
  if (modelos.length === 0) return null;

  const palavrasModelo = (s) => String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9à-ãâçéíóúü]+/g, ' ')
    .split(/\s+/)
    .filter(p => p && p.length >= 2);

  // 1. Nome exato (case-insensitive, inteiro ou prefixo)
  const porNome = modelos.find(
    (m) => texto.toLowerCase() === (m.nome || '').toLowerCase() ||
           texto.includes(m.nome.toLowerCase())
  );
  if (porNome) return porNome;

  // 2. Sinônimo (palavra completa)
  const textoPalavras = texto.split(/[^a-z0-9à-ãâçéíóúü\s]/g).filter(p => p && p.length >= 2);
  const porSinonimo = modelos.find((m) =>
    (m.sinonimos || []).some((s) =>
      (s.toLowerCase().split(/\s+/)).some(word =>
        textoPalavras.includes(word.toLowerCase())
      )
    )
  );
  if (porSinonimo) return porSinonimo;

  // 3. Palavras-chave do procedimento (overlap ≥ 2 palavras)
  let melhor = null;
  let melhorScore = 0;
  for (const m of modelos) {
    const palavrasProc = palavrasModelo(m.procedimento);
    const palavrasDesc = palavrasModelo(m.descricaoProcedimento);
    let score = 0;
    for (const p of textoPalavras) {
      if (palavrasProc.includes(p)) score += 3;
      else if (palavrasDesc.includes(p)) score += 1;
    }
    if (score > melhorScore) {
      melhorScore = score;
      melhor = m;
    }
  }
  return melhorScore >= 2 ? melhor : null;
}

module.exports = {
  carregarModelosCirurgicos,
  obterModeloPorId,
  salvarOuCriarModelo,
  excluirModelo,
  obterTextoModelosParaPrompt,
  syncModelosDoJson,
  inferirModeloPorTexto
};

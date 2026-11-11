/**
 * Gerenciador de modelos cirúrgicos — camada de acesso ao banco SQLite
 * (migrado de modelos_cirurgicos/*.json; assinaturas mantidas por compatibilidade
 *  com servidor_web.js — ver docs/AI_AGENT_GUIDELINES.md §2.3)
 */

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
    .replace(/[\u0300-\u036f]/g, '')
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

module.exports = {
  carregarModelosCirurgicos,
  obterModeloPorId,
  salvarOuCriarModelo,
  excluirModelo,
  obterTextoModelosParaPrompt
};

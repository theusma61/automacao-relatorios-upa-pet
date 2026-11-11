const fs = require('fs');
const path = require('path');

const PASTA_MODELOS = path.join(__dirname, 'modelos_cirurgicos');
if (!fs.existsSync(PASTA_MODELOS)) {
  fs.mkdirSync(PASTA_MODELOS, { recursive: true });
}

function carregarModelosCirurgicos() {
  if (!fs.existsSync(PASTA_MODELOS)) return [];
  const arquivos = fs.readdirSync(PASTA_MODELOS).filter(f => f.endsWith('.json'));
  const modelos = [];

  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(fs.readFileSync(path.join(PASTA_MODELOS, arq), 'utf8'));
      if (!conteudo.id) {
        conteudo.id = arq.replace('.json', '');
      }
      modelos.push(conteudo);
    } catch (e) {
      console.error(`Erro ao carregar modelo ${arq}:`, e.message);
    }
  }

  // Ordena por nome alfabeticamente
  return modelos.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
}

function obterModeloPorId(id) {
  if (!id) return null;
  const sanitizado = sanitizarId(id);
  const caminho = path.join(PASTA_MODELOS, `${sanitizado}.json`);
  if (!fs.existsSync(caminho)) return null;

  try {
    const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf8'));
    conteudo.id = sanitizado;
    return conteudo;
  } catch (e) {
    console.error(`Erro ao ler modelo ${id}:`, e.message);
    return null;
  }
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
    sinonimos = dados.sinonimos.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof dados.sinonimos === 'string') {
    sinonimos = dados.sinonimos.split(',').map(s => s.trim()).filter(Boolean);
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

  const caminho = path.join(PASTA_MODELOS, `${id}.json`);
  fs.writeFileSync(caminho, JSON.stringify(modeloFinal, null, 2), 'utf8');

  return modeloFinal;
}

function excluirModelo(id) {
  if (!id) throw new Error('ID do modelo não fornecido.');
  const sanitizado = sanitizarId(id);
  const caminho = path.join(PASTA_MODELOS, `${sanitizado}.json`);
  if (fs.existsSync(caminho)) {
    fs.unlinkSync(caminho);
    return true;
  }
  return false;
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

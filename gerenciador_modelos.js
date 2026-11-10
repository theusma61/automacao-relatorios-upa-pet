const fs = require('fs');
const path = require('path');

const PASTA_MODELOS = path.join(__dirname, 'modelos_cirurgicos');

function carregarModelosCirurgicos() {
  if (!fs.existsSync(PASTA_MODELOS)) return [];
  const arquivos = fs.readdirSync(PASTA_MODELOS).filter(f => f.endsWith('.json'));
  const modelos = [];

  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(fs.readFileSync(path.join(PASTA_MODELOS, arq), 'utf8'));
      modelos.push(conteudo);
    } catch (e) {
      console.error(`Erro ao carregar modelo ${arq}:`, e.message);
    }
  }
  return modelos;
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
  obterTextoModelosParaPrompt
};

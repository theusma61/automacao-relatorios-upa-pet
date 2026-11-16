/**
 * Módulo de Extração e Aprendizado Automático do Padrão de Laudo Veterinário (IA Multimodal)
 * Analisa até 10 laudos em PDF de um médico veterinário para identificar:
 * - Estilo de escrita clínica, vocabulário e ordem de órgãos
 * - Frases padrão de normalidade e estrutura de conclusão
 * - Geometria de layout, margens, fontes e cores
 * - Identificação profissional (Nome, CRMV, Clínica)
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODELOS_CANDIDATOS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash'
];

function pdfToGenerativePart(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado para análise: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: 'application/pdf'
    }
  };
}

function sanitizarPerfilExtraido(bruto = {}) {
  const sanitizeStr = (val, padrao = '') => (typeof val === 'string' ? val.trim() : padrao);

  const layoutBruto = bruto.layoutDetectado || {};
  const layout = {
    fontFamily: sanitizeStr(layoutBruto.fontFamily, 'Calibri, sans-serif'),
    fontSizeBody: sanitizeStr(layoutBruto.fontSizeBody, '11pt'),
    fontSizeTitulo: sanitizeStr(layoutBruto.fontSizeTitulo, '14pt'),
    marginTop: sanitizeStr(layoutBruto.marginTop, '20mm'),
    marginBottom: sanitizeStr(layoutBruto.marginBottom, '20mm'),
    marginLeft: sanitizeStr(layoutBruto.marginLeft, '15mm'),
    marginRight: sanitizeStr(layoutBruto.marginRight, '15mm'),
    lineHeight: sanitizeStr(layoutBruto.lineHeight, '1.4'),
    paragraphSpacing: sanitizeStr(layoutBruto.paragraphSpacing, '8pt'),
    corPrimaria: sanitizeStr(layoutBruto.corPrimaria, '#1B365D'),
    corSecundaria: sanitizeStr(layoutBruto.corSecundaria, '#4A777A')
  };

  // Garante que a ordem dos órgãos seja um array de strings válidas
  let ordemOrgaos = Array.isArray(bruto.ordemOrgaos)
    ? bruto.ordemOrgaos.map(o => String(o).trim().toUpperCase()).filter(Boolean)
    : [];

  if (ordemOrgaos.length === 0) {
    ordemOrgaos = [
      'BEXIGA',
      'RIM ESQUERDO',
      'RIM DIREITO',
      'BAÇO',
      'ESTÔMAGO',
      'FÍGADO',
      'VESÍCULA BILIAR',
      'ALÇAS INTESTINAIS',
      'OVÁRIOS / ÚTERO',
      'GLÂNDULA ADRENAL',
      'PÂNCREAS',
      'CAVIDADE ABDOMINAL',
      'CONSIDERAÇÕES'
    ];
  }

  const frasesNormalidade = (bruto.frasesNormalidade && typeof bruto.frasesNormalidade === 'object')
    ? bruto.frasesNormalidade
    : {};

  const vocabularioPreferido = (bruto.vocabularioPreferido && typeof bruto.vocabularioPreferido === 'object')
    ? bruto.vocabularioPreferido
    : {};

  return {
    nomeDetectado: sanitizeStr(bruto.nomeDetectado, ''),
    crmvDetectado: sanitizeStr(bruto.crmvDetectado, ''),
    clinicaDetectada: sanitizeStr(bruto.clinicaDetectada, ''),
    layoutDetectado: layout,
    ordemOrgaos,
    frasesNormalidade,
    vocabularioPreferido,
    estiloConclusao: sanitizeStr(bruto.estiloConclusao, 'Impressão diagnóstica com diagnósticos diferenciais em tópicos objetivos.'),
    observacoesEstilo: sanitizeStr(bruto.observacoesEstilo, 'Laudo técnico objetivo, mantendo termos diagnósticos canônicos.')
  };
}

/**
 * Analisa um conjunto de até 10 laudos em PDF e sintetiza o padrão completo do profissional.
 * @param {string[]} caminhosPdfs - Lista de caminhos absolutos dos arquivos PDF
 * @param {string} apiKey - Chave da API do Google Gemini
 * @param {object} opcoes - Opções complementares
 * @returns {Promise<object>} Perfil consolidado
 */
async function extrairPadraoDeLaudos(caminhosPdfs, apiKey, opcoes = {}) {
  if (!Array.isArray(caminhosPdfs) || caminhosPdfs.length === 0) {
    throw new Error('Nenhum arquivo PDF fornecido para aprendizado de padrão.');
  }

  if (caminhosPdfs.length > 10) {
    throw new Error('O limite máximo é de 10 laudos em PDF por análise.');
  }

  if (!apiKey) {
    throw new Error('Chave de API do Gemini não configurada.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const promptInstrucoes = `
Você é um perito em análise documental médico-veterinária e especialista em design editorial de laudos de ultrassonografia para pequenos animais.
Foram fornecidos ${caminhosPdfs.length} arquivo(s) PDF de laudos reais emitidos pelo mesmo médico veterinário / serviço diagnóstico.

Sua tarefa é analisar minuciosamente todos os laudos fornecidos e sintetizar o PADRÃO EXATO deste profissional em um perfil estruturado.

### DIRETRIZES DE EXTRAÇÃO:

1. IDENTIFICAÇÃO PROFISSIONAL:
   - "nomeDetectado": Nome completo do médico veterinário examinador (ex: "Dra. Camila Bastos", "Dr. Carlos Eduardo").
   - "crmvDetectado": Número de CRMV com estado (ex: "CRMV/MG: 22904", "CRMV-SP 12345").
   - "clinicaDetectada": Nome do hospital, clínica ou serviço volante (ex: "UPA PET", "UltraVet Diagnósticos").

2. PADRÃO VISUAL E LAYOUT (Extrair visualmente do documento):
   - "fontFamily": Família tipográfica mais próxima ("Calibri, sans-serif", "Arial, sans-serif", "Helvetica, sans-serif", "Roboto, sans-serif", "Times New Roman, serif").
   - "fontSizeBody": Tamanho estimado do corpo do texto ("10pt", "11pt", "12pt").
   - "fontSizeTitulo": Tamanho estimado dos títulos dos órgãos ("13pt", "14pt", "15pt").
   - "marginTop", "marginBottom", "marginLeft", "marginRight": Margens estimadas das páginas (ex: "15mm", "20mm", "25mm").
   - "lineHeight": Espaçamento entre linhas estimado ("1.3", "1.4", "1.5").
   - "paragraphSpacing": Espaçamento entre tópicos/parágrafos ("6pt", "8pt", "10pt").
   - "corPrimaria": Cor predominante usada nos títulos, barras de divisão ou cabeçalho (em hexadecimal, ex: "#1B365D").
   - "corSecundaria": Cor de apoio ou secundária (em hexadecimal, ex: "#4A777A").

3. ESTILO DE REDAÇÃO CLÍNICA:
   - "ordemOrgaos": Lista sequencial exata de órgãos na ordem que este veterinário sempre segue no laudo (ex: ["BEXIGA", "RIM ESQUERDO", "RIM DIREITO", "BAÇO", "ESTÔMAGO", "FÍGADO", "VESÍCULA BILIAR", "ALÇAS INTESTINAIS", ...]).
   - "frasesNormalidade": Dicionário/objeto onde cada chave é o NOME DO ÓRGÃO (em maiúsculas) e o valor é o texto ou modelo de frase que este médico utiliza quando o órgão está preservado/normal sem alterações.
   - "vocabularioPreferido": Termos específicos e jargões preferidos pelo médico (ex: se prefere "normoecogênico" ou "ecogenicidade habitual", se usa "contornos regulares" ou "limites bem definidos").
   - "estiloConclusao": Descrição objetiva de como o veterinário redige a conclusão/impressão diagnóstica (ex: "Lista com marcadores e diagnósticos diferenciais em caixa alta", "Parágrafo descritivo corrido", "Tópicos numerados seguidos de conduta sugerida").
   - "observacoesEstilo": Resumo de 2 a 4 frases direcionando o modelo de IA sobre o tom de voz, regras de pontuação e peculiaridades para reproduzir com exatidão o estilo deste veterinário.

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO (sem markdown, sem comentários, sem delimitadores fora do JSON):
{
  "nomeDetectado": "string",
  "crmvDetectado": "string",
  "clinicaDetectada": "string",
  "layoutDetectado": {
    "fontFamily": "Calibri, sans-serif",
    "fontSizeBody": "11pt",
    "fontSizeTitulo": "14pt",
    "marginTop": "20mm",
    "marginBottom": "20mm",
    "marginLeft": "15mm",
    "marginRight": "15mm",
    "lineHeight": "1.4",
    "paragraphSpacing": "8pt",
    "corPrimaria": "#1B365D",
    "corSecundaria": "#4A777A"
  },
  "ordemOrgaos": [
    "BEXIGA",
    "RIM ESQUERDO",
    "RIM DIREITO"
  ],
  "frasesNormalidade": {
    "BEXIGA": "string",
    "FÍGADO": "string"
  },
  "vocabularioPreferido": {
    "termo": "sinonimo_preferido"
  },
  "estiloConclusao": "string",
  "observacoesEstilo": "string"
}
`;

  const pdfParts = caminhosPdfs.map(caminho => pdfToGenerativePart(caminho));

  let ultimoErro = null;
  for (const modeloNome of MODELOS_CANDIDATOS) {
    try {
      console.log(`📑 [APRENDER PADRÃO] Analisando ${caminhosPdfs.length} PDFs com modelo ${modeloNome}...`);
      const model = genAI.getGenerativeModel({ model: modeloNome });
      const resultado = await model.generateContent([promptInstrucoes, ...pdfParts]);
      const textoResposta = resultado.response.text().trim();

      const jsonLimpo = textoResposta.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const jsonParsed = JSON.parse(jsonLimpo);

      const perfilSanitizado = sanitizarPerfilExtraido(jsonParsed);

      const amostrasInfo = caminhosPdfs.map(f => ({
        nome: path.basename(f),
        tamanho: fs.existsSync(f) ? fs.statSync(f).size : 0,
        enviadoEm: new Date().toISOString()
      }));

      return {
        sucesso: true,
        modeloUtilizado: modeloNome,
        amostras: amostrasInfo,
        quantidadeAmostras: caminhosPdfs.length,
        ...perfilSanitizado
      };
    } catch (err) {
      console.warn(`⚠️ [APRENDER PADRÃO] Falha com ${modeloNome}: ${err.message}. Tentando próximo modelo...`);
      ultimoErro = err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  throw new Error(`Falha ao sintetizar padrão dos PDFs com os modelos disponíveis: ${ultimoErro?.message || 'Erro desconhecido'}`);
}

module.exports = {
  extrairPadraoDeLaudos,
  sanitizarPerfilExtraido,
  MODELOS_CANDIDATOS
};

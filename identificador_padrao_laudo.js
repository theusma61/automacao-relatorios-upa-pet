/**
 * Módulo de Extração e Aprendizado Automático do Padrão de Laudo Veterinário (IA Multimodal)
 * Analisa até 10 laudos em PDF de um médico veterinário para identificar e imitar:
 * - Padrão visual completo: layout do cabeçalho, tabelas de paciente, títulos, caixas de destaque
 * - Estilo de formatação dos órgãos (tarja colorida, barra lateral, sublinhado, etc.)
 * - Estilo de escrita clínica, vocabulário e ordem de órgãos
 * - Frases padrão de normalidade e estrutura de conclusão
 * - Geometria de layout, margens, fontes e cores
 * - Identificação profissional (Nome, CRMV, Clínica, Aviso legal e Contato)
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODELOS_CANDIDATOS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
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

  const tVisual = bruto.templateVisual || bruto.layoutDetectado || {};
  const corPrimaria = sanitizeStr(tVisual.corPrimaria || bruto.corPrimaria, '#1B365D');
  const corSecundaria = sanitizeStr(tVisual.corSecundaria || bruto.corSecundaria, '#4A777A');

  const layout = {
    fontFamily: sanitizeStr(tVisual.fontFamily, 'Calibri, sans-serif'),
    fontSizeBody: sanitizeStr(tVisual.fontSizeBody, '11pt'),
    fontSizeTitulo: sanitizeStr(tVisual.fontSizeTitulo, '14pt'),
    marginTop: sanitizeStr(tVisual.marginTop, '20mm'),
    marginBottom: sanitizeStr(tVisual.marginBottom, '20mm'),
    marginLeft: sanitizeStr(tVisual.marginLeft, '15mm'),
    marginRight: sanitizeStr(tVisual.marginRight, '15mm'),
    lineHeight: sanitizeStr(tVisual.lineHeight, '1.4'),
    paragraphSpacing: sanitizeStr(tVisual.paragraphSpacing, '8pt'),
    corPrimaria,
    corSecundaria
  };

  const templateVisual = {
    tipoCabecalho: sanitizeStr(tVisual.tipoCabecalho, 'logo-esquerda-texto-direita'),
    tipoDadosPaciente: sanitizeStr(tVisual.tipoDadosPaciente, 'tabela-zebrada'),
    tituloDocumento: sanitizeStr(tVisual.tituloDocumento, 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL'),
    subtituloDocumento: sanitizeStr(tVisual.subtituloDocumento, ''),
    alinhamentoTitulo: sanitizeStr(tVisual.alinhamentoTitulo, 'center'),
    decoracaoTitulo: sanitizeStr(tVisual.decoracaoTitulo, 'nenhuma'),
    estiloOrgaos: sanitizeStr(tVisual.estiloOrgaos, 'barra-lateral'),
    estiloConclusao: sanitizeStr(tVisual.estiloConclusao, 'caixa-destaque'),
    tituloConclusao: sanitizeStr(tVisual.tituloConclusao, 'IMPRESSÃO DIAGNÓSTICA'),
    posicaoAssinatura: sanitizeStr(tVisual.posicaoAssinatura, 'direita'),
    linhaAssinatura: tVisual.linhaAssinatura !== undefined ? Boolean(tVisual.linhaAssinatura) : true,
    textoAvisoLegal: sanitizeStr(tVisual.textoAvisoLegal, 'O exame ultrassonográfico é um método complementar e deve ser correlacionado com o quadro clínico e exames laboratoriais do paciente.'),
    rodapeContato: sanitizeStr(tVisual.rodapeContato, ''),
    corPrimaria,
    corSecundaria,
    corFundoBlocos: sanitizeStr(tVisual.corFundoBlocos, '#F8FAFC'),
    corBordaTabelas: sanitizeStr(tVisual.corBordaTabelas, '#E2E8F0'),
    fontFamily: layout.fontFamily,
    fontSizeBody: layout.fontSizeBody,
    fontSizeTitulo: layout.fontSizeTitulo,
    marginTop: layout.marginTop,
    marginBottom: layout.marginBottom,
    marginLeft: layout.marginLeft,
    marginRight: layout.marginRight,
    lineHeight: layout.lineHeight,
    paragraphSpacing: layout.paragraphSpacing
  };

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
    templateVisual,
    ordemOrgaos,
    frasesNormalidade,
    vocabularioPreferido,
    estiloConclusao: sanitizeStr(bruto.estiloConclusao, templateVisual.estiloConclusao),
    observacoesEstilo: sanitizeStr(bruto.observacoesEstilo, 'Laudo técnico objetivo, mantendo termos diagnósticos canônicos.')
  };
}

/**
 * Analisa um conjunto de até 10 laudos em PDF e sintetiza o padrão visual e clínico completo do profissional.
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
Você é um perito em design editorial veterinário, diagramação gráfica e análise estrutural de laudos médicos de ultrassonografia.
Foram fornecidos ${caminhosPdfs.length} arquivo(s) PDF de laudos reais emitidos pelo mesmo médico veterinário ou clínica.

Sua tarefa é realizar a ENGENHARIA REVERSA COMPLETA do documento e extrair o modelo exato que este profissional utiliza, tanto na parte VISUAL E DE DIAGRAMAÇÃO quanto na parte CLÍNICA E ESTRUTURAL, para que o sistema consiga imitar fielmente a aparência dos PDFs enviados.

### 1. ENGENHARIA REVERSA DO DESIGN VISUAL (templateVisual):
Identifique minuciosamente como as páginas foram diagramadas:

- "tipoCabecalho":
  * "logo-esquerda-texto-direita" (logotipo posicionado à esquerda e texto institucional à direita)
  * "logo-centro" (logotipo centralizado no topo com dados da clínica logo abaixo)
  * "banner-superior" (uma faixa horizontal sólida e colorida no topo da folha)
  * "duas-colunas-timbrado" (papel timbrado clássico em duas colunas)
  * "sem-logo-tipografico" (cabeçalho apenas com tipografia elegante sem imagem de logo)

- "tipoDadosPaciente": Como os dados do paciente (nome, espécie, raça, tutor, data, idade, solicitante) estão dispostos?
  * "tabela-zebrada" (tabela formal com bordas e linhas com fundo cinza/colorido nas células de cabeçalho)
  * "tabela-borda-simples" (tabela com bordas finas sutis)
  * "grade-boxes" (blocos ou mini-cards individuais para cada dado)
  * "duas-colunas-limpo" (apenas duas colunas com rótulos em negrito)

- "tituloDocumento": O texto EXATO do título principal que aparece no laudo (ex: "RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL", "LAUDO DE ULTRASSONOGRAFIA", "EXAME ULTRASSONOGRÁFICO", etc.).
- "subtituloDocumento": O texto descritivo de método ou equipamento abaixo do título (ex: "Exame ultrassonográfico realizado em modo B...", ou vazio se não houver).
- "alinhamentoTitulo": "center" ou "left".
- "decoracaoTitulo": "nenhuma", "faixa-colorida" (fundo colorido atrás do título) ou "borda-inferior" (linha sob o título).

- "estiloOrgaos": Como os tópicos de órgãos são destacados visualmente?
  * "tarja-colorida" (o nome de cada órgão fica dentro de uma barra ou faixa com fundo colorido contrastante)
  * "barra-lateral" (o nome de cada órgão tem uma barra vertical grossa na cor primária à sua esquerda)
  * "sublinhado" (nome do órgão em caixa alta com linha de divisão inferior)
  * "negrito-inline" (formato tradicional inline "NOME DO ÓRGÃO: texto...")

- "estiloConclusao": Como a conclusão / impressão diagnóstica é apresentada?
  * "caixa-destaque" (fica dentro de um quadro/caixa/card com borda colorida e fundo suave)
  * "secao-sublinhada" (fica em seção com linha divisória)
  * "texto-simples" (apenas parágrafo normal)

- "tituloConclusao": O título exato usado para a conclusão (ex: "IMPRESSÃO DIAGNÓSTICA", "CONCLUSÃO", "CONSIDERAÇÕES FINAIS").

- "posicaoAssinatura": Onde fica a assinatura do médico? "direita", "centro" ou "esquerda".
- "linhaAssinatura": true se há linha horizontal para assinatura/carimbo, false se não.
- "textoAvisoLegal": O texto exato da nota legal / disclaimer que aparece no rodapé do laudo (extraia o texto que este médico realmente usa).
- "rodapeContato": Endereço, telefone, WhatsApp ou e-mail que aparecem no cabeçalho ou rodapé.

- "corPrimaria": Cor predominante em hexadecimal (usada nos títulos, faixas ou logo).
- "corSecundaria": Cor de apoio em hexadecimal (usada em linhas, subtítulos ou bordas).
- "corFundoBlocos": Cor de fundo de tabelas/boxes (ex: "#F8FAFC", "#F1F5F9").
- "corBordaTabelas": Cor das bordas das tabelas (ex: "#E2E8F0", "#CBD5E1").
- "fontFamily": Família tipográfica mais próxima ("Calibri, sans-serif", "Arial, sans-serif", "Helvetica, sans-serif", "Roboto, sans-serif", "Times New Roman, serif").
- "fontSizeBody": Tamanho do corpo (ex: "10pt", "11pt").
- "fontSizeTitulo": Tamanho dos títulos (ex: "13pt", "14pt").
- "marginTop", "marginBottom", "marginLeft", "marginRight": Margens em mm (ex: "20mm", "15mm").
- "lineHeight", "paragraphSpacing": Espaçamentos.

### 2. IDENTIFICAÇÃO PROFISSIONAL E CLÍNICA:
- "nomeDetectado": Nome completo do médico veterinário examinador.
- "crmvDetectado": Número de CRMV com estado (ex: "CRMV/MG: 22904", "CRMV-SP 12345").
- "clinicaDetectada": Nome do hospital, clínica ou serviço volante (ex: "UPA PET", "UltraVet Diagnósticos").

### 3. ESTILO DE REDAÇÃO CLÍNICA:
- "ordemOrgaos": Lista sequencial exata de órgãos na ordem que este veterinário sempre segue no laudo.
- "frasesNormalidade": Dicionário onde cada chave é o NOME DO ÓRGÃO (em maiúsculas) e o valor é o texto ou modelo de frase que este médico utiliza quando o órgão está normal.
- "vocabularioPreferido": Termos específicos preferidos pelo médico.
- "observacoesEstilo": Resumo de 2 a 4 frases direcionando a IA sobre o tom de voz e regras de pontuação.

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO (sem markdown, sem comentários, sem delimitadores fora do JSON):
{
  "nomeDetectado": "string",
  "crmvDetectado": "string",
  "clinicaDetectada": "string",
  "templateVisual": {
    "tipoCabecalho": "logo-esquerda-texto-direita",
    "tipoDadosPaciente": "tabela-zebrada",
    "tituloDocumento": "RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL",
    "subtituloDocumento": "string",
    "alinhamentoTitulo": "center",
    "decoracaoTitulo": "nenhuma",
    "estiloOrgaos": "barra-lateral",
    "estiloConclusao": "caixa-destaque",
    "tituloConclusao": "IMPRESSÃO DIAGNÓSTICA",
    "posicaoAssinatura": "direita",
    "linhaAssinatura": true,
    "textoAvisoLegal": "string",
    "rodapeContato": "string",
    "corPrimaria": "#1B365D",
    "corSecundaria": "#4A777A",
    "corFundoBlocos": "#F8FAFC",
    "corBordaTabelas": "#E2E8F0",
    "fontFamily": "Calibri, sans-serif",
    "fontSizeBody": "11pt",
    "fontSizeTitulo": "14pt",
    "marginTop": "20mm",
    "marginBottom": "20mm",
    "marginLeft": "15mm",
    "marginRight": "15mm",
    "lineHeight": "1.4",
    "paragraphSpacing": "8pt"
  },
  "ordemOrgaos": ["BEXIGA", "RIM ESQUERDO", "RIM DIREITO"],
  "frasesNormalidade": {
    "BEXIGA": "string"
  },
  "vocabularioPreferido": {
    "termo": "sinonimo"
  },
  "estiloConclusao": "string",
  "observacoesEstilo": "string"
}
`;

  const pdfParts = caminhosPdfs.map(caminho => pdfToGenerativePart(caminho));
  const paidApiKey = opcoes.paidApiKey || process.env.GEMINI_API_KEY_PAID || process.env.GEMINI_PAID_API_KEY;

  let ultimoErro = null;

  // FASE 1: Chave Principal / Free Tier
  for (const modeloNome of MODELOS_CANDIDATOS) {
    try {
      console.log(`📑 [APRENDER PADRÃO VISUAL] Analisando ${caminhosPdfs.length} PDFs com modelo ${modeloNome}...`);
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
      console.warn(`⚠️ [APRENDER PADRÃO VISUAL] Falha com ${modeloNome} (chave free): ${err.message}${err.cause ? ' (Detalhe: ' + (err.cause.code || err.cause.message) + ')' : ''}.`);
      ultimoErro = err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // FASE 2: Fallback para a Chave Paga (se configurada)
  if (paidApiKey && paidApiKey !== apiKey) {
    console.log(`💳 [APRENDER PADRÃO VISUAL] Modelos da chave free esgotados/indisponíveis. Ativando fallback para CHAVE PAGA...`);
    const genAIPaid = new GoogleGenerativeAI(paidApiKey);
    const modelosPagos = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.5-flash'
    ];

    for (const modeloPago of modelosPagos) {
      try {
        console.log(`💎 [APRENDER PADRÃO VISUAL - CHAVE PAGA] Analisando com modelo prioritário ${modeloPago}...`);
        const model = genAIPaid.getGenerativeModel({ model: modeloPago });
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
          modeloUtilizado: `${modeloPago} (chave paga)`,
          amostras: amostrasInfo,
          quantidadeAmostras: caminhosPdfs.length,
          ...perfilSanitizado
        };
      } catch (errPago) {
        console.warn(`⚠️ [APRENDER PADRÃO VISUAL] Falha na chave paga com ${modeloPago}: ${errPago.message}${errPago.cause ? ' (Detalhe: ' + (errPago.cause.code || errPago.cause.message) + ')' : ''}.`);
        ultimoErro = errPago;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  throw new Error(`Falha ao sintetizar padrão dos PDFs com os modelos disponíveis: ${ultimoErro?.message || 'Erro desconhecido'}`);
}

module.exports = {
  extrairPadraoDeLaudos,
  sanitizarPerfilExtraido,
  MODELOS_CANDIDATOS
};

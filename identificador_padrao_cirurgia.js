/**
 * Módulo de Extração e Aprendizado Automático do Padrão de Relatório Cirúrgico Veterinário (IA Multimodal)
 * Analisa de 1 a 10 relatórios cirúrgicos em PDF de um médico veterinário para identificar e imitar:
 * - Padrão visual completo: cabeçalho, tabela de paciente, título, estilo das seções, cores, fontes, margens
 * - Rótulos exatos das seções cirúrgicas e rótulo de responsável/tutor
 * - Título do registro fotográfico e padrão de legenda das imagens intraoperatórias
 * - Estilo de redação cirúrgica, frases padrão de antissepsia e evolução pós-operatória
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

function sanitizarPerfilCirurgicoExtraido(bruto = {}) {
  const sanitizeStr = (val, padrao = '') => (typeof val === 'string' && val.trim() ? val.trim() : padrao);

  const tVisual = bruto.templateVisual || bruto.layoutDetectado || {};
  const corPrimaria = sanitizeStr(tVisual.corPrimaria || bruto.corPrimaria, '#1B365D');
  const corSecundaria = sanitizeStr(tVisual.corSecundaria || bruto.corSecundaria, '#4A777A');

  const layout = {
    fontFamily: sanitizeStr(tVisual.fontFamily, 'Calibri, sans-serif'),
    fontSizeBody: sanitizeStr(tVisual.fontSizeBody, '11pt'),
    fontSizeTitulo: sanitizeStr(tVisual.fontSizeTitulo, '13.5pt'),
    marginTop: sanitizeStr(tVisual.marginTop, '18mm'),
    marginBottom: sanitizeStr(tVisual.marginBottom, '18mm'),
    marginLeft: sanitizeStr(tVisual.marginLeft, '20mm'),
    marginRight: sanitizeStr(tVisual.marginRight, '20mm'),
    lineHeight: sanitizeStr(tVisual.lineHeight, '1.35'),
    paragraphSpacing: sanitizeStr(tVisual.paragraphSpacing, '8pt'),
    corPrimaria,
    corSecundaria
  };

  const rotulosRaw = tVisual.rotulosSecoes || bruto.rotulosSecoes || {};
  const rotulosSecoes = {
    data: sanitizeStr(rotulosRaw.data, 'DATA DO PROCEDIMENTO CIRÚRGICO'),
    procedimento: sanitizeStr(rotulosRaw.procedimento, 'PROCEDIMENTO'),
    diagnostico: sanitizeStr(rotulosRaw.diagnostico, 'DIAGNÓSTICO PRÉ-CIRÚRGICO'),
    descricao: sanitizeStr(rotulosRaw.descricao, 'DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO'),
    evolucao: sanitizeStr(rotulosRaw.evolucao, 'EVOLUÇÃO E CONSIDERAÇÕES')
  };

  const templateVisual = {
    tipoCabecalho: sanitizeStr(tVisual.tipoCabecalho, 'logo-esquerda-dados-direita'),
    tipoDadosPaciente: sanitizeStr(tVisual.tipoDadosPaciente, 'duas-colunas-limpo'),
    tituloDocumento: sanitizeStr(tVisual.tituloDocumento, 'RELATÓRIO CIRÚRGICO'),
    subtituloDocumento: typeof tVisual.subtituloDocumento === 'string' ? tVisual.subtituloDocumento.trim() : '',
    alinhamentoTitulo: sanitizeStr(tVisual.alinhamentoTitulo, 'center'),
    decoracaoTitulo: sanitizeStr(tVisual.decoracaoTitulo, 'nenhuma'),
    estiloSecoes: sanitizeStr(tVisual.estiloSecoes, 'negrito-inline'),
    rotuloResponsavel: sanitizeStr(tVisual.rotuloResponsavel, 'Responsável'),
    rotulosSecoes,
    tituloRegistroFotografico: sanitizeStr(tVisual.tituloRegistroFotografico, 'REGISTRO FOTOGRÁFICO INTRAOPERATÓRIO'),
    legendaPadraoFoto: sanitizeStr(tVisual.legendaPadraoFoto, 'Registro fotográfico intraoperatório / peça cirúrgica'),
    posicaoAssinatura: sanitizeStr(tVisual.posicaoAssinatura, 'centro'),
    linhaAssinatura: tVisual.linhaAssinatura !== undefined ? Boolean(tVisual.linhaAssinatura) : false,
    textoAvisoLegal: typeof tVisual.textoAvisoLegal === 'string' ? tVisual.textoAvisoLegal.trim() : '',
    rodapeContato: sanitizeStr(tVisual.rodapeContato, '')
      .replace(/CRMV[^\s,;•]*/gi, '')
      .replace(/^[\s,;•\-]+|[\s,;•\-]+$/g, '')
      .trim(),
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

  let ordemSecoes = Array.isArray(bruto.ordemSecoes)
    ? bruto.ordemSecoes.map(s => String(s).trim().toUpperCase()).filter(Boolean)
    : [];

  if (ordemSecoes.length === 0) {
    ordemSecoes = [
      rotulosSecoes.data.toUpperCase(),
      rotulosSecoes.procedimento.toUpperCase(),
      rotulosSecoes.diagnostico.toUpperCase(),
      rotulosSecoes.descricao.toUpperCase(),
      rotulosSecoes.evolucao.toUpperCase()
    ];
  }

  const estiloRedacao = (bruto.estiloRedacao && typeof bruto.estiloRedacao === 'object')
    ? {
        frasePadraoAntissepsia: typeof bruto.estiloRedacao.frasePadraoAntissepsia === 'string' ? bruto.estiloRedacao.frasePadraoAntissepsia.trim() : '',
        frasePadraoEvolucao: typeof bruto.estiloRedacao.frasePadraoEvolucao === 'string' ? bruto.estiloRedacao.frasePadraoEvolucao.trim() : '',
        pessoaVerbal: sanitizeStr(bruto.estiloRedacao.pessoaVerbal, 'impessoal / 3ª pessoa'),
        detalhamentoFios: sanitizeStr(bruto.estiloRedacao.detalhamentoFios, 'detalhado por planos anatômicos')
      }
    : {
        frasePadraoAntissepsia: '',
        frasePadraoEvolucao: '',
        pessoaVerbal: 'impessoal / 3ª pessoa',
        detalhamentoFios: 'detalhado por planos anatômicos'
      };

  const vocabularioPreferido = (bruto.vocabularioPreferido && typeof bruto.vocabularioPreferido === 'object')
    ? bruto.vocabularioPreferido
    : {};

  return {
    nomeDetectado: sanitizeStr(bruto.nomeDetectado, ''),
    crmvDetectado: sanitizeStr(bruto.crmvDetectado, ''),
    clinicaDetectada: sanitizeStr(bruto.clinicaDetectada, ''),
    layoutDetectado: layout,
    templateVisual,
    ordemSecoes,
    estiloRedacao,
    vocabularioPreferido,
    observacoesEstilo: sanitizeStr(
      bruto.observacoesEstilo,
      'Relatório cirúrgico técnico e formal, descrevendo antissepsia, abordagem cirúrgica, achados, hemostasia, síntese por planos e recuperação pós-anestésica.'
    )
  };
}

/**
 * Analisa de 1 a 10 relatórios cirúrgicos em PDF e extrai o padrão visual e de redação do cirurgião.
 */
async function extrairPadraoDeCirurgias(caminhosPdfs, apiKey, opcoes = {}) {
  if (!Array.isArray(caminhosPdfs) || caminhosPdfs.length === 0) {
    throw new Error('Nenhum arquivo PDF fornecido para aprendizado de padrão cirúrgico.');
  }
  if (caminhosPdfs.length > 10) {
    throw new Error('O limite máximo é de 10 relatórios cirúrgicos em PDF por análise.');
  }
  if (!apiKey) {
    throw new Error('Chave de API do Gemini não configurada.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const promptInstrucoes = `
Você é um perito em design editorial veterinário, diagramação gráfica e análise estrutural de RELATÓRIOS CIRÚRGICOS veterinários.
Foram fornecidos ${caminhosPdfs.length} arquivo(s) PDF de relatórios cirúrgicos reais emitidos pelo mesmo médico veterinário ou clínica.

Sua tarefa é realizar a ENGENHARIA REVERSA COMPLETA do documento cirúrgico e extrair o modelo exato que este profissional utiliza, tanto na parte VISUAL E DE DIAGRAMAÇÃO quanto na parte TÉCNICA E DE REDAÇÃO CIRÚRGICA.

### 1. ENGENHARIA REVERSA DO DESIGN VISUAL (templateVisual):
- "tipoCabecalho":
  * "logo-esquerda-dados-direita" (logotipo à esquerda e dados do paciente ao lado direito)
  * "logo-centro" (logotipo centralizado no topo com dados abaixo)
  * "banner-superior" (faixa horizontal colorida no topo da folha)
  * "duas-colunas-timbrado" (papel timbrado clássico em duas colunas)
  * "sem-logo-tipografico" (cabeçalho apenas tipográfico sem imagem de logo)
- "tipoDadosPaciente":
  * "duas-colunas-limpo" (duas colunas limpas sem bordas pesadas)
  * "tabela-zebrada" (tabela formal com fundo sombreado nas células)
  * "tabela-borda-simples" (tabela com bordas finas sutis)
  * "grade-boxes" (cartões/boxes individuais)
- "tituloDocumento": Texto EXATO do título principal (ex: "RELATÓRIO CIRÚRGICO", "DESCRIÇÃO CIRÚRGICA", "FICHA CIRÚRGICA").
- "subtituloDocumento": Subtítulo opcional abaixo do título (ou vazio se não houver).
- "alinhamentoTitulo": "center" ou "left".
- "decoracaoTitulo": "nenhuma", "faixa-colorida" ou "borda-inferior".
- "estiloSecoes":
  * "negrito-inline" (rótulo em negrito na mesma linha: "PROCEDIMENTO: ...")
  * "barra-lateral" (barra vertical colorida à esquerda do título de cada seção)
  * "tarja-colorida" (faixa sólida colorida para cada título de seção)
  * "sublinhado" (título em caixa alta com linha inferior)
- "rotuloResponsavel": "Responsável" (preferencial se o documento usar Responsável ou se for neutro) ou "Tutor" (apenas se o documento explicitamente usa "Tutor").
- "rotulosSecoes": Objeto com os rótulos exatos usados no documento para:
  * "data" (ex: "DATA DO PROCEDIMENTO CIRÚRGICO")
  * "procedimento" (ex: "PROCEDIMENTO")
  * "diagnostico" (ex: "DIAGNÓSTICO PRÉ-CIRÚRGICO")
  * "descricao" (ex: "DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO")
  * "evolucao" (ex: "EVOLUÇÃO E CONSIDERAÇÕES")
- "tituloRegistroFotografico": Título usado na página de fotos intraoperatórias (se houver; senão "REGISTRO FOTOGRÁFICO INTRAOPERATÓRIO").
- "legendaPadraoFoto": Padrão de texto usado abaixo das fotos (ex: "Registro fotográfico intraoperatório / peça cirúrgica").
- "posicaoAssinatura": "centro", "direita" ou "esquerda".
- "linhaAssinatura": true ou false.
- "textoAvisoLegal": Nota legal / aviso no rodapé (vazio se não houver).
- "rodapeContato": Endereço, telefone, WhatsApp, Instagram ou e-mail (NUNCA inclua CRMV nem nome do médico aqui).
- "corPrimaria", "corSecundaria", "corFundoBlocos", "corBordaTabelas": cores em hexadecimal.
- "fontFamily", "fontSizeBody", "fontSizeTitulo", "marginTop", "marginBottom", "marginLeft", "marginRight", "lineHeight", "paragraphSpacing".

### 2. IDENTIFICAÇÃO PROFISSIONAL:
- "nomeDetectado": Nome completo do cirurgião veterinário.
- "crmvDetectado": Registro CRMV com estado.
- "clinicaDetectada": Nome do hospital ou clínica veterinária.

### 3. ESTILO DE REDAÇÃO CIRÚRGICA:
- "ordemSecoes": Lista ordenada dos títulos de seção presentes no relatório.
- "estiloRedacao":
  * "frasePadraoAntissepsia": Como o cirurgião costuma descrever preparo, posicionamento e antissepsia inicial.
  * "frasePadraoEvolucao": Como costuma descrever a evolução pós-anestésica e considerações finais.
  * "pessoaVerbal": Ex: "impessoal / 3ª pessoa" ou "1ª pessoa do singular".
  * "detalhamentoFios": Ex: "cita calibre, material do fio e padrão de sutura por plano".
- "vocabularioPreferido": Dicionário de termos cirúrgicos característicos do profissional.
- "observacoesEstilo": 2 a 4 frases direcionando a IA sobre tom de voz, estrutura de parágrafos e nível de detalhamento.

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO (sem markdown, sem comentários):
{
  "nomeDetectado": "string",
  "crmvDetectado": "string",
  "clinicaDetectada": "string",
  "templateVisual": {
    "tipoCabecalho": "logo-esquerda-dados-direita",
    "tipoDadosPaciente": "duas-colunas-limpo",
    "tituloDocumento": "RELATÓRIO CIRÚRGICO",
    "subtituloDocumento": "",
    "alinhamentoTitulo": "center",
    "decoracaoTitulo": "nenhuma",
    "estiloSecoes": "negrito-inline",
    "rotuloResponsavel": "Responsável",
    "rotulosSecoes": {
      "data": "DATA DO PROCEDIMENTO CIRÚRGICO",
      "procedimento": "PROCEDIMENTO",
      "diagnostico": "DIAGNÓSTICO PRÉ-CIRÚRGICO",
      "descricao": "DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO",
      "evolucao": "EVOLUÇÃO E CONSIDERAÇÕES"
    },
    "tituloRegistroFotografico": "REGISTRO FOTOGRÁFICO INTRAOPERATÓRIO",
    "legendaPadraoFoto": "Registro fotográfico intraoperatório / peça cirúrgica",
    "posicaoAssinatura": "centro",
    "linhaAssinatura": false,
    "textoAvisoLegal": "",
    "rodapeContato": "",
    "corPrimaria": "#1B365D",
    "corSecundaria": "#4A777A",
    "corFundoBlocos": "#F8FAFC",
    "corBordaTabelas": "#E2E8F0",
    "fontFamily": "Calibri, sans-serif",
    "fontSizeBody": "11pt",
    "fontSizeTitulo": "13.5pt",
    "marginTop": "18mm",
    "marginBottom": "18mm",
    "marginLeft": "20mm",
    "marginRight": "20mm",
    "lineHeight": "1.35",
    "paragraphSpacing": "8pt"
  },
  "ordemSecoes": ["DATA DO PROCEDIMENTO CIRÚRGICO", "PROCEDIMENTO", "DIAGNÓSTICO PRÉ-CIRÚRGICO", "DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO", "EVOLUÇÃO E CONSIDERAÇÕES"],
  "estiloRedacao": {
    "frasePadraoAntissepsia": "string",
    "frasePadraoEvolucao": "string",
    "pessoaVerbal": "impessoal / 3ª pessoa",
    "detalhamentoFios": "detalhado por planos anatômicos"
  },
  "vocabularioPreferido": {},
  "observacoesEstilo": "string"
}
`;

  const pdfParts = caminhosPdfs.map(caminho => pdfToGenerativePart(caminho));
  const paidApiKey = opcoes.paidApiKey || process.env.GEMINI_API_KEY_PAID || process.env.GEMINI_PAID_API_KEY;
  let ultimoErro = null;

  const tentarComChave = async (chave, modelos, label) => {
    const client = new GoogleGenerativeAI(chave);
    for (const modeloNome of modelos) {
      try {
        console.log(`🔪 [APRENDER PADRÃO CIRÚRGICO${label}] Analisando ${caminhosPdfs.length} PDF(s) com ${modeloNome}...`);
        const model = client.getGenerativeModel({ model: modeloNome });
        const resultado = await model.generateContent([promptInstrucoes, ...pdfParts]);
        const textoResposta = resultado.response.text().trim();
        const jsonLimpo = textoResposta.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        const jsonMatch = jsonLimpo.match(/\{[\s\S]*\}/);
        const jsonParsed = JSON.parse(jsonMatch ? jsonMatch[0] : jsonLimpo);
        const perfilSanitizado = sanitizarPerfilCirurgicoExtraido(jsonParsed);

        const amostrasInfo = caminhosPdfs.map(f => ({
          nome: path.basename(f),
          tamanho: fs.existsSync(f) ? fs.statSync(f).size : 0,
          enviadoEm: new Date().toISOString()
        }));

        return {
          sucesso: true,
          modeloUtilizado: `${modeloNome}${label ? ' ' + label.trim() : ''}`,
          amostras: amostrasInfo,
          quantidadeAmostras: caminhosPdfs.length,
          ...perfilSanitizado
        };
      } catch (err) {
        console.warn(`⚠️ [APRENDER PADRÃO CIRÚRGICO] Falha com ${modeloNome}: ${err.message}`);
        ultimoErro = err;
        await new Promise(r => setTimeout(r, 800));
      }
    }
    return null;
  };

  const resFree = await tentarComChave(apiKey, MODELOS_CANDIDATOS, '');
  if (resFree) return resFree;

  if (paidApiKey && paidApiKey !== apiKey) {
    const resPaid = await tentarComChave(paidApiKey, MODELOS_CANDIDATOS, ' (chave paga)');
    if (resPaid) return resPaid;
  }

  throw new Error(`Falha ao sintetizar padrão cirúrgico dos PDFs: ${ultimoErro?.message || 'Erro desconhecido'}`);
}

module.exports = {
  extrairPadraoDeCirurgias,
  sanitizarPerfilCirurgicoExtraido,
  MODELOS_CANDIDATOS
};

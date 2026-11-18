const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { obterLayout } = require('./gerenciador_layout');

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType
    }
  };
}

function sanitizarDadosPaciente(paciente, nomeClinica = '') {
  if (!paciente || typeof paciente !== 'object') {
    return {
      nome: 'Não identificado',
      tutor: 'Não informado',
      especie: 'Canina',
      sexo: 'Não informado',
      idade: 'Não informada',
      data: new Date().toLocaleDateString('pt-BR')
    };
  }

  let nome = String(paciente.nome || '').trim();
  let tutor = String(paciente.tutor || '').trim();

  const regexTermosClinica = /(upa\s*pet|cl[íi]nica|hospital|veterin[áa]ri[ao]|contagem|betim|barreiro|unidade|centro\s*vet)/i;
  const ehClinica = (str) => {
    if (!str) return false;
    if (regexTermosClinica.test(str)) return true;
    if (nomeClinica && str.toLowerCase().includes(nomeClinica.toLowerCase())) return true;
    return false;
  };

  // Se o tutor capturado foi o nome de hospital/clínica, anula
  if (ehClinica(tutor)) {
    tutor = '';
  }

  // No aparelho Mindray, operadores frequentemente preenchem o campo "Name" com:
  // "LUA, NILDA", "LUA / NILDA", "LUA - NILDA" (onde LUA é o animal e NILDA é a tutora)
  const matchSeparador = nome.match(/^([^,/-]+)\s*[,/-]\s*(.+)$/);
  if (matchSeparador) {
    const parteAnimal = matchSeparador[1].trim();
    const parteTutor = matchSeparador[2].trim();

    // Evita falsos positivos se a segunda parte for apenas indicação de espécie, sexo ou raça
    const regexNaoTutor = /^(canin[ao]|felin[ao]|macho|femea|fêmea|sr[de]|poodle|pitbull|shih\s*tzu|yorkshire)$/i;
    if (!regexNaoTutor.test(parteTutor)) {
      if (!tutor || tutor.toLowerCase() === 'não informado' || ehClinica(tutor)) {
        tutor = parteTutor;
      }
      nome = parteAnimal;
    }
  }

  return {
    ...paciente,
    nome: nome || 'Não identificado',
    tutor: tutor || 'Não informado',
    especie: paciente.especie || 'Canina',
    sexo: paciente.sexo || 'Não informado',
    idade: paciente.idade || 'Não informada',
    data: paciente.data || new Date().toLocaleDateString('pt-BR')
  };
}

/**
 * Constrói o prompt customizado de forma 100% agnóstica quando o médico veterinário
 * possui um estilo clonado de PDFs, garantindo que a ordem, a capitalização,
 * as listas com traços ("- "), observações ("Obs.:") e frases padrão sigam fielmente o médico.
 */
function construirPromptClonado(estiloClinico, nomeClinica, identificacaoProfissional) {
  const orgaos = Array.isArray(estiloClinico?.sequenciaOrgaos) ? estiloClinico.sequenciaOrgaos : [];
  const listaOrgaosInstrucao = orgaos.map((o, idx) => {
    let linha = `${idx + 1}. "${o.orgao}": Frase padrão quando normal -> ${JSON.stringify(o.textoPadraoNormal || '')}`;
    if (o.textoQuandoNaoVisualizada) {
      linha += ` | Quando não visualizado -> ${JSON.stringify(o.textoQuandoNaoVisualizada)}`;
    }
    return linha;
  }).join('\n   ');

  const regraSubitens = estiloClinico?.usarSubitensComTraco
    ? `- PRESERVE AS QUEBRAS DE LINHA E OS TRAÇOS ("\\n- "): nos órgãos cujo modelo padrão usa sub-itens com traço (como ADRENAIS com "\\n- Adrenal esquerda..." e "\\n- Adrenal direita...", ou INTESTINOS com "\\n- Duodeno:...", "\\n- Jejuno:...", "\\n- Íleo:...", "\\n- Cólon..."), mantenha EXATAMENTE esse formato de múltiplas linhas iniciadas por "\\n- " dentro do campo "texto" do JSON.`
    : '';

  const regraObsItalico = estiloClinico?.usarObsItalico
    ? `- Se o texto padrão de um órgão (como ESTÔMAGO) terminar com uma linha "\\nObs.: ...", mantenha essa linha "\\nObs.: ..." ao final do texto quando aplicável.`
    : '';

  const regraDiagDif = estiloClinico?.usarDiagDifSeparado === false
    ? `- NÃO utilize o campo "diagDif" (retorne sempre "diagDif": "").
   - NÃO escreva "DIAG DIF.:" no texto.
   - Quando houver achados patológicos importantes ou suspeitas diagnósticas (ex: piometra, mucometra, lama biliar, pseudociese, cistite, nefropatia), descreva o achado diretamente no órgão correspondente com a mesma linguagem clínica do médico ("compatível com...", "sugestivo de...").`
    : `- Quando o órgão estiver alterado, preencha o campo "diagDif" com os diagnósticos diferenciais em CAIXA ALTA (sem repetir o prefixo "DIAG DIF.:" dentro de "texto").`;

  const regraSexo = estiloClinico?.omitirOrgaosSexoOposto !== false
    ? `- NUNCA inclua órgãos do sexo oposto (se o paciente for Fêmea, JAMAIS inclua "Próstata"/"PRÓSTATA" ou "Testículos"/"TESTÍCULOS", substituindo pelos órgãos reprodutivos femininos no mesmo estilo do médico; se for Macho, JAMAIS inclua "Útero" ou "Ovários").`
    : '';

  return `
Você é um médico veterinário especialista em diagnóstico por imagem (ultrassonografia abdominal de cães e gatos).
Sua missão é realizar a análise técnica das imagens de ultrassom fornecidas e redigir o laudo reproduzindo FIELMENTE o estilo de escrita, a capitalização dos órgãos, a formatação de sub-itens e as frases padrão de ${nomeClinica} (${identificacaoProfissional}).

---

### REGRAS OBRIGATÓRIAS DO ESTILO EXTRAÍDO DO MÉDICO:

1. DADOS DO PACIENTE (EXTRAÇÃO DO CABEÇALHO DO APARELHO):
   - Extraia Nome, Tutor/Proprietário, Sexo, Data, Idade, Espécie e Raça (se constar na tela, ex: "pncher" -> "Pinscher", senão "SRD").
   - Se o veterinário requisitante constar na imagem ou metadados, preencha "requisitante", senão deixe "".

2. SEQUÊNCIA EXATA, CAPITALIZAÇÃO E FRASES PADRÃO DOS ÓRGÃOS:
   Você DEVE utilizar exatamente os nomes de órgãos abaixo (respeitando maiúsculas/minúsculas exatas) e seguir estas frases base substituindo apenas as medidas lidas nos calipers ("Dist X.XX cm" / "1 L X.XX cm") e descrevendo alterações reais visíveis nas imagens:
   ${listaOrgaosInstrucao}

3. FORMATAÇÃO ESTRUTURAL, CONCLUSÃO E SEXO:
   ${regraSubitens}
   ${regraObsItalico}
   ${regraDiagDif}
   ${regraSexo}
`;
}

function construirPromptPadraoVetaro(nomeClinica, identificacaoProfissional) {
  return `
Você é um médico veterinário especialista em diagnóstico por imagem (ultrassonografia abdominal de cães e gatos).
Sua missão é realizar a pré-análise técnica minuciosa das imagens de ultrassom fornecidas e estruturar os dados no Padrão Vetaro (${nomeClinica} - ${identificacaoProfissional}).

---

### REGRAS CLÍNICAS E CRITÉRIOS OBRIGATÓRIOS:

1. DADOS DO PACIENTE:
   - Extraia Nome, Tutor, Sexo, Data, Idade e Raça diretamente do cabeçalho na tela do aparelho.
   - Para espécie: deduza por comprimento renal e espessuras (rins de ~3,0 a 3,8 cm costumam ser felinos ou caninos de pequeno porte; rins > 4,5 cm são caninos médios/grandes).

2. ORDEM ESTRITA DOS ÓRGÃOS NO LAUDO:
   O laudo DEVE conter os órgãos na seguinte ordem exata:
   - BEXIGA
   - RIM ESQUERDO
   - RIM DIREITO
   - BAÇO
   - ESTOMAGO
   - FÍGADO
   - VESICULA BILIAR
   - ALÇAS INTESTINAIS
   - Se Fêmea: OVÁRIOS (unificado em tópico único com medidas de OE e OD), ÚTERO (ou histórico de ovariosalpingohisterectomia). JAMAIS inclua PRÓSTATA em fêmeas.
   - Se Macho: TESTICULO ESQUERDO, TESTICULO DIREITO, PROSTATA (ou histórico de orquiectomia)
   - GLANDULA ADRENAL
   - PANCREAS
   - CAVIDADE ABDOMINAL
   - CONSIDERAÇÕES

3. CRITÉRIOS ESPECÍFICOS POR ÓRGÃO:
- BEXIGA: Começar com "Em topografia habitual com formato preservado e repleção liquida [pouca / adequada / cheia]...".
- RIM ESQUERDO e RIM DIREITO: "Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose."
- BAÇO: "Localizado em topografia habitual, com contornos regulares, bem definidos, com dimensões preservadas..."
- ESTOMAGO: "Localizado em topografia habitual, paredes [normoespessas / espessadas], medindo X,XX cm, mucosas com pregueamento usual..."
- FÍGADO: "Localizado em topografia habitual, apresenta-se, na porção visível, com dimensões aparentemente preservadas e contornos regulares..."
- VESICULA BILIAR: "Paredes normoespessas, margem interna regular, conteúdo homogêneo e anecogênico límpido."
- ALÇAS INTESTINAIS: "Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (X,XX cm), jejuno (X,XX cm) e colon descendente (X,XX cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em colon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total."
- GLANDULA ADRENAL: Se visibilizadas, informar medidas de AE e AD; se não visibilizadas, "Não visualizadas."
- PANCREAS: "Sem alteração em topografia de pâncreas."
- CAVIDADE ABDOMINAL: "Ausência de liquido livre, sem alterações evidentes em linfonodos abdominais."
- CONSIDERAÇÕES: "Sugere-se acompanhamento ultrassonográfico das alterações visibilizadas. Associar a exames complementares."
- IMPORTANTE: Não escreva "DIAG DIF.:" dentro de "texto"; coloque os diagnósticos diferenciais exclusivamente na propriedade "diagDif" do objeto JSON.
`;
}

async function analisarExameComIA(caminhoImagens, apiKey, opcoes = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelosCandidatos = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

  const usuario = opcoes.usuario || null;
  let layout = opcoes.layout || null;
  if (!layout && usuario?.id) {
    try {
      layout = await obterLayout(usuario.id);
    } catch (_) {}
  }

  const nomeClinica = usuario?.nomeClinica || 'Vetaro';
  const identificacaoProfissional = usuario?.nome
    ? `${usuario.nome}${usuario.crmv ? ' - ' + usuario.crmv : ''}`
    : 'Médico(a) Veterinário(a)';

  const ordemOrgaos = opcoes.ordemOrgaos ||
    opcoes.perfilLaudo?.ordemOrgaos ||
    (Array.isArray(layout?.writing_style_json?.sequenciaOrgaos) ? layout.writing_style_json.sequenciaOrgaos.map(o => o.orgao) : null) ||
    [];

  const usarEstiloClonado = Boolean(
    layout &&
    layout.modo_template === 'clonado_pdf' &&
    layout.writing_style_json &&
    Array.isArray(layout.writing_style_json.sequenciaOrgaos)
  );

  const blocoRegras = usarEstiloClonado
    ? construirPromptClonado(layout.writing_style_json, nomeClinica, identificacaoProfissional)
    : construirPromptPadraoVetaro(nomeClinica, identificacaoProfissional);

  const promptInstrucoes = `${blocoRegras}

---

ORDENAÇÃO CANÔNICA DAS IMAGENS:
Você DEVE identificar a sigla/órgão no canto superior de CADA uma das imagens enviadas.
A lista de imagens foi fornecida com índices de 0 a N-1.
Para CADA imagem (pelo seu índice 0 a N-1), preencha o array "classificacaoImagens" indicando:
- "indice": número de 0 a N-1 correspondente à imagem enviada.
- "nomeArquivo": nome do arquivo da imagem.
- "sigla": sigla identificada na tela (ex: BEX, RE, RD, BACO, EST, FIG, VB, DUO, JJ, CD, OE, OD, UTERO, CUE, CUD, etc.).
- "orgao": nome do órgão.
- "prioridade": número de 1 a 20 correspondente à ordem canônica estrita:
  1: BEXIGA e variações (BEX, SED, UROLITO)
  2: RIM ESQUERDO (RE)
  3: RIM DIREITO (RD)
  4: BAÇO e variações (BACO, B)
  5: ESTOMAGO (EST)
  6: FIGADO (FIG)
  7: VESICULA BILIAR (VB)
  8: DUODENO (DUO)
  9: JEJUNO (JJ)
  10: COLON DESCENDENTE (CD)
  11: OVÁRIO ESQUERDO (OE, TOP OE)
  12: OVÁRIO DIREITO (OD, TOP OD)
  13: UTERO (UTERO, CUE, CUD)
  14: TESTICULO ESQUERDO (TE)
  15: TESTICULO DIREITO (TD)
  16: PROSTATA (PTT, PROST)
  17: ADRENAL ESQUERDA (AE)
  18: ADRENAL DIREITA (AD)
  19: PANCREAS (PANC)
  20: LIQUIDO LIVRE (LL)

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO (sem blocos markdown e sem comentários):
{
  "paciente": {
    "nome": "string",
    "especie": "Canina ou Felina",
    "raca": "string ou 'SRD'",
    "idade": "string ou 'Não informada'",
    "tutor": "string",
    "requisitante": "string",
    "sexo": "Macho ou Fêmea",
    "data": "DD/MM/AAAA"
  },
  "laudo": [
    {
      "orgao": "Nome do Órgão",
      "texto": "Descrição técnica...",
      "diagDif": "DIAGNÓSTICOS DIFERENCIAIS EM CAIXA ALTA (ou vazio se normal ou se o médico não usar DIAG DIF.)"
    }
  ],
  "classificacaoImagens": [
    {
      "indice": 0,
      "nomeArquivo": "nome_do_arquivo.jpeg",
      "sigla": "BEX",
      "orgao": "BEXIGA",
      "prioridade": 1
    }
  ],
  "nomesArquivosOrdenados": [
    "lista dos nomes de arquivos exatamente na ordem canonica 1 a 20..."
  ]
}
`;

  const listaArquivosTexto = caminhoImagens.map((p, idx) => `[Imagem ${idx}]: ${path.basename(p)}`).join('\n');
  const promptFinal = promptInstrucoes + `\n\nLISTA DE IMAGENS ENVIADAS:\n${listaArquivosTexto}\n`;

  const imageParts = caminhoImagens.map(p => {
    const ext = path.extname(p).toLowerCase();
    const mime = (ext === '.png') ? 'image/png' : 'image/jpeg';
    return fileToGenerativePart(p, mime);
  });

  let ultimoErro = null;
  const paidApiKey = opcoes.paidApiKey || process.env.GEMINI_API_KEY_PAID || process.env.GEMINI_PAID_API_KEY;

  // FASE 1: Chave Principal / Free Tier
  for (const nomeModelo of modelosCandidatos) {
    try {
      console.log(`🤖 Chamando modelo ${nomeModelo}...`);
      const model = genAI.getGenerativeModel({ model: nomeModelo });
      const result = await model.generateContent([promptFinal, ...imageParts]);
      const responseText = result.response.text().trim();

      const jsonClean = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const jsonParsed = JSON.parse(jsonClean);

      jsonParsed.paciente = sanitizarDadosPaciente(jsonParsed.paciente, nomeClinica);

      const mapaPrioridadesEfetivo = construirMapaPrioridades(ordemOrgaos);

      jsonParsed.caminhosOrdenados = ordenarImagensCanonicamente(
        caminhoImagens,
        jsonParsed.classificacaoImagens,
        jsonParsed.nomesArquivosOrdenados,
        mapaPrioridadesEfetivo
      );

      return jsonParsed;
    } catch (err) {
      console.warn(`⚠️ Tentativa com ${nomeModelo} (chave free) falhou: ${err.message}.`);
      ultimoErro = err;
      await new Promise(res => setTimeout(res, 1200));
    }
  }

  // FASE 2: Fallback para a Chave Paga (se configurada)
  if (paidApiKey && paidApiKey !== apiKey) {
    console.log(`💳 [ANALISADOR IA] Chave principal/free esgotada ou indisponível. Acionando fallback para CHAVE PAGA...`);
    const genAIPaid = new GoogleGenerativeAI(paidApiKey);
    const modelosPagos = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const nomeModeloPago of modelosPagos) {
      try {
        console.log(`💎 [ANALISADOR IA - CHAVE PAGA] Chamando modelo prioritário ${nomeModeloPago}...`);
        const model = genAIPaid.getGenerativeModel({ model: nomeModeloPago });
        const result = await model.generateContent([promptFinal, ...imageParts]);
        const responseText = result.response.text().trim();

        const jsonClean = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const jsonParsed = JSON.parse(jsonClean);

        jsonParsed.paciente = sanitizarDadosPaciente(jsonParsed.paciente, nomeClinica);

        const mapaPrioridadesEfetivo = construirMapaPrioridades(ordemOrgaos);

        jsonParsed.caminhosOrdenados = ordenarImagensCanonicamente(
          caminhoImagens,
          jsonParsed.classificacaoImagens,
          jsonParsed.nomesArquivosOrdenados,
          mapaPrioridadesEfetivo
        );

        return jsonParsed;
      } catch (errPago) {
        console.warn(`⚠️ [ANALISADOR IA] Falha no fallback pago com ${nomeModeloPago}: ${errPago.message}.`);
        ultimoErro = errPago;
        await new Promise(res => setTimeout(res, 1200));
      }
    }
  }

  throw ultimoErro;
}

const MAPA_ORDEM_CANONICA = {
  'BEX': 1, 'BEXIGA': 1, 'SED': 1, 'SEDIMENTO': 1, 'UROLITO': 1, 'CALC': 1, 'CALCULO': 1, 'URETER': 1,
  'RE': 2, 'RIM ESQUERDO': 2, 'RIME': 2, 'RIM E': 2, 'R.E': 2,
  'RD': 3, 'RIM DIREITO': 3, 'RIMD': 3, 'RIM D': 3, 'R.D': 3,
  'BACO': 4, 'BAÇO': 4, 'B': 4, 'ESPLEN': 4, 'ESPLENO': 4,
  'EST': 5, 'ESTOMAGO': 5, 'ESTÔMAGO': 5,
  'FIG': 6, 'FIGADO': 6, 'FÍGADO': 6, 'HEP': 6,
  'VB': 7, 'VESICULA BILIAR': 7, 'VESÍCULA BILIAR': 7, 'VESICULA': 7, 'VESÍCULA': 7,
  'DUO': 8, 'DUODENO': 8,
  'JJ': 9, 'JEJUNO': 9,
  'CD': 10, 'COLON': 10, 'CÓLON': 10, 'COLON DESCENDENTE': 10, 'CÓLON DESCENDENTE': 10,
  'OE': 11, 'OVARIO ESQUERDO': 11, 'OVÁRIO ESQUERDO': 11, 'TOP OE': 11,
  'OD': 12, 'OVARIO DIREITO': 12, 'OVÁRIO DIREITO': 12, 'TOP OD': 12,
  'UTERO': 13, 'ÚTERO': 13, 'CUE': 13, 'CUD': 13, 'CORPO UTERINO': 13,
  'TE': 14, 'TESTICULO ESQUERDO': 14, 'TESTÍCULO ESQUERDO': 14,
  'TD': 15, 'TESTICULO DIREITO': 15, 'TESTÍCULO DIREITO': 15,
  'PTT': 16, 'PROSTATA': 16, 'PRÓSTATA': 16, 'PROST': 16,
  'AE': 17, 'ADRENAL ESQUERDA': 17, 'ADRE': 17,
  'AD': 18, 'ADRENAL DIREITA': 18, 'ADRD': 18,
  'PANC': 19, 'PANCREAS': 19, 'PÂNCREAS': 19,
  'LL': 20, 'LIQUIDO LIVRE': 20, 'LÍQUIDO LIVRE': 20, 'CAVIDADE': 20
};

function normalizarTexto(texto) {
  return (texto || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function construirMapaPrioridades(ordemOrgaos = []) {
  if (!Array.isArray(ordemOrgaos) || ordemOrgaos.length === 0) {
    return MAPA_ORDEM_CANONICA;
  }
  const novoMapa = { ...MAPA_ORDEM_CANONICA };
  ordemOrgaos.forEach((org, idx) => {
    const prioridade = idx + 1;
    const orgNorm = normalizarTexto(org);
    novoMapa[orgNorm] = prioridade;
    for (const [chave] of Object.entries(MAPA_ORDEM_CANONICA)) {
      const k = normalizarTexto(chave);
      if (orgNorm.includes(k) || k.includes(orgNorm)) {
        novoMapa[chave] = prioridade;
      }
    }
  });
  return novoMapa;
}

function calcularPrioridadeOrgao(item, mapa = MAPA_ORDEM_CANONICA) {
  if (item && typeof item.prioridade === 'number' && item.prioridade >= 1 && item.prioridade <= 20) {
    return item.prioridade;
  }
  const sigla = normalizarTexto(item ? item.sigla : '');
  const orgao = normalizarTexto(item ? item.orgao : '');
  if (mapa[sigla]) return mapa[sigla];
  if (mapa[orgao]) return mapa[orgao];
  for (const [chave, p] of Object.entries(mapa)) {
    const k = normalizarTexto(chave);
    if (sigla.includes(k) || orgao.includes(k)) return p;
  }
  return 99;
}

function ordenarImagensCanonicamente(caminhoImagens, classificacaoImagens, nomesArquivosOrdenados, mapaPrioridades = MAPA_ORDEM_CANONICA) {
  if (!Array.isArray(caminhoImagens) || caminhoImagens.length === 0) return [];

  const mapa = mapaPrioridades || MAPA_ORDEM_CANONICA;

  const itens = caminhoImagens.map((caminho, idx) => {
    const nomeBase = path.basename(caminho).toLowerCase();
    let classif = null;

    if (Array.isArray(classificacaoImagens)) {
      classif = classificacaoImagens.find(c => c.indice === idx) ||
                classificacaoImagens.find(c => c.nomeArquivo && c.nomeArquivo.toLowerCase() === nomeBase);
    }

    let prioridade = calcularPrioridadeOrgao(classif, mapa);

    if (prioridade === 99) {
      prioridade = calcularPrioridadeOrgao({ orgao: path.parse(nomeBase).name }, mapa);
    }

    if (prioridade === 99 && Array.isArray(nomesArquivosOrdenados)) {
      const pos = nomesArquivosOrdenados.findIndex(n => typeof n === 'string' && n.toLowerCase() === nomeBase);
      if (pos !== -1) {
        prioridade = 50 + pos;
      }
    }

    return { caminho, idx, prioridade, classif };
  });

  itens.sort((a, b) => {
    if (a.prioridade !== b.prioridade) {
      return a.prioridade - b.prioridade;
    }
    return a.idx - b.idx;
  });

  return itens.map(i => i.caminho);
}

module.exports = {
  analisarExameComIA,
  construirPromptClonado,
  construirPromptPadraoVetaro,
  ordenarImagensCanonicamente,
  construirMapaPrioridades,
  sanitizarDadosPaciente,
  MAPA_ORDEM_CANONICA
};

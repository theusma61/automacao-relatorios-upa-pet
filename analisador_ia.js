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
 * Guia clínico universal de semiologia ultrassonográfica e diagnósticos diferenciais
 * em pequenos animais (cães e gatos), garantindo interpretação visual rigorosa
 * além da simples leitura de calipers.
 */
function obterGuiaSemiologiaUltrassom() {
  return `
---

### GUIA CLÍNICO DE SEMIOLOGIA ULTRASSONOGRÁFICA E DIAGNÓSTICOS DIFERENCIAIS (CRITÉRIOS OBRIGATÓRIOS):

1. BAÇO E ESPLENOMEGALIA (AVALIAÇÃO QUALITATIVA E TOPOGRÁFICA):
   - ATENÇÃO: Na rotina ultrassonográfica veterinária, o baço NÃO possui mensuração métrica padrão única (calipers na tela). A esplenomegalia é diagnosticada VISUALMENTE por relações topográficas e bordos.
   - Janela Baço x Rim Esquerdo (imagens com anotação "B" e "R", ou imagem com "BACO"):
     * Se o parênquima da extremidade caudal do baço se estender caudalmente ultrapassando o polo cranial do rim esquerdo, ou se apresentar bordos abaulados/arredondados:
       -> Laudar OBRIGATORIAMENTE: "Localizado em topografia habitual, com contornos regulares e bem definidos, com dimensões aumentadas, estendendo-se caudalmente e ultrapassando o polo cranial do rim esquerdo, parênquima com ecogenicidade usual e ecotextura homogênea."
       -> Inserir na propriedade "diagDif": "PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES" (se ecotextura homogênea usual); ou "ESPLENOMEGALIA DIFUSA, HEMATOPOIESE EXTRAMEDULAR, HIPERPLASIA LINFOIDE DIFUSA, INFILTRAÇÃO NEOPLÁSICA (LINFOMA)" (se ecotextura heterogênea/rendilhada).
     * Somente laudar "dimensões preservadas" (diagDif: "") se o baço nitidamente não ultrapassar o polo cranial do rim esquerdo e mantiver bordos afilados.

2. RINS (RIM ESQUERDO E RIM DIREITO) - DIFERENCIAÇÃO CÓRTICO-MEDULAR E PATOLOGIAS:
   - Extraia as medidas nos calipers ("RE" e "RD").
   - Inspecione a diferenciação córtico-medular e a ecogenicidade cortical:
     * Se houver perda da nitidez ou contraste entre o córtex e as pirâmides medulares (ou hiperecogenicidade difusa do córtex):
       -> Descrever: "Observa-se perda da diferenciação córticomedular."
       -> diagDif: "NEFROPATIA CRÔNICA, NEFROTOXICIDADE, PROCESSO INFLAMATÓRIO/ INFECCIOSO OU INFILTRATIVO".
     * Se ecogenicidade cortical aumentada com diferenciação mantida:
       -> diagDif: "NEFROPATIA AGUDA, PROCESSOS TÓXICOS, GLOMERULONEFRITE".
     * Se cálculo com sombra acústica posterior limpa:
       -> diagDif: "NEFROLITÍASE, UROLÍTIASE".
     * Se dilatação anecogênica da pelve/divertículos:
       -> diagDif: "HIDRONEFROSE, OBSTRUÇÃO URETERAL".

3. FÍGADO E HEPATOMEGALIA:
   - Avaliar dimensões pela projeção dos bordos hepáticos em relação ao gradil costal e estômago:
     * Se o bordo hepático ultrapassar o gradil costal ou apresentar margens arredondadas:
       -> Descrever: "dimensões aumentadas, ultrapassando o bordo costal e contornos regulares [ou arredondados]".
     * Ecogenicidade do parênquima:
       - Se aumentada/hiperecogênica (parênquima mais brilhante que o córtex renal):
         -> diagDif: "HEPATOPATIA REACIONAL, LIPIDOSE HEPÁTICA, HEPATITE, FIBROSE, INFILTRADO GORDUROSO".
       - Se diminuída/hipoecogênica difusa:
         -> diagDif: "HEPATITE AGUDA, CONGESTÃO HEPÁTICA".
       - Se heterogênea ou com nódulos:
         -> Descrever dimensões e diagDif: "HEPATOPATIA CRÔNICA, HIPERPLASIA NODULAR, PROCESSO NEOPLÁSICO".

4. BEXIGA - ESPESSURA PARIETAL, SEDIMENTOS E URÓLITOS:
   - Critérios métricos de espessura de parede:
     * Cães: normal até 0,25 cm. Acima de 0,25 cm -> "paredes espessadas, com margens internas irregulares".
     * Gatos: normal 0,13 a 0,15 cm. Acima de 0,15 cm -> "paredes espessadas, com margens internas irregulares".
   - Conteúdo luminal:
     * Imagens marcadas como "UROLITOS", "CALC", "SED" ou visualização de focos hiperecogênicos com forte sombra acústica posterior:
       -> Extrair as medidas de TODOS os calipers na bexiga (ex: "medindo cerca de 0,59 cm, 0,69 cm e 0,74 cm, acompanhados de sombra acústica distal").
       -> diagDif: "SEDIMENTOS ASSOCIADOS A URÓLITOS URINÁRIOS" ou "UROLÍTIASE, CISTITE".
     * Se apenas espessamento de parede sem cálculos: diagDif: "CISTITE".

5. ESTÔMAGO:
   - Parede: normal até 0,50 cm em cães e 0,36 cm em gatos. Se superior -> "paredes espessadas, medindo X,XX cm" com diagDif: "GASTRITE (AGUDA / CRÔNICA), ENTEROPATIA INFLAMATÓRIA, ULCERAÇÃO GÁSTRICA, PROCESSO NEOPLÁSICO INFILTRATIVO".
   - Descrever pregueamento mucoso e presença de gás/conteúdo fluido.

6. VESÍCULA BILIAR:
   - Parede: normal até 0,10 cm. Se > 0,10 cm -> paredes espessadas ("COLECISTITE").
   - Conteúdo:
     * Se sedimento ecogênico móvel em região dependente -> diagDif: "LAMA BILIAR, ESTASE BILIAR, COLANGITE".
     * Se padrão estrelado/septado em roda de carroça imóvel -> diagDif: "MUCOCELE BILIAR".
     * Se cálculos com sombra acústica -> diagDif: "COLELITÍASE, COLECISTITE".

7. ALÇAS INTESTINAIS:
   - Extrair medidas dos calipers nas imagens DUO (duodeno: normal até 0,35 cm), JJ (jejuno: normal até 0,25 cm) e CD (cólon: normal até 0,15 cm).
   - Avaliar motilidade e preservação da estratificação parietal em 5 camadas.

8. GLÂNDULAS ADRENAIS:
   - Extrair as 3 medidas de AE e AD quando visíveis (polo cranial, polo caudal e comprimento). Se formato preservado -> dimensões preservadas. Se aumento nodular assimétrico -> diagDif: "HIPERADRENOCORTICISMO, NEOPLASIA ADRENAL".

9. CAVIDADE ABDOMINAL:
   - Se houver acúmulo de líquido anecogênico interalças (efusão) -> descrever presença de líquido livre e atribuir diagDif: "EFUSÃO PERITONEAL / ASCITE". Se ausente -> "Ausência de liquido livre, sem alterações evidentes em linfonodos abdominais."
`;
}

/**
 * Constrói o prompt customizado de forma 100% agnóstica quando o médico veterinário
 * possui um estilo clonado de PDFs, garantindo que a ordem, a capitalização,
 * as listas com traços ("- "), observações ("Obs.:") e frases padrão sigam fielmente o médico.
 */
function construirPromptClonado(estiloClinico, nomeClinica, identificacaoProfissional, opcoesOrgaos = {}) {
  const ordemDesejada = (Array.isArray(opcoesOrgaos.ordemOrgaos) && opcoesOrgaos.ordemOrgaos.length > 0)
    ? opcoesOrgaos.ordemOrgaos
    : (Array.isArray(estiloClinico?.sequenciaOrgaos) ? estiloClinico.sequenciaOrgaos.map(o => o.orgao) : []);

  const frasesNormalidade = opcoesOrgaos.frasesNormalidade || {};
  const sequenciaOriginal = Array.isArray(estiloClinico?.sequenciaOrgaos) ? estiloClinico.sequenciaOrgaos : [];

  const listaOrgaosInstrucao = (ordemDesejada.length > 0 ? ordemDesejada : sequenciaOriginal.map(o => o.orgao)).map((nomeOrg, idx) => {
    const nomeNorm = String(nomeOrg).trim().toUpperCase();
    const itemOriginal = sequenciaOriginal.find(o => String(o.orgao).trim().toUpperCase() === nomeNorm);

    let textoNormal = frasesNormalidade[nomeNorm] || frasesNormalidade[nomeOrg] || itemOriginal?.textoPadraoNormal || '';
    if (!textoNormal) {
      if (nomeNorm === 'RIM ESQUERDO' || nomeNorm === 'RIM DIREITO') {
        textoNormal = 'Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.';
      } else if (nomeNorm === 'RINS') {
        textoNormal = 'Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: X,XX cm; RD: X,XX cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litíase ou hidronefrose.';
      }
    }

    let linha = `${idx + 1}. "${nomeNorm}": Frase padrão quando normal -> ${JSON.stringify(textoNormal)}`;
    if (itemOriginal?.textoQuandoNaoVisualizada) {
      linha += ` | Quando não visualizado -> ${JSON.stringify(itemOriginal.textoQuandoNaoVisualizada)}`;
    }
    return linha;
  }).join('\n   ');

  const querRinsSeparados = ordemDesejada.some(o => /RIM\s+ESQUERDO/i.test(o)) && ordemDesejada.some(o => /RIM\s+DIREITO/i.test(o));
  const querRinsUnificados = ordemDesejada.some(o => /^RINS$/i.test(String(o).trim()));

  const regraRins = querRinsSeparados
    ? `- REGRA ESTRITA DOS RINS (DIVISÃO OBRIGATÓRIA):
     * A sequência dos órgãos EXIGE "RIM ESQUERDO" e "RIM DIREITO" como tópicos SEPARADOS.
     * É TERMINANTEMENTE PROIBIDO agrupar em "RINS".
     * Você DEVE gerar obrigatoriamente um objeto para "RIM ESQUERDO" e outro para "RIM DIREITO" no array "laudo".
     * Para "RIM ESQUERDO": identifique a imagem com a sigla RE e extraia a medida aferida nos calipers (ex: medindo aproximadamente X,XX cm).
     * Para "RIM DIREITO": identifique a imagem com a sigla RD e extraia a medida aferida nos calipers (ex: medindo aproximadamente X,XX cm).`
    : (querRinsUnificados
        ? `- REGRA DOS RINS (UNIFICADOS):
     * A sequência dos órgãos exige "RINS" agrupado em tópico único.
     * Descreva ambos no mesmo parágrafo "RINS", incluindo as dimensões de RE e RD juntas (ex: "RE: X,XX cm; RD: X,XX cm"). Não separe em RIM ESQUERDO e RIM DIREITO.`
        : '');

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
   ${regraRins}
   ${regraSubitens}
   ${regraObsItalico}
   ${regraDiagDif}
   ${regraSexo}

${obterGuiaSemiologiaUltrassom()}
`;
}

function construirPromptPadraoVetaro(nomeClinica, identificacaoProfissional, opcoesOrgaos = {}) {
  const ordemDesejada = (Array.isArray(opcoesOrgaos.ordemOrgaos) && opcoesOrgaos.ordemOrgaos.length > 0)
    ? opcoesOrgaos.ordemOrgaos
    : [
        'BEXIGA',
        'RIM ESQUERDO',
        'RIM DIREITO',
        'BAÇO',
        'ESTOMAGO',
        'FÍGADO',
        'VESICULA BILIAR',
        'ALÇAS INTESTINAIS',
        'GLANDULA ADRENAL',
        'PANCREAS',
        'CAVIDADE ABDOMINAL',
        'CONSIDERAÇÕES'
      ];

  const querRinsSeparados = ordemDesejada.some(o => /RIM\s+ESQUERDO/i.test(o)) && ordemDesejada.some(o => /RIM\s+DIREITO/i.test(o));
  const querRinsUnificados = ordemDesejada.some(o => /^RINS$/i.test(String(o).trim()));

  const regraRins = querRinsSeparados
    ? `- REGRA ESTRITA DOS RINS (DIVISÃO OBRIGATÓRIA):
   * O laudo DEVE conter "RIM ESQUERDO" e "RIM DIREITO" como tópicos separados.
   * JAMAIS agrupe em "RINS". Extraia a medida da imagem RE para o "RIM ESQUERDO" e da imagem RD para o "RIM DIREITO".`
    : (querRinsUnificados
        ? `- REGRA DOS RINS (UNIFICADOS):
   * O laudo DEVE conter um único tópico "RINS", descrevendo ambos conjuntamente com as medidas de RE e RD (ex: "RE: X,XX cm; RD: X,XX cm").`
        : '');

  const listaOrgaosTexto = ordemDesejada.map(o => `   - ${o}`).join('\n');

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
${listaOrgaosTexto}
   - Se Fêmea: OVÁRIOS (unificado em tópico único com medidas de OE e OD se visíveis), ÚTERO (ou histórico de ovariosalpingohisterectomia; medidas e achados de cornos uterinos CUE, CUD e corpo devem ser descritos conjuntamente no tópico ÚTERO). JAMAIS inclua PRÓSTATA em fêmeas.
   - Se Macho: TESTICULO ESQUERDO, TESTICULO DIREITO, PROSTATA (ou histórico de orquiectomia)

3. CRITÉRIOS ESPECÍFICOS POR ÓRGÃO:
${regraRins}
- BEXIGA: Começar com "Em topografia habitual com formato preservado e repleção liquida [pouca / adequada / cheia]...".
- RIM ESQUERDO e RIM DIREITO: "Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose."
- RINS (se unificado): "Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: X,XX cm; RD: X,XX cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litíase ou hidronefrose."
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

${obterGuiaSemiologiaUltrassom()}
`;
}

async function analisarExameComIA(caminhoImagens, apiKey, opcoes = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelosCandidatos = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite'
  ];

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

  const perfilLaudo = opcoes.perfilLaudo || null;

  const ordemOrgaos = (Array.isArray(opcoes.ordemOrgaos) && opcoes.ordemOrgaos.length > 0)
    ? opcoes.ordemOrgaos
    : (Array.isArray(perfilLaudo?.ordemOrgaos) && perfilLaudo.ordemOrgaos.length > 0)
      ? perfilLaudo.ordemOrgaos
      : (Array.isArray(layout?.writing_style_json?.sequenciaOrgaos) ? layout.writing_style_json.sequenciaOrgaos.map(o => o.orgao) : null) ||
        [];

  const usarEstiloClonado = Boolean(
    layout &&
    layout.modo_template === 'clonado_pdf' &&
    layout.writing_style_json &&
    Array.isArray(layout.writing_style_json.sequenciaOrgaos)
  );

  const opcoesOrgaos = {
    ordemOrgaos,
    frasesNormalidade: perfilLaudo?.frasesNormalidade || {}
  };

  const blocoRegras = usarEstiloClonado
    ? construirPromptClonado(layout.writing_style_json, nomeClinica, identificacaoProfissional, opcoesOrgaos)
    : construirPromptPadraoVetaro(nomeClinica, identificacaoProfissional, opcoesOrgaos);

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
      jsonParsed.laudo = reconciliarLaudoComOrdemOrgaos(
        jsonParsed.laudo,
        ordemOrgaos,
        opcoes.perfilLaudo?.frasesNormalidade || {}
      );

      const mapaPrioridadesEfetivo = construirMapaPrioridades(ordemOrgaos);

      jsonParsed.caminhosOrdenados = ordenarImagensCanonicamente(
        caminhoImagens,
        jsonParsed.classificacaoImagens,
        jsonParsed.nomesArquivosOrdenados,
        mapaPrioridadesEfetivo
      );

      return jsonParsed;
    } catch (err) {
      console.warn(`⚠️ Tentativa com ${nomeModelo} (chave free) falhou: ${err.message}${err.cause ? ' (Detalhe: ' + (err.cause.code || err.cause.message) + ')' : ''}.`);
      ultimoErro = err;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  // FASE 2: Fallback para a Chave Paga (se configurada)
  if (paidApiKey && paidApiKey !== apiKey) {
    console.log(`💳 [ANALISADOR IA] Chave principal/free esgotada ou indisponível. Acionando fallback para CHAVE PAGA...`);
    const genAIPaid = new GoogleGenerativeAI(paidApiKey);
    const modelosPagos = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite'
    ];

    for (const nomeModeloPago of modelosPagos) {
      try {
        console.log(`💎 [ANALISADOR IA - CHAVE PAGA] Chamando modelo prioritário ${nomeModeloPago}...`);
        const model = genAIPaid.getGenerativeModel({ model: nomeModeloPago });
        const result = await model.generateContent([promptFinal, ...imageParts]);
        const responseText = result.response.text().trim();

        const jsonClean = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const jsonParsed = JSON.parse(jsonClean);

        jsonParsed.paciente = sanitizarDadosPaciente(jsonParsed.paciente, nomeClinica);
      jsonParsed.laudo = reconciliarLaudoComOrdemOrgaos(
        jsonParsed.laudo,
        ordemOrgaos,
        opcoes.perfilLaudo?.frasesNormalidade || {}
      );

        const mapaPrioridadesEfetivo = construirMapaPrioridades(ordemOrgaos);

        jsonParsed.caminhosOrdenados = ordenarImagensCanonicamente(
          caminhoImagens,
          jsonParsed.classificacaoImagens,
          jsonParsed.nomesArquivosOrdenados,
          mapaPrioridadesEfetivo
        );

        return jsonParsed;
      } catch (errPago) {
        console.warn(`⚠️ [ANALISADOR IA] Falha no fallback pago com ${nomeModeloPago}: ${errPago.message}${errPago.cause ? ' (Detalhe: ' + (errPago.cause.code || errPago.cause.message) + ')' : ''}.`);
        ultimoErro = errPago;
        await new Promise(res => setTimeout(res, 1000));
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

/**
 * Garante que o array `laudo` gerado pela IA obedeça estritamente à divisão/unificação dos rins
 * e à ordem exata configurada pelo médico veterinário no perfil/layout.
 */
function reconciliarLaudoComOrdemOrgaos(laudoArray = [], ordemDesejada = [], frasesNormalidade = {}) {
  if (!Array.isArray(laudoArray) || laudoArray.length === 0) return [];
  if (!Array.isArray(ordemDesejada) || ordemDesejada.length === 0) return laudoArray;

  const itens = JSON.parse(JSON.stringify(laudoArray));
  const querRinsSeparados = ordemDesejada.some(o => /RIM\s+ESQUERDO/i.test(o)) && ordemDesejada.some(o => /RIM\s+DIREITO/i.test(o));
  const querRinsUnificados = ordemDesejada.some(o => /^RINS$/i.test(String(o).trim()));

  const idxRins = itens.findIndex(it => /^RINS$/i.test((it.orgao || '').trim()));
  const idxRE = itens.findIndex(it => /^(RIM\s+ESQUERDO|RE)$/i.test((it.orgao || '').trim()));
  const idxRD = itens.findIndex(it => /^(RIM\s+DIREITO|RD)$/i.test((it.orgao || '').trim()));

  // Caso 1: Usuário quer RINS SEPARADOS (RIM ESQUERDO e RIM DIREITO), mas a IA devolveu RINS unificado
  if (querRinsSeparados && idxRins !== -1 && (idxRE === -1 || idxRD === -1)) {
    const itemRins = itens[idxRins];
    const textoRins = itemRins.texto || '';

    // Extrai medidas de RE e RD do texto de RINS se presentes (ex: "RE: 4,13 cm; RD: 5,01 cm" ou "RE: 4.13 cm")
    const matchRE = textoRins.match(/RE:\s*([\d,.]+)\s*cm/i);
    const matchRD = textoRins.match(/RD:\s*([\d,.]+)\s*cm/i);
    const medidaRE = matchRE ? matchRE[1].replace('.', ',') : null;
    const medidaRD = matchRD ? matchRD[1].replace('.', ',') : null;

    // Remove referências a RE e RD unificados do texto base
    let textoBase = textoRins
      .replace(/\(RE:\s*[\d,.]+\s*cm[;,]\s*RD:\s*[\d,.]+\s*cm\)/gi, '')
      .replace(/\bLocalizados\b/gi, 'Localizado')
      .trim();

    function adaptarTextoRim(base, medida, fraseCustom) {
      if (fraseCustom) return fraseCustom;
      if (!base) {
        return medida
          ? `Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente ${medida} cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.`
          : 'Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.';
      }
      let t = base;
      if (medida) {
        if (/medindo\s+aproximadamente\s*[\d,.]*\s*cm/i.test(t)) {
          t = t.replace(/medindo\s+aproximadamente\s*[\d,.]*\s*cm/i, `medindo aproximadamente ${medida} cm`);
        } else if (/dimensões\s+preservadas/i.test(t)) {
          t = t.replace(/(dimensões\s+preservadas)/i, `$1, medindo aproximadamente ${medida} cm`);
        } else if (/Localizado\s+em\s+topografia\s+habitual,/i.test(t)) {
          t = t.replace(/(Localizado\s+em\s+topografia\s+habitual,)/i, `$1 com dimensões preservadas, medindo aproximadamente ${medida} cm,`);
        }
      }
      return t;
    }

    const frasePadraoRE = adaptarTextoRim(textoBase, medidaRE, frasesNormalidade['RIM ESQUERDO']);
    const frasePadraoRD = adaptarTextoRim(textoBase, medidaRD, frasesNormalidade['RIM DIREITO']);

    const itemRE = {
      orgao: 'RIM ESQUERDO',
      texto: frasePadraoRE,
      diagDif: itemRins.diagDif || ''
    };
    const itemRD = {
      orgao: 'RIM DIREITO',
      texto: frasePadraoRD,
      diagDif: itemRins.diagDif || ''
    };

    itens.splice(idxRins, 1, itemRE, itemRD);
  }

  // Caso 2: Usuário quer RINS UNIFICADO, mas a IA devolveu RIM ESQUERDO e RIM DIREITO separados
  if (querRinsUnificados && idxRins === -1 && idxRE !== -1 && idxRD !== -1) {
    const itemRE = itens[idxRE];
    const itemRD = itens[idxRD];
    const matchRE = (itemRE.texto || '').match(/([\d,.]+)\s*cm/);
    const matchRD = (itemRD.texto || '').match(/([\d,.]+)\s*cm/);
    const reStr = matchRE ? matchRE[1].replace('.', ',') : 'X,XX';
    const rdStr = matchRD ? matchRD[1].replace('.', ',') : 'X,XX';

    const diagCombinado = [itemRE.diagDif, itemRD.diagDif].filter(Boolean).join(', ');
    const itemRinsUnificado = {
      orgao: 'RINS',
      texto: `Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: ${reStr} cm; RD: ${rdStr} cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litíase ou hidronefrose.`,
      diagDif: diagCombinado
    };

    const menorIdx = Math.min(idxRE, idxRD);
    const maiorIdx = Math.max(idxRE, idxRD);
    itens.splice(maiorIdx, 1);
    itens.splice(menorIdx, 1, itemRinsUnificado);
  }

  // Ordenação final canônica: Reordena os tópicos estritamente pela sequência de ordemDesejada
  const mapaOrdem = new Map();
  ordemDesejada.forEach((org, pos) => {
    mapaOrdem.set(String(org).trim().toUpperCase(), pos);
  });

  itens.sort((a, b) => {
    const posA = mapaOrdem.has(String(a.orgao).trim().toUpperCase())
      ? mapaOrdem.get(String(a.orgao).trim().toUpperCase())
      : 999;
    const posB = mapaOrdem.has(String(b.orgao).trim().toUpperCase())
      ? mapaOrdem.get(String(b.orgao).trim().toUpperCase())
      : 999;
    return posA - posB;
  });

  return itens;
}

module.exports = {
  analisarExameComIA,
  construirPromptClonado,
  construirPromptPadraoVetaro,
  ordenarImagensCanonicamente,
  construirMapaPrioridades,
  sanitizarDadosPaciente,
  reconciliarLaudoComOrdemOrgaos,
  MAPA_ORDEM_CANONICA
};

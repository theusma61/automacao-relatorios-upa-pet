const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

async function analisarExameComIA(caminhoImagens, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelosCandidatos = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];

  const promptInstrucoes = `
Você é um médico veterinário especialista em diagnóstico por imagem (ultrassonografia abdominal de cães e gatos).
Sua missão é realizar a pré-análise técnica minuciosa das imagens de ultrassom do aparelho Mindray fornecidas e estruturar os dados no padrão oficial da clínica UPA PET (Dra. Camila Bastos - CRMV/MG: 22904).

---

### REGRAS CLÍNICAS E CRITÉRIOS OBRIGATÓRIOS:

1. DADOS DO PACIENTE:
   - Extraia Nome, Tutor, Sexo, Data e Idade diretamente do cabeçalho na tela do Mindray.
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
   - Se Fêmea: OVÁRIOS (unificado em tópico único com medidas de OE e OD), ÚTERO (ou histórico de ovariosalpingohisterectomia)
   - Se Macho: TESTICULO ESQUERDO, TESTICULO DIREITO, PROSTATA (ou histórico de orquiectomia)
   - GLANDULA ADRENAL
   - PANCREAS
   - CAVIDADE ABDOMINAL
   - CONSIDERAÇÕES

3. CRITÉRIOS ESPECÍFICOS POR ÓRGÃO:

- BEXIGA:
  * Começar OBRIGATORIAMENTE com a frase: "Em topografia habitual" (ou "Localizada em topografia habitual").
  * Formato e repleção: "com formato preservado e repleção liquida [pouca / adequada / cheia]".
  * Paredes e Pontos de Corte:
    - Felinos: normal de 0,13 cm até 0,15 cm. Acima de 0,15 cm = Cistite.
    - Cães: normal até 0,25 cm. Acima de 0,25 cm = Cistite.
    - Margens internas: na maioria das vezes "margens internas irregulares" quando tem cistite; se normal, "margens internas regulares".
  * Conteúdo: "conteúdo anecogênico e homogêneo" ou indicar presença de sedimentos hiperecogênicos flutuantes, urólitos (medidos em cm) com sombra acústica.
  * Se alterada, DIAG DIF.: CISTITE, CISTITE ASSOCIADA A SEDIMENTOS ou URÓLITOS E SEDIMENTOS URINÁRIOS.

- RINS (SEPARAR OBRIGATORIAMENTE EM TÓPICOS: "RIM ESQUERDO" e "RIM DIREITO"):
  * Frase canônica para cada um:
    "Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose."
  * Diagnósticos Diferenciais Renais:
    - Se perda da relação/diferenciação córtico-medular: DIAG DIF.: DOENÇA RENAL CRÔNICA, NEFROTOXICIDADE, PROCESSOS INFLAMATÓRIOS, INFECCIOSOS OU INFILTRATIVOS.
    - Se ecogenicidade cortical aumentada com relação mantida: DIAG DIF.: NEFROPATIA AGUDA, PROCESSOS TÓXICOS, GLOMERULONEFRITE, ALTERAÇÕES SECUNDÁRIAS A DISTÚRBIOS SISTÊMICOS.
    - Se cisto renal (estruturas anecóicas arredondadas de paredes finas com reforço acústico posterior): DIAG DIF.: CISTO RENAL, DOENÇA POLICÍSTICA RENAL.
    - Se hidronefrose (dilatação da pelve e divertículos com fluido anecóico ramificado): DIAG DIF.: HIDRONEFROSE, OBSTRUÇÃO URETERAL.
    - Se urolitíase/calculose (focos altamente ecogênicos com forte sombra acústica distal limpa): DIAG DIF.: NEFROLITÍASE, UROLITÍASE.
    - Se nefrocalcinose (focos pontiformes ou lineares no córtex ou medula): DIAG DIF.: NEFROCALCINOSE, MINERALIZAÇÃO RENAL.

- BAÇO:
  * 1°: "Localizado em topografia habitual"
  * 2°: "com contornos regulares [ou irregulares], bem definidos"
  * 3°: "com dimensões preservadas" OU "com dimensões aumentadas (ultrapassando o polo cranial do rim esquerdo)"
  * 4°: sempre especificar se a ecogenicidade está "usual/preservada", "aumentada" ou "diminuída", e ecotextura "homogênea" ou "heterogênea".
  * 5°: Incluir sempre "Arquitetura vascular preservada."
  * Diagnósticos Diferenciais Esplênicos:
    - Se somente aumento de tamanho (sem alteração de parênquima): DIAG DIF.: PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES.
    - Se esplenomegalia difusa com alteração textural/ecogênica: DIAG DIF.: ESPLENOMEGALIA DIFUSA, HEMATOPOIESE EXTRAMEDULAR, HIPERPLASIA LINFOIDE DIFUSA, INFILTRAÇÃO NEOPLÁSICA (LINFOMA).
    - Se nódulos ou massas focais/multifocais: DIAG DIF.: HIPERPLASIA NODULAR ESPLÊNICA, HEMATOPOIESE EXTRAMEDULAR, PROCESSO NEOPLÁSICO (HEMANGIOSSARCOMA, LINFOMA), LIPOMA ESPLÊNICO.

- ESTÔMAGO:
  * 1°: "Localizado em topografia habitual"
  * 2°: Paredes normoespessas (até 0,50 cm) ou espessadas (acima de 0,50 cm, medindo X,XX cm).
  * 3°: "paredes [normoespessas / espessadas], medindo X,XX cm, mucosas com pregueamento usual. Apresentando repleção parcial por conteúdo predominantemente hipoecoico com presença de pequenas áreas hiperecogênicas, pouca quantidade de gás em seu lúmen."
  * Diagnósticos Diferenciais se alterado:
    - Espessamento parietal: DIAG DIF.: GASTRITE (AGUDA / CRÔNICA), ENTEROPATIA INFLAMATÓRIA, ULCERAÇÃO GÁSTRICA, PROCESSO NEOPLÁSICO INFILTRATIVO.
    - Corpos estranhos: DIAG DIF.: CORPO ESTRANHO GÁSTRICO.
    - Motilidade: DIAG DIF.: HIPOMOTILIDADE / ATONIA GÁSTRICA.

- FÍGADO:
  * 1°: "Localizado em topografia habitual"
  * 2°: "apresenta-se, na porção visível, com dimensões aparentemente preservadas e contornos regulares."
    (Aumentado quando: ultrapassa o gradil costal, arredondamento das margens e deslocamento de órgãos caudais).
  * 3°: "O parênquima hepático demonstra ecogenicidade e ecotextura homogênea. Não foram observadas lesões focais, massas ou dilatação das vias biliares intra-hepáticas."
  * Diagnósticos Diferenciais Hepáticos:
    - Ecogenicidade aumentada: DIAG DIF.: LIPIDOSE HEPÁTICA, HEPATOPATIA VACUOLAR, INFILTRADO GORDUROSO, HEPATITE CRÔNICA, HEPATOPATIA REACIONAL.
    - Ecogenicidade diminuída: DIAG DIF.: HEPATITE AGUDA, CONGESTÃO HEPÁTICA.
    - Ecotextura heterogênea / nódulos: DIAG DIF.: HEPATOPATIA CRÔNICA AVANÇADA (CIRROSE, FIBROSE SEVERA), HIPERPLASIA NODULAR REGENERATIVA, NEOPLASIA PRIMÁRIA (CARCINOMA HEPATOCELULAR) OU METASTÁTICA, PROCESSO INFLAMATÓRIO CRÔNICO / GRANULOMATOSO.

- VESÍCULA BILIAR:
  * 1°: Paredes normoespessas (até 0,10 cm) ou espessas (> 0,10 cm).
  * 2°: Margem interna regular ou irregular.
  * 3°: Conteúdo homogêneo e anecogênico límpido.
  * Diagnósticos Diferenciais:
    - Lama biliar (sedimento biliar móvel): DIAG DIF.: LAMA BILIAR, ESTASE BILIAR, COLANGITE.
    - Mucocele biliar (padrão em roda de carroça / estriado / septado): DIAG DIF.: MUCOCELE BILIAR.
    - Colelitíase (cálculos com sombra acústica): DIAG DIF.: COLELITÍASE, COLECISTITE.
    - Debris celulares / exsudato: DIAG DIF.: COLECISTITE, COLANGIO-HEPATITE.

- ALÇAS INTESTINAIS:
  * FRASE OBRIGATÓRIA EXATA:
    "Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (X,XX cm), jejuno (X,XX cm) e colon descendente (X,XX cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em colon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total."

- APARELHO REPRODUTOR:
  * Fêmea inteira:
    - OVÁRIOS (Unificado em tópico único): "OVÁRIOS: Em topografia habitual e dimensões preservadas (OE: X,XX cm x X,XX cm , OD: X,XX cm x X,XX cm) apresenta formato ovalado, contornos regulares e definidos. Não há evidências de formações císticas, massas sólidas ou alterações estruturais." (Se cisto/folículo presente: descrever e adicionar DIAG DIF.: FOLÍCULO OVARIANO, CISTO OVARIANO).
    - ÚTERO: "ÚTERO: Localizado em topografia habitual. Corpo e cornos uterinos com dimensões preservadas..." (se piometra: dilatação tubular, paredes irregulares, conteúdo com pontos hipoecogênicos com DIAG DIF.: PIOMETRA, MUCOMETRA).
  * Fêmea castrada: "ÚTERO / OVÁRIOS: Não visualizados, histórico de ovariosalpingohisterectomia."
  * Macho inteiro: Descrever TESTICULO ESQUERDO, TESTICULO DIREITO e PROSTATA (se cistos/aumento: DIAG DIF. HIPERPLASIA PROSTATICA).
  * Macho castrado: "TESTICULOS: Não visualizados, histórico de orquiectomia."

- GLÂNDULA ADRENAL:
  * Quando visibilizadas e normais, usar OBRIGATORIAMENTE este padrão com quebras de linha exatas:
    "Apresenta dimensões e formato anatômicos preservados, contornos regulares, parênquima homogêneo e normoecogenico.
AE: 0,XX cm em polo cranial, 0,XX cm em polo caudal, e X,XX cm de comprimento.
AD: 0,XX cm em polo cranial, 0,XX cm em polo caudal, e X,XX cm de comprimento."
  * Quando não visibilizadas: "Não visualizadas."
  * Se alteradas (nódulos, aumento de polos cranial/caudal, assimetria): descrever as alterações e adicionar DIAG DIF.: HIPERADRENOCORTICISMO, NEOPLASIA ADRENAL.

- PÂNCREAS:
  * "PANCREAS: Sem alteração em topografia de pâncreas." (ou medidas do ramo).

- CAVIDADE ABDOMINAL:
  * "Ausência de liquido livre, sem alterações evidentes em linfonodos abominais."

- CONSIDERAÇÕES:
  * "Sugere-se acompanhamento ultrassonográfico das alterações visibilizadas. Associar a exames complementares."

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
    "idade": "string ou 'Não informada'",
    "tutor": "string",
    "sexo": "Macho ou Fêmea",
    "data": "DD/MM/AAAA"
  },
  "laudo": [
    {
      "orgao": "NOME DO ÓRGÃO",
      "texto": "Descrição técnica canônica...",
      "diagDif": "DIAGNÓSTICOS DIFERENCIAIS EM CAIXA ALTA (ou vazio se normal)"
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
  for (const nomeModelo of modelosCandidatos) {
    try {
      console.log(`🤖 Chamando modelo ${nomeModelo}...`);
      const model = genAI.getGenerativeModel({ model: nomeModelo });
      const result = await model.generateContent([promptFinal, ...imageParts]);
      const responseText = result.response.text().trim();

      const jsonClean = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const jsonParsed = JSON.parse(jsonClean);

      // Ordenação Canônica Robusta e Determinística
      jsonParsed.caminhosOrdenados = ordenarImagensCanonicamente(
        caminhoImagens,
        jsonParsed.classificacaoImagens,
        jsonParsed.nomesArquivosOrdenados
      );

      return jsonParsed;
    } catch (err) {
      console.warn(`⚠️ Tentativa com ${nomeModelo} falhou: ${err.message}. Tentando próximo modelo...`);
      ultimoErro = err;
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  throw ultimoErro;
}

const MAPA_ORDEM_CANONICA = {
  // 1° Bexiga e suas variações
  'BEX': 1, 'BEXIGA': 1, 'SED': 1, 'SEDIMENTO': 1, 'UROLITO': 1, 'CALC': 1, 'CALCULO': 1, 'URETER': 1,
  // 2° Rim Esquerdo
  'RE': 2, 'RIM ESQUERDO': 2, 'RIME': 2, 'RIM E': 2, 'R.E': 2,
  // 3° Rim Direito
  'RD': 3, 'RIM DIREITO': 3, 'RIMD': 3, 'RIM D': 3, 'R.D': 3,
  // 4° Baço e variações
  'BACO': 4, 'BAÇO': 4, 'B': 4, 'ESPLEN': 4, 'ESPLENO': 4,
  // 5° Estômago
  'EST': 5, 'ESTOMAGO': 5, 'ESTÔMAGO': 5,
  // 6° Fígado
  'FIG': 6, 'FIGADO': 6, 'FÍGADO': 6, 'HEP': 6,
  // 7° Vesícula Biliar
  'VB': 7, 'VESICULA BILIAR': 7, 'VESÍCULA BILIAR': 7, 'VESICULA': 7, 'VESÍCULA': 7,
  // 8° Duodeno
  'DUO': 8, 'DUODENO': 8,
  // 9° Jejuno
  'JJ': 9, 'JEJUNO': 9,
  // 10° Cólon Descendente
  'CD': 10, 'COLON': 10, 'CÓLON': 10, 'COLON DESCENDENTE': 10, 'CÓLON DESCENDENTE': 10,
  // 11° Ovário Esquerdo
  'OE': 11, 'OVARIO ESQUERDO': 11, 'OVÁRIO ESQUERDO': 11, 'TOP OE': 11,
  // 12° Ovário Direito
  'OD': 12, 'OVARIO DIREITO': 12, 'OVÁRIO DIREITO': 12, 'TOP OD': 12,
  // 13° Útero
  'UTERO': 13, 'ÚTERO': 13, 'CUE': 13, 'CUD': 13, 'CORPO UTERINO': 13,
  // 14° Testículo Esquerdo
  'TE': 14, 'TESTICULO ESQUERDO': 14, 'TESTÍCULO ESQUERDO': 14,
  // 15° Testículo Direito
  'TD': 15, 'TESTICULO DIREITO': 15, 'TESTÍCULO DIREITO': 15,
  // 16° Próstata
  'PTT': 16, 'PROSTATA': 16, 'PRÓSTATA': 16, 'PROST': 16,
  // 17° Adrenal Esquerda
  'AE': 17, 'ADRENAL ESQUERDA': 17, 'ADRE': 17,
  // 18° Adrenal Direita
  'AD': 18, 'ADRENAL DIREITA': 18, 'ADRD': 18,
  // 19° Pâncreas
  'PANC': 19, 'PANCREAS': 19, 'PÂNCREAS': 19,
  // 20° Cavidade / Líquido Livre
  'LL': 20, 'LIQUIDO LIVRE': 20, 'LÍQUIDO LIVRE': 20, 'CAVIDADE': 20
};

function normalizarTexto(texto) {
  return (texto || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function calcularPrioridadeOrgao(item) {
  if (item && typeof item.prioridade === 'number' && item.prioridade >= 1 && item.prioridade <= 20) {
    return item.prioridade;
  }
  const sigla = normalizarTexto(item ? item.sigla : '');
  const orgao = normalizarTexto(item ? item.orgao : '');
  if (MAPA_ORDEM_CANONICA[sigla]) return MAPA_ORDEM_CANONICA[sigla];
  if (MAPA_ORDEM_CANONICA[orgao]) return MAPA_ORDEM_CANONICA[orgao];
  for (const [chave, p] of Object.entries(MAPA_ORDEM_CANONICA)) {
    const k = normalizarTexto(chave);
    if (sigla.includes(k) || orgao.includes(k)) return p;
  }
  return 99;
}

function ordenarImagensCanonicamente(caminhoImagens, classificacaoImagens, nomesArquivosOrdenados) {
  if (!Array.isArray(caminhoImagens) || caminhoImagens.length === 0) return [];

  const itens = caminhoImagens.map((caminho, idx) => {
    const nomeBase = path.basename(caminho).toLowerCase();
    let classif = null;

    if (Array.isArray(classificacaoImagens)) {
      classif = classificacaoImagens.find(c => c.indice === idx) ||
                classificacaoImagens.find(c => c.nomeArquivo && c.nomeArquivo.toLowerCase() === nomeBase);
    }

    let prioridade = calcularPrioridadeOrgao(classif);

    // Se não encontrou pela classificação da IA, tenta pelo próprio nome do arquivo (ex: "Bexiga.jpg", "Adrenal esquerda.jpg")
    if (prioridade === 99) {
      prioridade = calcularPrioridadeOrgao({ orgao: path.parse(nomeBase).name });
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
    return a.idx - b.idx; // Estabilidade para imagens do mesmo órgão
  });

  return itens.map(i => i.caminho);
}

module.exports = { analisarExameComIA, ordenarImagensCanonicamente, MAPA_ORDEM_CANONICA };

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { obterLayout } = require('./gerenciador_layout');

const IA_RUNTIME_CONFIG_PATH = path.join(
  process.env.UPLOAD_PERSISTENT_DIR ? path.resolve(process.env.UPLOAD_PERSISTENT_DIR) : path.join(__dirname, 'uploads'),
  'ia_runtime_config.json'
);

const LOCAL_HOSTS_PERMITIDOS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function extrairHostnameSeguro(valor) {
  if (!valor) return '';
  const bruto = String(valor).split(',')[0].trim().toLowerCase();
  if (!bruto) return '';
  try {
    const comProto = /^https?:\/\//i.test(bruto) ? bruto : `http://${bruto}`;
    return new URL(comProto).hostname.toLowerCase();
  } catch (_) {
    return bruto.replace(/:\d+$/, '').toLowerCase();
  }
}

/**
 * Trava dupla fail-closed: o modo simulação (0 tokens) SÓ pode ser ativado se:
 * 1) ALLOW_LOCAL_AI_MOCK=true estiver explícito no ambiente local;
 * 2) APP_BASE_URL (se definido) apontar exclusivamente para localhost/127.0.0.1;
 * 3) O Host da requisição HTTP (quando fornecido) for estritamente localhost/127.0.0.1/::1.
 */
function isAmbienteLocalSeguro(req = null) {
  if (String(process.env.ALLOW_LOCAL_AI_MOCK || '').trim().toLowerCase() !== 'true') {
    return false;
  }
  const appBaseUrl = String(process.env.APP_BASE_URL || '').trim();
  if (appBaseUrl) {
    const baseHost = extrairHostnameSeguro(appBaseUrl);
    if (!LOCAL_HOSTS_PERMITIDOS.has(baseHost)) {
      return false;
    }
  }
  if (req && req.headers) {
    const reqHost = extrairHostnameSeguro(req.headers['x-forwarded-host'] || req.headers.host || '');
    if (!LOCAL_HOSTS_PERMITIDOS.has(reqHost)) {
      return false;
    }
  }
  return true;
}

function obterConfigIaRuntime() {
  const defaultEnv = String(process.env.GEMINI_USE_HYDROGEN_PAID || 'true').trim().toLowerCase() !== 'false';
  const localPermitido = isAmbienteLocalSeguro();
  let usarHydrogenPago = defaultEnv;
  let usarMockLocal = localPermitido;
  try {
    if (fs.existsSync(IA_RUNTIME_CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(IA_RUNTIME_CONFIG_PATH, 'utf8'));
      if (typeof parsed.usarHydrogenPago === 'boolean') {
        usarHydrogenPago = parsed.usarHydrogenPago;
      }
      if (localPermitido && typeof parsed.usarMockLocal === 'boolean') {
        usarMockLocal = parsed.usarMockLocal;
      }
    }
  } catch (_) {}
  return {
    usarHydrogenPago,
    usarMockLocal: localPermitido ? Boolean(usarMockLocal) : false
  };
}

function salvarConfigIaRuntime(dados = {}) {
  const atual = obterConfigIaRuntime();
  const localPermitido = isAmbienteLocalSeguro();
  const proximo = {
    usarHydrogenPago: typeof dados.usarHydrogenPago === 'boolean' ? dados.usarHydrogenPago : atual.usarHydrogenPago,
    usarMockLocal: localPermitido
      ? (typeof dados.usarMockLocal === 'boolean' ? dados.usarMockLocal : atual.usarMockLocal)
      : false,
    atualizadoEm: new Date().toISOString()
  };
  try {
    const dir = path.dirname(IA_RUNTIME_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(IA_RUNTIME_CONFIG_PATH, JSON.stringify(proximo, null, 2), 'utf8');
  } catch (_) {}
  return proximo;
}

function deveUsarMockLocal(req = null) {
  if (!isAmbienteLocalSeguro(req)) return false;
  return Boolean(obterConfigIaRuntime().usarMockLocal);
}

function gerarAnaliseUltrassomMock(caminhoImagens = [], opcoes = {}) {
  const hoje = new Date();
  const dataBr = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
  const perfilLaudo = opcoes.perfilLaudo || null;
  const usuario = opcoes.usuario || {};
  const imagensQtd = Array.isArray(caminhoImagens) ? caminhoImagens.length : 0;

  const paciente = sanitizarDadosPaciente({
    nome: 'Thor (Teste Local)',
    tutor: 'Tutor Simulado',
    especie: 'Canina',
    sexo: 'Macho',
    idade: '6 anos',
    data: dataBr
  }, usuario.nomeClinica || '');

  const laudoBase = [
    {
      orgao: 'BEXIGA URINÁRIA',
      texto: 'Moderadamente repleta, parede fina e regular, conteúdo anecogênico homogêneo, sem evidência de cálculos ou sedimentos.',
      diagDif: ''
    },
    {
      orgao: 'RINS',
      texto: 'Simétricos, contornos regulares, relação e definição corticomedular preservadas, sem sinais de dilatação piélica ou litíase.',
      diagDif: ''
    },
    {
      orgao: 'BAÇO',
      texto: 'Dimensões discretamente aumentadas, contornos regulares e parênquima homogêneo, com ecogenicidade preservada.',
      diagDif: 'Esplenomegalia discreta / hiperplasia reacional.'
    },
    {
      orgao: 'FÍGADO',
      texto: 'Dimensões preservadas, bordos regulares, parênquima homogêneo e ecogenicidade habitual.',
      diagDif: ''
    },
    {
      orgao: 'VESÍCULA BILIAR',
      texto: 'Moderadamente repleta, parede fina e lisa, apresentando discreta quantidade de conteúdo ecogênico em porção gravidade-dependente (lama biliar).',
      diagDif: 'Lama biliar / colestase discreta.'
    },
    {
      orgao: 'ESTÔMAGO',
      texto: 'Moderadamente repleto por conteúdo gasoso e alimentar, estratificação parietal preservada.',
      diagDif: ''
    },
    {
      orgao: 'ALÇAS INTESTINAIS',
      texto: 'Estratificação parietal preservada, lúmen com conteúdo mucoso/gasoso habitual e peristaltismo evolutivo mantido.',
      diagDif: ''
    },
    {
      orgao: 'CAVIDADE ABDOMINAL',
      texto: 'Ausência de líquido livre, sem alterações evidentes em linfonodos abdominais.',
      diagDif: ''
    },
    {
      orgao: 'CONSIDERAÇÕES',
      texto: '[MODO SIMULAÇÃO LOCAL — 0 TOKENS] Laudo gerado localmente para testes de layout, PDF, DOCX e Vetaro Studio sem consumo da API Gemini.',
      diagDif: ''
    }
  ];

  const ordemPreferida = Array.isArray(perfilLaudo?.ordemOrgaos) && perfilLaudo.ordemOrgaos.length > 0
    ? perfilLaudo.ordemOrgaos
    : null;
  const laudoFinal = ordemPreferida
    ? reconciliarLaudoComOrdemOrgaos(laudoBase, ordemPreferida, perfilLaudo?.frasesNormalidade || {})
    : laudoBase;

  return {
    paciente,
    laudo: laudoFinal,
    tokens: {
      modelo: 'mock-local',
      chave: 'local-0-tokens',
      imagensQtd,
      promptTokens: 0,
      candidatesTokens: 0,
      thoughtsTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      custoEstimadoUsd: 0
    }
  };
}

function calcularResumoTokens(usageMetadata, nomeModelo, rotuloChave, imagensQtd) {
  if (!usageMetadata || typeof usageMetadata !== 'object') return null;
  const promptTokens = Number(usageMetadata.promptTokenCount || 0);
  const candidatesTokens = Number(usageMetadata.candidatesTokenCount || 0);
  const thoughtsTokens = Number(usageMetadata.thoughtsTokenCount || 0);
  const outputTokens = candidatesTokens + thoughtsTokens;
  const totalTokens = Number(usageMetadata.totalTokenCount || (promptTokens + outputTokens));

  // Preços de referência por 1M tokens (USD): Hydrogen $1.50/$7.50 | 3.8 Flash $0.75/$3.75 (promo até 31/12/2026)
  const ehHydrogen = /hydrogen/i.test(nomeModelo || '');
  const precoIn = ehHydrogen ? 1.50 : 0.75;
  const precoOut = ehHydrogen ? 7.50 : 3.75;
  const custoEstimadoUsd = Number((((promptTokens / 1e6) * precoIn) + ((outputTokens / 1e6) * precoOut)).toFixed(5));

  return {
    modelo: nomeModelo,
    chave: rotuloChave,
    imagensQtd,
    promptTokens,
    candidatesTokens,
    thoughtsTokens,
    outputTokens,
    totalTokens,
    custoEstimadoUsd
  };
}

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
   - Janelas topográficas de esplenomegalia (imagens com anotação "B" e "R", "BACO" e "BEX", ou "BACO"):
     * Se houver imagem mostrando "BACO" adjacente/alcançando a "BEX" (extremidade caudal do baço chegando até a bexiga), OU se na janela "B" e "R" o baço se estender caudalmente ultrapassando o polo cranial do rim esquerdo, OU se apresentar bordos abaulados/arredondados:
       -> Laudar OBRIGATORIAMENTE: "Localizado em topografia habitual, com contornos regulares e bem definidos, com dimensões aumentadas, estendendo-se caudalmente e ultrapassando o polo cranial do rim esquerdo, parênquima com ecogenicidade usual e ecotextura homogênea."
       -> Inserir na propriedade "diagDif": "PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES" (se ecotextura homogênea usual); ou "ESPLENOMEGALIA DIFUSA, HEMATOPOIESE EXTRAMEDULAR, HIPERPLASIA LINFOIDE DIFUSA, INFILTRAÇÃO NEOPLÁSICA (LINFOMA)" (se ecotextura heterogênea/rendilhada).
     * Somente laudar "dimensões preservadas" (diagDif: "") se o baço nitidamente não ultrapassar o polo cranial do rim esquerdo e mantiver bordos afilados.

2. RINS (RIM ESQUERDO E RIM DIREITO) - DIFERENCIAÇÃO CÓRTICO-MEDULAR E PATOLOGIAS:
   - Extraia as medidas nos calipers ("RE" e "RD").
   - ATENÇÃO A SIGLAS REPETIDAS NO APARELHO: é comum o operador esquecer de trocar "RE" para "RD" (ou vice-versa) no teclado do aparelho e salvar 2 imagens renais com a mesma sigla e medidas diferentes. Nesse caso, NUNCA invente uma medida fictícia — atribua as medidas reais das duas imagens (a segunda corresponde ao rim contralateral). Se realmente só houver 1 rim fotografado, informe que o contralateral não foi mensurado/visualizado, sem inventar números.
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

3. FÍGADO E HEPATOMEGALIA (COMPARAÇÃO CRUZADA ENTRE IMAGENS):
   - Avaliar dimensões pela projeção dos bordos hepáticos em relação ao gradil costal e estômago:
     * Dê atenção redobrada quando houver múltiplas capturas de "FIG" (3 ou mais imagens): inspecione se os lobos hepáticos apresentam bordos arredondados/proeminentes ou se estendem além do gradil costal/estômago.
     * Se o bordo hepático ultrapassar o gradil costal ou apresentar margens arredondadas/proeminentes:
       -> Descrever: "dimensões aumentadas, ultrapassando o bordo costal e contornos regulares [ou arredondados]".
     * Ecogenicidade do parênquima (COMPARAÇÃO DIRETA):
       - Compare diretamente o brilho/ecogenicidade das fotos "FIG" com o córtex renal ("RE"/"RD") e com o baço ("BACO") do mesmo exame.
       - Se o parênquima hepático estiver difusamente mais brilhante/hiperecogênico que o córtex renal (ou com atenuação posterior do feixe sonoro):
         -> Descrever ecogenicidade aumentada e atribuir diagDif: "HEPATOPATIA REACIONAL, LIPIDOSE HEPÁTICA, HEPATITE, FIBROSE, INFILTRADO GORDUROSO".
       - Se diminuída/hipoecogênica difusa:
         -> diagDif: "HEPATITE AGUDA, CONGESTÃO HEPÁTICA".
       - Se heterogênea ou com nódulos:
         -> Descrever dimensões e diagDif: "HEPATOPATIA CRÔNICA, HIPERPLASIA NODULAR, PROCESSO NEOPLÁSICO".
     * Ducto colédoco e vias biliares (ATENÇÃO ESPECIAL a imagens de fígado/vesícula ou imagens extras sem sigla com caliper medindo estrutura tubular anecogênica):
       - Se houver estrutura tubular anecogênica dilatada e/ou tortuosa com paredes ecogênicas espessadas (ducto colédoco > 0,30 cm em cães ou > 0,40 cm em gatos):
         -> Descrever obrigatoriamente dilatação/tortuosidade do ducto colédoco, características da parede/conteúdo e a medida exata do caliper (ex.: "Observa-se acentuada dilatação e tortuosidade do ducto colédoco, preenchido por conteúdo anecogênico e apresentando paredes ecogênicas espessadas, medindo cerca de X,XX cm") e associar diagDif compatível ("OBSTRUÇÃO BILIAR EXTRA-HEPÁTICA, COLANGITE / COLANGIOHEPATITE, COLECISTITE").

4. BEXIGA - ESPESSURA PARIETAL, SEDIMENTOS E URÓLITOS:
   - Critérios métricos de espessura de parede:
     * Cães: normal até 0,25 cm. Acima de 0,25 cm -> "paredes espessadas, com margens internas irregulares".
     * Gatos: normal 0,13 a 0,15 cm. Acima de 0,15 cm -> "paredes espessadas, com margens internas irregulares".
   - Conteúdo luminal (DIFERENCIAR SEDIMENTÚRIA DE URÓLITOS):
     * Imagens marcadas como "SED" ou visualização de material/pontilhado ecogênico de aspecto celular em suspensão no lúmen anecogênico SEM sombra acústica posterior:
       -> Descrever: "Conteúdo anecogênico apresentando quantidade discreta/moderada/acentuada de material ecogênico de aspecto celular suspenso."
       -> diagDif: "SEDIMENTÚRIA, CISTITE, PROCESSO INFLAMATÓRIO URINÁRIO".
     * Imagens marcadas como "UROLITOS", "CALC" ou focos hiperecogênicos definidos COM forte sombra acústica posterior:
       -> Extrair as medidas de TODOS os calipers na bexiga (ex: "medindo cerca de 0,59 cm, 0,69 cm e 0,74 cm, acompanhados de sombra acústica distal").
       -> diagDif: "SEDIMENTOS ASSOCIADOS A URÓLITOS URINÁRIOS" ou "UROLÍTIASE, CISTITE".
     * Se apenas espessamento de parede sem cálculos/sedimentos: diagDif: "CISTITE".

5. ESTÔMAGO:
   - Parede: normal até 0,50 cm em cães e 0,36 cm em gatos. Se superior -> "paredes espessadas, medindo X,XX cm" com diagDif: "GASTRITE (AGUDA / CRÔNICA), ENTEROPATIA INFLAMATÓRIA, ULCERAÇÃO GÁSTRICA, PROCESSO NEOPLÁSICO INFILTRATIVO".
   - Descrever pregueamento mucoso e presença de gás/conteúdo fluido.

6. VESÍCULA BILIAR:
   - Parede: normal até 0,15 cm em cães e 0,10 cm em gatos. Se > 0,15 cm em cães (ou > 0,10 cm em gatos, ou com aspecto de duplo contorno/halo hipoecoico) -> "Paredes espessas, medindo X,XX cm" com diagDif: "COLECISTITE, EDEMA DA PAREDE VESICULAR".
   - Conteúdo:
     * Se sedimento ecogênico móvel em região dependente -> diagDif: "LAMA BILIAR, ESTASE BILIAR, COLANGITE".
     * Se padrão estrelado/septado em roda de carroça imóvel -> diagDif: "MUCOCELE BILIAR".
     * Se cálculos com sombra acústica -> diagDif: "COLELITÍASE, COLECISTITE".

7. ALÇAS INTESTINAIS:
   - Extrair medidas dos calipers nas imagens DUO (duodeno), JJ (jejuno) e CD (cólon descendente) respeitando o porte e a espécie:
     * Cães: duodeno normal até 0,50 cm (pequeno/médio porte) ou 0,60 cm (grande porte); jejuno normal até 0,40 cm; cólon normal até 0,25 cm. Acima de 0,50 cm em cães de pequeno/médio porte (ex.: 0,52 cm) -> descrever discreto espessamento parietal em duodeno com diagDif: "DUODENITE / ENTEROPATIA INFLAMATÓRIA".
     * Gatos: duodeno normal até 0,26 cm; jejuno normal até 0,26 cm; cólon normal até 0,17 cm.
   - Somente laudar espessamento parietal se ultrapassar a referência da espécie/porte OU se houver perda/alteração da estratificação parietal em camadas.

8. GLÂNDULAS ADRENAIS:
   - Extrair as 3 medidas de AE e AD quando visíveis (polo cranial, polo caudal e comprimento). Se formato preservado -> dimensões preservadas. Se aumento nodular assimétrico -> diagDif: "HIPERADRENOCORTICISMO, NEOPLASIA ADRENAL".

9. CAVIDADE ABDOMINAL E LINFONODOS ABDOMINAIS:
   - Líquido livre: se houver qualquer acúmulo de líquido anecogênico ou ecogênico/celular interalças ou próximo à bexiga/fígado/baço -> descrever volume (discreto/moderado/acentuado) e características, atribuindo diagDif: "EFUSÃO PERITONEAL / ASCITE / HEMOABDOME / PERITONITE".
   - Linfonodos (mesentéricos, ilíacos, hepáticos, etc.): se houver imagem focada em linfonodo ou aumento de volume/arredondamento/hipoecogenicidade/heterogeneidade -> descrever dimensões dos calipers e atribuir diagDif: "LINFADENOPATIA REACIONAL, PROCESSO INFLAMATÓRIO/INFECCIOSO, NEOPLASIA (LINFOMA / METÁSTASE)".
   - Mesentério / peritônio: se houver hiperecogenicidade focal ou difusa da gordura abdominal -> descrever reatividade mesentérica ("PERITONITE / ESTEATITE / PANCREATITE").

10. BAÇO — LESÕES FOCAIS, NÓDULOS E MASSAS (ALÉM DE ESPLENOMEGALIA):
   - Inspecione cuidadosamente TODO o parênquima esplênico quanto a nódulos/massas (hipoecogênicos, hiperecogênicos, mistos ou cavitados), aspecto heterogêneo "rendilhado / em queijo suíço" ou focos hiperecogênicos (mielolipomas).
   - Se houver qualquer nódulo/massa -> descrever localização, ecogenicidade, contornos e TODAS as medidas dos calipers, atribuindo diagDif: "HIPERPLASIA NODULAR, HEMATOMA, NEOPLASIA ESPLÊNICA (HEMANGIOSSARCOMA / LINFOMA / MASTOCITOMA)".

11. ÚTERO E OVÁRIOS (FÊMEAS):
   - Se houver distensão luminal dos cornos uterinos (CUE/CUD) ou corpo uterino COM acúmulo claramente visível de conteúdo anecogênico, hipoecogênico ou ecogênico/flocular em seu interior, ou cistos endometriais evidentes -> descrever diâmetros dos calipers e conteúdo, atribuindo diagDif: "PIOMETRA / MUCOMETRA / HEMOMETRA / HIPERPLASIA ENDOMETRIAL CÍSTICA". Se o útero tiver paredes finas/homogêneas e ausência de conteúdo intraluminal visível, não sugerir piometra apenas pelo diâmetro isolado.
   - Se houver estruturas císticas anecogênicas ou massas em topografia ovariana (OE/OD) -> descrever dimensões e atribuir diagDif: "CISTO OVARIANO / NEOPLASIA OVARIANA".
   - Se houver vesículas gestacionais ou fetos -> descrever viabilidade/achados compatíveis com gestação.

12. PRÓSTATA E TESTÍCULOS (MACHOS):
   - Próstata (PTT/PROST): se aumentada de volume, assimétrica, heterogênea ou com cavitações/cistos anecogênicos intraparenquimatosos ou paraprostáticos -> descrever dimensões e achados, atribuindo diagDif: "HIPERPLASIA PROSTÁTICA BENIGNA (HPB), CISTOS PROSTÁTICOS, PROSTATITE, NEOPLASIA PROSTÁTICA".
   - Testículos (TE/TD): se houver nódulos, heterogeneidade, assimetria ou localização intra-abdominal/inguinal -> descrever achados e atribuir diagDif: "NEOPLASIA TESTICULAR (SERTOLIOMA / SEMINOMA / LEYDIGOMA), ORQUITE, CRIPTORQUIDISMO".

13. PÂNCREAS:
   - Se houver imagem marcada "PANC" com caliper (ex.: 0,50 cm), SEMPRE informe que o pâncreas foi parcialmente visibilizado com a medida aferida do ramo pancreático (ex.: "Medindo ramo direito X,XX cm") — nunca ignore a imagem devolvendo apenas "Sem alteração em topografia de pâncreas".
   - Se houver aumento de espessura/volume, parênquima hipoecogênico ou heterogêneo e/ou hiperecogenicidade da gordura peripancreática -> descrever achados e atribuir diagDif: "PANCREATITE AGUDA / CRÔNICA, EDEMA PANCREÁTICO, NEOPLASIA PANCREÁTICA".

14. PROTOCOLO RIGOROSO ANTI-VIÉS DE NORMALIDADE (REGRA DE OURO):
   - NUNCA entre em piloto automático de normalidade! Para CADA imagem enviada, você DEVE primeiro inspecionar visualmente o parênquima, contornos, paredes, conteúdo luminal, sombra acústica, estruturas adjacentes e TODOS os calipers antes de redigir o laudo.
   - IMAGENS SEM SIGLA OU EXTRAS COM CALIPER: se houver qualquer imagem sem sigla no canto (ou fora da rotina) contendo um caliper medindo uma estrutura (ex.: ducto colédoco dilatado, nódulo, linfonodo, massa, cálculo), NUNCA ignore essa imagem! Identifique a estrutura pelo contexto anatômico e reporte a alteração e a medida exata no órgão correspondente.
   - HISTÓRICO NO CABEÇALHO DO APARELHO: se o cabeçalho do aparelho trouxer indicação de castração (ex.: "CASTRAD", "CASTRADA", "OSH", "ORQ"), utilize essa informação ao laudar útero/ovários ou testículos.
   - Se QUALQUER imagem de um órgão mostrar alteração visual (ecogenicidade alterada, heterogeneidade, nódulo/massa, cisto, cálculo/sedimento celular suspenso, lama biliar, espessamento parietal, perda de estratificação ou diferenciação córtico-medular, dilatação ductal/pielocalicial, líquido livre, linfonodomegalia, baço adjacente à bexiga ou ultrapassando rim esquerdo) OU se qualquer medida nos calipers ultrapassar a faixa normal para a espécie/porte (parede vesical > 0,25 cm cão / > 0,15 cm gato; parede gástrica > 0,50 cm cão / > 0,36 cm gato; parede vesícula biliar > 0,15 cm cão / > 0,10 cm gato; adrenal > 0,74 cm cão / > 0,48 cm gato):
     -> É TERMINANTEMENTE PROIBIDO copiar a frase de normalidade daquele órgão!
     -> Reescreva a descrição daquele órgão reportando objetivamente CADA alteração visual e métrica observada e inclua os diagnósticos diferenciais compatíveis.
   - As frases padrão de normalidade só podem ser usadas quando a inspeção visual daquele órgão confirmar ausência de alterações.
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

2. SEQUÊNCIA EXATA, CAPITALIZAÇÃO E REFERÊNCIA DE ESTILO DOS ÓRGÃOS:
   Você DEVE utilizar exatamente os nomes de órgãos abaixo (respeitando maiúsculas/minúsculas exatas).
   ATENÇÃO CRÍTICA: As frases abaixo são APENAS referência de estilo/vocabulário para quando o órgão estiver CONFIRMADA E VISIVELMENTE NORMAL na inspeção das imagens. Se a imagem mostrar QUALQUER alteração (ecogenicidade, contornos, espessamento, sedimento/cálculo, lama biliar, nódulo/massa, cisto, distensão, perda de diferenciação, líquido livre ou medida fora da referência), NÃO copie a frase de normalidade — adapte/reescreva a descrição no estilo técnico do médico relatando todas as alterações reais visíveis e as medidas dos calipers ("Dist X.XX cm" / "1 L X.XX cm"):
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

3. REFERÊNCIA DE ESTILO POR ÓRGÃO (USAR APENAS QUANDO VISUALMENTE NORMAL — REESCREVER SEMPRE QUE HOUVER ALTERAÇÃO NA IMAGEM):
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
  if (opcoes?.usarMockLocal === true && isAmbienteLocalSeguro(opcoes.req || null)) {
    console.log('🧪 [MODO LOCAL - 0 TOKENS] Gerando laudo de ultrassom simulado sem chamar API Gemini.');
    return gerarAnaliseUltrassomMock(caminhoImagens, opcoes);
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelosCandidatos = [
    'gemini-3.8-flash'
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

PASSO OBRIGATÓRIO DE RACIOCÍNIO CLÍNICO (SIGA ESTA ORDEM EXATA NO JSON):
1) PRIMEIRO preencha "classificacaoImagens" para CADA imagem de 0 a N-1: identifique "sigla" (ex: BEX, SED, RE, RD, BACO, EST, FIG, VB, DUO, JJ, CD, OE, OD, UTERO, TE, TD, PTT, AE, AD, PANC, LL), "orgao", todas as medidas dos calipers ("medidasLidas"), os "achadosVisuais" objetivos e "statusVisual" ("NORMAL", "ALTERADO" ou "NAO_VISUALIZADO").
2) SOMENTE DEPOIS preencha "laudo", garantindo 100% de coerência: todo órgão com qualquer imagem "ALTERADO" (ou medida fora da referência) DEVE descrever a alteração em "texto" (e preencher "diagDif" se o estilo usar), sendo PROIBIDO copiar frase de normalidade.

RETORNE EXCLUSIVAMENTE JSON VÁLIDO (sem markdown):
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
  "classificacaoImagens": [
    {
      "indice": 0,
      "sigla": "BEX",
      "orgao": "BEXIGA",
      "medidasLidas": ["1 D 0,34 cm"],
      "achadosVisuais": "achados objetivos da imagem (paredes, parênquima, conteúdo, sombra acústica, nódulos, contornos)",
      "statusVisual": "NORMAL | ALTERADO | NAO_VISUALIZADO"
    }
  ],
  "laudo": [
    {
      "orgao": "Nome do Órgão",
      "texto": "Descrição técnica fiel aos achados visuais observados nas imagens...",
      "diagDif": "DIAGNÓSTICOS DIFERENCIAIS EM CAIXA ALTA (ou vazio se normal ou se o médico não usar DIAG DIF.)"
    }
  ]
}
`;

  const promptFinal = promptInstrucoes;

  const conteudoMultimodal = [promptFinal];
  caminhoImagens.forEach((p, idx) => {
    const ext = path.extname(p).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    conteudoMultimodal.push(`
--- [IMAGEM ${idx} | Arquivo: ${path.basename(p)}] ---
`);
    conteudoMultimodal.push(fileToGenerativePart(p, mime));
  });

  const NIVEIS_THINKING_VALIDOS = new Set(['LOW', 'MEDIUM', 'HIGH', 'XHIGH']);
  const obterGenerationConfig = (nomeModelo) => {
    if (/hydrogen/i.test(nomeModelo || '')) {
      const nivelEnv = String(process.env.GEMINI_HYDROGEN_THINKING_LEVEL || 'HIGH').trim().toUpperCase();
      const thinkingLevel = NIVEIS_THINKING_VALIDOS.has(nivelEnv) ? nivelEnv : 'HIGH';
      return {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel }
      };
    }
    return {
      temperature: 0.15,
      topP: 0.9,
      responseMimeType: 'application/json'
    };
  };

  let ultimoErro = null;
  const apiKeyLimpa = String(apiKey || '').trim();
  const paidApiKey = String(
    opcoes.paidApiKey ||
    process.env.GEMINI_API_KEY_PAID ||
    process.env.GEMINI_PAID_API_KEY ||
    ''
  ).trim();

  const executarChamadaModelo = async (client, nomeModelo, rotuloChave, maxTentativas = 2) => {
    const generationConfig = obterGenerationConfig(nomeModelo);
    const nivelThinkingAtivo = generationConfig?.thinkingConfig?.thinkingLevel || null;
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        console.log(`🤖 [${rotuloChave}] Chamando modelo ${nomeModelo}${nivelThinkingAtivo ? ` [thinking: ${nivelThinkingAtivo}]` : ''} (tentativa ${tentativa}/${maxTentativas})...`);
        const model = client.getGenerativeModel({ model: nomeModelo, generationConfig });
        const result = await model.generateContent(conteudoMultimodal);
        const responseText = result.response.text().trim();

        const jsonClean = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const jsonParsed = JSON.parse(jsonClean);

        const resumoTokens = calcularResumoTokens(
          result?.response?.usageMetadata,
          nomeModelo,
          rotuloChave,
          caminhoImagens.length
        );
        if (resumoTokens) {
          if (nivelThinkingAtivo) resumoTokens.thinkingLevel = nivelThinkingAtivo;
          jsonParsed.usoTokens = resumoTokens;
          console.log(
            `📊 [TOKENS LAUDO] Modelo: ${resumoTokens.modelo}${nivelThinkingAtivo ? ` [${nivelThinkingAtivo}]` : ''} (${resumoTokens.chave}) | Imagens: ${resumoTokens.imagensQtd} | Entrada: ${resumoTokens.promptTokens} | Saída: ${resumoTokens.outputTokens}${resumoTokens.thoughtsTokens ? ` (thinking: ${resumoTokens.thoughtsTokens})` : ''} | Total: ${resumoTokens.totalTokens} tokens | Custo est.: US$ ${resumoTokens.custoEstimadoUsd}`
          );
        }

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
        const status = err?.status || err?.response?.status || '';
        const ehTransitorio = status === 503 || status === 429 || /503|429|high demand|overloaded|temporarily/i.test(String(err?.message || ''));
        console.warn(`⚠️ [${rotuloChave}] Tentativa ${tentativa}/${maxTentativas} com ${nomeModelo} falhou: ${err.message}${err.cause ? ' (Detalhe: ' + (err.cause.code || err.cause.message) + ')' : ''}.`);
        ultimoErro = err;
        if (tentativa < maxTentativas && ehTransitorio) {
          await new Promise(res => setTimeout(res, 3000));
          continue;
        }
        break;
      }
    }
    return null;
  };

  // FASE 1: Chave Principal / Free Tier (gemini-3.8-flash)
  for (const nomeModelo of modelosCandidatos) {
    const resFree = await executarChamadaModelo(genAI, nomeModelo, 'CHAVE FREE', 2);
    if (resFree) return resFree;
  }

  // FASE 2: Fallback para a Chave Paga (se configurada e diferente da principal)
  if (paidApiKey && paidApiKey !== apiKeyLimpa) {
    const { usarHydrogenPago } = obterConfigIaRuntime();
    const modelosPagos = usarHydrogenPago
      ? ['gemini-4-hydrogen', 'gemini-3.8-flash']
      : ['gemini-3.8-flash'];
    console.log(`💳 [ANALISADOR IA] Chave principal/free indisponível ou esgotada. Acionando fallback para CHAVE PAGA (fila: ${modelosPagos.join(' -> ')})...`);
    const genAIPaid = new GoogleGenerativeAI(paidApiKey);

    for (const nomeModeloPago of modelosPagos) {
      const resPago = await executarChamadaModelo(genAIPaid, nomeModeloPago, 'CHAVE PAGA', 2);
      if (resPago) return resPago;
    }
  } else if (!paidApiKey) {
    console.warn(`⚠️ [ANALISADOR IA] Fallback pago NÃO acionado: GEMINI_API_KEY_PAID (ou GEMINI_PAID_API_KEY) não está definida no ambiente.`);
  } else {
    console.warn(`⚠️ [ANALISADOR IA] Fallback pago ignorado: GEMINI_API_KEY_PAID é idêntica à GEMINI_API_KEY principal.`);
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

const GRUPOS_SIGLAS_CANONICOS = [
  { match: /BEXIGA|VESICA/i, chaves: ['BEX', 'BEXIGA', 'SED', 'SEDIMENTO', 'UROLITO', 'CALC', 'CALCULO', 'URETER'] },
  { match: /RIM\s*ESQUERDO|^RE$/i, chaves: ['RE', 'RIM ESQUERDO', 'RIME', 'RIM E', 'R.E'] },
  { match: /RIM\s*DIREITO|^RD$/i, chaves: ['RD', 'RIM DIREITO', 'RIMD', 'RIM D', 'R.D'] },
  { match: /^RINS$/i, chaves: ['RE', 'RIM ESQUERDO', 'RIME', 'RIM E', 'R.E', 'RD', 'RIM DIREITO', 'RIMD', 'RIM D', 'R.D'] },
  { match: /BACO|ESPLEN/i, chaves: ['BACO', 'BAÇO', 'B', 'ESPLEN', 'ESPLENO'] },
  { match: /ESTOMAGO|GASTR/i, chaves: ['EST', 'ESTOMAGO', 'ESTÔMAGO'] },
  { match: /FIGADO|HEPAT/i, chaves: ['FIG', 'FIGADO', 'FÍGADO', 'HEP'] },
  { match: /VESICULA/i, chaves: ['VB', 'VESICULA BILIAR', 'VESÍCULA BILIAR', 'VESICULA', 'VESÍCULA'] },
  { match: /ALCAS|INTESTIN|DUODENO|JEJUNO|COLON/i, chaves: ['DUO', 'DUODENO', 'JJ', 'JEJUNO', 'CD', 'COLON', 'CÓLON', 'COLON DESCENDENTE', 'CÓLON DESCENDENTE'] },
  { match: /OVARIO/i, chaves: ['OE', 'OVARIO ESQUERDO', 'OVÁRIO ESQUERDO', 'TOP OE', 'OD', 'OVARIO DIREITO', 'OVÁRIO DIREITO', 'TOP OD'] },
  { match: /UTERO/i, chaves: ['UTERO', 'ÚTERO', 'CUE', 'CUD', 'CORPO UTERINO'] },
  { match: /TESTICULO/i, chaves: ['TE', 'TESTICULO ESQUERDO', 'TESTÍCULO ESQUERDO', 'TD', 'TESTICULO DIREITO', 'TESTÍCULO DIREITO'] },
  { match: /PROSTATA/i, chaves: ['PTT', 'PROSTATA', 'PRÓSTATA', 'PROST'] },
  { match: /ADRENAL/i, chaves: ['AE', 'ADRENAL ESQUERDA', 'ADRE', 'AD', 'ADRENAL DIREITA', 'ADRD'] },
  { match: /PANCREAS/i, chaves: ['PANC', 'PANCREAS', 'PÂNCREAS'] },
  { match: /CAVIDADE|LIQUIDO\s*LIVRE/i, chaves: ['LL', 'LIQUIDO LIVRE', 'LÍQUIDO LIVRE', 'CAVIDADE'] }
];

function construirMapaPrioridades(ordemOrgaos = []) {
  if (!Array.isArray(ordemOrgaos) || ordemOrgaos.length === 0) {
    return MAPA_ORDEM_CANONICA;
  }
  // Escala por 10 para manter sub-ordem estável (ex: DUO antes de JJ antes de CD; AE antes de AD)
  const novoMapa = {};
  for (const [chave, pBase] of Object.entries(MAPA_ORDEM_CANONICA)) {
    novoMapa[normalizarTexto(chave)] = 500 + pBase;
  }
  ordemOrgaos.forEach((org, idx) => {
    const basePrio = (idx + 1) * 10;
    const orgNorm = normalizarTexto(org);
    novoMapa[orgNorm] = basePrio;
    for (const grupo of GRUPOS_SIGLAS_CANONICOS) {
      if (grupo.match.test(orgNorm)) {
        grupo.chaves.forEach((ch, subIdx) => {
          const chNorm = normalizarTexto(ch);
          // Preserva prioridade mais cedo se um grupo cobrir dois tópicos (ex: UTERO / OVARIOS)
          const cand = basePrio + (subIdx * 0.1);
          if (novoMapa[chNorm] === undefined || novoMapa[chNorm] >= 500) {
            novoMapa[chNorm] = cand;
          }
        });
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

  // 1. Correspondência exata por sigla (ex: "RE", "EST", "B", "DUO", "AD")
  if (sigla && mapa[sigla] !== undefined) return mapa[sigla];
  // Sigla composta (ex: "B / R" ou "BACO / BEX") -> pega o primeiro token
  if (sigla) {
    const primeiroToken = sigla.split(/[\s/,+-]+/).filter(Boolean)[0];
    if (primeiroToken && mapa[primeiroToken] !== undefined) return mapa[primeiroToken];
  }
  // 2. Correspondência exata por nome do órgão
  if (orgao && mapa[orgao] !== undefined) return mapa[orgao];
  // 3. Correspondência por grupo anatômico (sem jamais fazer includes de siglas curtas como "RE" em "ADRENAL")
  for (const grupo of GRUPOS_SIGLAS_CANONICOS) {
    if (orgao && grupo.match.test(orgao)) {
      for (const ch of grupo.chaves) {
        const chNorm = normalizarTexto(ch);
        if (mapa[chNorm] !== undefined) return mapa[chNorm];
      }
    }
  }
  return 999;
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

    const temAlteracaoRins = Boolean(
      (itemRins.diagDif && String(itemRins.diagDif).trim()) ||
      /(perda\s+da\s+diferencia|hiperecogen|hipoecogen|heterog[eê]ne|lit[ií]ase|c[aá]lculo|hidronefrose|pielectasia|dilata[çc][aã]o|cisto|n[oó]dulo|massa|irregulares|aumentad|diminu[ií]d|alterad|nefropatia|mineraliza)/i.test(textoRins)
    );

    function adaptarTextoRim(base, medida, fraseCustom) {
      // NUNCA sobrescreve com frase de normalidade se a IA detectou alteração real!
      if (!temAlteracaoRins && fraseCustom) {
        let fc = fraseCustom;
        if (medida && /X[,.]XX\s*cm/i.test(fc)) {
          fc = fc.replace(/X[,.]XX\s*cm/i, `${medida} cm`);
        }
        return fc;
      }
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
        } else if (!t.includes(medida)) {
          t = `${t} (medindo aproximadamente ${medida} cm)`;
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

    const diagCombinado = [...new Set([itemRE.diagDif, itemRD.diagDif].filter(Boolean))].join(', ');
    const regexAltRim = /(perda\s+da\s+diferencia|hiperecogen|hipoecogen|heterog[eê]ne|lit[ií]ase|c[aá]lculo|hidronefrose|pielectasia|dilata[çc][aã]o|cisto|n[oó]dulo|massa|irregulares|aumentad|diminu[ií]d|alterad|nefropatia|mineraliza)/i;
    const houveAlteracao = Boolean(
      diagCombinado ||
      regexAltRim.test(itemRE.texto || '') ||
      regexAltRim.test(itemRD.texto || '')
    );
    // Se houve qualquer alteração em RE ou RD, preserva integralmente as descrições da IA
    const textoUnificado = houveAlteracao
      ? `Rim esquerdo: ${itemRE.texto || ''}
Rim direito: ${itemRD.texto || ''}`.trim()
      : `Localizados em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas (RE: ${reStr} cm; RD: ${rdStr} cm). Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litíase ou hidronefrose.`;
    const itemRinsUnificado = {
      orgao: 'RINS',
      texto: textoUnificado,
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
  obterConfigIaRuntime,
  salvarConfigIaRuntime,
  isAmbienteLocalSeguro,
  deveUsarMockLocal,
  gerarAnaliseUltrassomMock,
  construirPromptClonado,
  construirPromptPadraoVetaro,
  ordenarImagensCanonicamente,
  construirMapaPrioridades,
  sanitizarDadosPaciente,
  reconciliarLaudoComOrdemOrgaos,
  MAPA_ORDEM_CANONICA
};

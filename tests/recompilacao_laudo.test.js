const fs = require('fs');
const path = require('path');
const os = require('os');
const { gerarDocumentosExame } = require('../motor_laudo');
const { gerarDocumentosCirurgicos } = require('../motor_cirurgia');

describe('Recompilação e Edição de Laudos e Cirurgias (motor_laudo.js e motor_cirurgia.js)', () => {
  jest.setTimeout(90000);
  const tmpDir = path.join(os.tmpdir(), `teste_recompilacao_${Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  const pacienteInicial = {
    nome: 'Thor',
    especie: 'Canina',
    raca: 'Golden Retriever',
    idade: '5 anos',
    tutor: 'Carlos Silva',
    sexo: 'Macho',
    data: '19/11/2026'
  };

  const laudoOriginal = [
    { orgao: 'BEXIGA', texto: 'Repleta, paredes finas e regulares.', diagDif: '' },
    { orgao: 'FÍGADO', texto: 'Dimensões normais, contornos regulares.', diagDif: '' },
    { orgao: 'ALÇAS INTESTINAIS', texto: 'Conteúdo mucoso habitual, peristaltismo presente.', diagDif: '' }
  ];

  test('deve recompilar laudo de ultrassom após remover um órgão e editar o texto de outro', async () => {
    // Simula remoção de "ALÇAS INTESTINAIS" e edição da "BEXIGA"
    const laudoModificado = [
      { orgao: 'BEXIGA', texto: 'Repleta, com presença de discreto sedimento em suspensão.', diagDif: 'Sugere cistite incipiente' },
      { orgao: 'FÍGADO', texto: 'Dimensões normais, contornos regulares.', diagDif: '' }
    ];

    const pacienteModificado = {
      ...pacienteInicial,
      nome: 'Thor da Silva' // Alteração no nome do paciente
    };

    const pastaSaida = path.join(tmpDir, 'ultrassom_recompilado');
    fs.mkdirSync(pastaSaida, { recursive: true });

    const docs = await gerarDocumentosExame(
      pacienteModificado,
      laudoModificado,
      [],
      pastaSaida,
      null,
      {
        usuario: {
          nome: 'Dra. Camila Bastos',
          crmv: 'CRMV/MG: 22904',
          nomeClinica: 'Vetaro'
        }
      }
    );

    expect(docs).toHaveProperty('caminhoPdf');
    expect(docs).toHaveProperty('caminhoDocx');
    expect(fs.existsSync(docs.caminhoPdf)).toBe(true);
    expect(fs.existsSync(docs.caminhoDocx)).toBe(true);

    // O arquivo DOCX gerado deve ter tamanho > 0
    const statsDocx = fs.statSync(docs.caminhoDocx);
    expect(statsDocx.size).toBeGreaterThan(1000);

    // O arquivo PDF gerado deve ter tamanho > 0
    const statsPdf = fs.statSync(docs.caminhoPdf);
    expect(statsPdf.size).toBeGreaterThan(1000);
  }, 90000);

  test('deve recompilar relatório cirúrgico após edição de técnica e considerações', async () => {
    const cirurgiaModificada = {
      procedimento: 'Orquiectomia Pré-Escrotal Eletiva',
      diagnosticoPreCirurgico: 'Eletiva / Controle Populacional',
      descricaoProcedimento: 'Incisão mediana pré-escrotal. Isolamento dos cordões espermáticos. Hemostasia com fio absorvível 2-0. Dermorrafia em padrão intradérmico.',
      evolucaoConsideracoes: 'Paciente acordou estável, sem sangramentos. Prescrito analgésico e colar elisabetano.'
    };

    const pastaSaida = path.join(tmpDir, 'cirurgia_recompilada');
    fs.mkdirSync(pastaSaida, { recursive: true });

    const docs = await gerarDocumentosCirurgicos(
      pacienteInicial,
      cirurgiaModificada,
      pastaSaida,
      [],
      {
        usuario: {
          nome: 'Dra. Camila Bastos',
          crmv: 'CRMV/MG: 22904',
          nomeClinica: 'Vetaro'
        }
      }
    );

    expect(docs).toHaveProperty('caminhoPdf');
    expect(docs).toHaveProperty('caminhoDocx');
    expect(fs.existsSync(docs.caminhoPdf)).toBe(true);
    expect(fs.existsSync(docs.caminhoDocx)).toBe(true);

    const statsDocx = fs.statSync(docs.caminhoDocx);
    expect(statsDocx.size).toBeGreaterThan(1000);
  }, 90000);

  test('deve extrair texto e órgãos de um arquivo DOCX gerado utilizando JSZip', async () => {
    const JSZip = require('jszip');
    const pastaSaida = path.join(tmpDir, 'ultrassom_recompilado');
    const docxPath = path.join(pastaSaida, 'THOR DA SILVA - CARLOS SILVA.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
    const xml = await zip.file('word/document.xml').async('text');
    expect(xml).toContain('BEXIGA');
    expect(xml).toContain('FÍGADO');
    expect(xml).toContain('Thor da Silva');
  });

  test('arquivos de favicon oficial existem e possuem tamanhos válidos', () => {
    const pubIco = path.resolve(__dirname, '../frontend/public/favicon.ico');
    const pubPng = path.resolve(__dirname, '../frontend/public/favicon.png');
    const pubSvg = path.resolve(__dirname, '../frontend/public/favicon.svg');
    const distDir = path.resolve(__dirname, '../frontend/dist');
    const distIco = path.resolve(distDir, 'favicon.ico');

    expect(fs.existsSync(pubIco)).toBe(true);
    expect(fs.existsSync(pubPng)).toBe(true);
    expect(fs.existsSync(pubSvg)).toBe(true);
    if (fs.existsSync(distDir)) {
      expect(fs.existsSync(distIco)).toBe(true);
    }

    expect(fs.statSync(pubIco).size).toBeGreaterThan(100);
    expect(fs.statSync(pubPng).size).toBeGreaterThan(100);
    expect(fs.statSync(pubSvg).size).toBeGreaterThan(100);
  });
});

const fs = require('fs');
const path = require('path');
const {
  decodificarPng,
  codificarPng,
  recortarImagemRgba,
  trimImagemRgba
} = require('../extrator_ativos_pdf');
const {
  mapearChaveCampoPaciente,
  normalizarRotuloResponsavel,
  extrairPadraoCompletoDePdfs
} = require('../extrator_padrao_laudo');
const {
  formatarNomeOrgaoCase,
  sanitizarParagrafoOrgao,
  gerarHtmlTemplateClonado
} = require('../motor_laudo');

describe('Motor 100% Agnóstico de Clonagem Visual e Textual de Laudos (1 a 10 PDFs)', () => {
  test('formatarNomeOrgaoCase converte corretamente Sentence Case e preserva Alças Intestinais', () => {
    expect(formatarNomeOrgaoCase('BEXIGA:', 'SENTENCE_CASE')).toBe('Bexiga');
    expect(formatarNomeOrgaoCase('RIM ESQUERDO', 'SENTENCE_CASE')).toBe('Rim esquerdo');
    expect(formatarNomeOrgaoCase('ALÇAS INTESTINAIS', 'SENTENCE_CASE')).toBe('Alças Intestinais');
    expect(formatarNomeOrgaoCase('bexiga', 'UPPERCASE')).toBe('BEXIGA');
  });

  test('mapearChaveCampoPaciente identifica rótulos variados de fichas veterinárias', () => {
    expect(mapearChaveCampoPaciente('Paciente:')).toBe('nome');
    expect(mapearChaveCampoPaciente('Proprietário (a):')).toBe('tutor');
    expect(mapearChaveCampoPaciente('Tutor(a):')).toBe('tutor');
    expect(mapearChaveCampoPaciente('Médico(a) Veterinário(a) Requisitante:')).toBe('requisitante');
    expect(mapearChaveCampoPaciente('Espécie:')).toBe('especie');
  });

  test('sanitizarParagrafoOrgao preserva sub-itens com traço (- ), Obs.: em itálico e elimina duplicação de DIAG DIF.:', () => {
    const itemAdrenais = {
      orgao: 'ADRENAIS',
      texto: 'Topografia, morfologia e tamanho usuais.\n- Adrenal esquerda medindo 0,45 cm.\n- Adrenal direita medindo 0,34 cm.',
      diagDif: ''
    };
    const htmlAdrenais = sanitizarParagrafoOrgao(itemAdrenais, {
      organLabelCase: 'UPPERCASE',
      usarDiagDifSeparado: false,
      usarSubitensComTraco: true,
      usarObsItalico: true
    });
    expect(htmlAdrenais).toContain('<strong>ADRENAIS:</strong>');
    expect(htmlAdrenais).toContain('<br>- Adrenal esquerda');
    expect(htmlAdrenais).toContain('<br>- Adrenal direita');

    const itemEstomago = {
      orgao: 'ESTÔMAGO',
      texto: 'Topografia usual.\nObs.: A repleção por conteúdo gasoso impede a avaliação completa.',
      diagDif: ''
    };
    const htmlEstomago = sanitizarParagrafoOrgao(itemEstomago, {
      organLabelCase: 'UPPERCASE',
      usarDiagDifSeparado: false,
      usarObsItalico: true
    });
    expect(htmlEstomago).toContain('class="obs-italic-line"');

    const itemDuplicado = {
      orgao: 'OVÁRIOS',
      texto: 'Sugestivo de distensão. DIAG DIF.: PIOMETRA, MUCOMETRA. DIAG DIF.: DIAG DIF.: PIOMETRA, MUCOMETRA.',
      diagDif: 'DIAG DIF.: PIOMETRA, MUCOMETRA.'
    };
    const htmlVetaro = sanitizarParagrafoOrgao(itemDuplicado, {
      organLabelCase: 'UPPERCASE',
      usarDiagDifSeparado: true
    });
    const ocorrencias = (htmlVetaro.match(/DIAG DIF\./g) || []).length;
    expect(ocorrencias).toBe(1);
  });

  test('decodificarPng, recortarImagemRgba e codificarPng funcionam em Node puro', () => {
    // Cria uma imagem RGBA 20x20 sintética em memória
    const data = Buffer.alloc(20 * 20 * 4, 255);
    // Desenha um quadrado escuro no centro
    for (let y = 5; y < 15; y++) {
      for (let x = 5; x < 15; x++) {
        const idx = (y * 20 + x) * 4;
        data[idx] = 20;
        data[idx + 1] = 30;
        data[idx + 2] = 40;
        data[idx + 3] = 255;
      }
    }
    const pngBuf = codificarPng({ width: 20, height: 20, data });
    const decoded = decodificarPng(pngBuf);
    expect(decoded.width).toBe(20);
    expect(decoded.height).toBe(20);

    const recorte = recortarImagemRgba(decoded, { x0: 2, y0: 2, x1: 18, y1: 18 }, { removerFundoBranco: true });
    expect(recorte.width).toBe(16);
    expect(recorte.height).toBe(16);
  });

  test('gerarHtmlTemplateClonado renderiza tabela com bordas (boxed_table), margens 20mm e omite órgãos do sexo oposto', () => {
    const layoutCarolina = {
      modo_template: 'clonado_pdf',
      visual_config_json: {
        stationeryMode: 'full_page_background',
        headerMode: 'full_page_stationery',
        repeatHeaderOnTextPage2: true,
        repeatHeaderOnImagePages: true,
        margins: {
          topFirstPage: '51mm',
          topContinuationPages: '51mm',
          bottom: '26mm',
          left: '20mm',
          right: '20mm'
        },
        patientHeader: {
          layoutType: 'boxed_table',
          valueCase: 'TITLE_CASE',
          sexoAbreviado: true,
          rows: [
            [
              { key: 'nome', label: 'Paciente:', widthPct: 75 },
              { key: 'data', label: 'Data:', widthPct: 25 }
            ],
            [
              { key: 'especie', label: 'Espécie:', widthPct: 25 },
              { key: 'raca', label: 'Raça:', widthPct: 31 },
              { key: 'sexo', label: 'Sexo:', widthPct: 16 },
              { key: 'idade', label: 'Idade:', widthPct: 28 }
            ],
            [{ key: 'tutor', label: 'Tutor(a):', widthPct: 100 }],
            [{ key: 'requisitante', label: 'Médico(a) Veterinário(a) Requisitante:', widthPct: 100 }]
          ]
        },
        titleConfig: {
          showTextTitle: false,
          text: ''
        },
        bodyTypography: {
          fontFamily: 'Calibri, Carlito, Arial, sans-serif',
          fontSize: '11pt',
          lineHeight: '1.38',
          paragraphSpacing: '8pt',
          textAlign: 'justify',
          organLabelCase: 'UPPERCASE',
          paginationMode: 'two_page_flow',
          firstPageOrganCount: 8
        },
        signatureConfig: {
          alignment: 'center',
          order: 'image_above_text',
          textLines: [
            { text: 'M. V. Carolina Costa Cardoso', bold: false, italic: true },
            { text: 'CRMV-MG 26.167', bold: false, italic: false }
          ]
        },
        imageGridConfig: {
          columns: 2,
          rowsPerPage: 3,
          colGapMm: '12.5mm',
          rowGapMm: '0mm',
          cardHeightMm: '56.5mm'
        }
      },
      writing_style_json: {
        usarDiagDifSeparado: false,
        usarSubitensComTraco: true,
        usarObsItalico: true,
        omitirOrgaosSexoOposto: true
      }
    };

    const dados = {
      nome: 'Loki',
      tutor: 'Luiza',
      sexo: 'Fêmea',
      especie: 'Canina',
      idade: '4 anos',
      raca: 'Pinscher',
      requisitante: 'Clara – Clínica Veterinária Lagoa Santa',
      data: '29/11/2025'
    };

    const laudo = [
      { orgao: 'BEXIGA', texto: 'Discretamente repleta.', diagDif: '' },
      { orgao: 'ADRENAIS', texto: 'Topografia usual.\n- Adrenal esquerda medindo 0,45 cm.\n- Adrenal direita medindo 0,33 cm.', diagDif: '' },
      { orgao: 'PRÓSTATA', texto: 'Topografia usual.', diagDif: '' },
      { orgao: 'TESTÍCULOS', texto: 'Não visibilizados.', diagDif: '' }
    ];

    const html = gerarHtmlTemplateClonado(dados, laudo, [], layoutCarolina);

    expect(html).toContain('patient-boxed-table');
    expect(html).toContain('Médico(a) Veterinário(a) Requisitante:');
    expect(html).toContain('<strong>Sexo:</strong> F');
    expect(html).toContain('M. V. Carolina Costa Cardoso');
    expect(html).not.toContain('<div class="report-title-box">');
    expect(html).not.toContain('PRÓSTATA');
    expect(html).not.toContain('TESTÍCULOS');
    expect(html).not.toContain('Michele Resende');
    expect(html).not.toContain('UPA PET');
  });

  test('trimImagemRgba apara margens brancas e calcula offsets exatos', () => {
    const data = Buffer.alloc(30 * 30 * 4, 255);
    for (let y = 10; y < 20; y++) {
      for (let x = 8; x < 22; x++) {
        const idx = (y * 30 + x) * 4;
        data[idx] = 15;
        data[idx + 1] = 25;
        data[idx + 2] = 35;
        data[idx + 3] = 255;
      }
    }
    const decoded = decodificarPng(codificarPng({ width: 30, height: 30, data }));
    const trimmed = trimImagemRgba(decoded, { padding: 2, removerFundoBranco: true });
    expect(trimmed.width).toBe(18);
    expect(trimmed.height).toBe(14);
    expect(trimmed.offsetX).toBe(6);
    expect(trimmed.offsetY).toBe(8);
  });

  test('gerarHtmlTemplateClonado suporta logo inline lateral (esquerda ou direita), repeticao de cabecalho/rodape e subtitulo', () => {
    const os = require('os');
    const tmpLogo = path.join(os.tmpdir(), `logo_test_${Date.now()}.png`);
    const data = Buffer.alloc(10 * 10 * 4, 40);
    fs.writeFileSync(tmpLogo, codificarPng({ width: 10, height: 10, data }));

    try {
      const html = gerarHtmlTemplateClonado(
        { nome: 'Thor', tutor: 'João', sexo: 'Macho', especie: 'Canina', idade: '3 anos', data: '18/11/2026' },
        [
          { orgao: 'BEXIGA', texto: 'Normal.' },
          { orgao: 'BAÇO', texto: 'Aumentado. DIAG DIF.: PROCESSO INFLAMATÓRIO.' }
        ],
        [],
        {
          modo_template: 'clonado_pdf',
          header_logo_url: tmpLogo,
          visual_config_json: {
            stationeryMode: 'inline_logo_header',
            headerMode: 'inline_logo_beside_patient',
            headerLogoBoxMm: { side: 'right', xMm: 162, yMm: 10, widthMm: 32, heightMm: 15 },
            repeatPatientHeaderOnTextPages: true,
            repeatPatientHeaderOnImagePages: true,
            margins: { topFirstPage: '10mm', topContinuationPages: '28mm', bottom: '14mm', left: '20mm', right: '20mm' },
            patientHeader: {
              layoutType: 'two_columns',
              bottomDivider: false,
              headerTopMm: 10,
              headerBottomMm: 22,
              colXPositionsMm: [20, 88],
              columns: [[{ key: 'nome', label: 'Nome:' }], [{ key: 'tutor', label: 'Tutor:' }]]
            },
            titleConfig: {
              showTextTitle: true,
              text: 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL',
              subtitle: 'Exame em modo B.',
              underline: false
            },
            bodyTypography: { fontSize: '10pt', lineHeight: '1.3', paragraphSpacing: '12pt', firstPageOrganCount: 1 },
            signatureConfig: { alignment: 'right', hasTopLine: false, textLines: [{ text: 'Dr. Teste', italic: true }] },
            footerConfig: { showOnTextPages: 'all_text_pages', showOnImagePages: true, disclaimerText: 'Aviso legal.', hasTopBorder: false }
          },
          writing_style_json: { usarDiagDifSeparado: true, usarTopicoConsideracoesSeparado: true }
        }
      );

      expect(html).toContain('inline-page-header');
      expect(html).toContain('left: 162mm;');
      expect(html).toContain('report-subtitle');
      expect(html).toContain('<em>DIAG DIF.: PROCESSO INFLAMATÓRIO.</em>');
      expect(html).not.toContain('inline-header-divider');
      expect(html).not.toContain('sig-top-line');
      expect(html).not.toContain('footer-top-border');
      expect((html.match(/inline-page-header/g) || []).length).toBeGreaterThanOrEqual(2);
    } finally {
      try { fs.unlinkSync(tmpLogo); } catch (_) {}
    }
  });

  test('normalizarRotuloResponsavel aplica regra universal Tutor -> Responsável', () => {
    expect(normalizarRotuloResponsavel('Tutor:')).toBe('Responsável:');
    expect(normalizarRotuloResponsavel('Tutor(a):')).toBe('Responsável:');
    expect(normalizarRotuloResponsavel('TUTOR:')).toBe('RESPONSÁVEL:');
    expect(normalizarRotuloResponsavel('TUTOR')).toBe('RESPONSÁVEL');
    expect(normalizarRotuloResponsavel('Nome:')).toBe('Nome:');
  });
});

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  resolverCaminhoArquivo,
  resolverContextoCirurgico,
  resolverOrdemSecoesCirurgia,
  resolverLegendaFoto
} = require('../motor_cirurgia');
const { normalizarUrlUploadPublica } = require('../gerenciador_usuarios');
const { sanitizarPerfilCirurgicoExtraido } = require('../identificador_padrao_cirurgia');

describe('Módulo Cirúrgico - Substituição de Logo, Padrão Cirúrgico e Legendas', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vetaro-cir-test-'));
  const logosDir = path.join(tmpDir, 'logos');
  fs.mkdirSync(logosDir, { recursive: true });
  const fakeLogoFile = path.join(logosDir, 'logo_user123_1700000000.png');
  // PNG 1x1 válido
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  fs.writeFileSync(fakeLogoFile, png1x1);

  const prevUploadDir = process.env.UPLOAD_PERSISTENT_DIR;

  beforeAll(() => {
    process.env.UPLOAD_PERSISTENT_DIR = tmpDir;
  });

  afterAll(() => {
    if (prevUploadDir === undefined) delete process.env.UPLOAD_PERSISTENT_DIR;
    else process.env.UPLOAD_PERSISTENT_DIR = prevUploadDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('normalizarUrlUploadPublica converte caminhos físicos Linux/Windows em URLs web /uploads/...', () => {
    expect(normalizarUrlUploadPublica('/app/uploads/logos/logo_abc.png')).toBe('/uploads/logos/logo_abc.png');
    expect(normalizarUrlUploadPublica('C:\\Users\\vet\\app\\uploads\\logos\\logo_abc.jpg')).toBe('/uploads/logos/logo_abc.jpg');
    expect(normalizarUrlUploadPublica('/uploads/assinaturas/assinatura_1.png')).toBe('/uploads/assinaturas/assinatura_1.png');
    expect(normalizarUrlUploadPublica(null)).toBeNull();
  });

  test('resolverCaminhoArquivo resolve URL web /uploads/logos/... com querystring usando UPLOAD_PERSISTENT_DIR', () => {
    const res = resolverCaminhoArquivo('/uploads/logos/logo_user123_1700000000.png?v=999', { usuarioId: 'user123' });
    expect(res).toBe(path.resolve(fakeLogoFile));
  });

  test('resolverCaminhoArquivo resolve caminho Windows legado por fallback de basename', () => {
    const res = resolverCaminhoArquivo('C:\\projetos\\upa\\uploads\\logos\\logo_user123_1700000000.png', { usuarioId: 'user123' });
    expect(res).toBe(path.resolve(fakeLogoFile));
  });

  test('resolverContextoCirurgico prioriza logo do usuário e também encontra ativosVisuais.headerLogoUrl', () => {
    const ctx1 = resolverContextoCirurgico({
      usuario: { id: 'user123', nome: 'Dra. Ana', nomeClinica: 'Clínica Vida', logoUrl: '/uploads/logos/logo_user123_1700000000.png' }
    });
    expect(ctx1.logoPath).toBe(path.resolve(fakeLogoFile));
    expect(ctx1.clinicaNome).toBe('Clínica Vida');

    const ctx2 = resolverContextoCirurgico({
      usuario: { id: 'outro', nome: 'Dr. João', nomeClinica: 'Vetaro' },
      perfilCirurgico: {
        ativo: true,
        clinicaDetectada: 'Hospital Pet Sul',
        templateVisual: {
          ativosVisuais: { headerLogoUrl: '/uploads/logos/logo_user123_1700000000.png' },
          tituloDocumento: 'DESCRIÇÃO CIRÚRGICA'
        }
      }
    });
    expect(ctx2.logoPath).toBe(path.resolve(fakeLogoFile));
    expect(ctx2.clinicaNome).toBe('Hospital Pet Sul');
    expect(ctx2.estiloVisualCirurgico.tituloDocumento).toBe('DESCRIÇÃO CIRÚRGICA');
  });

  test('resolverLegendaFoto usa legenda editada e faz fallback para legenda padrão', () => {
    const legendas = ['Figura 1 - Corpo estranho removido do jejuno', ''];
    expect(resolverLegendaFoto(0, legendas, 'Peça cirúrgica')).toBe('Figura 1 - Corpo estranho removido do jejuno');
    expect(resolverLegendaFoto(1, legendas, 'Peça cirúrgica')).toBe('Figura 2 - Peça cirúrgica');
    expect(resolverLegendaFoto(2, legendas)).toBe('Figura 3 - Registro fotográfico intraoperatório / peça cirúrgica');
  });

  test('sanitizarPerfilCirurgicoExtraido normaliza estrutura e remove CRMV do rodapé', () => {
    const perfil = sanitizarPerfilCirurgicoExtraido({
      nomeDetectado: 'Dra. Maria',
      crmvDetectado: 'CRMV/MG: 12345',
      clinicaDetectada: 'Centro Cirúrgico Vet',
      templateVisual: {
        tituloDocumento: 'RELATÓRIO DE CIRURGIA',
        estiloSecoes: 'barra-lateral',
        rodapeContato: 'CRMV/MG 12345 • Rua A, 100 - Tel (31) 9999-9999'
      }
    });
    expect(perfil.templateVisual.tituloDocumento).toBe('RELATÓRIO DE CIRURGIA');
    expect(perfil.templateVisual.estiloSecoes).toBe('barra-lateral');
    expect(perfil.templateVisual.rodapeContato).not.toMatch(/CRMV/i);
    expect(perfil.templateVisual.rotulosSecoes.procedimento).toBe('PROCEDIMENTO');
  });

  test('resolverContextoCirurgico aplica fontSizeBody até 30pt, fontSizeTitulo até 30pt e paragraphSpacing', () => {
    const ctx = resolverContextoCirurgico({
      usuario: { id: 'user123', nome: 'Dr. Matheus', nomeClinica: 'UPA PET' },
      perfilCirurgico: {
        ativo: true,
        templateVisual: {
          fontSizeBody: '20pt',
          fontSizeTitulo: '30pt',
          paragraphSpacing: '16pt'
        }
      }
    });
    expect(ctx.layout.font_size_body).toBe('20pt');
    expect(ctx.layout.font_size_titulo).toBe('30pt');
    expect(ctx.layout.paragraph_spacing).toBe('16pt');
    expect(ctx.cfgDocx.szCorpo).toBe(40);
    expect(ctx.cfgDocx.szTitulo).toBe(60);
    expect(ctx.cfgDocx.spacingAfter).toBe(320);
    expect(ctx.temFonteCorpoCustom).toBe(true);
    expect(ctx.temEspacamentoCustom).toBe(true);
  });

  test('override visual por relatório altera apenas o relatório atual sem mutar o perfil padrão', () => {
    const perfilPadrao = {
      ativo: true,
      templateVisual: {
        corPrimaria: '#1B365D',
        fontSizeBody: '11pt',
        fontSizeTitulo: '14pt',
        paragraphSpacing: '8pt'
      }
    };
    const estiloOverride = {
      corPrimaria: '#0D5C56',
      fontSizeBody: '14pt',
      fontSizeTitulo: '22pt',
      paragraphSpacing: '14pt'
    };
    const perfilEfetivo = {
      ...perfilPadrao,
      ativo: true,
      templateVisual: { ...perfilPadrao.templateVisual, ...estiloOverride }
    };
    const ctx = resolverContextoCirurgico({
      usuario: { id: 'user123', nome: 'Dr. Matheus' },
      perfilCirurgico: perfilEfetivo
    });
    expect(ctx.estiloVisualCirurgico.corPrimaria).toBe('#0D5C56');
    expect(ctx.layout.font_size_body).toBe('14pt');
    expect(ctx.layout.font_size_titulo).toBe('22pt');
    expect(ctx.layout.paragraph_spacing).toBe('14pt');
    expect(perfilPadrao.templateVisual.corPrimaria).toBe('#1B365D');
    expect(perfilPadrao.templateVisual.fontSizeBody).toBe('11pt');
  });

  test('resolverContextoCirurgico ignora cfgDocx antigo de layout e recalcula fontes/espaçamento do perfilCirurgico', () => {
    const ctx = resolverContextoCirurgico({
      usuario: { id: 'user123', nome: 'Dr. Matheus' },
      layout: { font_size_body: '11pt', font_size_titulo: '13.5pt', paragraph_spacing: '8pt' },
      cfgDocx: { szCorpo: 22, szTitulo: 27, spacingAfter: 160, fontFamily: 'Calibri' },
      perfilCirurgico: {
        ativo: true,
        templateVisual: {
          fontFamily: 'Roboto, sans-serif',
          fontSizeBody: '30pt',
          fontSizeTitulo: '18pt',
          paragraphSpacing: '4pt'
        }
      }
    });
    expect(ctx.layout.font_size_body).toBe('30pt');
    expect(ctx.layout.font_size_titulo).toBe('18pt');
    expect(ctx.layout.paragraph_spacing).toBe('4pt');
    expect(ctx.cfgDocx.szCorpo).toBe(60);
    expect(ctx.cfgDocx.szTitulo).toBe(36);
    expect(ctx.cfgDocx.spacingAfter).toBe(80);
    expect(ctx.cfgDocx.fontFamily).toBe('Roboto');
  });

  test('resolverOrdemSecoesCirurgia respeita ordem customizada e completa seções ausentes', () => {
    expect(resolverOrdemSecoesCirurgia(['evolucao', 'diagnostico', 'descricao'])).toEqual([
      'evolucao',
      'diagnostico',
      'descricao'
    ]);
    expect(resolverOrdemSecoesCirurgia(['descricao'])).toEqual([
      'descricao',
      'diagnostico',
      'evolucao'
    ]);
    expect(resolverOrdemSecoesCirurgia(null)).toEqual([
      'diagnostico',
      'descricao',
      'evolucao'
    ]);
  });

  test('resolverContextoCirurgico propaga fontSizeCabecalho independente de fontSizeBody', () => {
    const ctx = resolverContextoCirurgico({
      usuario: { id: 'user123', nome: 'Dr. Matheus' },
      perfilCirurgico: {
        ativo: true,
        templateVisual: {
          fontSizeBody: '12pt',
          fontSizeCabecalho: '9.5pt',
          fontSizeTitulo: '16pt'
        }
      }
    });
    expect(ctx.layout.font_size_body).toBe('12pt');
    expect(ctx.layout.font_size_cabecalho).toBe('9.5pt');
    expect(ctx.cfgDocx.szCorpo).toBe(24);
    expect(ctx.cfgDocx.szCabecalho).toBe(19);
    expect(ctx.temFonteCabecalhoCustom).toBe(true);
  });
});

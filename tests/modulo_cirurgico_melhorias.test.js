const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  resolverCaminhoArquivo,
  resolverContextoCirurgico,
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
});

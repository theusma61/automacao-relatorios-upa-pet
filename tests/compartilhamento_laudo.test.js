const {
  gerarPublicToken,
  montarUrlPublica,
  isBotPreviewWhatsApp,
  escaparHtml,
  montarPromptResumoTutor,
  renderizarPaginaPublicaLaudo,
  renderizarPaginaIndisponivel
} = require('../servico_compartilhamento');
const { renderizarRodape } = require('../renderizador_layout_laudo');

describe('Fase 1 — Entrega Inteligente (servico_compartilhamento + QR Code no rodapé)', () => {
  test('gerarPublicToken gera tokens únicos URL-safe com 22 caracteres (128 bits)', () => {
    const t1 = gerarPublicToken();
    const t2 = gerarPublicToken();
    expect(t1).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(t2).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(t1).not.toBe(t2);
  });

  test('montarUrlPublica remove barras finais duplicadas e codifica o token', () => {
    expect(montarUrlPublica('abc123', 'https://vetaro.com.br/')).toBe('https://vetaro.com.br/l/abc123');
    expect(montarUrlPublica('')).toBe('');
  });

  test('isBotPreviewWhatsApp identifica bots de prévia sem bloquear navegadores reais', () => {
    expect(isBotPreviewWhatsApp('WhatsApp/2.24.10.74 A')).toBe(true);
    expect(isBotPreviewWhatsApp('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    expect(isBotPreviewWhatsApp('TelegramBot (like TwitterBot)')).toBe(true);
    expect(isBotPreviewWhatsApp('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe(false);
    expect(isBotPreviewWhatsApp('')).toBe(false);
  });

  test('montarPromptResumoTutor inclui travas clínicas obrigatórias', () => {
    const prompt = montarPromptResumoTutor({
      tipo: 'ultrassom',
      paciente: { nome: 'Thor', especie: 'Canina', tutor: 'Ana' },
      laudo: [{ orgao: 'FÍGADO', texto: 'Dimensões normais e ecogenicidade preservada.' }]
    });
    expect(prompt).toContain('Thor');
    expect(prompt).toContain('PROIBIDO prescrever medicamentos');
    expect(prompt).toContain('médico veterinário responsável');
  });

  test('renderizarPaginaPublicaLaudo escapa XSS, inclui Open Graph, noindex e resumo ao tutor', () => {
    const html = renderizarPaginaPublicaLaudo({
      tipo: 'ultrassom',
      pacienteNome: 'Rex <script>alert(1)</script>',
      pacienteEspecie: 'Canina',
      tutorNome: 'Carlos',
      dataExame: '23/11/2026',
      medicoNome: 'Dra. Mariana',
      medicoCrmv: 'CRMV-MG 12345',
      clinicaNome: 'Clínica Vet',
      resumoTutor: 'Exame realizado com sucesso.\nConverse com o veterinário.',
      urlPdfInline: '/l/tok123/pdf',
      urlPdfDownload: '/l/tok123/pdf?download=1',
      urlPublica: 'https://vetaro.com.br/l/tok123'
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('content="noindex, nofollow, noarchive"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('Resumo em linguagem simples para o responsável');
    expect(html).toContain('https://vetaro.com.br/?ref=laudo_publico');
  });

  test('renderizarPaginaIndisponivel retorna aviso claro com noindex', () => {
    const html = renderizarPaginaIndisponivel();
    expect(html).toContain('noindex, nofollow');
    expect(html).toContain('Laudo indisponível ou link desativado');
  });

  test('renderizarRodape injeta bloco compacto de QR Code quando qrCodeDataUri é fornecido', () => {
    const fakeQr = 'data:image/png;base64,iVBORw0KGgo=';
    const htmlComQr = renderizarRodape(
      { posicaoAssinatura: 'direita', linhaAssinatura: true, textoAvisoLegal: 'Aviso legal teste', corSecundaria: '#4A777A' },
      'Dra. Camila',
      'CRMV-MG 9999',
      '',
      { qrCodeDataUri: fakeQr }
    );
    expect(htmlComQr).toContain(fakeQr);
    expect(htmlComQr).toContain('Laudo digital');

    const htmlSemQr = renderizarRodape(
      { posicaoAssinatura: 'direita', linhaAssinatura: true, textoAvisoLegal: 'Aviso legal teste', corSecundaria: '#4A777A' },
      'Dra. Camila',
      'CRMV-MG 9999',
      ''
    );
    expect(htmlSemQr).not.toContain('Laudo digital');
  });

  test('escaparHtml protege todos os caracteres críticos', () => {
    expect(escaparHtml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&#39;');
  });
});

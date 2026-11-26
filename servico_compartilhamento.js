/**
 * Serviço de Entrega Inteligente — Vetaro (Fase 1)
 *
 * Responsabilidades:
 * - Geração de token criptográfico curto (128 bits, base64url) para links públicos (/l/:token)
 * - Geração de QR Code inline (PNG Data URI) para embutir nos PDFs sem requisição externa
 * - Geração do Resumo Empático para o Tutor via Google Gemini (linguagem acessível e segura)
 * - Detecção de bots de prévia (WhatsApp/Facebook/Telegram) para evitar falsos positivos de leitura
 * - Renderização SSR leve da página pública do laudo (/l/:token) com Open Graph e proteção LGPD
 */

const crypto = require('crypto');

let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (_) {
  QRCode = null;
}

const DEFAULT_PUBLIC_BASE_URL = 'https://vetaro.com.br';

function gerarPublicToken() {
  return crypto.randomBytes(16).toString('base64url');
}

function resolverBaseUrlPublica(baseUrlOverride = '') {
  const candidato = String(
    baseUrlOverride ||
    process.env.APP_PUBLIC_URL ||
    process.env.APP_BASE_URL ||
    DEFAULT_PUBLIC_BASE_URL
  ).trim().replace(/\/+$/, '');
  return candidato || DEFAULT_PUBLIC_BASE_URL;
}

function montarUrlPublica(token, baseUrlOverride = '') {
  if (!token) return '';
  const base = resolverBaseUrlPublica(baseUrlOverride);
  return `${base}/l/${encodeURIComponent(String(token).trim())}`;
}

async function gerarQrCodeDataUri(url, opcoes = {}) {
  if (!url || !QRCode) return null;
  try {
    return await QRCode.toDataURL(String(url), {
      type: 'image/png',
      width: opcoes.width || 110,
      margin: opcoes.margin ?? 1,
      errorCorrectionLevel: opcoes.errorCorrectionLevel || 'M',
      color: {
        dark: opcoes.dark || '#0F172A',
        light: opcoes.light || '#FFFFFF'
      }
    });
  } catch (_) {
    return null;
  }
}

async function prepararDadosQrCodeCompartilhamento(token, opcoes = {}) {
  if (!token || opcoes.exibirQrCode === false) {
    return { publicToken: token || null, urlPublica: '', qrCodeDataUri: null, exibirQrCode: false };
  }
  const urlPublica = montarUrlPublica(token, opcoes.baseUrl);
  const qrCodeDataUri = await gerarQrCodeDataUri(urlPublica);
  return {
    publicToken: token,
    urlPublica,
    qrCodeDataUri,
    exibirQrCode: Boolean(qrCodeDataUri)
  };
}

function isBotPreviewWhatsApp(userAgent = '') {
  const ua = String(userAgent || '').trim();
  if (!ua) return false;
  return /(WhatsApp|facebookexternalhit|Facebot|TelegramBot|Twitterbot|Slackbot|LinkedInBot|Discordbot|Googlebot|Bingbot|Applebot|Pinterestbot)/i.test(ua);
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function montarPromptResumoTutor({ tipo, paciente = {}, laudo = [], cirurgia = null }) {
  const nomePet = paciente.nome || 'o paciente';
  const especie = paciente.especie || '';
  const tutor = paciente.tutor || '';

  let conteudoClinico = '';
  if (tipo === 'cirurgia' && cirurgia && typeof cirurgia === 'object') {
    conteudoClinico = [
      `Procedimento: ${cirurgia.procedimento || 'Não informado'}`,
      cirurgia.diagnosticoPreCirurgico ? `Diagnóstico pré-cirúrgico: ${cirurgia.diagnosticoPreCirurgico}` : '',
      cirurgia.descricaoProcedimento ? `Descrição: ${String(cirurgia.descricaoProcedimento).slice(0, 1800)}` : '',
      cirurgia.evolucaoConsideracoes ? `Evolução e considerações: ${String(cirurgia.evolucaoConsideracoes).slice(0, 1200)}` : ''
    ].filter(Boolean).join('\n');
  } else {
    let itens = [];
    if (Array.isArray(laudo)) {
      itens = laudo;
    } else if (typeof laudo === 'string' && laudo.trim()) {
      try {
        const parsed = JSON.parse(laudo);
        if (Array.isArray(parsed)) itens = parsed;
      } catch (_) {}
    }
    conteudoClinico = itens
      .map((item) => {
        const org = item?.orgao || item?.titulo || 'Órgão';
        const txt = item?.texto || item?.achados || item?.descricao || '';
        const dd = item?.diagDif ? ` (Diag. dif.: ${item.diagDif})` : '';
        return txt ? `- ${org}: ${txt}${dd}` : '';
      })
      .filter(Boolean)
      .join('\n')
      .slice(0, 4500);
  }

  return `Você é um assistente de comunicação clínica veterinária escrevendo uma mensagem curta de WhatsApp para o tutor de um pet.

DADOS DO PACIENTE:
- Pet: ${nomePet}${especie ? ` (${especie})` : ''}
- Tutor: ${tutor || 'Não informado'}
- Tipo de documento: ${tipo === 'cirurgia' ? 'Relatório Cirúrgico' : 'Laudo de Ultrassonografia'}

CONTEÚDO TÉCNICO DO DOCUMENTO:
${conteudoClinico || 'Sem achados detalhados.'}

REGRAS OBRIGATÓRIAS:
1. Escreva em português do Brasil, tom acolhedor, calmo, claro e empático, sem jargões técnicos pesados.
2. Escreva EXATAMENTE 3 a 5 frases curtas em um único parágrafo (ou no máximo 2 parágrafos curtos), pronto para ser enviado no WhatsApp.
3. Destaque de forma objetiva o que foi avaliado e, se houver alterações relevantes, explique de forma tranquila o que merece atenção — sem causar pânico.
4. PROIBIDO prescrever medicamentos, doses, dietas ou tratamentos.
5. PROIBIDO dar diagnóstico definitivo isolado ou prognóstico fechado.
6. OBRIGATÓRIO encerrar reforçando que a interpretação completa e a definição dos próximos passos devem ser feitas pelo médico veterinário responsável.
7. Não inclua links, saudações genéricas como "Olá, [Nome]" (o aplicativo já monta a saudação) nem formatação Markdown com asteriscos excessivos. Retorne apenas o texto limpo.`;
}

async function gerarResumoTutorIA({ tipo = 'ultrassom', paciente = {}, laudo = [], cirurgia = null, apiKey = '', usarMockLocal = false, req = null }) {
  if (usarMockLocal === true) {
    const { isAmbienteLocalSeguro } = require('./analisador_ia');
    if (isAmbienteLocalSeguro(req)) {
      const nomePet = paciente?.nome || 'seu pet';
      const resumoSimulado = tipo === 'cirurgia'
        ? `[Simulação Local - 0 tokens] O procedimento cirúrgico de ${nomePet} foi concluído com sucesso e sem intercorrências. Siga corretamente as medicações prescritas, mantenha o colar elizabetano e retorne para revisão dos pontos conforme orientação do veterinário.`
        : `[Simulação Local - 0 tokens] O exame de ultrassom de ${nomePet} foi concluído e o laudo completo já está disponível neste link. Converse com o médico-veterinário responsável para alinhar os próximos passos e eventuais retornos de acompanhamento.`;
      return { resumo: resumoSimulado, modelo: 'mock-local' };
    }
  }
  const chaveGratuita = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  const chavePaga = (process.env.GEMINI_API_KEY_PAID || process.env.GEMINI_PAID_API_KEY || process.env.GEMINI_API_KEY_PAGA || '').trim();

  const tentativas = [];
  if (chaveGratuita) {
    tentativas.push({ chave: chaveGratuita, modelo: 'gemini-2.5-flash' });
  }
  if (chavePaga) {
    tentativas.push({ chave: chavePaga, modelo: 'gemini-3.8-flash' });
    tentativas.push({ chave: chavePaga, modelo: 'gemini-2.5-flash' });
  } else if (chaveGratuita) {
    tentativas.push({ chave: chaveGratuita, modelo: 'gemini-2.5-pro' });
  }

  if (tentativas.length === 0) {
    throw new Error('Chave da API Gemini não configurada para geração do resumo ao tutor.');
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const prompt = montarPromptResumoTutor({ tipo, paciente, laudo, cirurgia });
  let ultimoErro = null;

  for (const tentativa of tentativas) {
    const isFlash25 = /^gemini-2\.5-flash$/i.test(tentativa.modelo);
    const configs = isFlash25
      ? [
          { temperature: 0.35, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
          { temperature: 0.35, maxOutputTokens: 2048 }
        ]
      : [{ temperature: 0.35, maxOutputTokens: 2048 }];

    for (const generationConfig of configs) {
      try {
        const genAI = new GoogleGenerativeAI(tentativa.chave);
        const model = genAI.getGenerativeModel({
          model: tentativa.modelo,
          generationConfig
        });
        const result = await model.generateContent(prompt);
        const texto = result?.response?.text?.().trim() || '';
        const finishReason = result?.response?.candidates?.[0]?.finishReason || 'UNKNOWN';
        if (texto) {
          console.log(`✨ [Resumo Tutor] Gerado com ${tentativa.modelo} (finishReason: ${finishReason}, chars: ${texto.length})`);
          return {
            resumo: texto.replace(/^["']|["']$/g, '').trim(),
            modelo: tentativa.modelo
          };
        }
      } catch (err) {
        ultimoErro = err;
      }
    }
  }

  throw new Error(ultimoErro?.message || 'Não foi possível gerar o resumo para o tutor no momento.');
}

function renderizarPaginaPublicaLaudo({
  tipo = 'ultrassom',
  pacienteNome = 'Paciente',
  pacienteEspecie = '',
  tutorNome = '',
  dataExame = '',
  procedimento = '',
  medicoNome = '',
  medicoCrmv = '',
  clinicaNome = '',
  resumoTutor = '',
  urlPdfInline = '',
  urlPdfDownload = '',
  urlPublica = ''
}) {
  const tituloTipo = tipo === 'cirurgia' ? 'Relatório Cirúrgico' : 'Laudo de Ultrassonografia';
  const tituloOg = `${tituloTipo} — ${pacienteNome}${clinicaNome ? ` | ${clinicaNome}` : ''}`;
  const descOg = [
    pacienteEspecie ? `Espécie: ${pacienteEspecie}` : '',
    dataExame ? `Data: ${dataExame}` : '',
    medicoNome ? `Responsável: ${medicoNome}${medicoCrmv ? ` (${medicoCrmv})` : ''}` : ''
  ].filter(Boolean).join(' • ') || 'Acesse o documento veterinário digital em PDF.';

  const resumoSeguro = resumoTutor
    ? escaparHtml(resumoTutor).replace(/\r?\n/g, '<br>')
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>${escaparHtml(tituloOg)}</title>
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escaparHtml(tituloOg)}">
  <meta property="og:description" content="${escaparHtml(descOg)}">
  ${urlPublica ? `<meta property="og:url" content="${escaparHtml(urlPublica)}">` : ''}
  <style>
    :root {
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --ink: #0F172A;
      --ink-muted: #475569;
      --border: #E2E8F0;
      --emerald: #00D296;
      --teal: #0D5C56;
      --navy: #0A141D;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.5;
    }
    .topbar {
      background: var(--navy);
      color: #F8FAFC;
      padding: 16px 20px;
      border-bottom: 3px solid var(--emerald);
    }
    .topbar-inner {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .clinic-title {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .doc-badge {
      font-size: 12px;
      font-weight: 600;
      color: #0A141D;
      background: var(--emerald);
      padding: 4px 10px;
      border-radius: 999px;
    }
    .container {
      max-width: 960px;
      margin: 20px auto 36px;
      padding: 0 16px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }
    .patient-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      line-height: 1.25;
      color: var(--ink);
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 18px;
      font-size: 14px;
      color: var(--ink-muted);
    }
    .meta-row strong {
      color: var(--ink);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--teal);
      color: #FFFFFF;
    }
    .btn-primary:hover {
      background: #094641;
    }
    .btn-secondary {
      background: #F1F5F9;
      color: var(--ink);
      border: 1px solid var(--border);
    }
    .summary-card {
      border-left: 4px solid var(--emerald);
      background: #F0FDF9;
    }
    .summary-title {
      margin: 0 0 8px 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--teal);
    }
    .summary-text {
      margin: 0 0 10px 0;
      font-size: 15px;
      color: var(--ink);
    }
    .summary-note {
      margin: 0;
      font-size: 12px;
      color: var(--ink-muted);
    }
    .pdf-frame-wrap {
      background: #E2E8F0;
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      height: 78vh;
      min-height: 520px;
    }
    .pdf-frame {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    .mobile-hint {
      display: none;
      margin-top: 10px;
      font-size: 13px;
      color: var(--ink-muted);
      text-align: center;
    }
    footer {
      max-width: 960px;
      margin: 24px auto 40px;
      padding: 0 16px;
      text-align: center;
      font-size: 13px;
      color: var(--ink-muted);
    }
    footer a {
      color: var(--teal);
      font-weight: 700;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
    @media (max-width: 640px) {
      .pdf-frame-wrap {
        height: 62vh;
        min-height: 380px;
      }
      .mobile-hint {
        display: block;
      }
      .actions {
        width: 100%;
      }
      .btn {
        flex: 1;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="clinic-title">${escaparHtml(clinicaNome || 'Atendimento Veterinário')}</div>
      <span class="doc-badge">${escaparHtml(tituloTipo)}</span>
    </div>
  </header>

  <main class="container">
    <section class="card">
      <div class="patient-head">
        <div>
          <h1>${escaparHtml(pacienteNome)}</h1>
          <div class="meta-row">
            ${pacienteEspecie ? `<span><strong>Espécie:</strong> ${escaparHtml(pacienteEspecie)}</span>` : ''}
            ${tutorNome ? `<span><strong>Responsável:</strong> ${escaparHtml(tutorNome)}</span>` : ''}
            ${dataExame ? `<span><strong>Data:</strong> ${escaparHtml(dataExame)}</span>` : ''}
            ${procedimento ? `<span><strong>Procedimento:</strong> ${escaparHtml(procedimento)}</span>` : ''}
            ${medicoNome ? `<span><strong>Médico(a):</strong> ${escaparHtml(medicoNome)}${medicoCrmv ? ` (${escaparHtml(medicoCrmv)})` : ''}</span>` : ''}
          </div>
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="${escaparHtml(urlPdfDownload)}">Baixar PDF</a>
          <a class="btn btn-secondary" href="${escaparHtml(urlPdfInline)}" target="_blank" rel="noopener noreferrer">Abrir em tela cheia</a>
        </div>
      </div>
    </section>

    ${resumoSeguro ? `
    <section class="card summary-card">
      <h2 class="summary-title">Resumo em linguagem simples para o responsável</h2>
      <p class="summary-text">${resumoSeguro}</p>
      <p class="summary-note">Este resumo facilita o entendimento inicial e não substitui a avaliação do médico veterinário responsável.</p>
    </section>
    ` : ''}

    <section class="pdf-frame-wrap">
      <iframe class="pdf-frame" src="${escaparHtml(urlPdfInline)}#view=FitH" title="${escaparHtml(tituloOg)}"></iframe>
    </section>
    <p class="mobile-hint">Caso o PDF não apareça automaticamente no seu celular, toque em <strong>Baixar PDF</strong> acima.</p>
  </main>

  <footer>
    Documento disponibilizado com link privado (não indexado).<br>
    Laudo digital emitido com <a href="https://vetaro.com.br/?ref=laudo_publico" target="_blank" rel="noopener noreferrer">Vetaro</a>.
  </footer>
</body>
</html>`;
}

function renderizarPaginaIndisponivel() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Documento indisponível — Vetaro</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: #F8FAFC;
      color: #0F172A;
    }
    .box {
      max-width: 440px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 28px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 20px;
    }
    p {
      margin: 0;
      font-size: 14px;
      color: #475569;
      line-height: 1.55;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>Laudo indisponível ou link desativado</h1>
    <p>Este link não foi encontrado ou foi desativado pelo médico veterinário responsável. Solicite um novo link diretamente à clínica.</p>
  </div>
</body>
</html>`;
}

module.exports = {
  gerarPublicToken,
  resolverBaseUrlPublica,
  montarUrlPublica,
  gerarQrCodeDataUri,
  prepararDadosQrCodeCompartilhamento,
  isBotPreviewWhatsApp,
  escaparHtml,
  montarPromptResumoTutor,
  gerarResumoTutorIA,
  renderizarPaginaPublicaLaudo,
  renderizarPaginaIndisponivel
};

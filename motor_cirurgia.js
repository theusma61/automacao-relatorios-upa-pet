const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const os = require('os');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, BorderStyle, PageBreak } = require('docx');
const { obterLayout, converterParaDocx, ptParaHalfPoints, LAYOUT_PADRAO } = require('./gerenciador_layout');

const ASSETS_DIR = path.join(__dirname, 'assets');
const ASSINATURA_PATH = fs.existsSync(path.join(ASSETS_DIR, 'assinatura_camila.jpg'))
  ? path.join(ASSETS_DIR, 'assinatura_camila.jpg')
  : null;

function escaparHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function obterMimePorExtensao(caminhoArquivo) {
  const ext = path.extname(caminhoArquivo || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function obterDimensoesImagem(buffer) {
  try {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] === 0xFF) {
          const marker = buffer[offset + 1];
          if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
            return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
          }
          if (marker === 0xD9 || marker === 0xDA) break;
          const len = buffer.readUInt16BE(offset + 2);
          offset += 2 + len;
        } else {
          offset++;
        }
      }
    }
  } catch (e) {}
  return { width: 800, height: 600 };
}

function calcularDimensoesDocx(origWidth, origHeight, maxWidth = 480, maxHeight = 480) {
  let w = origWidth || 800;
  let h = origHeight || 600;
  if (w > maxWidth) {
    h = Math.round(h * (maxWidth / w));
    w = maxWidth;
  }
  if (h > maxHeight) {
    w = Math.round(w * (maxHeight / h));
    h = maxHeight;
  }
  return { width: w, height: h };
}

/**
 * Normaliza e resolve caminhos de arquivos de imagem no sistema de arquivos,
 * suportando caminhos relativos, absolutos, Windows, URLs locais (/uploads/...),
 * querystrings (?v=...), UPLOAD_PERSISTENT_DIR e referências de volumes Docker (/app/uploads/...).
 */
function resolverCaminhoArquivo(caminho, opcoes = {}) {
  if (!caminho || typeof caminho !== 'string') return null;
  let limpo = caminho.trim();
  if (!limpo) return null;
  if (/^https?:\/\//i.test(limpo) || /^data:image\//i.test(limpo)) return null;

  // Remove querystring / hash e normaliza separadores Windows -> POSIX
  limpo = limpo.split('?')[0].split('#')[0];
  try { limpo = decodeURIComponent(limpo); } catch (_) {}
  const normalizado = limpo.replace(/\\/g, '/');

  const uploadsDir = process.env.UPLOAD_PERSISTENT_DIR
    ? path.resolve(process.env.UPLOAD_PERSISTENT_DIR)
    : path.join(__dirname, 'uploads');

  const candidatos = [];

  // 1. Caminho direto
  candidatos.push(limpo);
  if (normalizado !== limpo) candidatos.push(normalizado);

  // 2. Caminhos dentro de /uploads/... resolvidos contra UPLOAD_PERSISTENT_DIR e __dirname/uploads
  const idxUploads = normalizado.toLowerCase().lastIndexOf('/uploads/');
  if (idxUploads !== -1) {
    const relUploads = normalizado.slice(idxUploads + '/uploads/'.length);
    candidatos.push(path.join(uploadsDir, relUploads));
    candidatos.push(path.join(__dirname, 'uploads', relUploads));
    candidatos.push(path.resolve(process.cwd(), 'uploads', relUploads));
  } else if (normalizado.toLowerCase().startsWith('uploads/')) {
    const relUploads = normalizado.slice('uploads/'.length);
    candidatos.push(path.join(uploadsDir, relUploads));
    candidatos.push(path.join(__dirname, 'uploads', relUploads));
    candidatos.push(path.resolve(process.cwd(), 'uploads', relUploads));
  }

  // 3. Caminho relativo/absoluto de container Docker (/app/...)
  const semApp = normalizado.replace(/^\/app\//, '').replace(/^app\//, '');
  candidatos.push(semApp);
  candidatos.push(path.join(__dirname, semApp));

  // 4. Sem barra inicial
  const semBarra = normalizado.replace(/^\/+/, '');
  candidatos.push(semBarra);
  candidatos.push(path.join(__dirname, semBarra));
  candidatos.push(path.resolve(process.cwd(), semBarra));

  // 5. Fallback por basename em logos/assinaturas/templates (útil se o path veio de outro SO/container)
  const base = path.basename(normalizado);
  if (base && /\.(jpe?g|png|webp|svg|gif)$/i.test(base)) {
    candidatos.push(path.join(uploadsDir, 'logos', base));
    candidatos.push(path.join(uploadsDir, 'assinaturas', base));
    if (opcoes.usuarioId) {
      const idLimpo = String(opcoes.usuarioId).replace(/[^a-zA-Z0-9_-]/g, '');
      candidatos.push(path.join(uploadsDir, 'templates_cirurgia', idLimpo, base));
      candidatos.push(path.join(uploadsDir, 'templates', idLimpo, base));
    }
  }

  for (const cand of candidatos) {
    if (!cand) continue;
    try {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        return path.resolve(cand);
      }
    } catch (_) {}
  }

  return null;
}

function lerImagemFileUrl(caminho) {
  if (!caminho) return '';
  const str = String(caminho).trim();
  if (str.startsWith('data:') || str.startsWith('file://')) return str;
  const resolvido = resolverCaminhoArquivo(str);
  if (!resolvido || !fs.existsSync(resolvido)) return '';
  try {
    return pathToFileURL(resolvido).href;
  } catch (_) {
    return '';
  }
}

// Mantém alias interno apontando para file:// (evita inflação ~33% em Base64 no HTML do Puppeteer)
const lerImagemDataUri = lerImagemFileUrl;

const ORDEM_SECOES_CIRURGIA_PADRAO = ['diagnostico', 'descricao', 'evolucao'];

function resolverOrdemSecoesCirurgia(ordemInformada) {
  const validas = [];
  if (Array.isArray(ordemInformada)) {
    for (const item of ordemInformada) {
      const key = String(item || '').trim().toLowerCase();
      if (ORDEM_SECOES_CIRURGIA_PADRAO.includes(key) && !validas.includes(key)) {
        validas.push(key);
      }
    }
  }
  for (const padrao of ORDEM_SECOES_CIRURGIA_PADRAO) {
    if (!validas.includes(padrao)) validas.push(padrao);
  }
  return validas;
}

function resolverLegendaFoto(idx, legendasFotos, legendaPadraoTemplate) {
  if (Array.isArray(legendasFotos)) {
    const item = legendasFotos[idx];
    if (typeof item === 'string' && item.trim()) return item.trim();
    if (item && typeof item === 'object' && typeof item.legenda === 'string' && item.legenda.trim()) {
      return item.legenda.trim();
    }
  }
  const padrao = (typeof legendaPadraoTemplate === 'string' && legendaPadraoTemplate.trim())
    ? legendaPadraoTemplate.trim()
    : 'Registro fotográfico intraoperatório / peça cirúrgica';
  return `Figura ${idx + 1} - ${padrao}`;
}

function resolverContextoCirurgico(opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = opcoes.layout || LAYOUT_PADRAO;
  const perfilCirurgico = (opcoes.perfilCirurgico && opcoes.perfilCirurgico.ativo !== false)
    ? opcoes.perfilCirurgico
    : null;
  const tvCir = perfilCirurgico?.templateVisual || {};
  const layoutCir = perfilCirurgico?.layoutDetectado || {};

  const normalizarPt = (val) => {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim();
    if (!s) return undefined;
    return /^[0-9]+(\.[0-9]+)?$/.test(s) ? `${s}pt` : s;
  };

  // Mescla tipografia/cores/margens/espaçamento priorizando o perfil cirúrgico personalizado quando ativo
  const temFonteCorpoCustom = Boolean(tvCir.fontSizeBody || layoutCir.fontSizeBody);
  const temFonteCabecalhoCustom = Boolean(tvCir.fontSizeCabecalho || layoutCir.fontSizeCabecalho);
  const temEspacamentoCustom = Boolean(tvCir.paragraphSpacing || layoutCir.paragraphSpacing);
  const fontSizeBodyResolvido = normalizarPt(tvCir.fontSizeBody || layoutCir.fontSizeBody || layout.font_size_body) || LAYOUT_PADRAO.font_size_body;
  const fontSizeCabecalhoResolvido = normalizarPt(tvCir.fontSizeCabecalho || layoutCir.fontSizeCabecalho || layout.font_size_cabecalho) || fontSizeBodyResolvido;
  const layoutEfetivo = {
    ...layout,
    font_family: tvCir.fontFamily || layoutCir.fontFamily || layout.font_family || LAYOUT_PADRAO.font_family,
    font_size_body: fontSizeBodyResolvido,
    font_size_cabecalho: fontSizeCabecalhoResolvido,
    font_size_titulo: normalizarPt(tvCir.fontSizeTitulo || layoutCir.fontSizeTitulo || layout.font_size_titulo) || LAYOUT_PADRAO.font_size_titulo,
    margin_top: tvCir.marginTop || layoutCir.marginTop || layout.margin_top || LAYOUT_PADRAO.margin_top,
    margin_bottom: tvCir.marginBottom || layoutCir.marginBottom || layout.margin_bottom || LAYOUT_PADRAO.margin_bottom,
    margin_left: tvCir.marginLeft || layoutCir.marginLeft || layout.margin_left || LAYOUT_PADRAO.margin_left,
    margin_right: tvCir.marginRight || layoutCir.marginRight || layout.margin_right || LAYOUT_PADRAO.margin_right,
    line_height: tvCir.lineHeight || layoutCir.lineHeight || layout.line_height || LAYOUT_PADRAO.line_height,
    paragraph_spacing: normalizarPt(tvCir.paragraphSpacing || layoutCir.paragraphSpacing || layout.paragraph_spacing) || LAYOUT_PADRAO.paragraph_spacing,
    cor_primaria: tvCir.corPrimaria || layoutCir.corPrimaria || layout.cor_primaria || LAYOUT_PADRAO.cor_primaria,
    cor_secundaria: tvCir.corSecundaria || layoutCir.corSecundaria || layout.cor_secundaria || LAYOUT_PADRAO.cor_secundaria
  };
  // Recalcula cfgDocx sempre a partir de layoutEfetivo para garantir que o perfil cirúrgico e overrides reflitam no Word (.docx)
  const cfgDocx = {
    ...converterParaDocx(layoutEfetivo),
    szCabecalho: ptParaHalfPoints(fontSizeCabecalhoResolvido, 22)
  };

  const nomeMedico = opcoes.nomeMedico || perfilCirurgico?.nomeDetectado || usuario.nome || 'Camila Bastos';
  const crmvMedico = opcoes.crmvMedico || perfilCirurgico?.crmvDetectado || usuario.crmv || 'CRMV/MG: 22904';
  const clinicaNome = opcoes.clinicaNome || perfilCirurgico?.clinicaDetectada || usuario.nomeClinica || 'Vetaro';

  const logoCandidatos = [
    opcoes.logoPath,
    opcoes.logoUrl,
    usuario.logoUrl,
    tvCir.ativosVisuais?.headerLogoUrl,
    tvCir.visualConfigClonado?.headerLogoUrl,
    tvCir.headerLogoUrl,
    tvCir.ativosVisuais?.headerBannerUrl,
    tvCir.headerBannerUrl,
    opcoes.perfilLaudo?.templateVisual?.ativosVisuais?.headerLogoUrl,
    opcoes.perfilLaudo?.templateVisual?.visualConfigClonado?.headerLogoUrl,
    opcoes.perfilLaudo?.templateVisual?.headerLogoUrl,
    opcoes.perfilLaudo?.templateVisual?.headerBannerUrl,
    opcoes.perfilLaudo?.headerLogoUrl,
    layout.header_logo_url,
    layout.visual_config_json?.headerLogoUrl,
    layout.visualConfigJson?.headerLogoUrl,
    layout.header_banner_url,
    layout.headerBannerUrl,
    layout.visual_config_json?.headerBannerUrl,
    layout.visualConfigJson?.headerBannerUrl,
    usuario.clinica?.logoUrl
  ];

  let logoPath = null;
  for (const cand of logoCandidatos) {
    const resolvido = resolverCaminhoArquivo(cand, { usuarioId: usuario.id });
    if (resolvido) {
      logoPath = resolvido;
      break;
    }
  }

  // Fallback seguro: busca logo salva no diretório persistente do usuário (logos, templates_cirurgia, templates)
  if (!logoPath && usuario.id) {
    const idLimpo = String(usuario.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const uploadsDir = process.env.UPLOAD_PERSISTENT_DIR
      ? path.resolve(process.env.UPLOAD_PERSISTENT_DIR)
      : path.join(__dirname, 'uploads');

    // 1. Primeiro checa uploads/logos/ (upload explícito da logo da pessoa em Meu Perfil)
    const logosDir = path.join(uploadsDir, 'logos');
    if (fs.existsSync(logosDir)) {
      try {
        const arquivos = fs.readdirSync(logosDir);
        const logosDoUsuario = arquivos
          .filter(f => f.includes(idLimpo) && /\.(jpe?g|png|webp)$/i.test(f))
          .sort()
          .reverse();
        if (logosDoUsuario.length > 0) {
          const achado = path.join(logosDir, logosDoUsuario[0]);
          if (fs.existsSync(achado)) logoPath = achado;
        }
      } catch (_) {}
    }

    // 2. Depois checa uploads/templates_cirurgia/<id> e uploads/templates/<id>
    if (!logoPath) {
      for (const sub of ['templates_cirurgia', 'templates']) {
        const pastaTemplates = path.join(uploadsDir, sub, idLimpo);
        if (fs.existsSync(pastaTemplates)) {
          for (const arq of ['header_logo.png', 'header_logo.jpg', 'header_logo.jpeg', 'header_logo.webp']) {
            const cand = path.join(pastaTemplates, arq);
            if (fs.existsSync(cand)) { logoPath = cand; break; }
          }
        }
        if (logoPath) break;
      }
    }
  }

  const isDraCamila = !usuario.id || (usuario.email || '').toLowerCase().includes('camila');
  const assinaturaCandidatos = [
    opcoes.assinaturaPath,
    opcoes.assinaturaUrl,
    usuario.assinaturaUrl,
    tvCir.ativosVisuais?.assinaturaUrl,
    tvCir.visualConfigClonado?.assinaturaUrl,
    tvCir.assinaturaUrl,
    opcoes.perfilLaudo?.templateVisual?.ativosVisuais?.assinaturaUrl,
    opcoes.perfilLaudo?.templateVisual?.visualConfigClonado?.assinaturaUrl,
    opcoes.perfilLaudo?.templateVisual?.assinaturaUrl,
    layout.assinatura_extraida_url,
    layout.assinaturaExtraidaUrl,
    layout.visual_config_json?.assinaturaUrl,
    layout.visualConfigJson?.assinaturaUrl
  ];

  let assinaturaPath = null;
  for (const cand of assinaturaCandidatos) {
    const resolvido = resolverCaminhoArquivo(cand, { usuarioId: usuario.id });
    if (resolvido) {
      assinaturaPath = resolvido;
      break;
    }
  }

  if (!assinaturaPath && usuario.id) {
    const uploadsDir = process.env.UPLOAD_PERSISTENT_DIR
      ? path.resolve(process.env.UPLOAD_PERSISTENT_DIR)
      : path.join(__dirname, 'uploads');
    const assinaturasDir = path.join(uploadsDir, 'assinaturas');
    if (fs.existsSync(assinaturasDir)) {
      try {
        const idLimpo = String(usuario.id).replace(/[^a-zA-Z0-9_-]/g, '');
        const arquivos = fs.readdirSync(assinaturasDir);
        const assDoUsuario = arquivos
          .filter(f => f.includes(idLimpo) && /\.(jpe?g|png|webp)$/i.test(f))
          .sort()
          .reverse();
        if (assDoUsuario.length > 0) {
          const achado = path.join(assinaturasDir, assDoUsuario[0]);
          if (fs.existsSync(achado)) assinaturaPath = achado;
        }
      } catch (_) {}
    }
  }

  if (!assinaturaPath && isDraCamila) {
    assinaturaPath = ASSINATURA_PATH;
  }

  // Configurações visuais e rótulos do padrão cirúrgico (com defaults oficiais)
  const rotulosSecoes = {
    data: tvCir.rotulosSecoes?.data || 'DATA DO PROCEDIMENTO CIRÚRGICO',
    procedimento: tvCir.rotulosSecoes?.procedimento || 'PROCEDIMENTO',
    diagnostico: tvCir.rotulosSecoes?.diagnostico || 'DIAGNÓSTICO PRÉ-CIRÚRGICO',
    descricao: tvCir.rotulosSecoes?.descricao || 'DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO',
    evolucao: tvCir.rotulosSecoes?.evolucao || 'EVOLUÇÃO E CONSIDERAÇÕES'
  };

  const estiloVisualCirurgico = {
    tipoCabecalho: tvCir.tipoCabecalho || 'logo-esquerda-dados-direita',
    tipoDadosPaciente: tvCir.tipoDadosPaciente || 'duas-colunas-limpo',
    tituloDocumento: tvCir.tituloDocumento || 'RELATÓRIO CIRÚRGICO',
    subtituloDocumento: tvCir.subtituloDocumento || '',
    alinhamentoTitulo: tvCir.alinhamentoTitulo || 'center',
    decoracaoTitulo: tvCir.decoracaoTitulo || 'nenhuma',
    estiloSecoes: tvCir.estiloSecoes || 'negrito-inline',
    rotuloResponsavel: tvCir.rotuloResponsavel || 'Responsável',
    rotulosSecoes,
    tituloRegistroFotografico: tvCir.tituloRegistroFotografico || 'REGISTRO FOTOGRÁFICO INTRAOPERATÓRIO',
    legendaPadraoFoto: tvCir.legendaPadraoFoto || 'Registro fotográfico intraoperatório / peça cirúrgica',
    posicaoAssinatura: tvCir.posicaoAssinatura || 'centro',
    linhaAssinatura: tvCir.linhaAssinatura !== undefined ? Boolean(tvCir.linhaAssinatura) : false,
    mostrarAssinaturaImagem: tvCir.mostrarAssinaturaImagem !== undefined ? Boolean(tvCir.mostrarAssinaturaImagem) : true,
    mostrarAssinaturaTexto: tvCir.mostrarAssinaturaTexto !== undefined ? Boolean(tvCir.mostrarAssinaturaTexto) : true,
    textoAvisoLegal: tvCir.textoAvisoLegal || '',
    rodapeContato: tvCir.rodapeContato || '',
    corPrimaria: layoutEfetivo.cor_primaria || '#1B365D',
    corSecundaria: layoutEfetivo.cor_secundaria || '#4A777A',
    corFundoBlocos: tvCir.corFundoBlocos || '#F8FAFC',
    corBordaTabelas: tvCir.corBordaTabelas || '#E2E8F0'
  };

  return {
    ...opcoes,
    usuario,
    nomeMedico,
    crmvMedico,
    clinicaNome,
    logoPath,
    assinaturaPath,
    layout: layoutEfetivo,
    cfgDocx,
    temFonteCorpoCustom,
    temFonteCabecalhoCustom,
    temEspacamentoCustom,
    perfilCirurgico,
    estiloVisualCirurgico
  };
}

async function gerarDocxCirurgico(dadosPaciente, dadosCirurgia, caminhoSaidaDocx, imagens = [], opcoes = {}) {
  const ctx = resolverContextoCirurgico(opcoes);
  const ev = ctx.estiloVisualCirurgico;
  const fonte = ctx.cfgDocx.fontFamily || 'Calibri';
  const corPrimariaHex = (ev.corPrimaria || ctx.cfgDocx.corPrimariaHex || '#000000').replace(/^#/, '').toUpperCase();
  const legendasFotos = opcoes.legendasFotos || dadosCirurgia?.legendasFotos || [];

  const logoBytes = (ctx.logoPath && fs.existsSync(ctx.logoPath)) ? fs.readFileSync(ctx.logoPath) : null;
  const assinaturaBytes = (ctx.assinaturaPath && fs.existsSync(ctx.assinaturaPath)) ? fs.readFileSync(ctx.assinaturaPath) : null;

  const textoTotal = (dadosCirurgia.descricaoProcedimento || '') + (dadosCirurgia.evolucaoConsideracoes || '');
  const ehTextoLongo = textoTotal.length > 1750;
  const ehTextoMuitoLongo = textoTotal.length > 2300;

  const szCorpo = ctx.temFonteCorpoCustom
    ? (ctx.cfgDocx.szCorpo || 22)
    : (ehTextoMuitoLongo ? 19 : (ehTextoLongo ? 20 : (ctx.cfgDocx.szCorpo || 22)));
  const szCabecalho = ctx.temFonteCabecalhoCustom
    ? (ctx.cfgDocx.szCabecalho || szCorpo)
    : szCorpo;
  const szTitulo = ctx.cfgDocx.szTitulo || 28;
  const lineSpacingDocx = ehTextoMuitoLongo ? 220 : (ehTextoLongo ? 240 : (ctx.cfgDocx.lineSpacing || 260));
  const spacingAfterDocx = ctx.temEspacamentoCustom
    ? (ctx.cfgDocx.spacingAfter ?? 160)
    : (ehTextoMuitoLongo ? 80 : (ehTextoLongo ? 100 : (ctx.cfgDocx.spacingAfter ?? 140)));

  const bordaTransparente = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  let celulaLogoChildren = [];
  if (logoBytes && ev.tipoCabecalho !== 'sem-logo-tipografico') {
    let logoDims = { width: 130, height: 65 };
    try {
      const dimsOrig = obterDimensoesImagem(logoBytes);
      if (dimsOrig && dimsOrig.width && dimsOrig.height) {
        logoDims = calcularDimensoesDocx(dimsOrig.width, dimsOrig.height, 155, 68);
      }
    } catch (_) {}

    celulaLogoChildren = [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new ImageRun({
            data: logoBytes,
            transformation: logoDims
          })
        ]
      })
    ];
  } else {
    celulaLogoChildren = [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({ text: ctx.clinicaNome, bold: true, font: fonte, size: 32, color: corPrimariaHex })
        ]
      })
    ];
  }

  const tabelaCabecalho = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: bordaTransparente,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: bordaTransparente,
            children: celulaLogoChildren
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: bordaTransparente,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Nome: ', bold: true, font: fonte, size: szCabecalho }),
                  new TextRun({ text: dadosPaciente.nome || 'Não informado', font: fonte, size: szCabecalho })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Sexo: ', bold: true, font: fonte, size: szCabecalho }),
                  new TextRun({ text: dadosPaciente.sexo || 'Não informado', font: fonte, size: szCabecalho })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Idade: ', bold: true, font: fonte, size: szCabecalho }),
                  new TextRun({ text: dadosPaciente.idade || 'Não informado', font: fonte, size: szCabecalho })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: bordaTransparente,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${ev.rotuloResponsavel}: `, bold: true, font: fonte, size: szCabecalho }),
                  new TextRun({ text: dadosPaciente.tutor || 'Não informado', font: fonte, size: szCabecalho })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Espécie: ', bold: true, font: fonte, size: szCabecalho }),
                  new TextRun({ text: dadosPaciente.especie || 'Não informada', font: fonte, size: szCabecalho })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Peso: ', bold: true, font: fonte, size: szCabecalho }),
                  new TextRun({ text: dadosPaciente.peso || 'Não informado', font: fonte, size: szCabecalho })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const alinhamentoTituloDocx = ev.alinhamentoTitulo === 'left' ? AlignmentType.LEFT : AlignmentType.CENTER;
  const alinhamentoAssinaturaDocx = ev.posicaoAssinatura === 'direita'
    ? AlignmentType.RIGHT
    : (ev.posicaoAssinatura === 'esquerda' ? AlignmentType.LEFT : AlignmentType.CENTER);

  const paragrafos = [
    tabelaCabecalho,
    new Paragraph({ spacing: { before: ehTextoLongo ? 100 : 180, after: ehTextoLongo ? 80 : 120 } }),
    new Paragraph({
      alignment: alinhamentoTituloDocx,
      spacing: { before: ehTextoLongo ? 80 : 120, after: ev.subtituloDocumento ? 60 : (ehTextoLongo ? 140 : 200) },
      children: [
        new TextRun({
          text: ev.tituloDocumento,
          bold: true,
          font: fonte,
          size: szTitulo,
          color: corPrimariaHex
        })
      ]
    })
  ];

  if (ev.subtituloDocumento) {
    paragrafos.push(
      new Paragraph({
        alignment: alinhamentoTituloDocx,
        spacing: { after: ehTextoLongo ? 120 : 180 },
        children: [
          new TextRun({
            text: ev.subtituloDocumento,
            italics: true,
            font: fonte,
            size: Math.max(18, szCorpo - 2),
            color: (ev.corSecundaria || '#555555').replace(/^#/, '').toUpperCase()
          })
        ]
      })
    );
  }

  paragrafos.push(
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: spacingAfterDocx, line: lineSpacingDocx },
      children: [
        new TextRun({ text: `${ev.rotulosSecoes.data}: `, bold: true, font: fonte, size: szCorpo, color: corPrimariaHex }),
        new TextRun({ text: dadosCirurgia.data || dadosPaciente.data || 'Não informada', font: fonte, size: szCorpo })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: spacingAfterDocx, line: lineSpacingDocx },
      children: [
        new TextRun({ text: `${ev.rotulosSecoes.procedimento}: `, bold: true, font: fonte, size: szCorpo, color: corPrimariaHex }),
        new TextRun({ text: dadosCirurgia.procedimento || 'Não informado', font: fonte, size: szCorpo })
      ]
    })
  );

  const descParagrafos = (dadosCirurgia.descricaoProcedimento || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const ordemSecoesDocx = resolverOrdemSecoesCirurgia(dadosCirurgia.ordemSecoes);
  ordemSecoesDocx.forEach((secaoKey, secaoIdx) => {
    const ehUltimaSecao = secaoIdx === ordemSecoesDocx.length - 1;
    const espacoFinal = ehUltimaSecao ? Math.max(spacingAfterDocx, ehTextoLongo ? 120 : 180) : spacingAfterDocx;

    if (secaoKey === 'diagnostico') {
      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.BOTH,
          spacing: { after: espacoFinal, line: lineSpacingDocx },
          children: [
            new TextRun({ text: `${ev.rotulosSecoes.diagnostico}: `, bold: true, font: fonte, size: szCorpo, color: corPrimariaHex }),
            new TextRun({ text: dadosCirurgia.diagnosticoPreCirurgico || 'Não informado', font: fonte, size: szCorpo })
          ]
        })
      );
    } else if (secaoKey === 'descricao') {
      if (descParagrafos.length === 0) {
        paragrafos.push(
          new Paragraph({
            alignment: AlignmentType.BOTH,
            spacing: { after: espacoFinal, line: lineSpacingDocx },
            children: [
              new TextRun({ text: `${ev.rotulosSecoes.descricao}: `, bold: true, font: fonte, size: szCorpo, color: corPrimariaHex }),
              new TextRun({ text: 'Não informada.', font: fonte, size: szCorpo })
            ]
          })
        );
      } else {
        descParagrafos.forEach((par, idx) => {
          const isLastDescPar = idx === descParagrafos.length - 1;
          paragrafos.push(
            new Paragraph({
              alignment: AlignmentType.BOTH,
              spacing: { after: isLastDescPar ? espacoFinal : spacingAfterDocx, line: lineSpacingDocx },
              children: idx === 0
                ? [
                    new TextRun({ text: `${ev.rotulosSecoes.descricao}: `, bold: true, font: fonte, size: szCorpo, color: corPrimariaHex }),
                    new TextRun({ text: par, font: fonte, size: szCorpo })
                  ]
                : [
                    new TextRun({ text: par, font: fonte, size: szCorpo })
                  ]
            })
          );
        });
      }
    } else if (secaoKey === 'evolucao') {
      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.BOTH,
          spacing: { after: espacoFinal, line: lineSpacingDocx },
          children: [
            new TextRun({ text: `${ev.rotulosSecoes.evolucao}: `, bold: true, font: fonte, size: szCorpo, color: corPrimariaHex }),
            new TextRun({ text: dadosCirurgia.evolucaoConsideracoes || 'Procedimento transcorrido sem intercorrências.', font: fonte, size: szCorpo })
          ]
        })
      );
    }
  });

  const blocoAssinatura = [];
  if (ev.mostrarAssinaturaImagem && assinaturaBytes) {
    blocoAssinatura.push(
      new Paragraph({
        alignment: alinhamentoAssinaturaDocx,
        spacing: { before: ehTextoLongo ? 100 : 160, after: 30 },
        children: [
          new ImageRun({
            data: assinaturaBytes,
            transformation: { width: 100, height: 68 }
          })
        ]
      })
    );
  }
  if (ev.linhaAssinatura && (ev.mostrarAssinaturaImagem || ev.mostrarAssinaturaTexto)) {
    blocoAssinatura.push(
      new Paragraph({
        alignment: alinhamentoAssinaturaDocx,
        spacing: { before: (ev.mostrarAssinaturaImagem && assinaturaBytes) ? 0 : (ehTextoLongo ? 100 : 160), after: 20 },
        children: [
          new TextRun({ text: '________________________________________', font: fonte, size: Math.max(16, szCorpo - 4), color: '888888' })
        ]
      })
    );
  }
  if (ev.mostrarAssinaturaTexto) {
    blocoAssinatura.push(
      new Paragraph({
        alignment: alinhamentoAssinaturaDocx,
        spacing: { before: ((ev.mostrarAssinaturaImagem && assinaturaBytes) || ev.linhaAssinatura) ? 0 : (ehTextoLongo ? 100 : 160), after: 20 },
        children: [
          new TextRun({ text: ctx.nomeMedico, bold: true, font: fonte, size: szCorpo })
        ]
      }),
      new Paragraph({
        alignment: alinhamentoAssinaturaDocx,
        children: [
          new TextRun({ text: ctx.crmvMedico, font: fonte, size: szCorpo })
        ]
      })
    );
  }

  if (ev.textoAvisoLegal) {
    blocoAssinatura.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 40 },
        children: [
          new TextRun({ text: ev.textoAvisoLegal, italics: true, font: fonte, size: 16, color: '666666' })
        ]
      })
    );
  }
  if (ev.rodapeContato) {
    blocoAssinatura.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40 },
        children: [
          new TextRun({ text: ev.rodapeContato, font: fonte, size: 16, color: '666666' })
        ]
      })
    );
  }

  paragrafos.push(...blocoAssinatura);

  const imagensValidas = (imagens || []).filter(img => fs.existsSync(img));
  if (imagensValidas.length > 0) {
    paragrafos.push(new Paragraph({ children: [new PageBreak()] }));
    paragrafos.push(tabelaCabecalho);
    paragrafos.push(new Paragraph({ spacing: { before: 80, after: 100 } }));

    paragrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 160 },
        children: [
          new TextRun({
            text: ev.tituloRegistroFotografico,
            bold: true,
            font: fonte,
            size: szTitulo,
            color: corPrimariaHex
          })
        ]
      })
    );

    for (let i = 0; i < imagensValidas.length; i++) {
      const imgPath = imagensValidas[i];
      const imgBuffer = fs.readFileSync(imgPath);
      const dims = obterDimensoesImagem(imgBuffer);

      const maxW = imagensValidas.length === 1 ? 480 : 380;
      const maxH = imagensValidas.length === 1 ? 460 : 230;
      const { width, height } = calcularDimensoesDocx(dims.width, dims.height, maxW, maxH);
      const legendaTexto = resolverLegendaFoto(i, legendasFotos, ev.legendaPadraoFoto);

      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [
            new ImageRun({
              data: imgBuffer,
              transformation: { width, height }
            })
          ]
        })
      );

      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: legendaTexto,
              italics: true,
              font: fonte,
              size: Math.max(16, szCorpo - 2)
            })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: ctx.cfgDocx.marginTop || 1134,
              bottom: ctx.cfgDocx.marginBottom || 1134,
              left: ctx.cfgDocx.marginLeft || 1417,
              right: ctx.cfgDocx.marginRight || 1417
            }
          }
        },
        children: paragrafos
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(caminhoSaidaDocx, buffer);
  return caminhoSaidaDocx;
}

async function gerarPdfCirurgico(dadosPaciente, dadosCirurgia, caminhoSaidaPdf, imagens = [], opcoes = {}) {
  const ctx = resolverContextoCirurgico(opcoes);
  const ev = ctx.estiloVisualCirurgico;
  const legendasFotos = opcoes.legendasFotos || dadosCirurgia?.legendasFotos || [];

  const logoSrc = (ev.tipoCabecalho !== 'sem-logo-tipografico')
    ? lerImagemDataUri(ctx.logoPath)
    : '';

  const textoTotal = (dadosCirurgia.descricaoProcedimento || '') + (dadosCirurgia.evolucaoConsideracoes || '');
  const ehTextoLongo = textoTotal.length > 1750;
  const ehTextoMuitoLongo = textoTotal.length > 2300;

  const fontSizePt = ctx.layout.font_size_body || (ehTextoMuitoLongo ? '9.3pt' : (ehTextoLongo ? '10.2pt' : '11pt'));
  const fontSizeCabecalhoPt = ctx.layout.font_size_cabecalho || fontSizePt;
  const lineHeight = ctx.layout.line_height || (ehTextoMuitoLongo ? '1.24' : (ehTextoLongo ? '1.28' : '1.35'));
  const marginBottomP = ctx.layout.paragraph_spacing || (ehTextoMuitoLongo ? '6px' : (ehTextoLongo ? '8px' : '11px'));
  const margemTop = ctx.layout.margin_top || (ehTextoMuitoLongo ? '1.2cm' : (ehTextoLongo ? '1.5cm' : '1.8cm'));
  const margemBottom = ctx.layout.margin_bottom || margemTop;
  const margemLeft = ctx.layout.margin_left || (ehTextoMuitoLongo ? '1.8cm' : '2.0cm');
  const margemRight = ctx.layout.margin_right || margemLeft;
  const logoWidth = ehTextoMuitoLongo ? '110px' : (ehTextoLongo ? '120px' : '135px');
  const marginHeader = ehTextoMuitoLongo ? '12px' : '18px';
  const marginTitulo = ehTextoMuitoLongo ? '10px 0 12px 0' : (ehTextoLongo ? '14px 0 16px 0' : '18px 0 20px 0');
  const marginAssinatura = ehTextoMuitoLongo ? '14px' : '22px';
  const assinaturaMaxHeight = ehTextoMuitoLongo ? '50px' : '65px';

  const assinaturaSrc = ev.mostrarAssinaturaImagem ? lerImagemDataUri(ctx.assinaturaPath) : '';
  const assinaturaHtml = assinaturaSrc
    ? `<img src="${assinaturaSrc}" class="assinatura-img" alt="Assinatura" />`
    : '';

  const descParagrafos = (dadosCirurgia.descricaoProcedimento || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const renderSecao = (rotulo, conteudoHtml, ehBlocoMultiplo = false) => {
    const rotuloEsc = escaparHtml(rotulo);
    if (ev.estiloSecoes === 'barra-lateral') {
      return `
        <div class="secao-barra">
          <div class="secao-titulo-barra">${rotuloEsc}</div>
          <div class="secao-corpo">${ehBlocoMultiplo ? conteudoHtml : `<p>${conteudoHtml}</p>`}</div>
        </div>`;
    }
    if (ev.estiloSecoes === 'tarja-colorida') {
      return `
        <div class="secao-tarja">
          <div class="secao-titulo-tarja">${rotuloEsc}</div>
          <div class="secao-corpo">${ehBlocoMultiplo ? conteudoHtml : `<p>${conteudoHtml}</p>`}</div>
        </div>`;
    }
    if (ev.estiloSecoes === 'sublinhado') {
      return `
        <div class="secao-sublinhada">
          <div class="secao-titulo-sublinhado">${rotuloEsc}</div>
          <div class="secao-corpo">${ehBlocoMultiplo ? conteudoHtml : `<p>${conteudoHtml}</p>`}</div>
        </div>`;
    }
    // Padrão clássico: negrito-inline
    if (ehBlocoMultiplo) {
      return conteudoHtml;
    }
    return `<p><strong class="rotulo-inline">${rotuloEsc}:</strong> ${conteudoHtml}</p>`;
  };

  let descHtml = '';
  if (ev.estiloSecoes === 'negrito-inline') {
    if (descParagrafos.length === 0) {
      descHtml = `<p><strong class="rotulo-inline">${escaparHtml(ev.rotulosSecoes.descricao)}:</strong> Não informada.</p>`;
    } else {
      descParagrafos.forEach((par, idx) => {
        if (idx === 0) {
          descHtml += `<p><strong class="rotulo-inline">${escaparHtml(ev.rotulosSecoes.descricao)}:</strong> ${escaparHtml(par)}</p>`;
        } else {
          descHtml += `<p>${escaparHtml(par)}</p>`;
        }
      });
    }
  } else {
    const innerPars = descParagrafos.length > 0
      ? descParagrafos.map(p => `<p>${escaparHtml(p)}</p>`).join('\n')
      : '<p>Não informada.</p>';
    descHtml = renderSecao(ev.rotulosSecoes.descricao, innerPars, true);
  }

  const renderLogoTag = () => logoSrc
    ? `<img src="${logoSrc}" class="logo-img" alt="${escaparHtml(ctx.clinicaNome)}">`
    : `<div style="font-weight:900;font-size:18pt;color:${ev.corPrimaria};">${escaparHtml(ctx.clinicaNome)}</div>`;

  const renderCabecalhoHtml = (ehAnexo = false) => {
    const dadosCol1 = ehAnexo
      ? `<div><strong>Paciente:</strong> ${escaparHtml(dadosPaciente.nome || 'Não informado')}</div>
         <div><strong>Espécie:</strong> ${escaparHtml(dadosPaciente.especie || 'Não informada')} | <strong>Sexo:</strong> ${escaparHtml(dadosPaciente.sexo || 'Não informado')}</div>`
      : `<div><strong>Nome:</strong> ${escaparHtml(dadosPaciente.nome || 'Não informado')}</div>
         <div><strong>Sexo:</strong> ${escaparHtml(dadosPaciente.sexo || 'Não informado')}</div>
         <div><strong>Idade:</strong> ${escaparHtml(dadosPaciente.idade || 'Não informado')}</div>`;

    const dadosCol2 = ehAnexo
      ? `<div><strong>${escaparHtml(ev.rotuloResponsavel)}:</strong> ${escaparHtml(dadosPaciente.tutor || 'Não informado')}</div>
         <div><strong>Data:</strong> ${escaparHtml(dadosCirurgia.data || dadosPaciente.data || 'Não informada')}</div>`
      : `<div><strong>${escaparHtml(ev.rotuloResponsavel)}:</strong> ${escaparHtml(dadosPaciente.tutor || 'Não informado')}</div>
         <div><strong>Espécie:</strong> ${escaparHtml(dadosPaciente.especie || 'Não informada')}</div>
         <div><strong>Peso:</strong> ${escaparHtml(dadosPaciente.peso || 'Não informado')}</div>`;

    if (ev.tipoCabecalho === 'logo-centro' && !ehAnexo) {
      return `
        <div class="header-centro">
          <div class="header-centro-logo">${renderLogoTag()}</div>
          ${ev.rodapeContato ? `<div class="header-contato">${escaparHtml(ev.rodapeContato)}</div>` : ''}
        </div>
        <table class="paciente-table ${ev.tipoDadosPaciente}">
          <tr>
            <td class="col-info-half">${dadosCol1}</td>
            <td class="col-info-half">${dadosCol2}</td>
          </tr>
        </table>`;
    }

    if (ev.tipoCabecalho === 'banner-superior' && !ehAnexo) {
      return `
        <div class="header-banner">
          <div class="header-banner-logo">${renderLogoTag()}</div>
          <div class="header-banner-texto">
            <div class="header-banner-clinica">${escaparHtml(ctx.clinicaNome)}</div>
            ${ev.rodapeContato ? `<div class="header-banner-sub">${escaparHtml(ev.rodapeContato)}</div>` : ''}
          </div>
        </div>
        <table class="paciente-table ${ev.tipoDadosPaciente}">
          <tr>
            <td class="col-info-half">${dadosCol1}</td>
            <td class="col-info-half">${dadosCol2}</td>
          </tr>
        </table>`;
    }

    return `
      <table class="header-table ${ehAnexo ? 'header-anexo' : ''} ${ev.tipoDadosPaciente}">
        <tr>
          <td class="logo-cell">${renderLogoTag()}</td>
          <td class="col-info">${dadosCol1}</td>
          <td class="col-info">${dadosCol2}</td>
        </tr>
      </table>`;
  };

  let anexoImagensHtml = '';
  const imagensValidasPdf = (imagens || []).filter(img => fs.existsSync(img));
  if (imagensValidasPdf.length > 0) {
    const cardsHtml = imagensValidasPdf.map((imgCaminho, idx) => {
      const imgSrc = lerImagemFileUrl(imgCaminho);
      const ehUnica = imagensValidasPdf.length === 1;
      const legendaTexto = resolverLegendaFoto(idx, legendasFotos, ev.legendaPadraoFoto);

      return `
        <div class="anexo-card ${ehUnica ? 'unica' : ''}">
          <div class="anexo-img-wrapper">
            <img src="${imgSrc}" class="anexo-foto ${ehUnica ? 'foto-grande' : ''}" alt="Registro Intraoperatório ${idx + 1}">
          </div>
          <div class="anexo-legenda">${escaparHtml(legendaTexto)}</div>
        </div>
      `;
    }).join('\n');

    anexoImagensHtml = `
      <div class="pagina-anexo">
        ${renderCabecalhoHtml(true)}

        <div class="titulo-anexo">${escaparHtml(ev.tituloRegistroFotografico)}</div>

        <div class="anexo-grade ${imagensValidasPdf.length === 1 ? 'grade-unica' : (imagensValidasPdf.length === 2 ? 'grade-dupla' : 'grade-multipla')}">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  const alignAssinaturaCss = ev.posicaoAssinatura === 'direita'
    ? 'right'
    : (ev.posicaoAssinatura === 'esquerda' ? 'left' : 'center');
  const marginAssImg = alignAssinaturaCss === 'center'
    ? '0 auto 3px auto'
    : (alignAssinaturaCss === 'right' ? '0 0 3px auto' : '0 auto 3px 0');

  const tituloDecoracaoCss = ev.decoracaoTitulo === 'faixa-colorida'
    ? `background: ${ev.corPrimaria}; color: #fff; padding: 6px 12px; border-radius: 4px;`
    : (ev.decoracaoTitulo === 'borda-inferior'
      ? `border-bottom: 2px solid ${ev.corPrimaria}; padding-bottom: 5px;`
      : '');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escaparHtml(ev.tituloDocumento)} - ${escaparHtml(dadosPaciente.nome || 'Paciente')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: ${margemTop} ${margemRight} ${margemBottom} ${margemLeft};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${ctx.layout.font_family || "'Calibri', 'Segoe UI', Arial, sans-serif"};
      font-size: ${fontSizePt};
      line-height: ${lineHeight};
      color: #000;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${marginHeader};
    }
    .header-table td {
      vertical-align: middle;
      padding: 4px 6px;
      font-size: ${fontSizeCabecalhoPt};
      border: none;
    }
    .header-table.tabela-zebrada td.col-info,
    .header-table.tabela-borda-simples td.col-info {
      border: 1px solid ${ev.corBordaTabelas};
      background: ${ev.tipoDadosPaciente === 'tabela-zebrada' ? ev.corFundoBlocos : '#fff'};
    }
    .paciente-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${marginHeader};
    }
    .paciente-table td {
      padding: 6px 10px;
      font-size: ${fontSizeCabecalhoPt};
      vertical-align: top;
      border: 1px solid ${ev.corBordaTabelas};
      background: ${ev.tipoDadosPaciente === 'tabela-zebrada' ? ev.corFundoBlocos : '#fff'};
    }
    .col-info-half {
      width: 50%;
      line-height: 1.4;
    }
    .header-centro {
      text-align: center;
      margin-bottom: 12px;
    }
    .header-centro-logo .logo-img {
      margin: 0 auto;
      max-width: 210px;
      object-position: center;
    }
    .header-contato {
      font-size: 8.5pt;
      color: #555;
      margin-top: 4px;
    }
    .header-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${ev.corPrimaria};
      color: #fff;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .header-banner-logo .logo-img {
      max-height: 55px;
      max-width: 170px;
      background: #fff;
      padding: 4px;
      border-radius: 4px;
      object-position: left center;
    }
    .header-banner-clinica {
      font-size: 13pt;
      font-weight: 800;
      text-align: right;
    }
    .header-banner-sub {
      font-size: 8.5pt;
      opacity: 0.9;
      text-align: right;
    }
    .logo-cell {
      width: 34%;
      max-width: 175px;
      padding-right: 10px;
      text-align: left;
      vertical-align: middle;
    }
    .logo-img {
      width: auto;
      max-width: 100%;
      max-height: 72px;
      object-fit: contain;
      object-position: left center;
      height: auto;
      display: block;
    }
    .col-info {
      width: 34%;
      line-height: 1.38;
    }
    .titulo-relatorio {
      text-align: ${ev.alinhamentoTitulo === 'left' ? 'left' : 'center'};
      font-size: ${ctx.layout.font_size_titulo || '13.5pt'};
      font-weight: bold;
      letter-spacing: 0.5px;
      margin: ${marginTitulo};
      text-transform: uppercase;
      color: ${ev.corPrimaria};
      ${tituloDecoracaoCss}
    }
    .subtitulo-relatorio {
      text-align: ${ev.alinhamentoTitulo === 'left' ? 'left' : 'center'};
      font-size: 9.5pt;
      color: ${ev.corSecundaria};
      font-style: italic;
      margin-top: -10px;
      margin-bottom: 14px;
    }
    .conteudo-cirurgico p {
      text-align: justify;
      text-justify: inter-word;
      margin-bottom: ${marginBottomP};
      line-height: ${lineHeight};
    }
    .rotulo-inline {
      font-weight: bold;
      color: ${ev.corPrimaria};
    }
    .secao-barra {
      border-left: 3px solid ${ev.corPrimaria};
      padding-left: 10px;
      margin-bottom: ${marginBottomP};
    }
    .secao-titulo-barra {
      font-weight: bold;
      color: ${ev.corPrimaria};
      text-transform: uppercase;
      font-size: ${fontSizePt};
      margin-bottom: 3px;
    }
    .secao-tarja {
      margin-bottom: ${marginBottomP};
    }
    .secao-titulo-tarja {
      background: ${ev.corPrimaria};
      color: #fff;
      font-weight: bold;
      text-transform: uppercase;
      font-size: ${fontSizePt};
      padding: 3px 8px;
      border-radius: 3px;
      margin-bottom: 5px;
    }
    .secao-sublinhada {
      margin-bottom: ${marginBottomP};
    }
    .secao-titulo-sublinhado {
      font-weight: bold;
      color: ${ev.corPrimaria};
      text-transform: uppercase;
      font-size: ${fontSizePt};
      border-bottom: 1px solid ${ev.corBordaTabelas};
      padding-bottom: 2px;
      margin-bottom: 4px;
    }
    .assinatura-bloco {
      text-align: ${alignAssinaturaCss};
      margin-top: ${marginAssinatura};
      page-break-inside: avoid;
    }
    .assinatura-img {
      max-height: ${assinaturaMaxHeight};
      display: block;
      margin: ${marginAssImg};
    }
    .assinatura-linha {
      width: 220px;
      border-top: 1px solid #555;
      margin: ${alignAssinaturaCss === 'center' ? '6px auto 4px auto' : (alignAssinaturaCss === 'right' ? '6px 0 4px auto' : '6px auto 4px 0')};
    }
    .assinatura-nome {
      font-size: ${fontSizePt};
      font-weight: bold;
      line-height: 1.25;
    }
    .assinatura-crmv {
      font-size: ${fontSizePt};
      line-height: 1.25;
    }
    .rodape-bloco {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8.5pt;
      color: #555;
    }
    .rodape-aviso {
      font-style: italic;
      margin-bottom: 3px;
    }
    .pagina-anexo {
      page-break-before: always;
      break-before: page;
      padding-top: 5px;
    }
    .header-anexo {
      margin-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
    }
    .titulo-anexo {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin: 10px 0 14px 0;
      text-transform: uppercase;
      color: ${ev.corPrimaria};
    }
    .anexo-grade {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
    }
    .grade-dupla {
      display: flex;
      flex-direction: row;
      justify-content: center;
      gap: 15px;
    }
    .anexo-card {
      text-align: center;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .anexo-card.unica {
      max-width: 95%;
      margin: 0 auto;
    }
    .anexo-img-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      border-radius: 4px;
    }
    .anexo-foto {
      max-width: 100%;
      max-height: 11cm;
      object-fit: contain;
      display: block;
    }
    .anexo-foto.foto-grande {
      max-height: 17.5cm;
      max-width: 100%;
    }
    .anexo-legenda {
      margin-top: 8px;
      font-size: 9.5pt;
      color: #555;
      font-style: italic;
    }
  </style>
</head>
<body>
  ${renderCabecalhoHtml(false)}

  <div class="titulo-relatorio">${escaparHtml(ev.tituloDocumento)}</div>
  ${ev.subtituloDocumento ? `<div class="subtitulo-relatorio">${escaparHtml(ev.subtituloDocumento)}</div>` : ''}

  <div class="conteudo-cirurgico">
    ${renderSecao(ev.rotulosSecoes.data, escaparHtml(dadosCirurgia.data || dadosPaciente.data || 'Não informada'))}
    ${renderSecao(ev.rotulosSecoes.procedimento, escaparHtml(dadosCirurgia.procedimento || 'Não informado'))}
    ${resolverOrdemSecoesCirurgia(dadosCirurgia.ordemSecoes).map((secaoKey) => {
      if (secaoKey === 'diagnostico') {
        return renderSecao(ev.rotulosSecoes.diagnostico, escaparHtml(dadosCirurgia.diagnosticoPreCirurgico || 'Não informado'));
      }
      if (secaoKey === 'descricao') {
        return descHtml;
      }
      if (secaoKey === 'evolucao') {
        return renderSecao(ev.rotulosSecoes.evolucao, escaparHtml(dadosCirurgia.evolucaoConsideracoes || 'Procedimento transcorrido sem intercorrências.'));
      }
      return '';
    }).join('\n    ')}
  </div>

  ${(assinaturaHtml || ev.mostrarAssinaturaTexto) ? `
  <div class="assinatura-bloco">
    ${assinaturaHtml}
    ${ev.linhaAssinatura ? '<div class="assinatura-linha"></div>' : ''}
    ${ev.mostrarAssinaturaTexto ? `<div class="assinatura-nome">${escaparHtml(ctx.nomeMedico)}</div>` : ''}
    ${ev.mostrarAssinaturaTexto ? `<div class="assinatura-crmv">${escaparHtml(ctx.crmvMedico)}</div>` : ''}
  </div>` : ''}

  ${(ev.textoAvisoLegal || ev.rodapeContato || ctx.compartilhamento?.qrCodeDataUri) ? `
    <div class="rodape-bloco" style="${ctx.compartilhamento?.qrCodeDataUri ? 'display:flex; align-items:center; justify-content:space-between; gap:10px; text-align:left;' : ''}">
      <div style="${ctx.compartilhamento?.qrCodeDataUri ? 'flex:1;' : ''}">
        ${ev.textoAvisoLegal ? `<div class="rodape-aviso">${escaparHtml(ev.textoAvisoLegal)}</div>` : ''}
        ${ev.rodapeContato ? `<div class="rodape-contato">${escaparHtml(ev.rodapeContato)}</div>` : ''}
      </div>
      ${ctx.compartilhamento?.qrCodeDataUri ? `
        <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
          <img src="${ctx.compartilhamento.qrCodeDataUri}" alt="QR Code do relatório digital" style="width:44px; height:44px; display:block; border:1px solid #cbd5e1; border-radius:3px; padding:1px; background:#fff;">
          <span style="font-size:6pt; font-style:normal; color:#475569; margin-top:1px; white-space:nowrap;">Versão digital</span>
        </div>
      ` : ''}
    </div>
  ` : ''}

  ${anexoImagensHtml}
</body>
</html>`;

  const htmlTempPath = path.join(os.tmpdir(), `relatorio_cirurgico_temp_${Date.now()}_${Math.random().toString(36).substring(7)}.html`);
  fs.writeFileSync(htmlTempPath, html, 'utf8');

  try {
    const { compilarPDF } = require('./compilador_pdf');
    await compilarPDF(htmlTempPath, caminhoSaidaPdf);
    return caminhoSaidaPdf;
  } finally {
    if (fs.existsSync(htmlTempPath)) {
      try { fs.unlinkSync(htmlTempPath); } catch (e) {}
    }
  }
}

async function gerarDocumentosCirurgicos(dadosPaciente, dadosCirurgia, pastaDestino, imagens = [], opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = opcoes.layout || await obterLayout(usuario.id || null);
  let perfilLaudo = opcoes.perfilLaudo;
  if (!perfilLaudo && usuario.id) {
    try {
      const { obterPerfilLaudo } = require('./gerenciador_perfil_laudo');
      perfilLaudo = await obterPerfilLaudo(usuario.id);
    } catch (_) {}
  }
  let perfilCirurgico = opcoes.perfilCirurgico;
  if (!perfilCirurgico && usuario.id) {
    try {
      const { obterPerfilCirurgico } = require('./gerenciador_perfil_cirurgico');
      perfilCirurgico = await obterPerfilCirurgico(usuario.id);
    } catch (_) {}
  }
  const contexto = resolverContextoCirurgico({ ...opcoes, usuario, layout, perfilLaudo, perfilCirurgico });

  const limparSegmentoArquivo = (v) =>
    String(v || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const petUpper = limparSegmentoArquivo(dadosPaciente?.nome) || 'PACIENTE';
  const respBruto = String(dadosPaciente?.tutor || dadosPaciente?.responsavel || '').trim();
  const respInvalido = /^(nao\s*informado|nao\s*identificado|n\/a|-)$/i.test(
    respBruto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
  const respUpper = respInvalido ? '' : limparSegmentoArquivo(respBruto);
  const nomeBaseArquivo = respUpper ? `${petUpper} - ${respUpper}` : petUpper;

  const caminhoDocx = path.join(pastaDestino, `${nomeBaseArquivo}.docx`);
  const caminhoPdf = path.join(pastaDestino, `${nomeBaseArquivo}.pdf`);

  await gerarDocxCirurgico(dadosPaciente, dadosCirurgia, caminhoDocx, imagens, contexto);
  await gerarPdfCirurgico(dadosPaciente, dadosCirurgia, caminhoPdf, imagens, { ...contexto, compartilhamento: opcoes.compartilhamento || null });

  return { caminhoDocx, caminhoPdf };
}

module.exports = {
  resolverCaminhoArquivo,
  resolverContextoCirurgico,
  resolverOrdemSecoesCirurgia,
  resolverLegendaFoto,
  gerarDocxCirurgico,
  gerarPdfCirurgico,
  gerarDocumentosCirurgicos
};

/**
 * Extrator Agnóstico de Ativos Gráficos de PDFs (300 DPI + pdfimages + Processamento PNG Nativo Node.js)
 * - Detecta automaticamente se o PDF usa um Papel Timbrado de Página Inteira (Full-Page A4 Stationery
 *   contendo cabeçalho + marca d'água central + rodapé, como no Word da Dra. Carolina Cardoso)
 *   ou Faixas de Cabeçalho/Rodapé recortadas (como em templates do Canva/Word sem fundo A4 único).
 * - Extrai a assinatura manuscrita isolada (via objeto de imagem embutido ou recorte geométrico acima/abaixo do CRMV)
 *   e converte o fundo branco para transparente (canal Alpha).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodificarPng(buffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(sig)) {
    throw new Error('Arquivo não é um PNG válido.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 2;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || ![0, 2, 6].includes(colorType)) {
    throw new Error(`Formato PNG não suportado diretamente (bitDepth=${bitDepth}, colorType=${colorType}).`);
  }

  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));

  const recon = new Uint8Array(width * height * bpp);
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = y * (stride + 1) + 1;
    const rowOut = y * stride;
    const prevOut = (y - 1) * stride;

    for (let i = 0; i < stride; i++) {
      const xByte = raw[rowIn + i];
      const a = i >= bpp ? recon[rowOut + i - bpp] : 0;
      const b = y > 0 ? recon[prevOut + i] : 0;
      const c = (y > 0 && i >= bpp) ? recon[prevOut + i - bpp] : 0;

      let val = xByte;
      if (filter === 1) val = (xByte + a) & 0xff;
      else if (filter === 2) val = (xByte + b) & 0xff;
      else if (filter === 3) val = (xByte + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) val = (xByte + paethPredictor(a, b, c)) & 0xff;

      recon[rowOut + i] = val;
    }

    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      const srcIdx = rowOut + x * bpp;
      if (bpp === 4) {
        rgba[dstIdx] = recon[srcIdx];
        rgba[dstIdx + 1] = recon[srcIdx + 1];
        rgba[dstIdx + 2] = recon[srcIdx + 2];
        rgba[dstIdx + 3] = recon[srcIdx + 3];
      } else if (bpp === 3) {
        rgba[dstIdx] = recon[srcIdx];
        rgba[dstIdx + 1] = recon[srcIdx + 1];
        rgba[dstIdx + 2] = recon[srcIdx + 2];
        rgba[dstIdx + 3] = 255;
      } else {
        rgba[dstIdx] = recon[srcIdx];
        rgba[dstIdx + 1] = recon[srcIdx];
        rgba[dstIdx + 2] = recon[srcIdx];
        rgba[dstIdx + 3] = 255;
      }
    }
  }

  return { width, height, data: rgba };
}

function criarChunkPng(typeStr, dataBuf) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const crcInput = Buffer.concat([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function codificarPng({ width, height, data }) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    const srcStart = y * stride;
    Buffer.from(data.buffer, data.byteOffset + srcStart, stride).copy(raw, rowStart + 1);
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    criarChunkPng('IHDR', ihdr),
    criarChunkPng('IDAT', compressed),
    criarChunkPng('IEND', Buffer.alloc(0))
  ]);
}

function recortarImagemRgba(img, box, opcoes = {}) {
  const x0 = Math.max(0, Math.min(img.width - 1, Math.round(box.x0)));
  const y0 = Math.max(0, Math.min(img.height - 1, Math.round(box.y0)));
  const x1 = Math.max(x0 + 1, Math.min(img.width, Math.round(box.x1)));
  const y1 = Math.max(y0 + 1, Math.min(img.height, Math.round(box.y1)));

  const w = x1 - x0;
  const h = y1 - y0;
  const out = new Uint8Array(w * h * 4);
  const removerFundoBranco = Boolean(opcoes.removerFundoBranco);
  const limiarBranco = opcoes.limiarBranco || 240;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = ((y0 + y) * img.width + (x0 + x)) * 4;
      const dstIdx = (y * w + x) * 4;
      const r = img.data[srcIdx];
      const g = img.data[srcIdx + 1];
      const b = img.data[srcIdx + 2];
      let a = img.data[srcIdx + 3];

      if (removerFundoBranco) {
        const media = (r + g + b) / 3;
        if (media >= limiarBranco) {
          a = 0;
        }
      }

      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = a;
    }
  }

  return { width: w, height: h, data: out };
}

function paginaEstaEmBrancoNoCorpo(img) {
  const yLimite = Math.floor(img.height * 0.88);
  let naoBrancos = 0;
  const passo = 4;
  let totalAmostrado = 0;

  for (let y = Math.floor(img.height * 0.04); y < yLimite; y += passo) {
    for (let x = Math.floor(img.width * 0.04); x < Math.floor(img.width * 0.96); x += passo) {
      totalAmostrado++;
      const idx = (y * img.width + x) * 4;
      if (img.data[idx] < 245 || img.data[idx + 1] < 245 || img.data[idx + 2] < 245) {
        naoBrancos++;
      }
    }
  }

  return totalAmostrado > 0 && (naoBrancos / totalAmostrado) < 0.0015;
}

function paginaEhMosaicoUltrassom(img) {
  const passo = 6;
  for (let faixa = 0; faixa < 4; faixa++) {
    const yStart = Math.floor(img.height * (0.04 + faixa * 0.20));
    const yEnd = Math.floor(img.height * (0.24 + faixa * 0.20));
    let escuros = 0;
    let total = 0;

    for (let y = yStart; y < yEnd; y += passo) {
      for (let x = Math.floor(img.width * 0.05); x < Math.floor(img.width * 0.95); x += passo) {
        total++;
        const idx = (y * img.width + x) * 4;
        const lum = (img.data[idx] + img.data[idx + 1] + img.data[idx + 2]) / 3;
        if (lum < 65) escuros++;
      }
    }

    if (total > 0 && (escuros / total) > 0.28) {
      return true;
    }
  }
  return false;
}

/**
 * Detecta se a região de dados do paciente na Página 1 possui bordas de tabela ("separado com traços").
 * Verifica a existência de linha vertical contínua na borda esquerda/direita da tabela ou linhas horizontais internas.
 */
function detectarBordasTabelaPaciente(imgPag1, yMinPt, yMaxPt, xMinPt, xMaxPt, pageWidthPt, pageHeightPt) {
  const scaleX = imgPag1.width / pageWidthPt;
  const scaleY = imgPag1.height / pageHeightPt;

  const yTopPx = Math.max(0, Math.floor((yMinPt - 6) * scaleY));
  const yBotPx = Math.min(imgPag1.height - 1, Math.ceil((yMaxPt + 6) * scaleY));
  const xLeftPx = Math.max(0, Math.floor((xMinPt - 10) * scaleX));
  const xRightPx = Math.min(imgPag1.width - 1, Math.ceil((xMaxPt + 10) * scaleX));

  const midXStart = Math.floor(xLeftPx + (xRightPx - xLeftPx) * 0.15);
  const midXEnd = Math.floor(xLeftPx + (xRightPx - xLeftPx) * 0.85);
  const spanWidth = Math.max(1, midXEnd - midXStart);

  let linhasHorizontaisDetectadas = 0;
  let ultimaLinhaY = -20;

  for (let y = yTopPx; y <= yBotPx; y++) {
    let naoBrancos = 0;
    for (let x = midXStart; x < midXEnd; x += 2) {
      const idx = (y * imgPag1.width + x) * 4;
      const lum = (imgPag1.data[idx] + imgPag1.data[idx + 1] + imgPag1.data[idx + 2]) / 3;
      if (lum < 238) naoBrancos++;
    }
    const ratio = naoBrancos / (spanWidth / 2);
    if (ratio > 0.82 && (y - ultimaLinhaY) > 12) {
      linhasHorizontaisDetectadas++;
      ultimaLinhaY = y;
    }
  }

  return linhasHorizontaisDetectadas >= 2;
}

/**
 * Lista todos os objetos de imagem embutidos no PDF via `pdfimages -list`.
 */
function listarMetadadosImagensPdf(caminhoPdf) {
  try {
    const out = execFileSync('pdfimages', ['-list', caminhoPdf], {
      encoding: 'utf8',
      timeout: 15000
    });
    const linhas = out.split(/\r?\n/).slice(2);
    const itens = [];
    for (const l of linhas) {
      const parts = l.trim().split(/\s+/);
      if (parts.length >= 12 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        itens.push({
          page: parseInt(parts[0], 10),
          num: parseInt(parts[1], 10),
          type: parts[2],
          width: parseInt(parts[3], 10),
          height: parseInt(parts[4], 10),
          color: parts[5],
          objectId: parseInt(parts[8], 10)
        });
      }
    }
    return itens;
  } catch (_) {
    return [];
  }
}

/**
 * Extrai objetos de imagem embutidos no PDF via `pdfimages -png`.
 */
function extrairObjetosImagemPdf(caminhoPdf, pastaTemp) {
  const prefixo = path.join(pastaTemp, 'emb');
  try {
    execFileSync('pdfimages', ['-png', caminhoPdf, prefixo], {
      stdio: 'pipe',
      timeout: 25000
    });
    return fs.readdirSync(pastaTemp)
      .filter(f => f.startsWith('emb-') && f.endsWith('.png'))
      .sort()
      .map(f => path.join(pastaTemp, f));
  } catch (_) {
    return [];
  }
}

function rasterizarPdfEmPngs(caminhoPdf, pastaTemp, maxPaginas = 7) {
  const prefixo = path.join(pastaTemp, `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  try {
    execFileSync('pdftoppm', ['-png', '-r', '300', '-f', '1', '-l', String(maxPaginas), caminhoPdf, prefixo], {
      stdio: 'pipe',
      timeout: 30000
    });
  } catch (err) {
    throw new Error(`Falha ao rasterizar PDF com pdftoppm: ${err.message}`);
  }

  const dir = path.dirname(prefixo);
  const base = path.basename(prefixo);
  const arquivos = fs.readdirSync(dir)
    .filter(f => f.startsWith(base) && f.endsWith('.png'))
    .sort()
    .map(f => path.join(dir, f));

  return arquivos.map((arq, idx) => {
    const buf = fs.readFileSync(arq);
    const decoded = decodificarPng(buf);
    const emBranco = paginaEstaEmBrancoNoCorpo(decoded);
    const ehMosaico = !emBranco && paginaEhMosaicoUltrassom(decoded);
    return {
      numeroPagina: idx + 1,
      caminhoPng: arq,
      width: decoded.width,
      height: decoded.height,
      emBranco,
      ehMosaico,
      ehPaginaTexto: !emBranco && !ehMosaico,
      decoded
    };
  });
}

function bannerEhFullBleed(imgBanner) {
  let bordasColoridas = 0;
  let total = 0;
  for (let y = 0; y < Math.floor(imgBanner.height * 0.5); y += 4) {
    for (const x of [4, 12, imgBanner.width - 13, imgBanner.width - 5]) {
      if (x >= 0 && x < imgBanner.width) {
        total++;
        const idx = (y * imgBanner.width + x) * 4;
        if (imgBanner.data[idx] < 250 || imgBanner.data[idx + 1] < 250 || imgBanner.data[idx + 2] < 250) {
          bordasColoridas++;
        }
      }
    }
  }
  return total > 0 && (bordasColoridas / total) > 0.25;
}

/**
 * Pipeline Agnóstico de Extração de Ativos:
 * 1. Verifica se o PDF possui um Papel Timbrado A4 de página inteira embutido (ex: `page_background.png`).
 * 2. Caso contrário, recorta `header_banner.png` (acima do primeiro texto da Pág. 1) e `footer_logo.png` (abaixo do último texto).
 * 3. Extrai a rubrica/assinatura isolada (`signature.png`) com fundo transparente, seja via objeto de imagem embutido
 *    na página de assinatura ou via recorte geométrico acima/abaixo do CRMV.
 */
function extrairAtivosVisuaisDasPaginas(paginasRenderizadas, pastaSaidaAtivos, opcoes = {}) {
  if (!fs.existsSync(pastaSaidaAtivos)) {
    fs.mkdirSync(pastaSaidaAtivos, { recursive: true });
  }

  const paginasTexto = paginasRenderizadas.filter(p => p.ehPaginaTexto);
  const pag1 = paginasTexto[0] || paginasRenderizadas[0];
  if (!pag1) {
    throw new Error('Nenhuma página válida encontrada no PDF para extração de ativos.');
  }

  const caminhoPdf = opcoes.caminhoPdf || null;
  const pastaTemp = opcoes.pastaTemp || path.dirname(pag1.caminhoPng);
  const firstTextYMinPt = opcoes.firstTextYMinPt || 150;
  const pageHeightPt = opcoes.pageHeightPt || 842;
  const crmvBlock = opcoes.crmvBlock || null; // { page, yMin, yMax, xMin, xMax }

  const resultado = {
    stationeryMode: 'cropped_bands', // 'full_page_background' | 'cropped_bands'
    pageBackgroundPath: null,
    headerBannerPath: null,
    signaturePath: null,
    footerLogoPath: null,
    headerEhFullBleed: false,
    signaturePositionOrder: 'text_above_image',
    paginasTextoQtd: paginasTexto.length,
    fotosPorPaginaDetectadas: 8
  };

  let listaMetaImgs = [];
  let arquivosEmb = [];
  if (caminhoPdf && fs.existsSync(caminhoPdf)) {
    listaMetaImgs = listarMetadadosImagensPdf(caminhoPdf);
    arquivosEmb = extrairObjetosImagemPdf(caminhoPdf, pastaTemp);
  }

  // Detecta quantidade de fotos por página na primeira página de mosaico
  const primeiraPagMosaico = paginasRenderizadas.find(p => p.ehMosaico);
  if (primeiraPagMosaico && listaMetaImgs.length > 0) {
    const imgsPagMosaico = listaMetaImgs.filter(
      im => im.page === primeiraPagMosaico.numeroPagina &&
            im.type === 'image' &&
            im.height < 950 &&
            im.width > 180
    );
    if (imgsPagMosaico.length >= 2 && imgsPagMosaico.length <= 12) {
      resultado.fotosPorPaginaDetectadas = imgsPagMosaico.length;
    }
  }

  // 1. Verifica se existe Papel Timbrado A4 de Página Inteira (ex: 1414x2000 em todas as páginas)
  const metaFullPage = listaMetaImgs.find(im => {
    const ratio = im.width / Math.max(1, im.height);
    return im.page === 1 && im.type === 'image' && im.height >= 950 && ratio >= 0.65 && ratio <= 0.76;
  });

  if (metaFullPage && arquivosEmb[metaFullPage.num] && fs.existsSync(arquivosEmb[metaFullPage.num])) {
    const destinoBg = path.join(pastaSaidaAtivos, 'page_background.png');
    fs.copyFileSync(arquivosEmb[metaFullPage.num], destinoBg);
    resultado.stationeryMode = 'full_page_background';
    resultado.pageBackgroundPath = destinoBg;
  }

  // 2. Recorta também o header_banner.png do topo da Página 1 (acima do primeiro texto)
  const yMaxHeaderPx = Math.max(
    60,
    Math.floor(((firstTextYMinPt - 6) / pageHeightPt) * pag1.height)
  );
  const imgHeader = recortarImagemRgba(pag1.decoded, {
    x0: 0,
    y0: 0,
    x1: pag1.width,
    y1: yMaxHeaderPx
  });
  resultado.headerEhFullBleed = bannerEhFullBleed(imgHeader);
  const caminhoHeader = path.join(pastaSaidaAtivos, 'header_banner.png');
  fs.writeFileSync(caminhoHeader, codificarPng(imgHeader));
  resultado.headerBannerPath = caminhoHeader;

  // 3. Se não for papel timbrado de página inteira, verifica se há mini-logo de rodapé na Página 1
  if (resultado.stationeryMode !== 'full_page_background') {
    const yStartFooter = Math.floor(pag1.height * 0.955);
    let minX = pag1.width;
    let maxX = 0;
    let minY = pag1.height;
    let maxY = 0;
    let count = 0;

    for (let y = yStartFooter; y < pag1.height; y++) {
      for (let x = 0; x < pag1.width; x++) {
        const idx = (y * pag1.width + x) * 4;
        if (pag1.decoded.data[idx] < 242 || pag1.decoded.data[idx + 1] < 242 || pag1.decoded.data[idx + 2] < 242) {
          count++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (count >= 150) {
      const imgFooter = recortarImagemRgba(pag1.decoded, {
        x0: Math.max(0, minX - 20),
        y0: Math.max(yStartFooter, minY - 10),
        x1: Math.min(pag1.width, maxX + 20),
        y1: Math.min(pag1.height, maxY + 10)
      });
      const caminhoFooter = path.join(pastaSaidaAtivos, 'footer_logo.png');
      fs.writeFileSync(caminhoFooter, codificarPng(imgFooter));
      resultado.footerLogoPath = caminhoFooter;
    }
  }

  // 4. Extrai Assinatura Manuscrita isolada (com fundo transparente)
  const ultimaPagTexto = paginasTexto[paginasTexto.length - 1] || pag1;
  const numUltimaPagTexto = crmvBlock?.page || ultimaPagTexto.numeroPagina;
  const pagAssinatura = paginasRenderizadas.find(p => p.numeroPagina === numUltimaPagTexto) || ultimaPagTexto;

  // Tenta primeiro localizar o objeto de imagem da assinatura embutido na página de assinatura (sem smask separado)
  const candidatosSigEmb = listaMetaImgs.filter(im =>
    im.page === numUltimaPagTexto &&
    im.type === 'image' &&
    im.width >= 70 && im.width <= 700 &&
    im.height >= 25 && im.height <= 280 &&
    (im.width / Math.max(1, im.height)) >= 1.3
  );

  // Verifica se o candidato não possui uma máscara smask separada (quando há smask no PDF como no Word 2010, o recorte 300 DPI preserva melhor a composição)
  const temSmaskSeparada = listaMetaImgs.some(im => im.page === numUltimaPagTexto && im.type === 'smask');

  if (candidatosSigEmb.length === 1 && !temSmaskSeparada && arquivosEmb[candidatosSigEmb[0].num]) {
    const rawSigBuf = fs.readFileSync(arquivosEmb[candidatosSigEmb[0].num]);
    const sigDecoded = decodificarPng(rawSigBuf);
    const sigTransparente = recortarImagemRgba(sigDecoded, {
      x0: 0,
      y0: 0,
      x1: sigDecoded.width,
      y1: sigDecoded.height
    }, { removerFundoBranco: true, limiarBranco: 238 });

    const caminhoSig = path.join(pastaSaidaAtivos, 'signature.png');
    fs.writeFileSync(caminhoSig, codificarPng(sigTransparente));
    resultado.signaturePath = caminhoSig;
    resultado.signaturePositionOrder = 'image_above_text';
  } else if (crmvBlock) {
    // Recorta geometricamente em torno do bloco do CRMV (testando acima e abaixo para ver onde há traços de caneta/rubrica)
    const scaleX = pagAssinatura.width / (opcoes.pageWidthPt || 595.3);
    const scaleY = pagAssinatura.height / pageHeightPt;

    const xCenterPx = ((crmvBlock.xMin + crmvBlock.xMax) / 2) * scaleX;
    const halfW = Math.floor(pagAssinatura.width * 0.20);
    const x0 = Math.max(0, Math.floor(xCenterPx - halfW));
    const x1 = Math.min(pagAssinatura.width, Math.ceil(xCenterPx + halfW));

    const boxAcima = {
      x0,
      x1,
      y0: Math.max(0, Math.floor(Math.max(crmvBlock.minYAbovePt || 0, crmvBlock.yMin - 55) * scaleY)),
      y1: Math.max(10, Math.floor((crmvBlock.yMin - 3) * scaleY))
    };
    const boxAbaixo = {
      x0,
      x1,
      y0: Math.min(pagAssinatura.height - 20, Math.ceil((crmvBlock.yMax + 4) * scaleY)),
      y1: Math.min(pagAssinatura.height, Math.ceil((crmvBlock.yMax + 72) * scaleY))
    };

    const contarPixelsEscuros = (box) => {
      let c = 0;
      for (let y = box.y0; y < box.y1; y += 2) {
        for (let x = box.x0; x < box.x1; x += 2) {
          const idx = (y * pagAssinatura.width + x) * 4;
          const lum = (pagAssinatura.decoded.data[idx] + pagAssinatura.decoded.data[idx + 1] + pagAssinatura.decoded.data[idx + 2]) / 3;
          if (lum < 190) c++;
        }
      }
      return c;
    };

    const escurosAcima = contarPixelsEscuros(boxAcima);
    const escurosAbaixo = contarPixelsEscuros(boxAbaixo);

    const boxEscolhida = escurosAbaixo >= escurosAcima ? boxAbaixo : boxAcima;
    resultado.signaturePositionOrder = escurosAbaixo >= escurosAcima ? 'text_above_image' : 'image_above_text';

    if (Math.max(escurosAcima, escurosAbaixo) > 25) {
      const imgSig = recortarImagemRgba(pagAssinatura.decoded, boxEscolhida, {
        removerFundoBranco: true,
        limiarBranco: 238
      });
      const caminhoSig = path.join(pastaSaidaAtivos, 'signature.png');
      fs.writeFileSync(caminhoSig, codificarPng(imgSig));
      resultado.signaturePath = caminhoSig;
    }
  }

  return resultado;
}

module.exports = {
  decodificarPng,
  codificarPng,
  recortarImagemRgba,
  paginaEstaEmBrancoNoCorpo,
  paginaEhMosaicoUltrassom,
  detectarBordasTabelaPaciente,
  listarMetadadosImagensPdf,
  extrairObjetosImagemPdf,
  rasterizarPdfEmPngs,
  extrairAtivosVisuaisDasPaginas
};

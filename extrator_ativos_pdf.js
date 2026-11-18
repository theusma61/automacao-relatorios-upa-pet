/**
 * Extrator 100% Agnóstico de Ativos Gráficos de PDFs (300 DPI + pdfimages + Processamento PNG Nativo Node.js)
 * - Detecta automaticamente o tipo de composição do cabeçalho/papel timbrado:
 *   1. Papel Timbrado A4 de Página Inteira (`full_page_background`: cabeçalho + marca d'água + rodapé em imagem A4 única)
 *   2. Logo lateral ao lado dos dados do paciente (`inline_logo_beside_patient`: logo à esquerda ou direita na mesma faixa do cabeçalho)
 *   3. Faixa/Banner/Logo superior acima dos dados do paciente (`cropped_bands`: full-bleed ou centralizado/alinhado)
 *   4. Cabeçalho puramente tipográfico (`text_only`)
 * - Extrai logo recortada e aparada (trim) diretamente da renderização 300 DPI (lidando com coordenadas negativas,
 *   logos vetoriais, transparências/smask e margens brancas excessivas).
 * - Extrai assinatura manuscrita isolada (qualquer proporção, com fundo transparente) e detecta sua ordem (acima/abaixo do texto).
 * - Detecta geometricamente linhas divisórias horizontais (cabeçalho, título sublinhado, assinatura, rodapé) e bordas de tabela.
 * - Mede geometricamente a grade real de imagens de ultrassom (colunas, linhas, largura/altura dos cards, gaps e centralização da última foto).
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
  const limiarBranco = opcoes.limiarBranco || 242;

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
        if (media >= limiarBranco && Math.abs(r - g) < 12 && Math.abs(g - b) < 12) {
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

/**
 * Encontra o retângulo exato de conteúdo não-branco/não-transparente dentro de uma região da imagem.
 */
function encontrarLimitesConteudo(img, box = null, opcoes = {}) {
  const xStart = box ? Math.max(0, Math.floor(box.x0)) : 0;
  const yStart = box ? Math.max(0, Math.floor(box.y0)) : 0;
  const xEnd = box ? Math.min(img.width, Math.ceil(box.x1)) : img.width;
  const yEnd = box ? Math.min(img.height, Math.ceil(box.y1)) : img.height;
  const limiarBranco = opcoes.limiarBranco || 244;
  const passo = opcoes.passo || 1;

  let minX = xEnd;
  let minY = yEnd;
  let maxX = xStart - 1;
  let maxY = yStart - 1;
  let count = 0;

  for (let y = yStart; y < yEnd; y += passo) {
    for (let x = xStart; x < xEnd; x += passo) {
      const idx = (y * img.width + x) * 4;
      const a = img.data[idx + 3];
      if (a < 20) continue;
      const r = img.data[idx];
      const g = img.data[idx + 1];
      const b = img.data[idx + 2];
      if (r < limiarBranco || g < limiarBranco || b < limiarBranco) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count === 0 || maxX < minX || maxY < minY) {
    return { vazio: true, count: 0, x0: xStart, y0: yStart, x1: xStart, y1: yStart };
  }

  return { vazio: false, count, x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
}

/**
 * Apara bordas brancas/transparentes de uma imagem RGBA com padding opcional.
 */
function trimImagemRgba(img, opcoes = {}) {
  const padding = opcoes.padding !== undefined ? opcoes.padding : 4;
  const lim = encontrarLimitesConteudo(img, null, { limiarBranco: opcoes.limiarBranco || 244 });
  if (lim.vazio) {
    return { ...img, offsetX: 0, offsetY: 0, nonWhitePixels: 0 };
  }

  const box = {
    x0: Math.max(0, lim.x0 - padding),
    y0: Math.max(0, lim.y0 - padding),
    x1: Math.min(img.width, lim.x1 + padding),
    y1: Math.min(img.height, lim.y1 + padding)
  };
  const trimmed = recortarImagemRgba(img, box, {
    removerFundoBranco: Boolean(opcoes.removerFundoBranco),
    limiarBranco: opcoes.limiarBranco || 242
  });

  return {
    ...trimmed,
    offsetX: box.x0,
    offsetY: box.y0,
    nonWhitePixels: lim.count
  };
}

/**
 * Detecta se existe uma linha horizontal contínua (divisor, sublinhado, borda superior/inferior)
 * dentro de uma faixa vertical [yTopPt..yBotPt] e horizontal [xLeftPt..xRightPt].
 */
function detectarLinhaHorizontal(img, yTopPt, yBotPt, xLeftPt, xRightPt, pageWidthPt, pageHeightPt, opcoes = {}) {
  if (!img || !img.data) return false;
  const scaleX = img.width / pageWidthPt;
  const scaleY = img.height / pageHeightPt;

  const y0 = Math.max(0, Math.floor(yTopPt * scaleY));
  const y1 = Math.min(img.height - 1, Math.ceil(yBotPt * scaleY));
  const x0 = Math.max(0, Math.floor(xLeftPt * scaleX));
  const x1 = Math.min(img.width - 1, Math.ceil(xRightPt * scaleX));
  const span = Math.max(1, x1 - x0);
  const minCoverage = opcoes.minCoverage || 0.72;
  const limiarLum = opcoes.limiarLum || 230;

  if (y1 < y0 || span < 20) return false;

  for (let y = y0; y <= y1; y++) {
    let naoBrancos = 0;
    let total = 0;
    for (let x = x0; x <= x1; x += 2) {
      total++;
      const idx = (y * img.width + x) * 4;
      const lum = (img.data[idx] + img.data[idx + 1] + img.data[idx + 2]) / 3;
      if (lum < limiarLum) naoBrancos++;
    }
    if (total > 0 && (naoBrancos / total) >= minCoverage) {
      return true;
    }
  }
  return false;
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
    const yStart = Math.floor(img.height * (0.08 + faixa * 0.20));
    const yEnd = Math.floor(img.height * (0.28 + faixa * 0.20));
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

    if (total > 0 && (escuros / total) > 0.24) {
      return true;
    }
  }
  return false;
}

/**
 * Detecta se a região de dados do paciente na Página 1 possui bordas de tabela ("separado com traços").
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
 * Mede geometricamente os blocos retangulares escuros (imagens de ultrassom) em uma página de mosaico.
 * Retorna colunas, linhas, dimensões dos cards, espaçamentos e alinhamento da última imagem isolada.
 */
function detectarGradeImagensMosaico(imgMosaico, opcoes = {}) {
  if (!imgMosaico || !imgMosaico.data) return null;

  const pageWidthMm = opcoes.pageWidthMm || 210;
  const pageHeightMm = opcoes.pageHeightMm || 297;
  const headerCutoffRatio = opcoes.headerCutoffRatio !== undefined ? opcoes.headerCutoffRatio : 0.085;
  const footerCutoffRatio = opcoes.footerCutoffRatio !== undefined ? opcoes.footerCutoffRatio : 0.915;

  const yStart = Math.floor(imgMosaico.height * headerCutoffRatio);
  const yEnd = Math.floor(imgMosaico.height * footerCutoffRatio);
  const passoX = 4;
  const passoY = 3;

  // 1. Projeta densidade de pixels escuros por linha (Y) para detectar faixas horizontais de imagens
  const rowDarkFrac = new Float32Array(imgMosaico.height);
  for (let y = yStart; y < yEnd; y += passoY) {
    let escuros = 0;
    let total = 0;
    for (let x = 0; x < imgMosaico.width; x += passoX) {
      total++;
      const idx = (y * imgMosaico.width + x) * 4;
      const lum = (imgMosaico.data[idx] + imgMosaico.data[idx + 1] + imgMosaico.data[idx + 2]) / 3;
      if (lum < 90) escuros++;
    }
    const frac = total > 0 ? escuros / total : 0;
    for (let dy = 0; dy < passoY && (y + dy) < yEnd; dy++) {
      rowDarkFrac[y + dy] = frac;
    }
  }

  const rowBands = [];
  let inBand = false;
  let bandStart = 0;
  const minBandHeightPx = Math.floor(imgMosaico.height * 0.10); // >= ~30mm

  for (let y = yStart; y < yEnd; y++) {
    if (rowDarkFrac[y] >= 0.15) {
      if (!inBand) {
        inBand = true;
        bandStart = y;
      }
    } else if (inBand) {
      if ((y - bandStart) >= minBandHeightPx) {
        rowBands.push({ y0: bandStart, y1: y });
      }
      inBand = false;
    }
  }
  if (inBand && (yEnd - bandStart) >= minBandHeightPx) {
    rowBands.push({ y0: bandStart, y1: yEnd });
  }

  if (rowBands.length === 0) return null;

  // 2. Para cada faixa horizontal, projeta densidade por coluna (X) para detectar os cards
  const boxes = [];
  const minCardWidthPx = Math.floor(imgMosaico.width * 0.18); // >= ~38mm

  for (const rb of rowBands) {
    const colDarkFrac = new Float32Array(imgMosaico.width);
    for (let x = 0; x < imgMosaico.width; x += passoX) {
      let escuros = 0;
      let total = 0;
      for (let y = rb.y0; y < rb.y1; y += passoY) {
        total++;
        const idx = (y * imgMosaico.width + x) * 4;
        const lum = (imgMosaico.data[idx] + imgMosaico.data[idx + 1] + imgMosaico.data[idx + 2]) / 3;
        if (lum < 95) escuros++;
      }
      const frac = total > 0 ? escuros / total : 0;
      for (let dx = 0; dx < passoX && (x + dx) < imgMosaico.width; dx++) {
        colDarkFrac[x + dx] = frac;
      }
    }

    let inCol = false;
    let colStart = 0;
    const rowCols = [];
    for (let x = 0; x < imgMosaico.width; x++) {
      if (colDarkFrac[x] >= 0.35) {
        if (!inCol) {
          inCol = true;
          colStart = x;
        }
      } else if (inCol) {
        if ((x - colStart) >= minCardWidthPx) {
          rowCols.push({ x0: colStart, x1: x });
        }
        inCol = false;
      }
    }
    if (inCol && (imgMosaico.width - colStart) >= minCardWidthPx) {
      rowCols.push({ x0: colStart, x1: imgMosaico.width });
    }

    for (const cb of rowCols) {
      boxes.push({
        x0Mm: (cb.x0 / imgMosaico.width) * pageWidthMm,
        x1Mm: (cb.x1 / imgMosaico.width) * pageWidthMm,
        y0Mm: (rb.y0 / imgMosaico.height) * pageHeightMm,
        y1Mm: (rb.y1 / imgMosaico.height) * pageHeightMm,
        widthMm: ((cb.x1 - cb.x0) / imgMosaico.width) * pageWidthMm,
        heightMm: ((rb.y1 - rb.y0) / imgMosaico.height) * pageHeightMm,
        rowIdx: rowBands.indexOf(rb)
      });
    }
  }

  if (boxes.length === 0) return null;

  const pxToMmX = pageWidthMm / imgMosaico.width;
  const pxToMmY = pageHeightMm / imgMosaico.height;

  // Quantidade de colunas na primeira linha completa
  const colsPorLinha = rowBands.map((_, ri) => boxes.filter(b => b.rowIdx === ri));
  const maxCols = Math.max(...colsPorLinha.map(c => c.length));

  const widths = boxes.map(b => b.widthMm).sort((a, b) => a - b);
  const heights = boxes.map(b => b.heightMm).sort((a, b) => a - b);
  const medianW = widths[Math.floor(widths.length / 2)];
  const medianH = heights[Math.floor(heights.length / 2)];

  const colGaps = [];
  for (const rowBoxes of colsPorLinha) {
    if (rowBoxes.length >= 2) {
      rowBoxes.sort((a, b) => a.x0Mm - b.x0Mm);
      for (let i = 1; i < rowBoxes.length; i++) {
        colGaps.push(Math.max(0, rowBoxes[i].x0Mm - rowBoxes[i - 1].x1Mm));
      }
    }
  }

  const rowGaps = [];
  for (let i = 1; i < rowBands.length; i++) {
    rowGaps.push(Math.max(0, (rowBands[i].y0 - rowBands[i - 1].y1) * pxToMmY));
  }

  const leftEdgeMm = Math.min(...boxes.map(b => b.x0Mm));
  const rightEdgeMm = pageWidthMm - Math.max(...boxes.map(b => b.x1Mm));
  const topEdgeMm = Math.min(...boxes.map(b => b.y0Mm));

  const colGapMm = colGaps.length > 0 ? colGaps[Math.floor(colGaps.length / 2)] : 8;
  const rowGapMm = rowGaps.length > 0 ? rowGaps[Math.floor(rowGaps.length / 2)] : 4;

  // Verifica se há uma única foto centralizada na página (útil para última página de mosaico)
  const unicaFotoCentralizada = boxes.length === 1 &&
    Math.abs(((boxes[0].x0Mm + boxes[0].x1Mm) / 2) - (pageWidthMm / 2)) <= 12;

  return {
    boxesCount: boxes.length,
    columns: Math.max(1, Math.min(3, maxCols)),
    rowsPerPage: rowBands.length,
    cardWidthMm: Number(medianW.toFixed(1)),
    cardHeightMm: Number(medianH.toFixed(1)),
    colGapMm: Number(colGapMm.toFixed(1)),
    rowGapMm: Number(rowGapMm.toFixed(1)),
    pagePaddingTopMm: Number(topEdgeMm.toFixed(1)),
    pagePaddingLeftMm: Number(Math.max(4, leftEdgeMm).toFixed(1)),
    pagePaddingRightMm: Number(Math.max(4, rightEdgeMm).toFixed(1)),
    unicaFotoCentralizada
  };
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
          objectId: parseInt(parts[10], 10)
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
 * Pipeline 100% Agnóstico de Extração de Ativos:
 * 1. Identifica objectIds recorrentes em múltiplas páginas (logos/timbrados) para separá-los de fotos de ultrassom e assinatura.
 * 2. Verifica se o PDF possui Papel Timbrado A4 de página inteira (`page_background.png`).
 * 3. Caso contrário, verifica se há logo posicionada LADO A LADO com os dados do paciente (`header_logo.png`, à esquerda ou direita),
 *    ou um banner/logo ACIMA do primeiro texto (`header_banner.png`).
 * 4. Extrai mini-logo de rodapé apenas se houver conteúdo gráfico abaixo da última linha de texto do rodapé.
 * 5. Extrai a assinatura manuscrita isolada (`signature.png`) com fundo transparente (qualquer proporção) e mede sua altura real.
 * 6. Mede geometricamente a grade real das fotos de ultrassom nas páginas de mosaico.
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
  const pageWidthPt = opcoes.pageWidthPt || 595.32;
  const pageHeightPt = opcoes.pageHeightPt || 841.92;
  const patientHeaderBoxPt = opcoes.patientHeaderBoxPt || null; // { xMin, xMax, yMin, yMax }
  const footerTextYMaxPt = opcoes.footerTextYMaxPt || null;
  const crmvBlock = opcoes.crmvBlock || null; // { page, yMin, yMax, xMin, xMax, minYAbovePt }

  const scaleX = pag1.width / pageWidthPt;
  const scaleY = pag1.height / pageHeightPt;
  const pxToMmX = 210 / pag1.width;
  const pxToMmY = 297 / pag1.height;

  const resultado = {
    stationeryMode: 'cropped_bands', // 'full_page_background' | 'inline_logo_header' | 'cropped_bands' | 'text_only'
    pageBackgroundPath: null,
    headerBannerPath: null,
    headerBannerHeightMm: null,
    headerLogoPath: null,
    headerLogoBoxMm: null, // { side: 'left'|'right', xMm, yMm, widthMm, heightMm }
    signaturePath: null,
    signatureImageHeightMm: null,
    footerLogoPath: null,
    headerEhFullBleed: false,
    signaturePositionOrder: 'image_above_text',
    paginasTextoQtd: paginasTexto.length,
    fotosPorPaginaDetectadas: 8,
    mosaicGridMetrics: null
  };

  let listaMetaImgs = [];
  let arquivosEmb = [];
  if (caminhoPdf && fs.existsSync(caminhoPdf)) {
    listaMetaImgs = listarMetadadosImagensPdf(caminhoPdf);
    arquivosEmb = extrairObjetosImagemPdf(caminhoPdf, pastaTemp);
  }

  // Identifica objectIds que se repetem em >= 2 páginas (logos/timbrados recorrentes)
  const pagesByObjectId = new Map();
  for (const im of listaMetaImgs) {
    if (im.type !== 'image' || !im.objectId) continue;
    if (!pagesByObjectId.has(im.objectId)) pagesByObjectId.set(im.objectId, new Set());
    pagesByObjectId.get(im.objectId).add(im.page);
  }
  const repeatingObjectIds = new Set();
  for (const [objId, pSet] of pagesByObjectId.entries()) {
    if (pSet.size >= 2) repeatingObjectIds.add(objId);
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

  // 2. Caso não seja papel timbrado A4, detecta se há LOGO LADO A LADO com o cabeçalho do paciente
  //    ou BANNER/LOGO ACIMA do primeiro texto.
  if (resultado.stationeryMode !== 'full_page_background') {
    let logoInlineExtraida = false;

    if (patientHeaderBoxPt && patientHeaderBoxPt.yMin < 115) {
      const bandTopPx = Math.max(0, Math.floor((patientHeaderBoxPt.yMin - 22) * scaleY));
      const bandBotPx = Math.min(
        Math.floor(pag1.height * 0.24),
        Math.ceil(Math.max(patientHeaderBoxPt.yMax + 14, 72) * scaleY)
      );

      // Candidato à ESQUERDA dos dados do paciente (ex: logo à esquerda, metadados ao centro/direita)
      const leftMarginSpacePt = patientHeaderBoxPt.xMin;
      const rightMarginSpacePt = pageWidthPt - patientHeaderBoxPt.xMax;

      const candidatosLaterais = [];
      if (leftMarginSpacePt >= 75) {
        const boxEsq = {
          x0: 0,
          y0: bandTopPx,
          x1: Math.max(10, Math.floor((patientHeaderBoxPt.xMin - 4) * scaleX)),
          y1: bandBotPx
        };
        const limEsq = encontrarLimitesConteudo(pag1.decoded, boxEsq, { limiarBranco: 242, passo: 2 });
        if (!limEsq.vazio && limEsq.count >= 150) {
          candidatosLaterais.push({ side: 'left', box: boxEsq, lim: limEsq });
        }
      }
      if (rightMarginSpacePt >= 75) {
        const boxDir = {
          x0: Math.min(pag1.width - 10, Math.ceil((patientHeaderBoxPt.xMax + 4) * scaleX)),
          y0: bandTopPx,
          x1: pag1.width,
          y1: bandBotPx
        };
        const limDir = encontrarLimitesConteudo(pag1.decoded, boxDir, { limiarBranco: 242, passo: 2 });
        if (!limDir.vazio && limDir.count >= 150) {
          candidatosLaterais.push({ side: 'right', box: boxDir, lim: limDir });
        }
      }

      if (candidatosLaterais.length > 0) {
        // Escolhe o lado com maior densidade gráfica (a logo principal)
        candidatosLaterais.sort((a, b) => b.lim.count - a.lim.count);
        const escolhido = candidatosLaterais[0];
        const rawLogo = recortarImagemRgba(pag1.decoded, escolhido.box);
        const trimmedLogo = trimImagemRgba(rawLogo, {
          padding: 4,
          removerFundoBranco: true,
          limiarBranco: 244
        });

        if (trimmedLogo.width >= 20 && trimmedLogo.height >= 20) {
          const caminhoLogo = path.join(pastaSaidaAtivos, 'header_logo.png');
          fs.writeFileSync(caminhoLogo, codificarPng(trimmedLogo));
          resultado.stationeryMode = 'inline_logo_header';
          resultado.headerLogoPath = caminhoLogo;
          resultado.headerLogoBoxMm = {
            side: escolhido.side,
            xMm: Number(((escolhido.box.x0 + trimmedLogo.offsetX) * pxToMmX).toFixed(1)),
            yMm: Number(((escolhido.box.y0 + trimmedLogo.offsetY) * pxToMmY).toFixed(1)),
            widthMm: Number((trimmedLogo.width * pxToMmX).toFixed(1)),
            heightMm: Number((trimmedLogo.height * pxToMmY).toFixed(1))
          };
          logoInlineExtraida = true;
        }
      }
    }

    // Se não há logo inline ao lado dos dados do paciente, verifica banner/logo ACIMA do primeiro texto
    if (!logoInlineExtraida) {
      const yMaxHeaderPx = Math.floor(((firstTextYMinPt - 4) / pageHeightPt) * pag1.height);
      if (yMaxHeaderPx >= 50) {
        const limBanner = encontrarLimitesConteudo(pag1.decoded, {
          x0: 0,
          y0: 0,
          x1: pag1.width,
          y1: yMaxHeaderPx
        }, { limiarBranco: 244, passo: 2 });

        if (!limBanner.vazio && limBanner.count >= 150) {
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
          resultado.headerBannerHeightMm = Number((yMaxHeaderPx * pxToMmY).toFixed(1));
          resultado.stationeryMode = 'cropped_bands';
        } else {
          resultado.stationeryMode = 'text_only';
        }
      } else {
        resultado.stationeryMode = 'text_only';
      }
    }
  }

  // 3. Mini-logo de rodapé: somente se houver conteúdo gráfico ABAIXO do texto de rodapé (evita recortar texto!)
  if (resultado.stationeryMode !== 'full_page_background') {
    const yStartMinPx = Math.floor(pag1.height * 0.955);
    const yStartFooter = footerTextYMaxPt
      ? Math.max(yStartMinPx, Math.ceil((footerTextYMaxPt + 6) * scaleY))
      : yStartMinPx;

    if (yStartFooter < pag1.height - 15) {
      const limFooter = encontrarLimitesConteudo(pag1.decoded, {
        x0: 0,
        y0: yStartFooter,
        x1: pag1.width,
        y1: pag1.height
      }, { limiarBranco: 242, passo: 1 });

      if (!limFooter.vazio && limFooter.count >= 150) {
        const imgFooter = recortarImagemRgba(pag1.decoded, {
          x0: Math.max(0, limFooter.x0 - 16),
          y0: Math.max(yStartFooter, limFooter.y0 - 8),
          x1: Math.min(pag1.width, limFooter.x1 + 16),
          y1: Math.min(pag1.height, limFooter.y1 + 8)
        });
        const caminhoFooter = path.join(pastaSaidaAtivos, 'footer_logo.png');
        fs.writeFileSync(caminhoFooter, codificarPng(imgFooter));
        resultado.footerLogoPath = caminhoFooter;
      }
    }
  }

  // 4. Extrai Assinatura Manuscrita isolada (com fundo transparente, aceitando qualquer proporção)
  const ultimaPagTexto = paginasTexto[paginasTexto.length - 1] || pag1;
  const numUltimaPagTexto = crmvBlock?.page || ultimaPagTexto.numeroPagina;
  const pagAssinatura = paginasRenderizadas.find(p => p.numeroPagina === numUltimaPagTexto) || ultimaPagTexto;

  const candidatosSigEmb = listaMetaImgs.filter(im => {
    const ratio = im.width / Math.max(1, im.height);
    return im.page === numUltimaPagTexto &&
      im.type === 'image' &&
      !repeatingObjectIds.has(im.objectId) &&
      im.width >= 50 && im.width <= 1200 &&
      im.height >= 25 && im.height <= 500 &&
      ratio >= 0.35 && ratio <= 8.0;
  });

  const temSmaskSeparada = listaMetaImgs.some(im => im.page === numUltimaPagTexto && im.type === 'smask');

  // Sempre tenta determinar a posição relativa (acima vs abaixo do CRMV) na página rasterizada
  let ordemAssinaturaDetectada = 'image_above_text';
  let alturaAssinaturaMedidaMm = null;

  if (crmvBlock && pagAssinatura?.decoded) {
    const sigScaleX = pagAssinatura.width / pageWidthPt;
    const sigScaleY = pagAssinatura.height / pageHeightPt;
    const xCenterPx = ((crmvBlock.xMin + crmvBlock.xMax) / 2) * sigScaleX;
    const halfW = Math.floor(pagAssinatura.width * 0.22);
    const x0 = Math.max(0, Math.floor(xCenterPx - halfW));
    const x1 = Math.min(pagAssinatura.width, Math.ceil(xCenterPx + halfW));

    const boxAcima = {
      x0,
      x1,
      y0: Math.max(0, Math.floor(Math.max(crmvBlock.minYAbovePt || 0, crmvBlock.yMin - 70) * sigScaleY)),
      y1: Math.max(10, Math.floor((crmvBlock.yMin - 2) * sigScaleY))
    };
    const boxAbaixo = {
      x0,
      x1,
      y0: Math.min(pagAssinatura.height - 20, Math.ceil((crmvBlock.yMax + 4) * sigScaleY)),
      y1: Math.min(pagAssinatura.height, Math.ceil((crmvBlock.yMax + 72) * sigScaleY))
    };

    const limAcima = encontrarLimitesConteudo(pagAssinatura.decoded, boxAcima, { limiarBranco: 215, passo: 2 });
    const limAbaixo = encontrarLimitesConteudo(pagAssinatura.decoded, boxAbaixo, { limiarBranco: 215, passo: 2 });

    ordemAssinaturaDetectada = limAbaixo.count > limAcima.count ? 'text_above_image' : 'image_above_text';
    const limEscolhida = limAbaixo.count > limAcima.count ? limAbaixo : limAcima;

    if (!limEscolhida.vazio && limEscolhida.count > 20) {
      alturaAssinaturaMedidaMm = Math.max(14, Math.min(26, Number((((limEscolhida.y1 - limEscolhida.y0) / pagAssinatura.height) * 297).toFixed(1))));
    }

    // Se há exatamente 1 imagem embutida não-recorrente (sem smask), usa ela diretamente (com trim + fundo transparente)
    if (candidatosSigEmb.length === 1 && !temSmaskSeparada && arquivosEmb[candidatosSigEmb[0].num] && fs.existsSync(arquivosEmb[candidatosSigEmb[0].num])) {
      const rawSigBuf = fs.readFileSync(arquivosEmb[candidatosSigEmb[0].num]);
      const sigDecoded = decodificarPng(rawSigBuf);
      const sigTransparente = trimImagemRgba(sigDecoded, {
        padding: 4,
        removerFundoBranco: true,
        limiarBranco: 238
      });
      const caminhoSig = path.join(pastaSaidaAtivos, 'signature.png');
      fs.writeFileSync(caminhoSig, codificarPng(sigTransparente));
      resultado.signaturePath = caminhoSig;
      resultado.signaturePositionOrder = ordemAssinaturaDetectada;
      resultado.signatureImageHeightMm = alturaAssinaturaMedidaMm || 16;
    } else if (!limEscolhida.vazio && limEscolhida.count > 20) {
      const boxCrop = limAbaixo.count > limAcima.count ? boxAbaixo : boxAcima;
      const rawSig = recortarImagemRgba(pagAssinatura.decoded, boxCrop);
      const imgSig = trimImagemRgba(rawSig, {
        padding: 4,
        removerFundoBranco: true,
        limiarBranco: 238
      });
      const caminhoSig = path.join(pastaSaidaAtivos, 'signature.png');
      fs.writeFileSync(caminhoSig, codificarPng(imgSig));
      resultado.signaturePath = caminhoSig;
      resultado.signaturePositionOrder = ordemAssinaturaDetectada;
      resultado.signatureImageHeightMm = alturaAssinaturaMedidaMm || 15;
    }
  } else if (candidatosSigEmb.length === 1 && !temSmaskSeparada && arquivosEmb[candidatosSigEmb[0].num] && fs.existsSync(arquivosEmb[candidatosSigEmb[0].num])) {
    const rawSigBuf = fs.readFileSync(arquivosEmb[candidatosSigEmb[0].num]);
    const sigDecoded = decodificarPng(rawSigBuf);
    const sigTransparente = trimImagemRgba(sigDecoded, {
      padding: 4,
      removerFundoBranco: true,
      limiarBranco: 238
    });
    const caminhoSig = path.join(pastaSaidaAtivos, 'signature.png');
    fs.writeFileSync(caminhoSig, codificarPng(sigTransparente));
    resultado.signaturePath = caminhoSig;
    resultado.signaturePositionOrder = 'image_above_text';
    resultado.signatureImageHeightMm = 16;
  }

  // 5. Mede a grade real de fotos de ultrassom na primeira página de mosaico (excluindo logos recorrentes!)
  const paginasMosaico = paginasRenderizadas.filter(p => p.ehMosaico);
  const primeiraPagMosaico = paginasMosaico[0];
  if (primeiraPagMosaico) {
    if (listaMetaImgs.length > 0) {
      const imgsPagMosaico = listaMetaImgs.filter(
        im => im.page === primeiraPagMosaico.numeroPagina &&
              im.type === 'image' &&
              !repeatingObjectIds.has(im.objectId) &&
              im.height < 1100 &&
              im.width > 180
      );
      if (imgsPagMosaico.length >= 2 && imgsPagMosaico.length <= 12) {
        resultado.fotosPorPaginaDetectadas = imgsPagMosaico.length;
      }
    }

    const headerCutoff = (opcoes.repeatPatientHeaderOnImagePages && patientHeaderBoxPt)
      ? Math.min(0.22, Math.max(0.08, (patientHeaderBoxPt.yMax + 10) / pageHeightPt))
      : 0.02;
    const metrics = detectarGradeImagensMosaico(primeiraPagMosaico.decoded, {
      headerCutoffRatio: headerCutoff,
      footerCutoffRatio: 0.915
    });

    if (metrics) {
      // Se as fotos estiverem coladas sem espaço branco (ex: mosaico 2x4 sem borda),
      // o scanner de pixels enxerga um único bloco escuro. Usa a contagem real de pdfimages + bbox externo!
      let metricsAjustadas = { ...metrics };
      if (metrics.boxesCount < resultado.fotosPorPaginaDetectadas && resultado.fotosPorPaginaDetectadas >= 2) {
        const cols = 2;
        const rows = Math.max(1, Math.ceil(resultado.fotosPorPaginaDetectadas / cols));
        const totalH = metrics.cardHeightMm * Math.max(1, metrics.rowsPerPage);
        metricsAjustadas = {
          ...metrics,
          boxesCount: resultado.fotosPorPaginaDetectadas,
          columns: cols,
          rowsPerPage: rows,
          colGapMm: 0.5,
          rowGapMm: 0.5,
          cardWidthMm: Number(((metrics.cardWidthMm * Math.max(1, metrics.columns)) / cols).toFixed(1)),
          cardHeightMm: Number(Math.max(42, Math.min(72, totalH / rows)).toFixed(1))
        };
      }

      // Verifica também a última página de mosaico para saber se uma foto isolada é centralizada
      const ultimaPagMosaico = paginasMosaico[paginasMosaico.length - 1];
      let centerLastOddImage = false;
      if (ultimaPagMosaico && ultimaPagMosaico !== primeiraPagMosaico) {
        const lastMetrics = detectarGradeImagensMosaico(ultimaPagMosaico.decoded, {
          headerCutoffRatio: headerCutoff,
          footerCutoffRatio: 0.915
        });
        if (lastMetrics && lastMetrics.unicaFotoCentralizada) {
          centerLastOddImage = true;
        }
      }
      resultado.mosaicGridMetrics = {
        ...metricsAjustadas,
        centerLastOddImage
      };
      if (metricsAjustadas.boxesCount >= 2 && metricsAjustadas.boxesCount <= 12) {
        resultado.fotosPorPaginaDetectadas = metricsAjustadas.boxesCount;
      }
    }
  }

  return resultado;
}

module.exports = {
  decodificarPng,
  codificarPng,
  recortarImagemRgba,
  encontrarLimitesConteudo,
  trimImagemRgba,
  detectarLinhaHorizontal,
  paginaEstaEmBrancoNoCorpo,
  paginaEhMosaicoUltrassom,
  detectarBordasTabelaPaciente,
  detectarGradeImagensMosaico,
  listarMetadadosImagensPdf,
  extrairObjetosImagemPdf,
  rasterizarPdfEmPngs,
  extrairAtivosVisuaisDasPaginas
};

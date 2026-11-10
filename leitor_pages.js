const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

/**
 * Extrai o conteúdo legível de um arquivo Apple .pages (PDF embutido, imagens de preview ou texto)
 * @param {string} caminhoPages - Caminho para o arquivo .pages ou diretório bundle
 * @returns {Promise<{ tipo: 'pdf'|'imagem'|'texto', buffer?: Buffer, texto?: string }>}
 */
async function extrairConteudoPages(caminhoPages) {
  // 1. Caso o .pages seja um diretório (bundle do macOS no Windows)
  const stat = fs.statSync(caminhoPages);
  if (stat.isDirectory()) {
    const previewPdf = path.join(caminhoPages, 'QuickLook', 'Preview.pdf');
    if (fs.existsSync(previewPdf)) {
      return { tipo: 'pdf', buffer: fs.readFileSync(previewPdf) };
    }
    const previewPdfAlt = path.join(caminhoPages, 'preview.pdf');
    if (fs.existsSync(previewPdfAlt)) {
      return { tipo: 'pdf', buffer: fs.readFileSync(previewPdfAlt) };
    }
    const previewImg = path.join(caminhoPages, 'QuickLook', 'Thumbnail.jpg');
    if (fs.existsSync(previewImg)) {
      return { tipo: 'imagem', buffer: fs.readFileSync(previewImg) };
    }
  }

  // 2. Caso seja um arquivo compactado ZIP (formato padrão do Pages moderno)
  const fileBuffer = fs.readFileSync(caminhoPages);
  const zip = await JSZip.loadAsync(fileBuffer);

  // Busca se há Preview.pdf embutido pelo Pages (QuickLook)
  const arquivosZip = Object.keys(zip.files);
  
  const arquivoPreviewPdf = arquivosZip.find(f => /quicklook\/preview\.pdf$/i.test(f) || /^preview\.pdf$/i.test(f));
  if (arquivoPreviewPdf) {
    const pdfBuffer = await zip.file(arquivoPreviewPdf).async('nodebuffer');
    return { tipo: 'pdf', buffer: pdfBuffer };
  }

  // Busca se há imagem de preview em alta resolução
  const arquivoPreviewImg = arquivosZip.find(f => /quicklook\/thumbnail\.jpg$/i.test(f) || /^preview\.jpg$/i.test(f) || /preview-web\.jpg$/i.test(f));
  if (arquivoPreviewImg) {
    const imgBuffer = await zip.file(arquivoPreviewImg).async('nodebuffer');
    return { tipo: 'imagem', buffer: imgBuffer };
  }

  // Busca se há index.xml (Pages '09 legado)
  if (zip.file('index.xml')) {
    const xmlTexto = await zip.file('index.xml').async('text');
    // Limpa tags XML simples
    const textoLimpo = xmlTexto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { tipo: 'texto', texto: textoLimpo };
  }

  // Busca em arquivos Index/*.iwa para extrair strings UTF-8 gravadas pelo Pages
  const arquivosIwa = arquivosZip.filter(f => /^index\/.*\.iwa$/i.test(f));
  if (arquivosIwa.length > 0) {
    let textosExtraidos = [];
    for (const arqIwa of arquivosIwa) {
      const iwaBuffer = await zip.file(arqIwa).async('nodebuffer');
      // Extrai sequências de caracteres imprimíveis em UTF-8
      const str = iwaBuffer.toString('latin1');
      // Procura palavras com mais de 3 caracteres alfanuméricos legíveis
      const palavras = str.match(/[\x20-\x7E\u00C0-\u00FF]{3,}/g) || [];
      const textoFiltrado = palavras.filter(p => !p.includes('__') && !p.startsWith('TSD') && !p.startsWith('TSWP')).join(' ');
      if (textoFiltrado.length > 30) {
        textosExtraidos.push(textoFiltrado);
      }
    }
    if (textosExtraidos.length > 0) {
      return { tipo: 'texto', texto: textosExtraidos.join('\n') };
    }
  }

  throw new Error("Não foi possível extrair o conteúdo legível do documento .pages.");
}

module.exports = {
  extrairConteudoPages
};

const fs = require('fs');
const JSZip = require('jszip');

/**
 * Extrai todo o conteúdo de texto de um arquivo Microsoft Word (.docx)
 * @param {string} caminhoDocx - Caminho absoluto para o arquivo .docx
 * @returns {Promise<string>} Texto extraído preservando parágrafos
 */
async function extrairTextoDocx(caminhoDocx) {
  const fileBuffer = fs.readFileSync(caminhoDocx);
  const zip = await JSZip.loadAsync(fileBuffer);

  const linhas = [];

  // 1. Extrai texto dos cabeçalhos (caso a ficha use cabeçalho para dados do paciente)
  const headerFiles = Object.keys(zip.files).filter(f => /^word\/header\d+\.xml$/i.test(f));
  for (const hFile of headerFiles) {
    const hXml = await zip.file(hFile).async('text');
    const hParagrafos = hXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
    for (const p of hParagrafos) {
      const texts = (p.match(/<w:t[\s\S]*?>([\s\S]*?)<\/w:t>/g) || [])
        .map(t => t.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      if (texts.length > 0) {
        linhas.push(texts.join(' '));
      }
    }
  }

  // 2. Extrai texto do corpo principal (document.xml)
  if (!zip.file('word/document.xml')) {
    throw new Error("Arquivo .docx inválido ou corrompido (document.xml não encontrado).");
  }

  const docXml = await zip.file('word/document.xml').async('text');
  const paragrafos = docXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];

  for (const p of paragrafos) {
    const texts = (p.match(/<w:t[\s\S]*?>([\s\S]*?)<\/w:t>/g) || [])
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join('');
    
    if (texts.trim().length > 0) {
      linhas.push(texts.trim());
    }
  }

  return linhas.join('\n');
}

module.exports = {
  extrairTextoDocx
};

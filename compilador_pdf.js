/**
 * Compilador Universal de PDF (Windows, Linux, Mac, Render, Docker)
 * Suporta Microsoft Edge (Windows), Puppeteer (Nuvem/Render) e Chromium/Chrome do sistema.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function compilarPDF(caminhoHtml, caminhoPdf) {
  // 1. Tenta Microsoft Edge (Padrão no Windows)
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const msedge = edgePaths.find(p => p && fs.existsSync(p));
  if (msedge) {
    const fileUrl = 'file:///' + path.resolve(caminhoHtml).replace(/\\/g, '/');
    const cmd = `"${msedge}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${caminhoPdf}" "${fileUrl}"`;
    execSync(cmd, { stdio: 'pipe' });
    return caminhoPdf;
  }

  // 2. Tenta Puppeteer (Nuvem / Linux / Render / Docker)
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });
    const page = await browser.newPage();
    const fileUrl = 'file:///' + path.resolve(caminhoHtml).replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: caminhoPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    await browser.close();
    return caminhoPdf;
  } catch (errPup) {
    // 3. Fallback: Tenta executável do Chromium ou Google Chrome no Linux
    const linuxBinaries = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', process.env.CHROME_BIN];
    const linuxBin = linuxBinaries.find(b => b && fs.existsSync(b));
    if (linuxBin) {
      const fileUrl = 'file:///' + path.resolve(caminhoHtml).replace(/\\/g, '/');
      const cmd = `"${linuxBin}" --headless --no-sandbox --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${caminhoPdf}" "${fileUrl}"`;
      execSync(cmd, { stdio: 'pipe' });
      return caminhoPdf;
    }
    throw new Error(`Falha na compilação do PDF: Nenhum motor compatível encontrado. Detalhe: ${errPup.message}`);
  }
}

module.exports = { compilarPDF };

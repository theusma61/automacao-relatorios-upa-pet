/**
 * Compilador Universal de PDF com Fila de Concorrência para VPS (2 vCPUs / 4 GB RAM)
 * Mantém concorrência = 1 por padrão no Chromium headless para evitar picos de RAM/OOM
 * e garante fechamento obrigatório do processo browser em bloco finally.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function criarFilaConcorrenciaUnica() {
  const concurrency = Math.max(1, parseInt(process.env.PDF_CONCURRENCY || '1', 10) || 1);
  try {
    const PQueue = require('p-queue').default || require('p-queue');
    return new PQueue({ concurrency });
  } catch (_) {
    let cadeia = Promise.resolve();
    return {
      add(fn) {
        const execucao = cadeia.then(() => fn());
        cadeia = execucao.catch(() => {});
        return execucao;
      }
    };
  }
}

const filaPdf = criarFilaConcorrenciaUnica();

async function compilarComPuppeteer(puppeteer, fileUrl, caminhoPdf, argsLaunch, executablePath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: argsLaunch,
    executablePath
  });
  try {
    const page = await browser.newPage();
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.pdf({
      path: caminhoPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    return caminhoPdf;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function compilarPDFInterno(caminhoHtml, caminhoPdf) {
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

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (_) {}

  if (puppeteer) {
    const fileUrl = 'file:///' + path.resolve(caminhoHtml).replace(/\\/g, '/');
    const argsLaunch = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions'
    ];

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined));

    try {
      return await compilarComPuppeteer(puppeteer, fileUrl, caminhoPdf, argsLaunch, executablePath);
    } catch (errPup) {
      console.warn('Aviso Puppeteer:', errPup.message);
      if (errPup.message.includes('Could not find Chrome') || errPup.message.includes('not find Chrome')) {
        console.log('⚡ Auto-recuperação: Instalando Chrome headless no servidor...');
        try {
          execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
          return await compilarComPuppeteer(puppeteer, fileUrl, caminhoPdf, argsLaunch, executablePath);
        } catch (errRetry) {
          console.error('Erro na auto-instalação do Chrome:', errRetry.message);
        }
      }
    }
  }

  const linuxBinaries = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', process.env.CHROME_BIN];
  const linuxBin = linuxBinaries.find(b => b && fs.existsSync(b));
  if (linuxBin) {
    const fileUrl = 'file:///' + path.resolve(caminhoHtml).replace(/\\/g, '/');
    const cmd = `"${linuxBin}" --headless --no-sandbox --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${caminhoPdf}" "${fileUrl}"`;
    execSync(cmd, { stdio: 'pipe' });
    return caminhoPdf;
  }

  throw new Error('Falha na compilação do PDF: Nenhum motor compatível encontrado (Edge, Puppeteer ou Chromium).');
}

async function compilarPDF(caminhoHtml, caminhoPdf) {
  return await filaPdf.add(() => compilarPDFInterno(caminhoHtml, caminhoPdf));
}

module.exports = { compilarPDF, filaPdf };

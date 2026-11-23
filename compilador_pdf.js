/**
 * Compilador Universal de PDF com Fila de Concorrência para VPS (2 vCPUs / 4 GB RAM)
 * Mantém concorrência = 1 por padrão no Chromium headless para evitar picos de RAM/OOM,
 * bloqueia requisições de rede externas no Puppeteer (anti-SSRF) e evita processos órfãos.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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

let browserCompartilhado = null;
let browserLaunchPromise = null;
let timerFecharBrowser = null;
const IDLE_CLOSE_MS = parseInt(process.env.PDF_BROWSER_IDLE_MS || '60000', 10) || 60000;

function agendarFechamentoOcioso() {
  if (timerFecharBrowser) clearTimeout(timerFecharBrowser);
  timerFecharBrowser = setTimeout(async () => {
    const b = browserCompartilhado;
    browserCompartilhado = null;
    timerFecharBrowser = null;
    if (b) {
      await b.close().catch(() => {});
    }
  }, IDLE_CLOSE_MS);
  if (typeof timerFecharBrowser.unref === 'function') {
    timerFecharBrowser.unref();
  }
}

async function obterBrowserPuppeteer(puppeteer, argsLaunch, executablePath) {
  if (browserCompartilhado && browserCompartilhado.isConnected()) {
    if (timerFecharBrowser) clearTimeout(timerFecharBrowser);
    return browserCompartilhado;
  }
  if (browserLaunchPromise) {
    return await browserLaunchPromise;
  }
  browserLaunchPromise = puppeteer.launch({
    headless: true,
    args: argsLaunch,
    executablePath
  }).then((browser) => {
    browserCompartilhado = browser;
    browser.on('disconnected', () => {
      if (browserCompartilhado === browser) {
        browserCompartilhado = null;
      }
      if (timerFecharBrowser) {
        clearTimeout(timerFecharBrowser);
        timerFecharBrowser = null;
      }
    });
    return browser;
  }).finally(() => {
    browserLaunchPromise = null;
  });

  return await browserLaunchPromise;
}

async function compilarComPuppeteer(puppeteer, fileUrl, caminhoPdf, argsLaunch, executablePath) {
  const browser = await obterBrowserPuppeteer(puppeteer, argsLaunch, executablePath);
  const page = await browser.newPage();
  try {
    // Bloqueia qualquer requisição externa/rede (anti-SSRF e anti-travamento por CDN/fontes externas)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url() || '';
      if (url.startsWith('file://') || url.startsWith('data:')) {
        req.continue().catch(() => {});
      } else {
        req.abort('blockedbyclient').catch(() => {});
      }
    });

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
    await page.pdf({
      path: caminhoPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    return caminhoPdf;
  } finally {
    await page.close().catch(() => {});
    agendarFechamentoOcioso();
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
    execFileSync(msedge, [
      '--headless',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
      '--no-pdf-header-footer',
      `--print-to-pdf=${caminhoPdf}`,
      fileUrl
    ], { stdio: 'pipe', timeout: 60000 });
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
    }
  }

  const linuxBinaries = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', process.env.CHROME_BIN];
  const linuxBin = linuxBinaries.find(b => b && fs.existsSync(b));
  if (linuxBin) {
    const fileUrl = 'file:///' + path.resolve(caminhoHtml).replace(/\\/g, '/');
    execFileSync(linuxBin, [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
      '--no-pdf-header-footer',
      `--print-to-pdf=${caminhoPdf}`,
      fileUrl
    ], { stdio: 'pipe', timeout: 60000 });
    return caminhoPdf;
  }

  throw new Error('Falha na compilação do PDF: Nenhum motor compatível encontrado (Edge, Puppeteer ou Chromium).');
}

async function compilarPDF(caminhoHtml, caminhoPdf) {
  return await filaPdf.add(() => compilarPDFInterno(caminhoHtml, caminhoPdf));
}

module.exports = { compilarPDF, filaPdf };

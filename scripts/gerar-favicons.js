const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 64, height: 64, deviceScaleFactor: 1 });
    const svgPath = path.resolve(__dirname, '../frontend/public/favicon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;width:64px;height:64px;">${svgContent}</body></html>`;
    await page.setContent(html);
    const pngBuffer = await page.screenshot({ type: 'png', omitBackground: true });
    await browser.close();

    // Create standard ICO file embedding the PNG
    const header = Buffer.from([0, 0, 1, 0, 1, 0]);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(64, 0); // width
    entry.writeUInt8(64, 1); // height
    entry.writeUInt8(0, 2);  // colors
    entry.writeUInt8(0, 3);  // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8); // image size
    entry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

    const icoBuffer = Buffer.concat([header, entry, pngBuffer]);

    const pubDir = path.resolve(__dirname, '../frontend/public');
    const distDir = path.resolve(__dirname, '../frontend/dist');

    fs.writeFileSync(path.join(pubDir, 'favicon.ico'), icoBuffer);
    fs.writeFileSync(path.join(pubDir, 'favicon.png'), pngBuffer);

    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'favicon.ico'), icoBuffer);
      fs.writeFileSync(path.join(distDir, 'favicon.png'), pngBuffer);
    }

    console.log('✅ favicon.ico e favicon.png gerados com sucesso!');
    console.log('Tamanho ICO:', icoBuffer.length, 'bytes | PNG:', pngBuffer.length, 'bytes');
  } catch (err) {
    console.error('Erro ao gerar favicons:', err);
    process.exit(1);
  }
})();

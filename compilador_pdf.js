/**
 * Motor de Automação de Laudos de Ultrassom UPA PET
 * Uso: node processar_exame.js "caminho/para/pasta_do_exame"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function compilarPDF(caminhoHtml, caminhoPdf) {
  if (!fs.existsSync(edgePath)) {
    throw new Error("Microsoft Edge não encontrado no caminho padrão.");
  }
  const cmd = `"${edgePath}" --headless=new --no-pdf-header-footer --print-to-pdf="${caminhoPdf}" "${caminhoHtml}"`;
  execSync(cmd);
  console.log("PDF gerado com sucesso em: " + caminhoPdf);
}

module.exports = { compilarPDF };

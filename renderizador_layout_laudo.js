/**
 * Renderizador de Layout de Laudo Ultrassonográfico Dinâmico (Multi-Modelo e Multi-Tenant)
 * Imita fielmente o padrão visual, estrutura de cabeçalho, tabelas e tipografia
 * extraídos a partir dos laudos de exemplo do próprio médico veterinário.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_VISUAL_PADRAO = {
  tipoCabecalho: 'logo-esquerda-texto-direita', // logo-esquerda-texto-direita, logo-centro, banner-superior, duas-colunas-timbrado, sem-logo-tipografico
  tipoDadosPaciente: 'tabela-zebrada', // tabela-zebrada, tabela-borda-simples, grade-boxes, duas-colunas-limpo
  tituloDocumento: 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL',
  subtituloDocumento: 'Exame ultrassonográfico realizado em modo B, realizado em decúbito lateral (esquerdo e direito) e dorsal, utilizando transdutores linear e microconvexo',
  alinhamentoTitulo: 'center', // center, left
  decoracaoTitulo: 'nenhuma', // nenhuma, faixa-colorida, borda-inferior
  estiloOrgaos: 'barra-lateral', // barra-lateral, tarja-colorida, sublinhado, negrito-inline
  estiloConclusao: 'caixa-destaque', // caixa-destaque, secao-sublinhada, texto-simples
  tituloConclusao: 'IMPRESSÃO DIAGNÓSTICA',
  posicaoAssinatura: 'direita', // direita, centro, esquerda
  linhaAssinatura: true,
  textoAvisoLegal: 'O ultrassom é um exame complementar e seu resultado deve ser interpretado exclusivamente pelo médico veterinário responsável, em associação com os achados clínicos e laboratoriais do paciente.',
  rodapeContato: '',
  corPrimaria: '#1B365D',
  corSecundaria: '#4A777A',
  corFundoBlocos: '#F8FAFC',
  corBordaTabelas: '#E2E8F0',
  fontFamily: 'Calibri, sans-serif',
  fontSizeBody: '11pt',
  fontSizeTitulo: '14pt',
  marginTop: '20mm',
  marginBottom: '20mm',
  marginLeft: '15mm',
  marginRight: '15mm',
  lineHeight: '1.4',
  paragraphSpacing: '8pt'
};

function normalizarTemplateVisual(bruto = {}) {
  return {
    ...TEMPLATE_VISUAL_PADRAO,
    ...(bruto || {})
  };
}

/**
 * Renderiza o cabeçalho do laudo conforme o tipo configurado no perfil
 */
function renderizarCabecalho(template, clinicaNome, logoBase64, logoMime) {
  const logoHtml = logoBase64
    ? `<img src="data:${logoMime};base64,${logoBase64}" class="logo-img" alt="${clinicaNome}">`
    : `
      <div class="logo-tipografico" style="border: 2px solid ${template.corPrimaria}; color: ${template.corPrimaria};">
        <span class="monograma">${(clinicaNome || 'VET').substring(0, 2).toUpperCase()}</span>
        <div class="texto-clinica">
          <strong>${clinicaNome || 'Serviço de Diagnóstico Veterinário'}</strong>
          ${template.rodapeContato ? `<small>${template.rodapeContato}</small>` : ''}
        </div>
      </div>
    `;

  switch (template.tipoCabecalho) {
    case 'logo-centro':
      return `
        <div class="header header-centro" style="text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1.5px solid ${template.corSecundaria};">
          <div style="display:inline-block; margin-bottom: 4px;">
            ${logoHtml}
          </div>
          ${template.rodapeContato ? `<p style="font-size: 8pt; color: #666; margin: 2px 0 0 0;">${template.rodapeContato}</p>` : ''}
        </div>
      `;

    case 'banner-superior':
      return `
        <div class="header header-banner" style="background: ${template.corPrimaria}; color: white; padding: 10px 14px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${logoBase64 ? `<img src="data:${logoMime};base64,${logoBase64}" style="max-height: 48px; object-fit: contain; background: white; padding: 2px; border-radius: 4px;" alt="${clinicaNome}">` : ''}
            <div>
              <h2 style="font-size: 15pt; font-weight: 900; margin: 0; color: white;">${clinicaNome}</h2>
              ${template.rodapeContato ? `<p style="font-size: 8pt; margin: 2px 0 0 0; opacity: 0.9;">${template.rodapeContato}</p>` : ''}
            </div>
          </div>
        </div>
      `;

    case 'duas-colunas-timbrado':
      return `
        <div class="header header-timbrado" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${template.corPrimaria};">
          <div style="max-width: 50%;">
            ${logoHtml}
          </div>
          <div style="text-align: right; font-size: 8.5pt; color: #555;">
            <strong style="color: ${template.corPrimaria}; font-size: 10pt;">${clinicaNome}</strong><br>
            ${template.rodapeContato || 'Diagnóstico por Imagem Veterinário'}
          </div>
        </div>
      `;

    case 'logo-esquerda-texto-direita':
    default:
      return `
        <div class="header header-esquerda" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid ${template.corBordaTabelas || '#E2E8F0'};">
          <div class="logo-box" style="width: 140px;">
            ${logoHtml}
          </div>
          <div style="text-align: right; font-size: 9pt; color: ${template.corSecundaria};">
            <strong>${clinicaNome}</strong>
            ${template.rodapeContato ? `<br><small style="color:#777;">${template.rodapeContato}</small>` : ''}
          </div>
        </div>
      `;
  }
}

/**
 * Renderiza o bloco de dados do paciente
 */
function renderizarDadosPaciente(template, dadosPaciente) {
  const nome = dadosPaciente.nome || 'Não informado';
  const tutor = dadosPaciente.tutor || 'Não informado';
  const especie = dadosPaciente.especie || 'Canina';
  const sexo = dadosPaciente.sexo || 'Não informado';
  const idade = dadosPaciente.idade || 'Não informada';
  const data = dadosPaciente.data || new Date().toLocaleDateString('pt-BR');
  const solicitante = dadosPaciente.solicitante || 'A/C Clínico Veterinário Responsável';

  switch (template.tipoDadosPaciente) {
    case 'tabela-zebrada':
    case 'tabela-borda-simples':
      return `
        <table class="patient-table ${template.tipoDadosPaciente === 'tabela-zebrada' ? 'paciente-tabela-zebrada' : 'paciente-tabela-simples'}" style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt; border: 1px solid ${template.corBordaTabelas};">
          <tbody>
            <tr>
              <th style="width: 15%; background: ${template.corFundoBlocos}; color: ${template.corPrimaria}; padding: 4px 6px; text-align: left; border: 1px solid ${template.corBordaTabelas};">Paciente:</th>
              <td style="width: 35%; padding: 4px 6px; border: 1px solid ${template.corBordaTabelas}; font-weight: bold;">${nome}</td>
              <th style="width: 15%; background: ${template.corFundoBlocos}; color: ${template.corPrimaria}; padding: 4px 6px; text-align: left; border: 1px solid ${template.corBordaTabelas};">Tutor:</th>
              <td style="width: 35%; padding: 4px 6px; border: 1px solid ${template.corBordaTabelas};">${tutor}</td>
            </tr>
            <tr>
              <th style="background: ${template.corFundoBlocos}; color: ${template.corPrimaria}; padding: 4px 6px; text-align: left; border: 1px solid ${template.corBordaTabelas};">Espécie:</th>
              <td style="padding: 4px 6px; border: 1px solid ${template.corBordaTabelas};">${especie}</td>
              <th style="background: ${template.corFundoBlocos}; color: ${template.corPrimaria}; padding: 4px 6px; text-align: left; border: 1px solid ${template.corBordaTabelas};">Sexo / Idade:</th>
              <td style="padding: 4px 6px; border: 1px solid ${template.corBordaTabelas};">${sexo} • ${idade}</td>
            </tr>
            <tr>
              <th style="background: ${template.corFundoBlocos}; color: ${template.corPrimaria}; padding: 4px 6px; text-align: left; border: 1px solid ${template.corBordaTabelas};">Data:</th>
              <td style="padding: 4px 6px; border: 1px solid ${template.corBordaTabelas};">${data}</td>
              <th style="background: ${template.corFundoBlocos}; color: ${template.corPrimaria}; padding: 4px 6px; text-align: left; border: 1px solid ${template.corBordaTabelas};">Solicitante:</th>
              <td style="padding: 4px 6px; border: 1px solid ${template.corBordaTabelas};">${solicitante}</td>
            </tr>
          </tbody>
        </table>
      `;

    case 'grade-boxes':
      return `
        <div class="patient-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; font-size: 9pt;">
          <div style="background: ${template.corFundoBlocos}; border-left: 3px solid ${template.corPrimaria}; padding: 4px 8px; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 8pt;">PACIENTE</p>
            <p style="margin: 1px 0 0 0; font-weight: bold; color: #111;">${nome}</p>
          </div>
          <div style="background: ${template.corFundoBlocos}; border-left: 3px solid ${template.corPrimaria}; padding: 4px 8px; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 8pt;">TUTOR</p>
            <p style="margin: 1px 0 0 0; font-weight: bold; color: #111;">${tutor}</p>
          </div>
          <div style="background: ${template.corFundoBlocos}; border-left: 3px solid ${template.corPrimaria}; padding: 4px 8px; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 8pt;">ESPÉCIE / SEXO</p>
            <p style="margin: 1px 0 0 0; font-weight: bold; color: #111;">${especie} • ${sexo}</p>
          </div>
          <div style="background: ${template.corFundoBlocos}; border-left: 3px solid ${template.corSecundaria}; padding: 4px 8px; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 8pt;">IDADE</p>
            <p style="margin: 1px 0 0 0; font-weight: bold; color: #111;">${idade}</p>
          </div>
          <div style="background: ${template.corFundoBlocos}; border-left: 3px solid ${template.corSecundaria}; padding: 4px 8px; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 8pt;">DATA DO EXAME</p>
            <p style="margin: 1px 0 0 0; font-weight: bold; color: #111;">${data}</p>
          </div>
          <div style="background: ${template.corFundoBlocos}; border-left: 3px solid ${template.corSecundaria}; padding: 4px 8px; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 8pt;">SOLICITANTE</p>
            <p style="margin: 1px 0 0 0; font-weight: bold; color: #111;">${solicitante}</p>
          </div>
        </div>
      `;

    case 'duas-colunas-limpo':
    default:
      return `
        <div class="patient-info" style="display: flex; justify-content: space-between; background: ${template.corFundoBlocos}; padding: 6px 14px; border-radius: 6px; margin-bottom: 12px; font-size: 9.5pt;">
          <div class="col" style="flex: 1;">
            <p style="margin: 2px 0;"><strong>Nome:</strong> ${nome}</p>
            <p style="margin: 2px 0;"><strong>Espécie:</strong> ${especie}</p>
            <p style="margin: 2px 0;"><strong>Idade:</strong> ${idade}</p>
          </div>
          <div class="col" style="flex: 1;">
            <p style="margin: 2px 0;"><strong>Tutor:</strong> ${tutor}</p>
            <p style="margin: 2px 0;"><strong>Sexo:</strong> ${sexo}</p>
            <p style="margin: 2px 0;"><strong>Data:</strong> ${data}</p>
          </div>
        </div>
      `;
  }
}

/**
 * Renderiza o título do documento
 */
function renderizarTitulo(template) {
  const alinhamento = template.alinhamentoTitulo === 'left' ? 'left' : 'center';
  const titulo = template.tituloDocumento || 'RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL';
  const subtitulo = template.subtituloDocumento || '';

  let estiloDecoracao = '';
  if (template.decoracaoTitulo === 'faixa-colorida') {
    estiloDecoracao = `background: ${template.corPrimaria}; color: white; padding: 6px 10px; border-radius: 4px;`;
  } else if (template.decoracaoTitulo === 'borda-inferior') {
    estiloDecoracao = `border-bottom: 2px solid ${template.corPrimaria}; padding-bottom: 4px;`;
  }

  return `
    <div class="title-box" style="text-align: ${alinhamento}; margin: 8px 0 10px 0; ${estiloDecoracao}">
      <h1 style="font-size: ${template.fontSizeTitulo || '14pt'}; font-weight: 800; margin: 0; letter-spacing: 0.3px; color: ${template.decoracaoTitulo === 'faixa-colorida' ? 'white' : template.corPrimaria};">
        ${titulo}
      </h1>
      ${subtitulo ? `<p style="font-size: 8pt; font-style: italic; margin: 3px 0 0 0; color: ${template.decoracaoTitulo === 'faixa-colorida' ? 'rgba(255,255,255,0.9)' : template.corSecundaria};">${subtitulo}</p>` : ''}
    </div>
  `;
}

/**
 * Renderiza os achados dos órgãos conforme o estilo visual especificado
 */
function renderizarAchadosOrgaos(template, laudoArray) {
  // Separa seções normais de órgãos vs seção de conclusão/considerações
  const itensCorpo = [];
  const itensConclusao = [];

  for (const rawItem of laudoArray) {
    const nomeIdentificado = rawItem.orgao || rawItem.secao || '';
    const item = { ...rawItem, orgao: nomeIdentificado };
    const orgNomeUpper = nomeIdentificado.toUpperCase();
    if (orgNomeUpper.includes('CONSIDERAÇÕES') || orgNomeUpper.includes('CONCLUSAO') || orgNomeUpper.includes('CONCLUSÃO') || orgNomeUpper.includes('IMPRESSÃO')) {
      itensConclusao.push(item);
    } else {
      itensCorpo.push(item);
    }
  }

  const corpoHtml = itensCorpo.map(item => {
    const regexOrgao = new RegExp(`^${item.orgao}[:\\s-]*`, 'i');
    const textoLimpo = (item.texto || '').replace(regexOrgao, '').trim();
    const textoFormatado = textoLimpo.replace(/\r?\n/g, '<br>');

    switch (template.estiloOrgaos) {
      case 'tarja-colorida':
        return `
          <div class="organ-item orgao-badge" style="margin-bottom: 6px;">
            <div style="background: ${template.corPrimaria}; color: white; padding: 2.5px 8px; font-weight: bold; font-size: 10pt; border-radius: 3px; display: inline-block; letter-spacing: 0.3px;">
              ${item.orgao}
            </div>
            <div style="margin-top: 2px; text-align: justify; font-size: ${template.fontSizeBody}; line-height: ${template.lineHeight};">
              ${textoFormatado}
              ${item.diagDif ? `<div style="color: ${template.corSecundaria}; font-style: italic; font-weight: 600; margin-top: 2px;">DIAG DIF.: ${item.diagDif}</div>` : ''}
            </div>
          </div>
        `;

      case 'barra-lateral':
        return `
          <div class="organ-item" style="border-left: 3.5px solid ${template.corPrimaria}; padding-left: 8px; margin-bottom: 7px;">
            <div style="font-weight: 800; color: ${template.corPrimaria}; font-size: 10.5pt; text-transform: uppercase;">
              ${item.orgao}
            </div>
            <div style="margin-top: 1px; text-align: justify; font-size: ${template.fontSizeBody}; line-height: ${template.lineHeight};">
              ${textoFormatado}
              ${item.diagDif ? `<div style="color: ${template.corSecundaria}; font-style: italic; font-weight: 600; margin-top: 1px;">DIAG DIF.: ${item.diagDif}</div>` : ''}
            </div>
          </div>
        `;

      case 'sublinhado':
        return `
          <div class="organ-item" style="margin-bottom: 6px;">
            <div style="border-bottom: 1px solid ${template.corSecundaria}; color: ${template.corPrimaria}; font-weight: bold; font-size: 10.5pt; padding-bottom: 1px; margin-bottom: 2px;">
              ${item.orgao}
            </div>
            <div style="text-align: justify; font-size: ${template.fontSizeBody}; line-height: ${template.lineHeight};">
              ${textoFormatado}
              ${item.diagDif ? `<span style="color: ${template.corSecundaria}; font-style: italic;"> (DIAG DIF.: ${item.diagDif})</span>` : ''}
            </div>
          </div>
        `;

      case 'negrito-inline':
      default:
        return `
          <p style="margin: 0 0 ${template.paragraphSpacing || '6pt'} 0; text-align: justify; font-size: ${template.fontSizeBody}; line-height: ${template.lineHeight};">
            <strong style="color: ${template.corPrimaria};">${item.orgao}:</strong> ${textoFormatado}
            ${item.diagDif ? `<em style="color: ${template.corSecundaria}; font-weight: 600;"> DIAG DIF.: ${item.diagDif}</em>` : ''}
          </p>
        `;
    }
  }).join('\n');

  // Conclusão
  let conclusaoHtml = '';
  if (itensConclusao.length > 0) {
    const textoConclusao = itensConclusao.map(i => {
      const regex = new RegExp(`^${i.orgao}[:\\s-]*`, 'i');
      return (i.texto || '').replace(regex, '').trim().replace(/\r?\n/g, '<br>');
    }).join('<br>');

    const tituloConcl = template.tituloConclusao || 'IMPRESSÃO DIAGNÓSTICA';

    if (template.estiloConclusao === 'caixa-destaque') {
      conclusaoHtml = `
        <div class="conclusion-box" style="background: ${template.corFundoBlocos}; border: 1.5px solid ${template.corPrimaria}; border-radius: 6px; padding: 8px 12px; margin-top: 10px;">
          <h3 style="color: ${template.corPrimaria}; margin: 0 0 3px 0; font-size: 11pt; font-weight: 800; text-transform: uppercase;">
            ${tituloConcl}
          </h3>
          <div style="font-size: ${template.fontSizeBody}; line-height: ${template.lineHeight}; text-align: justify;">
            ${textoConclusao}
          </div>
        </div>
      `;
    } else {
      conclusaoHtml = `
        <div class="conclusion-box" style="margin-top: 8px; border-top: 1.5px solid ${template.corPrimaria}; padding-top: 4px;">
          <h3 style="color: ${template.corPrimaria}; margin: 0 0 2px 0; font-size: 11pt; font-weight: 800; text-transform: uppercase;">
            ${tituloConcl}
          </h3>
          <div style="font-size: ${template.fontSizeBody}; line-height: ${template.lineHeight}; text-align: justify;">
            ${textoConclusao}
          </div>
        </div>
      `;
    }
  }

  return { corpoHtml, conclusaoHtml };
}

/**
 * Renderiza o rodapé com assinatura e aviso legal
 */
function renderizarRodape(template, nomeMedico, crmvMedico, assinaturaImgHtml) {
  const alinhamentoAssinatura = template.posicaoAssinatura === 'centro'
    ? 'center'
    : (template.posicaoAssinatura === 'esquerda' ? 'left' : 'right');

  const linhaHtml = template.linhaAssinatura
    ? `<div style="width: 220px; border-top: 1px solid #444; margin: 0 auto 3px auto; display: inline-block;"></div><br>`
    : '';

  return `
    <div class="signature-section" style="text-align: ${alinhamentoAssinatura}; margin-top: 6px; padding: 0 10px;">
      ${assinaturaImgHtml}
      ${linhaHtml}
      <p style="margin: 0; font-weight: bold; font-size: 10pt; color: #111;">${nomeMedico}</p>
      <p style="margin: 1px 0 0 0; font-size: 9pt; color: ${template.corSecundaria};">${crmvMedico}</p>
    </div>
    <div class="footer-legal" style="font-size: 7.2pt; font-style: italic; color: #666; text-align: center; border-top: 1px solid ${template.corBordaTabelas || '#ccc'}; padding-top: 3px; margin-top: 6px;">
      ${template.textoAvisoLegal}
    </div>
  `;
}

/**
 * Constrói o HTML completo para impressão / compilação PDF
 */
function construirHtmlLaudo(dadosPaciente, laudoArray, imagensPaths = [], opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const perfilLaudo = opcoes.perfilLaudo || null;

  // Carrega e normaliza o template visual especificado no perfil
  const templateVisualBruto = perfilLaudo?.templateVisual || perfilLaudo?.layoutDetectado || opcoes.customLayout || {};
  const template = normalizarTemplateVisual(templateVisualBruto);

  const clinicaNome = opcoes.clinicaNome || perfilLaudo?.clinicaDetectada || usuario.nomeClinica || 'Serviço Veterinário';
  const nomeMedico = opcoes.nomeMedico || perfilLaudo?.nomeDetectado || usuario.nome || 'Médico Veterinário';
  const crmvMedico = opcoes.crmvMedico || perfilLaudo?.crmvDetectado || usuario.crmv || 'CRMV';

  // Logotipo: Se o usuário tem perfil customizado e NÃO tem logoUrl própria, NÃO usa o logo UPA PET!
  let logoBase64 = '';
  let logoMime = 'image/png';

  if (usuario.logoUrl && fs.existsSync(usuario.logoUrl)) {
    logoBase64 = fs.readFileSync(usuario.logoUrl).toString('base64');
    logoMime = path.extname(usuario.logoUrl).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  } else if (!perfilLaudo || !perfilLaudo.ativo) {
    // Apenas se NÃO houver perfil customizado usa o logo padrão UPA PET oficial
    const assetsDir = path.join(__dirname, 'assets');
    const logoOficial = path.join(assetsDir, 'logo_upa_pet_oficial.png');
    const logoSec = path.join(assetsDir, 'logo_upa_pet.jpg');
    const caminhoOficial = fs.existsSync(logoOficial) ? logoOficial : (fs.existsSync(logoSec) ? logoSec : null);
    if (caminhoOficial) {
      logoBase64 = fs.readFileSync(caminhoOficial).toString('base64');
      logoMime = path.extname(caminhoOficial).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    }
  }

  // Assinatura
  let assinaturaImgHtml = '';
  if (usuario.assinaturaUrl && fs.existsSync(usuario.assinaturaUrl)) {
    const assExt = path.extname(usuario.assinaturaUrl).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const assBase64 = fs.readFileSync(usuario.assinaturaUrl).toString('base64');
    assinaturaImgHtml = `<img src="data:${assExt};base64,${assBase64}" style="max-height: 44px; display: inline-block; margin-bottom: 2px;" alt="Assinatura"><br>`;
  }

  const cabecalhoHtml = renderizarCabecalho(template, clinicaNome, logoBase64, logoMime);
  const dadosPacienteHtml = renderizarDadosPaciente(template, dadosPaciente);
  const tituloHtml = renderizarTitulo(template);
  const { corpoHtml, conclusaoHtml } = renderizarAchadosOrgaos(template, laudoArray);
  const rodapeHtml = renderizarRodape(template, nomeMedico, crmvMedico, assinaturaImgHtml);

  // Paginação de imagens (máximo 8 por folha)
  const paginasImagens = [];
  for (let i = 0; i < imagensPaths.length; i += 8) {
    paginasImagens.push(imagensPaths.slice(i, i + 8));
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${template.tituloDocumento || 'Laudo de Ultrassonografia'} - ${dadosPaciente.nome || 'Paciente'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: ${template.fontFamily};
      font-size: ${template.fontSizeBody};
      line-height: ${template.lineHeight};
      color: #111;
      margin: 0;
      padding: 0;
      background-color: #f0f2f5;
    }
    .page-container {
      width: 210mm;
      height: 297mm;
      margin: 20px auto;
      background: white;
      padding: ${template.marginTop} ${template.marginRight} ${template.marginBottom} ${template.marginLeft};
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    @media print {
      body { background: transparent; }
      .page-container {
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: ${template.marginTop} ${template.marginRight} ${template.marginBottom} ${template.marginLeft} !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
    .logo-img {
      max-width: 140px;
      max-height: 52px;
      object-fit: contain;
    }
    .logo-tipografico {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .monograma {
      font-size: 16pt;
      font-weight: 900;
      line-height: 1;
    }
    .texto-clinica {
      text-align: left;
      font-size: 9pt;
      line-height: 1.1;
      display: flex;
      flex-direction: column;
    }
    .content-body {
      flex: 1;
      text-align: justify;
      font-size: ${template.fontSizeBody};
      line-height: ${template.lineHeight};
      outline: none;
    }
    .image-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 6px;
      flex: 1;
      margin-top: 6px;
      align-content: start;
    }
    .img-card {
      border: 1px solid #222;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 52mm;
      overflow: hidden;
    }
    .img-card img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <!-- FOLHA 1: LAUDO DESCRITIVO E CONCLUSÃO -->
  <div class="page-container">
    <div>
      ${cabecalhoHtml}
      ${dadosPacienteHtml}
      ${tituloHtml}
      <div class="content-body" contenteditable="true" spellcheck="false">
        ${corpoHtml}
        ${conclusaoHtml}
      </div>
    </div>
    <div>
      ${rodapeHtml}
    </div>
  </div>

  <!-- FOLHAS SEGUINTES: PRANCHAS DE IMAGENS DO EXAME -->
  ${paginasImagens.map((fotos) => `
    <div class="page-container">
      <div>
        ${cabecalhoHtml}
        <div class="image-grid">
          ${fotos.map(foto => `
            <div class="img-card">
              <img src="${foto}" alt="Imagem Ultrassonográfica">
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="footer-legal" style="font-size: 7.2pt; font-style: italic; color: #666; text-align: center; border-top: 1px solid ${template.corBordaTabelas || '#ccc'}; padding-top: 3px; margin-top: 6px;">
          ${template.textoAvisoLegal}
        </div>
      </div>
    </div>
  `).join('')}
</body>
</html>`;
}

module.exports = {
  construirHtmlLaudo,
  normalizarTemplateVisual,
  TEMPLATE_VISUAL_PADRAO
};

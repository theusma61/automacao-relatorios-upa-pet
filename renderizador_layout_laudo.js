/**
 * Renderizador de Layout de Laudo Ultrassonográfico Dinâmico (Multi-Modelo e Multi-Tenant)
 * Imita fielmente o padrão visual, estrutura de cabeçalho, tabelas e tipografia
 * extraídos a partir dos laudos de exemplo do próprio médico veterinário.
 */

const fs = require('fs');
const path = require('path');

function resolverCaminhoArquivo(caminho) {
  if (!caminho || typeof caminho !== 'string') return null;
  const limpo = caminho.trim();
  if (!limpo) return null;

  if (fs.existsSync(limpo)) return path.resolve(limpo);

  const semApp = limpo.replace(/^\/app\//, '').replace(/^app\//, '');
  if (fs.existsSync(semApp)) return path.resolve(semApp);
  if (fs.existsSync(path.join(__dirname, semApp))) return path.resolve(path.join(__dirname, semApp));

  const semBarra = limpo.replace(/^\/+/, '');
  if (fs.existsSync(semBarra)) return path.resolve(semBarra);
  if (fs.existsSync(path.join(__dirname, semBarra))) return path.resolve(path.join(__dirname, semBarra));

  const resolvidoCwd = path.resolve(process.cwd(), semBarra);
  if (fs.existsSync(resolvidoCwd)) return resolvidoCwd;

  return null;
}

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
              <th style="width: 15%; background: ${template.corFundoBlocos}; color: ${template.corPrimaria}; padding: 4px 6px; text-align: left; border: 1px solid ${template.corBordaTabelas};">Responsável:</th>
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
            <p style="margin: 0; color: #666; font-size: 8pt;">RESPONSÁVEL</p>
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
            <p style="margin: 2px 0;"><strong>Responsável:</strong> ${tutor}</p>
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
function renderizarAchadosOrgaos(template, laudoArray, autoFit = {}) {
  const fSizeBody = autoFit.fontSizeBody || template.fontSizeBody || '10.5pt';
  const lHeight = autoFit.lineHeight || template.lineHeight || '1.35';
  const pSpacing = autoFit.paragraphSpacing || template.paragraphSpacing || '6pt';

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
          <div class="organ-item orgao-badge" style="margin-bottom: ${pSpacing};">
            <div style="background: ${template.corPrimaria}; color: white; padding: 2px 7px; font-weight: bold; font-size: 9.5pt; border-radius: 3px; display: inline-block; letter-spacing: 0.2px;">
              ${item.orgao}
            </div>
            <div style="margin-top: 1px; text-align: justify; font-size: ${fSizeBody}; line-height: ${lHeight};">
              ${textoFormatado}
              ${item.diagDif ? `<div style="color: ${template.corSecundaria}; font-style: italic; font-weight: 600; margin-top: 1px;">DIAG DIF.: ${item.diagDif}</div>` : ''}
            </div>
          </div>
        `;

      case 'barra-lateral':
        return `
          <div class="organ-item" style="border-left: 3px solid ${template.corPrimaria}; padding-left: 7px; margin-bottom: ${pSpacing};">
            <div style="font-weight: 800; color: ${template.corPrimaria}; font-size: 10pt; text-transform: uppercase;">
              ${item.orgao}
            </div>
            <div style="margin-top: 1px; text-align: justify; font-size: ${fSizeBody}; line-height: ${lHeight};">
              ${textoFormatado}
              ${item.diagDif ? `<div style="color: ${template.corSecundaria}; font-style: italic; font-weight: 600; margin-top: 1px;">DIAG DIF.: ${item.diagDif}</div>` : ''}
            </div>
          </div>
        `;

      case 'sublinhado':
        return `
          <div class="organ-item" style="margin-bottom: ${pSpacing};">
            <div style="border-bottom: 1px solid ${template.corSecundaria}; color: ${template.corPrimaria}; font-weight: bold; font-size: 10pt; padding-bottom: 1px; margin-bottom: 1px;">
              ${item.orgao}
            </div>
            <div style="text-align: justify; font-size: ${fSizeBody}; line-height: ${lHeight};">
              ${textoFormatado}
              ${item.diagDif ? `<span style="color: ${template.corSecundaria}; font-style: italic;"> (DIAG DIF.: ${item.diagDif})</span>` : ''}
            </div>
          </div>
        `;

      case 'negrito-inline':
      default:
        return `
          <p style="margin: 0 0 ${pSpacing} 0; text-align: justify; font-size: ${fSizeBody}; line-height: ${lHeight};">
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

  const nomeLimpo = (nomeMedico && nomeMedico !== 'null' && nomeMedico !== 'undefined') ? String(nomeMedico).trim() : '';
  const crmvLimpo = (crmvMedico && crmvMedico !== 'null' && crmvMedico !== 'undefined') ? String(crmvMedico).trim() : '';

  return `
    <div class="signature-section" style="text-align: ${alinhamentoAssinatura}; margin-top: 6px; padding: 0 10px;">
      ${assinaturaImgHtml}
      ${linhaHtml}
      ${nomeLimpo ? `<p style="margin: 0; font-weight: bold; font-size: 10pt; color: #111;">${nomeLimpo}</p>` : ''}
      ${crmvLimpo ? `<p style="margin: 1px 0 0 0; font-size: 9pt; color: ${template.corSecundaria};">${crmvLimpo}</p>` : ''}
    </div>
    <div class="footer-legal" style="font-size: 7.2pt; font-style: italic; color: #666; text-align: center; border-top: 1px solid ${template.corBordaTabelas || '#ccc'}; padding-top: 3px; margin-top: 6px;">
      ${template.textoAvisoLegal}
    </div>
  `;
}

/**
 * Unifica anatomicamente estruturas correlatas (ex: CUD/CUE no Útero)
 * para evitar criação de tópicos isolados e economizar linhas e respiros verticais.
 */
function normalizarOrgaosCanonica(laudoArray) {
  if (!Array.isArray(laudoArray) || laudoArray.length === 0) return [];

  const itens = JSON.parse(JSON.stringify(laudoArray));
  const idxUtero = itens.findIndex(it => /^(UTERO|ÚTERO)$/i.test((it.orgao || '').trim()));
  const indicesParaRemover = [];

  itens.forEach((it, idx) => {
    const nomeNorm = (it.orgao || '').trim().toUpperCase();
    if (idxUtero !== -1 && idx !== idxUtero) {
      if (/^(CUD|CUE|CORNO\s+UTERINO(\s+(DIREITO|ESQUERDO))?)$/i.test(nomeNorm)) {
        const textoCorno = (it.texto || '').trim();
        if (textoCorno) {
          const prefixo = nomeNorm.startsWith('CUD') ? 'CUD: ' : (nomeNorm.startsWith('CUE') ? 'CUE: ' : '');
          const textoAdicionar = textoCorno.toUpperCase().startsWith(prefixo) ? textoCorno : `${prefixo}${textoCorno}`;
          itens[idxUtero].texto = `${itens[idxUtero].texto.trim()} ${textoAdicionar}`.trim();
        }
        if (it.diagDif && it.diagDif.trim()) {
          const diagAtual = (itens[idxUtero].diagDif || '').trim();
          if (!diagAtual) {
            itens[idxUtero].diagDif = it.diagDif.trim();
          } else if (!diagAtual.includes(it.diagDif.trim())) {
            itens[idxUtero].diagDif = `${diagAtual}, ${it.diagDif.trim()}`;
          }
        }
        indicesParaRemover.push(idx);
      }
    } else if (idxUtero === -1 && /^(CUD|CUE)$/i.test(nomeNorm)) {
      it.orgao = 'ÚTERO';
    }
  });

  return itens.filter((_, idx) => !indicesParaRemover.includes(idx));
}

/**
 * Auto-Fit Dinâmico e Agnóstico da Página Textual de Ultrassom.
 * Analisa a densidade textual (órgãos, caracteres, quebras de linha e diagnósticos diferenciais)
 * e calcula proporções de contração suaves (fontes, entrelinhas, margens e espaçamento entre parágrafos)
 * para assegurar a Regra Pétrea da Página Única sem quebras acidentais de 1 linha para a página 2.
 */
function calcularAutoFitLaudoTextual(laudoArray = [], layoutBase = {}, opcoes = {}) {
  const laudo = normalizarOrgaosCanonica(laudoArray);
  const qtdOrgaos = laudo.length;

  const totalChars = laudo.reduce((acc, item) => {
    return acc + (item?.orgao?.length || 0) + (item?.texto?.length || 0) + (item?.diagDif?.length || 0);
  }, 0);

  const qtdQuebras = laudo.reduce((acc, item) => {
    return acc + ((item?.texto || '').split(/\r?\n/).length - 1);
  }, 0);

  // Lê valores explícitos configurados pelo usuário no Editor de Layout ou Padrão de Laudo
  const userFontBody = layoutBase.font_size_body || layoutBase.fontSizeBody || null;
  const userFontTitulo = layoutBase.font_size_titulo || layoutBase.fontSizeTitulo || null;
  const userLineHeight = layoutBase.line_height || layoutBase.lineHeight || null;
  const userParagraphSpacing = layoutBase.paragraph_spacing || layoutBase.paragraphSpacing || null;
  const userMarginTop = layoutBase.margin_top || layoutBase.marginTop || null;
  const userMarginBottom = layoutBase.margin_bottom || layoutBase.marginBottom || null;
  const userMarginLeft = layoutBase.margin_left || layoutBase.marginLeft || null;
  const userMarginRight = layoutBase.margin_right || layoutBase.marginRight || null;
  const paginacaoPref = String(
    opcoes.paginacaoTexto ||
    layoutBase.paginacao_texto ||
    layoutBase.paginacaoTexto ||
    layoutBase.visual_config_json?.paginacaoTexto ||
    'preencher'
  ).toLowerCase() === 'equilibrar' ? 'equilibrar' : 'preencher';

  const temConfigUsuario = Boolean(userFontBody || userLineHeight || userParagraphSpacing || userMarginTop || userMarginBottom);

  const scoreBruto = totalChars + (qtdOrgaos * 144) + (qtdQuebras * 80);
  const tierBase = (qtdOrgaos <= 7 && scoreBruto <= 2400)
    ? 'normal'
    : (qtdOrgaos <= 11 && scoreBruto <= 4300 ? 'compact' : 'ultra_compact');

  // Tipografia efetiva para medição geométrica real (em milímetros sobre folha A4 210x297mm)
  const efetivoFontBody = userFontBody || (tierBase === 'normal' ? '10.5pt' : (tierBase === 'compact' ? '9.8pt' : '9.2pt'));
  const efetivoFontTitulo = userFontTitulo || (tierBase === 'normal' ? '13.5pt' : '12.5pt');
  const efetivoLineHeight = userLineHeight ? String(userLineHeight) : (tierBase === 'normal' ? '1.36' : (tierBase === 'compact' ? '1.28' : '1.22'));
  const efetivoSpacing = userParagraphSpacing || (tierBase === 'normal' ? '8pt' : (tierBase === 'compact' ? '6pt' : '4pt'));
  const efetivoMTop = userMarginTop || (tierBase === 'normal' ? '16mm' : '12mm');
  const efetivoMBot = userMarginBottom || (tierBase === 'normal' ? '16mm' : '12mm');
  const efetivoMLeft = userMarginLeft || '15mm';
  const efetivoMRight = userMarginRight || '15mm';

  const bodyPtNum = parseFloat(String(efetivoFontBody)) || 10.5;
  const lhNum = parseFloat(String(efetivoLineHeight)) || 1.35;
  const spValNum = parseFloat(String(efetivoSpacing)) || 8;
  const spMm = String(efetivoSpacing).toLowerCase().includes('mm') ? spValNum : (spValNum * 0.3528);
  const mTopMm = parseFloat(String(efetivoMTop)) || 16;
  const mBotMm = parseFloat(String(efetivoMBot)) || 16;
  const mLeftMm = parseFloat(String(efetivoMLeft)) || 15;
  const mRightMm = parseFloat(String(efetivoMRight)) || 15;

  // Cálculo geométrico agnóstico: largura útil e quebra de linha real (calibrado para fontes proporcionais PT-BR)
  const larguraUtilMm = Math.max(85, 210 - mLeftMm - mRightMm);
  const charWidthMm = bodyPtNum * 0.3528 * 0.455;
  const charsPorLinha = Math.max(16, Math.floor(larguraUtilMm / Math.max(0.45, charWidthMm)));
  const alturaLinhaMm = bodyPtNum * 0.3528 * lhNum;

  const alturasItensMm = laudo.map((item) => {
    const orgaoTxt = `${item?.orgao || ''}: `;
    const corpoTxt = String(item?.texto || '');
    const diagTxt = item?.diagDif ? ` DIAG DIF.: ${item.diagDif}` : '';
    const textoCompleto = `${orgaoTxt}${corpoTxt}${diagTxt}`;
    const sublinhas = textoCompleto.split(/\r?\n/);
    const totalLinhas = sublinhas.reduce((acc, l) => acc + Math.max(1, Math.ceil(l.length / charsPorLinha)), 0);
    return (totalLinhas * alturaLinhaMm) + spMm;
  });

  // Reserva real de cabeçalho, título, rodapé e assinatura (respeitando o modelo agnóstico e toggles de assinatura)
  const temRodape = opcoes.temRodape !== false;
  const temAssinaturaImg = opcoes.temAssinaturaImg !== false;
  const temAssinaturaTexto = opcoes.temAssinaturaTexto !== false;
  const topoPag1Mm = typeof opcoes.alturaTopoPag1Mm === 'number'
    ? opcoes.alturaTopoPag1Mm
    : Math.max(46, mTopMm + 32);
  const topoContMm = typeof opcoes.alturaTopoContMm === 'number'
    ? opcoes.alturaTopoContMm
    : Math.max(26, mTopMm + 12);
  const rodapeMm = temRodape ? Math.max(14, mBotMm + 8) : Math.max(8, mBotMm);
  const assinaturaMm = (temAssinaturaImg ? 20 : 0) + (temAssinaturaTexto ? 11 : 0);
  const folgaSegurancaMm = 4;

  const alturaUtilPag1Mm = Math.max(80, 297 - topoPag1Mm - rodapeMm - folgaSegurancaMm);
  const alturaUtilContMm = Math.max(95, 297 - topoContMm - rodapeMm - folgaSegurancaMm);
  const somaTotalAlturasMm = alturasItensMm.reduce((a, b) => a + b, 0);

  const score = Math.round(scoreBruto * Math.pow(bodyPtNum / 10.5, 2) * (lhNum / 1.35));

  // Se tudo (órgãos + assinatura + rodapé) cabe com folga na Página 1, mantém Página Única
  const cabeEmUmaPagina = (somaTotalAlturasMm + assinaturaMm) <= alturaUtilPag1Mm && (temConfigUsuario || qtdOrgaos <= 14);

  if (cabeEmUmaPagina || qtdOrgaos === 0) {
    return {
      laudoAjustado: laudo,
      paginasIndices: qtdOrgaos > 0 ? [laudo.map((_, i) => i)] : [[]],
      modoPaginacao: 'single_page',
      paginacaoTexto: paginacaoPref,
      score,
      tier: tierBase,
      fontSizeBody: efetivoFontBody,
      fontSizeTitulo: efetivoFontTitulo,
      subtitleFontSize: tierBase === 'normal' ? '8pt' : '7.5pt',
      lineHeight: efetivoLineHeight,
      paragraphSpacing: efetivoSpacing,
      marginTop: efetivoMTop,
      marginBottom: efetivoMBot,
      marginLeft: efetivoMLeft,
      marginRight: efetivoMRight,
      marginHeaderBottom: tierBase === 'normal' ? '6px' : '4px',
      paddingHeaderBottom: tierBase === 'normal' ? '6px' : '4px',
      marginTitleBox: tierBase === 'normal' ? '6px 0 8px 0' : '4px 0 5px 0',
      marginSignatureTop: tierBase === 'normal' ? '6px' : '4px',
      signatureMaxHeight: tierBase === 'normal' ? '44px' : '38px',
      logoMaxHeight: tierBase === 'normal' ? '52px' : '46px'
    };
  }

  // Paginação gulosa ("preencher"): preenche ao máximo cada folha respeitando rodapé e assinatura
  const paginarPreencher = () => {
    const paginas = [];
    let atual = [];
    let alturaAtual = 0;
    let limiteAtual = alturaUtilPag1Mm;

    for (let i = 0; i < qtdOrgaos; i++) {
      const h = alturasItensMm[i];
      if (atual.length > 0 && (alturaAtual + h) > limiteAtual) {
        paginas.push(atual);
        atual = [i];
        alturaAtual = h;
        limiteAtual = alturaUtilContMm;
      } else {
        atual.push(i);
        alturaAtual += h;
      }
    }
    if (atual.length > 0) paginas.push(atual);

    // Verifica se a assinatura cabe na última página; se não couber, move o último órgão junto para a próxima página
    const ultIdx = paginas.length - 1;
    const limiteUlt = ultIdx === 0 ? alturaUtilPag1Mm : alturaUtilContMm;
    const alturaUlt = paginas[ultIdx].reduce((acc, idx) => acc + alturasItensMm[idx], 0);
    if ((alturaUlt + assinaturaMm) > limiteUlt) {
      if (paginas[ultIdx].length > 1) {
        const movido = paginas[ultIdx].pop();
        paginas.push([movido]);
      } else {
        paginas.push([]);
      }
    }
    return paginas;
  };

  let paginasIndices = paginarPreencher();

  // Modo "equilibrar": distribui o conteúdo proporcionalmente entre o número mínimo de páginas necessárias
  if (paginacaoPref === 'equilibrar' && paginasIndices.length >= 2) {
    const numPags = paginasIndices.length;
    const pesoTotalComAssinatura = somaTotalAlturasMm + assinaturaMm;
    const alvoPorPagina = pesoTotalComAssinatura / numPags;
    const balanceadas = [];
    let atual = [];
    let accAtual = 0;

    for (let i = 0; i < qtdOrgaos; i++) {
      const h = alturasItensMm[i];
      const pagIdx = balanceadas.length;
      const limiteFisico = pagIdx === 0 ? alturaUtilPag1Mm : alturaUtilContMm;
      const pagsRestantes = numPags - pagIdx - 1;
      const itensRestantes = qtdOrgaos - i;

      const excedeFisico = atual.length > 0 && (accAtual + h) > limiteFisico;
      const atingiuAlvo = pagsRestantes > 0 && atual.length > 0 && itensRestantes >= pagsRestantes && (accAtual + h * 0.5) >= alvoPorPagina;

      if (excedeFisico || atingiuAlvo) {
        balanceadas.push(atual);
        atual = [i];
        accAtual = h;
      } else {
        atual.push(i);
        accAtual += h;
      }
    }
    if (atual.length > 0) balanceadas.push(atual);

    // Garante que nenhuma página balanceada estoure fisicamente com assinatura/rodapé
    const ultB = balanceadas.length - 1;
    const limiteUltB = ultB === 0 ? alturaUtilPag1Mm : alturaUtilContMm;
    const alturaUltB = balanceadas[ultB].reduce((acc, idx) => acc + alturasItensMm[idx], 0);
    if ((alturaUltB + assinaturaMm) <= limiteUltB && balanceadas.every((p, idx) => {
      const lim = idx === 0 ? alturaUtilPag1Mm : alturaUtilContMm;
      return p.reduce((acc, itemIdx) => acc + alturasItensMm[itemIdx], 0) <= lim;
    })) {
      paginasIndices = balanceadas;
    }
  }

  const cortePagina1 = paginasIndices[0]?.length || Math.ceil(qtdOrgaos / 2);

  return {
    laudoAjustado: laudo,
    paginasIndices,
    modoPaginacao: paginacaoPref === 'equilibrar' ? 'two_page_balanced' : 'two_page_flow',
    paginacaoTexto: paginacaoPref,
    cortePagina1,
    score,
    tier: paginacaoPref === 'equilibrar' ? 'two_page_balanced' : 'two_page_flow',
    fontSizeBody: userFontBody || '10pt',
    fontSizeTitulo: userFontTitulo || '13pt',
    subtitleFontSize: '7.8pt',
    lineHeight: userLineHeight ? String(userLineHeight) : '1.32',
    paragraphSpacing: userParagraphSpacing || '3.0mm',
    marginTop: userMarginTop || '15mm',
    marginBottom: userMarginBottom || '15mm',
    marginLeft: userMarginLeft || '15mm',
    marginRight: userMarginRight || '15mm',
    marginHeaderBottom: '5px',
    paddingHeaderBottom: '5px',
    marginTitleBox: '6px 0 6px 0',
    marginSignatureTop: '8px',
    signatureMaxHeight: '44px',
    logoMaxHeight: '48px'
  };
}

/**
 * Distribui fotos de forma agnóstica respeitando a grade de colunas do modelo:
 * - modo 'preencher' (padrão): preenche o máximo por página (ex: 14 fotos em grade 2x4 -> 8 + 6).
 * - modo 'equilibrar': equilibra entre páginas mantendo todas as páginas anteriores múltiplos de `colunas`
 *   (nunca gera páginas intermediárias ímpares com buracos vazios como 7 + 7 em grade de 2 colunas).
 */
function distribuirFotosEquilibradas(fotos = [], maxPorPagina = 8, opcoes = {}) {
  if (!Array.isArray(fotos) || fotos.length === 0) return [];
  const total = fotos.length;
  const maxPag = Math.max(1, Number(maxPorPagina) || 8);
  if (total <= maxPag) return [fotos];

  const colunas = Math.max(1, Number(opcoes.colunas) || 2);
  const modo = String(opcoes.modo || 'preencher').toLowerCase();

  // Modo padrão ('preencher'): preenche até maxPorPagina em cada página na ordem
  if (modo !== 'equilibrar') {
    const paginas = [];
    for (let i = 0; i < total; i += maxPag) {
      paginas.push(fotos.slice(i, i + maxPag));
    }
    return paginas;
  }

  // Modo 'equilibrar' alinhado por linhas completas (múltiplo de colunas em páginas não-finais)
  const numPaginas = Math.ceil(total / maxPag);
  const maxLinhasPorPag = Math.max(1, Math.floor(maxPag / colunas));
  const totalLinhasCompletas = Math.floor(total / colunas);
  const sobraImpar = total % colunas;

  const linhasPorPag = [];
  const baseLinhas = Math.floor(totalLinhasCompletas / numPaginas);
  let restoLinhas = totalLinhasCompletas % numPaginas;

  for (let p = 0; p < numPaginas; p++) {
    let l = baseLinhas + (restoLinhas > 0 ? 1 : 0);
    if (restoLinhas > 0) restoLinhas--;
    linhasPorPag.push(Math.min(maxLinhasPorPag, l));
  }

  // Redistribui caso algum limite tenha truncado linhas
  let somaLinhas = linhasPorPag.reduce((a, b) => a + b, 0);
  for (let p = 0; p < numPaginas && somaLinhas < totalLinhasCompletas; p++) {
    while (linhasPorPag[p] < maxLinhasPorPag && somaLinhas < totalLinhasCompletas) {
      linhasPorPag[p]++;
      somaLinhas++;
    }
  }

  const paginas = [];
  let offset = 0;
  for (let p = 0; p < numPaginas; p++) {
    const ehUltima = p === numPaginas - 1;
    let qtd = linhasPorPag[p] * colunas + (ehUltima ? sobraImpar : 0);
    if (ehUltima) qtd = total - offset;
    if (qtd > 0) {
      paginas.push(fotos.slice(offset, offset + qtd));
      offset += qtd;
    }
  }
  return paginas;
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
  const crmvMedico = opcoes.crmvMedico || perfilLaudo?.crmvDetectado || usuario.crmv || '';

  // Logotipo: Se o usuário tem perfil customizado e NÃO tem logoUrl própria, NÃO usa o logo UPA PET!
  let logoBase64 = '';
  let logoMime = 'image/png';

  const logoCandidato = resolverCaminhoArquivo(usuario.logoUrl) ||
    resolverCaminhoArquivo(perfilLaudo?.templateVisual?.headerLogoUrl) ||
    resolverCaminhoArquivo(template?.headerLogoUrl) ||
    resolverCaminhoArquivo(templateVisualBruto?.headerLogoUrl) ||
    null;

  if (logoCandidato && fs.existsSync(logoCandidato)) {
    logoBase64 = fs.readFileSync(logoCandidato).toString('base64');
    logoMime = path.extname(logoCandidato).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
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
  const assinaturaCandidato = resolverCaminhoArquivo(usuario.assinaturaUrl) ||
    resolverCaminhoArquivo(perfilLaudo?.templateVisual?.assinaturaUrl) ||
    resolverCaminhoArquivo(template?.assinaturaUrl) ||
    null;

  if (assinaturaCandidato && fs.existsSync(assinaturaCandidato)) {
    const assExt = path.extname(assinaturaCandidato).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const assBase64 = fs.readFileSync(assinaturaCandidato).toString('base64');
    assinaturaImgHtml = `<img src="data:${assExt};base64,${assBase64}" style="max-height: 44px; display: inline-block; margin-bottom: 2px;" alt="Assinatura"><br>`;
  }

  const autoFit = calcularAutoFitLaudoTextual(laudoArray, template, opcoes);
  const laudoProcessado = autoFit.laudoAjustado;

  const cabecalhoHtml = renderizarCabecalho(template, clinicaNome, logoBase64, logoMime);
  const dadosPacienteHtml = renderizarDadosPaciente(template, dadosPaciente);
  const tituloHtml = renderizarTitulo(template);
  const { corpoHtml, conclusaoHtml } = renderizarAchadosOrgaos(template, laudoProcessado, autoFit);
  const rodapeHtml = renderizarRodape(template, nomeMedico, crmvMedico, assinaturaImgHtml);

  // Paginação equilibrada de imagens (máximo 8 por folha sem páginas com 1 foto órfã)
  const paginasImagens = distribuirFotosEquilibradas(imagensPaths, 8);

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
      font-size: ${autoFit.fontSizeBody};
      line-height: ${autoFit.lineHeight};
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
      padding: ${autoFit.marginTop} ${autoFit.marginRight} ${autoFit.marginBottom} ${autoFit.marginLeft};
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
    }
    @media print {
      body { background: transparent; }
      .page-container {
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: ${autoFit.marginTop} ${autoFit.marginRight} ${autoFit.marginBottom} ${autoFit.marginLeft} !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
    }
    .logo-img {
      max-width: 140px;
      max-height: ${autoFit.logoMaxHeight};
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
      font-size: ${autoFit.fontSizeBody};
      line-height: ${autoFit.lineHeight};
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
  TEMPLATE_VISUAL_PADRAO,
  calcularAutoFitLaudoTextual,
  normalizarOrgaosCanonica,
  distribuirFotosEquilibradas
};

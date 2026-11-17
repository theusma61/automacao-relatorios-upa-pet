const fs = require('fs');
const path = require('path');
const os = require('os');
const { gerarDocxLaudo } = require('./gerar_docx');
const { compilarPDF } = require('./compilador_pdf');
const { obterLayout } = require('./gerenciador_layout');
const { obterPerfilLaudo } = require('./gerenciador_perfil_laudo');
const { construirHtmlLaudo } = require('./renderizador_layout_laudo');

const assetsDir = path.join(__dirname, 'assets');
const logoPadraoPath = fs.existsSync(path.join(assetsDir, 'logo_upa_pet_oficial.png'))
  ? path.join(assetsDir, 'logo_upa_pet_oficial.png')
  : path.join(assetsDir, 'logo_upa_pet.jpg');

async function gerarDocumentosExame(dadosPaciente, laudoArray, imagensPaths, pastaSaida, customLayout = null, opcoes = {}) {
  const usuario = opcoes.usuario || {};

  let perfilLaudo = opcoes.perfilLaudo || null;
  if (!perfilLaudo && usuario?.id) {
    try {
      perfilLaudo = await obterPerfilLaudo(usuario.id);
    } catch (_) {}
  }

  const layout = customLayout || await obterLayout(usuario.id || null);
  const nomeSanitizado = (dadosPaciente.nome || 'Paciente').replace(/[^a-zA-Z0-9_-]/g, '_');

  const nomeMedico = opcoes.nomeMedico || perfilLaudo?.nomeDetectado || usuario.nome || 'Camila Bastos';
  const crmvMedico = opcoes.crmvMedico || perfilLaudo?.crmvDetectado || usuario.crmv || 'CRMV/MG: 22904';
  const clinicaNome = opcoes.clinicaNome || perfilLaudo?.clinicaDetectada || usuario.nomeClinica || 'UPA PET';

  // Se o usuário tem logotipo próprio configurado, usa-o.
  // Se NÃO tem logo mas possui um PerfilLaudo customizado ativo, NÃO usa o logotipo da UPA PET!
  // Apenas se for usuário padrão (sem perfil customizado) usa o logo padrão UPA PET.
  let caminhoLogoEfetivo = null;
  if (usuario.logoUrl && fs.existsSync(usuario.logoUrl)) {
    caminhoLogoEfetivo = usuario.logoUrl;
  } else if (!perfilLaudo || !perfilLaudo.ativo) {
    caminhoLogoEfetivo = logoPadraoPath;
  }

  const html = construirHtmlLaudo(dadosPaciente, laudoArray, imagensPaths, {
    usuario,
    perfilLaudo,
    customLayout: layout,
    nomeMedico,
    crmvMedico,
    clinicaNome
  });

  const caminhoHtmlTemp = path.join(os.tmpdir(), `laudo_temp_${Date.now()}_${nomeSanitizado}.html`);
  const caminhoPdf = path.join(pastaSaida, `Laudo_${nomeSanitizado}.pdf`);
  const caminhoDocx = path.join(pastaSaida, `Laudo_${nomeSanitizado}.docx`);

  fs.writeFileSync(caminhoHtmlTemp, html, 'utf8');
  await compilarPDF(caminhoHtmlTemp, caminhoPdf);

  try {
    fs.unlinkSync(caminhoHtmlTemp);
  } catch (e) {}

  const caminhoHtmlAntigo = path.join(pastaSaida, `Laudo_${nomeSanitizado}.html`);
  if (fs.existsSync(caminhoHtmlAntigo)) {
    try {
      fs.unlinkSync(caminhoHtmlAntigo);
    } catch (e) {}
  }

  const templateVisual = perfilLaudo?.templateVisual || {};

  await gerarDocxLaudo(dadosPaciente, laudoArray, caminhoDocx, caminhoLogoEfetivo, imagensPaths, layout, {
    usuario,
    nomeMedico,
    crmvMedico,
    clinicaNome,
    perfilLaudo,
    templateVisual,
    assinaturaPath: usuario.assinaturaUrl || null
  });

  return { caminhoPdf, caminhoDocx };
}

module.exports = { gerarDocumentosExame };

/**
 * Telemetria Silenciosa de Edições Clínicas — Vetaro Studio
 *
 * Compara o laudo editado pelo médico veterinário contra o laudo original gerado pela IA
 * (1 registro consolidado por jobId + órgão), medindo quais órgãos são mais corrigidos
 * e identificando casos de "falso normal" (IA disse normal, veterinário acrescentou alteração/diagDif).
 */

const { prisma } = require('./db');

function normalizarOrgaoChave(nome) {
  return String(nome || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function normalizarTextoComparacao(str) {
  return String(str || '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Heurística clínica para detectar se o texto original da IA indicava normalidade.
 */
function textoIndicaNormalidade(texto, diagDif) {
  if (normalizarTextoComparacao(diagDif).length > 0) return false;
  const t = normalizarTextoComparacao(texto).toLowerCase();
  if (!t) return true;
  const temSinalPatologico = /(espessad|aumentad|diminu[ií]d|heterog[eê]ne|hiperecogen|hipoecogen|n[oó]dulo|massa|cisto|c[aá]lculo|lit[ií]ase|sediment|lama\s+biliar|mucocele|hidronefrose|pielectasia|dilata[çc][aã]o|perda\s+da\s+diferencia|efus[aã]o|l[ií]quido\s+livre\s+(em|presente|discret|moderad|acentuad)|ultrapassando|piometra|mucometra|hiperplasia|linfonodomegalia|pancreatite|colangite|colecistite|cistite|gastrite|enterite|duodenite|nefropatia|hepatopatia|esplenomegalia)/i.test(t);
  return !temSinalPatologico;
}

/**
 * Calcula o diff estruturado entre o laudo original da IA e o laudo editado pelo médico.
 */
function calcularDiffLaudoIA(laudoOriginalIA = [], laudoEditado = []) {
  const mapaOrig = new Map();
  (Array.isArray(laudoOriginalIA) ? laudoOriginalIA : []).forEach((item) => {
    const k = normalizarOrgaoChave(item?.orgao);
    if (k) mapaOrig.set(k, item);
  });

  const mapaEdit = new Map();
  (Array.isArray(laudoEditado) ? laudoEditado : []).forEach((item) => {
    const k = normalizarOrgaoChave(item?.orgao);
    if (k) mapaEdit.set(k, item);
  });

  const diffs = [];

  for (const [orgao, editItem] of mapaEdit.entries()) {
    const origItem = mapaOrig.get(orgao);
    const txtEdit = normalizarTextoComparacao(editItem?.texto);
    const diagEdit = normalizarTextoComparacao(editItem?.diagDif);

    if (!origItem) {
      diffs.push({
        orgao,
        tipoEdicao: 'orgao_adicionado',
        iaDisseNormal: true,
        textoAntes: null,
        textoDepois: txtEdit || null,
        diagDifAntes: null,
        diagDifDepois: diagEdit || null
      });
      continue;
    }

    const txtOrig = normalizarTextoComparacao(origItem?.texto);
    const diagOrig = normalizarTextoComparacao(origItem?.diagDif);
    const mudouTexto = txtOrig !== txtEdit;
    const mudouDiag = diagOrig !== diagEdit;

    if (!mudouTexto && !mudouDiag) continue;

    let tipoEdicao = 'texto_alterado';
    if (!diagOrig && diagEdit) tipoEdicao = 'diag_dif_adicionado';
    else if (diagOrig && !diagEdit) tipoEdicao = 'diag_dif_removido';
    else if (mudouDiag) tipoEdicao = 'diag_dif_alterado';

    const iaDisseNormal =
      textoIndicaNormalidade(txtOrig, diagOrig) &&
      !textoIndicaNormalidade(txtEdit, diagEdit);

    diffs.push({
      orgao,
      tipoEdicao,
      iaDisseNormal,
      textoAntes: txtOrig || null,
      textoDepois: txtEdit || null,
      diagDifAntes: diagOrig || null,
      diagDifDepois: diagEdit || null
    });
  }

  for (const [orgao, origItem] of mapaOrig.entries()) {
    if (!mapaEdit.has(orgao)) {
      diffs.push({
        orgao,
        tipoEdicao: 'orgao_removido',
        iaDisseNormal: false,
        textoAntes: normalizarTextoComparacao(origItem?.texto) || null,
        textoDepois: null,
        diagDifAntes: normalizarTextoComparacao(origItem?.diagDif) || null,
        diagDifDepois: null
      });
    }
  }

  return diffs;
}

/**
 * Persiste silenciosamente o diff consolidado por (jobId, orgao) sem bloquear a resposta HTTP.
 */
async function registrarTelemetriaEdicao({
  jobId,
  exameId = null,
  usuarioId,
  laudoOriginalIA,
  laudoEditado
}) {
  if (!jobId || !usuarioId || !Array.isArray(laudoOriginalIA) || laudoOriginalIA.length === 0) {
    return;
  }

  const diffs = calcularDiffLaudoIA(laudoOriginalIA, laudoEditado);
  const orgaosEditadosSet = new Set(diffs.map((d) => d.orgao));

  // Remove eventuais registros de órgãos que o usuário reverteu para o texto original da IA
  await prisma.telemetriaEdicaoLaudo.deleteMany({
    where: {
      jobId,
      ...(orgaosEditadosSet.size > 0
        ? { orgao: { notIn: Array.from(orgaosEditadosSet) } }
        : {})
    }
  });

  for (const d of diffs) {
    await prisma.telemetriaEdicaoLaudo.upsert({
      where: {
        jobId_orgao: {
          jobId,
          orgao: d.orgao
        }
      },
      update: {
        tipoEdicao: d.tipoEdicao,
        iaDisseNormal: d.iaDisseNormal,
        textoAntes: d.textoAntes,
        textoDepois: d.textoDepois,
        diagDifAntes: d.diagDifAntes,
        diagDifDepois: d.diagDifDepois
      },
      create: {
        jobId,
        exameId,
        usuarioId,
        orgao: d.orgao,
        tipoEdicao: d.tipoEdicao,
        iaDisseNormal: d.iaDisseNormal,
        textoAntes: d.textoAntes,
        textoDepois: d.textoDepois,
        diagDifAntes: d.diagDifAntes,
        diagDifDepois: d.diagDifDepois
      }
    });
  }
}

/**
 * Gera o ranking consolidado dos órgãos mais editados e falsos normais para calibragem clínica.
 */
async function obterRankingTelemetriaEdicoes(dias = 30) {
  const diasNum = Math.max(1, Math.min(365, parseInt(dias, 10) || 30));
  const desde = new Date(Date.now() - diasNum * 24 * 60 * 60 * 1000);

  const registros = await prisma.telemetriaEdicaoLaudo.findMany({
    where: { criadoEm: { gte: desde } },
    orderBy: { criadoEm: 'desc' }
  });

  const porOrgao = new Map();
  const jobsUnicos = new Set();
  let totalFalsosNormais = 0;

  for (const r of registros) {
    jobsUnicos.add(r.jobId);
    if (r.iaDisseNormal) totalFalsosNormais++;

    if (!porOrgao.has(r.orgao)) {
      porOrgao.set(r.orgao, {
        orgao: r.orgao,
        totalEdicoes: 0,
        falsosNormais: 0,
        diagDifAdicionados: 0
      });
    }
    const agg = porOrgao.get(r.orgao);
    agg.totalEdicoes++;
    if (r.iaDisseNormal) agg.falsosNormais++;
    if (r.tipoEdicao === 'diag_dif_adicionado') agg.diagDifAdicionados++;
  }

  const rankingOrgaos = Array.from(porOrgao.values())
    .map((item) => ({
      ...item,
      taxaFalsoNormalPct: item.totalEdicoes > 0
        ? Number(((item.falsosNormais / item.totalEdicoes) * 100).toFixed(1))
        : 0
    }))
    .sort((a, b) => b.falsosNormais - a.falsosNormais || b.totalEdicoes - a.totalEdicoes);

  return {
    periodoDias: diasNum,
    totalExamesEditados: jobsUnicos.size,
    totalOrgaosEditados: registros.length,
    totalFalsosNormais,
    rankingOrgaos,
    ultimasEdicoes: registros.slice(0, 20).map((r) => ({
      id: r.id,
      jobId: r.jobId,
      orgao: r.orgao,
      tipoEdicao: r.tipoEdicao,
      iaDisseNormal: r.iaDisseNormal,
      textoAntes: r.textoAntes,
      textoDepois: r.textoDepois,
      diagDifAntes: r.diagDifAntes,
      diagDifDepois: r.diagDifDepois,
      criadoEm: r.criadoEm
    }))
  };
}

module.exports = {
  calcularDiffLaudoIA,
  textoIndicaNormalidade,
  registrarTelemetriaEdicao,
  obterRankingTelemetriaEdicoes
};

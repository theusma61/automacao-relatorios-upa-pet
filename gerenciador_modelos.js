/**
 * Gerenciador de modelos cirúrgicos — Camada PostgreSQL / Prisma Multi-Tenant
 */

const fs = require('fs');
const path = require('path');
const { prisma } = require('./db');

function sanitizarId(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizarSinonimos(entrada) {
  if (Array.isArray(entrada)) {
    return entrada.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof entrada === 'string') {
    try {
      const parsed = JSON.parse(entrada);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch (_) {}
    return entrada.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function formatarModelo(m) {
  if (!m) return null;
  return {
    id: m.id,
    nome: m.nome,
    sinonimos: Array.isArray(m.sinonimos) ? m.sinonimos : normalizarSinonimos(m.sinonimos),
    procedimento: m.procedimento,
    diagnosticoPreCirurgico: m.diagnosticoPreCirurgico || '',
    descricaoProcedimento: m.descricaoProcedimento,
    evolucaoConsideracoes: m.evolucaoConsideracoes || '',
    isGlobal: Boolean(m.isGlobal),
    usuarioId: m.usuarioId || null
  };
}

async function carregarModelosCirurgicos(usuarioId = null) {
  const rows = await prisma.modeloCirurgico.findMany({
    where: {
      OR: [
        { isGlobal: true },
        ...(usuarioId ? [{ usuarioId: String(usuarioId) }] : [])
      ]
    },
    orderBy: { nome: 'asc' }
  });
  return rows.map(formatarModelo).filter(Boolean);
}

async function obterModeloPorId(id, usuarioId = null) {
  if (!id) return null;
  const row = await prisma.modeloCirurgico.findFirst({
    where: {
      id: String(id),
      OR: [
        { isGlobal: true },
        ...(usuarioId ? [{ usuarioId: String(usuarioId) }] : [])
      ]
    }
  });
  return formatarModelo(row);
}

async function salvarOuCriarModelo(dados, usuario = null) {
  if (!dados || typeof dados !== 'object') {
    throw new Error('Dados inválidos para o modelo cirúrgico.');
  }

  const nome = (dados.nome || '').trim();
  const procedimento = (dados.procedimento || nome).trim();
  const descricaoProcedimento = (dados.descricaoProcedimento || '').trim();
  const evolucaoConsideracoes = (dados.evolucaoConsideracoes || '').trim();
  const diagnosticoPreCirurgico = (dados.diagnosticoPreCirurgico || '').trim();

  if (!nome) {
    throw new Error('O nome do modelo cirúrgico é obrigatório.');
  }
  if (!descricaoProcedimento) {
    throw new Error('A descrição da técnica cirúrgica padronizada é obrigatória.');
  }

  const isAdmin = !usuario || usuario.role === 'admin';
  const querGlobal = isAdmin && (dados.isGlobal !== false);
  const slugBase = sanitizarId(dados.id || nome) || `modelo_${Date.now()}`;

  let idFinal = slugBase;
  if (!querGlobal && usuario && usuario.id) {
    const prefixo = `${usuario.id}__`;
    idFinal = slugBase.startsWith(prefixo) ? slugBase : `${prefixo}${slugBase}`;
  }

  const existente = await prisma.modeloCirurgico.findUnique({ where: { id: idFinal } });

  if (existente && existente.isGlobal && !isAdmin) {
    throw new Error('Modelos institucionais da plataforma só podem ser alterados por administradores. Utilize a opção "Duplicar para meu perfil".');
  }
  if (existente && !existente.isGlobal && usuario && existente.usuarioId !== usuario.id && !isAdmin) {
    throw new Error('Você não tem permissão para editar um modelo privado de outro profissional.');
  }

  const sinonimos = normalizarSinonimos(dados.sinonimos);

  const salvo = await prisma.modeloCirurgico.upsert({
    where: { id: idFinal },
    update: {
      nome,
      sinonimos,
      procedimento,
      diagnosticoPreCirurgico,
      descricaoProcedimento,
      evolucaoConsideracoes
    },
    create: {
      id: idFinal,
      nome,
      sinonimos,
      procedimento,
      diagnosticoPreCirurgico,
      descricaoProcedimento,
      evolucaoConsideracoes,
      isGlobal: querGlobal,
      usuarioId: querGlobal ? null : (usuario?.id || null)
    }
  });

  return formatarModelo(salvo);
}

async function clonarModeloParaUsuario(modeloId, usuario) {
  if (!usuario || !usuario.id) {
    throw new Error('Usuário autenticado é obrigatório para clonar um modelo.');
  }
  const original = await prisma.modeloCirurgico.findUnique({
    where: { id: String(modeloId) }
  });
  if (!original) {
    throw new Error('Modelo original não encontrado.');
  }

  const slugBase = sanitizarId(original.nome);
  const novoId = `${usuario.id}__${slugBase}_${Date.now().toString(36)}`;

  const criado = await prisma.modeloCirurgico.create({
    data: {
      id: novoId,
      nome: `${original.nome} (Personalizado)`,
      sinonimos: Array.isArray(original.sinonimos) ? original.sinonimos : [],
      procedimento: original.procedimento,
      diagnosticoPreCirurgico: original.diagnosticoPreCirurgico || '',
      descricaoProcedimento: original.descricaoProcedimento,
      evolucaoConsideracoes: original.evolucaoConsideracoes || '',
      isGlobal: false,
      usuarioId: String(usuario.id)
    }
  });

  return formatarModelo(criado);
}

async function excluirModelo(id, usuario = null) {
  if (!id) throw new Error('ID do modelo não fornecido.');
  const existente = await prisma.modeloCirurgico.findUnique({
    where: { id: String(id) }
  });
  if (!existente) return false;

  const isAdmin = !usuario || usuario.role === 'admin';
  if (existente.isGlobal && !isAdmin) {
    throw new Error('Apenas administradores podem excluir modelos institucionais.');
  }
  if (!existente.isGlobal && usuario && existente.usuarioId !== usuario.id && !isAdmin) {
    throw new Error('Você não tem permissão para excluir um modelo de outro profissional.');
  }

  await prisma.modeloCirurgico.delete({ where: { id: String(id) } });
  return true;
}

async function syncModelosDoJson() {
  const pastaModelos = path.join(__dirname, 'modelos_cirurgicos');

  if (!fs.existsSync(pastaModelos)) {
    return { atualizados: 0, novos: 0, erros: ['Pasta modelos_cirurgicos não existe.'] };
  }

  const arquivos = fs.readdirSync(pastaModelos).filter((f) => f.endsWith('.json'));
  const antes = await prisma.modeloCirurgico.count();
  let erros = 0;
  const mensagensErro = [];

  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(
        fs.readFileSync(path.join(pastaModelos, arq), 'utf8')
      );
      const id = String(conteudo.id || arq.replace('.json', '')).toLowerCase();
      const sinonimos = normalizarSinonimos(conteudo.sinonimos);

      await prisma.modeloCirurgico.upsert({
        where: { id },
        update: {
          nome: conteudo.nome || '',
          sinonimos,
          procedimento: conteudo.procedimento || conteudo.nome || '',
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento || '',
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true
        },
        create: {
          id,
          nome: conteudo.nome || '',
          sinonimos,
          procedimento: conteudo.procedimento || conteudo.nome || '',
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento || '',
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true,
          usuarioId: null
        }
      });
    } catch (err) {
      erros++;
      mensagensErro.push(`erro ao sincronizar ${arq}: ${err.message}`);
    }
  }

  const depois = await prisma.modeloCirurgico.count();
  const novos = Math.max(0, depois - antes);
  const atualizados = Math.max(0, arquivos.length - novos);

  return { atualizados, novos, erros: mensagensErro };
}

async function obterTextoModelosParaPrompt(usuarioId = null) {
  const modelos = await carregarModelosCirurgicos(usuarioId);
  let texto = '=== BIBLIOTECA DE MODELOS CIRÚRGICOS PADRONIZADOS ===\n\n';

  modelos.forEach((m, idx) => {
    texto += `[MODELO ${idx + 1}: ${m.nome.toUpperCase()}]\n`;
    texto += `Sinônimos / Palavras-chave: ${(m.sinonimos || []).join(', ')}\n`;
    texto += `PROCEDIMENTO: ${m.procedimento}\n`;
    texto += `DIAGNÓSTICO PRÉ-CIRÚRGICO: ${m.diagnosticoPreCirurgico}\n`;
    texto += `DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO:\n${m.descricaoProcedimento}\n`;
    texto += `EVOLUÇÃO E CONSIDERAÇÕES:\n${m.evolucaoConsideracoes}\n\n`;
    texto += `----------------------------------------------------\n\n`;
  });

  return texto;
}

async function inferirModeloPorTexto(procedimentoTexto, usuarioId = null) {
  if (!procedimentoTexto || typeof procedimentoTexto !== 'string') return null;
  const texto = procedimentoTexto.toLowerCase().trim();
  if (!texto) return null;

  const modelos = await carregarModelosCirurgicos(usuarioId);
  if (modelos.length === 0) return null;

  const modelosOrdenados = [...modelos].sort((a, b) => Number(a.isGlobal) - Number(b.isGlobal));

  const palavrasModelo = (s) => String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9à-ãâçéíóúü]+/g, ' ')
    .split(/\s+/)
    .filter((p) => p && p.length >= 2);

  const porNome = modelosOrdenados.find(
    (m) => texto === (m.nome || '').toLowerCase() || texto.includes((m.nome || '').toLowerCase())
  );
  if (porNome) return porNome;

  const textoPalavras = texto.split(/[^a-z0-9à-ãâçéíóúü\s]/g).filter((p) => p && p.length >= 2);
  const porSinonimo = modelosOrdenados.find((m) =>
    (m.sinonimos || []).some((s) =>
      s.toLowerCase().split(/\s+/).some((word) => textoPalavras.includes(word.toLowerCase()))
    )
  );
  if (porSinonimo) return porSinonimo;

  let melhor = null;
  let melhorScore = 0;
  for (const m of modelosOrdenados) {
    const palavrasProc = palavrasModelo(m.procedimento);
    const palavrasDesc = palavrasModelo(m.descricaoProcedimento);
    let score = 0;
    for (const p of textoPalavras) {
      if (palavrasProc.includes(p)) score += 3;
      else if (palavrasDesc.includes(p)) score += 1;
    }
    if (score > melhorScore) {
      melhorScore = score;
      melhor = m;
    }
  }
  return melhorScore >= 2 ? melhor : null;
}

module.exports = {
  carregarModelosCirurgicos,
  obterModeloPorId,
  salvarOuCriarModelo,
  clonarModeloParaUsuario,
  excluirModelo,
  obterTextoModelosParaPrompt,
  syncModelosDoJson,
  inferirModeloPorTexto
};

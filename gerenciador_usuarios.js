/**
 * Gerenciador de usuários e perfis médicos — Camada Prisma PostgreSQL Multi-Tenant
 */

const path = require('path');
const { prisma } = require('./db');
const { obterOuCriarAssinatura } = require('./gerenciador_assinatura');

const ROLES = {
  admin: {
    nome: 'Administrador(a)',
    permissoes: ['gerar_ultrassom', 'gerar_cirurgia', 'gerenciar_usuarios', 'visualizar_relatorios']
  },
  veterinario: {
    nome: 'Médico(a) Veterinário(a)',
    permissoes: ['gerar_ultrassom', 'gerar_cirurgia', 'visualizar_relatorios']
  },
  assistente: {
    nome: 'Assistente / Recepção',
    permissoes: ['visualizar_relatorios']
  },
  pendente: {
    nome: 'Acesso Pendente / Bloqueado',
    permissoes: []
  }
};

function emailsDeEnv(prefixo) {
  return (process.env[`${prefixo}_EMAILS`] || '')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Normaliza caminhos de upload salvos no banco (ex: caminho físico absoluto no Docker ou Windows)
 * para a URL pública relativa `/uploads/...` para uso consistente no frontend e backend.
 */
function normalizarUrlUploadPublica(valor) {
  if (!valor || typeof valor !== 'string') return null;
  const limpo = valor.trim().replace(/\\/g, '/');
  if (!limpo) return null;
  if (/^https?:\/\//i.test(limpo) || /^data:image\//i.test(limpo)) return limpo;
  const semApp = limpo.replace(/^\/app\//, '/');
  if (semApp.startsWith('/uploads/')) return semApp;
  const idxUploads = semApp.toLowerCase().lastIndexOf('/uploads/');
  if (idxUploads !== -1) {
    return semApp.slice(idxUploads);
  }
  if (semApp.toLowerCase().startsWith('uploads/')) {
    return '/' + semApp;
  }
  const base = path.basename(semApp);
  if (/^logo_/i.test(base)) return `/uploads/logos/${base}`;
  if (/^assinatura_/i.test(base)) return `/uploads/assinaturas/${base}`;
  return semApp.startsWith('/') ? semApp : `/${semApp}`;
}

function perfilParaResposta(usuario) {
  const roleDef = ROLES[usuario.role] || ROLES.pendente;
  return {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    foto: usuario.foto || null,
    role: usuario.role,
    roleDescricao: roleDef.nome,
    permissoes: roleDef.permissoes,
    podeGerarLaudos: roleDef.permissoes.includes('gerar_ultrassom'),
    podeGerarCirurgia: roleDef.permissoes.includes('gerar_cirurgia'),
    crmv: usuario.crmv || null,
    clinicaId: usuario.clinicaId || null,
    nomeClinica: (/upa\s*pet/i.test(usuario.nomeClinica || '') ? 'Vetaro' : (usuario.nomeClinica || (usuario.clinica && usuario.clinica.nome) || 'Vetaro')),
    logoUrl: normalizarUrlUploadPublica(usuario.logoUrl),
    assinaturaUrl: normalizarUrlUploadPublica(usuario.assinaturaUrl),
    temaPreferencia: usuario.temaPreferencia || 'system',
    plano: usuario.assinatura ? usuario.assinatura.plano : 'GRATUITO'
  };
}

async function obterPerfilUsuario(email, nome, foto = null) {
  const emailNorm = (email || '').toLowerCase().trim();
  if (!emailNorm) {
    throw new Error('E-mail do usuário não informado.');
  }
  const nomeLimpo = (nome || '').trim() || emailNorm.split('@')[0];
  const adminEmails = emailsDeEnv('ADMIN');
  const vetEmails = emailsDeEnv('VET');

  let usuario = await prisma.usuario.findUnique({
    where: { email: emailNorm },
    include: { clinica: true, assinatura: true }
  });

  if (!usuario) {
    let roleInicial = 'pendente';
    if (adminEmails.includes(emailNorm)) roleInicial = 'admin';
    else if (vetEmails.includes(emailNorm)) roleInicial = 'veterinario';

    usuario = await prisma.usuario.create({
      data: {
        email: emailNorm,
        nome: nomeLimpo,
        role: roleInicial,
        foto: foto || null,
        crmv: emailNorm.includes('camila') ? 'CRMV/MG: 22904' : null,
        nomeClinica: 'Vetaro'
      },
      include: { clinica: true, assinatura: true }
    });

    // Cria automaticamente o plano GRATUITO (10 laudos de cortesia) para o novo usuário
    try {
      const sub = await obterOuCriarAssinatura(usuario.id);
      usuario.assinatura = sub;
    } catch (_) {}
  } else {
    const dataUpdate = {};
    if (nome && usuario.nome !== nomeLimpo) dataUpdate.nome = nomeLimpo;
    if (foto && usuario.foto !== foto) dataUpdate.foto = foto;
    if (adminEmails.includes(emailNorm) && usuario.role !== 'admin') {
      dataUpdate.role = 'admin';
    }

    if (Object.keys(dataUpdate).length > 0) {
      usuario = await prisma.usuario.update({
        where: { email: emailNorm },
        data: dataUpdate,
        include: { clinica: true, assinatura: true }
      });
    }
  }

  return perfilParaResposta(usuario);
}

function temPermissao(usuario, permissao) {
  if (!usuario) return false;
  if (usuario.role === 'admin') return true;
  const roleDef = ROLES[usuario.role];
  return Boolean(roleDef && roleDef.permissoes.includes(permissao));
}

async function listarUsuarios() {
  const lista = await prisma.usuario.findMany({
    orderBy: { email: 'asc' },
    include: { clinica: true, assinatura: true }
  });
  return lista.map(perfilParaResposta);
}

async function atualizarCargoUsuario(email, novoRole) {
  if (!ROLES[novoRole]) throw new Error(`Cargo inválido: ${novoRole}`);
  const emailNorm = (email || '').toLowerCase().trim();
  const existente = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (!existente) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  const atualizado = await prisma.usuario.update({
    where: { email: emailNorm },
    data: { role: novoRole },
    include: { clinica: true, assinatura: true }
  });

  return perfilParaResposta(atualizado);
}

async function atualizarPlanoUsuario(email, novoPlano, ciclo = 'mensal') {
  const emailNorm = (email || '').toLowerCase().trim();
  const usuario = await prisma.usuario.findUnique({
    where: { email: emailNorm },
    include: { clinica: true, assinatura: true }
  });
  if (!usuario) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  const { atualizarPlanoAssinatura } = require('./gerenciador_assinatura');
  await atualizarPlanoAssinatura(usuario.id, novoPlano, ciclo);

  const atualizado = await prisma.usuario.findUnique({
    where: { email: emailNorm },
    include: { clinica: true, assinatura: true }
  });
  return perfilParaResposta(atualizado);
}

async function obterTemaUsuario(email) {
  const emailNorm = (email || '').toLowerCase().trim();
  if (!emailNorm) return 'system';
  const row = await prisma.usuario.findUnique({
    where: { email: emailNorm },
    select: { temaPreferencia: true }
  });
  return row?.temaPreferencia || 'system';
}

async function atualizarTemaUsuario(email, tema) {
  const emailNorm = (email || '').toLowerCase().trim();
  const existente = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (!existente) {
    throw new Error('Usuário não encontrado.');
  }
  const atualizado = await prisma.usuario.update({
    where: { email: emailNorm },
    data: { temaPreferencia: tema },
    select: { temaPreferencia: true }
  });
  return atualizado.temaPreferencia;
}

async function atualizarPerfilProfissional(usuarioId, dados = {}) {
  if (!usuarioId) throw new Error('ID do usuário não informado.');
  const dataUpdate = {};
  if (dados.nome !== undefined && String(dados.nome).trim()) {
    dataUpdate.nome = String(dados.nome).trim();
  }
  if (dados.crmv !== undefined) {
    dataUpdate.crmv = String(dados.crmv).trim() || null;
  }
  if (dados.nomeClinica !== undefined) {
    dataUpdate.nomeClinica = String(dados.nomeClinica).trim() || null;
  }
  if (dados.logoUrl !== undefined) {
    dataUpdate.logoUrl = normalizarUrlUploadPublica(dados.logoUrl);
  }
  if (dados.assinaturaUrl !== undefined) {
    dataUpdate.assinaturaUrl = normalizarUrlUploadPublica(dados.assinaturaUrl);
  }

  const atualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: dataUpdate,
    include: { clinica: true, assinatura: true }
  });

  return perfilParaResposta(atualizado);
}

module.exports = {
  ROLES,
  normalizarUrlUploadPublica,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario,
  atualizarPlanoUsuario,
  obterTemaUsuario,
  atualizarTemaUsuario,
  atualizarPerfilProfissional
};

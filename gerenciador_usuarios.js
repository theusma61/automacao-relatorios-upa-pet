/**
 * Gerenciador de usuários — camada de acesso ao banco SQLite
 * (migrado de usuarios.json; assinaturas mantidas por compatibilidade
 *  com servidor_web.js — ver docs/AI_AGENT_GUIDELINES.md §2.3)
 */

const { getDatabase } = require('./db');

// Papéis e suas permissões associadas (mesmo mapa de sempre)
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

function perfilParaResposta(usuario) {
  const roleDef = ROLES[usuario.role] || ROLES.pendente;
  return {
    email: usuario.email,
    nome: usuario.nome,
    foto: usuario.foto || null,
    role: usuario.role,
    roleDescricao: roleDef.nome,
    permissoes: roleDef.permissoes,
    podeGerarLaudos: roleDef.permissoes.includes('gerar_ultrassom'),
    podeGerarCirurgia: roleDef.permissoes.includes('gerar_cirurgia'),
    crmv: usuario.crmv || null
  };
}

/**
 * Obtém ou registra o usuário no primeiro login via Google SSO
 * @param {string} email — e-mail do token do Google
 * @param {string} nome  — nome completo (pode ser null/undefined)
 * @param {string} [foto] — URL da foto de perfil
 * @returns {{email, nome, foto, role, roleDescricao, permissoes, podeGerarLaudos, podeGerarCirurgia, crmv}}
 */
function obterPerfilUsuario(email, nome, foto = null) {
  const db = getDatabase();
  const emailNorm = (email || '').toLowerCase().trim();
  if (!emailNorm) {
    throw new Error('E-mail do usuário não informado.');
  }
  nome = (nome || '').trim() || emailNorm.split('@')[0];
  foto = foto || null;
  const now = new Date().toISOString();

  const select = db.prepare('SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE');
  let usuario = select.get(emailNorm);

  const adminEmails = emailsDeEnv('ADMIN');
  const vetEmails = emailsDeEnv('VET');

  if (!usuario) {
    let roleInicial = 'pendente';
    if (adminEmails.includes(emailNorm)) roleInicial = 'admin';
    else if (vetEmails.includes(emailNorm)) roleInicial = 'veterinario';

    db.prepare(`
      INSERT INTO usuarios (email, nome, role, foto, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(emailNorm, nome, roleInicial, foto, now, now);
    usuario = select.get(emailNorm);
  } else {
    // Atualiza nome ou foto se tiver mudado
    let alterou = false;
    if (nome && usuario.nome !== nome) alterou = true;
    if (foto && usuario.foto !== foto) alterou = true;
    if (adminEmails.includes(emailNorm) && usuario.role !== 'admin') alterou = true;

    if (alterou) {
      const setParts = ['atualizado_em = ?'];
      const params = [now];
      if (nome && usuario.nome !== nome) { setParts.push('nome = ?'); params.push(nome); }
      if (foto && usuario.foto !== foto) { setParts.push('foto = ?'); params.push(foto); }
      if (adminEmails.includes(emailNorm) && usuario.role !== 'admin') {
        setParts.push('role = ?');
        params.push('admin');
      }
      db.prepare(`UPDATE usuarios SET ${setParts.join(', ')} WHERE email = ? COLLATE NOCASE`)
        .run(...params, emailNorm);
      usuario = select.get(emailNorm);
    }
  }

  return perfilParaResposta(usuario);
}

/**
 * Verifica se um usuário possui uma permissão específica
 */
function temPermissao(usuario, permissao) {
  if (!usuario) return false;
  if (usuario.role === 'admin') return true;
  const roleDef = ROLES[usuario.role];
  return roleDef && roleDef.permissoes.includes(permissao);
}

/**
 * Lista todos os usuários cadastrados (ordem estável por e-mail)
 */
function listarUsuarios() {
  const db = getDatabase();
  return db.prepare(`
    SELECT email, nome, role, crmv FROM usuarios
    ORDER BY email COLLATE NOCASE
  `)
    .all()
    .map((u) => {
      const roleDef = ROLES[u.role] || ROLES.pendente;
      return {
        email: u.email,
        nome: u.nome,
        role: u.role,
        roleDescricao: roleDef.nome,
        permissoes: roleDef.permissoes,
        crmv: u.crmv || null
      };
    });
}

/**
 * Atualiza o cargo de um usuário existente
 */
function atualizarCargoUsuario(email, novoRole) {
  if (!ROLES[novoRole]) throw new Error(`Cargo inválido: ${novoRole}`);
  const db = getDatabase();
  const emailNorm = (email || '').toLowerCase().trim();
  if (!db.prepare('SELECT 1 FROM usuarios WHERE email = ? COLLATE NOCASE').get(emailNorm)) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  db.prepare(`
    UPDATE usuarios
    SET role = ?, atualizado_em = ?
    WHERE email = ? COLLATE NOCASE
  `).run(novoRole, new Date().toISOString(), emailNorm);

  const nome = db
    .prepare('SELECT nome FROM usuarios WHERE email = ? COLLATE NOCASE')
    .get(emailNorm).nome;
  return obterPerfilUsuario(emailNorm, nome);
}

module.exports = {
  ROLES,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario
};

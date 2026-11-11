const fs = require('fs');
const path = require('path');

const USUARIOS_FILE = path.join(__dirname, 'usuarios.json');

// Papéis e suas permissões associadas
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

function carregarDadosUsuarios() {
  const padrao = {
    regrasPadrao: {
      rolePadraoNovoUsuario: 'pendente'
    },
    usuarios: [
      {
        email: 'camilabastos@upapet.com.br',
        nome: 'Dra. Camila Bastos',
        role: 'admin',
        crmv: 'CRMV/MG: 22904'
      },
      {
        email: 'matheusteteu00123@gmail.com',
        nome: 'Matheus Augusto',
        role: 'admin'
      }
    ]
  };

  if (fs.existsSync(USUARIOS_FILE)) {
    try {
      const raw = fs.readFileSync(USUARIOS_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Erro ao ler usuarios.json, usando padrão:', e.message);
    }
  }

  // Cria o arquivo inicial caso não exista
  try {
    fs.writeFileSync(USUARIOS_FILE, JSON.stringify(padrao, null, 2), 'utf8');
  } catch (_) {}

  return padrao;
}

function salvarDadosUsuarios(dados) {
  try {
    fs.writeFileSync(USUARIOS_FILE, JSON.stringify(dados, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar usuarios.json:', e.message);
  }
}

/**
 * Obtém ou registra o usuário no primeiro login via Google SSO
 */
function obterPerfilUsuario(email, nome, foto = null) {
  const emailNorm = (email || '').toLowerCase().trim();
  const dados = carregarDadosUsuarios();

  // Verifica se o email está nas variáveis de ambiente ADMIN_EMAILS
  const adminEmailsEnv = (process.env.ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  const vetEmailsEnv = (process.env.VET_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  let usuario = dados.usuarios.find(u => u.email.toLowerCase() === emailNorm);

  if (!usuario) {
    let roleInicial = dados.regrasPadrao.rolePadraoNovoUsuario || 'pendente';
    if (adminEmailsEnv.includes(emailNorm)) roleInicial = 'admin';
    else if (vetEmailsEnv.includes(emailNorm)) roleInicial = 'veterinario';

    usuario = {
      email: emailNorm,
      nome: nome || emailNorm.split('@')[0],
      foto: foto,
      role: roleInicial,
      criadoEm: new Date().toISOString()
    };

    dados.usuarios.push(usuario);
    salvarDadosUsuarios(dados);
  } else {
    // Atualiza nome ou foto se tiver mudado
    let alterou = false;
    if (nome && usuario.nome !== nome) { usuario.nome = nome; alterou = true; }
    if (foto && usuario.foto !== foto) { usuario.foto = foto; alterou = true; }
    if (adminEmailsEnv.includes(emailNorm) && usuario.role !== 'admin') {
      usuario.role = 'admin';
      alterou = true;
    }
    if (alterou) salvarDadosUsuarios(dados);
  }

  const roleDef = ROLES[usuario.role] || ROLES.pendente;

  return {
    email: usuario.email,
    nome: usuario.nome,
    foto: usuario.foto || foto,
    role: usuario.role,
    roleDescricao: roleDef.nome,
    permissoes: roleDef.permissoes,
    podeGerarLaudos: roleDef.permissoes.includes('gerar_ultrassom'),
    podeGerarCirurgia: roleDef.permissoes.includes('gerar_cirurgia'),
    crmv: usuario.crmv || null
  };
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
 * Lista todos os usuários cadastrados
 */
function listarUsuarios() {
  const dados = carregarDadosUsuarios();
  return dados.usuarios.map(u => {
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
  const dados = carregarDadosUsuarios();
  const usuario = dados.usuarios.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!usuario) throw new Error(`Usuário não encontrado: ${email}`);
  usuario.role = novoRole;
  salvarDadosUsuarios(dados);
  return obterPerfilUsuario(usuario.email, usuario.nome);
}

module.exports = {
  ROLES,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario
};

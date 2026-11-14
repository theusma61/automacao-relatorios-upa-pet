const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const { analisarExameComIA } = require('./analisador_ia');
const { gerarDocumentosExame } = require('./motor_laudo');
const { analisarCirurgiaComIA } = require('./analisador_cirurgia');
const { gerarDocumentosCirurgicos } = require('./motor_cirurgia');
const {
  carregarModelosCirurgicos,
  obterModeloPorId,
  salvarOuCriarModelo,
  excluirModelo,
  syncModelosDoJson,
  inferirModeloPorTexto
} = require('./gerenciador_modelos');
const {
  obterLayout,
  salvarLayout,
  restaurarLayoutPadrao
} = require('./gerenciador_layout');
const {
  ROLES,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario
} = require('./gerenciador_usuarios');

// Logging estruturado (pino) + validação de entradas (zod)
const { logger, requestLogger } = require('./logger');
const {
  validate,
  validateQuery,
  validateParams,
  authSchemas,
  adminSchemas,
  temaSchemas,
  modelosSchemas,
  layoutSchemas
} = require('./validation');

// Carrega configurações
const configPath = path.join(__dirname, 'config.json');
let config = { geminiApiKey: "", googleClientId: "" };
if (fs.existsSync(configPath)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch (_) {}
}

const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || config.googleClientId || '';
const JWT_SECRET = process.env.JWT_SECRET || 'upa_pet_jwt_secret_camila_bastos_2026';
const PORT = process.env.PORT || 3000;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Backup em nuvem (Google Drive) — protege os modelos criados via site contra
// perda em redeploy/restart no Render (disco efêmero). O restore do Drive
// acontece no boot, ANTES do seed, para o banco restaurado receber os dados
// padrão apenas se ainda estiver vazio.
const backupDb = require('./backup-db');
backupDb.carregarTokens();

const { executarSeed } = require('./seed');

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware global de log de requisições (requestId + latência + status)
app.use(requestLogger());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ==========================================
// BACKUP EM NUVEM (GOOGLE DRIVE)
// ==========================================

app.get('/backup/setup', (req, res) => {
  const status = backupDb.obterStatus();
  if (status.autorizado) {
    return res.json({
      status: 'already_authorized',
      pastaId: status.pastaId,
      lastUpload: status.lastUpload
    });
  }
  if (!status.configurado) {
    return res.json({
      status: 'not_configured',
      message: 'Faltam GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no serviço. Configure nas env vars do Render.'
    });
  }
  res.json({ status: 'pending', url: backupDb.obterUrlAutorizacao(req) });
});

app.get('/api/backup/callback', async (req, res) => {
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const data = await client.getToken(req.query.code);
    backupDb.salvarTokenGoogle(data);
    res.redirect('/backup/status');
  } catch (err) {
    console.error('[backup] falha no callback de autorização:', err.message);
    res.status(500).json({ error: 'Falha na autorização do Google Drive.' });
  }
});

app.get('/backup/status', (req, res) => {
  res.json(backupDb.obterStatus());
});

// Diretório de uploads temporários
const uploadDir = path.join(os.tmpdir(), 'upa_pet_uploads');
const outputDir = path.join(os.tmpdir(), 'upa_pet_outputs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const upload = multer({ storage });

// ==========================================
// MIDDLEWARES DE AUTENTICAÇÃO E PERMISSÃO
// ==========================================

function obterUsuarioSessao(req, res, next) {
  const token = req.cookies?.upa_pet_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    req.usuario = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Recarrega permissões atualizadas do usuário
    req.usuario = obterPerfilUsuario(decoded.email, decoded.nome, decoded.foto);
  } catch (err) {
    req.usuario = null;
  }
  next();
}

function exigirAutenticacao(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      error: 'Autenticação necessária. Faça login com sua conta Google para continuar.'
    });
  }
  next();
}

function exigirPermissao(permissao) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Faça login com sua conta Google para continuar.' });
    }
    if (!temPermissao(req.usuario, permissao)) {
      return res.status(403).json({
        error: `Acesso restrito: Sua conta (${req.usuario.email}) não possui permissão para gerar este documento. Apenas a Dra. Camila Bastos e veterinários autorizados podem emitir laudos e relatórios oficiais.`
      });
    }
    next();
  };
}

// Aplica a leitura de sessão em todas as rotas
app.use(obterUsuarioSessao);

// ==========================================
// ROTAS DE AUTENTICAÇÃO GOOGLE SSO E CONTROLE
// ==========================================

// Configurações públicas do SSO para o frontend
app.get('/api/auth/config', (req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
    ssoAtivo: !!GOOGLE_CLIENT_ID
  });
});

// Perfil do usuário atualmente conectado
app.get('/api/auth/me', (req, res) => {
  res.json({
    usuario: req.usuario || null
  });
});

// Endpoint que recebe o token do Google SSO (Google Identity Services)
app.post('/api/auth/google', validate(authSchemas.googleLogin, 'body'), async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Token de credencial do Google não fornecido.' });
  }

  try {
    let email, nome, foto;

    if (googleClient) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      email = payload.email;
      nome = payload.name;
      foto = payload.picture;
    } else {
      // Modo de contingência se o GOOGLE_CLIENT_ID ainda não tiver sido configurado no painel
      const decoded = jwt.decode(credential);
      if (!decoded || !decoded.email) {
        throw new Error('Não foi possível decodificar o token do Google.');
      }
      email = decoded.email;
      nome = decoded.name;
      foto = decoded.picture;
    }

    const perfil = obterPerfilUsuario(email, nome, foto);

    // Gera o token de sessão JWT
    const token = jwt.sign(
      { email: perfil.email, nome: perfil.nome, role: perfil.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Salva o cookie de sessão seguro
    res.cookie('upa_pet_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({
      sucesso: true,
      usuario: perfil
    });
  } catch (err) {
    console.error('Erro na autenticação Google SSO:', err);
    res.status(401).json({ error: 'Falha ao autenticar com o Google: ' + err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('upa_pet_token');
  res.json({ sucesso: true });
});

// Gestão de Usuários (Apenas Administrador)
app.get('/api/admin/usuarios', exigirAutenticacao, validateQuery(adminSchemas.listUsersQuery), (req, res) => {
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem gerenciar acessos.' });
  }
  res.json({ usuarios: listarUsuarios() });
});

app.post('/api/admin/usuarios/role', exigirAutenticacao, validate(adminSchemas.updateRole, 'body'), (req, res) => {
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem alterar permissões.' });
  }
  const { email, role } = req.body;
  try {
    const usuarioAtualizado = atualizarCargoUsuario(email, role);
    res.json({ sucesso: true, usuario: usuarioAtualizado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// ENDPOINTS DE PREFERÊNCIA DE TEMA (DARK MODE)
// ==========================================

// GET /api/usuario/tema — retorna tema preferido do usuário autenticado
app.get('/api/usuario/tema', exigirAutenticacao, (req, res) => {
  try {
    const { db } = require('./db');
    const stmt = db.prepare(
      'SELECT tema_preferencia FROM usuarios WHERE email = ? COLLATE NOCASE'
    );
    const row = stmt.get(req.usuario.email);
    if (!row) {
      return res.json({ sucesso: true, tema: 'system' });
    }
    res.json({ sucesso: true, tema: row.tema_preferencia });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuario/tema — salva preferência do usuário autenticado
app.post('/api/usuario/tema', exigirAutenticacao, validate(temaSchemas.updateTema, 'body'), (req, res) => {
  try {
    const { db } = require('./db');
    const { tema } = req.body;
    const stmt = db.prepare(
      `UPDATE usuarios SET tema_preferencia = ?, atualizado_em = datetime('now')
       WHERE email = ? COLLATE NOCASE`
    );
    const result = stmt.run(tema, req.usuario.email);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json({ sucesso: true, tema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check para monitoramento de uptime
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'UPA PET Automacao', uptime: process.uptime() });
});

// Download de arquivos gerados (protegido)
app.get('/downloads/:jobId/:filename', exigirAutenticacao, (req, res) => {
  const { jobId, filename } = req.params;
  const filePath = path.join(outputDir, jobId, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('Arquivo não encontrado ou já expirou.');
  }
});

// ==========================================
// ENDPOINTS DE MODELOS CIRÚRGICOS
// ==========================================

// Listar todos os modelos cirúrgicos
app.get('/api/modelos-cirurgicos', (req, res) => {
  try {
    const modelos = carregarModelosCirurgicos();
    res.json({ sucesso: true, modelos });
  } catch (err) {
    console.error('Erro ao listar modelos cirúrgicos:', err);
    res.status(500).json({ error: 'Erro ao carregar modelos: ' + err.message });
  }
});

// Obter detalhes de um modelo cirúrgico por ID
app.get('/api/modelos-cirurgicos/:id', validateParams(modelosSchemas.getModeloParams, 'params'), (req, res) => {
  try {
    const modelo = obterModeloPorId(req.params.id);
    if (!modelo) {
      return res.status(404).json({ error: 'Modelo cirúrgico não encontrado.' });
    }
    res.json({ sucesso: true, modelo });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter modelo: ' + err.message });
  }
});

// Criar ou atualizar modelo cirúrgico (autorizado para médicos veterinários e admins)
app.post('/api/modelos-cirurgicos', exigirPermissao('gerar_cirurgia'), validate(modelosSchemas.createModelo, 'body'), (req, res) => {
  try {
    const modeloSalvo = salvarOuCriarModelo(req.body);
    logger.info('Modelo cirúrgico salvo', { modelo: modeloSalvo.nome, por: req.usuario.email });
    res.json({ sucesso: true, modelo: modeloSalvo });
  } catch (err) {
    logger.error('Erro ao salvar modelo cirúrgico', { stack: err.stack, message: err.message });
    res.status(400).json({ error: err.message });
  }
});

// Excluir modelo cirúrgico (apenas administradores)
app.delete('/api/modelos-cirurgicos/:id', exigirPermissao('gerenciar_usuarios'), validateParams(modelosSchemas.deleteModeloParams, 'params'), (req, res) => {
  try {
    const excluido = excluirModelo(req.params.id);
    if (!excluido) {
      return res.status(404).json({ error: 'Modelo cirúrgico não encontrado para exclusão.' });
    }
    logger.info('Modelo cirúrgico excluído', { modeloId: req.params.id, por: req.usuario.email });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// ROTAS DE CONFIGURAÇÃO DE MODELOS E LAYOUT
// ==========================================

// Obter layout institucional atual
app.get('/api/layout-config', exigirAutenticacao, (req, res) => {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'veterinario') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e veterinários.' });
  }
  try {
    const layout = obterLayout();
    res.json({ sucesso: true, layout });
  } catch (err) {
    logger.error('Erro ao obter layout', { error: err.message });
    res.status(500).json({ error: 'Erro ao obter configurações de layout: ' + err.message });
  }
});

// Atualizar layout institucional
app.put('/api/layout-config', exigirAutenticacao, validate(layoutSchemas.updateLayout, 'body'), (req, res) => {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'veterinario') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e veterinários.' });
  }
  try {
    const layoutAtualizado = salvarLayout(req.body);
    logger.info({
      usuario: req.usuario.email,
      alteracoes: req.body,
      dataHora: new Date().toISOString()
    }, 'Configurações de layout atualizadas');
    res.json({ sucesso: true, layout: layoutAtualizado });
  } catch (err) {
    logger.error('Erro ao salvar layout', { error: err.message, stack: err.stack });
    res.status(400).json({ error: 'Erro ao salvar layout: ' + err.message });
  }
});

// Restaurar padrão institucional
app.post('/api/layout-config/reset', exigirAutenticacao, (req, res) => {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'veterinario') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e veterinários.' });
  }
  try {
    const layoutRestaurado = restaurarLayoutPadrao();
    logger.info({
      usuario: req.usuario.email,
      dataHora: new Date().toISOString()
    }, 'Configurações de layout restauradas para o padrão institucional UPA PET');
    res.json({ sucesso: true, layout: layoutRestaurado });
  } catch (err) {
    logger.error('Erro ao restaurar layout', { error: err.message });
    res.status(500).json({ error: 'Erro ao restaurar layout: ' + err.message });
  }
});

// ==========================================
// ENDPOINTS DE GERAÇÃO (PROTEGIDOS POR RBAC)
// ==========================================

// Endpoint: Processar Laudo de Ultrassom
app.post('/api/ultrassom', exigirPermissao('gerar_ultrassom'), upload.array('imagens', 25), async (req, res) => {
  if (!apiKey) {
    return res.status(400).json({ error: 'Chave da API Gemini não configurada (GEMINI_API_KEY).' });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada para o exame.' });
  }

  const jobId = `ultra_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const jobFolder = path.join(outputDir, jobId);
  fs.mkdirSync(jobFolder, { recursive: true });

  const caminhosArquivos = req.files.map(f => f.path);

  try {
    console.log(`📡 [WEB - ULTRASSOM] [Usuário: ${req.usuario.email}] Processando ${caminhosArquivos.length} imagens...`);
    const resultadoIA = await analisarExameComIA(caminhosArquivos, apiKey);

    const imagensOrdenadas = resultadoIA.caminhosOrdenados || caminhosArquivos;
    const docs = await gerarDocumentosExame(
      resultadoIA.paciente,
      resultadoIA.laudo,
      imagensOrdenadas,
      jobFolder
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);

    res.json({
      sucesso: true,
      paciente: resultadoIA.paciente,
      pdfUrl: `/downloads/${jobId}/${encodeURIComponent(pdfNome)}`,
      docxUrl: `/downloads/${jobId}/${encodeURIComponent(docxNome)}`,
      pdfNome,
      docxNome
    });
  } catch (err) {
    console.error('Erro ao processar ultrassom:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao processar laudo de ultrassom.' });
  } finally {
    caminhosArquivos.forEach(f => {
      try { fs.unlinkSync(f); } catch (_) {}
    });
  }
});

// Endpoint: Processar Relatório Cirúrgico
app.post('/api/cirurgia', exigirPermissao('gerar_cirurgia'), upload.fields([
  { name: 'documento', maxCount: 1 },
  { name: 'fotos', maxCount: 5 }
]), async (req, res) => {
  if (!apiKey) {
    return res.status(400).json({ error: 'Chave da API Gemini não configurada (GEMINI_API_KEY).' });
  }

  const docFile = req.files && req.files['documento'] ? req.files['documento'][0] : null;
  const fotoFiles = req.files && req.files['fotos'] ? req.files['fotos'] : [];

  if (!docFile && fotoFiles.length === 0) {
    return res.status(400).json({ error: 'Envie ao menos um documento (.docx, .pages, .txt, áudio) da cirurgia.' });
  }

  const jobId = `cirurg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const jobFolder = path.join(outputDir, jobId);
  fs.mkdirSync(jobFolder, { recursive: true });

  const todosArquivos = [];
  if (docFile) todosArquivos.push(docFile.path);
  const fotosCaminhos = fotoFiles.map(f => f.path);
  todosArquivos.push(...fotosCaminhos);

  try {
    console.log(`🔪 [WEB - CIRURGIA] [Usuário: ${req.usuario.email}] Analisando procedimento cirúrgico...`);
    const resultadoIA = await analisarCirurgiaComIA(todosArquivos, apiKey);

    // FASE 5 — Inferência + fallback: preenche campos vazios com o texto do modelo
    const cir = resultadoIA.cirurgia;
    const textoProcedimento = (cir.procedimento || '').trim();
    const modeloDetetado = inferirModeloPorTexto(textoProcedimento);
    if (modeloDetetado) {
      if (!cir.procedimento || cir.procedimento.length < 20) {
        cir.procedimento = modeloDetetado.procedimento;
      }
      if (!cir.diagnosticoPreCirurgico) {
        cir.diagnosticoPreCirurgico = modeloDetetado.diagnosticoPreCirurgico;
      }
      if (!cir.descricaoProcedimento) {
        cir.descricaoProcedimento = modeloDetetado.descricaoProcedimento;
      }
      if (!cir.evolucaoConsideracoes) {
        cir.evolucaoConsideracoes = modeloDetetado.evolucaoConsideracoes;
      }
      if (cir.modelo === null || cir.modelo === undefined) {
        cir.modelo = modeloDetetado.nome;
      }
      cir.modeloUso = modeloDetetado.nome;
      console.log(`[inferência] Modelo detectado: ${modeloDetetado.nome} — campos preenchidos com fallback`);
    } else if (!cir.modelo) {
      console.log('[inferência] Nenhum modelo detectado pelo texto; IA não escolheu modelo.');
    }

    const docs = await gerarDocumentosCirurgicos(
      resultadoIA.paciente,
      resultadoIA.cirurgia,
      jobFolder,
      fotosCaminhos
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);

    res.json({
      sucesso: true,
      paciente: resultadoIA.paciente,
      cirurgia: resultadoIA.cirurgia,
      pdfUrl: `/downloads/${jobId}/${encodeURIComponent(pdfNome)}`,
      docxUrl: `/downloads/${jobId}/${encodeURIComponent(docxNome)}`,
      pdfNome,
      docxNome
    });
  } catch (err) {
    console.error('Erro ao processar cirurgia:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao processar relatório cirúrgico.' });
  } finally {
    todosArquivos.forEach(f => {
      try { fs.unlinkSync(f); } catch (_) {}
    });
  }
});

// Página Inicial do Portal Web UPA PET com Google SSO e Controle de Acesso
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UPA PET - Central de Laudos e Cirurgias</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class' };
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f8fafc; }
    /* Phase 3: abas horizontais com rolagem (pillets) */
    #aba-tabs { scrollbar-width: none; }
    #aba-tabs::-webkit-scrollbar { display: none; }
    /* Phase 5: Dark mode — cores de base (CSS custom) */
    .dark body { background-color: #0f172a; }
    .dark h1, .dark h2, .dark h3, .dark p { color: inherit; }
  </style>
  <script>
    (function initTema() {
      try {
        var saved = localStorage.getItem('tema_preferencia');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)') && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var isDark = (saved === 'dark') || (saved === 'system' && prefersDark);
        if (isDark) document.documentElement.classList.add('dark');
      } catch(e) {}
    })();
  </script>
</head>
<body class="min-h-screen flex flex-col justify-between">
  <div>
    <!-- Top Header com Perfil Google e Status -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
            🐾
          </div>
          <div>
            <h1 class="text-lg font-bold text-slate-800 leading-tight dark:text-slate-100">UPA PET</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Central Inteligente de Laudos &bull; Dra. Camila Bastos (CRMV/MG: 22904)</p>
          </div>
        </div>

        <!-- Seção de Usuário / Login Google -->
        <div id="usuario-header" class="flex items-center space-x-3">
          <div class="animate-pulse text-xs text-slate-400 dark:text-slate-300">Verificando sessão...</div>
        </div>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-4xl mx-auto px-4 py-8">

      <!-- TELA 1: BLOQUEIO DE USUÁRIO DESCONECTADO -->
      <div id="tela-login" class="hidden bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center max-w-lg mx-auto my-8">
        <div class="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          <i class="fa-solid fa-lock"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Acesso Restrito ao Sistema</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Para garantir a segurança dos dados clínicos e emissão oficial de relatórios da <strong>UPA PET</strong>, é necessário entrar com sua conta Google autorizada.
        </p>

        <!-- Botão Google Oficial -->
        <div class="flex justify-center mb-4">
          <div id="google-login-btn"></div>
        </div>

        <div id="aviso-config-google" class="hidden text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 text-left mt-4">
          <i class="fa-solid fa-triangle-exclamation mr-1"></i>
          <strong>Configuração pendente:</strong> Para habilitar o login pelo Google, defina a variável <code>GOOGLE_CLIENT_ID</code> nas configurações do seu servidor no Render.
        </div>
      </div>

      <!-- TELA 2: ALERTA DE USUÁRIO SEM PERMISSÃO -->
      <div id="alerta-sem-permissao" class="hidden mb-6 p-5 border border-amber-300 bg-amber-50 rounded-xl">
        <div class="flex items-start space-x-3">
          <i class="fa-solid fa-shield-halved text-2xl text-amber-600 mt-0.5"></i>
          <div>
            <h3 class="text-sm font-bold text-amber-900">Acesso em Modo de Consulta / Não Autorizado</h3>
            <p class="text-xs text-amber-800 mt-1 leading-relaxed">
              Você está conectado como <strong id="user-email-bloqueado"></strong>, mas sua conta ainda <strong>não possui autorização para emitir laudos e relatórios oficiais</strong>.
              Apenas a <strong>Dra. Camila Bastos</strong> e veterinários autorizados podem gerar novos documentos.
            </p>
          </div>
        </div>
      </div>

      <!-- TELA 3: CONTEÚDO PRINCIPAL (TABS ULTRASSOM E CIRURGIA) -->
      <div id="conteudo-principal" class="hidden">
        <!-- Tabs Selector — Phase 3: responsivo -->
        <div id="aba-tabs" class="flex overflow-x-auto mb-6 px-4 py-2 gap-3 bg-white dark:bg-slate-800 shadow-sm rounded-xl">
          <button id="tab-btn-ultra" onclick="mudarAba('ultra')" class="tab-btn tab-active flex items-center space-x-2 transition rounded-full py-2.5 px-5 text-sm font-semibold text-white bg-sky-500 shadow-md whitespace-nowrap" role="tab">
            <i class="fa-solid fa-satellite-dish text-base"></i>
            <span class="tab-label">Ultrassonografia Abdominal</span>
          </button>
          <button id="tab-btn-cirurg" onclick="mudarAba('cirurg')" class="tab-btn py-2.5 px-5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center space-x-2 transition rounded-full border border-slate-300 dark:border-slate-600 whitespace-nowrap hover:border-sky-400 hover:bg-sky-50" role="tab">
            <i class="fa-solid fa-syringe text-base"></i>
            <span class="tab-label">Relatório Cirúrgico</span>
          </button>
        </div>

        <!-- ABA 1: ULTRASSOM -->
        <div id="aba-ultra" class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div class="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
            <div>
              <h2 class="text-lg font-bold text-slate-800 dark:text-slate-200">Laudo de Ultrassonografia Abdominal</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">Envie as capturas de tela do Mindray com calipers e identificações para análise automática.</p>
            </div>
            <!-- Phase 2: Editor de Layout contextual (apenas aba Ultrassom) -->
            <button
              id="btn-layout-ultra"
              onclick="abrirModalLayout()"
              class="hidden sm:flex items-center space-x-1.5 text-xs text-sky-700 hover:text-sky-900 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 transition font-medium"
              title="Editor de Layout do Laudo de Ultrassom"
            >
              <i class="fa-solid fa-palette text-base"></i>
              <span>Editor de Layout</span>
            </button>
          </div>

          <form id="form-ultra" onsubmit="enviarUltrassom(event)">
            <div class="border-2 border-dashed border-sky-300 rounded-xl p-8 text-center bg-sky-50/50 hover:bg-sky-50 transition cursor-pointer" onclick="document.getElementById('input-ultra-fotos').click()">
              <i class="fa-solid fa-cloud-arrow-up text-4xl text-sky-500 mb-3"></i>
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Clique para selecionar as fotos ou arraste até aqui</p>
              <p class="text-xs text-slate-400 dark:text-slate-300 mt-1">Formatos aceitos: JPG, PNG, WEBP (várias fotos de uma vez)</p>
              <input type="file" id="input-ultra-fotos" multiple accept="image/*" class="hidden" onchange="atualizarListaFotosUltra(this)">
            </div>

            <div id="lista-fotos-ultra" class="mt-4 text-xs text-slate-600 dark:text-slate-300 space-y-1"></div>

            <button type="submit" id="btn-ultra-submit" class="mt-6 w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Gerar Laudo Oficial com IA</span>
            </button>
          </form>

          <!-- Loading e Resultado -->
          <div id="loading-ultra" class="hidden mt-6 p-6 text-center border border-slate-100 rounded-xl bg-slate-50 dark:bg-slate-800">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-3"></div>
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Analisando capturas do Mindray com IA e gerando laudo...</p>
            <p class="text-xs text-slate-400 dark:text-slate-300 mt-1">Isso costuma levar cerca de 15 a 30 segundos.</p>
          </div>

          <div id="resultado-ultra" class="hidden mt-6 p-6 border border-emerald-200 bg-emerald-50 rounded-xl">
            <div class="flex items-center space-x-2 text-emerald-800 font-bold mb-3">
              <i class="fa-solid fa-circle-check text-xl text-emerald-600"></i>
              <span>Laudo Gerado com Sucesso!</span>
            </div>
            <div id="info-paciente-ultra" class="text-sm text-emerald-950 mb-4 bg-white dark:bg-slate-800 p-3 rounded-lg border border-emerald-100"></div>
            <div class="flex flex-col sm:flex-row gap-3">
              <a id="btn-download-ultra-pdf" href="#" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-center py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 shadow-sm transition">
                <i class="fa-solid fa-file-pdf"></i>
                <span>Baixar Laudo em PDF</span>
              </a>
              <a id="btn-download-ultra-docx" href="#" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 shadow-sm transition">
                <i class="fa-solid fa-file-word"></i>
                <span>Baixar Laudo em Word (.docx)</span>
              </a>
            </div>
          </div>
        </div>

        <!-- ABA 2: CIRURGIA -->
        <div id="aba-cirurg" class="hidden bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div class="mb-4">
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-200">Relatório Cirúrgico Oficial</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Envie o documento da cirurgia (.docx, .pages, .txt ou áudio gravado) e fotos anexas opcionais.</p>
          </div>

          <form id="form-cirurg" onsubmit="enviarCirurgia(event)">
            <!-- Documento Principal -->
            <div class="mb-4">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">1. Ficha Cirúrgica ou Áudio</label>
              <div class="border-2 border-dashed border-sky-300 rounded-xl p-6 text-center bg-sky-50/50 hover:bg-sky-50 transition cursor-pointer" onclick="document.getElementById('input-cirurg-doc').click()">
                <i class="fa-solid fa-file-waveform text-3xl text-sky-500 mb-2"></i>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Selecione o arquivo da cirurgia</p>
                <p class="text-xs text-slate-400 dark:text-slate-300 mt-0.5">Word (.docx), Pages (.pages), Texto (.txt) ou Áudios (.m4a, .mp3, .wav, .ogg)</p>
                <input type="file" id="input-cirurg-doc" accept=".docx,.pages,.txt,.m4a,.mp3,.wav,.ogg,.opus" class="hidden" onchange="atualizarDocCirurg(this)">
              </div>
              <div id="nome-doc-cirurg" class="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300"></div>
            </div>

            <!-- Fotos Opcionais -->
            <div class="mb-6">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">2. Fotos Intraoperatórias / Peça Cirúrgica (Opcional - Página 2)</label>
              <div class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/70 transition cursor-pointer" onclick="document.getElementById('input-cirurg-fotos').click()">
                <i class="fa-solid fa-camera text-2xl text-slate-400 dark:text-slate-300 mb-1"></i>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-300">Clique para adicionar fotos da peça cirúrgica ou procedimento</p>
                <input type="file" id="input-cirurg-fotos" multiple accept="image/*" class="hidden" onchange="atualizarFotosCirurg(this)">
              </div>
              <div id="lista-fotos-cirurg" class="mt-2 text-xs text-slate-600 dark:text-slate-300"></div>
            </div>

            <button type="submit" id="btn-cirurg-submit" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Gerar Relatório Cirúrgico Oficial</span>
            </button>
          </form>

          <!-- Loading e Resultado Cirurgia -->
          <div id="loading-cirurg" class="hidden mt-6 p-6 text-center border border-slate-100 rounded-xl bg-slate-50 dark:bg-slate-800">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-3"></div>
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Identificando procedimento e aplicando padrão Dra. Camila Bastos...</p>
            <p class="text-xs text-slate-400 dark:text-slate-300 mt-1">Compilando 1 página com assinatura + página 2 com registro fotográfico.</p>
          </div>

          <div id="resultado-cirurg" class="hidden mt-6 p-6 border border-emerald-200 bg-emerald-50 rounded-xl">
            <div class="flex items-center space-x-2 text-emerald-800 font-bold mb-3">
              <i class="fa-solid fa-circle-check text-xl text-emerald-600"></i>
              <span>Relatório Cirúrgico Concluído!</span>
            </div>
            <div id="info-paciente-cirurg" class="text-sm text-emerald-950 mb-4 bg-white dark:bg-slate-800 p-3 rounded-lg border border-emerald-100"></div>
            <div class="flex flex-col sm:flex-row gap-3">
              <a id="btn-download-cirurg-pdf" href="#" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-center py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 shadow-sm transition">
                <i class="fa-solid fa-file-pdf"></i>
                <span>Baixar Relatório em PDF</span>
              </a>
              <a id="btn-download-cirurg-docx" href="#" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 shadow-sm transition">
                <i class="fa-solid fa-file-word"></i>
                <span>Baixar Relatório em Word (.docx)</span>
              </a>
            </div>
          </div>

          <!-- SEÇÃO: BIBLIOTECA DE MODELOS CIRÚRGICOS INSTITUCIONAIS -->
          <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                    <i class="fa-solid fa-book-medical text-sky-600"></i>
                    <span>Modelos Cirúrgicos Padronizados</span>
                  </h3>
                  <span id="badge-total-modelos" class="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Carregando...</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Modelos pré-cadastrados (Dra. Camila Bastos - UPA PET) utilizados pela IA para estruturação dos relatórios. Você pode consultar, editar ou cadastrar novos modelos.</p>
              </div>
              <button id="btn-novo-modelo" onclick="abrirModalFormModelo(null)" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto">
                <i class="fa-solid fa-plus"></i>
                <span>Novo Modelo Cirúrgico</span>
              </button>
            </div>

            <!-- Busca Rápida de Modelos -->
            <div class="relative mb-4">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 dark:text-slate-300 text-xs"></i>
              <input type="text" id="input-busca-modelo" oninput="filtrarModelosCirurgicos(this.value)" placeholder="Buscar por procedimento, sinônimo ou palavra-chave (ex: celiotomia, piometra, nódulo)..." class="w-full pl-8 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:bg-slate-800 transition">
            </div>

            <!-- Grid de Cards de Modelos -->
            <div id="grid-modelos-cirurgicos" class="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
              <!-- Renderizado via JavaScript -->
              <div class="col-span-full py-8 text-center text-xs text-slate-400 dark:text-slate-300">
                <i class="fa-solid fa-spinner animate-spin mr-1"></i> Carregando biblioteca de modelos cirúrgicos...
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- MODAL VISUALIZAR MODELO CIRÚRGICO -->
  <div id="modal-modelo-visualizar" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 id="vis-modelo-nome" class="text-base font-bold text-slate-800 dark:text-slate-200">Nome do Modelo</h3>
          <p id="vis-modelo-procedimento" class="text-xs text-sky-600 font-medium mt-0.5">Procedimento</p>
        </div>
        <button onclick="fecharModalVisualizarModelo()" class="text-slate-400 hover:text-slate-600 dark:text-slate-300 p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="overflow-y-auto py-4 space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed pr-1">
        <div>
          <span class="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wide block mb-1">Sinônimos / Palavras-chave:</span>
          <div id="vis-modelo-sinonimos" class="flex flex-wrap gap-1.5"></div>
        </div>

        <div>
          <span class="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wide block mb-1">Diagnóstico Pré-Cirúrgico:</span>
          <p id="vis-modelo-diag" class="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"></p>
        </div>

        <div>
          <span class="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wide block mb-1">Descrição do Procedimento Cirúrgico (Técnica Padronizada):</span>
          <div id="vis-modelo-desc" class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-line text-slate-800 dark:text-slate-200 font-sans leading-relaxed"></div>
        </div>

        <div>
          <span class="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wide block mb-1">Evolução e Considerações:</span>
          <p id="vis-modelo-evol" class="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"></p>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span id="vis-modelo-id" class="text-[11px] font-mono text-slate-400 dark:text-slate-300"></span>
        <div class="flex items-center space-x-2">
          <button id="btn-vis-editar" onclick="" class="hidden bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Editar este Modelo</span>
          </button>
          <button onclick="fecharModalVisualizarModelo()" class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-lg text-xs font-medium transition">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL FORMULÁRIO (CRIAR / EDITAR) MODELO CIRÚRGICO -->
  <div id="modal-modelo-form" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col p-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-3">
        <h3 id="form-modelo-titulo" class="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
          <i class="fa-solid fa-pen-to-square text-sky-600"></i>
          <span>Editar Modelo Cirúrgico</span>
        </h3>
        <button onclick="fecharModalFormModelo()" class="text-slate-400 hover:text-slate-600 dark:text-slate-300 p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <form id="form-modelo-cirurgico" onsubmit="salvarModeloCirurgico(event)" class="overflow-y-auto pr-1 space-y-3.5 text-xs">
        <input type="hidden" id="form-mod-id" value="">

        <div>
          <label class="block font-semibold text-slate-700 dark:text-white mb-1">Nome do Modelo <span class="text-red-500">*</span></label>
          <input type="text" id="form-mod-nome" required placeholder="Ex: Celiotomia exploratória de urgência" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-white mb-1">Procedimento Oficial <span class="text-red-500">*</span></label>
            <input type="text" id="form-mod-procedimento" required placeholder="Ex: Celiotomia exploratória de urgência" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500">
          </div>
          <div>
            <label class="block font-semibold text-slate-700 dark:text-white mb-1">Diagnóstico Pré-Cirúrgico Padrão</label>
            <input type="text" id="form-mod-diag" placeholder="Ex: Suspeita de corpo estranho gástrico" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500">
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-white mb-1">Sinônimos / Palavras-chave (separados por vírgula)</label>
          <input type="text" id="form-mod-sinonimos" placeholder="Ex: celiotomia, laparotomia, corpo estranho gástrico" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500">
          <p class="text-[11px] text-slate-400 dark:text-slate-300 mt-0.5">Palavras que ajudam a IA a associar o áudio/documento a este modelo.</p>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-white mb-1">Descrição do Procedimento Cirúrgico (Técnica Padronizada) <span class="text-red-500">*</span></label>
          <textarea id="form-mod-desc" required rows="7" placeholder="Descreva a técnica cirúrgica oficial: preparo, antissepsia, incisão por planos, tempos cirúrgicos, hemostasia, síntese (fios e padrões de sutura)..." class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-sans focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"></textarea>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-white mb-1">Evolução e Considerações Pós-Operatórias</label>
          <textarea id="form-mod-evol" rows="3" placeholder="Considerações sobre o pós-cirúrgico, achados adicionais e orientações..." class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"></textarea>
        </div>

        <div id="form-mod-erro" class="hidden text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200"></div>

        <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button type="button" id="btn-form-excluir" onclick="excluirModeloAtual()" class="hidden text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 flex items-center space-x-1">
            <i class="fa-solid fa-trash-can"></i>
            <span>Excluir Modelo</span>
          </button>
          <div class="flex items-center space-x-2 ml-auto">
            <button type="button" onclick="fecharModalFormModelo()" class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-lg text-xs font-medium transition">
              Cancelar
            </button>
            <button type="submit" id="btn-form-salvar" class="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1.5">
              <i class="fa-solid fa-floppy-disk"></i>
              <span>Salvar Modelo</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL DE ADMINISTRAÇÃO DE USUÁRIOS -->
  <div id="modal-admin" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full p-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
          <i class="fa-solid fa-users-gear text-purple-600"></i>
          <span>Controle de Acessos e Permissões</span>
        </h3>
        <button onclick="fecharModalAdmin()" class="text-slate-400 hover:text-slate-600 dark:text-slate-300 p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
            <tr>
              <th class="p-2.5">Usuário</th>
              <th class="p-2.5">E-mail</th>
              <th class="p-2.5">Cargo / Papel</th>
              <th class="p-2.5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody id="tabela-usuarios-corpo" class="divide-y divide-slate-100">
            <!-- Linhas preenchidas via JavaScript -->
          </tbody>
        </table>
      </div>

      <div class="mt-5 text-right">
        <button onclick="fecharModalAdmin()" class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition">
          Fechar
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL DE CONFIGURAÇÕES DE MODELOS E LAYOUT -->
  <div id="modal-layout" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full p-6 flex flex-col max-h-[92vh]">
      <!-- Header do Modal -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
            <i class="fa-solid fa-palette text-sky-600"></i>
            <span>Editor de Modelos e Layout Institucional</span>
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personalize tipografia, espaçamentos, margens e cores aplicados na geração de relatórios em PDF e Word (.docx).
          </p>
        </div>
        <button onclick="fecharModalLayout()" class="text-slate-400 hover:text-slate-600 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 transition">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Corpo com Grid 2 Colunas: Formulário à Esquerda e Preview à Direita -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
        <!-- Coluna Esquerda: Formulário de Controles (lg:col-span-6) -->
        <div class="lg:col-span-6 space-y-4 text-xs">
          <!-- Bloco: Tipografia -->
          <div class="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
            <h4 class="font-bold text-slate-700 dark:text-white text-xs uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <i class="fa-solid fa-font text-sky-600"></i>
              <span>Tipografia</span>
            </h4>
            <div class="space-y-3">
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Família da Fonte</label>
                <select id="layout-font-family" onchange="atualizarPreviewLayout()" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
                  <option value="Calibri, sans-serif">Calibri (Padrão Institucional UPA PET)</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-slate-700 dark:text-white mb-1">Tamanho Corpo</label>
                  <select id="layout-font-size-body" onchange="atualizarPreviewLayout()" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
                    <option value="9.5pt">9.5pt</option>
                    <option value="10pt">10pt</option>
                    <option value="10.5pt">10.5pt</option>
                    <option value="11pt">11pt (Recomendado)</option>
                    <option value="11.5pt">11.5pt</option>
                    <option value="12pt">12pt</option>
                  </select>
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 dark:text-white mb-1">Tamanho Título</label>
                  <select id="layout-font-size-titulo" onchange="atualizarPreviewLayout()" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
                    <option value="12pt">12pt</option>
                    <option value="13pt">13pt</option>
                    <option value="14pt">14pt (Recomendado)</option>
                    <option value="15pt">15pt</option>
                    <option value="16pt">16pt</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Bloco: Margens da Página -->
          <div class="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
            <h4 class="font-bold text-slate-700 dark:text-white text-xs uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <i class="fa-solid fa-arrows-up-down-left-right text-sky-600"></i>
              <span>Margens da Página (A4)</span>
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Superior</label>
                <input type="text" id="layout-margin-top" oninput="atualizarPreviewLayout()" placeholder="20mm" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Inferior</label>
                <input type="text" id="layout-margin-bottom" oninput="atualizarPreviewLayout()" placeholder="20mm" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Esquerda</label>
                <input type="text" id="layout-margin-left" oninput="atualizarPreviewLayout()" placeholder="15mm" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Direita</label>
                <input type="text" id="layout-margin-right" oninput="atualizarPreviewLayout()" placeholder="15mm" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
              </div>
            </div>
          </div>

          <!-- Bloco: Espaçamentos -->
          <div class="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
            <h4 class="font-bold text-slate-700 dark:text-white text-xs uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <i class="fa-solid fa-arrows-split-up-and-left text-sky-600"></i>
              <span>Espaçamentos</span>
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Entrelinhas (Multiplicador)</label>
                <input type="number" step="0.05" min="1.1" max="1.8" id="layout-line-height" oninput="atualizarPreviewLayout()" placeholder="1.4" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Entre Parágrafos</label>
                <input type="text" id="layout-paragraph-spacing" oninput="atualizarPreviewLayout()" placeholder="8pt" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
              </div>
            </div>
          </div>

          <!-- Bloco: Cores Institucionais -->
          <div class="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
            <h4 class="font-bold text-slate-700 dark:text-white text-xs uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <i class="fa-solid fa-palette text-sky-600"></i>
              <span>Paleta de Cores Institucionais</span>
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Cor Primária (Títulos/Logo)</label>
                <div class="flex items-center space-x-2">
                  <input type="color" id="layout-color-primary-picker" oninput="sincronizarCorPrimaria(this.value)" class="w-9 h-9 p-0.5 border border-slate-300 dark:border-slate-600 rounded cursor-pointer">
                  <input type="text" id="layout-cor-primaria" oninput="sincronizarCorPrimariaTexto(this.value)" placeholder="#1B365D" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs font-mono uppercase">
                </div>
              </div>
              <div>
                <label class="block font-semibold text-slate-700 dark:text-white mb-1">Cor Secundária (Subtítulos)</label>
                <div class="flex items-center space-x-2">
                  <input type="color" id="layout-color-secondary-picker" oninput="sincronizarCorSecundaria(this.value)" class="w-9 h-9 p-0.5 border border-slate-300 dark:border-slate-600 rounded cursor-pointer">
                  <input type="text" id="layout-cor-secundaria" oninput="sincronizarCorSecundariaTexto(this.value)" placeholder="#4A777A" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs font-mono uppercase">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Preview em Tempo Real (lg:col-span-6) -->
        <div class="lg:col-span-6 flex flex-col">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-slate-700 dark:text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <i class="fa-solid fa-eye text-emerald-600"></i>
              <span>Preview em Tempo Real</span>
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono">Simulação A4 (Pág. 1)</span>
          </div>

          <!-- Folha do Preview -->
          <div class="flex-1 bg-slate-200/70 dark:bg-slate-900/40 p-3 sm:p-4 rounded-xl flex items-center justify-center overflow-auto min-h-[420px]">
            <div id="layout-preview-sheet" class="bg-white dark:bg-slate-800 shadow-lg border border-slate-300 dark:border-slate-600 rounded w-full max-w-md p-4 transition-all duration-150 flex flex-col justify-between" style="min-height: 480px;">
              <div>
                <!-- Cabeçalho do Laudo -->
                <div class="flex items-center justify-between border-b pb-2 mb-2" id="preview-header">
                  <div class="text-left font-black tracking-tighter" id="preview-logo" style="color: #1B365D; font-size: 16pt;">
                    UPA PET
                  </div>
                  <div class="text-[9px] text-slate-600 dark:text-slate-300 text-right leading-tight" id="preview-patient-info">
                    <p><strong>Paciente:</strong> Thor &bull; <strong>Espécie:</strong> Canina</p>
                    <p><strong>Tutor:</strong> Maria Santos &bull; <strong>Idade:</strong> 4 anos</p>
                    <p><strong>Data:</strong> 11/11/2026</p>
                  </div>
                </div>

                <!-- Título -->
                <div class="text-center my-2">
                  <h5 id="preview-titulo" class="font-bold tracking-wide" style="color: #1B365D; font-size: 11pt;">
                    RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL
                  </h5>
                  <p id="preview-subtitulo" class="italic text-[8px] mt-0.5" style="color: #4A777A;">
                    Exame ultrassonográfico abdominal completo em modo B
                  </p>
                </div>

                <!-- Conteúdo dos Órgãos -->
                <div id="preview-conteudo" class="text-justify text-slate-800 dark:text-slate-200 space-y-1.5" style="font-size: 9.5pt; line-height: 1.35;">
                  <p id="p-bexiga"><strong class="font-bold">BEXIGA:</strong> Repleção líquida adequada, contornos regulares, paredes finas (0,12 cm), conteúdo anecogênico límpido sem urólitos.</p>
                  <p id="p-rins"><strong class="font-bold">RINS:</strong> Dimensões preservadas (RE: 4,2 cm; RD: 4,0 cm), relação corticomedular mantida, ecotextura usual, sem evidência de nefrolitíase.</p>
                  <p id="p-figado"><strong class="font-bold">FÍGADO:</strong> Dimensões normais, bordos afilados, parênquima homogêneo com ecogenicidade preservada. Vias biliares anatômicas.</p>
                  <p id="p-consideracoes"><strong class="font-bold">CONSIDERAÇÕES:</strong> Exame ultrassonográfico abdominal dentro dos parâmetros da normalidade para a espécie e faixa etária.</p>
                </div>
              </div>

              <!-- Assinatura e Rodapé -->
              <div class="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div class="text-right text-[9px] leading-tight mb-2">
                  <p class="font-bold text-slate-800 dark:text-slate-200">Dra. Camila Bastos</p>
                  <p class="text-slate-500 dark:text-slate-400">Médica Veterinária &bull; CRMV/MG: 22904</p>
                </div>
                <div class="text-center text-[7.5px] text-slate-400 dark:text-slate-300 italic">
                  O ultrassom é um exame complementar e deve ser correlacionado aos achados clínicos.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer de Ações do Modal -->
      <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onclick="restaurarPadraoLayoutFront()" class="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-lg font-medium transition flex items-center space-x-1.5">
          <i class="fa-solid fa-rotate-left"></i>
          <span>Restaurar Padrão Institucional UPA PET</span>
        </button>
        <div class="flex items-center space-x-2 ml-auto">
          <button type="button" onclick="fecharModalLayout()" class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-medium transition">
            Cancelar
          </button>
          <button type="button" onclick="salvarLayoutFront()" id="btn-salvar-layout" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1.5">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Salvar Alterações no Layout</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <footer class="text-center py-6 text-xs text-slate-400 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    UPA PET &bull; Automação Inteligente de Laudos e Procedimentos Cirúrgicos &bull; Dra. Camila Bastos - CRMV/MG: 22904
  </footer>

  <script>
    let usuarioAtual = null;
    let ssoConfig = null;
    let todosModelosCirurgicos = [];

    // Inicialização da Página
    window.addEventListener('DOMContentLoaded', async () => {
      await carregarConfiguracaoSSO();
      await verificarSessaoUsuario();
      await carregarModelosCirurgicosFront();
    });

    async function carregarConfiguracaoSSO() {
      try {
        const res = await fetch('/api/auth/config');
        ssoConfig = await res.json();
      } catch (e) {
        console.error('Erro ao carregar config SSO:', e);
      }
    }

    async function verificarSessaoUsuario() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        usuarioAtual = data.usuario;
        atualizarInterfaceUsuario();
      } catch (e) {
        usuarioAtual = null;
        atualizarInterfaceUsuario();
      }
    }

    function atualizarInterfaceUsuario() {
      const headerDiv = document.getElementById('usuario-header');
      const telaLogin = document.getElementById('tela-login');
      const telaPrincipal = document.getElementById('conteudo-principal');
      const alertaSemPermissao = document.getElementById('alerta-sem-permissao');
      const btnLayoutUltra = document.getElementById('btn-layout-ultra');
      const btnSubmitUltra = document.getElementById('btn-ultra-submit');
      const btnSubmitCirurg = document.getElementById('btn-cirurg-submit');

      if (!usuarioAtual) {
        // Usuário DESCONECTADO
        headerDiv.innerHTML = \`
          <button onclick="mostrarLogin()" class="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-sm transition flex items-center space-x-1.5">
            <i class="fa-brands fa-google"></i>
            <span>Entrar com o Google</span>
          </button>
        \`;
        telaLogin.classList.remove('hidden');
        telaPrincipal.classList.add('hidden');
        alertaSemPermissao.classList.add('hidden');
        renderizarBotaoGoogle();
        return;
      }

      // Usuário CONECTADO
      telaLogin.classList.add('hidden');
      telaPrincipal.classList.remove('hidden');

      let badgeColor = 'bg-slate-100 text-slate-800';
      if (usuarioAtual.role === 'admin') badgeColor = 'bg-purple-100 text-purple-800';
      else if (usuarioAtual.role === 'veterinario') badgeColor = 'bg-sky-100 text-sky-800';
      else if (usuarioAtual.role === 'pendente') badgeColor = 'bg-amber-100 text-amber-800';

      const avatarHtml = usuarioAtual.foto
        ? \`<img src="\${usuarioAtual.foto}" class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" alt="Avatar">\`
        : \`<div class="w-8 h-8 bg-sky-600 text-white font-bold rounded-full flex items-center justify-center text-xs">\${usuarioAtual.nome.substring(0, 2).toUpperCase()}</div>\`;

      // Phase 1: Dropdown com engrenagem (Gerenciar Acessos + Sair)
      const adminItem = usuarioAtual.role === 'admin'
        ? \`<button onclick="abrirModalAdmin(); fecharMenuUsuario()" class="w-full text-left px-3 py-2 text-xs text-purple-700 hover:bg-purple-50 transition flex items-center space-x-2" role="menuitem"><i class="fa-solid fa-users-gear"></i><span>Gerenciar Acessos</span></button>\`
        : '';

      headerDiv.innerHTML = \`
        <div class="flex items-center space-x-3">
          \${avatarHtml}
          <div class="text-right hidden sm:block">
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">\${usuarioAtual.nome}</div>
            <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full \${badgeColor}">
              \${usuarioAtual.roleDescricao}
            </span>
          </div>
          <div class="relative" id="menu-usuario-wrapper">
            <button
              id="btn-menu-usuario"
              onclick="toggleMenuUsuario()"
              aria-expanded="false"
              aria-haspopup="true"
              title="Menu do usuário"
              class="text-slate-400 dark:text-slate-300 hover:text-sky-600 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              <i class="fa-solid fa-gear text-xs"></i>
            </button>
            <div
              id="dropdown-usuario"
              class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50"
              role="menu"
            >
              <div class="px-3 py-2 border-b border-slate-100">
                <p class="text-xs font-medium text-slate-700 dark:text-slate-300">\${usuarioAtual.nome}</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">\${usuarioAtual.email}</p>
              </div>
              \${usuarioAtual.role === 'admin' ? '<button onclick="abrirModalAdmin(); fecharMenuUsuario()" class="w-full text-left px-3 py-2 text-xs text-purple-700 hover:bg-purple-50 transition flex items-center space-x-2" role="menuitem"><i class="fa-solid fa-users-gear"></i><span>Gerenciar Acessos</span></button>' : ''}
              <div class="px-3 py-2 border-t border-slate-100 border-b border-slate-100">
                <label class="flex items-center justify-between w-full cursor-pointer gap-2">
                  <span class="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <i class="fa-solid fa-moon text-slate-500 dark:text-slate-400"></i>
                    <span>Modo escuro</span>
                  </span>
                  <select
                    id="select-tema"
                    onchange="salvarTema(this.value)"
                    class="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:ring-sky-600"
                    aria-label="Preferência de tema"
                  >
                    <option value="system">Sistema</option>
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                  </select>
                </label>
              </div>
              <button onclick="fazerLogout(); fecharMenuUsuario()" class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition flex items-center space-x-2" role="menuitem">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      \`;

      // Phase 2: Editor de Layout — visível apenas se usuário pode gerar laudos
      if (btnLayoutUltra) {
        if (usuarioAtual.role === 'admin' || usuarioAtual.role === 'veterinario') {
          btnLayoutUltra.classList.remove('hidden');
        } else {
          btnLayoutUltra.classList.add('hidden');
        }
      }

      const podeEmitir = usuarioAtual.podeGerarLaudos || usuarioAtual.podeGerarCirurgia;

      if (!podeEmitir) {
        alertaSemPermissao.classList.remove('hidden');
        document.getElementById('user-email-bloqueado').innerText = usuarioAtual.email;
        btnSubmitUltra.disabled = true;
        btnSubmitUltra.className = 'mt-6 w-full bg-slate-300 text-slate-500 font-medium py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center space-x-2';
        btnSubmitUltra.innerHTML = '<i class="fa-solid fa-lock"></i><span>Geração de Laudo Bloqueada (Sem Permissão)</span>';

        btnSubmitCirurg.disabled = true;
        btnSubmitCirurg.className = 'w-full bg-slate-300 text-slate-500 font-medium py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center space-x-2';
        btnSubmitCirurg.innerHTML = '<i class="fa-solid fa-lock"></i><span>Geração Cirúrgica Bloqueada (Sem Permissão)</span>';
      } else {
        alertaSemPermissao.classList.add('hidden');
        btnSubmitUltra.disabled = false;
        btnSubmitUltra.className = 'mt-6 w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2';
        btnSubmitUltra.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Gerar Laudo Oficial com IA</span>';

        btnSubmitCirurg.disabled = false;
        btnSubmitCirurg.className = 'mt-6 w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2';
        btnSubmitCirurg.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Gerar Relatório Cirúrgico Oficial</span>';
      }

      const btnNovoModelo = document.getElementById('btn-novo-modelo');
      if (btnNovoModelo) {
        if (usuarioAtual && (usuarioAtual.podeGerarCirurgia || usuarioAtual.role === 'admin' || usuarioAtual.role === 'veterinario')) {
          btnNovoModelo.classList.remove('hidden');
        } else {
          btnNovoModelo.classList.add('hidden');
        }
      }
      renderizarCardsModelos(todosModelosCirurgicos);

      // Phase 3: Controlar visibilidade do btn-layout-ultra conforme aba ativa
      if (btnLayoutUltra && abaAtual === 'ultra') {
        btnLayoutUltra.classList.remove('hidden');
      }

      // Phase 5: Dark Mode — carregar tema salvo do usuário
      carregarTemaSalvo();
    }

    var abaAtual = 'ultra'; // Phase 3: aba ativa

    // Phase 1: Menu do usuário (engrenagem no header)
    function toggleMenuUsuario() {
      const dropdown = document.getElementById('dropdown-usuario');
      const btn = document.getElementById('btn-menu-usuario');
      if (!dropdown) return;
      dropdown.classList.toggle('hidden');
      if (btn) btn.setAttribute('aria-expanded', dropdown.classList.contains('hidden') ? 'false' : 'true');
    }

    function fecharMenuUsuario() {
      const dropdown = document.getElementById('dropdown-usuario');
      if (dropdown) dropdown.classList.add('hidden');
      const btn = document.getElementById('btn-menu-usuario');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    // Phase 1: fechar dropdown ao clicar fora
    document.addEventListener('click', function(e) {
      const wrapper = document.getElementById('menu-usuario-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        fecharMenuUsuario();
      }
    });

    // Phase 5: Dark Mode — funções de tema
    function aplicarTema(tema) {
      const root = document.documentElement;
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tema_preferencia') : null;
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)') && window.matchMedia('(prefers-color-scheme: dark)').matches;

      var effective = tema || saved || 'system';
      var isDark = (effective === 'dark') || (effective === 'system' && prefersDark);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Sincronizar select
      const select = document.getElementById('select-tema');
      if (select) select.value = effective;

      // Persistir em localStorage para bootstrap no reload
      try {
        localStorage.setItem('tema_preferencia', effective);
      } catch (e) {}
    }

    async function salvarTema(tema) {
      try {
        const res = await fetch('/api/usuario/tema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tema: tema })
        });
        const data = await res.json();
        if (!res.ok) {
          alert('Erro ao salvar tema: ' + (data.error || 'desconhecido'));
          return;
        }
        aplicarTema(tema);
      } catch (err) {
        alert('Erro de rede ao salvar tema.');
      }
    }

    async function carregarTemaSalvo() {
      if (!usuarioAtual) return;
      try {
        const res = await fetch('/api/usuario/tema');
        const data = await res.json();
        if (res.ok && data.sucesso) {
          aplicarTema(data.tema);
        }
      } catch (e) {
        // fallback: já aplicado via localStorage no bootstrap
      }
    }

    // Phase 5: Dark Mode — reagir a mudança do tema do sistema (modo "system")
    (function() {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) {
        mq.addEventListener('change', function() {
          const saved = localStorage.getItem('tema_preferencia');
          if (saved === 'system') aplicarTema('system');
        });
      } else if (mq.onchange) {
        mq.onchange = function() {
          const saved = localStorage.getItem('tema_preferencia');
          if (saved === 'system') aplicarTema('system');
        };
      }
    })();

    function renderizarBotaoGoogle() {
      if (!ssoConfig || !ssoConfig.googleClientId) {
        document.getElementById('aviso-config-google').classList.remove('hidden');
        return;
      }

      document.getElementById('aviso-config-google').classList.add('hidden');

      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          client_id: ssoConfig.googleClientId,
          callback: tratarRespostaGoogleSSO
        });

        google.accounts.id.renderButton(
          document.getElementById('google-login-btn'),
          { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 280 }
        );
      } else {
        setTimeout(renderizarBotaoGoogle, 500);
      }
    }

    async function tratarRespostaGoogleSSO(response) {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao autenticar.');
        usuarioAtual = data.usuario;
        atualizarInterfaceUsuario();
      } catch (err) {
        alert('Erro de login: ' + err.message);
      }
    }

    async function fazerLogout() {
      if (!confirm('Deseja realmente sair?')) return;
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        usuarioAtual = null;
        atualizarInterfaceUsuario();
      } catch (e) {
        location.reload();
      }
    }

    function mostrarLogin() {
      usuarioAtual = null;
      atualizarInterfaceUsuario();
    }

    // Modal Admin
    async function abrirModalAdmin() {
      document.getElementById('modal-admin').classList.remove('hidden');
      try {
        const res = await fetch('/api/admin/usuarios');
        const data = await res.json();
        const tbody = document.getElementById('tabela-usuarios-corpo');
        tbody.innerHTML = data.usuarios.map(u => \`
          <tr class="hover:bg-slate-50 dark:bg-slate-800 transition">
            <td class="p-2.5 font-medium text-slate-800 dark:text-slate-200">\${u.nome}</td>
            <td class="p-2.5 text-slate-500 dark:text-slate-400">\${u.email}</td>
            <td class="p-2.5">
              <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold \${
                u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                (u.role === 'veterinario' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800')
              }">\${u.roleDescricao}</span>
            </td>
            <td class="p-2.5 text-right">
              <select onchange="alterarCargoUsuario('\${u.email}', this.value)" class="text-xs border border-slate-200 dark:border-slate-700 rounded p-1">
                <option value="admin" \${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
                <option value="veterinario" \${u.role === 'veterinario' ? 'selected' : ''}>Veterinário (Gera laudos)</option>
                <option value="assistente" \${u.role === 'assistente' ? 'selected' : ''}>Assistente (Consulta)</option>
                <option value="pendente" \${u.role === 'pendente' ? 'selected' : ''}>Bloqueado / Pendente</option>
              </select>
            </td>
          </tr>
        \`).join('');
      } catch (err) {
        alert('Erro ao carregar usuários: ' + err.message);
      }
    }

    function fecharModalAdmin() {
      document.getElementById('modal-admin').classList.add('hidden');
    }

    async function alterarCargoUsuario(email, novoCargo) {
      try {
        const res = await fetch('/api/admin/usuarios/role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: novoCargo })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert(\`Permissões de \${email} atualizadas com sucesso para: \${novoCargo}!\`);
      } catch (err) {
        alert('Erro: ' + err.message);
      }
    }

    // ==========================================
    // EDITOR DE MODELOS E LAYOUT (FRONTEND)
    // ==========================================

    let layoutAtual = null;

    async function abrirModalLayout() {
      try {
        const res = await fetch('/api/layout-config');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao obter configurações de layout');
        layoutAtual = data.layout;
        preencherFormularioLayout(layoutAtual);
        atualizarPreviewLayout();
        document.getElementById('modal-layout').classList.remove('hidden');
      } catch (err) {
        alert('Erro ao carregar configurações de layout: ' + err.message);
      }
    }

    function fecharModalLayout() {
      document.getElementById('modal-layout').classList.add('hidden');
    }

    function preencherFormularioLayout(cfg) {
      if (!cfg) return;
      if (document.getElementById('layout-font-family')) document.getElementById('layout-font-family').value = cfg.font_family || 'Calibri, sans-serif';
      if (document.getElementById('layout-font-size-body')) document.getElementById('layout-font-size-body').value = cfg.font_size_body || '11pt';
      if (document.getElementById('layout-font-size-titulo')) document.getElementById('layout-font-size-titulo').value = cfg.font_size_titulo || '14pt';
      if (document.getElementById('layout-margin-top')) document.getElementById('layout-margin-top').value = cfg.margin_top || '20mm';
      if (document.getElementById('layout-margin-bottom')) document.getElementById('layout-margin-bottom').value = cfg.margin_bottom || '20mm';
      if (document.getElementById('layout-margin-left')) document.getElementById('layout-margin-left').value = cfg.margin_left || '15mm';
      if (document.getElementById('layout-margin-right')) document.getElementById('layout-margin-right').value = cfg.margin_right || '15mm';
      if (document.getElementById('layout-line-height')) document.getElementById('layout-line-height').value = cfg.line_height || '1.4';
      if (document.getElementById('layout-paragraph-spacing')) document.getElementById('layout-paragraph-spacing').value = cfg.paragraph_spacing || '8pt';

      const corPri = cfg.cor_primaria || '#1B365D';
      const corSec = cfg.cor_secundaria || '#4A777A';
      if (document.getElementById('layout-cor-primaria')) document.getElementById('layout-cor-primaria').value = corPri;
      if (document.getElementById('layout-color-primary-picker')) document.getElementById('layout-color-primary-picker').value = corPri;
      if (document.getElementById('layout-cor-secundaria')) document.getElementById('layout-cor-secundaria').value = corSec;
      if (document.getElementById('layout-color-secondary-picker')) document.getElementById('layout-color-secondary-picker').value = corSec;
    }

    function sincronizarCorPrimaria(val) {
      document.getElementById('layout-cor-primaria').value = val.toUpperCase();
      atualizarPreviewLayout();
    }

    function sincronizarCorPrimariaTexto(val) {
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        document.getElementById('layout-color-primary-picker').value = val;
      }
      atualizarPreviewLayout();
    }

    function sincronizarCorSecundaria(val) {
      document.getElementById('layout-cor-secundaria').value = val.toUpperCase();
      atualizarPreviewLayout();
    }

    function sincronizarCorSecundariaTexto(val) {
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        document.getElementById('layout-color-secondary-picker').value = val;
      }
      atualizarPreviewLayout();
    }

    function atualizarPreviewLayout() {
      const fontFamily = document.getElementById('layout-font-family')?.value || 'Calibri, sans-serif';
      const fontSizeBody = document.getElementById('layout-font-size-body')?.value || '11pt';
      const fontSizeTitulo = document.getElementById('layout-font-size-titulo')?.value || '14pt';
      const lineHeight = document.getElementById('layout-line-height')?.value || '1.4';
      const pSpacing = document.getElementById('layout-paragraph-spacing')?.value || '8pt';
      const corPrimaria = document.getElementById('layout-cor-primaria')?.value || '#1B365D';
      const corSecundaria = document.getElementById('layout-cor-secundaria')?.value || '#4A777A';

      const sheet = document.getElementById('layout-preview-sheet');
      const logo = document.getElementById('preview-logo');
      const titulo = document.getElementById('preview-titulo');
      const subtitulo = document.getElementById('preview-subtitulo');
      const conteudo = document.getElementById('preview-conteudo');

      if (!sheet) return;

      sheet.style.fontFamily = fontFamily;

      if (logo) logo.style.color = corPrimaria;
      if (titulo) {
        titulo.style.fontSize = fontSizeTitulo;
        titulo.style.color = corPrimaria;
      }
      if (subtitulo) {
        subtitulo.style.color = corSecundaria;
      }
      if (conteudo) {
        conteudo.style.fontSize = fontSizeBody;
        conteudo.style.lineHeight = lineHeight;
        const paragrafos = conteudo.querySelectorAll('p');
        paragrafos.forEach(p => {
          p.style.marginBottom = pSpacing;
        });
      }
    }

    async function salvarLayoutFront() {
      const btn = document.getElementById('btn-salvar-layout');
      const textoOriginal = btn.innerHTML;
      try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Salvando...</span>';

        const payload = {
          font_family: document.getElementById('layout-font-family').value,
          font_size_body: document.getElementById('layout-font-size-body').value,
          font_size_titulo: document.getElementById('layout-font-size-titulo').value,
          margin_top: document.getElementById('layout-margin-top').value,
          margin_bottom: document.getElementById('layout-margin-bottom').value,
          margin_left: document.getElementById('layout-margin-left').value,
          margin_right: document.getElementById('layout-margin-right').value,
          line_height: document.getElementById('layout-line-height').value,
          paragraph_spacing: document.getElementById('layout-paragraph-spacing').value,
          cor_primaria: document.getElementById('layout-cor-primaria').value,
          cor_secundaria: document.getElementById('layout-cor-secundaria').value
        };

        const res = await fetch('/api/layout-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar layout.');

        layoutAtual = data.layout;
        preencherFormularioLayout(layoutAtual);
        atualizarPreviewLayout();
        alert('Configurações de layout atualizadas com sucesso! Os próximos laudos em PDF e Word aplicarão essas regras automaticamente.');
        fecharModalLayout();
      } catch (err) {
        alert('Erro ao salvar layout: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
      }
    }

    async function restaurarPadraoLayoutFront() {
      if (!confirm('Deseja realmente restaurar as configurações de layout para o padrão oficial da UPA PET?')) {
        return;
      }

      try {
        const res = await fetch('/api/layout-config/reset', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao restaurar layout.');

        layoutAtual = data.layout;
        preencherFormularioLayout(layoutAtual);
        atualizarPreviewLayout();
        alert('Padrão institucional restaurado com sucesso!');
      } catch (err) {
        alert('Erro ao restaurar padrão: ' + err.message);
      }
    }

    // Controle de Abas
    function mudarAba(aba) {
      abaAtual = aba; // Phase 3
      const btnUltra = document.getElementById('tab-btn-ultra');
      const btnCirurg = document.getElementById('tab-btn-cirurg');
      const divUltra = document.getElementById('aba-ultra');
      const divCirurg = document.getElementById('aba-cirurg');
      const btnLayoutUltra = document.getElementById('btn-layout-ultra');

      if (aba === 'ultra') {
        btnUltra.className = 'tab-btn tab-active flex items-center space-x-2 transition rounded-full py-2.5 px-5 text-sm font-semibold text-white bg-sky-500 shadow-md whitespace-nowrap';
        btnCirurg.className = 'tab-btn py-2.5 px-5 text-sm text-slate-600 hover:text-slate-900 flex items-center space-x-2 transition rounded-full border border-slate-300 whitespace-nowrap hover:border-sky-400 hover:bg-sky-50';
        divUltra.classList.remove('hidden');
        divCirurg.classList.add('hidden');
        // Phase 2: Editor de Layout visível apenas na aba Ultrassom
        if (btnLayoutUltra) btnLayoutUltra.classList.remove('hidden');
      } else {
        btnCirurg.className = 'tab-btn tab-active flex items-center space-x-2 transition rounded-full py-2.5 px-5 text-sm font-semibold text-white bg-sky-500 shadow-md whitespace-nowrap';
        btnUltra.className = 'tab-btn py-2.5 px-5 text-sm text-slate-600 hover:text-slate-900 flex items-center space-x-2 transition rounded-full border border-slate-300 whitespace-nowrap hover:border-sky-400 hover:bg-sky-50';
        divCirurg.classList.remove('hidden');
        divUltra.classList.add('hidden');
        // Phase 2: esconder Editor de Layout fora da aba Ultrassom
        if (btnLayoutUltra) btnLayoutUltra.classList.add('hidden');
        if (todosModelosCirurgicos.length === 0) {
          carregarModelosCirurgicosFront();
        }
      }
    }

    function atualizarListaFotosUltra(input) {
      const div = document.getElementById('lista-fotos-ultra');
      if (input.files.length > 0) {
        div.innerHTML = \`📁 \${input.files.length} imagem(ns) selecionada(s): \` + Array.from(input.files).map(f => f.name).join(', ');
      } else {
        div.innerHTML = '';
      }
    }

    function atualizarDocCirurg(input) {
      const div = document.getElementById('nome-doc-cirurg');
      if (input.files.length > 0) {
        div.innerHTML = '📄 Arquivo: ' + input.files[0].name;
      } else {
        div.innerHTML = '';
      }
    }

    function atualizarFotosCirurg(input) {
      const div = document.getElementById('lista-fotos-cirurg');
      if (input.files.length > 0) {
        div.innerHTML = \`📸 \${input.files.length} foto(s) anexa(s): \` + Array.from(input.files).map(f => f.name).join(', ');
      } else {
        div.innerHTML = '';
      }
    }

    async function enviarUltrassom(e) {
      e.preventDefault();
      if (!usuarioAtual || !usuarioAtual.podeGerarLaudos) {
        return alert('Você não tem permissão para gerar laudos.');
      }

      const files = document.getElementById('input-ultra-fotos').files;
      if (files.length === 0) return alert('Selecione pelo menos uma foto para o laudo de ultrassom.');

      const formData = new FormData();
      for (const f of files) formData.append('imagens', f);

      document.getElementById('loading-ultra').classList.remove('hidden');
      document.getElementById('resultado-ultra').classList.add('hidden');
      document.getElementById('btn-ultra-submit').disabled = true;

      try {
        const res = await fetch('/api/ultrassom', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao processar laudo.');

        document.getElementById('info-paciente-ultra').innerHTML = \`
          <strong>🐾 Paciente:</strong> \${data.paciente.nome || 'Não identificado'} | 
          <strong>Tutor:</strong> \${data.paciente.tutor || 'Não informado'} | 
          <strong>Espécie:</strong> \${data.paciente.especie || 'Canina/Felina'}
        \`;
        document.getElementById('btn-download-ultra-pdf').href = data.pdfUrl;
        document.getElementById('btn-download-ultra-docx').href = data.docxUrl;
        document.getElementById('resultado-ultra').classList.remove('hidden');
      } catch (err) {
        alert('Erro: ' + err.message);
      } finally {
        document.getElementById('loading-ultra').classList.add('hidden');
        document.getElementById('btn-ultra-submit').disabled = false;
      }
    }

    async function enviarCirurgia(e) {
      e.preventDefault();
      if (!usuarioAtual || !usuarioAtual.podeGerarCirurgia) {
        return alert('Você não tem permissão para gerar relatórios cirúrgicos.');
      }

      const docInput = document.getElementById('input-cirurg-doc').files;
      const fotoInput = document.getElementById('input-cirurg-fotos').files;

      if (docInput.length === 0 && fotoInput.length === 0) {
        return alert('Selecione o arquivo da cirurgia (.docx, .pages, .txt ou áudio).');
      }

      const formData = new FormData();
      if (docInput.length > 0) formData.append('documento', docInput[0]);
      for (const f of fotoInput) formData.append('fotos', f);

      document.getElementById('loading-cirurg').classList.remove('hidden');
      document.getElementById('resultado-cirurg').classList.add('hidden');
      document.getElementById('btn-cirurg-submit').disabled = true;

      try {
        const res = await fetch('/api/cirurgia', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao processar cirurgia.');

        document.getElementById('info-paciente-cirurg').innerHTML = \`
          <strong>🐾 Paciente:</strong> \${data.paciente.nome || 'Paciente'} | 
          <strong>Procedimento:</strong> \${data.cirurgia.procedimento || 'Cirurgia'}<br>
          <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Modelo institucional correspondente aplicado com sucesso!</span>
        \`;
        document.getElementById('btn-download-cirurg-pdf').href = data.pdfUrl;
        document.getElementById('btn-download-cirurg-docx').href = data.docxUrl;
        document.getElementById('resultado-cirurg').classList.remove('hidden');
      } catch (err) {
        alert('Erro: ' + err.message);
      } finally {
        document.getElementById('loading-cirurg').classList.add('hidden');
        btnSubmitCirurg.disabled = false;
      }
    }

    // ==========================================
    // FUNÇÕES DA BIBLIOTECA DE MODELOS CIRÚRGICOS
    // ==========================================

    async function carregarModelosCirurgicosFront() {
      try {
        const res = await fetch('/api/modelos-cirurgicos');
        const data = await res.json();
        if (data && data.modelos) {
          todosModelosCirurgicos = data.modelos;
          const badge = document.getElementById('badge-total-modelos');
          if (badge) badge.innerText = \`\${todosModelosCirurgicos.length} modelo(s)\`;
          renderizarCardsModelos(todosModelosCirurgicos);
        }
      } catch (err) {
        console.error('Erro ao carregar modelos cirúrgicos:', err);
      }
    }

    function renderizarCardsModelos(modelos) {
      const grid = document.getElementById('grid-modelos-cirurgicos');
      if (!grid) return;

      if (!modelos || modelos.length === 0) {
        grid.innerHTML = \`
          <div class="col-span-full py-8 text-center bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
            <i class="fa-solid fa-magnifying-glass mb-2 text-base text-slate-400 dark:text-slate-300 block"></i>
            Nenhum modelo cirúrgico encontrado para a busca.
          </div>
        \`;
        return;
      }

      const podeEditar = !!(usuarioAtual && (usuarioAtual.podeGerarCirurgia || usuarioAtual.role === 'admin' || usuarioAtual.role === 'veterinario'));

      grid.innerHTML = modelos.map(m => {
        const sinonimosArray = Array.isArray(m.sinonimos) ? m.sinonimos : [];
        const sinonimosExibicao = sinonimosArray.slice(0, 3);
        const restanteSinonimos = sinonimosArray.length - 3;
        const descricaoCurta = (m.descricaoProcedimento || '').substring(0, 130);

        return \`
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-300 hover:shadow-sm rounded-xl p-3.5 transition flex flex-col justify-between group">
            <div>
              <div class="flex items-start justify-between gap-2 mb-1">
                <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-1 group-hover:text-sky-600 transition" title="\${m.nome}">
                  \${m.nome}
                </h4>
                <span class="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">\${m.id}</span>
              </div>
              <p class="text-[11px] text-sky-700 font-medium mb-2 line-clamp-1">
                <i class="fa-solid fa-stethoscope mr-1 opacity-70"></i>\${m.procedimento || m.nome}
              </p>

              <!-- Tags / Sinônimos -->
              <div class="flex flex-wrap gap-1 mb-2">
                \${sinonimosExibicao.map(s => \`<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-medium">\${s}</span>\`).join('')}
                \${restanteSinonimos > 0 ? \`<span class="bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 text-[9px] px-1 py-0.5 rounded">+\${restanteSinonimos}</span>\` : ''}
              </div>

              <!-- Prévia da Técnica -->
              <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                \${descricaoCurta}...
              </p>
            </div>

            <!-- Rodapé com Ações -->
            <div class="flex items-center justify-end space-x-1.5 pt-2 border-t border-slate-100">
              <button type="button" onclick="visualizarModeloCirurgico('\${m.id}')" class="text-xs text-sky-600 hover:text-sky-800 hover:bg-sky-50 px-2.5 py-1 rounded font-medium transition flex items-center space-x-1">
                <i class="fa-solid fa-eye text-xs"></i>
                <span>Ver Detalhes</span>
              </button>
              \${podeEditar ? \`
                <button type="button" onclick="abrirModalFormModelo('\${m.id}')" class="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2.5 py-1 rounded font-medium transition flex items-center space-x-1">
                  <i class="fa-solid fa-pen-to-square text-xs"></i>
                  <span>Editar</span>
                </button>
              \` : ''}
            </div>
          </div>
        \`;
      }).join('');
    }

    function filtrarModelosCirurgicos(termo) {
      const q = (termo || '').toLowerCase().trim();
      if (!q) {
        renderizarCardsModelos(todosModelosCirurgicos);
        return;
      }

      const filtrados = todosModelosCirurgicos.filter(m => {
        const nome = (m.nome || '').toLowerCase();
        const proc = (m.procedimento || '').toLowerCase();
        const diag = (m.diagnosticoPreCirurgico || '').toLowerCase();
        const desc = (m.descricaoProcedimento || '').toLowerCase();
        const sin = (m.sinonimos || []).join(' ').toLowerCase();

        return nome.includes(q) || proc.includes(q) || diag.includes(q) || desc.includes(q) || sin.includes(q);
      });

      renderizarCardsModelos(filtrados);
    }

    function visualizarModeloCirurgico(id) {
      const m = todosModelosCirurgicos.find(item => item.id === id);
      if (!m) return;

      document.getElementById('vis-modelo-nome').innerText = m.nome;
      document.getElementById('vis-modelo-procedimento').innerText = m.procedimento || m.nome;
      document.getElementById('vis-modelo-diag').innerText = m.diagnosticoPreCirurgico || 'Não informado / A critério clínico';
      document.getElementById('vis-modelo-desc').innerText = m.descricaoProcedimento || 'Nenhuma técnica cadastrada.';
      document.getElementById('vis-modelo-evol').innerText = m.evolucaoConsideracoes || 'Sem considerações adicionais cadastradas.';
      document.getElementById('vis-modelo-id').innerText = \`ID: \${m.id}.json\`;

      const sinContainer = document.getElementById('vis-modelo-sinonimos');
      if (m.sinonimos && m.sinonimos.length > 0) {
        sinContainer.innerHTML = m.sinonimos.map(s => \`
          <span class="bg-sky-50 text-sky-700 border border-sky-200 text-[11px] px-2 py-0.5 rounded-full font-medium">\${s}</span>
        \`).join('');
      } else {
        sinContainer.innerHTML = '<span class="text-slate-400 dark:text-slate-300 italic">Nenhum sinônimo cadastrado</span>';
      }

      const btnEdit = document.getElementById('btn-vis-editar');
      const podeEditar = !!(usuarioAtual && (usuarioAtual.podeGerarCirurgia || usuarioAtual.role === 'admin' || usuarioAtual.role === 'veterinario'));
      if (podeEditar) {
        btnEdit.classList.remove('hidden');
        btnEdit.onclick = () => {
          fecharModalVisualizarModelo();
          abrirModalFormModelo(m.id);
        };
      } else {
        btnEdit.classList.add('hidden');
      }

      document.getElementById('modal-modelo-visualizar').classList.remove('hidden');
    }

    function fecharModalVisualizarModelo() {
      document.getElementById('modal-modelo-visualizar').classList.add('hidden');
    }

    function abrirModalFormModelo(id) {
      const podeEditar = !!(usuarioAtual && (usuarioAtual.podeGerarCirurgia || usuarioAtual.role === 'admin' || usuarioAtual.role === 'veterinario'));
      if (!podeEditar) {
        return alert('Você não tem autorização para cadastrar ou editar modelos cirúrgicos.');
      }

      const modal = document.getElementById('modal-modelo-form');
      const titulo = document.getElementById('form-modelo-titulo');
      const erroDiv = document.getElementById('form-mod-erro');
      const btnExcluir = document.getElementById('btn-form-excluir');

      erroDiv.classList.add('hidden');
      erroDiv.innerText = '';

      if (id) {
        // Edição
        const m = todosModelosCirurgicos.find(item => item.id === id);
        if (!m) return alert('Modelo cirúrgico não encontrado.');

        titulo.innerHTML = '<i class="fa-solid fa-pen-to-square text-sky-600"></i><span>Editar Modelo Cirúrgico</span>';
        document.getElementById('form-mod-id').value = m.id;
        document.getElementById('form-mod-nome').value = m.nome || '';
        document.getElementById('form-mod-procedimento').value = m.procedimento || '';
        document.getElementById('form-mod-diag').value = m.diagnosticoPreCirurgico || '';
        document.getElementById('form-mod-sinonimos').value = (m.sinonimos || []).join(', ');
        document.getElementById('form-mod-desc').value = m.descricaoProcedimento || '';
        document.getElementById('form-mod-evol').value = m.evolucaoConsideracoes || '';

        if (usuarioAtual && usuarioAtual.role === 'admin') {
          btnExcluir.classList.remove('hidden');
        } else {
          btnExcluir.classList.add('hidden');
        }
      } else {
        // Criação de novo modelo
        titulo.innerHTML = '<i class="fa-solid fa-plus text-emerald-600"></i><span>Novo Modelo Cirúrgico</span>';
        document.getElementById('form-mod-id').value = '';
        document.getElementById('form-mod-nome').value = '';
        document.getElementById('form-mod-procedimento').value = '';
        document.getElementById('form-mod-diag').value = '';
        document.getElementById('form-mod-sinonimos').value = '';
        document.getElementById('form-mod-desc').value = '';
        document.getElementById('form-mod-evol').value = '';
        btnExcluir.classList.add('hidden');
      }

      modal.classList.remove('hidden');
    }

    function fecharModalFormModelo() {
      document.getElementById('modal-modelo-form').classList.add('hidden');
    }

    async function salvarModeloCirurgico(e) {
      e.preventDefault();
      const btnSalvar = document.getElementById('btn-form-salvar');
      const erroDiv = document.getElementById('form-mod-erro');

      const id = document.getElementById('form-mod-id').value;
      const nome = document.getElementById('form-mod-nome').value.trim();
      const procedimento = document.getElementById('form-mod-procedimento').value.trim();
      const diagnosticoPreCirurgico = document.getElementById('form-mod-diag').value.trim();
      const sinonimosStr = document.getElementById('form-mod-sinonimos').value;
      const descricaoProcedimento = document.getElementById('form-mod-desc').value.trim();
      const evolucaoConsideracoes = document.getElementById('form-mod-evol').value.trim();

      const sinonimos = sinonimosStr.split(',').map(s => s.trim()).filter(Boolean);

      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i><span>Salvando...</span>';
      erroDiv.classList.add('hidden');

      try {
        const res = await fetch('/api/modelos-cirurgicos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id || undefined,
            nome,
            procedimento,
            diagnosticoPreCirurgico,
            sinonimos,
            descricaoProcedimento,
            evolucaoConsideracoes
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar modelo.');

        fecharModalFormModelo();
        await carregarModelosCirurgicosFront();
        alert(\`Modelo cirúrgico "\${data.modelo.nome}" salvo com sucesso e pronto para uso da IA!\`);
      } catch (err) {
        erroDiv.innerText = err.message;
        erroDiv.classList.remove('hidden');
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>Salvar Modelo</span>';
      }
    }

    async function excluirModeloAtual() {
      const id = document.getElementById('form-mod-id').value;
      const nome = document.getElementById('form-mod-nome').value;
      if (!id) return;

      if (!confirm(\`Tem certeza que deseja excluir o modelo "\${nome}"?\\nEsta ação removerá o arquivo institucional e não pode ser desfeita.\`)) {
        return;
      }

      try {
        const res = await fetch(\`/api/modelos-cirurgicos/\${encodeURIComponent(id)}\`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir modelo.');

        fecharModalFormModelo();
        await carregarModelosCirurgicosFront();
        alert('Modelo cirúrgico excluído com sucesso.');
      } catch (err) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  </script>
</body>
</html>`);
});

// ============ Tratamento de falhas críticas (não-crashing, com log estruturado) ============
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { stack: err.stack, message: err.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const stack = reason && reason.stack;
  const message = reason && reason.message ? reason.message : String(reason);
  logger.error('unhandledRejection', { stack, message });
});

(async function bootServidor() {
  try {
    // 0.5. Tokens no Key Value (Opção B — free tier, disco efêmero): se o
    //     .tokens.json sumiu no disco e a instância Key Value foi configurada,
    //     recupera os tokens do Google Drive antes de qualquer restore.
    if (!fs.existsSync(backupDb.TOKENS_FILE)) {
      const t = process.env.REDIS_URL
        ? await backupDb.carregarTokensDoKeyValue().catch((err) => {
            console.error('[restore] falha ao carregar tokens do Key Value:', err.message);
            return null;
          })
        : null;
      if (t) {
        fs.mkdirSync(path.dirname(backupDb.TOKENS_FILE), { recursive: true });
        fs.writeFileSync(backupDb.TOKENS_FILE, JSON.stringify(t, null, 2));
        backupDb.carregarTokens();
        console.log('[restore] tokens do Google Drive recuperados do Key Value.');
      } else if (process.env.REDIS_URL) {
        console.log('[restore] sem tokens no Key Value — backup desativado até /backup/setup.');
      }
    }

    // 1. Restore do Drive: se o arquivo do banco não existir no disco (Render
    //    em redeploy/restart novo) e houver backup autorizado, baixa o mais
    //    recente para o DB_PATH.
    const r = await backupDb.tentarRestoreBackup().catch((err) => {
      console.error('[restore] falha:', err.message);
      return { restaurado: false, motivo: 'erro no restore (usando seed padrão)' };
    });
    if (r && r.restaurado) {
      console.log(`[restore] banco restaurado de ${r.arquivo}.`);
    }

    // 2. Seed dos dados padrão (idempotente: só repõe o que falta).
    executarSeed();

    // 2.5. Sincroniza modelos dos JSONs para o SQLite (idempotente — pode rodar a cada boot)
    try {
      if (process.env.NODE_ENV !== 'test') {
        syncModelosDoJson();
      }
    } catch (err) {
      console.error('[sync] falha ao sincronizar modelos:', err.message);
    }

    // 3. Intervalo de backup + último upload antes do encerramento.
    if (backupDb.obterStatus().configurado) {
      backupDb.start();
      process.on('SIGTERM', () => backupDb.parar());
      process.on('SIGINT', () => backupDb.parar());
      console.log('[backup] intervalos de backup agendados.');
    }

    const server = app.listen(PORT, () => {
      backupDb.marcarServidor(server);
      logger.info('Servidor inicializado', {
        porta: PORT,
        url: `http://localhost:${PORT}`,
        service: 'UPA PET - Automacao',
        dbPath: require('./db').getDbPath()
      });
      console.log(`==================================================================`);
      console.log(`🚀 UPA PET - SERVIDOR WEB COM GOOGLE SSO ATIVO NA PORTA ${PORT}`);
      console.log(`🔗 Acesso local: http://localhost:${PORT}`);
      console.log(`==================================================================`);
    });
  } catch (err) {
    logger.error('[boot] falha na inicialização', { stack: err.stack, message: err.message });
    process.exit(1);
  }
})();

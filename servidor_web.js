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
      /* Dark mode: select & input text visibility */
    .dark select, .dark input[type="text"], .dark input[type="number"] { color: #ffffff; }
    .dark select option { color: #ffffff; background-color: #0f172a; }
    .dark select:hover, .dark select:focus { color: #ffffff; }
    .dark input::placeholder { color: #94a3b8; }
    /* Dark mode: ensure select option text is white */
    .dark select option:hover, .dark select option[selected] {
      color: #ffffff;
      background-color: #1e293b;
    }
</style>
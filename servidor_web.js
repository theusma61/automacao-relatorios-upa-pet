try { require('dotenv').config(); } catch (_) {}
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const zlib = require('zlib');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const { prisma } = require('./db');
const { fecharBrowserCompartilhado } = require('./compilador_pdf');
const {
  analisarExameComIA,
  obterConfigIaRuntime,
  salvarConfigIaRuntime,
  isAmbienteLocalSeguro,
  deveUsarMockLocal
} = require('./analisador_ia');
const { gerarDocumentosExame } = require('./motor_laudo');
const { analisarCirurgiaComIA } = require('./analisador_cirurgia');
const { gerarDocumentosCirurgicos, gerarPdfCirurgico } = require('./motor_cirurgia');
const {
  carregarModelosCirurgicos,
  obterModeloPorId,
  salvarOuCriarModelo,
  clonarModeloParaUsuario,
  excluirModelo,
  syncModelosDoJson,
  inferirModeloPorTexto
} = require('./gerenciador_modelos');
const {
  obterLayout,
  salvarLayout,
  salvarTemplateClonado,
  restaurarLayoutPadrao
} = require('./gerenciador_layout');
const {
  extrairPadraoCompletoDePdfs
} = require('./extrator_padrao_laudo');
const { extrairPadraoDeLaudos } = require('./identificador_padrao_laudo');
const {
  obterPerfilLaudo,
  salvarPerfilLaudo,
  desativarPerfilLaudo
} = require('./gerenciador_perfil_laudo');
const { extrairPadraoDeCirurgias } = require('./identificador_padrao_cirurgia');
const {
  obterPerfilCirurgico,
  salvarPerfilCirurgico,
  desativarPerfilCirurgico
} = require('./gerenciador_perfil_cirurgico');
const {
  ROLES,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario,
  atualizarPlanoUsuario,
  obterTemaUsuario,
  atualizarTemaUsuario,
  atualizarPerfilProfissional
} = require('./gerenciador_usuarios');
const {
  obterMetricasUsoAssinatura,
  atualizarPlanoAssinatura,
  verificarLimiteCotaUltrassom,
  reservarSlotCotaUltrassom,
  liberarSlotCotaUltrassom
} = require('./gerenciador_assinatura');
const {
  isStripeConfigurado,
  criarSessaoCheckout,
  criarSessaoPortal,
  confirmarSessaoCheckout,
  processarWebhookStripe
} = require('./servico_stripe');
const {
  registrarTelemetriaEdicao,
  obterRankingTelemetriaEdicoes
} = require('./telemetria_edicoes');
const {
  gerarPublicToken,
  montarUrlPublica,
  prepararDadosQrCodeCompartilhamento,
  isBotPreviewWhatsApp,
  gerarResumoTutorIA,
  renderizarPaginaPublicaLaudo,
  renderizarPaginaIndisponivel
} = require('./servico_compartilhamento');
const {
  isCrawlerSemJs,
  renderizarLandingSemanticaParaCrawler
} = require('./servico_seo');
const {
  normalizarNumeroDecimal,
  obterLimiteClinicasPorPlano,
  podeExportarExtratoPdfOficial,
  resolverIntervaloMes,
  calcularValoresFinanceirosExame,
  agregarResumoFinanceiro,
  gerarCsvLancamentos,
  gerarPdfExtratoCobranca
} = require('./servico_volante');

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

const { executarSeed } = require('./seed');

const configPath = path.join(__dirname, 'config.json');
let config = { geminiApiKey: '', googleClientId: '' };
if (fs.existsSync(configPath)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch (_) {}
}

const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || config.googleClientId || '').trim();
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET não definido em ambiente de produção. Abortando inicialização.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_jwt_secret_change_in_production';
const PORT = process.env.PORT || 3000;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const ALLOWED_ORIGINS = new Set(
  [
    'https://vetaro.com.br',
    'https://www.vetaro.com.br',
    (process.env.APP_BASE_URL || '').trim().replace(/\/+$/, ''),
    ...((process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/+$/, ''))),
    ...(!isProduction ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'] : [])
  ].filter(Boolean)
);

function resolverOriginSeguro(req) {
  const envBase = (process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envBase) return envBase;
  const reqOrigin = (req.headers.origin || '').trim().replace(/\/+$/, '');
  if (reqOrigin && ALLOWED_ORIGINS.has(reqOrigin)) return reqOrigin;
  return 'https://vetaro.com.br';
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(cors((req, cb) => {
  const origin = (req.headers.origin || '').trim().replace(/\/+$/, '');
  if (!origin || ALLOWED_ORIGINS.has(origin)) {
    return cb(null, { origin: true, credentials: true });
  }
  // Permite requisições same-origin (ex.: assets <script crossorigin> rodando em localhost:3000 via Docker)
  try {
    const reqHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const originHost = new URL(origin).host.toLowerCase();
    if (reqHost && originHost === reqHost) {
      return cb(null, { origin: true, credentials: true });
    }
  } catch (_) {}
  return cb(null, { origin: false });
}));
app.use(cookieParser());

// Compressão HTTP Gzip nativa (zero dependências extras) para payloads JSON/HTML/JS/CSS >= 1 KB
app.use((req, res, next) => {
  if (req.method === 'HEAD' || req.path === '/api/stripe/webhook') return next();
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  if (!acceptEncoding.toLowerCase().includes('gzip')) return next();

  const origSend = res.send.bind(res);
  res.send = function compressedSend(body) {
    if (res.headersSent || res.getHeader('Content-Encoding') || body == null) {
      return origSend(body);
    }
    const ct = String(res.getHeader('Content-Type') || '');
    const isCompressible =
      !ct ||
      /^(text\/|application\/(json|javascript|xml|xhtml\+xml)|image\/svg\+xml)/i.test(ct);
    if (!isCompressible) return origSend(body);

    const buf = Buffer.isBuffer(body)
      ? body
      : (typeof body === 'string' ? Buffer.from(body, 'utf8') : null);
    if (!buf || buf.length < 1024) return origSend(body);

    try {
      const zipped = zlib.gzipSync(buf, { level: 6 });
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', zipped.length);
      return origSend(zipped);
    } catch (_) {
      return origSend(body);
    }
  };
  return next();
});

const skipRateLimit = () => process.env.NODE_ENV === 'test';
const limiterApiGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipRateLimit() || req.path === '/stripe/webhook',
  message: { error: 'Muitas requisições em curto período. Aguarde alguns instantes e tente novamente.' }
});
const limiterLinkPublico = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimit(),
  message: 'Muitas solicitações para este link. Aguarde um instante e tente novamente.'
});
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  message: { error: 'Muitas tentativas de autenticação. Aguarde alguns minutos.' }
});
const limiterGeracaoPesada = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 35,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  message: { error: 'Limite de gerações/compilações temporário atingido. Aguarde alguns minutos.' }
});

// Webhook Stripe MUST be registered BEFORE express.json() so raw payload signature verification works
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Stripe signature header ausente.');
  }
  try {
    const resultado = await processarWebhookStripe(req.body, sig);
    return res.json(resultado);
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao validar/processar webhook Stripe');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const uploadDir = path.join(os.tmpdir(), 'upa_pet_uploads');
const persistentUploadDir = process.env.UPLOAD_PERSISTENT_DIR
  ? path.resolve(process.env.UPLOAD_PERSISTENT_DIR)
  : path.join(__dirname, 'uploads');
const logosDir = path.join(persistentUploadDir, 'logos');
const assinaturasDir = path.join(persistentUploadDir, 'assinaturas');
const templatesDir = path.join(persistentUploadDir, 'templates');
const templatesCirurgiaDir = path.join(persistentUploadDir, 'templates_cirurgia');
const amostrasPadraoDir = path.join(persistentUploadDir, 'amostras_padrao');
const outputDir = process.env.OUTPUT_PERSISTENT_DIR
  ? path.resolve(process.env.OUTPUT_PERSISTENT_DIR)
  : path.join(os.tmpdir(), 'upa_pet_outputs');

[uploadDir, persistentUploadDir, logosDir, assinaturasDir, templatesDir, templatesCirurgiaDir, amostrasPadraoDir, outputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Arquivos em /uploads são servidos via rotas autenticadas abaixo (nunca expor amostras_padrao/ publicamente).

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const ALLOWED_UPLOAD_EXT = /\.(png|jpe?g|webp|pdf|docx?|pages|txt|mp3|wav|m4a|ogg|webm|aac)$/i;
const ALLOWED_UPLOAD_MIME_PREFIXES = ['image/', 'audio/', 'text/plain'];
const ALLOWED_UPLOAD_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.apple.pages',
  'application/octet-stream'
]);
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 25 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (ext === '.svg' || mime === 'image/svg+xml') {
      return cb(new Error('Arquivos SVG não são permitidos por segurança.'));
    }
    const extOk = ALLOWED_UPLOAD_EXT.test(ext);
    const mimeOk = ALLOWED_UPLOAD_MIMES.has(mime) || ALLOWED_UPLOAD_MIME_PREFIXES.some((p) => mime.startsWith(p));
    if (extOk && mimeOk) {
      return cb(null, true);
    }
    return cb(new Error(`Formato de arquivo não suportado (${ext || mime || 'desconhecido'}).`));
  }
});

const storagePerfil = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'assinatura') return cb(null, assinaturasDir);
    return cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const userIdSafe = (req.usuario && req.usuario.id) ? String(req.usuario.id).replace(/[^a-zA-Z0-9_-]/g, '') : 'user';
    cb(null, `${file.fieldname}_${userIdSafe}_${Date.now()}${ext}`);
  }
});
const uploadPerfil = multer({
  storage: storagePerfil,
  limits: { fileSize: 10 * 1024 * 1024, files: 2 }, // 10MB por imagem
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (ext === '.svg' || mime === 'image/svg+xml') {
      return cb(new Error('Arquivos SVG não são permitidos. Envie PNG, JPG, JPEG ou WEBP.'));
    }
    if (/\.(png|jpe?g|webp)$/i.test(ext) && ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagem inválido. Formatos suportados: PNG, JPG, JPEG ou WEBP.'));
    }
  }
});

const storagePdfsPadrao = multer.diskStorage({
  destination: (req, file, cb) => {
    const userSubdir = path.join(amostrasPadraoDir, (req.usuario && req.usuario.id) ? String(req.usuario.id).replace(/[^a-zA-Z0-9_-]/g, '') : 'temp');
    if (!fs.existsSync(userSubdir)) fs.mkdirSync(userSubdir, { recursive: true });
    cb(null, userSubdir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${safeName}${ext}`);
  }
});
const uploadPdfsPadrao = multer({
  storage: storagePdfsPadrao,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB por PDF
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Apenas arquivos PDF (.pdf) são aceitos para aprendizado de padrão.'));
    }
  }
});

async function obterUsuarioSessao(req, res, next) {
  const token = req.cookies?.upa_pet_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    req.usuario = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = await obterPerfilUsuario(decoded.email, decoded.nome, decoded.foto);
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
        error: `Acesso restrito: Sua conta (${req.usuario.email}) não possui permissão para gerar este documento. Apenas veterinários autorizados podem emitir laudos e relatórios oficiais.`
      });
    }
    next();
  };
}

app.use(obterUsuarioSessao);
app.use('/api', limiterApiGeral);

function usuarioPodeAcessarSubdirUpload(req, userIdParam) {
  if (!req.usuario) return false;
  if (req.usuario.role === 'admin') return true;
  const userIdSafe = String(req.usuario.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return Boolean(userIdSafe && userIdParam === userIdSafe);
}

function enviarArquivoUploadSeguro(res, baseDir, filename) {
  const safeName = path.basename(filename || '');
  const fullPath = path.resolve(baseDir, safeName);
  const resolvedBase = path.resolve(baseDir) + path.sep;
  if (!fullPath.startsWith(resolvedBase) || !fs.existsSync(fullPath)) {
    return res.status(404).end();
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.sendFile(fullPath);
}

// Rotas protegidas de uploads (substituem o antigo express.static aberto que expunha amostras_padrao e assinaturas)
['/uploads', '/app/uploads'].forEach((prefix) => {
  app.get(`${prefix}/logos/:filename`, exigirAutenticacao, (req, res) => {
    return enviarArquivoUploadSeguro(res, logosDir, req.params.filename);
  });

  app.get(`${prefix}/assinaturas/:filename`, exigirAutenticacao, (req, res) => {
    const safeName = path.basename(req.params.filename || '');
    const userIdSafe = String(req.usuario.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const pertenceAoUsuario =
      req.usuario.role === 'admin' ||
      (userIdSafe && safeName.includes(`_${userIdSafe}_`)) ||
      (typeof req.usuario.assinaturaUrl === 'string' && path.basename(req.usuario.assinaturaUrl) === safeName);
    if (!pertenceAoUsuario) {
      return res.status(403).end();
    }
    return enviarArquivoUploadSeguro(res, assinaturasDir, safeName);
  });

  app.get(`${prefix}/templates/:userId/:filename`, exigirAutenticacao, (req, res) => {
    const safeUser = path.basename(req.params.userId || '');
    if (!usuarioPodeAcessarSubdirUpload(req, safeUser)) {
      return res.status(403).end();
    }
    return enviarArquivoUploadSeguro(res, path.join(templatesDir, safeUser), req.params.filename);
  });

  app.get(`${prefix}/templates_cirurgia/:userId/:filename`, exigirAutenticacao, (req, res) => {
    const safeUser = path.basename(req.params.userId || '');
    if (!usuarioPodeAcessarSubdirUpload(req, safeUser)) {
      return res.status(403).end();
    }
    return enviarArquivoUploadSeguro(res, path.join(templatesCirurgiaDir, safeUser), req.params.filename);
  });
});

async function verificarDonoDoJob(safeJobId, usuario) {
  if (!usuario) return false;
  if (usuario.role === 'admin') return true;
  const jobFolder = path.join(outputDir, safeJobId);

  for (const metaNome of ['meta_exame.json', 'meta_cirurgia.json']) {
    const metaPath = path.join(jobFolder, metaNome);
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta && meta.usuarioId) {
          return String(meta.usuarioId) === String(usuario.id);
        }
      } catch (_) {}
    }
  }

  try {
    const [exame, cirurgia] = await Promise.all([
      prisma.exameLaudo.findFirst({
        where: { pdfArquivo: { contains: safeJobId } },
        select: { usuarioId: true }
      }),
      prisma.relatorioCirurgico.findFirst({
        where: { pdfArquivo: { contains: safeJobId } },
        select: { usuarioId: true }
      })
    ]);
    const donoId = exame?.usuarioId || cirurgia?.usuarioId || null;
    if (donoId) {
      return String(donoId) === String(usuario.id);
    }
  } catch (_) {}

  return false;
}

app.get('/api/auth/config', (req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
    ssoAtivo: !!GOOGLE_CLIENT_ID
  });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.usuario) {
    return res.json({ usuario: null });
  }
  try {
    const cotaUltrassom = await verificarLimiteCotaUltrassom(req.usuario.id);
    res.json({
      usuario: {
        ...req.usuario,
        cotaUltrassom
      }
    });
  } catch (_) {
    res.json({
      usuario: req.usuario
    });
  }
});

app.post('/api/auth/google', limiterAuth, validate(authSchemas.googleLogin, 'body'), async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Token de credencial do Google não fornecido.' });
  }
  if (!googleClient) {
    return res.status(503).json({ error: 'Autenticação Google SSO não configurada no servidor (GOOGLE_CLIENT_ID ausente).' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || payload.email_verified === false) {
      return res.status(401).json({ error: 'Conta Google sem e-mail verificado.' });
    }
    const email = payload.email;
    const nome = payload.name;
    const foto = payload.picture;

    const perfil = await obterPerfilUsuario(email, nome, foto);

    const token = jwt.sign(
      { id: perfil.id, email: perfil.email, nome: perfil.nome, role: perfil.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('upa_pet_token');
  res.json({ sucesso: true });
});

app.get('/api/admin/usuarios', exigirAutenticacao, validateQuery(adminSchemas.listUsersQuery), async (req, res) => {
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem gerenciar acessos.' });
  }
  try {
    const usuarios = await listarUsuarios();
    res.json({ usuarios });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/usuarios/role', exigirAutenticacao, validate(adminSchemas.updateRole, 'body'), async (req, res) => {
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem alterar permissões.' });
  }
  const { email, role } = req.body;
  try {
    const usuarioAtualizado = await atualizarCargoUsuario(email, role);
    res.json({ sucesso: true, usuario: usuarioAtualizado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/usuarios/plano', exigirAutenticacao, validate(adminSchemas.updatePlano, 'body'), async (req, res) => {
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem alterar licenças e planos de usuários.' });
  }
  const { email, plano } = req.body;
  try {
    const usuarioAtualizado = await atualizarPlanoUsuario(email, plano);
    res.json({ sucesso: true, usuario: usuarioAtualizado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/perfil/profissional', exigirAutenticacao, (req, res, next) => {
  uploadPerfil.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'assinatura', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      logger.error('Erro de upload de arquivo no perfil profissional', { error: err.message });
      return res.status(400).json({ error: `Erro ao enviar arquivo: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const logoFile = req.files && req.files.logo ? req.files.logo[0] : null;
    const assinaturaFile = req.files && req.files.assinatura ? req.files.assinatura[0] : null;

    const dados = {
      nome: req.body.nome,
      crmv: req.body.crmv,
      nomeClinica: req.body.nomeClinica,
      ...(req.body.chavePix !== undefined ? { chavePix: req.body.chavePix } : {})
    };
    if (logoFile) dados.logoUrl = `/uploads/logos/${logoFile.filename}`;
    if (assinaturaFile) dados.assinaturaUrl = `/uploads/assinaturas/${assinaturaFile.filename}`;

    const atualizado = await atualizarPerfilProfissional(req.usuario.id, dados);

    // Espelhamento para diretórios de templates (laudos e cirurgia) do usuário para redundância máxima
    const userIdSafe = String(req.usuario.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const pastaTemplatesUsuario = path.join(templatesDir, userIdSafe);
    const pastaTemplatesCirurgiaUsuario = path.join(templatesCirurgiaDir, userIdSafe);
    [pastaTemplatesUsuario, pastaTemplatesCirurgiaUsuario].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
      }
    });

    if (logoFile && fs.existsSync(logoFile.path)) {
      const ext = path.extname(logoFile.path).toLowerCase() || '.png';
      [pastaTemplatesUsuario, pastaTemplatesCirurgiaUsuario].forEach((destDir) => {
        try {
          fs.copyFileSync(logoFile.path, path.join(destDir, `header_logo${ext}`));
          if (ext !== '.png') {
            fs.copyFileSync(logoFile.path, path.join(destDir, 'header_logo.png'));
          }
        } catch (_) {}
      });

      try {
        const layoutUsuario = await prisma.configuracaoLayout.findFirst({
          where: { usuarioId: req.usuario.id }
        });
        if (layoutUsuario) {
          const visualAtual =
            layoutUsuario.visualConfigJson && typeof layoutUsuario.visualConfigJson === 'object'
              ? layoutUsuario.visualConfigJson
              : {};
          await prisma.configuracaoLayout.update({
            where: { id: layoutUsuario.id },
            data: {
              visualConfigJson: {
                ...visualAtual,
                headerLogoUrl: `/uploads/logos/${logoFile.filename}`
              }
            }
          });
        }
      } catch (_) {}
    }

    if (assinaturaFile && fs.existsSync(assinaturaFile.path)) {
      const ext = path.extname(assinaturaFile.path).toLowerCase() || '.png';
      try {
        fs.copyFileSync(assinaturaFile.path, path.join(pastaTemplatesUsuario, `signature${ext}`));
        if (ext !== '.png') {
          fs.copyFileSync(assinaturaFile.path, path.join(pastaTemplatesUsuario, 'signature.png'));
        }
      } catch (_) {}

      try {
        const layoutUsuario = await prisma.configuracaoLayout.findFirst({
          where: { usuarioId: req.usuario.id }
        });
        if (layoutUsuario) {
          await prisma.configuracaoLayout.update({
            where: { id: layoutUsuario.id },
            data: { assinaturaExtraidaUrl: assinaturaFile.path }
          });
        }
      } catch (_) {}
    }

    logger.info({
      usuarioId: req.usuario.id,
      email: req.usuario.email,
      logoSalva: dados.logoUrl || null,
      assinaturaSalva: dados.assinaturaUrl || null
    }, 'Perfil profissional e identidade visual atualizados com sucesso');

    res.json({ sucesso: true, usuario: atualizado });
  } catch (err) {
    logger.error('Erro ao atualizar perfil profissional', { error: err.message });
    res.status(400).json({ error: 'Erro ao atualizar perfil: ' + err.message });
  }
});

app.get('/api/usuario/tema', exigirAutenticacao, async (req, res) => {
  try {
    const tema = await obterTemaUsuario(req.usuario.email);
    res.json({ sucesso: true, tema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuario/tema', exigirAutenticacao, validate(temaSchemas.updateTema, 'body'), async (req, res) => {
  try {
    const tema = await atualizarTemaUsuario(req.usuario.email, req.body.tema);
    res.json({ sucesso: true, tema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Vetaro SaaS Automacao Multi-Tenant',
    database: 'postgresql',
    frontend: 'react-vite',
    uptime: process.uptime()
  });
});

app.get('/downloads/:jobId/fotos/:filename', exigirAutenticacao, async (req, res) => {
  const safeJobId = path.basename(req.params.jobId);
  const safeFilename = path.basename(req.params.filename);
  const autorizado = await verificarDonoDoJob(safeJobId, req.usuario);
  if (!autorizado) {
    return res.status(403).json({ error: 'Você não tem permissão para acessar esta foto.' });
  }
  const filePath = path.join(outputDir, safeJobId, 'fotos', safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Foto não encontrada.' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.sendFile(path.resolve(filePath));
});

app.get('/downloads/:jobId/:filename', exigirAutenticacao, async (req, res) => {
  const { jobId, filename } = req.params;
  const safeJobId = path.basename(jobId);
  const safeFilename = path.basename(filename);
  const autorizado = await verificarDonoDoJob(safeJobId, req.usuario);
  if (!autorizado) {
    return res.status(403).send('Você não tem permissão para acessar este arquivo.');
  }
  const filePath = path.join(outputDir, safeJobId, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Arquivo não encontrado ou já expirou.');
  }

  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.query.inline === '1' || req.query.preview === '1') {
    const isPdf = safeFilename.toLowerCase().endsWith('.pdf');
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeFilename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(path.resolve(filePath));
  }

  res.download(filePath, safeFilename);
});

// Endpoint para carregar os dados estruturados completos do exame para o editor
app.get('/api/ultrassom/:jobId/dados', exigirAutenticacao, async (req, res) => {
  try {
    const safeJobId = path.basename(req.params.jobId);
    const jobFolder = path.join(outputDir, safeJobId);

    let paciente = null;
    let laudo = [];
    let pdfUrl = '';
    let docxUrl = '';

    // 1. Tenta carregar do PostgreSQL
    const exame = await prisma.exameLaudo.findFirst({
      where: {
        pdfArquivo: { contains: safeJobId }
      }
    });

    if (!exame) {
      const autorizadoDisco = await verificarDonoDoJob(safeJobId, req.usuario);
      if (!autorizadoDisco) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este exame.' });
      }
    }

    if (exame) {
      if (req.usuario.role !== 'admin' && exame.usuarioId && exame.usuarioId !== req.usuario.id) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este exame.' });
      }

      paciente = {
        nome: exame.pacienteNome || '',
        especie: exame.pacienteEspecie || 'Canina',
        sexo: exame.pacienteSexo || 'Macho',
        idade: exame.pacienteIdade || '',
        tutor: exame.tutorNome || '',
        requisitante: '',
        data: exame.dataExame || ''
      };

      if (Array.isArray(exame.laudoEstruturado) && exame.laudoEstruturado.length > 0) {
        laudo = exame.laudoEstruturado;
      } else if (typeof exame.laudoEstruturado === 'string') {
        try {
          const parsed = JSON.parse(exame.laudoEstruturado);
          if (Array.isArray(parsed)) laudo = parsed;
        } catch (_) {}
      }

      pdfUrl = exame.pdfArquivo || '';
      docxUrl = exame.docxArquivo || '';
    }

    // 2. Se laudo ainda estiver vazio, tenta meta_exame.json na pasta do job
    const metaPath = path.join(jobFolder, 'meta_exame.json');
    if ((!laudo || laudo.length === 0) && fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (!paciente && meta.paciente) paciente = meta.paciente;
        if (Array.isArray(meta.laudo) && meta.laudo.length > 0) {
          laudo = meta.laudo;
        }
      } catch (_) {}
    }

    // 3. Fallback inteligente: se ainda assim não tiver os órgãos, mas existir o .docx,
    // extrai o texto do document.xml com JSZip
    if ((!laudo || laudo.length === 0) && fs.existsSync(jobFolder)) {
      try {
        const JSZip = require('jszip');
        const files = fs.readdirSync(jobFolder);
        const docxFile = files.find(f => f.endsWith('.docx'));
        if (docxFile) {
          const zip = await JSZip.loadAsync(fs.readFileSync(path.join(jobFolder, docxFile)));
          const docXml = zip.file('word/document.xml');
          if (docXml) {
            const xml = await docXml.async('text');
            const cleanText = xml
              .replace(/<\/w:p>/g, '\n')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"');

            const listaOrgaosChave = [
              'BEXIGA', 'RINS', 'RIM ESQUERDO', 'RIM DIREITO', 'BAÇO',
              'ESTOMAGO', 'ESTÔMAGO', 'FÍGADO', 'FIGADO', 'VESICULA BILIAR',
              'VESÍCULA BILIAR', 'ALÇAS INTESTINAIS', 'GLANDULA ADRENAL',
              'GLÂNDULA ADRENAL', 'ADRENAIS', 'ÚTERO', 'UTERO', 'OVÁRIOS',
              'OVARIOS', 'PANCREAS', 'PÂNCREAS', 'CAVIDADE ABDOMINAL',
              'CONSIDERAÇÕES', 'CONSIDERACOES'
            ];

            const linhas = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
            const orgaosExtraidos = [];
            for (const linha of linhas) {
              const match = linha.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{3,35}):\s*(.*)$/i);
              if (match) {
                const orgaoNome = match[1].trim().toUpperCase();
                const textoAchados = match[2].trim();
                if (listaOrgaosChave.some(k => orgaoNome.includes(k) || k.includes(orgaoNome))) {
                  orgaosExtraidos.push({
                    orgao: orgaoNome,
                    texto: textoAchados,
                    diagDif: ''
                  });
                }
              }
            }
            if (orgaosExtraidos.length > 0) {
              laudo = orgaosExtraidos;
            }
          }
        }
      } catch (zipErr) {
        logger.warn('Aviso ao extrair texto do docx de fallback', { error: zipErr.message });
      }
    }

    if (!pdfUrl && fs.existsSync(jobFolder)) {
      const files = fs.readdirSync(jobFolder);
      const pdf = files.find(f => f.endsWith('.pdf'));
      const docx = files.find(f => f.endsWith('.docx'));
      if (pdf) pdfUrl = `/downloads/${safeJobId}/${encodeURIComponent(pdf)}`;
      if (docx) docxUrl = `/downloads/${safeJobId}/${encodeURIComponent(docx)}`;
    }

    const layoutUsDados = await obterLayout(req.usuario?.id || null).catch(() => null);
    const perfilUsDados = req.usuario?.id ? await obterPerfilLaudo(req.usuario.id).catch(() => null) : null;
    const tvUsPadrao = perfilUsDados?.templateVisual || {};
    const estiloPadraoUs = {
      fontFamily: tvUsPadrao.fontFamily || layoutUsDados?.font_family || 'Calibri, sans-serif',
      fontSizeCabecalho: tvUsPadrao.fontSizeCabecalho || layoutUsDados?.font_size_cabecalho || tvUsPadrao.visualConfigClonado?.patientHeader?.fontSize || '10pt',
      fontSizeBody: tvUsPadrao.fontSizeBody || layoutUsDados?.font_size_body || '11pt',
      fontSizeTitulo: tvUsPadrao.fontSizeTitulo || layoutUsDados?.font_size_titulo || '14pt',
      paragraphSpacing: tvUsPadrao.paragraphSpacing || layoutUsDados?.paragraph_spacing || '8pt',
      lineHeight: String(tvUsPadrao.lineHeight || layoutUsDados?.line_height || '1.35'),
      paginacaoTexto: tvUsPadrao.paginacaoTexto || layoutUsDados?.paginacao_texto || 'preencher',
      mostrarAssinaturaImagem: tvUsPadrao.mostrarAssinaturaImagem !== undefined ? Boolean(tvUsPadrao.mostrarAssinaturaImagem) : true,
      mostrarAssinaturaTexto: tvUsPadrao.mostrarAssinaturaTexto !== undefined ? Boolean(tvUsPadrao.mostrarAssinaturaTexto) : true,
      corPrimaria: tvUsPadrao.corPrimaria || layoutUsDados?.cor_primaria || '#1B365D',
      corSecundaria: tvUsPadrao.corSecundaria || layoutUsDados?.cor_secundaria || '#4A777A',
      marginTop: tvUsPadrao.marginTop || layoutUsDados?.margin_top || '20mm',
      marginBottom: tvUsPadrao.marginBottom || layoutUsDados?.margin_bottom || '20mm',
      marginLeft: tvUsPadrao.marginLeft || layoutUsDados?.margin_left || '15mm',
      marginRight: tvUsPadrao.marginRight || layoutUsDados?.margin_right || '15mm'
    };

    let estiloOverrideUs = null;
    let imagensExame = [];
    const metaUsPath = path.join(jobFolder, 'meta_exame.json');
    if (fs.existsSync(metaUsPath)) {
      try {
        const metaUs = JSON.parse(fs.readFileSync(metaUsPath, 'utf8'));
        if (metaUs.estiloOverride && typeof metaUs.estiloOverride === 'object') {
          estiloOverrideUs = metaUs.estiloOverride;
        }
        if (Array.isArray(metaUs.imagensPaths)) {
          const metaMap = (metaUs.imagensMeta && typeof metaUs.imagensMeta === 'object') ? metaUs.imagensMeta : {};
          imagensExame = metaUs.imagensPaths
            .filter((p) => typeof p === 'string' && fs.existsSync(p))
            .map((p, idx) => {
              const nome = path.basename(p);
              const cls = metaMap[nome] || {};
              return {
                id: `${idx}-${nome}`,
                nome,
                url: `/api/exames/${encodeURIComponent(safeJobId)}/imagem/${encodeURIComponent(nome)}`,
                sigla: cls.sigla || '',
                orgao: cls.orgao || '',
                statusVisual: cls.statusVisual || 'NORMAL',
                medidasLidas: Array.isArray(cls.medidasLidas) ? cls.medidasLidas : []
              };
            });
        }
      } catch (_) {}
    }

    res.json({
      sucesso: true,
      jobId: safeJobId,
      paciente: paciente || {
        nome: 'Paciente',
        especie: 'Canina',
        raca: 'SRD',
        idade: '',
        sexo: 'Macho',
        tutor: '',
        data: ''
      },
      laudo: laudo || [],
      imagens: imagensExame,
      estiloPadrao: estiloPadraoUs,
      estiloOverride: estiloOverrideUs,
      pdfUrl: pdfUrl ? `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : '',
      docxUrl: docxUrl ? `${docxUrl}${docxUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do exame: ' + err.message });
  }
});

// Serve individualmente uma imagem do exame para pré-visualização e reordenação no Vetaro Studio
app.get('/api/exames/:jobId/imagem/:nomeArquivo', exigirAutenticacao, async (req, res) => {
  try {
    const safeJobId = path.basename(req.params.jobId || '');
    const nomeAlvo = path.basename(req.params.nomeArquivo || '');
    const jobFolder = path.join(outputDir, safeJobId);
    const metaPath = path.join(jobFolder, 'meta_exame.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).end();
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (req.usuario.role !== 'admin' && meta.usuarioId && meta.usuarioId !== req.usuario.id) {
      return res.status(403).end();
    }
    const lista = Array.isArray(meta.imagensPaths) ? meta.imagensPaths : [];
    const caminhoEncontrado = lista.find((p) => typeof p === 'string' && path.basename(p) === nomeAlvo);
    if (!caminhoEncontrado || !fs.existsSync(caminhoEncontrado)) {
      return res.status(404).end();
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(path.resolve(caminhoEncontrado));
  } catch (_) {
    return res.status(404).end();
  }
});

// Endpoint para carregar dados de cirurgia para o editor
app.get('/api/cirurgia/:jobId/dados', exigirAutenticacao, async (req, res) => {
  try {
    const safeJobId = path.basename(req.params.jobId);
    const jobFolder = path.join(outputDir, safeJobId);

    let paciente = null;
    let cirurgia = null;
    let pdfUrl = '';
    let docxUrl = '';

    const relatorio = await prisma.relatorioCirurgico.findFirst({
      where: {
        pdfArquivo: { contains: safeJobId }
      }
    });

    if (!relatorio) {
      const autorizadoDisco = await verificarDonoDoJob(safeJobId, req.usuario);
      if (!autorizadoDisco) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este relatório.' });
      }
    }

    if (relatorio) {
      if (req.usuario.role !== 'admin' && relatorio.usuarioId && relatorio.usuarioId !== req.usuario.id) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este relatório.' });
      }

      paciente = {
        nome: relatorio.pacienteNome || '',
        especie: relatorio.pacienteEspecie || 'Canina'
      };

      cirurgia = relatorio.dadosCirurgia || {
        procedimento: relatorio.procedimento || '',
        diagnosticoPreCirurgico: relatorio.diagnostico || '',
        descricaoProcedimento: '',
        evolucaoConsideracoes: ''
      };

      pdfUrl = relatorio.pdfArquivo || '';
      docxUrl = relatorio.docxArquivo || '';
    }

    let fotosCaminhos = [];
    let legendasFotos = Array.isArray(cirurgia?.legendasFotos) ? cirurgia.legendasFotos : [];
    let estiloOverride = (cirurgia?.estiloOverride && typeof cirurgia.estiloOverride === 'object') ? cirurgia.estiloOverride : null;
    const metaPath = path.join(jobFolder, 'meta_cirurgia.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.paciente) {
          paciente = { ...(paciente || {}), ...meta.paciente };
        }
        if ((!cirurgia || !cirurgia.descricaoProcedimento) && meta.cirurgia) {
          cirurgia = meta.cirurgia;
        }
        if (Array.isArray(meta.fotosCaminhos)) {
          fotosCaminhos = meta.fotosCaminhos;
        }
        if (Array.isArray(meta.legendasFotos) && meta.legendasFotos.length > 0) {
          legendasFotos = meta.legendasFotos;
        }
        if (meta.estiloOverride && typeof meta.estiloOverride === 'object') {
          estiloOverride = meta.estiloOverride;
        }
      } catch (_) {}
    }

    if (fotosCaminhos.length === 0) {
      const fotosDir = path.join(jobFolder, 'fotos');
      if (fs.existsSync(fotosDir)) {
        fotosCaminhos = fs.readdirSync(fotosDir)
          .filter(f => /.(jpe?g|png|webp)$/i.test(f))
          .sort()
          .map(f => path.join(fotosDir, f));
      }
    }

    const perfilCir = req.usuario?.id ? await obterPerfilCirurgico(req.usuario.id).catch(() => null) : null;
    const layoutUsuarioDados = await obterLayout(req.usuario?.id || null).catch(() => null);
    const tvCirPadrao = perfilCir?.templateVisual || {};
    const estiloPadrao = {
      tipoCabecalho: tvCirPadrao.tipoCabecalho || 'logo-esquerda-dados-direita',
      tipoDadosPaciente: tvCirPadrao.tipoDadosPaciente || 'duas-colunas-limpo',
      estiloSecoes: tvCirPadrao.estiloSecoes || 'negrito-inline',
      decoracaoTitulo: tvCirPadrao.decoracaoTitulo || 'nenhuma',
      posicaoAssinatura: tvCirPadrao.posicaoAssinatura || 'centro',
      mostrarAssinaturaImagem: tvCirPadrao.mostrarAssinaturaImagem !== undefined ? Boolean(tvCirPadrao.mostrarAssinaturaImagem) : true,
      mostrarAssinaturaTexto: tvCirPadrao.mostrarAssinaturaTexto !== undefined ? Boolean(tvCirPadrao.mostrarAssinaturaTexto) : true,
      rotuloResponsavel: tvCirPadrao.rotuloResponsavel || 'Responsável',
      tituloDocumento: tvCirPadrao.tituloDocumento || 'RELATÓRIO CIRÚRGICO',
      subtituloDocumento: tvCirPadrao.subtituloDocumento || '',
      corPrimaria: tvCirPadrao.corPrimaria || layoutUsuarioDados?.cor_primaria || '#1B365D',
      corSecundaria: tvCirPadrao.corSecundaria || layoutUsuarioDados?.cor_secundaria || '#4A777A',
      fontFamily: tvCirPadrao.fontFamily || layoutUsuarioDados?.font_family || 'Calibri, sans-serif',
      fontSizeBody: tvCirPadrao.fontSizeBody || layoutUsuarioDados?.font_size_body || '11pt',
      fontSizeCabecalho: tvCirPadrao.fontSizeCabecalho || layoutUsuarioDados?.font_size_cabecalho || tvCirPadrao.fontSizeBody || layoutUsuarioDados?.font_size_body || '11pt',
      fontSizeTitulo: tvCirPadrao.fontSizeTitulo || layoutUsuarioDados?.font_size_titulo || '13.5pt',
      paragraphSpacing: tvCirPadrao.paragraphSpacing || layoutUsuarioDados?.paragraph_spacing || '8pt'
    };
    const legendaPadrao = tvCirPadrao.legendaPadraoFoto || 'Registro fotográfico intraoperatório / peça cirúrgica';

    const fotos = fotosCaminhos
      .filter(p => fs.existsSync(p))
      .map((p, idx) => {
        const nomeArq = path.basename(p);
        const leg = (typeof legendasFotos[idx] === 'string' && legendasFotos[idx].trim())
          ? legendasFotos[idx].trim()
          : `Figura ${idx + 1} - ${legendaPadrao}`;
        return {
          index: idx,
          nome: nomeArq,
          url: `/downloads/${safeJobId}/fotos/${encodeURIComponent(nomeArq)}`,
          legenda: leg
        };
      });

    if (!pdfUrl && fs.existsSync(jobFolder)) {
      const files = fs.readdirSync(jobFolder);
      const pdf = files.find(f => f.endsWith('.pdf'));
      const docx = files.find(f => f.endsWith('.docx'));
      if (pdf) pdfUrl = `/downloads/${safeJobId}/${encodeURIComponent(pdf)}`;
      if (docx) docxUrl = `/downloads/${safeJobId}/${encodeURIComponent(docx)}`;
    }

    res.json({
      sucesso: true,
      jobId: safeJobId,
      paciente: paciente || { nome: 'Paciente', especie: 'Canina' },
      cirurgia: cirurgia || {},
      estiloPadrao,
      estiloOverride,
      fotos,
      legendasFotos: fotos.map(f => f.legenda),
      pdfUrl: pdfUrl ? `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : '',
      docxUrl: docxUrl ? `${docxUrl}${docxUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados da cirurgia: ' + err.message });
  }
});

app.get('/api/modelos-cirurgicos', async (req, res) => {
  try {
    const modelos = await carregarModelosCirurgicos(req.usuario?.id || null);
    res.json({ sucesso: true, modelos });
  } catch (err) {
    console.error('Erro ao listar modelos cirúrgicos:', err);
    res.status(500).json({ error: 'Erro ao carregar modelos: ' + err.message });
  }
});

app.get('/api/modelos-cirurgicos/:id', validateParams(modelosSchemas.getModeloParams, 'params'), async (req, res) => {
  try {
    const modelo = await obterModeloPorId(req.params.id, req.usuario?.id || null);
    if (!modelo) {
      return res.status(404).json({ error: 'Modelo cirúrgico não encontrado.' });
    }
    res.json({ sucesso: true, modelo });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter modelo: ' + err.message });
  }
});

app.post('/api/modelos-cirurgicos', exigirPermissao('gerar_cirurgia'), validate(modelosSchemas.createModelo, 'body'), async (req, res) => {
  try {
    const modeloSalvo = await salvarOuCriarModelo(req.body, req.usuario);
    logger.info('Modelo cirúrgico salvo', { modelo: modeloSalvo.nome, por: req.usuario.email });
    res.json({ sucesso: true, modelo: modeloSalvo });
  } catch (err) {
    logger.error('Erro ao salvar modelo cirúrgico', { stack: err.stack, message: err.message });
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/modelos-cirurgicos/:id/clonar', exigirPermissao('gerar_cirurgia'), validateParams(modelosSchemas.getModeloParams, 'params'), async (req, res) => {
  try {
    const modeloClonado = await clonarModeloParaUsuario(req.params.id, req.usuario);
    logger.info('Modelo cirúrgico clonado para perfil', { original: req.params.id, novo: modeloClonado.id, por: req.usuario.email });
    res.json({ sucesso: true, modelo: modeloClonado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/modelos-cirurgicos/:id', exigirPermissao('gerar_cirurgia'), validateParams(modelosSchemas.deleteModeloParams, 'params'), async (req, res) => {
  try {
    const excluido = await excluirModelo(req.params.id, req.usuario);
    if (!excluido) {
      return res.status(404).json({ error: 'Modelo cirúrgico não encontrado para exclusão.' });
    }
    logger.info('Modelo cirúrgico excluído', { modeloId: req.params.id, por: req.usuario.email });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/layout-config', exigirAutenticacao, async (req, res) => {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'veterinario') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e veterinários.' });
  }
  try {
    const layout = await obterLayout(req.usuario.id);
    res.json({ sucesso: true, layout });
  } catch (err) {
    logger.error('Erro ao obter layout', { error: err.message });
    res.status(500).json({ error: 'Erro ao obter configurações de layout: ' + err.message });
  }
});

app.put('/api/layout-config', exigirAutenticacao, validate(layoutSchemas.updateLayout, 'body'), async (req, res) => {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'veterinario') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e veterinários.' });
  }
  try {
    const layoutAtualizado = await salvarLayout(req.body, req.usuario);
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

// =========================================================================
// CLONAGEM DE PADRÃO VISUAL E TEXTUAL A PARTIR DE 1 A 10 PDFs DO MÉDICO
// =========================================================================
app.post('/api/layout-config/importar-pdfs', limiterGeracaoPesada, exigirAutenticacao, upload.array('pdfs', 10), async (req, res) => {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'veterinario') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e veterinários.' });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Envie de 1 a 10 arquivos PDF de laudos anteriores.' });
  }

  const caminhosPdfs = req.files.map(f => f.path);
  const userIdSafe = String(req.usuario.id || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  const pastaAtivosUsuario = path.join(templatesDir, userIdSafe);

  try {
    const perfilExtraido = await extrairPadraoCompletoDePdfs(
      caminhosPdfs,
      apiKey,
      req.usuario,
      pastaAtivosUsuario
    );

    const layoutAtualizado = await salvarTemplateClonado(perfilExtraido, req.usuario);

    // Atualiza também o perfil profissional do médico (nome, CRMV, clínica, assinatura) se extraídos
    // Nunca sobrescreve uma logo que o usuário subiu manualmente em Meu Perfil (/uploads/logos/)
    const idProf = perfilExtraido.identidadeProfissional || {};
    const usuarioTemLogoManual = typeof req.usuario?.logoUrl === 'string' && req.usuario.logoUrl.includes('/uploads/logos/');
    if (req.usuario.id && (idProf.nomeMedico || idProf.crmv || idProf.nomeClinica || (!usuarioTemLogoManual && perfilExtraido.ativosVisuais?.headerLogoUrl) || perfilExtraido.ativosVisuais?.assinaturaUrl)) {
      await atualizarPerfilProfissional(req.usuario.id, {
        nome: idProf.nomeMedico || req.usuario.nome,
        crmv: idProf.crmv || req.usuario.crmv,
        nomeClinica: idProf.nomeClinica || req.usuario.nomeClinica,
        ...(!usuarioTemLogoManual && perfilExtraido.ativosVisuais?.headerLogoUrl ? { logoUrl: perfilExtraido.ativosVisuais.headerLogoUrl } : {}),
        assinaturaUrl: perfilExtraido.ativosVisuais?.assinaturaUrl || req.usuario.assinaturaUrl
      }).catch(() => {});
    }

    logger.info({
      usuario: req.usuario.email,
      pdfsProcessados: caminhosPdfs.length,
      clinicaDetectada: idProf.nomeClinica
    }, 'Template clonado de PDFs com sucesso');

    res.json({
      sucesso: true,
      layout: layoutAtualizado,
      perfilExtraido
    });
  } catch (err) {
    logger.error('Erro ao extrair padrão de PDFs', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Falha ao extrair padrão dos PDFs: ' + err.message });
  } finally {
    caminhosPdfs.forEach(f => {
      try { fs.unlinkSync(f); } catch (_) {}
    });
  }
});

app.post('/api/layout-config/reset', exigirAutenticacao, async (req, res) => {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'veterinario') {
    return res.status(403).json({ error: 'Acesso restrito a administradores e veterinários.' });
  }
  try {
    const layoutRestaurado = await restaurarLayoutPadrao(req.usuario);
    logger.info({
      usuario: req.usuario.email,
      dataHora: new Date().toISOString()
    }, 'Configurações de layout restauradas para o Padrão Vetaro');
    res.json({ sucesso: true, layout: layoutRestaurado });
  } catch (err) {
    logger.error('Erro ao restaurar layout', { error: err.message });
    res.status(500).json({ error: 'Erro ao restaurar layout: ' + err.message });
  }
});

// ==================== APRENDIZADO DE PADRÃO DE LAUDO (IA MULTIMODAL) ====================
app.post('/api/laudos/aprender-padrao', limiterGeracaoPesada, exigirAutenticacao, uploadPdfsPadrao.array('pdfs', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF foi enviado. Envie de 1 a 10 laudos em PDF.' });
    }
    if (req.files.length > 10) {
      return res.status(400).json({ error: 'Limite máximo de 10 laudos em PDF excedido.' });
    }

    const key = process.env.GEMINI_API_KEY || apiKey || config.geminiApiKey;
    if (!key) {
      return res.status(500).json({ error: 'Chave de API do Gemini não configurada no servidor.' });
    }

    const caminhosPdfs = req.files.map(f => f.path);
    logger.info({
      usuario: req.usuario.email,
      quantidadePdfs: caminhosPdfs.length
    }, 'Iniciando extração e aprendizado de padrão de laudo por IA');

    const userIdSafe = String(req.usuario?.id || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
    const pastaAtivosUsuario = path.join(templatesDir, userIdSafe);

    // Executa em paralelo a extração geométrica/visual real (300 DPI + bbox + ativos) e a síntese clínica por IA
    const [perfilGeoRes, perfilIaRes] = await Promise.allSettled([
      extrairPadraoCompletoDePdfs(caminhosPdfs, key, req.usuario, pastaAtivosUsuario),
      extrairPadraoDeLaudos(caminhosPdfs, key)
    ]);

    const perfilGeo = perfilGeoRes.status === 'fulfilled' ? perfilGeoRes.value : null;
    const perfilIa = perfilIaRes.status === 'fulfilled' ? perfilIaRes.value : null;

    if (!perfilGeo && !perfilIa) {
      throw new Error(perfilIaRes.reason?.message || perfilGeoRes.reason?.message || 'Falha ao extrair padrão dos PDFs.');
    }

    const basePerfil = perfilIa || {
      sucesso: true,
      nomeDetectado: perfilGeo?.identidadeProfissional?.nomeMedico || '',
      crmvDetectado: perfilGeo?.identidadeProfissional?.crmv || '',
      clinicaDetectada: perfilGeo?.identidadeProfissional?.nomeClinica || '',
      layoutDetectado: {},
      templateVisual: {},
      ordemOrgaos: (perfilGeo?.estiloEscritaClinica?.sequenciaOrgaos || []).map(o => o.orgao.toUpperCase()),
      frasesNormalidade: {},
      vocabularioPreferido: {},
      estiloConclusao: 'texto-simples',
      observacoesEstilo: 'Padrão extraído geometricamente dos PDFs de referência.',
      amostras: caminhosPdfs.map(f => ({ nome: path.basename(f), enviadoEm: new Date().toISOString() })),
      quantidadeAmostras: caminhosPdfs.length
    };

    const lv = perfilGeo?.layoutVisual || null;
    const ativos = perfilGeo?.ativosVisuais || null;
    const layoutMedido = lv ? {
      ...(basePerfil.layoutDetectado || {}),
      fontFamily: lv.bodyTypography?.fontFamily || basePerfil.layoutDetectado?.fontFamily,
      fontSizeBody: lv.bodyTypography?.fontSize || basePerfil.layoutDetectado?.fontSizeBody,
      fontSizeTitulo: lv.titleConfig?.fontSize || basePerfil.layoutDetectado?.fontSizeTitulo,
      marginTop: lv.margins?.topFirstPage || basePerfil.layoutDetectado?.marginTop,
      marginBottom: lv.margins?.bottom || basePerfil.layoutDetectado?.marginBottom,
      marginLeft: lv.margins?.left || basePerfil.layoutDetectado?.marginLeft,
      marginRight: lv.margins?.right || basePerfil.layoutDetectado?.marginRight,
      lineHeight: lv.bodyTypography?.lineHeight || basePerfil.layoutDetectado?.lineHeight,
      paragraphSpacing: lv.bodyTypography?.paragraphSpacing || basePerfil.layoutDetectado?.paragraphSpacing
    } : (basePerfil.layoutDetectado || {});

    const perfilDetectado = {
      ...basePerfil,
      nomeDetectado: basePerfil.nomeDetectado || perfilGeo?.identidadeProfissional?.nomeMedico || '',
      crmvDetectado: basePerfil.crmvDetectado || perfilGeo?.identidadeProfissional?.crmv || '',
      layoutDetectado: layoutMedido,
      templateVisual: {
        ...(basePerfil.templateVisual || {}),
        ...layoutMedido,
        ...(lv?.titleConfig?.text ? { tituloDocumento: lv.titleConfig.text } : {}),
        ...(lv?.titleConfig?.subtitle !== undefined && lv?.titleConfig?.subtitle !== null ? { subtituloDocumento: lv.titleConfig.subtitle } : {}),
        ...(lv?.footerConfig?.disclaimerText ? { textoAvisoLegal: lv.footerConfig.disclaimerText } : {}),
        ...(lv?.signatureConfig ? {
          posicaoAssinatura: lv.signatureConfig.alignment === 'center' ? 'centro' : (lv.signatureConfig.alignment === 'left' ? 'esquerda' : 'direita'),
          linhaAssinatura: Boolean(lv.signatureConfig.hasTopLine)
        } : {}),
        ...(lv ? {
          visualConfigClonado: lv,
          writingStyleClonado: perfilGeo?.estiloEscritaClinica || null,
          ativosVisuais: ativos || null
        } : {})
      },
      ...(perfilGeo ? { perfilClonado: perfilGeo } : {})
    };

    // Persiste imediatamente o template visual/geométrico clonado no ConfiguracaoLayout do usuário
    // (garante funcionamento mesmo se o bundle do frontend não reenviar visualConfigClonado no PUT /meu-perfil)
    if (perfilGeo && req.usuario) {
      await salvarTemplateClonado(perfilGeo, req.usuario).catch(errSave =>
        logger.warn('Aviso ao pré-salvar template clonado', { error: errSave.message })
      );
      const idProfGeo = perfilGeo.identidadeProfissional || {};
      const ativosGeo = perfilGeo.ativosVisuais || {};
      const usuarioTemLogoManualLaudo = typeof req.usuario?.logoUrl === 'string' && req.usuario.logoUrl.includes('/uploads/logos/');
      if (req.usuario.id && ((!usuarioTemLogoManualLaudo && ativosGeo.headerLogoUrl) || ativosGeo.assinaturaUrl)) {
        await atualizarPerfilProfissional(req.usuario.id, {
          nome: perfilDetectado.nomeDetectado || idProfGeo.nomeMedico || req.usuario.nome,
          crmv: perfilDetectado.crmvDetectado || idProfGeo.crmv || req.usuario.crmv,
          nomeClinica: perfilDetectado.clinicaDetectada || idProfGeo.nomeClinica || req.usuario.nomeClinica,
          ...(!usuarioTemLogoManualLaudo && ativosGeo.headerLogoUrl ? { logoUrl: ativosGeo.headerLogoUrl } : {}),
          ...(ativosGeo.assinaturaUrl ? { assinaturaUrl: ativosGeo.assinaturaUrl } : {})
        }).catch(() => {});
      }
    }

    res.json({
      sucesso: true,
      mensagem: `Padrão identificado com sucesso a partir de ${caminhosPdfs.length} laudo(s)!`,
      perfilDetectado
    });
  } catch (err) {
    logger.error('Erro ao aprender padrão de laudos', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao analisar PDFs de laudos: ' + err.message });
  } finally {
    if (Array.isArray(req.files)) {
      req.files.forEach((f) => {
        fs.promises.unlink(f.path).catch(() => {});
      });
    }
  }
});

app.get('/api/laudos/meu-perfil', exigirAutenticacao, async (req, res) => {
  try {
    const [perfil, layout, usuarioDb] = await Promise.all([
      obterPerfilLaudo(req.usuario.id),
      obterLayout(req.usuario.id),
      prisma.usuario.findUnique({
        where: { id: req.usuario.id },
        select: { id: true, nome: true, crmv: true, nomeClinica: true, email: true }
      })
    ]);

    res.json({
      sucesso: true,
      temPerfilPersonalizado: Boolean(perfil && perfil.ativo),
      perfil,
      layout,
      usuario: usuarioDb
    });
  } catch (err) {
    logger.error('Erro ao buscar perfil de laudo', { error: err.message });
    res.status(500).json({ error: 'Erro ao carregar perfil de laudo: ' + err.message });
  }
});

app.put('/api/laudos/meu-perfil', exigirAutenticacao, async (req, res) => {
  try {
    const perfilSalvo = await salvarPerfilLaudo(req.usuario.id, req.body);
    logger.info({
      usuario: req.usuario.email,
      perfilId: perfilSalvo.id
    }, 'Perfil de laudo personalizado salvo com sucesso');

    res.json({
      sucesso: true,
      mensagem: 'Padrão personalizado ativado com sucesso! Seus próximos laudos seguirão este modelo.',
      perfil: perfilSalvo
    });
  } catch (err) {
    logger.error('Erro ao salvar perfil de laudo', { error: err.message });
    res.status(400).json({ error: 'Erro ao salvar perfil de laudo: ' + err.message });
  }
});

app.delete('/api/laudos/meu-perfil', exigirAutenticacao, async (req, res) => {
  try {
    await desativarPerfilLaudo(req.usuario.id);
    await restaurarLayoutPadrao(req.usuario);
    logger.info({
      usuario: req.usuario.email
    }, 'Perfil de laudo personalizado removido e layout restaurado');

    res.json({
      sucesso: true,
      mensagem: 'Padrão personalizado removido. Padrão institucional restabelecido.'
    });
  } catch (err) {
    logger.error('Erro ao remover perfil de laudo', { error: err.message });
    res.status(500).json({ error: 'Erro ao remover perfil de laudo: ' + err.message });
  }
});

// ==================== APRENDIZADO DE PADRÃO DE RELATÓRIO CIRÚRGICO (IA MULTIMODAL) ====================
app.post('/api/cirurgia/aprender-padrao', limiterGeracaoPesada, exigirAutenticacao, uploadPdfsPadrao.array('pdfs', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF foi enviado. Envie de 1 a 10 relatórios cirúrgicos em PDF.' });
    }
    if (req.files.length > 10) {
      return res.status(400).json({ error: 'Limite máximo de 10 relatórios cirúrgicos em PDF excedido.' });
    }

    const key = process.env.GEMINI_API_KEY || apiKey || config.geminiApiKey;
    if (!key) {
      return res.status(500).json({ error: 'Chave de API do Gemini não configurada no servidor.' });
    }

    const caminhosPdfs = req.files.map(f => f.path);
    logger.info({
      usuario: req.usuario.email,
      quantidadePdfs: caminhosPdfs.length
    }, 'Iniciando extração e aprendizado de padrão de relatório cirúrgico por IA');

    const userIdSafe = String(req.usuario?.id || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
    const pastaAtivosCirurgia = path.join(templatesCirurgiaDir, userIdSafe);

    // Extrai ativos visuais reais (logo/assinatura) e padrão estrutural/redacional cirúrgico em paralelo
    const [perfilGeoRes, perfilCirIaRes] = await Promise.allSettled([
      extrairPadraoCompletoDePdfs(caminhosPdfs, key, req.usuario, pastaAtivosCirurgia),
      extrairPadraoDeCirurgias(caminhosPdfs, key)
    ]);

    const perfilGeo = perfilGeoRes.status === 'fulfilled' ? perfilGeoRes.value : null;
    const perfilIa = perfilCirIaRes.status === 'fulfilled' ? perfilCirIaRes.value : null;

    if (!perfilGeo && !perfilIa) {
      throw new Error(perfilCirIaRes.reason?.message || perfilGeoRes.reason?.message || 'Falha ao extrair padrão cirúrgico dos PDFs.');
    }

    const ativosRaw = perfilGeo?.ativosVisuais || {};
    const ativos = {};
    if (ativosRaw.headerLogoUrl) ativos.headerLogoUrl = ativosRaw.headerLogoUrl;
    if (ativosRaw.headerBannerUrl) ativos.headerBannerUrl = ativosRaw.headerBannerUrl;
    if (ativosRaw.assinaturaUrl) ativos.assinaturaUrl = ativosRaw.assinaturaUrl;

    const lv = perfilGeo?.layoutVisual || null;
    const basePerfil = perfilIa || {
      sucesso: true,
      nomeDetectado: perfilGeo?.identidadeProfissional?.nomeMedico || '',
      crmvDetectado: perfilGeo?.identidadeProfissional?.crmv || '',
      clinicaDetectada: perfilGeo?.identidadeProfissional?.nomeClinica || '',
      layoutDetectado: {},
      templateVisual: {},
      ordemSecoes: [
        'DATA DO PROCEDIMENTO CIRÚRGICO',
        'PROCEDIMENTO',
        'DIAGNÓSTICO PRÉ-CIRÚRGICO',
        'DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO',
        'EVOLUÇÃO E CONSIDERAÇÕES'
      ],
      estiloRedacao: {
        frasePadraoAntissepsia: '',
        frasePadraoEvolucao: '',
        pessoaVerbal: 'impessoal / 3ª pessoa',
        detalhamentoFios: 'detalhado por planos anatômicos'
      },
      vocabularioPreferido: {},
      observacoesEstilo: 'Padrão cirúrgico extraído dos PDFs de referência.',
      amostras: caminhosPdfs.map(f => ({ nome: path.basename(f), enviadoEm: new Date().toISOString() })),
      quantidadeAmostras: caminhosPdfs.length
    };

    const layoutMedido = lv ? {
      ...(basePerfil.layoutDetectado || {}),
      fontFamily: lv.bodyTypography?.fontFamily || basePerfil.layoutDetectado?.fontFamily,
      fontSizeBody: lv.bodyTypography?.fontSize || basePerfil.layoutDetectado?.fontSizeBody,
      fontSizeTitulo: lv.titleConfig?.fontSize || basePerfil.layoutDetectado?.fontSizeTitulo,
      marginTop: lv.margins?.topFirstPage || basePerfil.layoutDetectado?.marginTop,
      marginBottom: lv.margins?.bottom || basePerfil.layoutDetectado?.marginBottom,
      marginLeft: lv.margins?.left || basePerfil.layoutDetectado?.marginLeft,
      marginRight: lv.margins?.right || basePerfil.layoutDetectado?.marginRight,
      lineHeight: lv.bodyTypography?.lineHeight || basePerfil.layoutDetectado?.lineHeight
    } : (basePerfil.layoutDetectado || {});

    const perfilDetectado = {
      ...basePerfil,
      nomeDetectado: basePerfil.nomeDetectado || perfilGeo?.identidadeProfissional?.nomeMedico || '',
      crmvDetectado: basePerfil.crmvDetectado || perfilGeo?.identidadeProfissional?.crmv || '',
      clinicaDetectada: basePerfil.clinicaDetectada || perfilGeo?.identidadeProfissional?.nomeClinica || '',
      layoutDetectado: layoutMedido,
      templateVisual: {
        ...(basePerfil.templateVisual || {}),
        ...layoutMedido,
        ...(Object.keys(ativos).length > 0 ? { ativosVisuais: ativos } : {})
      }
    };

    const usuarioTemLogoManualCir = typeof req.usuario?.logoUrl === 'string' && req.usuario.logoUrl.includes('/uploads/logos/');
    if (req.usuario?.id && ((!usuarioTemLogoManualCir && ativos.headerLogoUrl) || ativos.assinaturaUrl)) {
      await atualizarPerfilProfissional(req.usuario.id, {
        ...(!usuarioTemLogoManualCir && ativos.headerLogoUrl ? { logoUrl: ativos.headerLogoUrl } : {}),
        ...(ativos.assinaturaUrl ? { assinaturaUrl: ativos.assinaturaUrl } : {})
      }).catch(() => {});
    }

    res.json({
      sucesso: true,
      mensagem: `Padrão cirúrgico identificado com sucesso a partir de ${caminhosPdfs.length} relatório(s)!`,
      perfilDetectado
    });
  } catch (err) {
    logger.error('Erro ao aprender padrão de relatórios cirúrgicos', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao analisar PDFs cirúrgicos: ' + err.message });
  } finally {
    if (Array.isArray(req.files)) {
      req.files.forEach((f) => {
        fs.promises.unlink(f.path).catch(() => {});
      });
    }
  }
});

app.get('/api/cirurgia/meu-perfil', exigirAutenticacao, async (req, res) => {
  try {
    const [perfil, layout, usuarioDb] = await Promise.all([
      obterPerfilCirurgico(req.usuario.id),
      obterLayout(req.usuario.id),
      prisma.usuario.findUnique({
        where: { id: req.usuario.id },
        select: { id: true, nome: true, crmv: true, nomeClinica: true, email: true, logoUrl: true, assinaturaUrl: true }
      })
    ]);

    res.json({
      sucesso: true,
      temPerfilPersonalizado: Boolean(perfil && perfil.ativo),
      perfil,
      layout,
      usuario: usuarioDb
    });
  } catch (err) {
    logger.error('Erro ao buscar perfil cirúrgico', { error: err.message });
    res.status(500).json({ error: 'Erro ao carregar perfil cirúrgico: ' + err.message });
  }
});

app.put('/api/cirurgia/meu-perfil', exigirAutenticacao, async (req, res) => {
  try {
    const perfilSalvo = await salvarPerfilCirurgico(req.usuario.id, req.body);
    logger.info({
      usuario: req.usuario.email,
      perfilId: perfilSalvo?.id
    }, 'Perfil cirúrgico personalizado salvo com sucesso');

    res.json({
      sucesso: true,
      mensagem: 'Padrão de relatório cirúrgico salvo com sucesso! Seus próximos relatórios seguirão este formato.',
      perfil: perfilSalvo
    });
  } catch (err) {
    logger.error('Erro ao salvar perfil cirúrgico', { error: err.message });
    res.status(400).json({ error: 'Erro ao salvar perfil cirúrgico: ' + err.message });
  }
});

// Pré-visualização ao vivo em PDF real do Padrão Cirúrgico (sem salvar no banco)
app.post('/api/cirurgia/preview-padrao', limiterGeracaoPesada, exigirAutenticacao, async (req, res) => {
  const osMod = require('os');
  const tmpPdf = path.join(osMod.tmpdir(), `preview_padrao_cir_${req.usuario.id}_${Date.now()}.pdf`);
  try {
    const body = req.body || {};
    const layoutUsuario = await obterLayout(req.usuario?.id || null).catch(() => null);
    const perfilLaudoUsuario = req.usuario?.id ? await obterPerfilLaudo(req.usuario.id).catch(() => null) : null;
    const perfilCirDb = req.usuario?.id ? await obterPerfilCirurgico(req.usuario.id).catch(() => null) : null;

    const templateVisualPreview = {
      ...(perfilCirDb?.templateVisual || {}),
      ...(body.templateVisual || {})
    };
    const perfilCirPreview = {
      ...(perfilCirDb || {}),
      ativo: true,
      nomeDetectado: body.nomeDetectado || perfilCirDb?.nomeDetectado || req.usuario?.nome,
      crmvDetectado: body.crmvDetectado || perfilCirDb?.crmvDetectado || req.usuario?.crmv,
      clinicaDetectada: body.clinicaDetectada || perfilCirDb?.clinicaDetectada || req.usuario?.nomeClinica,
      templateVisual: templateVisualPreview,
      layoutDetectado: templateVisualPreview,
      estiloRedacao: body.estiloRedacao || perfilCirDb?.estiloRedacao || {}
    };

    const usuarioEfetivo = {
      ...(req.usuario || {}),
      nome: perfilCirPreview.nomeDetectado || req.usuario?.nome,
      crmv: perfilCirPreview.crmvDetectado || req.usuario?.crmv,
      nomeClinica: perfilCirPreview.clinicaDetectada || req.usuario?.nomeClinica
    };

    const dadosPacienteExemplo = {
      nome: 'Thor',
      sexo: 'Macho',
      idade: '5 anos',
      tutor: 'Carlos Silva',
      especie: 'Canina',
      peso: '14 kg',
      data: new Date().toLocaleDateString('pt-BR')
    };

    const fraseAntissepsia = perfilCirPreview.estiloRedacao?.frasePadraoAntissepsia ||
      'A paciente foi submetida à anestesia geral inalatória com monitoração multiparamétrica transoperatória, posicionada em decúbito dorsal horizontal. Realizou-se tricotomia ampla e antissepsia rigorosa com clorexidina degermante e alcoólica.';
    const fraseEvolucao = perfilCirPreview.estiloRedacao?.frasePadraoEvolucao ||
      'O procedimento transcorreu sem intercorrências transoperatórias, mantendo-se estabilidade hemodinâmica durante todo o ato cirúrgico. Recuperação pós-anestésica satisfatória.';

    const dadosCirurgiaExemplo = {
      data: new Date().toLocaleDateString('pt-BR'),
      procedimento: 'Ovariossalpingohisterectomia eletiva',
      diagnosticoPreCirurgico: 'Indicação eletiva para controle populacional e prevenção de afecções reprodutivas.',
      descricaoProcedimento: `${fraseAntissepsia}\n\nRealizou-se acesso mediano ventral, ligadura dupla dos pedículos vasculares com fio absorvível e síntese da parede abdominal por planos anatômicos com aposição cutânea adequada.`,
      evolucaoConsideracoes: fraseEvolucao
    };

    await gerarPdfCirurgico(dadosPacienteExemplo, dadosCirurgiaExemplo, tmpPdf, [], {
      usuario: usuarioEfetivo,
      layout: layoutUsuario,
      perfilLaudo: perfilLaudoUsuario,
      perfilCirurgico: perfilCirPreview
    });

    const pdfBuffer = await fs.promises.readFile(tmpPdf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview_padrao_cirurgico.pdf"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.send(pdfBuffer);
  } catch (err) {
    logger.error('Erro ao gerar preview PDF do padrão cirúrgico', { error: err.message });
    return res.status(500).json({ error: 'Erro ao gerar pré-visualização PDF: ' + err.message });
  } finally {
    if (fs.existsSync(tmpPdf)) {
      try { fs.unlinkSync(tmpPdf); } catch (_) {}
    }
  }
});

// Pré-visualização ao vivo em PDF real do Padrão de Laudo de Ultrassom (sem salvar no banco)
app.post('/api/laudos/preview-padrao', limiterGeracaoPesada, exigirAutenticacao, async (req, res) => {
  const osMod = require('os');
  const tmpDir = fs.mkdtempSync(path.join(osMod.tmpdir(), `preview_padrao_us_${req.usuario.id}_`));
  try {
    const body = req.body || {};
    const layoutBase = await obterLayout(req.usuario?.id || null).catch(() => ({}));
    const perfilDb = req.usuario?.id ? await obterPerfilLaudo(req.usuario.id).catch(() => null) : null;
    const tv = {
      ...(perfilDb?.templateVisual || {}),
      ...(body.templateVisual || {})
    };

    const visualBase = tv.visualConfigClonado || layoutBase?.visual_config_json || null;
    let visualClonadoPreview = visualBase ? JSON.parse(JSON.stringify(visualBase)) : null;
    if (visualClonadoPreview) {
      visualClonadoPreview.bodyTypography = {
        ...(visualClonadoPreview.bodyTypography || {}),
        ...(tv.fontFamily ? { fontFamily: tv.fontFamily } : {}),
        ...(tv.fontSizeBody ? { fontSize: tv.fontSizeBody } : {}),
        ...(tv.lineHeight ? { lineHeight: String(tv.lineHeight) } : {}),
        ...(tv.paragraphSpacing ? { paragraphSpacing: tv.paragraphSpacing } : {})
      };
      visualClonadoPreview.titleConfig = {
        ...(visualClonadoPreview.titleConfig || {}),
        ...(tv.fontSizeTitulo ? { fontSize: tv.fontSizeTitulo } : {}),
        ...(tv.corPrimaria ? { color: tv.corPrimaria } : {})
      };
      if (tv.fontSizeCabecalho) {
        visualClonadoPreview.patientHeader = {
          ...(visualClonadoPreview.patientHeader || {}),
          fontSize: tv.fontSizeCabecalho
        };
      }
      visualClonadoPreview.margins = {
        ...(visualClonadoPreview.margins || {}),
        ...(tv.marginTop ? { topFirstPage: tv.marginTop, topContinuationPages: tv.marginTop } : {}),
        ...(tv.marginBottom ? { bottom: tv.marginBottom } : {}),
        ...(tv.marginLeft ? { left: tv.marginLeft } : {}),
        ...(tv.marginRight ? { right: tv.marginRight } : {})
      };
    }

    const layoutPreview = {
      ...layoutBase,
      font_family: tv.fontFamily || layoutBase?.font_family || 'Calibri, sans-serif',
      font_size_body: tv.fontSizeBody || layoutBase?.font_size_body || '11pt',
      font_size_cabecalho: tv.fontSizeCabecalho || layoutBase?.font_size_cabecalho || tv.fontSizeBody || '10pt',
      font_size_titulo: tv.fontSizeTitulo || layoutBase?.font_size_titulo || '14pt',
      margin_top: tv.marginTop || layoutBase?.margin_top || '20mm',
      margin_bottom: tv.marginBottom || layoutBase?.margin_bottom || '20mm',
      margin_left: tv.marginLeft || layoutBase?.margin_left || '15mm',
      margin_right: tv.marginRight || layoutBase?.margin_right || '15mm',
      line_height: tv.lineHeight || layoutBase?.line_height || '1.35',
      paginacao_texto: tv.paginacaoTexto || layoutBase?.paginacao_texto || 'preencher',
      mostrar_assinatura_imagem: tv.mostrarAssinaturaImagem !== undefined ? Boolean(tv.mostrarAssinaturaImagem) : true,
      mostrar_assinatura_texto: tv.mostrarAssinaturaTexto !== undefined ? Boolean(tv.mostrarAssinaturaTexto) : true,
      paragraph_spacing: tv.paragraphSpacing || layoutBase?.paragraph_spacing || '8pt',
      cor_primaria: tv.corPrimaria || layoutBase?.cor_primaria || '#1B365D',
      cor_secundaria: tv.corSecundaria || layoutBase?.cor_secundaria || '#4A777A',
      ...(visualClonadoPreview ? { modo_template: 'clonado_pdf', visual_config_json: visualClonadoPreview } : {})
    };

    const perfilPreview = {
      ...(perfilDb || {}),
      ativo: true,
      nomeDetectado: body.nomeDetectado || perfilDb?.nomeDetectado || req.usuario?.nome,
      crmvDetectado: body.crmvDetectado || perfilDb?.crmvDetectado || req.usuario?.crmv,
      clinicaDetectada: body.clinicaDetectada || perfilDb?.clinicaDetectada || req.usuario?.nomeClinica,
      templateVisual: {
        ...tv,
        ...(visualClonadoPreview ? { visualConfigClonado: visualClonadoPreview } : {})
      },
      ordemOrgaos: Array.isArray(body.ordemOrgaos) && body.ordemOrgaos.length > 0 ? body.ordemOrgaos : (perfilDb?.ordemOrgaos || []),
      frasesNormalidade: body.frasesNormalidade || perfilDb?.frasesNormalidade || {}
    };

    const orgaosExemplo = (perfilPreview.ordemOrgaos.length > 0
      ? perfilPreview.ordemOrgaos
      : ['BEXIGA', 'RIM ESQUERDO', 'RIM DIREITO', 'BAÇO', 'FÍGADO', 'ESTÔMAGO', 'ALÇAS INTESTINAIS']
    ).map((orgao) => ({
      orgao: String(orgao).toUpperCase(),
      texto: perfilPreview.frasesNormalidade?.[orgao] ||
        perfilPreview.frasesNormalidade?.[String(orgao).toUpperCase()] ||
        'Dimensões normais, contornos regulares, parênquima homogêneo e ecogenicidade preservada sem alterações ultrassonográficas evidentes.',
      diagDif: ''
    }));

    const pacienteExemplo = {
      nome: 'Thor',
      especie: 'Canina',
      raca: 'SRD',
      sexo: 'Macho',
      idade: '5 anos',
      peso: '14 kg',
      tutor: 'Carlos Silva',
      requisitante: 'Dra. Ana Paula',
      data: new Date().toLocaleDateString('pt-BR')
    };

    const usuarioEfetivo = {
      ...(req.usuario || {}),
      nome: perfilPreview.nomeDetectado || req.usuario?.nome,
      crmv: perfilPreview.crmvDetectado || req.usuario?.crmv,
      nomeClinica: perfilPreview.clinicaDetectada || req.usuario?.nomeClinica
    };

    const docs = await gerarDocumentosExame(pacienteExemplo, orgaosExemplo, [], tmpDir, layoutPreview, {
      usuario: usuarioEfetivo,
      perfilLaudo: perfilPreview,
      apenasPdf: true
    });

    const pdfBuffer = await fs.promises.readFile(docs.caminhoPdf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview_padrao_ultrassom.pdf"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.send(pdfBuffer);
  } catch (err) {
    logger.error('Erro ao gerar preview PDF do padrão de ultrassom', { error: err.message });
    return res.status(500).json({ error: 'Erro ao gerar pré-visualização PDF: ' + err.message });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
});

app.delete('/api/cirurgia/meu-perfil', exigirAutenticacao, async (req, res) => {
  try {
    await desativarPerfilCirurgico(req.usuario.id);
    logger.info({
      usuario: req.usuario.email
    }, 'Perfil cirúrgico personalizado removido');

    res.json({
      sucesso: true,
      mensagem: 'Padrão cirúrgico personalizado removido. Padrão oficial restabelecido.'
    });
  } catch (err) {
    logger.error('Erro ao remover perfil cirúrgico', { error: err.message });
    res.status(500).json({ error: 'Erro ao remover perfil cirúrgico: ' + err.message });
  }
});

app.get('/api/historico', exigirAutenticacao, async (req, res) => {
  try {
    const filtroUsuario = req.usuario.role === 'admin' ? {} : { usuarioId: req.usuario.id };
    const limite = Math.min(50, Math.max(1, parseInt(req.query.limit || '25', 10) || 25));
    const offset = Math.max(0, parseInt(req.query.offset || req.query.skip || '0', 10) || 0);
    const incluirConteudo = req.query.incluirConteudo === '1' || req.query.incluirConteudo === 'true';

    const selectExame = incluirConteudo
      ? undefined
      : {
          id: true,
          usuarioId: true,
          pacienteNome: true,
          pacienteEspecie: true,
          pacienteSexo: true,
          pacienteIdade: true,
          tutorNome: true,
          dataExame: true,
          imagensQtd: true,
          pdfArquivo: true,
          docxArquivo: true,
          publicToken: true,
          linkAtivo: true,
          visualizacoes: true,
          primeiraVisualizacaoEm: true,
          ultimaVisualizacaoEm: true,
          compartilhadoEm: true,
          clinicaParceiraId: true,
          valorExame: true,
          statusPagamento: true,
          criadoEm: true
        };

    const selectCirurgia = incluirConteudo
      ? undefined
      : {
          id: true,
          usuarioId: true,
          pacienteNome: true,
          pacienteEspecie: true,
          procedimento: true,
          diagnostico: true,
          modeloUtilizado: true,
          possuiFoto: true,
          pdfArquivo: true,
          docxArquivo: true,
          publicToken: true,
          linkAtivo: true,
          visualizacoes: true,
          primeiraVisualizacaoEm: true,
          ultimaVisualizacaoEm: true,
          compartilhadoEm: true,
          clinicaParceiraId: true,
          valorExame: true,
          statusPagamento: true,
          criadoEm: true
        };

    const [exames, cirurgias] = await Promise.all([
      prisma.exameLaudo.findMany({
        where: filtroUsuario,
        orderBy: { criadoEm: 'desc' },
        skip: offset,
        take: limite,
        ...(selectExame ? { select: selectExame } : {})
      }),
      prisma.relatorioCirurgico.findMany({
        where: filtroUsuario,
        orderBy: { criadoEm: 'desc' },
        skip: offset,
        take: limite,
        ...(selectCirurgia ? { select: selectCirurgia } : {})
      })
    ]);
    const hasMore = exames.length === limite || cirurgias.length === limite;
    res.json({ sucesso: true, exames, cirurgias, hasMore, limit: limite, offset });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar histórico: ' + err.message });
  }
});

// Sprint 3 — Comparativo de exames anteriores do mesmo paciente (usa @@index([pacienteNome]), < 2 ms SQL)
app.get('/api/pacientes/historico', exigirAutenticacao, async (req, res) => {
  try {
    const nome = String(req.query.nome || '').trim();
    if (nome.length < 2) {
      return res.json({ sucesso: true, exames: [] });
    }
    const excluirId = String(req.query.excluirId || '').trim();
    const limite = Math.min(8, Math.max(1, parseInt(req.query.limit || '5', 10) || 5));

    const where = {
      ...(req.usuario.role === 'admin' ? {} : { usuarioId: req.usuario.id }),
      pacienteNome: { contains: nome, mode: 'insensitive' },
      ...(excluirId ? { id: { not: excluirId } } : {})
    };

    const exames = await prisma.exameLaudo.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: limite,
      select: {
        id: true,
        pacienteNome: true,
        pacienteEspecie: true,
        pacienteIdade: true,
        tutorNome: true,
        dataExame: true,
        laudoEstruturado: true,
        imagensQtd: true,
        pdfArquivo: true,
        criadoEm: true
      }
    });

    res.json({ sucesso: true, exames });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico do paciente: ' + err.message });
  }
});

app.get('/api/assinatura/uso', exigirAutenticacao, async (req, res) => {
  try {
    const dados = await obterMetricasUsoAssinatura(req.usuario.id);
    res.json({ sucesso: true, ...dados });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar métricas de assinatura: ' + err.message });
  }
});

app.post('/api/assinatura/trocar-plano', exigirAutenticacao, async (req, res) => {
  try {
    if (req.usuario?.role !== 'admin') {
      return res.status(403).json({
        error: 'Para assinar ou alterar seu plano, utilize o checkout seguro da Stripe.'
      });
    }
    const { plano, ciclo } = req.body || {};
    const dados = await atualizarPlanoAssinatura(req.usuario.id, plano, ciclo);
    res.json({ sucesso: true, ...dados });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar plano: ' + err.message });
  }
});

// ==================== STRIPE BILLING, CHECKOUT & CUSTOMER PORTAL ====================
// Configuração em tempo real do motor de IA (Toggle Gemini 4 Hydrogen na chave paga — somente Admin)
app.get('/api/admin/ia-config', exigirAutenticacao, (req, res) => {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem consultar a configuração de IA.' });
  }
  res.json({ sucesso: true, ...obterConfigIaRuntime() });
});

app.post('/api/admin/ia-config', exigirAutenticacao, (req, res) => {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem alterar a configuração de IA.' });
  }
  const { usarHydrogenPago } = req.body || {};
  const salvo = salvarConfigIaRuntime({ usarHydrogenPago: Boolean(usarHydrogenPago) });
  res.json({ sucesso: true, ...salvo });
});

// Modo Simulação Local (0 tokens) — ESTRITAMENTE bloqueado fora de localhost + ALLOW_LOCAL_AI_MOCK=true
app.get('/api/dev/ia-mock', exigirAutenticacao, (req, res) => {
  const disponivel = isAmbienteLocalSeguro(req);
  res.json({
    sucesso: true,
    mockLocalDisponivel: disponivel,
    usarMockLocal: disponivel ? deveUsarMockLocal(req) : false
  });
});

app.post('/api/dev/ia-mock', exigirAutenticacao, (req, res) => {
  if (!isAmbienteLocalSeguro(req)) {
    return res.status(403).json({
      error: 'O modo simulação local só pode ser alterado em ambiente localhost com ALLOW_LOCAL_AI_MOCK=true.'
    });
  }
  const { usarMockLocal } = req.body || {};
  const salvo = salvarConfigIaRuntime({ usarMockLocal: Boolean(usarMockLocal) });
  res.json({
    sucesso: true,
    mockLocalDisponivel: true,
    usarMockLocal: Boolean(salvo.usarMockLocal)
  });
});

// Ranking silencioso de órgãos mais editados pelos veterinários (somente Admin)
app.get('/api/admin/telemetria-edicoes', exigirAutenticacao, async (req, res) => {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem consultar a telemetria clínica.' });
  }
  try {
    const dias = req.query?.dias ? Number(req.query.dias) : 30;
    const dados = await obterRankingTelemetriaEdicoes(dias);
    res.json({ sucesso: true, ...dados });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar telemetria de edições: ' + err.message });
  }
});

app.get('/api/stripe/config', exigirAutenticacao, (req, res) => {
  res.json({
    habilitado: isStripeConfigurado()
  });
});

app.post('/api/stripe/checkout-session', exigirAutenticacao, async (req, res) => {
  try {
    const { plano, ciclo } = req.body || {};
    const planoKey = String(plano || '').toUpperCase();
    if (!['SOLO', 'PRO', 'CLINICA'].includes(planoKey)) {
      return res.status(400).json({ error: 'Plano inválido para checkout Stripe. Escolha SOLO, PRO ou CLINICA.' });
    }
    const originUrl = resolverOriginSeguro(req);
    const sessao = await criarSessaoCheckout({
      usuario: req.usuario,
      plano: planoKey,
      ciclo: ciclo === 'anual' ? 'anual' : 'mensal',
      originUrl
    });
    res.json({ sucesso: true, ...sessao });
  } catch (err) {
    logger.error({ err: err.message, usuarioId: req.usuario?.id }, 'Erro ao criar sessão Checkout Stripe');
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/stripe/portal-session', exigirAutenticacao, async (req, res) => {
  try {
    const originUrl = resolverOriginSeguro(req);
    const sessao = await criarSessaoPortal({
      usuario: req.usuario,
      originUrl
    });
    res.json({ sucesso: true, ...sessao });
  } catch (err) {
    logger.error({ err: err.message, usuarioId: req.usuario?.id }, 'Erro ao criar sessão Portal Stripe');
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/stripe/confirm-session', exigirAutenticacao, async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId é obrigatório.' });
    }
    const resultado = await confirmarSessaoCheckout(sessionId, req.usuario.id);
    const metricas = await obterMetricasUsoAssinatura(req.usuario.id);
    res.json({ sucesso: true, ...resultado, assinatura: metricas });
  } catch (err) {
    logger.error({ err: err.message, usuarioId: req.usuario?.id }, 'Erro ao confirmar sessão Checkout Stripe');
    res.status(400).json({ error: err.message });
  }
});

// Endpoint leve para consulta rápida do status da cota de ultrassom
app.get('/api/assinatura/status-cota', exigirAutenticacao, async (req, res) => {
  try {
    const status = await verificarLimiteCotaUltrassom(req.usuario.id);
    res.json({
      sucesso: true,
      ...status,
      limite: status.limite === Infinity ? 999999 : status.limite,
      disponivel: status.disponivel === Infinity ? 999999 : status.disponivel
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar cota: ' + err.message });
  }
});

app.post('/api/ultrassom', limiterGeracaoPesada, exigirPermissao('gerar_ultrassom'), upload.array('imagens', 25), async (req, res) => {
  // TRAVA DE LIMITES DA COTA MENSAL DE ULTRASSOM (ADMINS E PLANOS ILIMITADOS NUNCA SÃO BLOQUEADOS)
  const isAdmin = req.usuario && (req.usuario.role === 'admin' || req.usuario.plano === 'ILIMITADO' || req.usuario.plano === 'ADMIN');
  let slotCotaReservado = false;
  const limparUploadsTemp = () => {
    if (Array.isArray(req.files)) {
      req.files.forEach((f) => {
        try { fs.unlinkSync(f.path); } catch (_) {}
      });
    }
  };
  if (!isAdmin) {
    try {
      const checagemCota = await verificarLimiteCotaUltrassom(req.usuario.id);
      if (checagemCota.bloqueado) {
        limparUploadsTemp();
        return res.status(403).json({
          error: checagemCota.motivo,
          codigo: 'COTA_ATINGIDA',
          limite: checagemCota.limite,
          consumido: checagemCota.consumido,
          disponivel: checagemCota.disponivel,
          plano: checagemCota.plano,
          planoNome: checagemCota.planoNome
        });
      }
      reservarSlotCotaUltrassom(req.usuario.id);
      slotCotaReservado = true;
    } catch (errCota) {
      limparUploadsTemp();
      logger.error('Falha ao validar cota de ultrassom (fail-closed)', { error: errCota.message, usuarioId: req.usuario?.id });
      return res.status(503).json({ error: 'Não foi possível validar sua cota no momento. Tente novamente em instantes.' });
    }
  }

  if (!apiKey) {
    if (slotCotaReservado) liberarSlotCotaUltrassom(req.usuario.id);
    limparUploadsTemp();
    return res.status(400).json({ error: 'Chave da API Gemini não configurada (GEMINI_API_KEY).' });
  }
  if (!req.files || req.files.length === 0) {
    if (slotCotaReservado) liberarSlotCotaUltrassom(req.usuario.id);
    return res.status(400).json({ error: 'Nenhuma imagem enviada para o exame.' });
  }

  const jobId = `ultra_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const jobFolder = path.join(outputDir, jobId);
  const imagensDir = path.join(jobFolder, 'imagens');
  fs.mkdirSync(imagensDir, { recursive: true });

  // Preserva cópia das imagens na pasta do exame para permitir recompilações instantâneas
  const caminhosArquivos = req.files.map((f, idx) => {
    const ext = path.extname(f.originalname) || '.jpg';
    const destino = path.join(imagensDir, `img_${idx + 1}_${Date.now()}${ext}`);
    try {
      fs.copyFileSync(f.path, destino);
      return destino;
    } catch (_) {
      return f.path;
    }
  });

  try {
    console.log(`📡 [WEB - ULTRASSOM] [Usuário: ${req.usuario.email}] Processando ${caminhosArquivos.length} imagens...`);
    const layoutUsuario = await obterLayout(req.usuario?.id || null);
    const perfilDoUsuario = await obterPerfilLaudo(req.usuario?.id || null);
    let clinicaParceiraSelecionada = null;
    const clinicaParceiraIdReq = String(req.body?.clinicaParceiraId || '').trim();
    if (clinicaParceiraIdReq && req.usuario?.id) {
      clinicaParceiraSelecionada = await prisma.clinicaParceira.findFirst({
        where: { id: clinicaParceiraIdReq, usuarioId: req.usuario.id }
      }).catch(() => null);
    }
    const usarIdentidadeParceiraUs = Boolean(
      clinicaParceiraSelecionada && clinicaParceiraSelecionada.usarIdentidadePropria
    );

    const usuarioEfetivo = {
      ...req.usuario,
      nome: perfilDoUsuario?.nomeDetectado || req.usuario.nome,
      crmv: perfilDoUsuario?.crmvDetectado || req.usuario.crmv,
      nomeClinica: usarIdentidadeParceiraUs
        ? clinicaParceiraSelecionada.nome
        : (perfilDoUsuario?.clinicaDetectada || req.usuario.nomeClinica),
      logoUrl: (usarIdentidadeParceiraUs && clinicaParceiraSelecionada.logoUrl)
        ? clinicaParceiraSelecionada.logoUrl
        : (req.usuario?.logoUrl || perfilDoUsuario?.templateVisual?.headerLogoUrl || layoutUsuario?.header_banner_url || layoutUsuario?.visual_config_json?.headerLogoUrl || null),
      assinaturaUrl: req.usuario?.assinaturaUrl || perfilDoUsuario?.templateVisual?.assinaturaUrl || layoutUsuario?.assinatura_extraida_url || layoutUsuario?.visual_config_json?.assinaturaUrl || null
    };

    const resultadoIA = await analisarExameComIA(caminhosArquivos, apiKey, {
      usuario: usuarioEfetivo,
      layout: layoutUsuario,
      perfilLaudo: perfilDoUsuario,
      usarMockLocal: deveUsarMockLocal(req),
      req
    });

    const imagensOrdenadas = resultadoIA.caminhosOrdenados || caminhosArquivos;
    const publicToken = gerarPublicToken();
    const compartilhamentoPdf = await prepararDadosQrCodeCompartilhamento(publicToken, {
      baseUrl: resolverOriginSeguro(req),
      exibirQrCode: obterPreferenciaQrCodeRodape(layoutUsuario)
    });
    const docs = await gerarDocumentosExame(
      resultadoIA.paciente,
      resultadoIA.laudo,
      imagensOrdenadas,
      jobFolder,
      layoutUsuario,
      {
        usuario: usuarioEfetivo,
        perfilLaudo: perfilDoUsuario,
        compartilhamento: compartilhamentoPdf
      }
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);
    const pdfUrl = `/downloads/${jobId}/${encodeURIComponent(pdfNome)}`;
    const docxUrl = `/downloads/${jobId}/${encodeURIComponent(docxNome)}`;

    // Mapeia classificacaoImagens (já gerada pela IA a custo zero) por nome de arquivo para o Modo Análise do Vetaro Studio
    const imagensMetaMap = {};
    if (Array.isArray(resultadoIA.classificacaoImagens)) {
      resultadoIA.classificacaoImagens.forEach((cls) => {
        const idx = Number(cls?.indice);
        const caminhoOrig = Number.isInteger(idx) ? caminhosArquivos[idx] : null;
        const nomeArq = caminhoOrig ? path.basename(caminhoOrig) : (cls?.nomeArquivo ? path.basename(cls.nomeArquivo) : '');
        if (nomeArq) {
          imagensMetaMap[nomeArq] = {
            sigla: String(cls?.sigla || '').trim(),
            orgao: String(cls?.orgao || '').trim(),
            statusVisual: String(cls?.statusVisual || 'NORMAL').trim(),
            medidasLidas: Array.isArray(cls?.medidasLidas) ? cls.medidasLidas.slice(0, 6) : []
          };
        }
      });
    }

    // Salva metadados estruturados para edição e recompilação rápida
    try {
      fs.writeFileSync(
        path.join(jobFolder, 'meta_exame.json'),
        JSON.stringify({
          jobId,
          paciente: resultadoIA.paciente,
          laudo: resultadoIA.laudo,
          laudoOriginalIA: resultadoIA.laudo,
          imagensPaths: imagensOrdenadas,
          imagensMeta: imagensMetaMap,
          clinicaParceiraId: clinicaParceiraSelecionada?.id || null,
          usuarioId: req.usuario?.id,
          criadoEm: new Date().toISOString()
        }, null, 2),
        'utf8'
      );
    } catch (metaErr) {
      logger.warn('Aviso ao salvar meta_exame.json', { error: metaErr.message });
    }

    const finUltrassom = calcularValoresFinanceirosExame({
      clinica: clinicaParceiraSelecionada,
      tipo: 'ultrassom',
      valorOverride: req.body?.valorExame,
      quemPagou: req.body?.quemPagou,
      formaPagamento: req.body?.formaPagamento
    });

    let exameCriadoId = null;
    if (req.usuario && req.usuario.id) {
      const criado = await prisma.exameLaudo.create({
        data: {
          usuarioId: req.usuario.id,
          pacienteNome: resultadoIA.paciente?.nome || 'Não identificado',
          pacienteEspecie: resultadoIA.paciente?.especie || 'Canina',
          pacienteSexo: resultadoIA.paciente?.sexo || null,
          pacienteIdade: resultadoIA.paciente?.idade || null,
          tutorNome: resultadoIA.paciente?.tutor || null,
          dataExame: resultadoIA.paciente?.data || new Date().toLocaleDateString('pt-BR'),
          laudoEstruturado: resultadoIA.laudo || [],
          imagensQtd: caminhosArquivos.length,
          pdfArquivo: pdfUrl,
          docxArquivo: docxUrl,
          publicToken,
          clinicaParceiraId: clinicaParceiraSelecionada?.id || null,
          ...finUltrassom
        }
      }).catch(e => {
        logger.warn('Aviso ao salvar histórico de ultrassom', { error: e.message });
        return null;
      });
      exameCriadoId = criado?.id || null;
    }

    res.json({
      sucesso: true,
      jobId,
      exameId: exameCriadoId,
      publicToken,
      urlPublica: compartilhamentoPdf.urlPublica,
      paciente: resultadoIA.paciente,
      laudo: resultadoIA.laudo,
      pdfUrl,
      docxUrl,
      pdfNome,
      docxNome
    });
  } catch (err) {
    console.error('Erro ao processar ultrassom:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao processar laudo de ultrassom.' });
  } finally {
    if (slotCotaReservado) {
      liberarSlotCotaUltrassom(req.usuario.id);
    }
    // Remove os arquivos temporários de uploads/
    req.files.forEach(f => {
      try { fs.unlinkSync(f.path); } catch (_) {}
    });
  }
});

app.post('/api/cirurgia', limiterGeracaoPesada, exigirPermissao('gerar_cirurgia'), upload.fields([
  { name: 'documento', maxCount: 1 },
  { name: 'fotos', maxCount: 5 }
]), async (req, res) => {
  if (!apiKey) {
    return res.status(400).json({ error: 'Chave da API Gemini não configurada (GEMINI_API_KEY).' });
  }

  const docFile = req.files && req.files['documento'] ? req.files['documento'][0] : null;
  const fotoFiles = req.files && req.files['fotos'] ? req.files['fotos'] : [];
  const textoDigitado = (req.body.textoDigitado || req.body.textoCirurgia || req.body.anotacoes || '').trim();

  if (!docFile && fotoFiles.length === 0 && !textoDigitado) {
    return res.status(400).json({ error: 'Envie ao menos um documento (.docx, .pages, .txt, áudio), foto ou digite as informações da cirurgia.' });
  }

  const jobId = `cirurg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const jobFolder = path.join(outputDir, jobId);
  fs.mkdirSync(jobFolder, { recursive: true });

  if (textoDigitado) {
    const caminhoTxt = path.join(jobFolder, 'anotacoes_digitadas.txt');
    fs.writeFileSync(caminhoTxt, textoDigitado, 'utf8');
  }

  const fotosDir = path.join(jobFolder, 'fotos');
  fs.mkdirSync(fotosDir, { recursive: true });
  const fotosCaminhos = fotoFiles.map((f, idx) => {
    const ext = path.extname(f.originalname) || '.jpg';
    const destino = path.join(fotosDir, `foto_${idx + 1}_${Date.now()}${ext}`);
    try {
      fs.copyFileSync(f.path, destino);
      return destino;
    } catch (_) {
      return f.path;
    }
  });

  const todosArquivos = [];
  if (docFile) todosArquivos.push(docFile.path);
  todosArquivos.push(...fotosCaminhos);

  try {
    console.log(`🔪 [WEB - CIRURGIA] [Usuário: ${req.usuario.email}] Analisando procedimento cirúrgico...`);
    const perfilCirurgicoUsuario = req.usuario?.id ? await obterPerfilCirurgico(req.usuario.id).catch(() => null) : null;
    const resultadoIA = await analisarCirurgiaComIA(todosArquivos, apiKey, {
      usuario: req.usuario,
      perfilCirurgico: perfilCirurgicoUsuario,
      textoDigitado: textoDigitado || null,
      usarMockLocal: deveUsarMockLocal(req),
      req
    });

    const cir = resultadoIA.cirurgia;
    const textoProcedimento = (cir.procedimento || '').trim();
    const modeloDetetado = await inferirModeloPorTexto(textoProcedimento, req.usuario?.id || null);
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

    const layoutUsuario = await obterLayout(req.usuario?.id || null);
    const perfilDoUsuario = req.usuario?.id ? await obterPerfilLaudo(req.usuario.id).catch(() => null) : null;
    const legendaPadraoCir = perfilCirurgicoUsuario?.templateVisual?.legendaPadraoFoto || 'Registro fotográfico intraoperatório / peça cirúrgica';

    let legendasFotosIniciais = [];
    if (req.body.legendasFotos) {
      try {
        const parsed = typeof req.body.legendasFotos === 'string' ? JSON.parse(req.body.legendasFotos) : req.body.legendasFotos;
        if (Array.isArray(parsed)) legendasFotosIniciais = parsed;
      } catch (_) {}
    }
    const legendasFotos = fotosCaminhos.map((_, idx) => {
      const l = legendasFotosIniciais[idx];
      return (typeof l === 'string' && l.trim()) ? l.trim() : `Figura ${idx + 1} - ${legendaPadraoCir}`;
    });
    resultadoIA.cirurgia.legendasFotos = legendasFotos;

    let clinicaParceiraCir = null;
    const clinicaParceiraIdCir = String(req.body?.clinicaParceiraId || '').trim();
    if (clinicaParceiraIdCir && req.usuario?.id) {
      clinicaParceiraCir = await prisma.clinicaParceira.findFirst({
        where: { id: clinicaParceiraIdCir, usuarioId: req.usuario.id }
      }).catch(() => null);
    }
    const usarIdentidadeParceiraCir = Boolean(
      clinicaParceiraCir && clinicaParceiraCir.usarIdentidadePropria
    );

    const usuarioEfetivo = {
      ...(req.usuario || {}),
      nome: perfilCirurgicoUsuario?.nomeDetectado || req.usuario?.nome,
      crmv: perfilCirurgicoUsuario?.crmvDetectado || req.usuario?.crmv,
      nomeClinica: usarIdentidadeParceiraCir
        ? clinicaParceiraCir.nome
        : (perfilCirurgicoUsuario?.clinicaDetectada || req.usuario?.nomeClinica),
      logoUrl: (usarIdentidadeParceiraCir && clinicaParceiraCir.logoUrl)
        ? clinicaParceiraCir.logoUrl
        : (req.usuario?.logoUrl ||
        perfilCirurgicoUsuario?.templateVisual?.ativosVisuais?.headerLogoUrl ||
        perfilCirurgicoUsuario?.templateVisual?.headerLogoUrl ||
        perfilDoUsuario?.templateVisual?.ativosVisuais?.headerLogoUrl ||
        perfilDoUsuario?.templateVisual?.visualConfigClonado?.headerLogoUrl ||
        perfilDoUsuario?.templateVisual?.headerLogoUrl ||
        layoutUsuario?.header_logo_url ||
        layoutUsuario?.visual_config_json?.headerLogoUrl ||
        layoutUsuario?.header_banner_url ||
        null),
      assinaturaUrl: req.usuario?.assinaturaUrl ||
        perfilCirurgicoUsuario?.templateVisual?.ativosVisuais?.assinaturaUrl ||
        perfilDoUsuario?.templateVisual?.ativosVisuais?.assinaturaUrl ||
        perfilDoUsuario?.templateVisual?.assinaturaUrl ||
        layoutUsuario?.assinatura_extraida_url ||
        null
    };

    const publicToken = gerarPublicToken();
    const compartilhamentoPdf = await prepararDadosQrCodeCompartilhamento(publicToken, {
      baseUrl: resolverOriginSeguro(req),
      exibirQrCode: obterPreferenciaQrCodeRodape(layoutUsuario)
    });
    const docs = await gerarDocumentosCirurgicos(
      resultadoIA.paciente,
      resultadoIA.cirurgia,
      jobFolder,
      fotosCaminhos,
      {
        usuario: usuarioEfetivo,
        layout: layoutUsuario,
        perfilLaudo: perfilDoUsuario,
        perfilCirurgico: perfilCirurgicoUsuario,
        legendasFotos,
        compartilhamento: compartilhamentoPdf
      }
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);
    const pdfUrl = `/downloads/${jobId}/${encodeURIComponent(pdfNome)}`;
    const docxUrl = `/downloads/${jobId}/${encodeURIComponent(docxNome)}`;
    const fotosResposta = fotosCaminhos.map((p, idx) => {
      const nomeArq = path.basename(p);
      return {
        index: idx,
        nome: nomeArq,
        url: `/downloads/${jobId}/fotos/${encodeURIComponent(nomeArq)}`,
        legenda: legendasFotos[idx]
      };
    });

    // Salva metadados da cirurgia para recompilações
    try {
      fs.writeFileSync(
        path.join(jobFolder, 'meta_cirurgia.json'),
        JSON.stringify({
          jobId,
          paciente: resultadoIA.paciente,
          cirurgia: resultadoIA.cirurgia,
          fotosCaminhos,
          legendasFotos,
          clinicaParceiraId: clinicaParceiraCir?.id || null,
          usuarioId: req.usuario?.id,
          criadoEm: new Date().toISOString()
        }, null, 2),
        'utf8'
      );
    } catch (metaErr) {
      logger.warn('Aviso ao salvar meta_cirurgia.json', { error: metaErr.message });
    }

    const finCirurgia = calcularValoresFinanceirosExame({
      clinica: clinicaParceiraCir,
      tipo: 'cirurgia',
      valorOverride: req.body?.valorExame,
      quemPagou: req.body?.quemPagou,
      formaPagamento: req.body?.formaPagamento
    });

    let relatorioCriadoId = null;
    if (req.usuario && req.usuario.id) {
      const criado = await prisma.relatorioCirurgico.create({
        data: {
          usuarioId: req.usuario.id,
          pacienteNome: resultadoIA.paciente?.nome || 'Paciente',
          pacienteEspecie: resultadoIA.paciente?.especie || null,
          procedimento: resultadoIA.cirurgia?.procedimento || 'Procedimento Cirúrgico',
          diagnostico: resultadoIA.cirurgia?.diagnosticoPreCirurgico || null,
          modeloUtilizado: resultadoIA.cirurgia?.modeloUso || resultadoIA.cirurgia?.modelo || null,
          dadosCirurgia: resultadoIA.cirurgia || {},
          possuiFoto: fotosCaminhos.length > 0,
          pdfArquivo: pdfUrl,
          docxArquivo: docxUrl,
          publicToken,
          clinicaParceiraId: clinicaParceiraCir?.id || null,
          ...finCirurgia
        }
      }).catch(e => {
        logger.warn('Aviso ao salvar histórico cirúrgico', { error: e.message });
        return null;
      });
      relatorioCriadoId = criado?.id || null;
    }

    res.json({
      sucesso: true,
      jobId,
      relatorioId: relatorioCriadoId,
      publicToken,
      urlPublica: compartilhamentoPdf.urlPublica,
      paciente: resultadoIA.paciente,
      cirurgia: resultadoIA.cirurgia,
      fotos: fotosResposta,
      legendasFotos,
      pdfUrl,
      docxUrl,
      pdfNome,
      docxNome
    });
  } catch (err) {
    console.error('Erro ao processar cirurgia:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao processar relatório cirúrgico.' });
  } finally {
    if (docFile) {
      try { fs.unlinkSync(docFile.path); } catch (_) {}
    }
    fotoFiles.forEach(f => {
      try { fs.unlinkSync(f.path); } catch (_) {}
    });
  }
});

// =========================================================================
// RECOMPILAÇÃO E EDIÇÃO EM TEMPO REAL DE LAUDOS E CIRURGIAS
// =========================================================================

app.post('/api/ultrassom/recompilar', limiterGeracaoPesada, exigirAutenticacao, exigirPermissao('gerar_ultrassom'), async (req, res) => {
  const { jobId, paciente, laudo, estiloOverride: estiloOverrideReq, ordemImagens } = req.body;
  if (!jobId || !laudo || !Array.isArray(laudo)) {
    return res.status(400).json({ error: 'Parâmetros inválidos. Informe jobId, paciente e a lista de órgãos (laudo).' });
  }

  const safeJobId = path.basename(jobId);
  const jobFolder = path.join(outputDir, safeJobId);
  if (!fs.existsSync(jobFolder)) {
    return res.status(404).json({ error: 'Exame não encontrado ou sessão expirada no servidor.' });
  }
  const autorizadoJob = await verificarDonoDoJob(safeJobId, req.usuario);
  if (!autorizadoJob) {
    return res.status(403).json({ error: 'Você não tem permissão para editar este exame.' });
  }

  try {
    const metaPath = path.join(jobFolder, 'meta_exame.json');
    let imagensOrdenadas = [];
    let laudoOriginalIA = null;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (req.usuario.role !== 'admin' && meta.usuarioId && meta.usuarioId !== req.usuario.id) {
          return res.status(403).json({ error: 'Você não tem permissão para editar este exame.' });
        }
        imagensOrdenadas = Array.isArray(meta.imagensPaths) ? meta.imagensPaths : [];
        if (Array.isArray(ordemImagens) && ordemImagens.length > 0 && imagensOrdenadas.length > 0) {
          const mapaPorNome = new Map(imagensOrdenadas.map((p) => [path.basename(p), p]));
          const reordenadas = [];
          const usados = new Set();
          for (const nome of ordemImagens) {
            const k = path.basename(String(nome || ''));
            if (mapaPorNome.has(k) && !usados.has(k)) {
              reordenadas.push(mapaPorNome.get(k));
              usados.add(k);
            }
          }
          for (const p of imagensOrdenadas) {
            const k = path.basename(p);
            if (!usados.has(k)) reordenadas.push(p);
          }
          imagensOrdenadas = reordenadas;
        }
        laudoOriginalIA = Array.isArray(meta.laudoOriginalIA)
          ? meta.laudoOriginalIA
          : Array.isArray(meta.laudo)
          ? meta.laudo
          : null;
      } catch (_) {}
    }

    // Fallback: se não encontrar no meta, vasculha o diretório imagens/ do job
    if (imagensOrdenadas.length === 0) {
      const imgDir = path.join(jobFolder, 'imagens');
      if (fs.existsSync(imgDir)) {
        imagensOrdenadas = fs.readdirSync(imgDir)
          .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
          .map(f => path.join(imgDir, f));
      }
    }

    const layoutUsuario = await obterLayout(req.usuario?.id || null);
    const perfilDoUsuario = await obterPerfilLaudo(req.usuario?.id || null);
    const usuarioEfetivo = {
      ...req.usuario,
      nome: perfilDoUsuario?.nomeDetectado || req.usuario.nome,
      crmv: perfilDoUsuario?.crmvDetectado || req.usuario.crmv,
      nomeClinica: perfilDoUsuario?.clinicaDetectada || req.usuario.nomeClinica,
      logoUrl: req.usuario?.logoUrl || perfilDoUsuario?.templateVisual?.headerLogoUrl || layoutUsuario?.header_banner_url || layoutUsuario?.visual_config_json?.headerLogoUrl || null,
      assinaturaUrl: req.usuario?.assinaturaUrl || perfilDoUsuario?.templateVisual?.assinaturaUrl || layoutUsuario?.assinatura_extraida_url || layoutUsuario?.visual_config_json?.assinaturaUrl || null
    };

    const estiloOverrideLimpo = (estiloOverrideReq && typeof estiloOverrideReq === 'object' && Object.keys(estiloOverrideReq).length > 0)
      ? estiloOverrideReq
      : null;

    let layoutEfetivoUs = layoutUsuario;
    let perfilEfetivoUs = perfilDoUsuario;

    if (estiloOverrideLimpo) {
      const ov = estiloOverrideLimpo;
      const visualBase = perfilDoUsuario?.templateVisual?.visualConfigClonado || layoutUsuario?.visual_config_json || null;
      let visualClonadoOv = visualBase ? JSON.parse(JSON.stringify(visualBase)) : null;
      if (visualClonadoOv) {
        visualClonadoOv.bodyTypography = {
          ...(visualClonadoOv.bodyTypography || {}),
          ...(ov.fontFamily ? { fontFamily: ov.fontFamily } : {}),
          ...(ov.fontSizeBody ? { fontSize: ov.fontSizeBody } : {}),
          ...(ov.lineHeight ? { lineHeight: String(ov.lineHeight) } : {}),
          ...(ov.paragraphSpacing ? { paragraphSpacing: ov.paragraphSpacing } : {})
        };
        visualClonadoOv.titleConfig = {
          ...(visualClonadoOv.titleConfig || {}),
          ...(ov.fontSizeTitulo ? { fontSize: ov.fontSizeTitulo } : {}),
          ...(ov.corPrimaria ? { color: ov.corPrimaria } : {})
        };
        if (ov.fontSizeCabecalho) {
          visualClonadoOv.patientHeader = {
            ...(visualClonadoOv.patientHeader || {}),
            fontSize: ov.fontSizeCabecalho
          };
        }
        visualClonadoOv.margins = {
          ...(visualClonadoOv.margins || {}),
          ...(ov.marginTop ? { topFirstPage: ov.marginTop, topContinuationPages: ov.marginTop } : {}),
          ...(ov.marginBottom ? { bottom: ov.marginBottom } : {}),
          ...(ov.marginLeft ? { left: ov.marginLeft } : {}),
          ...(ov.marginRight ? { right: ov.marginRight } : {})
        };
      }

      layoutEfetivoUs = {
        ...layoutUsuario,
        ...(ov.fontFamily ? { font_family: ov.fontFamily } : {}),
        ...(ov.fontSizeBody ? { font_size_body: ov.fontSizeBody } : {}),
        ...(ov.fontSizeCabecalho ? { font_size_cabecalho: ov.fontSizeCabecalho } : {}),
        ...(ov.fontSizeTitulo ? { font_size_titulo: ov.fontSizeTitulo } : {}),
        ...(ov.paragraphSpacing ? { paragraph_spacing: ov.paragraphSpacing } : {}),
        ...(ov.lineHeight ? { line_height: String(ov.lineHeight) } : {}),
        ...(ov.paginacaoTexto ? { paginacao_texto: ov.paginacaoTexto } : {}),
        ...(ov.mostrarAssinaturaImagem !== undefined ? { mostrar_assinatura_imagem: Boolean(ov.mostrarAssinaturaImagem) } : {}),
        ...(ov.mostrarAssinaturaTexto !== undefined ? { mostrar_assinatura_texto: Boolean(ov.mostrarAssinaturaTexto) } : {}),
        ...(ov.corPrimaria ? { cor_primaria: ov.corPrimaria } : {}),
        ...(ov.corSecundaria ? { cor_secundaria: ov.corSecundaria } : {}),
        ...(ov.marginTop ? { margin_top: ov.marginTop } : {}),
        ...(ov.marginBottom ? { margin_bottom: ov.marginBottom } : {}),
        ...(ov.marginLeft ? { margin_left: ov.marginLeft } : {}),
        ...(ov.marginRight ? { margin_right: ov.marginRight } : {}),
        ...(visualClonadoOv ? { visual_config_json: visualClonadoOv } : {})
      };

      if (perfilDoUsuario) {
        perfilEfetivoUs = {
          ...perfilDoUsuario,
          templateVisual: {
            ...(perfilDoUsuario.templateVisual || {}),
            ...ov,
            ...(visualClonadoOv ? { visualConfigClonado: visualClonadoOv } : {})
          }
        };
      }
    }

    let publicTokenExistente = null;
    if (req.usuario && req.usuario.id) {
      const exameExistente = await prisma.exameLaudo.findFirst({
        where: { usuarioId: req.usuario.id, pdfArquivo: { contains: safeJobId } },
        select: { id: true, publicToken: true }
      }).catch(() => null);
      publicTokenExistente = exameExistente?.publicToken || gerarPublicToken();
    } else {
      publicTokenExistente = gerarPublicToken();
    }
    const compartilhamentoPdf = await prepararDadosQrCodeCompartilhamento(publicTokenExistente, {
      baseUrl: resolverOriginSeguro(req),
      exibirQrCode: obterPreferenciaQrCodeRodape(layoutEfetivoUs || layoutUsuario)
    });

    const docs = await gerarDocumentosExame(
      paciente || {},
      laudo,
      imagensOrdenadas,
      jobFolder,
      layoutEfetivoUs,
      {
        usuario: usuarioEfetivo,
        perfilLaudo: perfilEfetivoUs,
        compartilhamento: compartilhamentoPdf
      }
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);
    const cacheBuster = Date.now();
    const pdfUrl = `/downloads/${safeJobId}/${encodeURIComponent(pdfNome)}?v=${cacheBuster}`;
    const docxUrl = `/downloads/${safeJobId}/${encodeURIComponent(docxNome)}?v=${cacheBuster}`;

    let imagensMetaExistente = null;
    if (fs.existsSync(metaPath)) {
      try {
        const metaPrev = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (metaPrev && metaPrev.imagensMeta && typeof metaPrev.imagensMeta === 'object') {
          imagensMetaExistente = metaPrev.imagensMeta;
        }
      } catch (_) {}
    }

    // Atualiza o arquivo de metadados preservando laudoOriginalIA e imagensMeta
    fs.writeFileSync(metaPath, JSON.stringify({
      jobId: safeJobId,
      paciente,
      laudo,
      ...(laudoOriginalIA ? { laudoOriginalIA } : {}),
      ...(imagensMetaExistente ? { imagensMeta: imagensMetaExistente } : {}),
      estiloOverride: estiloOverrideLimpo,
      imagensPaths: imagensOrdenadas,
      usuarioId: req.usuario?.id,
      atualizadoEm: new Date().toISOString()
    }, null, 2), 'utf8');

    // Telemetria silenciosa (não bloqueia a resposta do PDF)
    if (req.usuario?.id && Array.isArray(laudoOriginalIA) && laudoOriginalIA.length > 0) {
      registrarTelemetriaEdicao({
        jobId: safeJobId,
        usuarioId: req.usuario.id,
        laudoOriginalIA,
        laudoEditado: laudo
      }).catch((telErr) => {
        logger.warn({ err: telErr.message }, 'Aviso silencioso na telemetria de edições');
      });
    }

    // Atualiza o registro no PostgreSQL se existir
    if (req.usuario && req.usuario.id) {
      await prisma.exameLaudo.updateMany({
        where: {
          usuarioId: req.usuario.id,
          pdfArquivo: { contains: safeJobId }
        },
        data: {
          pacienteNome: paciente?.nome || 'Não identificado',
          pacienteEspecie: paciente?.especie || 'Canina',
          pacienteSexo: paciente?.sexo || null,
          pacienteIdade: paciente?.idade || null,
          tutorNome: paciente?.tutor || null,
          laudoEstruturado: laudo,
          pdfArquivo: `/downloads/${safeJobId}/${encodeURIComponent(pdfNome)}`,
          docxArquivo: `/downloads/${safeJobId}/${encodeURIComponent(docxNome)}`,
          ...(publicTokenExistente ? { publicToken: publicTokenExistente } : {})
        }
      }).catch(e => logger.warn('Aviso ao sincronizar exame recompilado no banco', { error: e.message }));
    }

    res.json({
      sucesso: true,
      mensagem: 'Laudo recompilado com sucesso com suas modificações!',
      publicToken: publicTokenExistente,
      urlPublica: compartilhamentoPdf.urlPublica,
      paciente,
      laudo,
      estiloOverride: estiloOverrideLimpo,
      pdfUrl,
      docxUrl,
      pdfNome,
      docxNome
    });
  } catch (err) {
    console.error('Erro ao recompilar laudo de ultrassom:', err);
    res.status(500).json({ error: err.message || 'Erro ao recompilar documentos do laudo.' });
  }
});

app.post('/api/cirurgia/recompilar', limiterGeracaoPesada, exigirAutenticacao, exigirPermissao('gerar_cirurgia'), async (req, res) => {
  const { jobId, paciente, cirurgia, legendasFotos: legendasReq, estiloOverride: estiloOverrideReq } = req.body;
  if (!jobId || !cirurgia) {
    return res.status(400).json({ error: 'Parâmetros inválidos. Informe jobId e os dados da cirurgia.' });
  }

  const safeJobId = path.basename(jobId);
  const jobFolder = path.join(outputDir, safeJobId);
  if (!fs.existsSync(jobFolder)) {
    return res.status(404).json({ error: 'Relatório não encontrado ou sessão expirada no servidor.' });
  }
  const autorizadoJob = await verificarDonoDoJob(safeJobId, req.usuario);
  if (!autorizadoJob) {
    return res.status(403).json({ error: 'Você não tem permissão para editar este relatório.' });
  }

  try {
    const metaPath = path.join(jobFolder, 'meta_cirurgia.json');
    let fotosCaminhos = [];
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (req.usuario.role !== 'admin' && meta.usuarioId && meta.usuarioId !== req.usuario.id) {
          return res.status(403).json({ error: 'Você não tem permissão para editar este relatório.' });
        }
        fotosCaminhos = meta.fotosCaminhos || [];
      } catch (_) {}
    }

    if (fotosCaminhos.length === 0) {
      const fotosDir = path.join(jobFolder, 'fotos');
      if (fs.existsSync(fotosDir)) {
        fotosCaminhos = fs.readdirSync(fotosDir)
          .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
          .map(f => path.join(fotosDir, f));
      }
    }

    const layoutUsuario = await obterLayout(req.usuario?.id || null);
    const perfilDoUsuario = req.usuario?.id ? await obterPerfilLaudo(req.usuario.id).catch(() => null) : null;
    const perfilCirurgicoUsuario = req.usuario?.id ? await obterPerfilCirurgico(req.usuario.id).catch(() => null) : null;
    const legendaPadraoCir = perfilCirurgicoUsuario?.templateVisual?.legendaPadraoFoto || 'Registro fotográfico intraoperatório / peça cirúrgica';

    const legendasBrutas = Array.isArray(legendasReq)
      ? legendasReq
      : (Array.isArray(cirurgia?.legendasFotos) ? cirurgia.legendasFotos : []);
    const legendasFotos = fotosCaminhos.map((_, idx) => {
      const l = legendasBrutas[idx];
      return (typeof l === 'string' && l.trim()) ? l.trim() : `Figura ${idx + 1} - ${legendaPadraoCir}`;
    });
    const estiloOverrideLimpo = (estiloOverrideReq && typeof estiloOverrideReq === 'object' && Object.keys(estiloOverrideReq).length > 0)
      ? estiloOverrideReq
      : null;
    const perfilCirurgicoEfetivo = estiloOverrideLimpo
      ? {
          ...(perfilCirurgicoUsuario || {}),
          ativo: true,
          templateVisual: {
            ...(perfilCirurgicoUsuario?.templateVisual || {}),
            ...estiloOverrideLimpo
          }
        }
      : perfilCirurgicoUsuario;
    const cirurgiaComLegendas = { ...cirurgia, legendasFotos, estiloOverride: estiloOverrideLimpo };

    const usuarioEfetivo = {
      ...(req.usuario || {}),
      nome: perfilCirurgicoUsuario?.nomeDetectado || req.usuario?.nome,
      crmv: perfilCirurgicoUsuario?.crmvDetectado || req.usuario?.crmv,
      nomeClinica: perfilCirurgicoUsuario?.clinicaDetectada || req.usuario?.nomeClinica,
      logoUrl: req.usuario?.logoUrl ||
        perfilCirurgicoUsuario?.templateVisual?.ativosVisuais?.headerLogoUrl ||
        perfilCirurgicoUsuario?.templateVisual?.headerLogoUrl ||
        perfilDoUsuario?.templateVisual?.ativosVisuais?.headerLogoUrl ||
        perfilDoUsuario?.templateVisual?.visualConfigClonado?.headerLogoUrl ||
        perfilDoUsuario?.templateVisual?.headerLogoUrl ||
        layoutUsuario?.header_logo_url ||
        layoutUsuario?.visual_config_json?.headerLogoUrl ||
        layoutUsuario?.header_banner_url ||
        null,
      assinaturaUrl: req.usuario?.assinaturaUrl ||
        perfilCirurgicoUsuario?.templateVisual?.ativosVisuais?.assinaturaUrl ||
        perfilDoUsuario?.templateVisual?.ativosVisuais?.assinaturaUrl ||
        perfilDoUsuario?.templateVisual?.assinaturaUrl ||
        layoutUsuario?.assinatura_extraida_url ||
        null
    };

    let publicTokenExistente = null;
    if (req.usuario && req.usuario.id) {
      const relExistente = await prisma.relatorioCirurgico.findFirst({
        where: { usuarioId: req.usuario.id, pdfArquivo: { contains: safeJobId } },
        select: { id: true, publicToken: true }
      }).catch(() => null);
      publicTokenExistente = relExistente?.publicToken || gerarPublicToken();
    } else {
      publicTokenExistente = gerarPublicToken();
    }
    const compartilhamentoPdf = await prepararDadosQrCodeCompartilhamento(publicTokenExistente, {
      baseUrl: resolverOriginSeguro(req),
      exibirQrCode: obterPreferenciaQrCodeRodape(layoutUsuario)
    });

    const docs = await gerarDocumentosCirurgicos(
      paciente || {},
      cirurgiaComLegendas,
      jobFolder,
      fotosCaminhos,
      {
        usuario: usuarioEfetivo,
        layout: layoutUsuario,
        perfilLaudo: perfilDoUsuario,
        perfilCirurgico: perfilCirurgicoEfetivo,
        legendasFotos,
        compartilhamento: compartilhamentoPdf
      }
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);
    const cacheBuster = Date.now();
    const pdfUrl = `/downloads/${safeJobId}/${encodeURIComponent(pdfNome)}?v=${cacheBuster}`;
    const docxUrl = `/downloads/${safeJobId}/${encodeURIComponent(docxNome)}?v=${cacheBuster}`;
    const fotosResposta = fotosCaminhos.map((p, idx) => {
      const nomeArq = path.basename(p);
      return {
        index: idx,
        nome: nomeArq,
        url: `/downloads/${safeJobId}/fotos/${encodeURIComponent(nomeArq)}`,
        legenda: legendasFotos[idx]
      };
    });

    fs.writeFileSync(metaPath, JSON.stringify({
      jobId: safeJobId,
      paciente,
      cirurgia: cirurgiaComLegendas,
      estiloOverride: estiloOverrideLimpo,
      fotosCaminhos,
      legendasFotos,
      usuarioId: req.usuario?.id,
      atualizadoEm: new Date().toISOString()
    }, null, 2), 'utf8');

    if (req.usuario && req.usuario.id) {
      await prisma.relatorioCirurgico.updateMany({
        where: {
          usuarioId: req.usuario.id,
          pdfArquivo: { contains: safeJobId }
        },
        data: {
          pacienteNome: paciente?.nome || 'Paciente',
          pacienteEspecie: paciente?.especie || null,
          procedimento: cirurgia.procedimento || 'Procedimento Cirúrgico',
          diagnostico: cirurgia.diagnosticoPreCirurgico || null,
          dadosCirurgia: cirurgiaComLegendas,
          pdfArquivo: `/downloads/${safeJobId}/${encodeURIComponent(pdfNome)}`,
          docxArquivo: `/downloads/${safeJobId}/${encodeURIComponent(docxNome)}`,
          ...(publicTokenExistente ? { publicToken: publicTokenExistente } : {})
        }
      }).catch(e => logger.warn('Aviso ao sincronizar relatório recompilado no banco', { error: e.message }));
    }

    res.json({
      sucesso: true,
      mensagem: 'Relatório cirúrgico recompilado com sucesso com suas modificações!',
      publicToken: publicTokenExistente,
      urlPublica: compartilhamentoPdf.urlPublica,
      paciente,
      cirurgia: cirurgiaComLegendas,
      estiloOverride: estiloOverrideLimpo,
      fotos: fotosResposta,
      legendasFotos,
      pdfUrl,
      docxUrl,
      pdfNome,
      docxNome
    });
  } catch (err) {
    console.error('Erro ao recompilar relatório cirúrgico:', err);
    res.status(500).json({ error: err.message || 'Erro ao recompilar relatório cirúrgico.' });
  }
});

// =========================================================================
// FAVICONS OFICIAIS VETARO (SEM FALLBACK PARA INDEX.HTML)
// =========================================================================
app.get('/favicon.ico', (req, res) => {
  const icoDist = path.join(__dirname, 'frontend', 'dist', 'favicon.ico');
  const icoPub = path.join(__dirname, 'frontend', 'public', 'favicon.ico');
  const target = fs.existsSync(icoDist) ? icoDist : (fs.existsSync(icoPub) ? icoPub : null);
  if (target) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(target);
  }
  res.status(204).end();
});

app.get('/favicon.png', (req, res) => {
  const pngDist = path.join(__dirname, 'frontend', 'dist', 'favicon.png');
  const pngPub = path.join(__dirname, 'frontend', 'public', 'favicon.png');
  const target = fs.existsSync(pngDist) ? pngDist : (fs.existsSync(pngPub) ? pngPub : null);
  if (target) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(target);
  }
  res.status(204).end();
});

app.get('/favicon.svg', (req, res) => {
  const svgDist = path.join(__dirname, 'frontend', 'dist', 'favicon.svg');
  const svgPub = path.join(__dirname, 'frontend', 'public', 'favicon.svg');
  const target = fs.existsSync(svgDist) ? svgDist : (fs.existsSync(svgPub) ? svgPub : null);
  if (target) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(target);
  }
  res.status(204).end();
});

// =========================================================================
// SERVIÇO ESTÁTICO DO FRONTEND REACT (VETARO DESIGN SYSTEM)
// =========================================================================


function obterPreferenciaQrCodeRodape(layoutUsuario) {
  return Boolean(
    layoutUsuario?.visual_config_json?.exibirQrCodeRodape === true ||
    layoutUsuario?.visualConfigJson?.exibirQrCodeRodape === true
  );
}

app.get('/api/preferencias/qrcode-rodape', exigirAutenticacao, async (req, res) => {
  try {
    const layoutUsuario = await obterLayout(req.usuario.id);
    res.json({
      sucesso: true,
      exibirQrCodeRodape: obterPreferenciaQrCodeRodape(layoutUsuario)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar preferência de QR Code.' });
  }
});

app.put('/api/preferencias/qrcode-rodape', exigirAutenticacao, async (req, res) => {
  try {
    const ativo = Boolean(req.body?.exibirQrCodeRodape === true);
    const existente = await prisma.configuracaoLayout.findFirst({
      where: { usuarioId: req.usuario.id }
    });
    if (existente) {
      const visualAtual =
        existente.visualConfigJson && typeof existente.visualConfigJson === 'object'
          ? existente.visualConfigJson
          : {};
      await prisma.configuracaoLayout.update({
        where: { id: existente.id },
        data: {
          visualConfigJson: {
            ...visualAtual,
            exibirQrCodeRodape: ativo
          }
        }
      });
    } else {
      await prisma.configuracaoLayout.create({
        data: {
          usuarioId: req.usuario.id,
          nome: 'Padrão Vetaro',
          visualConfigJson: { exibirQrCodeRodape: ativo }
        }
      });
    }
    res.json({ sucesso: true, exibirQrCodeRodape: ativo });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao salvar preferência de QR Code no rodapé');
    res.status(500).json({ error: 'Erro ao salvar preferência de QR Code.' });
  }
});

// ==================== FASE 2: MODO VOLANTE (CLÍNICAS PARCEIRAS & FINANCEIRO) ====================

app.get('/api/clinicas-parceiras', exigirAutenticacao, async (req, res) => {
  try {
    const incluirInativas = req.query.incluirInativas === '1';
    const [clinicas, assinatura] = await Promise.all([
      prisma.clinicaParceira.findMany({
        where: {
          usuarioId: req.usuario.id,
          ...(incluirInativas ? {} : { ativa: true })
        },
        orderBy: [{ ativa: 'desc' }, { nome: 'asc' }]
      }),
      prisma.assinatura.findUnique({ where: { usuarioId: req.usuario.id } }).catch(() => null)
    ]);

    const planoAtual = assinatura?.plano || req.usuario.plano || 'GRATUITO';
    const limite = obterLimiteClinicasPorPlano(planoAtual, req.usuario.role);
    const ativasCount = clinicas.filter((c) => c.ativa).length;

    res.json({
      sucesso: true,
      clinicas: clinicas.map((c) => ({
        ...c,
        valorPadraoUltrassom: Number(c.valorPadraoUltrassom || 0),
        valorPadraoCirurgia: Number(c.valorPadraoCirurgia || 0),
        percentualRepasse: Number(c.percentualRepasse || 0)
      })),
      plano: planoAtual,
      limiteClinicas: limite,
      ativasCount,
      podeExportarPdfOficial: podeExportarExtratoPdfOficial(planoAtual, req.usuario.role)
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao listar clínicas parceiras');
    res.status(500).json({ error: 'Erro ao listar clínicas parceiras.' });
  }
});

app.post('/api/clinicas-parceiras', exigirAutenticacao, (req, res, next) => {
  uploadPerfil.single('logo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Erro no upload da logo.' });
    return next();
  });
}, async (req, res) => {
  try {
    const nome = String(req.body?.nome || '').trim();
    if (!nome) {
      return res.status(400).json({ error: 'Informe o nome da clínica parceira.' });
    }

    const [ativasCount, assinatura] = await Promise.all([
      prisma.clinicaParceira.count({ where: { usuarioId: req.usuario.id, ativa: true } }),
      prisma.assinatura.findUnique({ where: { usuarioId: req.usuario.id } }).catch(() => null)
    ]);
    const planoAtual = assinatura?.plano || req.usuario.plano || 'GRATUITO';
    const limite = obterLimiteClinicasPorPlano(planoAtual, req.usuario.role);
    if (limite !== null && ativasCount >= limite) {
      return res.status(403).json({
        error: `Seu plano atual permite até ${limite} clínicas parceiras ativas. Faça upgrade para o Plano Especialista Pro para cadastrar clínicas ilimitadas.`,
        codigo: 'LIMITE_CLINICAS_ATINGIDO',
        limite
      });
    }

    const diaFechRaw = req.body?.diaFechamento;
    const diaFech = diaFechRaw !== undefined && String(diaFechRaw).trim() !== ''
      ? Math.min(31, Math.max(1, parseInt(diaFechRaw, 10) || 1))
      : null;

    const criada = await prisma.clinicaParceira.create({
      data: {
        usuarioId: req.usuario.id,
        nome: nome.slice(0, 140),
        nomeContato: String(req.body?.nomeContato || '').trim().slice(0, 120) || null,
        whatsapp: String(req.body?.whatsapp || '').trim().slice(0, 40) || null,
        email: String(req.body?.email || '').trim().slice(0, 140) || null,
        cidade: String(req.body?.cidade || '').trim().slice(0, 100) || null,
        cnpj: String(req.body?.cnpj || '').trim().slice(0, 30) || null,
        logoUrl: req.file ? `/uploads/logos/${req.file.filename}` : null,
        rodapeContato: String(req.body?.rodapeContato || '').trim().slice(0, 240) || null,
        usarIdentidadePropria: String(req.body?.usarIdentidadePropria) === 'true' || req.body?.usarIdentidadePropria === true,
        valorPadraoUltrassom: normalizarNumeroDecimal(req.body?.valorPadraoUltrassom, 0),
        valorPadraoCirurgia: normalizarNumeroDecimal(req.body?.valorPadraoCirurgia, 0),
        percentualRepasse: Math.min(100, normalizarNumeroDecimal(req.body?.percentualRepasse, 0)),
        diaFechamento: diaFech,
        observacoes: String(req.body?.observacoes || '').trim().slice(0, 1000) || null,
        ativa: true
      }
    });

    res.status(201).json({
      sucesso: true,
      clinica: {
        ...criada,
        valorPadraoUltrassom: Number(criada.valorPadraoUltrassom || 0),
        valorPadraoCirurgia: Number(criada.valorPadraoCirurgia || 0),
        percentualRepasse: Number(criada.percentualRepasse || 0)
      }
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao criar clínica parceira');
    res.status(500).json({ error: 'Erro ao cadastrar clínica parceira.' });
  }
});

app.put('/api/clinicas-parceiras/:id', exigirAutenticacao, (req, res, next) => {
  uploadPerfil.single('logo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Erro no upload da logo.' });
    return next();
  });
}, async (req, res) => {
  try {
    const existente = await prisma.clinicaParceira.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id }
    });
    if (!existente) {
      return res.status(404).json({ error: 'Clínica parceira não encontrada.' });
    }

    const dataUpdate = {};
    if (req.body?.nome !== undefined && String(req.body.nome).trim()) {
      dataUpdate.nome = String(req.body.nome).trim().slice(0, 140);
    }
    if (req.body?.nomeContato !== undefined) dataUpdate.nomeContato = String(req.body.nomeContato || '').trim().slice(0, 120) || null;
    if (req.body?.whatsapp !== undefined) dataUpdate.whatsapp = String(req.body.whatsapp || '').trim().slice(0, 40) || null;
    if (req.body?.email !== undefined) dataUpdate.email = String(req.body.email || '').trim().slice(0, 140) || null;
    if (req.body?.cidade !== undefined) dataUpdate.cidade = String(req.body.cidade || '').trim().slice(0, 100) || null;
    if (req.body?.cnpj !== undefined) dataUpdate.cnpj = String(req.body.cnpj || '').trim().slice(0, 30) || null;
    if (req.body?.rodapeContato !== undefined) dataUpdate.rodapeContato = String(req.body.rodapeContato || '').trim().slice(0, 240) || null;
    if (req.body?.usarIdentidadePropria !== undefined) {
      dataUpdate.usarIdentidadePropria = String(req.body.usarIdentidadePropria) === 'true' || req.body.usarIdentidadePropria === true;
    }
    if (req.body?.valorPadraoUltrassom !== undefined) {
      dataUpdate.valorPadraoUltrassom = normalizarNumeroDecimal(req.body.valorPadraoUltrassom, 0);
    }
    if (req.body?.valorPadraoCirurgia !== undefined) {
      dataUpdate.valorPadraoCirurgia = normalizarNumeroDecimal(req.body.valorPadraoCirurgia, 0);
    }
    if (req.body?.percentualRepasse !== undefined) {
      dataUpdate.percentualRepasse = Math.min(100, normalizarNumeroDecimal(req.body.percentualRepasse, 0));
    }
    if (req.body?.diaFechamento !== undefined) {
      dataUpdate.diaFechamento = String(req.body.diaFechamento).trim() !== ''
        ? Math.min(31, Math.max(1, parseInt(req.body.diaFechamento, 10) || 1))
        : null;
    }
    if (req.body?.observacoes !== undefined) dataUpdate.observacoes = String(req.body.observacoes || '').trim().slice(0, 1000) || null;
    if (req.body?.ativa !== undefined) dataUpdate.ativa = String(req.body.ativa) === 'true' || req.body.ativa === true;
    if (req.file) {
      dataUpdate.logoUrl = `/uploads/logos/${req.file.filename}`;
    } else if (String(req.body?.removerLogo) === 'true') {
      dataUpdate.logoUrl = null;
    }

    const atualizada = await prisma.clinicaParceira.update({
      where: { id: existente.id },
      data: dataUpdate
    });

    res.json({
      sucesso: true,
      clinica: {
        ...atualizada,
        valorPadraoUltrassom: Number(atualizada.valorPadraoUltrassom || 0),
        valorPadraoCirurgia: Number(atualizada.valorPadraoCirurgia || 0),
        percentualRepasse: Number(atualizada.percentualRepasse || 0)
      }
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao atualizar clínica parceira');
    res.status(500).json({ error: 'Erro ao atualizar clínica parceira.' });
  }
});

app.delete('/api/clinicas-parceiras/:id', exigirAutenticacao, async (req, res) => {
  try {
    const existente = await prisma.clinicaParceira.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id }
    });
    if (!existente) {
      return res.status(404).json({ error: 'Clínica parceira não encontrada.' });
    }
    await prisma.clinicaParceira.update({
      where: { id: existente.id },
      data: { ativa: false }
    });
    res.json({ sucesso: true, id: existente.id, ativa: false });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao desativar clínica parceira');
    res.status(500).json({ error: 'Erro ao desativar clínica parceira.' });
  }
});

async function consultarMovimentacaoFinanceiraUsuario(usuarioId, query = {}) {
  const periodo = resolverIntervaloMes(query.mes);
  const clinicaIdFiltro = String(query.clinicaId || '').trim();
  const statusPagFiltro = String(query.statusPagamento || '').trim().toUpperCase();
  const statusRepFiltro = String(query.statusRepasse || '').trim().toUpperCase();
  const tipoFiltro = String(query.tipo || '').trim().toLowerCase();

  const whereBase = {
    usuarioId,
    criadoEm: { gte: periodo.inicio, lte: periodo.fim },
    ...(clinicaIdFiltro ? { clinicaParceiraId: clinicaIdFiltro === 'particular' ? null : clinicaIdFiltro } : {}),
    ...(statusPagFiltro && ['PENDENTE', 'PAGO', 'ISENTO'].includes(statusPagFiltro) ? { statusPagamento: statusPagFiltro } : {}),
    ...(statusRepFiltro && ['PENDENTE', 'REPASSADO', 'NAO_APLICAVEL'].includes(statusRepFiltro) ? { statusRepasse: statusRepFiltro } : {})
  };

  const [exames, cirurgias, clinicas] = await Promise.all([
    tipoFiltro === 'cirurgia'
      ? Promise.resolve([])
      : prisma.exameLaudo.findMany({
          where: whereBase,
          include: { clinicaParceira: { select: { id: true, nome: true, whatsapp: true, nomeContato: true } } },
          orderBy: { criadoEm: 'desc' }
        }),
    tipoFiltro === 'ultrassom'
      ? Promise.resolve([])
      : prisma.relatorioCirurgico.findMany({
          where: whereBase,
          include: { clinicaParceira: { select: { id: true, nome: true, whatsapp: true, nomeContato: true } } },
          orderBy: { criadoEm: 'desc' }
        }),
    prisma.clinicaParceira.findMany({
      where: { usuarioId, ativa: true },
      orderBy: { nome: 'asc' }
    })
  ]);

  const agregado = agregarResumoFinanceiro(exames, cirurgias, clinicas);
  return { periodo, ...agregado };
}

app.get('/api/financeiro/resumo', exigirAutenticacao, async (req, res) => {
  try {
    const dados = await consultarMovimentacaoFinanceiraUsuario(req.usuario.id, req.query);
    res.json({
      sucesso: true,
      mes: dados.periodo.mes,
      periodoRotulo: dados.periodo.rotulo,
      totais: dados.totais,
      porClinica: dados.porClinica
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao carregar resumo financeiro');
    res.status(500).json({ error: 'Erro ao carregar resumo financeiro.' });
  }
});

app.get('/api/financeiro/lancamentos', exigirAutenticacao, async (req, res) => {
  try {
    const dados = await consultarMovimentacaoFinanceiraUsuario(req.usuario.id, req.query);
    res.json({
      sucesso: true,
      mes: dados.periodo.mes,
      periodoRotulo: dados.periodo.rotulo,
      totais: dados.totais,
      lancamentos: dados.lancamentos
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao listar lançamentos financeiros');
    res.status(500).json({ error: 'Erro ao listar lançamentos financeiros.' });
  }
});

app.patch('/api/financeiro/lancamentos/:tipo/:id', exigirAutenticacao, async (req, res) => {
  try {
    const tipoNorm = String(req.params.tipo || '').toLowerCase();
    if (tipoNorm !== 'ultrassom' && tipoNorm !== 'cirurgia') {
      return res.status(400).json({ error: 'Tipo inválido. Use "ultrassom" ou "cirurgia".' });
    }
    const model = tipoNorm === 'cirurgia' ? prisma.relatorioCirurgico : prisma.exameLaudo;
    const registro = await model.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id }
    });
    if (!registro) {
      return res.status(404).json({ error: 'Lançamento não encontrado.' });
    }

    const body = req.body || {};
    const dataUpdate = {};

    if (body.clinicaParceiraId !== undefined) {
      const cid = String(body.clinicaParceiraId || '').trim();
      if (!cid) {
        dataUpdate.clinicaParceiraId = null;
      } else {
        const clinicaOk = await prisma.clinicaParceira.findFirst({
          where: { id: cid, usuarioId: req.usuario.id },
          select: { id: true }
        });
        if (!clinicaOk) return res.status(400).json({ error: 'Clínica parceira inválida.' });
        dataUpdate.clinicaParceiraId = clinicaOk.id;
      }
    }

    if (body.valorExame !== undefined) {
      const v = normalizarNumeroDecimal(body.valorExame, 0);
      dataUpdate.valorExame = v > 0 ? v : null;
    }
    if (body.quemPagou !== undefined) {
      dataUpdate.quemPagou = String(body.quemPagou).toUpperCase() === 'TUTOR' ? 'TUTOR' : 'CLINICA';
    }
    if (body.valorRepasse !== undefined) {
      const vr = normalizarNumeroDecimal(body.valorRepasse, 0);
      dataUpdate.valorRepasse = vr > 0 ? vr : null;
    }
    if (body.formaPagamento !== undefined) {
      dataUpdate.formaPagamento = String(body.formaPagamento || '').trim().toUpperCase().slice(0, 30) || null;
    }
    if (body.statusPagamento !== undefined) {
      const sp = String(body.statusPagamento).toUpperCase();
      if (['PENDENTE', 'PAGO', 'ISENTO'].includes(sp)) {
        dataUpdate.statusPagamento = sp;
        dataUpdate.pagoEm = sp === 'PAGO' ? new Date() : null;
      }
    }
    if (body.statusRepasse !== undefined) {
      const sr = String(body.statusRepasse).toUpperCase();
      if (['NAO_APLICAVEL', 'PENDENTE', 'REPASSADO'].includes(sr)) {
        dataUpdate.statusRepasse = sr;
        dataUpdate.repassadoEm = sr === 'REPASSADO' ? new Date() : null;
      }
    }

    const atualizado = await model.update({
      where: { id: registro.id },
      data: dataUpdate
    });

    res.json({
      sucesso: true,
      lancamento: {
        id: atualizado.id,
        tipo: tipoNorm,
        clinicaParceiraId: atualizado.clinicaParceiraId,
        valorExame: Number(atualizado.valorExame || 0),
        quemPagou: atualizado.quemPagou,
        valorRepasse: Number(atualizado.valorRepasse || 0),
        statusPagamento: atualizado.statusPagamento,
        statusRepasse: atualizado.statusRepasse,
        formaPagamento: atualizado.formaPagamento,
        pagoEm: atualizado.pagoEm,
        repassadoEm: atualizado.repassadoEm
      }
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao atualizar lançamento financeiro');
    res.status(500).json({ error: 'Erro ao atualizar lançamento financeiro.' });
  }
});

app.post('/api/financeiro/clinicas/:clinicaId/quitar-pendentes', exigirAutenticacao, async (req, res) => {
  try {
    const clinica = await prisma.clinicaParceira.findFirst({
      where: { id: req.params.clinicaId, usuarioId: req.usuario.id }
    });
    if (!clinica) {
      return res.status(404).json({ error: 'Clínica parceira não encontrada.' });
    }

    const periodo = resolverIntervaloMes(req.body?.mes || req.query?.mes);
    const forma = String(req.body?.formaPagamento || 'PIX').trim().toUpperCase().slice(0, 30);
    const agora = new Date();
    const whereQuitar = {
      usuarioId: req.usuario.id,
      clinicaParceiraId: clinica.id,
      statusPagamento: 'PENDENTE',
      criadoEm: { gte: periodo.inicio, lte: periodo.fim }
    };

    const [resEx, resCir] = await Promise.all([
      prisma.exameLaudo.updateMany({
        where: whereQuitar,
        data: { statusPagamento: 'PAGO', pagoEm: agora, formaPagamento: forma }
      }),
      prisma.relatorioCirurgico.updateMany({
        where: whereQuitar,
        data: { statusPagamento: 'PAGO', pagoEm: agora, formaPagamento: forma }
      })
    ]);

    res.json({
      sucesso: true,
      quitados: (resEx.count || 0) + (resCir.count || 0),
      mes: periodo.mes
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao quitar pendências da clínica');
    res.status(500).json({ error: 'Erro ao quitar pendências da clínica.' });
  }
});

app.get('/api/financeiro/clinicas/:clinicaId/extrato.pdf', limiterGeracaoPesada, exigirAutenticacao, async (req, res) => {
  try {
    const clinica = await prisma.clinicaParceira.findFirst({
      where: { id: req.params.clinicaId, usuarioId: req.usuario.id }
    });
    if (!clinica) {
      return res.status(404).json({ error: 'Clínica parceira não encontrada.' });
    }

    const [assinatura, usuarioDb, dados] = await Promise.all([
      prisma.assinatura.findUnique({ where: { usuarioId: req.usuario.id } }).catch(() => null),
      prisma.usuario.findUnique({ where: { id: req.usuario.id } }).catch(() => null),
      consultarMovimentacaoFinanceiraUsuario(req.usuario.id, {
        mes: req.query.mes,
        clinicaId: clinica.id
      })
    ]);

    const planoAtual = assinatura?.plano || req.usuario.plano || 'GRATUITO';
    const oficial = podeExportarExtratoPdfOficial(planoAtual, req.usuario.role);
    const apenasPendentes = req.query.todos !== '1';
    const itensExtrato = apenasPendentes
      ? dados.lancamentos.filter((it) => it.statusPagamento === 'PENDENTE')
      : dados.lancamentos;

    const pdfBuffer = await gerarPdfExtratoCobranca({
      medico: {
        nome: usuarioDb?.nome || req.usuario.nome,
        crmv: usuarioDb?.crmv || req.usuario.crmv,
        nomeClinica: usuarioDb?.nomeClinica || req.usuario.nomeClinica,
        chavePix: usuarioDb?.chavePix || ''
      },
      clinica,
      periodoRotulo: dados.periodo.rotulo,
      itens: itensExtrato,
      totais: dados.totais,
      preview: !oficial
    });

    const slugClinica = String(clinica.nome || 'clinica')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .toLowerCase();
    const nomeArquivo = `Extrato_${slugClinica}_${dados.periodo.mes}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(pdfBuffer);
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao gerar extrato PDF de cobrança');
    res.status(500).json({ error: 'Erro ao gerar relatório de cobrança em PDF.' });
  }
});

app.get('/api/financeiro/exportar.csv', exigirAutenticacao, async (req, res) => {
  try {
    const dados = await consultarMovimentacaoFinanceiraUsuario(req.usuario.id, req.query);
    const csv = gerarCsvLancamentos(dados.lancamentos);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Vetaro_Financeiro_${dados.periodo.mes}.csv"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(csv);
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao exportar CSV financeiro');
    res.status(500).json({ error: 'Erro ao exportar CSV financeiro.' });
  }
});

// ==================== FASE 1: ENTREGA INTELIGENTE (LINK PÚBLICO, QR CODE, RESUMO TUTOR) ====================

function resolverCaminhoPdfDisco(pdfArquivo = '') {
  const limpo = String(pdfArquivo || '').split('?')[0];
  const match = limpo.match(/^\/downloads\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const safeJobId = path.basename(decodeURIComponent(match[1]));
  const safeFilename = path.basename(decodeURIComponent(match[2]));
  const fullPath = path.join(outputDir, safeJobId, safeFilename);
  return { safeJobId, safeFilename, fullPath };
}

async function localizarRegistroCompartilhamento(tipo, idOuJobId, usuario) {
  const tipoNorm = String(tipo || '').toLowerCase();
  if (tipoNorm !== 'ultrassom' && tipoNorm !== 'cirurgia') {
    return { erroStatus: 400, erroMsg: 'Tipo inválido. Use "ultrassom" ou "cirurgia".' };
  }
  const filtroDono = usuario?.role === 'admin' ? {} : { usuarioId: usuario.id };
  const chave = String(idOuJobId || '').trim();
  if (!chave) {
    return { erroStatus: 400, erroMsg: 'Identificador do documento não informado.' };
  }
  const model = tipoNorm === 'cirurgia' ? prisma.relatorioCirurgico : prisma.exameLaudo;
  const registro = await model.findFirst({
    where: {
      ...filtroDono,
      OR: [
        { id: chave },
        { pdfArquivo: { contains: chave } }
      ]
    },
    include: {
      clinicaParceira: {
        select: { id: true, nome: true, whatsapp: true, nomeContato: true }
      }
    }
  });
  if (!registro) {
    return { erroStatus: 404, erroMsg: 'Documento não encontrado ou sem permissão de acesso.' };
  }
  return { tipo: tipoNorm, model, registro };
}

app.post('/api/compartilhamento/:tipo/:id/link', exigirAutenticacao, async (req, res) => {
  try {
    const busca = await localizarRegistroCompartilhamento(req.params.tipo, req.params.id, req.usuario);
    if (busca.erroStatus) return res.status(busca.erroStatus).json({ error: busca.erroMsg });

    let { registro, model } = busca;
    if (!registro.publicToken) {
      const novoToken = gerarPublicToken();
      registro = await model.update({
        where: { id: registro.id },
        data: { publicToken: novoToken, linkAtivo: true }
      });
    }

    const dadosQr = await prepararDadosQrCodeCompartilhamento(registro.publicToken, {
      baseUrl: resolverOriginSeguro(req)
    });

    res.json({
      sucesso: true,
      id: registro.id,
      tipo: busca.tipo,
      publicToken: registro.publicToken,
      urlPublica: dadosQr.urlPublica,
      qrCodeDataUri: dadosQr.qrCodeDataUri,
      linkAtivo: registro.linkAtivo,
      resumoTutor: registro.resumoTutor || '',
      visualizacoes: registro.visualizacoes || 0,
      primeiraVisualizacaoEm: registro.primeiraVisualizacaoEm,
      ultimaVisualizacaoEm: registro.ultimaVisualizacaoEm,
      compartilhadoEm: registro.compartilhadoEm,
      clinicaParceira: registro.clinicaParceira || null
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao obter/gerar link público de compartilhamento');
    res.status(500).json({ error: 'Erro ao gerar link de compartilhamento.' });
  }
});

app.patch('/api/compartilhamento/:tipo/:id/status', exigirAutenticacao, async (req, res) => {
  try {
    const busca = await localizarRegistroCompartilhamento(req.params.tipo, req.params.id, req.usuario);
    if (busca.erroStatus) return res.status(busca.erroStatus).json({ error: busca.erroMsg });

    const { linkAtivo } = req.body || {};
    if (typeof linkAtivo !== 'boolean') {
      return res.status(400).json({ error: 'Informe linkAtivo como booleano (true ou false).' });
    }

    const atualizado = await busca.model.update({
      where: { id: busca.registro.id },
      data: { linkAtivo }
    });

    res.json({
      sucesso: true,
      id: atualizado.id,
      linkAtivo: atualizado.linkAtivo
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao alterar status do link público');
    res.status(500).json({ error: 'Erro ao atualizar status do link.' });
  }
});

app.post('/api/compartilhamento/:tipo/:id/resumo-tutor', limiterGeracaoPesada, exigirAutenticacao, async (req, res) => {
  try {
    const busca = await localizarRegistroCompartilhamento(req.params.tipo, req.params.id, req.usuario);
    if (busca.erroStatus) return res.status(busca.erroStatus).json({ error: busca.erroMsg });

    const { registro, tipo, model } = busca;
    const forcarRegeneracao = Boolean(req.body?.forcarRegeneracao);

    if (registro.resumoTutor && !forcarRegeneracao) {
      return res.json({
        sucesso: true,
        resumoTutor: registro.resumoTutor,
        origem: 'cache'
      });
    }

    const resultado = await gerarResumoTutorIA({
      tipo,
      usarMockLocal: deveUsarMockLocal(req),
      req,
      paciente: {
        nome: registro.pacienteNome,
        especie: registro.pacienteEspecie,
        tutor: registro.tutorNome || ''
      },
      laudo: tipo === 'ultrassom' ? registro.laudoEstruturado : [],
      cirurgia: tipo === 'cirurgia' ? registro.dadosCirurgia : null,
      apiKey
    });

    const atualizado = await model.update({
      where: { id: registro.id },
      data: { resumoTutor: resultado.resumo }
    });

    res.json({
      sucesso: true,
      resumoTutor: atualizado.resumoTutor,
      modelo: resultado.modelo,
      origem: 'ia'
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao gerar resumo empático para o tutor');
    res.status(500).json({ error: err.message || 'Não foi possível gerar o resumo para o tutor.' });
  }
});

app.put('/api/compartilhamento/:tipo/:id/resumo-tutor', exigirAutenticacao, async (req, res) => {
  try {
    const busca = await localizarRegistroCompartilhamento(req.params.tipo, req.params.id, req.usuario);
    if (busca.erroStatus) return res.status(busca.erroStatus).json({ error: busca.erroMsg });

    const resumoLimpo = String(req.body?.resumoTutor ?? '').trim().slice(0, 2000);
    const atualizado = await busca.model.update({
      where: { id: busca.registro.id },
      data: { resumoTutor: resumoLimpo || null }
    });

    res.json({
      sucesso: true,
      resumoTutor: atualizado.resumoTutor || ''
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao salvar edição do resumo para o tutor');
    res.status(500).json({ error: 'Erro ao salvar resumo do tutor.' });
  }
});

app.post('/api/compartilhamento/:tipo/:id/registrar-envio', exigirAutenticacao, async (req, res) => {
  try {
    const busca = await localizarRegistroCompartilhamento(req.params.tipo, req.params.id, req.usuario);
    if (busca.erroStatus) return res.status(busca.erroStatus).json({ error: busca.erroMsg });

    const agora = new Date();
    await busca.model.update({
      where: { id: busca.registro.id },
      data: { compartilhadoEm: agora }
    });

    res.json({ sucesso: true, compartilhadoEm: agora });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar envio.' });
  }
});

async function buscarDocumentoPorTokenPublico(token) {
  const tokenLimpo = String(token || '').trim();
  if (!tokenLimpo || tokenLimpo.length > 64) return null;

  const exame = await prisma.exameLaudo.findUnique({
    where: { publicToken: tokenLimpo },
    include: { usuario: { select: { nome: true, crmv: true, nomeClinica: true } } }
  });
  if (exame) return { tipo: 'ultrassom', model: prisma.exameLaudo, registro: exame };

  const cirurgia = await prisma.relatorioCirurgico.findUnique({
    where: { publicToken: tokenLimpo },
    include: { usuario: { select: { nome: true, crmv: true, nomeClinica: true } } }
  });
  if (cirurgia) return { tipo: 'cirurgia', model: prisma.relatorioCirurgico, registro: cirurgia };

  return null;
}

app.get('/l/:token', limiterLinkPublico, async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const encontrado = await buscarDocumentoPorTokenPublico(req.params.token);
    if (!encontrado || !encontrado.registro.linkAtivo) {
      return res.status(404).type('html').send(renderizarPaginaIndisponivel());
    }

    const { tipo, model, registro } = encontrado;
    const ua = req.headers['user-agent'] || '';
    if (!isBotPreviewWhatsApp(ua)) {
      const agora = new Date();
      model.update({
        where: { id: registro.id },
        data: {
          visualizacoes: { increment: 1 },
          ultimaVisualizacaoEm: agora,
          ...(registro.primeiraVisualizacaoEm ? {} : { primeiraVisualizacaoEm: agora })
        }
      }).catch((e) => logger.warn({ err: e.message }, 'Aviso ao registrar visualização de link público'));
    }

    const tokenSafe = encodeURIComponent(registro.publicToken);
    const urlPublica = montarUrlPublica(registro.publicToken, resolverOriginSeguro(req));
    const html = renderizarPaginaPublicaLaudo({
      tipo,
      pacienteNome: registro.pacienteNome,
      pacienteEspecie: registro.pacienteEspecie || '',
      tutorNome: registro.tutorNome || '',
      dataExame: registro.dataExame || '',
      procedimento: tipo === 'cirurgia' ? (registro.procedimento || '') : '',
      medicoNome: registro.usuario?.nome || '',
      medicoCrmv: registro.usuario?.crmv || '',
      clinicaNome: registro.usuario?.nomeClinica || '',
      resumoTutor: registro.resumoTutor || '',
      urlPdfInline: `/l/${tokenSafe}/pdf`,
      urlPdfDownload: `/l/${tokenSafe}/pdf?download=1`,
      urlPublica
    });

    return res.status(200).type('html').send(html);
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao renderizar página pública /l/:token');
    return res.status(500).type('html').send(renderizarPaginaIndisponivel());
  }
});

app.get('/l/:token/pdf', limiterLinkPublico, async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const encontrado = await buscarDocumentoPorTokenPublico(req.params.token);
    if (!encontrado || !encontrado.registro.linkAtivo) {
      return res.status(404).type('html').send(renderizarPaginaIndisponivel());
    }

    const resolved = resolverCaminhoPdfDisco(encontrado.registro.pdfArquivo);
    if (!resolved || !fs.existsSync(resolved.fullPath)) {
      return res.status(404).type('html').send(renderizarPaginaIndisponivel());
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");

    if (req.query.download === '1') {
      return res.download(resolved.fullPath, resolved.safeFilename);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resolved.safeFilename)}"`);
    return res.sendFile(path.resolve(resolved.fullPath));
  } catch (err) {
    logger.error({ err: err.message }, 'Erro ao servir PDF público /l/:token/pdf');
    return res.status(500).send('Não foi possível carregar o documento PDF.');
  }
});

// ==================== SEO & GEO/AEO (ROBOTS, SITEMAP, LLMS.TXT, OG IMAGE E CRAWLER SSR) ====================
const frontendPublicPath = path.join(__dirname, 'frontend', 'public');
const frontendDistPath = path.join(__dirname, 'frontend', 'dist');

function enviarArquivoPublicoSeo(res, nomeArquivo, contentType) {
  const candidatos = [
    path.join(frontendDistPath, nomeArquivo),
    path.join(frontendPublicPath, nomeArquivo)
  ];
  for (const cand of candidatos) {
    if (fs.existsSync(cand)) {
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(cand);
    }
  }
  return res.status(404).send('Arquivo não encontrado.');
}

app.get('/robots.txt', (req, res) => enviarArquivoPublicoSeo(res, 'robots.txt', 'text/plain; charset=utf-8'));
app.get('/sitemap.xml', (req, res) => enviarArquivoPublicoSeo(res, 'sitemap.xml', 'application/xml; charset=utf-8'));
app.get('/llms.txt', (req, res) => enviarArquivoPublicoSeo(res, 'llms.txt', 'text/markdown; charset=utf-8'));
app.get('/og-image.png', (req, res) => enviarArquivoPublicoSeo(res, 'og-image.png', 'image/png'));

// Entrega HTML semântico enxuto em GET / para crawlers de IA/redes sociais que não executam JS
app.get('/', (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (isCrawlerSemJs(ua)) {
    res.setHeader('Vary', 'User-Agent');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).type('html').send(renderizarLandingSemanticaParaCrawler());
  }
  return next();
});
if (fs.existsSync(frontendDistPath)) {
  app.use('/assets', express.static(path.join(frontendDistPath, 'assets'), {
    maxAge: '1y',
    immutable: true
  }));
  app.use(express.static(frontendDistPath, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
}

app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path.startsWith('/api') ||
    req.path.startsWith('/downloads') ||
    req.path.startsWith('/l/') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/assets') ||
    req.path.startsWith('/health')
  ) {
    return next();
  }
  const indexHtmlPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  res.status(503).send('Frontend React Vetaro não compilado. Execute: npm run build:frontend');
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { stack: err.stack, message: err.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const stack = reason && reason.stack;
  const message = reason && reason.message ? reason.message : String(reason);
  logger.error('unhandledRejection', { stack, message });
});

if (require.main === module) {
  (async function bootServidor() {
    try {
      await executarSeed();

      try {
        if (process.env.NODE_ENV !== 'test') {
          await syncModelosDoJson();
        }
      } catch (err) {
        console.error('[sync] falha ao sincronizar modelos:', err.message);
      }

      // Rotina periódica de limpeza de disco para evitar lotação da VPS
      async function limparArquivosExpirados() {
        const agora = Date.now();
        const ttlTempMs = 24 * 60 * 60 * 1000;
        const outputTtlDias = parseInt(process.env.OUTPUT_TTL_DAYS || '90', 10);

        const limparDiretorio = async (dirAlvo, ttlMs, recursivo = false) => {
          try {
            const itens = await fs.promises.readdir(dirAlvo);
            for (const item of itens) {
              const full = path.join(dirAlvo, item);
              try {
                const st = await fs.promises.stat(full);
                if (agora - st.mtimeMs > ttlMs) {
                  if (st.isDirectory() && recursivo) {
                    await fs.promises.rm(full, { recursive: true, force: true });
                  } else if (st.isFile()) {
                    await fs.promises.unlink(full);
                  }
                }
              } catch (_) {}
            }
          } catch (_) {}
        };

        await limparDiretorio(uploadDir, ttlTempMs, true);
        await limparDiretorio(amostrasPadraoDir, ttlTempMs, true);
        if (outputTtlDias > 0) {
          await limparDiretorio(outputDir, outputTtlDias * 24 * 60 * 60 * 1000, true);
        }
      }

      let timerLimpeza = null;
      if (process.env.NODE_ENV !== 'test') {
        limparArquivosExpirados().catch(() => {});
        timerLimpeza = setInterval(() => {
          limparArquivosExpirados().catch(() => {});
        }, 6 * 60 * 60 * 1000);
        if (typeof timerLimpeza.unref === 'function') timerLimpeza.unref();
      }

      const server = app.listen(PORT, () => {
        logger.info('Servidor inicializado', {
          porta: PORT,
          url: `http://localhost:${PORT}`,
          service: 'Vetaro SaaS - Automacao Multi-Tenant (PostgreSQL + React)'
        });
        console.log('==================================================================');
        console.log(`🚀 VETARO SAAS - SERVIDOR MULTI-TENANT (POSTGRESQL + REACT) ATIVO NA PORTA ${PORT}`);
        console.log(`🔗 Acesso local: http://localhost:${PORT}`);
        console.log('==================================================================');
      });

      let encerrando = false;
      async function encerrarComSeguranca(sinal) {
        if (encerrando) return;
        encerrando = true;
        logger.info('Encerramento gracioso iniciado', { sinal });
        if (timerLimpeza) {
          clearInterval(timerLimpeza);
          timerLimpeza = null;
        }
        const failsafe = setTimeout(() => {
          logger.warn('Encerramento forçado após timeout de 10s', { sinal });
          process.exit(1);
        }, 10000);
        if (typeof failsafe.unref === 'function') failsafe.unref();

        try {
          await new Promise((resolve) => server.close(() => resolve()));
        } catch (_) {}
        try {
          await fecharBrowserCompartilhado();
        } catch (_) {}
        try {
          if (typeof prisma.$disconnect === 'function') {
            await prisma.$disconnect();
          }
        } catch (_) {}
        clearTimeout(failsafe);
        process.exit(0);
      }

      process.on('SIGTERM', () => encerrarComSeguranca('SIGTERM'));
      process.on('SIGINT', () => encerrarComSeguranca('SIGINT'));
    } catch (err) {
      logger.error('[boot] falha na inicialização', { stack: err.stack, message: err.message });
      process.exit(1);
    }
  })();
}

module.exports = { app };

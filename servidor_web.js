const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const { prisma } = require('./db');
const { analisarExameComIA } = require('./analisador_ia');
const { gerarDocumentosExame } = require('./motor_laudo');
const { analisarCirurgiaComIA } = require('./analisador_cirurgia');
const { gerarDocumentosCirurgicos } = require('./motor_cirurgia');
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
const {
  ROLES,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario,
  obterTemaUsuario,
  atualizarTemaUsuario,
  atualizarPerfilProfissional
} = require('./gerenciador_usuarios');
const {
  obterMetricasUsoAssinatura,
  atualizarPlanoAssinatura
} = require('./gerenciador_assinatura');

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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || config.googleClientId || '';
const JWT_SECRET = process.env.JWT_SECRET || 'upa_pet_jwt_secret_camila_bastos_2026';
const PORT = process.env.PORT || 3000;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const app = express();
app.use(cors());
app.use(cookieParser());
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
const amostrasPadraoDir = path.join(persistentUploadDir, 'amostras_padrao');
const outputDir = process.env.OUTPUT_PERSISTENT_DIR
  ? path.resolve(process.env.OUTPUT_PERSISTENT_DIR)
  : path.join(os.tmpdir(), 'upa_pet_outputs');

[uploadDir, persistentUploadDir, logosDir, assinaturasDir, templatesDir, amostrasPadraoDir, outputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/uploads', express.static(persistentUploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const upload = multer({ storage });

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
  limits: { fileSize: 3 * 1024 * 1024 }
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

app.get('/api/auth/config', (req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
    ssoAtivo: !!GOOGLE_CLIENT_ID
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    usuario: req.usuario || null
  });
});

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
      const decoded = jwt.decode(credential);
      if (!decoded || !decoded.email) {
        throw new Error('Não foi possível decodificar o token do Google.');
      }
      email = decoded.email;
      nome = decoded.name;
      foto = decoded.picture;
    }

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

app.post('/api/perfil/profissional', exigirAutenticacao, uploadPerfil.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'assinatura', maxCount: 1 }
]), async (req, res) => {
  try {
    const logoFile = req.files && req.files.logo ? req.files.logo[0] : null;
    const assinaturaFile = req.files && req.files.assinatura ? req.files.assinatura[0] : null;

    const dados = {
      nome: req.body.nome,
      crmv: req.body.crmv,
      nomeClinica: req.body.nomeClinica
    };
    if (logoFile) dados.logoUrl = logoFile.path;
    if (assinaturaFile) dados.assinaturaUrl = assinaturaFile.path;

    const atualizado = await atualizarPerfilProfissional(req.usuario.id, dados);
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

app.get('/downloads/:jobId/:filename', exigirAutenticacao, (req, res) => {
  const { jobId, filename } = req.params;
  const filePath = path.join(outputDir, jobId, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('Arquivo não encontrado ou já expirou.');
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
app.post('/api/layout-config/importar-pdfs', exigirAutenticacao, upload.array('pdfs', 10), async (req, res) => {
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
    const idProf = perfilExtraido.identidadeProfissional || {};
    if (req.usuario.id && (idProf.nomeMedico || idProf.crmv || idProf.nomeClinica)) {
      await atualizarPerfilProfissional(req.usuario.id, {
        nome: idProf.nomeMedico || req.usuario.nome,
        crmv: idProf.crmv || req.usuario.crmv,
        nomeClinica: idProf.nomeClinica || req.usuario.nomeClinica,
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
app.post('/api/laudos/aprender-padrao', exigirAutenticacao, uploadPdfsPadrao.array('pdfs', 10), async (req, res) => {
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
      if (req.usuario.id && (ativosGeo.headerLogoUrl || ativosGeo.assinaturaUrl)) {
        await atualizarPerfilProfissional(req.usuario.id, {
          nome: perfilDetectado.nomeDetectado || idProfGeo.nomeMedico || req.usuario.nome,
          crmv: perfilDetectado.crmvDetectado || idProfGeo.crmv || req.usuario.crmv,
          nomeClinica: perfilDetectado.clinicaDetectada || idProfGeo.nomeClinica || req.usuario.nomeClinica,
          ...(ativosGeo.headerLogoUrl ? { logoUrl: ativosGeo.headerLogoUrl } : {}),
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

app.get('/api/historico', exigirAutenticacao, async (req, res) => {
  try {
    const filtroUsuario = req.usuario.role === 'admin' ? {} : { usuarioId: req.usuario.id };
    const [exames, cirurgias] = await Promise.all([
      prisma.exameLaudo.findMany({
        where: filtroUsuario,
        orderBy: { criadoEm: 'desc' },
        take: 50
      }),
      prisma.relatorioCirurgico.findMany({
        where: filtroUsuario,
        orderBy: { criadoEm: 'desc' },
        take: 50
      })
    ]);
    res.json({ sucesso: true, exames, cirurgias });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar histórico: ' + err.message });
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
    const { plano, ciclo } = req.body || {};
    const dados = await atualizarPlanoAssinatura(req.usuario.id, plano, ciclo);
    res.json({ sucesso: true, ...dados });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar plano: ' + err.message });
  }
});

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
    const layoutUsuario = await obterLayout(req.usuario?.id || null);
    const perfilDoUsuario = await obterPerfilLaudo(req.usuario?.id || null);
    const usuarioEfetivo = {
      ...req.usuario,
      nome: perfilDoUsuario?.nomeDetectado || req.usuario.nome,
      crmv: perfilDoUsuario?.crmvDetectado || req.usuario.crmv,
      nomeClinica: perfilDoUsuario?.clinicaDetectada || req.usuario.nomeClinica
    };

    const resultadoIA = await analisarExameComIA(caminhosArquivos, apiKey, {
      usuario: usuarioEfetivo,
      layout: layoutUsuario,
      perfilLaudo: perfilDoUsuario
    });

    const imagensOrdenadas = resultadoIA.caminhosOrdenados || caminhosArquivos;
    const docs = await gerarDocumentosExame(
      resultadoIA.paciente,
      resultadoIA.laudo,
      imagensOrdenadas,
      jobFolder,
      layoutUsuario,
      {
        usuario: usuarioEfetivo,
        perfilLaudo: perfilDoUsuario
      }
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);
    const pdfUrl = `/downloads/${jobId}/${encodeURIComponent(pdfNome)}`;
    const docxUrl = `/downloads/${jobId}/${encodeURIComponent(docxNome)}`;

    if (req.usuario && req.usuario.id) {
      await prisma.exameLaudo.create({
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
          docxArquivo: docxUrl
        }
      }).catch(e => logger.warn('Aviso ao salvar histórico de ultrassom', { error: e.message }));
    }

    res.json({
      sucesso: true,
      paciente: resultadoIA.paciente,
      pdfUrl,
      docxUrl,
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

app.post('/api/cirurgia', exigirPermissao('gerar_cirurgia'), upload.fields([
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

  const todosArquivos = [];
  if (docFile) todosArquivos.push(docFile.path);
  const fotosCaminhos = fotoFiles.map(f => f.path);
  todosArquivos.push(...fotosCaminhos);

  try {
    console.log(`🔪 [WEB - CIRURGIA] [Usuário: ${req.usuario.email}] Analisando procedimento cirúrgico...`);
    const resultadoIA = await analisarCirurgiaComIA(todosArquivos, apiKey, {
      usuario: req.usuario,
      textoDigitado: textoDigitado || null
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

    const docs = await gerarDocumentosCirurgicos(
      resultadoIA.paciente,
      resultadoIA.cirurgia,
      jobFolder,
      fotosCaminhos,
      { usuario: req.usuario }
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);
    const pdfUrl = `/downloads/${jobId}/${encodeURIComponent(pdfNome)}`;
    const docxUrl = `/downloads/${jobId}/${encodeURIComponent(docxNome)}`;

    if (req.usuario && req.usuario.id) {
      await prisma.relatorioCirurgico.create({
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
          docxArquivo: docxUrl
        }
      }).catch(e => logger.warn('Aviso ao salvar histórico cirúrgico', { error: e.message }));
    }

    res.json({
      sucesso: true,
      paciente: resultadoIA.paciente,
      cirurgia: resultadoIA.cirurgia,
      pdfUrl,
      docxUrl,
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

// =========================================================================
// SERVIÇO ESTÁTICO DO FRONTEND REACT (VETARO DESIGN SYSTEM)
// =========================================================================
const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path.startsWith('/api') ||
    req.path.startsWith('/downloads') ||
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

      app.listen(PORT, () => {
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
    } catch (err) {
      logger.error('[boot] falha na inicialização', { stack: err.stack, message: err.message });
      process.exit(1);
    }
  })();
}

module.exports = { app };

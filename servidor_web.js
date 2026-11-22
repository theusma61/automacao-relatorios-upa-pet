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
  verificarLimiteCotaUltrassom
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
const templatesCirurgiaDir = path.join(persistentUploadDir, 'templates_cirurgia');
const amostrasPadraoDir = path.join(persistentUploadDir, 'amostras_padrao');
const outputDir = process.env.OUTPUT_PERSISTENT_DIR
  ? path.resolve(process.env.OUTPUT_PERSISTENT_DIR)
  : path.join(os.tmpdir(), 'upa_pet_outputs');

[uploadDir, persistentUploadDir, logosDir, assinaturasDir, templatesDir, templatesCirurgiaDir, amostrasPadraoDir, outputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/uploads', express.static(persistentUploadDir));
app.use('/app/uploads', express.static(persistentUploadDir));

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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (/\.(png|jpe?g|webp|svg)$/i.test(ext) || (file.mimetype && file.mimetype.startsWith('image/'))) {
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
      nomeClinica: req.body.nomeClinica
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
          await prisma.configuracaoLayout.update({
            where: { id: layoutUsuario.id },
            data: { headerLogoUrl: logoFile.path }
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

app.get('/downloads/:jobId/fotos/:filename', exigirAutenticacao, (req, res) => {
  const safeJobId = path.basename(req.params.jobId);
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(outputDir, safeJobId, 'fotos', safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Foto não encontrada.' });
  }
  return res.sendFile(filePath);
});

app.get('/downloads/:jobId/:filename', exigirAutenticacao, (req, res) => {
  const { jobId, filename } = req.params;
  const safeJobId = path.basename(jobId);
  const safeFilename = path.basename(filename);
  const filePath = path.join(outputDir, safeJobId, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Arquivo não encontrado ou já expirou.');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.query.inline === '1' || req.query.preview === '1') {
    const isPdf = safeFilename.toLowerCase().endsWith('.pdf');
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeFilename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('Cache-Control', 'public, max-age=3600');
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
    const metaUsPath = path.join(jobFolder, 'meta_exame.json');
    if (fs.existsSync(metaUsPath)) {
      try {
        const metaUs = JSON.parse(fs.readFileSync(metaUsPath, 'utf8'));
        if (metaUs.estiloOverride && typeof metaUs.estiloOverride === 'object') {
          estiloOverrideUs = metaUs.estiloOverride;
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
      estiloPadrao: estiloPadraoUs,
      estiloOverride: estiloOverrideUs,
      pdfUrl: pdfUrl ? `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : '',
      docxUrl: docxUrl ? `${docxUrl}${docxUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do exame: ' + err.message });
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
app.post('/api/cirurgia/aprender-padrao', exigirAutenticacao, uploadPdfsPadrao.array('pdfs', 10), async (req, res) => {
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
app.post('/api/cirurgia/preview-padrao', exigirAutenticacao, async (req, res) => {
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

    const pdfBuffer = fs.readFileSync(tmpPdf);
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
app.post('/api/laudos/preview-padrao', exigirAutenticacao, async (req, res) => {
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

    const pdfBuffer = fs.readFileSync(docs.caminhoPdf);
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

app.post('/api/ultrassom', exigirPermissao('gerar_ultrassom'), upload.array('imagens', 25), async (req, res) => {
  // TRAVA DE LIMITES DA COTA MENSAL DE ULTRASSOM (ADMINS E PLANOS ILIMITADOS NUNCA SÃO BLOQUEADOS)
  const isAdmin = req.usuario && (req.usuario.role === 'admin' || req.usuario.plano === 'ILIMITADO' || req.usuario.plano === 'ADMIN');
  if (!isAdmin) {
    try {
      const checagemCota = await verificarLimiteCotaUltrassom(req.usuario.id);
      if (checagemCota.bloqueado) {
        if (Array.isArray(req.files)) {
          req.files.forEach((f) => {
            try { fs.unlinkSync(f.path); } catch (_) {}
          });
        }
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
    } catch (errCota) {
      logger.warn('Aviso ao checar limite de cota de ultrassom', { error: errCota.message });
    }
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Chave da API Gemini não configurada (GEMINI_API_KEY).' });
  }
  if (!req.files || req.files.length === 0) {
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
    const usuarioEfetivo = {
      ...req.usuario,
      nome: perfilDoUsuario?.nomeDetectado || req.usuario.nome,
      crmv: perfilDoUsuario?.crmvDetectado || req.usuario.crmv,
      nomeClinica: perfilDoUsuario?.clinicaDetectada || req.usuario.nomeClinica,
      logoUrl: req.usuario?.logoUrl || perfilDoUsuario?.templateVisual?.headerLogoUrl || layoutUsuario?.header_banner_url || layoutUsuario?.visual_config_json?.headerLogoUrl || null,
      assinaturaUrl: req.usuario?.assinaturaUrl || perfilDoUsuario?.templateVisual?.assinaturaUrl || layoutUsuario?.assinatura_extraida_url || layoutUsuario?.visual_config_json?.assinaturaUrl || null
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

    // Salva metadados estruturados para edição e recompilação rápida
    try {
      fs.writeFileSync(
        path.join(jobFolder, 'meta_exame.json'),
        JSON.stringify({
          jobId,
          paciente: resultadoIA.paciente,
          laudo: resultadoIA.laudo,
          imagensPaths: imagensOrdenadas,
          usuarioId: req.usuario?.id,
          criadoEm: new Date().toISOString()
        }, null, 2),
        'utf8'
      );
    } catch (metaErr) {
      logger.warn('Aviso ao salvar meta_exame.json', { error: metaErr.message });
    }

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
      jobId,
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
    // Remove os arquivos temporários de uploads/
    req.files.forEach(f => {
      try { fs.unlinkSync(f.path); } catch (_) {}
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
        legendasFotos
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
          usuarioId: req.usuario?.id,
          criadoEm: new Date().toISOString()
        }, null, 2),
        'utf8'
      );
    } catch (metaErr) {
      logger.warn('Aviso ao salvar meta_cirurgia.json', { error: metaErr.message });
    }

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
      jobId,
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

app.post('/api/ultrassom/recompilar', exigirAutenticacao, exigirPermissao('gerar_ultrassom'), async (req, res) => {
  const { jobId, paciente, laudo, estiloOverride: estiloOverrideReq } = req.body;
  if (!jobId || !laudo || !Array.isArray(laudo)) {
    return res.status(400).json({ error: 'Parâmetros inválidos. Informe jobId, paciente e a lista de órgãos (laudo).' });
  }

  const safeJobId = path.basename(jobId);
  const jobFolder = path.join(outputDir, safeJobId);
  if (!fs.existsSync(jobFolder)) {
    return res.status(404).json({ error: 'Exame não encontrado ou sessão expirada no servidor.' });
  }

  try {
    const metaPath = path.join(jobFolder, 'meta_exame.json');
    let imagensOrdenadas = [];
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (req.usuario.role !== 'admin' && meta.usuarioId && meta.usuarioId !== req.usuario.id) {
          return res.status(403).json({ error: 'Você não tem permissão para editar este exame.' });
        }
        imagensOrdenadas = meta.imagensPaths || [];
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

    const docs = await gerarDocumentosExame(
      paciente || {},
      laudo,
      imagensOrdenadas,
      jobFolder,
      layoutEfetivoUs,
      {
        usuario: usuarioEfetivo,
        perfilLaudo: perfilEfetivoUs
      }
    );

    const pdfNome = path.basename(docs.caminhoPdf);
    const docxNome = path.basename(docs.caminhoDocx);
    const cacheBuster = Date.now();
    const pdfUrl = `/downloads/${safeJobId}/${encodeURIComponent(pdfNome)}?v=${cacheBuster}`;
    const docxUrl = `/downloads/${safeJobId}/${encodeURIComponent(docxNome)}?v=${cacheBuster}`;

    // Atualiza o arquivo de metadados
    fs.writeFileSync(metaPath, JSON.stringify({
      jobId: safeJobId,
      paciente,
      laudo,
      estiloOverride: estiloOverrideLimpo,
      imagensPaths: imagensOrdenadas,
      usuarioId: req.usuario?.id,
      atualizadoEm: new Date().toISOString()
    }, null, 2), 'utf8');

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
          docxArquivo: `/downloads/${safeJobId}/${encodeURIComponent(docxNome)}`
        }
      }).catch(e => logger.warn('Aviso ao sincronizar exame recompilado no banco', { error: e.message }));
    }

    res.json({
      sucesso: true,
      mensagem: 'Laudo recompilado com sucesso com suas modificações!',
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

app.post('/api/cirurgia/recompilar', exigirAutenticacao, exigirPermissao('gerar_cirurgia'), async (req, res) => {
  const { jobId, paciente, cirurgia, legendasFotos: legendasReq, estiloOverride: estiloOverrideReq } = req.body;
  if (!jobId || !cirurgia) {
    return res.status(400).json({ error: 'Parâmetros inválidos. Informe jobId e os dados da cirurgia.' });
  }

  const safeJobId = path.basename(jobId);
  const jobFolder = path.join(outputDir, safeJobId);
  if (!fs.existsSync(jobFolder)) {
    return res.status(404).json({ error: 'Relatório não encontrado ou sessão expirada no servidor.' });
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
        legendasFotos
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
          docxArquivo: `/downloads/${safeJobId}/${encodeURIComponent(docxNome)}`
        }
      }).catch(e => logger.warn('Aviso ao sincronizar relatório recompilado no banco', { error: e.message }));
    }

    res.json({
      sucesso: true,
      mensagem: 'Relatório cirúrgico recompilado com sucesso com suas modificações!',
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

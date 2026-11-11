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
  ROLES,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario
} = require('./gerenciador_usuarios');

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

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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
app.post('/api/auth/google', async (req, res) => {
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
app.get('/api/admin/usuarios', exigirAutenticacao, (req, res) => {
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem gerenciar acessos.' });
  }
  res.json({ usuarios: listarUsuarios() });
});

app.post('/api/admin/usuarios/role', exigirAutenticacao, (req, res) => {
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
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f8fafc; }
    .tab-active { border-bottom: 3px solid #0284c7; color: #0284c7; font-weight: 600; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  <div>
    <!-- Top Header com Perfil Google e Status -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
            🐾
          </div>
          <div>
            <h1 class="text-lg font-bold text-slate-800 leading-tight">UPA PET</h1>
            <p class="text-xs text-slate-500">Central Inteligente de Laudos &bull; Dra. Camila Bastos (CRMV/MG: 22904)</p>
          </div>
        </div>

        <!-- Seção de Usuário / Login Google -->
        <div id="usuario-header" class="flex items-center space-x-3">
          <div class="animate-pulse text-xs text-slate-400">Verificando sessão...</div>
        </div>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-4xl mx-auto px-4 py-8">

      <!-- TELA 1: BLOQUEIO DE USUÁRIO DESCONECTADO -->
      <div id="tela-login" class="hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-8">
        <div class="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          <i class="fa-solid fa-lock"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">Acesso Restrito ao Sistema</h2>
        <p class="text-sm text-slate-500 mb-6 leading-relaxed">
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
        <!-- Tabs Selector -->
        <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl shadow-sm px-4 pt-2">
          <button id="tab-btn-ultra" onclick="mudarAba('ultra')" class="tab-active py-3 px-6 text-sm flex items-center space-x-2 transition">
            <i class="fa-solid fa-satellite-dish text-base"></i>
            <span>Ultrassonografia Abdominal</span>
          </button>
          <button id="tab-btn-cirurg" onclick="mudarAba('cirurg')" class="py-3 px-6 text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-2 transition">
            <i class="fa-solid fa-syringe text-base"></i>
            <span>Relatório Cirúrgico</span>
          </button>
          <button id="tab-btn-admin" onclick="abrirModalAdmin()" class="hidden py-3 px-6 text-sm text-purple-600 hover:text-purple-800 flex items-center space-x-2 transition ml-auto font-medium">
            <i class="fa-solid fa-users-gear text-base"></i>
            <span>Gerenciar Acessos</span>
          </button>
        </div>

        <!-- ABA 1: ULTRASSOM -->
        <div id="aba-ultra" class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div class="mb-4">
            <h2 class="text-lg font-bold text-slate-800">Laudo de Ultrassonografia Abdominal</h2>
            <p class="text-sm text-slate-500">Envie as capturas de tela do Mindray com calipers e identificações para análise automática.</p>
          </div>

          <form id="form-ultra" onsubmit="enviarUltrassom(event)">
            <div class="border-2 border-dashed border-sky-300 rounded-xl p-8 text-center bg-sky-50/50 hover:bg-sky-50 transition cursor-pointer" onclick="document.getElementById('input-ultra-fotos').click()">
              <i class="fa-solid fa-cloud-arrow-up text-4xl text-sky-500 mb-3"></i>
              <p class="text-sm font-semibold text-slate-700">Clique para selecionar as fotos ou arraste até aqui</p>
              <p class="text-xs text-slate-400 mt-1">Formatos aceitos: JPG, PNG, WEBP (várias fotos de uma vez)</p>
              <input type="file" id="input-ultra-fotos" multiple accept="image/*" class="hidden" onchange="atualizarListaFotosUltra(this)">
            </div>

            <div id="lista-fotos-ultra" class="mt-4 text-xs text-slate-600 space-y-1"></div>

            <button type="submit" id="btn-ultra-submit" class="mt-6 w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Gerar Laudo Oficial com IA</span>
            </button>
          </form>

          <!-- Loading e Resultado -->
          <div id="loading-ultra" class="hidden mt-6 p-6 text-center border border-slate-100 rounded-xl bg-slate-50">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-3"></div>
            <p class="text-sm font-medium text-slate-700">Analisando capturas do Mindray com IA e gerando laudo...</p>
            <p class="text-xs text-slate-400 mt-1">Isso costuma levar cerca de 15 a 30 segundos.</p>
          </div>

          <div id="resultado-ultra" class="hidden mt-6 p-6 border border-emerald-200 bg-emerald-50 rounded-xl">
            <div class="flex items-center space-x-2 text-emerald-800 font-bold mb-3">
              <i class="fa-solid fa-circle-check text-xl text-emerald-600"></i>
              <span>Laudo Gerado com Sucesso!</span>
            </div>
            <div id="info-paciente-ultra" class="text-sm text-emerald-950 mb-4 bg-white p-3 rounded-lg border border-emerald-100"></div>
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
        <div id="aba-cirurg" class="hidden bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div class="mb-4">
            <h2 class="text-lg font-bold text-slate-800">Relatório Cirúrgico Oficial</h2>
            <p class="text-sm text-slate-500">Envie o documento da cirurgia (.docx, .pages, .txt ou áudio gravado) e fotos anexas opcionais.</p>
          </div>

          <form id="form-cirurg" onsubmit="enviarCirurgia(event)">
            <!-- Documento Principal -->
            <div class="mb-4">
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-2">1. Ficha Cirúrgica ou Áudio</label>
              <div class="border-2 border-dashed border-sky-300 rounded-xl p-6 text-center bg-sky-50/50 hover:bg-sky-50 transition cursor-pointer" onclick="document.getElementById('input-cirurg-doc').click()">
                <i class="fa-solid fa-file-waveform text-3xl text-sky-500 mb-2"></i>
                <p class="text-sm font-semibold text-slate-700">Selecione o arquivo da cirurgia</p>
                <p class="text-xs text-slate-400 mt-0.5">Word (.docx), Pages (.pages), Texto (.txt) ou Áudios (.m4a, .mp3, .wav, .ogg)</p>
                <input type="file" id="input-cirurg-doc" accept=".docx,.pages,.txt,.m4a,.mp3,.wav,.ogg,.opus" class="hidden" onchange="atualizarDocCirurg(this)">
              </div>
              <div id="nome-doc-cirurg" class="mt-2 text-xs font-medium text-slate-600"></div>
            </div>

            <!-- Fotos Opcionais -->
            <div class="mb-6">
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-2">2. Fotos Intraoperatórias / Peça Cirúrgica (Opcional - Página 2)</label>
              <div class="border border-slate-200 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer" onclick="document.getElementById('input-cirurg-fotos').click()">
                <i class="fa-solid fa-camera text-2xl text-slate-400 mb-1"></i>
                <p class="text-xs font-medium text-slate-600">Clique para adicionar fotos da peça cirúrgica ou procedimento</p>
                <input type="file" id="input-cirurg-fotos" multiple accept="image/*" class="hidden" onchange="atualizarFotosCirurg(this)">
              </div>
              <div id="lista-fotos-cirurg" class="mt-2 text-xs text-slate-600"></div>
            </div>

            <button type="submit" id="btn-cirurg-submit" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Gerar Relatório Cirúrgico Oficial</span>
            </button>
          </form>

          <!-- Loading e Resultado Cirurgia -->
          <div id="loading-cirurg" class="hidden mt-6 p-6 text-center border border-slate-100 rounded-xl bg-slate-50">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-3"></div>
            <p class="text-sm font-medium text-slate-700">Identificando procedimento e aplicando padrão Dra. Camila Bastos...</p>
            <p class="text-xs text-slate-400 mt-1">Compilando 1 página com assinatura + página 2 com registro fotográfico.</p>
          </div>

          <div id="resultado-cirurg" class="hidden mt-6 p-6 border border-emerald-200 bg-emerald-50 rounded-xl">
            <div class="flex items-center space-x-2 text-emerald-800 font-bold mb-3">
              <i class="fa-solid fa-circle-check text-xl text-emerald-600"></i>
              <span>Relatório Cirúrgico Concluído!</span>
            </div>
            <div id="info-paciente-cirurg" class="text-sm text-emerald-950 mb-4 bg-white p-3 rounded-lg border border-emerald-100"></div>
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
        </div>
      </div>
    </main>
  </div>

  <!-- MODAL DE ADMINISTRAÇÃO DE USUÁRIOS -->
  <div id="modal-admin" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <h3 class="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <i class="fa-solid fa-users-gear text-purple-600"></i>
          <span>Controle de Acessos e Permissões</span>
        </h3>
        <button onclick="fecharModalAdmin()" class="text-slate-400 hover:text-slate-600 p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 font-semibold uppercase">
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
        <button onclick="fecharModalAdmin()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition">
          Fechar
        </button>
      </div>
    </div>
  </div>

  <footer class="text-center py-6 text-xs text-slate-400 border-t border-slate-200 bg-white">
    UPA PET &bull; Automação Inteligente de Laudos e Procedimentos Cirúrgicos &bull; Dra. Camila Bastos - CRMV/MG: 22904
  </footer>

  <script>
    let usuarioAtual = null;
    let ssoConfig = null;

    // Inicialização da Página
    window.addEventListener('DOMContentLoaded', async () => {
      await carregarConfiguracaoSSO();
      await verificarSessaoUsuario();
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
      const btnAdmin = document.getElementById('tab-btn-admin');
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
        ? \`<img src="\${usuarioAtual.foto}" class="w-8 h-8 rounded-full border border-slate-200" alt="Avatar">\`
        : \`<div class="w-8 h-8 bg-sky-600 text-white font-bold rounded-full flex items-center justify-center text-xs">\${usuarioAtual.nome.substring(0, 2).toUpperCase()}</div>\`;

      headerDiv.innerHTML = \`
        <div class="flex items-center space-x-3">
          \${avatarHtml}
          <div class="text-right hidden sm:block">
            <div class="text-xs font-bold text-slate-800 leading-tight">\${usuarioAtual.nome}</div>
            <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full \${badgeColor}">
              \${usuarioAtual.roleDescricao}
            </span>
          </div>
          <button onclick="fazerLogout()" title="Sair da conta" class="text-slate-400 hover:text-red-600 p-1.5 rounded-lg border border-slate-200 transition">
            <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
          </button>
        </div>
      \`;

      // Controle de Permissões
      if (usuarioAtual.role === 'admin') {
        btnAdmin.classList.remove('hidden');
      } else {
        btnAdmin.classList.add('hidden');
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
        btnSubmitCirurg.className = 'w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2';
        btnSubmitCirurg.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Gerar Relatório Cirúrgico Oficial</span>';
      }
    }

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
          <tr class="hover:bg-slate-50 transition">
            <td class="p-2.5 font-medium text-slate-800">\${u.nome}</td>
            <td class="p-2.5 text-slate-500">\${u.email}</td>
            <td class="p-2.5">
              <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold \${
                u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                (u.role === 'veterinario' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800')
              }">\${u.roleDescricao}</span>
            </td>
            <td class="p-2.5 text-right">
              <select onchange="alterarCargoUsuario('\${u.email}', this.value)" class="text-xs border border-slate-200 rounded p-1">
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

    // Controle de Abas
    function mudarAba(aba) {
      const btnUltra = document.getElementById('tab-btn-ultra');
      const btnCirurg = document.getElementById('tab-btn-cirurg');
      const divUltra = document.getElementById('aba-ultra');
      const divCirurg = document.getElementById('aba-cirurg');

      if (aba === 'ultra') {
        btnUltra.className = 'tab-active py-3 px-6 text-sm flex items-center space-x-2 transition';
        btnCirurg.className = 'py-3 px-6 text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-2 transition';
        divUltra.classList.remove('hidden');
        divCirurg.classList.add('hidden');
      } else {
        btnCirurg.className = 'tab-active py-3 px-6 text-sm flex items-center space-x-2 transition';
        btnUltra.className = 'py-3 px-6 text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-2 transition';
        divCirurg.classList.remove('hidden');
        divUltra.classList.add('hidden');
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
          <span class="text-xs text-slate-500 mt-1 block">Modelo institucional correspondente aplicado com sucesso!</span>
        \`;
        document.getElementById('btn-download-cirurg-pdf').href = data.pdfUrl;
        document.getElementById('btn-download-cirurg-docx').href = data.docxUrl;
        document.getElementById('resultado-cirurg').classList.remove('hidden');
      } catch (err) {
        alert('Erro: ' + err.message);
      } finally {
        document.getElementById('loading-cirurg').classList.add('hidden');
        document.getElementById('btn-cirurg-submit').disabled = false;
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`==================================================================`);
  console.log(`🚀 UPA PET - SERVIDOR WEB COM GOOGLE SSO ATIVO NA PORTA ${PORT}`);
  console.log(`🔗 Acesso local: http://localhost:${PORT}`);
  console.log(`==================================================================`);
});

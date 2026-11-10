const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const { analisarExameComIA } = require('./analisador_ia');
const { gerarDocumentosExame } = require('./motor_laudo');
const { analisarCirurgiaComIA } = require('./analisador_cirurgia');
const { gerarDocumentosCirurgicos } = require('./motor_cirurgia');

// Carrega configurações
const configPath = path.join(__dirname, 'config.json');
let config = { geminiApiKey: "" };
if (fs.existsSync(configPath)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch (_) {}
}

const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
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

// Health check para monitoramento de uptime
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'UPA PET Automacao', uptime: process.uptime() });
});

// Download de arquivos gerados
app.get('/downloads/:jobId/:filename', (req, res) => {
  const { jobId, filename } = req.params;
  const filePath = path.join(outputDir, jobId, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('Arquivo não encontrado ou já expirou.');
  }
});

// Endpoint: Processar Laudo de Ultrassom
app.post('/api/ultrassom', upload.array('imagens', 25), async (req, res) => {
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
    console.log(`📡 [WEB - ULTRASSOM] Processando ${caminhosArquivos.length} imagens...`);
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
    // Limpa os uploads temporários
    caminhosArquivos.forEach(f => {
      try { fs.unlinkSync(f); } catch (_) {}
    });
  }
});

// Endpoint: Processar Relatório Cirúrgico
app.post('/api/cirurgia', upload.fields([
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
    console.log(`🔪 [WEB - CIRURGIA] Analisando procedimento cirúrgico...`);
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
    // Limpa uploads temporários
    todosArquivos.forEach(f => {
      try { fs.unlinkSync(f); } catch (_) {}
    });
  }
});

// Página Inicial do Portal Web UPA PET
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UPA PET - Central de Laudos e Cirurgias</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f8fafc; }
    .tab-active { border-bottom: 3px solid #0284c7; color: #0284c7; font-weight: 600; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  <div>
    <!-- Top Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
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
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <span class="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Online na Nuvem
          </span>
        </div>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-4xl mx-auto px-4 py-8">
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
              <p class="text-xs text-slate-400 mt-0.5">Word (.docx), Pages (.pages), Texto (.txt) ou Áudios (.m4a, .mp3, .ogg, .wav)</p>
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
    </main>
  </div>

  <footer class="text-center py-6 text-xs text-slate-400 border-t border-slate-200 bg-white">
    UPA PET &bull; Automação Inteligente de Laudos e Procedimentos Cirúrgicos &bull; Dra. Camila Bastos - CRMV/MG: 22904
  </footer>

  <script>
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
  console.log(`🚀 UPA PET - SERVIDOR WEB ATIVO NA PORTA ${PORT}`);
  console.log(`🔗 Acesso local: http://localhost:${PORT}`);
  console.log(`==================================================================`);
});

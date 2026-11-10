const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { analisarExameComIA } = require('./analisador_ia');
const { gerarDocumentosExame } = require('./motor_laudo');
const { analisarCirurgiaComIA } = require('./analisador_cirurgia');
const { gerarDocumentosCirurgicos } = require('./motor_cirurgia');

// Carrega configurações
const configPath = path.join(__dirname, 'config.json');
let config = {
  pastaMonitorada: "G:\\Meu Drive\\Exames_Monitorados",
  geminiApiKey: ""
};

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (e) {
    console.error("Erro ao ler config.json:", e.message);
  }
}

const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
const pastaAlvo = process.env.WATCH_DIR || config.pastaMonitorada;
const pastaCirurgias = path.join(pastaAlvo, 'Cirurgias');
const pastaUltrassom = path.join(pastaAlvo, 'Ultrassom');

// Escudo Global: Impede que qualquer erro inesperado derrube o processo Node.js
process.on('uncaughtException', (err) => {
  console.error('\n⚠️ [ESCUDO ATIVO] Erro não tratado interceptado com sucesso:', err.message);
  console.error('   O robô se recuperou e continua monitorando novas pastas normalmente.\n');
});

process.on('unhandledRejection', (reason) => {
  console.error('\n⚠️ [ESCUDO ATIVO] Promessa assíncrona rejeitada interceptada:', reason?.message || reason);
  console.error('   O robô se recuperou e continua monitorando novas pastas normalmente.\n');
});

// Garante que as pastas de categoria existam
if (!fs.existsSync(pastaCirurgias)) fs.mkdirSync(pastaCirurgias, { recursive: true });
if (!fs.existsSync(pastaUltrassom)) fs.mkdirSync(pastaUltrassom, { recursive: true });

console.log("==================================================================");
console.log("   UPA PET - CENTRAL INTELIGENTE DE LAUDOS E CIRURGIAS");
console.log("==================================================================");
console.log(`📁 Pasta monitorada: ${pastaAlvo}`);
console.log(`   ├── 📁 Ultrassom: ${pastaUltrassom}`);
console.log(`   └── 📁 Cirurgias: ${pastaCirurgias}`);
console.log("⏱️  Tempo de estabilização: 25 segundos para upload de fotos.");
console.log("🎤 Áudios soltos em Cirurgias: identificados e organizados automaticamente!");
console.log("⚡ Dica: crie um arquivo 'pronto.txt' para processar imediatamente.");
console.log("👀 Aguardando novos uploads...\n");

const pastasProcessando = new Set();
const timersDebounce = new Map();
const historicoArquivosProcessados = new Map();

function ehPastaCirurgia(dir) {
  const norm = dir.toLowerCase();
  if (norm.includes(`${path.sep}cirurgia`) || norm.includes('/cirurgia')) return true;
  if (path.basename(dir).toLowerCase().includes('cirurgia')) return true;

  try {
    const arquivos = fs.readdirSync(dir);
    return arquivos.some(f => 
      /\.(m4a|mp3|wav|ogg|opus|pages)$/i.test(f) ||
      (/\.txt$/i.test(f) && !f.includes('pronto') && !f.includes('ok') && !f.includes('reprocessar')) ||
      (/\.docx$/i.test(f) && !f.startsWith('Relatorio_Cirurgico_') && !f.startsWith('Laudo_') && !f.startsWith('~$'))
    );
  } catch (e) {
    return false;
  }
}

function obterArquivosValidos(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => (
        (/\.(jpe?g|png|m4a|mp3|wav|ogg|opus|txt|pages)$/i.test(f) ||
         (/\.docx$/i.test(f) && !f.startsWith('Relatorio_Cirurgico_') && !f.startsWith('Laudo_') && !f.startsWith('~$'))) && 
        !f.includes('logo_') && !f.includes('assinatura_') &&
        !f.includes('pronto') && !f.includes('ok') && !f.includes('reprocessar')
      ))
      .map(f => path.join(dir, f));
  } catch (e) {
    return [];
  }
}

function obterImagensValidas(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => /\.(jpe?g|png)$/i.test(f) && !f.includes('logo_') && !f.includes('assinatura_'))
      .map(f => path.join(dir, f));
  } catch (e) {
    return [];
  }
}

// Processa lote de arquivos soltos (documento Word/texto/áudio e eventuais imagens anexas) colocados na pasta Cirurgias
async function processarLoteSoltoCirurgias() {
  if (pastasProcessando.has(pastaCirurgias)) return;
  if (!fs.existsSync(pastaCirurgias)) return;

  pastasProcessando.add(pastaCirurgias);

  try {
    const itens = fs.readdirSync(pastaCirurgias, { withFileTypes: true });
    const arquivosSoltos = itens
      .filter(item => !item.isDirectory())
      .map(item => item.name)
      .filter(f => (
        (/\.(m4a|mp3|wav|ogg|opus|txt|pages|docx|jpe?g|png|webp)$/i.test(f) ||
         (/\.docx$/i.test(f) && !f.startsWith('Relatorio_Cirurgico_') && !f.startsWith('Laudo_') && !f.startsWith('~$'))) &&
        !f.startsWith('Relatorio_Cirurgico_') &&
        !f.startsWith('Laudo_') &&
        !f.startsWith('~$') &&
        !f.includes('logo_') && !f.includes('assinatura_') &&
        !f.includes('pronto') && !f.includes('ok') && !f.includes('reprocessar')
      ))
      .map(f => path.join(pastaCirurgias, f));

    if (arquivosSoltos.length === 0) return;

    // Separa os arquivos principais (texto, docx, pages, áudio) das fotos
    const docsEaudios = arquivosSoltos.filter(f => /\.(docx|txt|pages|m4a|mp3|wav|ogg|opus)$/i.test(f));
    const fotos = arquivosSoltos.filter(f => /\.(jpe?g|png|webp)$/i.test(f));

    if (docsEaudios.length === 0) {
      if (fotos.length > 0) {
        console.log(`\n⏳ [CIRURGIAS] ${fotos.length} foto(s) detectada(s) na pasta Cirurgias. Aguardando o envio do arquivo da ficha (.docx/.txt) ou áudio...`);
      }
      return;
    }

    const principal = docsEaudios[0];
    const ext = path.extname(principal).toLowerCase();
    let icone = '📝';
    let tipoStr = 'DOCUMENTO WORD (DOCX)';
    if (ext === '.pages') {
      icone = '🍏';
      tipoStr = 'DOCUMENTO APPLE PAGES';
    } else if (ext === '.txt') {
      icone = '📄';
      tipoStr = 'TEXTO CIRÚRGICO';
    } else if (/\.(m4a|mp3|wav|ogg|opus)$/i.test(ext)) {
      icone = '🎤';
      tipoStr = 'ÁUDIO CIRÚRGICO';
    }

    console.log(`\n==================================================================`);
    console.log(`${icone} [LOTE CIRÚRGICO DETECTADO] Arquivo principal: ${path.basename(principal)}`);
    if (fotos.length > 0) {
      console.log(`📸 [FOTOS ANEXAS DETECTADAS] ${fotos.length} imagem(ns): ${fotos.map(f => path.basename(f)).join(', ')}`);
    }
    console.log(`🤖 Analisando informações com Gemini para identificar paciente e procedimento...`);

    const arquivosParaIA = [...docsEaudios, ...fotos];
    const resultadoIA = await analisarCirurgiaComIA(arquivosParaIA, apiKey);

    const nomePaciente = resultadoIA.paciente.nome || 'Paciente';
    console.log(`🐾 Paciente: ${nomePaciente} (${resultadoIA.paciente.especie || 'Canina/Felina'}) | Tutor: ${resultadoIA.paciente.tutor || 'Não informado'}`);
    console.log(`🔪 Procedimento: ${resultadoIA.cirurgia.procedimento || 'Cirurgia'}`);

    // Cria pasta organizada para o paciente dentro de Cirurgias
    const pastaPaciente = path.join(pastaCirurgias, `${nomePaciente} - Cirurgia`);
    if (!fs.existsSync(pastaPaciente)) {
      fs.mkdirSync(pastaPaciente, { recursive: true });
    }

    // Move os arquivos soltos (documento + fotos) para dentro da pasta do paciente
    const fotosMovidas = [];
    for (const arq of arquivosParaIA) {
      const destino = path.join(pastaPaciente, path.basename(arq));
      try {
        fs.renameSync(arq, destino);
      } catch (e) {
        fs.copyFileSync(arq, destino);
        try { fs.unlinkSync(arq); } catch (_) {}
      }
      if (/\.(jpe?g|png|webp)$/i.test(destino)) {
        fotosMovidas.push(destino);
      }
    }

    console.log(`📁 Pasta criada e arquivos organizados: ${path.basename(pastaPaciente)}`);
    console.log(`📄 Gerando PDF e Word oficiais (Calibri padrão UPA PET${fotosMovidas.length > 0 ? ' com página 2 fotográfica' : ''})...`);

    const docs = await gerarDocumentosCirurgicos(
      resultadoIA.paciente,
      resultadoIA.cirurgia,
      pastaPaciente,
      fotosMovidas
    );

    historicoArquivosProcessados.set(pastaPaciente, arquivosParaIA.length);

    console.log(`✅ [RELATÓRIO CIRÚRGICO CONCLUÍDO!]`);
    console.log(`   📄 PDF: ${path.basename(docs.caminhoPdf)}${fotosMovidas.length > 0 ? ' (com foto na pág 2)' : ''}`);
    console.log(`   📝 Word: ${path.basename(docs.caminhoDocx)}`);
    console.log(`☁️  Salvo com sucesso em: ${pastaPaciente}\n`);
  } catch (err) {
    console.error(`❌ Erro ao processar lote solto em Cirurgias:`, err.message);
  } finally {
    pastasProcessando.delete(pastaCirurgias);
  }
}

// Mantido para compatibilidade retroativa
async function processarArquivoSoltoCirurgia(caminhoArquivo) {
  return processarLoteSoltoCirurgias();
}

async function processarPasta(pasta, forcar = false) {
  if (pastasProcessando.has(pasta)) return;

  const ehCirurg = ehPastaCirurgia(pasta);
  const arquivos = ehCirurg ? obterArquivosValidos(pasta) : obterImagensValidas(pasta);
  if (arquivos.length === 0) return;

  const totalAnterior = historicoArquivosProcessados.get(pasta);
  const arquivosPasta = fs.readdirSync(pasta);
  const jaTemDocumento = ehCirurg
    ? arquivosPasta.some(f => /^Relatorio_Cirurgico_.*\.pdf$/i.test(f))
    : arquivosPasta.some(f => /^Laudo_.*\.pdf$/i.test(f));

  if (jaTemDocumento && !forcar) {
    if (totalAnterior !== undefined && arquivos.length <= totalAnterior) {
      console.log(`\nℹ️ [${path.basename(pasta)}]: Já possui documento oficial concluído. Preservado para não gastar cota.`);
      return;
    }
    if (totalAnterior === undefined) {
      historicoArquivosProcessados.set(pasta, arquivos.length);
      console.log(`\nℹ️ [${path.basename(pasta)}]: Já possui documento oficial concluído (${arquivos.length} arquivos). Preservado.`);
      console.log(`   💡 Dica: Se quiser reprocessar, apague o PDF antigo ou crie o arquivo 'reprocessar.txt'.\n`);
      return;
    }
  }

  pastasProcessando.add(pasta);

  try {
    if (!apiKey || apiKey === "COLE_SUA_CHAVE_AQUI") {
      throw new Error("Chave da API Gemini não configurada em config.json.");
    }

    if (ehCirurg) {
      console.log(`\n==================================================================`);
      console.log(`🩺 [INICIANDO RELATÓRIO CIRÚRGICO] Pasta: ${path.basename(pasta)}`);
      console.log(`📁 Mídias encontradas: ${arquivos.length} arquivo(s) (áudio/fotos/anotações)`);
      console.log(`🤖 Analisando áudio e dados com Gemini...`);

      const resultadoIA = await analisarCirurgiaComIA(arquivos, apiKey);

      console.log(`🐾 Paciente: ${resultadoIA.paciente.nome || 'Não identificado'} (${resultadoIA.paciente.especie || 'Canina/Felina'})`);
      console.log(`👤 Tutor: ${resultadoIA.paciente.tutor || 'Não informado'} | Peso: ${resultadoIA.paciente.peso || 'Não informado'}`);
      console.log(`🔪 Procedimento: ${resultadoIA.cirurgia.procedimento || 'Cirurgia'}`);
      console.log(`📄 Gerando PDF e Word oficiais (Calibri padrão UPA PET)...`);

      const imagensCirurgia = arquivos.filter(f => /\.(jpe?g|png|webp)$/i.test(f) && !f.includes('logo_') && !f.includes('assinatura_'));
      const docs = await gerarDocumentosCirurgicos(
        resultadoIA.paciente,
        resultadoIA.cirurgia,
        pasta,
        imagensCirurgia
      );

      historicoArquivosProcessados.set(pasta, arquivos.length);

      console.log(`✅ [RELATÓRIO CIRÚRGICO CONCLUÍDO!]`);
      console.log(`   📄 PDF: ${path.basename(docs.caminhoPdf)}`);
      console.log(`   📝 Word: ${path.basename(docs.caminhoDocx)}`);
      console.log(`☁️  Sincronizado automaticamente com o Google Drive!\n`);
    } else {
      console.log(`\n==================================================================`);
      console.log(`📡 [INICIANDO LAUDO DE ULTRASSOM] Pasta: ${path.basename(pasta)}`);
      console.log(`🖼️  Lote estabilizado com ${arquivos.length} imagens no total.`);
      console.log(`🤖 Analisando capturas do Mindray com Gemini...`);

      const resultadoIA = await analisarExameComIA(arquivos, apiKey);

      console.log(`🐾 Paciente: ${resultadoIA.paciente.nome || 'Não identificado'} (${resultadoIA.paciente.especie || 'Canina/Felina'})`);
      console.log(`👤 Tutor: ${resultadoIA.paciente.tutor || 'Não informado'} | Data: ${resultadoIA.paciente.data || ''}`);
      console.log(`📄 Compilando PDF e DOCX com identidade visual UPA PET...`);

      const imagensOrdenadas = resultadoIA.caminhosOrdenados || arquivos;
      const docs = await gerarDocumentosExame(
        resultadoIA.paciente,
        resultadoIA.laudo,
        imagensOrdenadas,
        pasta
      );

      historicoArquivosProcessados.set(pasta, arquivos.length);

      console.log(`✅ [LAUDO DE ULTRASSOM CONCLUÍDO!]`);
      console.log(`   📄 PDF: ${path.basename(docs.caminhoPdf)}`);
      console.log(`   📝 Word: ${path.basename(docs.caminhoDocx)}`);
      console.log(`☁️  Sincronizado automaticamente com o Google Drive!\n`);
    }
  } catch (err) {
    console.error(`❌ Erro ao processar pasta ${path.basename(pasta)}:`, err.message);
  } finally {
    pastasProcessando.delete(pasta);
  }
}

// Inicialização: mapeia exames existentes para não reprocessar no boot
function inicializarExamesExistentes() {
  console.log("🔍 Verificando pastas existentes no Google Drive...");
  try {
    if (!fs.existsSync(pastaAlvo)) return;

    // Verifica se há arquivos de dados cirúrgicos ou fotos soltas pendentes diretamente em Cirurgias
    if (fs.existsSync(pastaCirurgias)) {
      const itens = fs.readdirSync(pastaCirurgias, { withFileTypes: true });
      const temSoltos = itens.some(it => !it.isDirectory() && 
        /\.(m4a|mp3|wav|ogg|opus|txt|pages|docx|jpe?g|png|webp)$/i.test(it.name) &&
        !it.name.startsWith('Relatorio_Cirurgico_') && !it.name.startsWith('Laudo_') && !it.name.startsWith('~$') &&
        !it.name.includes('pronto') && !it.name.includes('ok') && !it.name.includes('reprocessar')
      );

      if (temSoltos) {
        console.log(`   ⏳ Arquivos pendentes encontrados na pasta Cirurgias. Agendando processamento do lote...`);
        timersDebounce.set(pastaCirurgias, setTimeout(() => {
          processarLoteSoltoCirurgias();
        }, 3000));
      }
    }

    function escanearDiretorio(dir, nivel = 0) {
      if (nivel > 2) return;
      const itens = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of itens) {
        if (item.isDirectory()) {
          const subpasta = path.join(dir, item.name);
          const ehRaizCategoria = subpasta.toLowerCase() === pastaCirurgias.toLowerCase() ||
                                  subpasta.toLowerCase() === pastaUltrassom.toLowerCase();

          if (ehRaizCategoria) {
            escanearDiretorio(subpasta, nivel + 1);
            continue;
          }

          const ehCirurg = ehPastaCirurgia(subpasta);
          const arquivos = ehCirurg ? obterArquivosValidos(subpasta) : obterImagensValidas(subpasta);
          const arquivosPasta = fs.readdirSync(subpasta);
          const jaTemDoc = ehCirurg
            ? arquivosPasta.some(f => /^Relatorio_Cirurgico_.*\.pdf$/i.test(f))
            : arquivosPasta.some(f => /^Laudo_.*\.pdf$/i.test(f));

          if (jaTemDoc) {
            historicoArquivosProcessados.set(subpasta, arquivos.length);
          } else if (arquivos.length > 0) {
            console.log(`   ⏳ [${item.name}]: Item pendente encontrado (${arquivos.length} arquivos). Agendando processamento...`);
            timersDebounce.set(subpasta, setTimeout(() => {
              processarPasta(subpasta);
            }, 4000));
          }
        }
      }
    }

    escanearDiretorio(pastaAlvo);
    console.log(`   ✔ ${historicoArquivosProcessados.size} procedimento(s) anteriores preservados sem reprocessamento.`);
  } catch (err) {
    console.error("Erro ao verificar pastas existentes:", err.message);
  }
}

inicializarExamesExistentes();

const watcher = chokidar.watch(pastaAlvo, {
  ignored: [/(^|[\/\\])\../, /\.html$/i, /\.tmp$/i],
  persistent: true,
  depth: 4,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 3000,
    pollInterval: 500
  }
});

watcher.on('error', (err) => {
  // Ignora erros transitórios de sistema de arquivos virtual do Google Drive
  if (err.code === 'EINVAL' || err.code === 'ENOENT') return;
  console.warn("⚠️ Aviso no observador de arquivos:", err.message);
});

watcher.on('ready', () => {
  console.log("\n==================================================================");
  console.log("👀 [MONITOR ATIVO] Pronto para receber Laudos de Ultrassom e Cirurgias!");
  console.log("==================================================================\n");
});

watcher.on('addDir', (dirPath) => {
  if (dirPath === pastaAlvo) return;
  const nome = path.basename(dirPath);
  if (nome.toLowerCase() === 'cirurgias' || nome.toLowerCase() === 'ultrassom') return;
  console.log(`📁 [NOVA PASTA DETECTADA] '${nome}'. Aguardando arquivos...`);
});

watcher.on('add', (filePath) => {
  const pasta = path.dirname(filePath);
  const nomeArquivo = path.basename(filePath).toLowerCase();

  // Ignora saídas geradas e temporários do Word em qualquer local
  if (path.basename(filePath).startsWith('Relatorio_Cirurgico_') || 
      path.basename(filePath).startsWith('Laudo_') || 
      path.basename(filePath).startsWith('~$')) {
    return;
  }

  // Caso 1: Arquivos colocados diretamente na raiz da pasta 'Cirurgias' (áudio, docx, txt, pages ou fotos)
  if (pasta.toLowerCase() === pastaCirurgias.toLowerCase()) {
    // Gatilho imediato se criar arquivo pronto/ok/reprocessar na pasta Cirurgias
    if (nomeArquivo.includes('pronto') || nomeArquivo.includes('ok') || nomeArquivo.includes('reprocessar')) {
      console.log(`⚡ [GATILHO IMEDIATO] Arquivo '${nomeArquivo}' em Cirurgias. Processando lote agora...`);
      if (timersDebounce.has(pastaCirurgias)) clearTimeout(timersDebounce.get(pastaCirurgias));
      try { fs.unlinkSync(filePath); } catch (_) {}
      processarLoteSoltoCirurgias();
      return;
    }

    const ehMidiaCirurgica = /\.(m4a|mp3|wav|ogg|opus|txt|pages|docx|jpe?g|png|webp)$/i.test(filePath) &&
      !path.basename(filePath).startsWith('Relatorio_Cirurgico_') &&
      !path.basename(filePath).startsWith('Laudo_') &&
      !path.basename(filePath).startsWith('~$');

    if (ehMidiaCirurgica) {
      const ext = path.extname(filePath).toLowerCase();
      let tipo = 'ARQUIVO CIRÚRGICO';
      if (ext === '.docx') tipo = 'DOCUMENTO WORD (DOCX)';
      else if (ext === '.pages') tipo = 'DOCUMENTO APPLE PAGES';
      else if (ext === '.txt') tipo = 'TEXTO CIRÚRGICO';
      else if (/\.(jpe?g|png|webp)$/i.test(ext)) tipo = 'FOTO CIRÚRGICA';
      else if (/\.(m4a|mp3|wav|ogg|opus)$/i.test(ext)) tipo = 'ÁUDIO CIRÚRGICO';

      console.log(`📥 [UPLOAD CIRURGIAS] '${path.basename(filePath)}' (${tipo}) recebido. Aguardando 25 segundos para upload conjunto...`);
      if (timersDebounce.has(pastaCirurgias)) clearTimeout(timersDebounce.get(pastaCirurgias));
      timersDebounce.set(pastaCirurgias, setTimeout(() => {
        processarLoteSoltoCirurgias();
      }, 25000)); // Timer de 25 segundos para sincronização conjunta
      return;
    }

    return;
  }

  // Ignora arquivos soltos na raiz principal ou em Ultrassom sem pasta de paciente
  if (pasta === pastaAlvo) return;
  if (pasta.toLowerCase() === pastaUltrassom.toLowerCase()) return;

  // Gatilho imediato se criar arquivo pronto/ok/reprocessar dentro da pasta do paciente
  if (nomeArquivo.includes('pronto') || nomeArquivo.includes('ok') || nomeArquivo.includes('reprocessar')) {
    console.log(`⚡ [GATILHO IMEDIATO] Arquivo '${nomeArquivo}' em '${path.basename(pasta)}'. Forçando processamento agora...`);
    if (timersDebounce.has(pasta)) clearTimeout(timersDebounce.get(pasta));
    processarPasta(pasta, true);
    return;
  }

  // Caso 2: Arquivo dentro de uma pasta de paciente (seja em Cirurgias ou Ultrassom)
  if (/\.(jpe?g|png|m4a|mp3|wav|ogg|opus|txt|pages|docx)$/i.test(filePath)) {
    const ehCirurg = ehPastaCirurgia(pasta);
    const totalAtual = ehCirurg ? obterArquivosValidos(pasta).length : obterImagensValidas(pasta).length;
    console.log(`📥 [UPLOAD DETECTADO] Arquivo adicionado em '${path.basename(pasta)}' (Total: ${totalAtual}). Aguardando estabilização (25s)...`);

    if (timersDebounce.has(pasta)) clearTimeout(timersDebounce.get(pasta));
    timersDebounce.set(pasta, setTimeout(() => {
      processarPasta(pasta);
    }, 25000));
  }
});

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { obterTextoModelosParaPrompt } = require('./gerenciador_modelos');
const { extrairConteudoPages } = require('./leitor_pages');
const { extrairTextoDocx } = require('./leitor_docx');

function formatarDataHoje() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function obterMimeTypeAudio(caminhoArquivo) {
  const ext = path.extname(caminhoArquivo).toLowerCase();
  switch (ext) {
    case '.m4a':
      return 'audio/mp4';
    case '.mp3':
      return 'audio/mp3';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
    case '.opus':
      return 'audio/ogg';
    default:
      return 'audio/mp4';
  }
}

function obterMimeTypeImagem(caminhoArquivo) {
  const ext = path.extname(caminhoArquivo).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function analisarCirurgiaComIA(arquivos, apiKey, opcoes = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const usuario = opcoes.usuario || null;
  const modelosBiblioteca = await obterTextoModelosParaPrompt(usuario?.id || null);
  const dataHoje = formatarDataHoje();

  const nomeClinica = usuario?.nomeClinica || 'Vetaro';
  const identificacaoMedico = usuario?.nome
    ? `${usuario.nome}${usuario.crmv ? ' - ' + usuario.crmv : ''}`
    : 'Dra. Camila Bastos - CRMV/MG: 22904';

  const promptInstrucoes = `
Você é o assistente cirúrgico veterinário sênior oficial de ${nomeClinica} (${identificacaoMedico}).
Sua missão é ouvir o áudio gravado pelo cirurgião veterinário (ou ler os arquivos de texto e fotos anexas) e redigir o RELATÓRIO CIRÚRGICO oficial da clínica, seguindo rigorosamente o padrão institucional já estabelecido.

${modelosBiblioteca}

REGRAS DE FORMATAÇÃO E ESTILO (CRÍTICAS):
1. **Padrão Institucional**:
   - Utilize a terminologia médica cirúrgica formal dos modelos fornecidos.
   - A antissepsia deve sempre citar clorexidina degermante seguida de alcoólica em no mínimo 3 ciclos.
   - A monitorização é sempre contínua sob anestesia geral.
   - A síntese por planos deve especificar detalhadamente os fios e padrões (ex: peritônio e musculatura com nylon em padrão reverdin; subcutâneo com proliglecaprone ou poliglactina em padrão intradérmico; pele com nylon em padrão sultan ou simples).
2. **Uso dos Modelos da Biblioteca**:
   - Se o procedimento realizado corresponder a um dos modelos cadastrados, **COPIE O TEXTO EXATO** dos campos diagnosticoPreCirurgico, descricaoProcedimento e evolucaoConsideracoes daquele modelo — o texto do modelo é a fonte primária. Adapte SOMENTE: (a) dados específicos do paciente (nome, tutor, idade, peso, data, espécie), e (b) achados citados pelo veterinário que se divergem do modelo (fios diferentes, complicações, lavagem, hemostasia). NÃO reescreva do zero: mantenha a estrutura, os parágrafos e o vocabulário cirúrgico do modelo.
   - Se for uma cirurgia diferente dos modelos cadastrados, formule o relatório mantendo o mesmo altíssimo rigor técnico, formalidade cirúrgica e clareza.
   - Identifique o modelo correspondente e reporte o nome exato no campo "modelo".
3. **Extração de Dados do Paciente**:
   - Identifique nome, espécie (Canina/Felina), sexo (Macho/Fêmea), idade, peso e tutor. Se o veterinário não citar algum campo (ex: peso ou tutor), coloque "Não informado".
   - Data do procedimento: se o cirurgião falar ou escrever a data, use-a; se não falar, use a data de hoje: "${dataHoje}".
4. **Suporte a Arquivos de Texto com Ficha Cirúrgica**:
   Quando o cirurgião fornecer um arquivo de texto (.txt) contendo o formulário:
   ----------------------------------------------------
   INFORMAÇÕES GERAIS DO ANIMAL/TUTOR: [dados do paciente e tutor]
   DATA: [data da cirurgia]
   PROCEDIMENTO: [nome do procedimento]
   DIAGNÓSTICO: [diagnóstico ou suspeita]
   DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO: [descrição e achados]
   CONSIDERAÇÕES: [evolução e pós-operatório]
   ----------------------------------------------------
   - Extraia de "INFORMAÇÕES GERAIS DO ANIMAL/TUTOR" todos os dados do paciente: Nome, Espécie, Sexo, Idade, Peso e Tutor.
   - Utilize a "DATA" informada (ou data de hoje caso vazia).
   - Analise o "PROCEDIMENTO" e encontre o modelo correspondente na biblioteca (ex: Ovariohisterectomia terapêutica / piometra, OSH eletiva, Celiotomia exploratória, Orquiectomia aberta, etc.).
   - Preencha o "DIAGNÓSTICO PRÉ-CIRÚRGICO" com o diagnóstico informado.
   - Na "DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO": mescle as informações e achados fornecidos pelo veterinário com o padrão institucional do modelo correspondente (antissepsia 3 ciclos com clorexidina degermante e alcoólica, posicionamento em decúbito dorsal, monitorização contínua, ligaduras transfixantes e fechamento por planos em reverdin, intradérmico e sultan). Caso o veterinário tenha citado fios ou técnicas específicas, priorize o que ele descreveu.
   - Preencha "EVOLUÇÃO E CONSIDERAÇÕES" com o campo informado (ou padrão de recuperação anestésica estável sem intercorrências).
5. **Retorno Obrigatório em JSON**:
   Retorne APENAS um bloco JSON válido (sem comentários adicionais), no seguinte formato exato:
\`\`\`json
{
  "paciente": {
    "nome": "Nome do Paciente",
    "tutor": "Nome do Tutor",
    "especie": "Canina ou Felina",
    "sexo": "Fêmea ou Macho",
    "idade": "X anos",
    "peso": "X,XXX kg",
    "data": "DD/MM/AAAA"
  },
  "cirurgia": {
    "procedimento": "Nome formal do procedimento (ex: Ovariohisterectomia terapêutica.)",
    "diagnosticoPreCirurgico": "Diagnóstico ou suspeita que indicou a cirurgia",
    "descricaoProcedimento": "Texto completo da descrição cirúrgica, separado em parágrafos coerentes (utilizando dupla quebra de linha \\n\\n entre os parágrafos). Inclui antissepsia, abordagem anatômica, hemostasia, ligaduras, achados e síntese por planos.",
    "evolucaoConsideracoes": "Texto descrevendo a recuperação anestésica imediata, parâmetros e intercorrências ou ausência delas."
  }
}
\`\`\`
`;

  const partes = [{ text: promptInstrucoes }];

  for (const arq of arquivos) {
    const ext = path.extname(arq).toLowerCase();
    if (/\.(m4a|mp3|wav|ogg|opus)$/i.test(ext)) {
      const buffer = fs.readFileSync(arq);
      partes.push({
        inlineData: {
          mimeType: obterMimeTypeAudio(arq),
          data: buffer.toString('base64')
        }
      });
      partes.push({ text: `[Arquivo de áudio da cirurgia fornecido: ${path.basename(arq)}]` });
    } else if (/\.(jpe?g|png|webp)$/i.test(ext) && !arq.includes('logo_') && !arq.includes('assinatura_')) {
      const buffer = fs.readFileSync(arq);
      partes.push({
        inlineData: {
          mimeType: obterMimeTypeImagem(arq),
          data: buffer.toString('base64')
        }
      });
      partes.push({ text: `[Foto do procedimento/peça cirúrgica fornecida: ${path.basename(arq)}]` });
    } else if (/\.(txt|json)$/i.test(ext)) {
      const conteudo = fs.readFileSync(arq, 'utf8');
      partes.push({ text: `[Arquivo de texto com dados da cirurgia (${path.basename(arq)})]:\n${conteudo}` });
    } else if (ext === '.pages') {
      try {
        const conteudoPages = await extrairConteudoPages(arq);
        if (conteudoPages.tipo === 'pdf') {
          partes.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: conteudoPages.buffer.toString('base64')
            }
          });
          partes.push({ text: `[Documento Apple Pages (${path.basename(arq)}) fornecido com layout PDF original]` });
        } else if (conteudoPages.tipo === 'imagem') {
          partes.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: conteudoPages.buffer.toString('base64')
            }
          });
          partes.push({ text: `[Documento Apple Pages (${path.basename(arq)}) fornecido como imagem]` });
        } else if (conteudoPages.tipo === 'texto') {
          partes.push({ text: `[Texto extraído do documento Apple Pages (${path.basename(arq)})]:\n${conteudoPages.texto}` });
        }
      } catch (errPages) {
        console.warn(`Aviso ao ler arquivo .pages (${path.basename(arq)}):`, errPages.message);
      }
    } else if (ext === '.docx' && !path.basename(arq).startsWith('Relatorio_Cirurgico_') && !path.basename(arq).startsWith('Laudo_') && !path.basename(arq).startsWith('~$')) {
      try {
        const textoDocx = await extrairTextoDocx(arq);
        partes.push({ text: `[Documento Word DOCX com dados da cirurgia (${path.basename(arq)})]:\n${textoDocx}` });
      } catch (errDocx) {
        console.warn(`Aviso ao ler arquivo .docx (${path.basename(arq)}):`, errDocx.message);
      }
    } else if (ext === '.pdf' && !path.basename(arq).startsWith('Relatorio_Cirurgico_')) {
      const pdfBuffer = fs.readFileSync(arq);
      partes.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBuffer.toString('base64')
        }
      });
      partes.push({ text: `[Documento PDF anexo com informações da cirurgia: ${path.basename(arq)}]` });
    }
  }

  const modelosIA = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash'
  ];

  let ultimoErro = null;

  for (const modeloNome of modelosIA) {
    try {
      console.log(`Tentando análise cirúrgica com o modelo ${modeloNome}...`);
      const model = genAI.getGenerativeModel({ model: modeloNome });
      const resultado = await model.generateContent(partes);
      const texto = resultado.response.text();

      const jsonMatch = texto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn(`Aviso: Falha com ${modeloNome}: ${err.message}. Tentando próximo modelo...`);
      ultimoErro = err;
    }
  }

  throw new Error(`Não foi possível analisar os dados cirúrgicos: ${ultimoErro?.message}`);
}

module.exports = {
  analisarCirurgiaComIA
};

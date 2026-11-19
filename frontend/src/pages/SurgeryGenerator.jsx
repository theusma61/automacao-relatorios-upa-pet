import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  CheckCircle2,
  Wand2,
  Download,
  FileCheck,
  Stethoscope,
  Eye,
  Copy,
  Plus,
  Search,
  Lock,
  FileText,
  Upload,
  Sparkles
} from 'lucide-react';
import {
  VetaroLogo,
  UltrasoundIcon,
  CardWaveBackground,
  SurgicalFilePulseIcon,
  CameraSolidIcon
} from '../components/icons/VetaroIcons';
import ModeloCirurgicoModal from '../components/modals/ModeloCirurgicoModal';
import { api } from '../services/api';

export default function SurgeryGenerator({
  darkMode,
  userProfile,
  layoutConfig,
  onOpenProfile,
  onNavigateHome,
  onAddActivity,
  onToast
}) {
  const docInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const [surgeryDocFile, setSurgeryDocFile] = useState(null);
  const [rawDocFile, setRawDocFile] = useState(null);
  const [surgeryPhotos, setSurgeryPhotos] = useState([]);
  const [rawPhotoFiles, setRawPhotoFiles] = useState([]);
  const [inputMode, setInputMode] = useState('text'); // 'text' ou 'file'
  const [surgeryText, setSurgeryText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [downloadLinks, setDownloadLinks] = useState({ pdfUrl: '', docxUrl: '' });
  const [reportPageTab, setReportPageTab] = useState('p1');

  const [modelos, setModelos] = useState([]);
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [modeloSelecionado, setModeloSelecionado] = useState(null);

  const podeEmitir =
    userProfile?.podeGerarCirurgia ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'veterinario';

  const handleInsertTemplate = () => {
    const template = `Paciente: Thor | Espécie: Canina | Sexo: Macho | Idade: 5 anos | Peso: 14 kg
Tutor: Carlos Silva | Data: ${new Date().toLocaleDateString('pt-BR')}
Procedimento: Orquiectomia pré-escrotal eletiva
Diagnóstico pré-cirúrgico: Esterilização eletiva

Descrição da técnica:
Antissepsia rigorosa em 3 ciclos com clorexidina degermante e alcoólica.
Incisão cutânea pré-escrotal longitudinal na rafe mediana.
Exteriorização dos testículos com dissecção romba da fáscia espermática.
Ligadura tripla do cordão espermático e vasos testiculares com fio Nylon 2-0.
Síntese do tecido subcutâneo com fio Poliglecaprone 3-0 em padrão intradérmico.
Síntese cutânea com fio Nylon 3-0 em pontos simples separados.

Recuperação pós-anestésica:
Paciente extubado acordado, parâmetros fisiológicos estáveis, sem hipotermia ou sangramentos.`;

    setSurgeryText(template);
    if (onToast) onToast('Modelo de exemplo inserido no campo!');
  };

  const carregarModelos = async () => {
    try {
      const res = await api.getModelosCirurgicos();
      if (res && Array.isArray(res.modelos)) {
        setModelos(res.modelos);
      }
    } catch (_) {}
  };

  useEffect(() => {
    carregarModelos();
  }, []);

  const handleDocSelected = (fileList) => {
    const f = fileList && fileList[0];
    if (!f) return;
    setRawDocFile(f);
    setSurgeryDocFile({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`
    });
    onToast('Arquivo da cirurgia selecionado!');
  };

  const handlePhotosSelected = (fileList) => {
    const arr = Array.from(fileList || []).slice(0, 5);
    if (arr.length === 0) return;
    setRawPhotoFiles(arr);
    setSurgeryPhotos(
      arr.map((f, i) => ({
        name: f.name,
        label: `Foto ${i + 1} (${(f.size / 1024).toFixed(0)} KB)`,
        previewUrl: URL.createObjectURL(f)
      }))
    );
    onToast(`${arr.length} foto(s) intraoperatória(s) anexada(s)!`);
  };

  const handleGenerate = async () => {
    if (!podeEmitir) {
      onToast('Sua conta não possui permissão para gerar relatórios cirúrgicos.');
      return;
    }
    const hasText = Boolean(surgeryText && surgeryText.trim().length >= 8);
    const hasDoc = Boolean(rawDocFile);
    const hasPhotos = rawPhotoFiles.length > 0;

    if (!hasText && !hasDoc && !hasPhotos) {
      onToast('Digite as informações da cirurgia ou selecione um arquivo/áudio antes de gerar.');
      if (inputMode === 'file' && docInputRef.current) docInputRef.current.click();
      return;
    }

    setIsGenerating(true);
    setGeneratedOutput('');
    setDownloadLinks({ pdfUrl: '', docxUrl: '' });
    setReportPageTab('p1');

    const now = new Date();
    const dateStr = `Gerado em ${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      const fd = new FormData();
      if (rawDocFile) fd.append('documento', rawDocFile);
      if (surgeryText && surgeryText.trim()) fd.append('textoDigitado', surgeryText.trim());
      rawPhotoFiles.forEach((f) => fd.append('fotos', f));

      const res = await api.gerarCirurgia(fd);
      const pac = res.paciente || {};
      const cir = res.cirurgia || {};
      const textReal =
        `RELATÓRIO CIRÚRGICO OFICIAL — ${(userProfile.clinicName || 'Vetaro').toUpperCase()}\n` +
        `Cirurgiã(o) Responsável: ${userProfile.name} (${userProfile.crmv})\n` +
        `Paciente: ${pac.nome || 'Paciente'} (${pac.especie || 'Canina'}) | Procedimento: ${
          cir.procedimento || 'Procedimento Cirúrgico'
        }\n` +
        `--------------------------------------------------------------------------------\n` +
        `1. DIAGNÓSTICO PRÉ-CIRÚRGICO:\n${cir.diagnosticoPreCirurgico || 'A critério clínico.'}\n\n` +
        `2. DESCRIÇÃO TÉCNICA DO PROCEDIMENTO:\n${
          cir.descricaoProcedimento || 'Procedimento realizado conforme protocolo institucional.'
        }\n\n` +
        `3. EVOLUÇÃO E CONSIDERAÇÕES:\n${
          cir.evolucaoConsideracoes || 'Paciente encaminhado para recuperação.'
        }`;

      setGeneratedOutput(textReal);
      setDownloadLinks({ pdfUrl: res.pdfUrl || '', docxUrl: res.docxUrl || '' });
      onAddActivity({
        id: `cirurg-${Date.now()}`,
        type: 'relatorio',
        title: `Relatório Cirúrgico — ${cir.procedimento || 'Oficial'}`,
        patient: `${pac.nome || 'Paciente'} (${pac.especie || 'Canina'})`,
        tutor: pac.tutor || '',
        date: dateStr,
        status: 'Concluído',
        summary: textReal,
        pdfUrl: res.pdfUrl,
        docxUrl: res.docxUrl
      });
      onToast('Relatório Cirúrgico Oficial concluído com sucesso!');
    } catch (err) {
      onToast('Erro ao processar cirurgia: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClonarModelo = async (id) => {
    try {
      const res = await api.clonarModeloCirurgico(id);
      onToast(`Modelo duplicado para seu perfil como "${res.modelo?.nome || 'Meu Modelo'}"!`);
      await carregarModelos();
    } catch (err) {
      onToast('Erro ao duplicar modelo: ' + err.message);
    }
  };

  const modelosFiltrados = modelos.filter((m) => {
    if (filtroOrigem === 'globais' && !m.isGlobal) return false;
    if (filtroOrigem === 'meus' && m.isGlobal) return false;
    const q = buscaModelo.toLowerCase().trim();
    if (!q) return true;
    const nome = (m.nome || '').toLowerCase();
    const proc = (m.procedimento || '').toLowerCase();
    const desc = (m.descricaoProcedimento || '').toLowerCase();
    const sin = Array.isArray(m.sinonimos) ? m.sinonimos.join(' ').toLowerCase() : '';
    return nome.includes(q) || proc.includes(q) || desc.includes(q) || sin.includes(q);
  });

  return (
    <div className="space-y-6">
      <div
        className={`relative rounded-2xl p-5 sm:p-7 border overflow-hidden transition shadow-lg ${
          darkMode
            ? 'bg-[#0F1C26] border-[#1E3545] text-white'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        <CardWaveBackground dark={darkMode} />

        {/* Cabeçalho */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              Relatório Cirúrgico Oficial
            </h2>
            <p
              className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${
                darkMode ? 'text-slate-300' : 'text-[#52657A]'
              }`}
            >
              Envie o documento da cirurgia (.docx, .pages, .txt ou áudio gravado) e fotos
              anexas opcionais.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            className="self-start px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-[#E3FAF2] text-[#0D5C56] border border-[#00D296]/40 shrink-0"
          >
            <User className="w-4 h-4 text-[#00A878]" />
            <span>Timbre: {userProfile.crmv}</span>
          </button>
        </div>

        {/* Inputs ocultos */}
        <input
          ref={docInputRef}
          type="file"
          accept=".docx,.pages,.txt,.m4a,.mp3,.wav,.ogg,.opus"
          className="hidden"
          onChange={(e) => handleDocSelected(e.target.files)}
        />
        <input
          ref={photoInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhotosSelected(e.target.files)}
        />

        {/* SEÇÃO 1: INFORMAÇÕES DO PROCEDIMENTO CIRÚRGICO */}
        <div className="relative z-10 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <p
              className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider ${
                darkMode ? 'text-slate-200' : 'text-[#1E2D3D]'
              }`}
            >
              1. INFORMAÇÕES DO PROCEDIMENTO CIRÚRGICO
            </p>

            {/* Alternador de Modo: Digitar vs Arquivo */}
            <div
              className={`p-1 rounded-xl flex items-center gap-1 border ${
                darkMode ? 'bg-[#0E1B26] border-[#22374A]' : 'bg-[#E2EBE8] border-slate-300/80'
              }`}
            >
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  inputMode === 'text'
                    ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#0A1A24] shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>✍️ Digitar Informações</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  inputMode === 'file'
                    ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#0A1A24] shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>📁 Anexar Arquivo / Áudio</span>
              </button>
            </div>
          </div>

          {inputMode === 'text' ? (
            /* Modo 1: Digitar ou Colar Texto Livre Inteligente */
            <div
              className={`rounded-2xl border p-4 transition ${
                darkMode
                  ? 'bg-[#12222F] border-[#24394B] focus-within:border-[#00D296]'
                  : 'bg-white border-[#B2D6CD] focus-within:border-[#0D5C56]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-dashed border-slate-500/20">
                <span className="text-xs font-bold text-[#00A878] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Texto Livre Inteligente (A IA organiza e formaliza tudo no padrão oficial)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsertTemplate}
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#00D296]/15 hover:bg-[#00D296]/25 text-[#00A878] border border-[#00D296]/40 transition"
                  >
                    + Inserir Modelo de Exemplo
                  </button>
                  {surgeryText && (
                    <button
                      type="button"
                      onClick={() => setSurgeryText('')}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition px-2 py-1"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={surgeryText}
                onChange={(e) => setSurgeryText(e.target.value)}
                rows={9}
                placeholder={`Cole ou digite aqui as informações da cirurgia...

Exemplo:
Paciente: Thor | Espécie: Canina | Macho | 4 anos | Peso: 15 kg
Tutor: Carlos Silva | Data: 19/11/2026
Procedimento: Celiotomia exploratória com enterotomia por corpo estranho.
Descrição: Antissepsia rigorosa em 3 ciclos com clorexidina degermante e alcoólica. Incisão mediana pré e pós-umbilical. Localizado corpo estranho linear em jejuno proximal. Enterotomia com lâmina 11, retirada de fragmento plástico. Enterorrafia com PDS 3-0 em pontos simples separados e omentopexia. Síntese muscular com nylon 2-0 Reverdin, subcutâneo com poliglecaprone 3-0 intradérmico e pele com nylon 3-0 Sultan.
Recuperação: Paciente extubado acordado, sem hipotermia ou sangramentos.`}
                className={`w-full text-xs sm:text-sm leading-relaxed outline-none resize-y font-mono bg-transparent ${
                  darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
              />

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-500/15 text-slate-400">
                <span>💡 Cole anotações do WhatsApp, prontuário ou bloco de notas livremente.</span>
                <span className="font-mono">{surgeryText.length} caracteres</span>
              </div>
            </div>
          ) : (
            /* Modo 2: Upload de Arquivo / Áudio */
            <div>
              <div
                onClick={() => docInputRef.current && docInputRef.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleDocSelected(e.dataTransfer.files);
                  }
                }}
                className={`rounded-2xl border-2 border-dashed py-8 px-5 text-center cursor-pointer transition group ${
                  darkMode
                    ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]'
                    : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]'
                }`}
              >
                <div className="flex justify-center mb-2.5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ${
                      darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C7F0E3] text-[#0D5C56]'
                    }`}
                  >
                    <SurgicalFilePulseIcon className="w-10 h-10" />
                  </div>
                </div>

                <p className="text-sm sm:text-base font-extrabold">
                  Selecione o arquivo da cirurgia
                </p>
                <p
                  className={`text-xs mt-1 font-medium ${
                    darkMode ? 'text-slate-300/80' : 'text-[#52657A]'
                  }`}
                >
                  Word (.docx), Pages (.pages), Texto (.txt) ou Áudios (.m4a, .mp3, .wav, .ogg)
                </p>

                {surgeryDocFile && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-[#00D296]/20 border border-[#00D296] text-xs font-extrabold text-[#00D296]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{surgeryDocFile.name}</span>
                    <span className="opacity-75">({surgeryDocFile.size})</span>
                  </div>
                )}
              </div>

              {/* Campo opcional de observação extra quando em modo arquivo */}
              <div className="mt-3">
                <input
                  type="text"
                  value={surgeryText}
                  onChange={(e) => setSurgeryText(e.target.value)}
                  placeholder="Observação ou detalhe complementar opcional (ex: complicação inesperada, fio alternativo)..."
                  className={`w-full text-xs px-3.5 py-2 rounded-xl border outline-none ${
                    darkMode
                      ? 'bg-[#101D27] border-[#22374A] text-slate-200 placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 2: 2. FOTOS INTRAOPERATÓRIAS / PEÇA CIRÚRGICA */}
        <div className="relative z-10 mb-5">
          <p
            className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-200' : 'text-[#1E2D3D]'
            }`}
          >
            2. FOTOS INTRAOPERATÓRIAS / PEÇA CIRÚRGICA (OPCIONAL - PÁGINA 2)
          </p>

          <div
            onClick={() => photoInputRef.current && photoInputRef.current.click()}
            className={`rounded-2xl border py-5 px-5 text-center cursor-pointer transition group ${
              darkMode
                ? 'bg-[#0C1822]/90 border-[#24394B] hover:border-[#00D296]'
                : 'bg-[#F5F9FA] border-slate-300 hover:border-[#0D5C56]'
            }`}
          >
            <div className="flex justify-center mb-1.5">
              <CameraSolidIcon
                className={`w-7 h-7 transition group-hover:scale-105 ${
                  darkMode ? 'text-slate-200' : 'text-[#0D5C56]'
                }`}
              />
            </div>
            <p
              className={`text-xs sm:text-sm font-bold ${
                darkMode ? 'text-slate-200' : 'text-[#2C3E50]'
              }`}
            >
              Clique para adicionar fotos da peça cirúrgica ou procedimento
            </p>

            {surgeryPhotos.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-3 flex flex-wrap items-center justify-center gap-2"
              >
                {surgeryPhotos.map((photo, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-lg bg-[#00D296]/15 border border-[#00D296]/40 text-[11px] font-bold text-[#00D296]"
                  >
                    📷 {photo.name} ({photo.label})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botão Largo Principal */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !podeEmitir}
          className={`relative z-10 w-full py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ${
            !podeEmitir
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : darkMode
              ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110'
              : 'bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white hover:brightness-110'
          }`}
        >
          {!podeEmitir ? (
            <>
              <Lock className="w-5 h-5" />
              <span>Geração Cirúrgica Bloqueada (Sem Permissão)</span>
            </>
          ) : (
            <>
              <Wand2 className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? 'Identificando procedimento e aplicando modelos cirúrgicos...'
                  : 'Gerar Relatório Cirúrgico Oficial'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Resultado Real Gerado pela IA */}
      {generatedOutput && (
        <div
          className={`p-5 sm:p-6 rounded-2xl border space-y-4 transition ${
            darkMode ? 'bg-[#0F1C26] border-[#00D296]/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/40">
            <div className="flex items-center gap-2">
              <VetaroLogo size={22} dark={darkMode} textSize="text-base" />
              <span className="text-xs font-bold text-[#00D296]">
                • Relatório Cirúrgico Concluído!
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReportPageTab('p1')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                  reportPageTab === 'p1'
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'bg-slate-500/10 text-slate-400'
                }`}
              >
                Página 1: Documento Oficial
              </button>
              {surgeryPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReportPageTab('p2')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                    reportPageTab === 'p2'
                      ? 'bg-[#00D296] text-[#062E2B]'
                      : 'bg-slate-500/10 text-slate-400'
                  }`}
                >
                  Página 2: Fotos da Cirurgia ({surgeryPhotos.length})
                </button>
              )}
            </div>
          </div>

          {reportPageTab === 'p1' ? (
            <pre
              className={`text-xs leading-relaxed whitespace-pre-wrap font-sans p-4 rounded-xl border ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {generatedOutput}
            </pre>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {surgeryPhotos.map((img, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-center ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-[#0D3131] to-[#08151E] flex flex-col items-center justify-center text-[#00D296] mb-2 border border-teal-500/20 overflow-hidden">
                    {img.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <UltrasoundIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold">{img.label}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] font-bold truncate">{img.name}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              ← Voltar ao Início
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {downloadLinks.docxUrl && (
                <a
                  href={downloadLinks.docxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" /> Baixar Relatório em Word (.docx)
                </a>
              )}

              {downloadLinks.pdfUrl && (
                <a
                  href={downloadLinks.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar Relatório em PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Biblioteca de Modelos Cirúrgicos Padronizados */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border space-y-4 ${
          darkMode ? 'bg-[#0F1C26] border-[#1E3545]' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#00D296]" />
              <h3 className="text-base font-extrabold">
                Modelos Cirúrgicos Padronizados
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#00D296]/15 text-[#00D296]">
                {modelos.length} modelo(s)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Modelos institucionais da plataforma e seus modelos personalizados para
              estruturação automática pela IA.
            </p>
          </div>

          {podeEmitir && (
            <button
              type="button"
              onClick={() => {
                setModeloSelecionado(null);
                setModalMode('form');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Modelo Cirúrgico</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'globais', label: '🌐 Institucionais' },
              { id: 'meus', label: '🔒 Meus Modelos' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroOrigem(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  filtroOrigem === f.id
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : darkMode
                    ? 'bg-[#0A141D] text-slate-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={buscaModelo}
              onChange={(e) => setBuscaModelo(e.target.value)}
              placeholder="Buscar por procedimento, sinônimo ou palavra-chave..."
              className={`w-full pl-8 pr-4 py-1.5 text-xs rounded-xl border font-semibold ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800 text-white'
                  : 'bg-slate-50 border-slate-200 text-[#0A141D]'
              }`}
            />
          </div>
        </div>

        {modelosFiltrados.length === 0 ? (
          <div
            className={`py-8 text-center rounded-xl border border-dashed text-xs text-slate-400 ${
              darkMode ? 'border-slate-800 bg-[#0A141D]/50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            Nenhum modelo cirúrgico encontrado para este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
            {modelosFiltrados.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-800 hover:border-[#00D296]/50'
                    : 'bg-slate-50/70 border-slate-200 hover:border-[#0D5C56]/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-xs font-extrabold truncate">{m.nome}</h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        m.isGlobal
                          ? 'bg-[#00D296]/15 text-[#00D296]'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}
                    >
                      {m.isGlobal ? '🌐 Institucional' : '🔒 Meu Modelo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#00D296] font-bold mb-2 truncate">
                    {m.procedimento || m.nome}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {(m.descricaoProcedimento || '').substring(0, 130)}...
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/30">
                  <button
                    type="button"
                    onClick={() => {
                      setModeloSelecionado(m);
                      setModalMode('view');
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#00D296] hover:bg-[#00D296]/10 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalhes
                  </button>
                  {podeEmitir && m.isGlobal && (
                    <button
                      type="button"
                      onClick={() => handleClonarModelo(m.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicar
                    </button>
                  )}
                  {podeEmitir && (!m.isGlobal || userProfile.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        setModeloSelecionado(m);
                        setModalMode('form');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400 hover:bg-amber-500/10"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModeloCirurgicoModal
        darkMode={darkMode}
        mode={modalMode}
        modelo={modeloSelecionado}
        canEdit={
          podeEmitir &&
          modeloSelecionado &&
          (!modeloSelecionado.isGlobal || userProfile.role === 'admin')
        }
        onClose={() => setModalMode(null)}
        onSaved={carregarModelos}
        onSwitchToEdit={(mod) => {
          setModeloSelecionado(mod);
          setModalMode('form');
        }}
        onToast={onToast}
      />
    </div>
  );
}

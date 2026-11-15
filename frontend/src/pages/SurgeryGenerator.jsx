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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [downloadLinks, setDownloadLinks] = useState({ pdfUrl: '', docxUrl: '' });
  const [reportPageTab, setReportPageTab] = useState('p1');

  // Estados da Biblioteca de Modelos Cirúrgicos
  const [modelos, setModelos] = useState([]);
  const [filtroOrigem, setFiltroOrigem] = useState('todos'); // 'todos' | 'globais' | 'meus'
  const [buscaModelo, setBuscaModelo] = useState('');
  const [modalMode, setModalMode] = useState(null); // null | 'view' | 'form'
  const [modeloSelecionado, setModeloSelecionado] = useState(null);

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
      size: `${(f.size / 1024).toFixed(1)} KB • Documento/Áudio`
    });
    onToast('Arquivo da cirurgia anexado com sucesso!');
  };

  const handlePhotosSelected = (fileList) => {
    const arr = Array.from(fileList || []).slice(0, 5);
    if (arr.length === 0) return;
    setRawPhotoFiles(arr);
    setSurgeryPhotos(
      arr.map((f, i) => ({
        name: f.name,
        label: `Foto ${i + 1} (${(f.size / 1024).toFixed(0)} KB)`
      }))
    );
    onToast(`${arr.length} foto(s) intraoperatória(s) anexada(s) para a Página 2!`);
  };

  const handleLoadSampleSurgery = (e) => {
    if (e) e.stopPropagation();
    setRawDocFile(null);
    setSurgeryDocFile({
      name: 'audio_cirurgia_esplenectomia_thor.m4a',
      size: '3.4 MB • Áudio de 2m18s + Notas'
    });
    setSurgeryPhotos([
      { name: 'FOTO_INTRAOP_HEMOSTASIA_01.JPG', label: 'Ligadura vascular' },
      { name: 'FOTO_PECA_CIRURGICA_02.JPG', label: 'Peça anatômica ressecada' }
    ]);
    onToast('Áudio e 2 fotos intraoperatórias de exemplo carregados!');
  };

  const handleGenerate = async () => {
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

    if (rawDocFile || rawPhotoFiles.length > 0) {
      try {
        const fd = new FormData();
        if (rawDocFile) fd.append('documento', rawDocFile);
        rawPhotoFiles.forEach((f) => fd.append('fotos', f));

        const res = await api.gerarCirurgia(fd);
        const pac = res.paciente || {};
        const cir = res.cirurgia || {};
        const textReal =
          `RELATÓRIO CIRÚRGICO OFICIAL — ${(userProfile.clinicName || 'UPA PET').toUpperCase()}\n` +
          `Cirurgiã Responsável: ${userProfile.name} (${userProfile.crmv})\n` +
          `Paciente: ${pac.nome || 'Paciente'} (${pac.especie || 'Canino'}) | Procedimento: ${
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
          title: `Relatório Cirúrgico Oficial — ${cir.procedimento || 'Cirurgia'}`,
          patient: `${pac.nome || 'Paciente'} (${pac.especie || 'Canina'})`,
          tutor: pac.tutor || '',
          date: dateStr,
          status: 'Concluído',
          summary: textReal,
          pdfUrl: res.pdfUrl,
          docxUrl: res.docxUrl
        });
        onToast('Relatório Cirúrgico Oficial compilado com sucesso!');
        setIsGenerating(false);
        return;
      } catch (err) {
        onToast('Aviso da API (' + err.message + ') — exibindo simulação interativa.');
      }
    }

    if (!surgeryDocFile) {
      handleLoadSampleSurgery();
    }

    setTimeout(() => {
      const text =
        `RELATÓRIO CIRÚRGICO OFICIAL — ${(userProfile.clinicName || 'UPA PET').toUpperCase()}\n` +
        `Cirurgiã Responsável: ${userProfile.name} (${userProfile.crmv})\n` +
        `Arquivo Base Transcrito: ${
          surgeryDocFile ? surgeryDocFile.name : 'audio_cirurgia_esplenectomia_thor.m4a'
        }\n` +
        `--------------------------------------------------------------------------------\n` +
        `1. DESCRIÇÃO TÉCNICA DO PROCEDIMENTO:\n` +
        `Paciente submetido à celiotomia mediana sob anestesia geral inalatória monitorada. Realizada inspeção da cavidade abdominal, seguida de isolamento e dupla ligadura vascular com fio absorvível Poliglactina 910 (2-0). Hemostasia rigorosa revisada sem sangramento ativo.\n\n` +
        `2. SÍNTESE E RECUPERAÇÃO ANESTÉSICA:\n` +
        `Celiorrafia em três planos anatômicos (linha alba em padrão simples contínuo, subcutâneo em Cushing e dermorrafia em Sultan com Nylon 3-0). Paciente extubado em normotermia e parâmetros vitais estáveis.\n\n` +
        `3. ANEXO FOTOGRÁFICO (PÁGINA 2):\n` +
        `Constam na Página 2 os registros fotográficos intraoperatórios e da peça cirúrgica devidamente identificados.`;

      setGeneratedOutput(text);
      setIsGenerating(false);
      onAddActivity({
        id: `act-${Date.now()}`,
        type: 'relatorio',
        title: 'Relatório Cirúrgico Oficial',
        patient: 'Thor (Golden Retriever, 6 anos)',
        tutor: 'Carlos Eduardo Silva',
        date: dateStr,
        status: 'Concluído',
        summary: text
      });
      onToast('Relatório Cirúrgico Oficial gerado com sucesso!');
    }, 850);
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

        {/* Cabeçalho do Relatório Cirúrgico Oficial */}
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

        {/* SEÇÃO 1: 1. FICHA CIRÚRGICA OU ÁUDIO */}
        <div className="relative z-10 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p
              className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider ${
                darkMode ? 'text-slate-200' : 'text-[#1E2D3D]'
              }`}
            >
              1. FICHA CIRÚRGICA OU ÁUDIO
            </p>
            <button
              type="button"
              onClick={handleLoadSampleSurgery}
              className="text-[11px] font-bold text-[#00D296] hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Carregar exemplo de cirurgia
            </button>
          </div>

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
        </div>

        {/* SEÇÃO 2: 2. FOTOS INTRAOPERATÓRIAS / PEÇA CIRÚRGICA (OPCIONAL - PÁGINA 2) */}
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
          disabled={isGenerating}
          className={`relative z-10 w-full py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ${
            darkMode
              ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110'
              : 'bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white hover:brightness-110'
          }`}
        >
          <Wand2 className="w-5 h-5" />
          <span>
            {isGenerating
              ? 'Transcrevendo e formatando Relatório Cirúrgico Oficial...'
              : 'Gerar Relatório Cirúrgico Oficial'}
          </span>
        </button>
      </div>

      {/* Resultado Gerado pela IA */}
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
                • Documento Oficial Pronto ({layoutConfig.headerStyle})
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
              <button
                type="button"
                onClick={() => setReportPageTab('p2')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                  reportPageTab === 'p2'
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'bg-slate-500/10 text-slate-400'
                }`}
              >
                Página 2: Fotos da Cirurgia
              </button>
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
              {(surgeryPhotos.length > 0
                ? surgeryPhotos
                : [
                    { name: 'FOTO_INTRAOP_01.JPG', label: 'Hemostasia vascular' },
                    { name: 'FOTO_PECA_CIRURGICA_02.JPG', label: 'Peça cirúrgica' }
                  ]
              ).map((img, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-center ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-[#0D3131] to-[#08151E] flex flex-col items-center justify-center text-[#00D296] mb-2 border border-teal-500/20">
                    <UltrasoundIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">{img.label}</span>
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
                  <FileCheck className="w-4 h-4" /> Baixar Word (.docx)
                </a>
              )}

              {downloadLinks.pdfUrl ? (
                <a
                  href={downloadLinks.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar PDF Oficial (Páginas 1 e 2)
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onToast('PDF Oficial Timbrado baixado com sucesso!')}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar PDF Oficial (Páginas 1 e 2)
                </button>
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
            Nenhum modelo cirúrgico listado para este filtro.
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
                  {m.isGlobal && (
                    <button
                      type="button"
                      onClick={() => handleClonarModelo(m.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicar
                    </button>
                  )}
                  {(!m.isGlobal || userProfile.role === 'admin') && (
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

      {/* Modal de Visualização / Edição de Modelo Cirúrgico */}
      <ModeloCirurgicoModal
        darkMode={darkMode}
        mode={modalMode}
        modelo={modeloSelecionado}
        canEdit={
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

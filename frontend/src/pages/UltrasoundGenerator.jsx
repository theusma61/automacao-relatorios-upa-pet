import React, { useRef, useState } from 'react';
import {
  User,
  Palette,
  CheckCircle2,
  Wand2,
  Download,
  FileCheck,
  Lock,
  Eye
} from 'lucide-react';
import {
  VetaroLogo,
  UltrasoundIcon,
  CardWaveBackground,
  CloudUploadVetaroIcon
} from '../components/icons/VetaroIcons';
import LayoutEditorDrawer from '../components/modals/LayoutEditorDrawer';
import ReportPreviewModal from '../components/modals/ReportPreviewModal';
import { api } from '../services/api';

export default function UltrasoundGenerator({
  darkMode,
  userProfile,
  layoutConfig,
  setLayoutConfig,
  onOpenProfile,
  onNavigateHome,
  onAddActivity,
  onToast
}) {
  const fileInputRef = useRef(null);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [mindrayFiles, setMindrayFiles] = useState([]);
  const [rawFiles, setRawFiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [downloadLinks, setDownloadLinks] = useState({ pdfUrl: '', docxUrl: '' });
  const [reportPageTab, setReportPageTab] = useState('p1');
  const [reportParaEdicao, setReportParaEdicao] = useState(null);
  const [previewModalAberto, setPreviewModalAberto] = useState(false);

  const podeEmitir =
    userProfile?.podeGerarLaudos ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'veterinario';

  const handleFilesSelected = (fileList) => {
    const arr = Array.from(fileList || []).slice(0, 25);
    if (arr.length === 0) return;
    setRawFiles(arr);
    setMindrayFiles(
      arr.map((f) => ({
        name: f.name,
        measure: `${(f.size / 1024).toFixed(0)} KB`,
        previewUrl: URL.createObjectURL(f)
      }))
    );
    onToast(`${arr.length} imagem(ns) selecionada(s) para análise!`);
  };

  const handleGenerate = async () => {
    if (!podeEmitir) {
      onToast('Sua conta não possui permissão para gerar laudos.');
      return;
    }
    if (rawFiles.length === 0) {
      onToast('Selecione pelo menos uma captura de ultrassom antes de gerar o laudo.');
      if (fileInputRef.current) fileInputRef.current.click();
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
      rawFiles.forEach((f) => fd.append('imagens', f));
      const res = await api.gerarUltrassom(fd);
      const pac = res.paciente || {};
      const resumoReal =
        `LAUDO OFICIAL DE ULTRASSONOGRAFIA ABDOMINAL\n` +
        `Paciente: ${pac.nome || 'Não identificado'} (${pac.especie || 'Canina'}${
          pac.idade ? `, ${pac.idade}` : ''
        }) | Tutor: ${pac.tutor || 'Não informado'}\n` +
        `Responsável Técnico: ${userProfile.name} (${userProfile.crmv}) — ${userProfile.clinicName}\n` +
        `--------------------------------------------------------------------------------\n` +
        `Laudo oficial em PDF e Word (.docx) compilado com sucesso a partir de ${rawFiles.length} captura(s) do aparelho.`;

      setGeneratedOutput(resumoReal);
      setDownloadLinks({ pdfUrl: res.pdfUrl || '', docxUrl: res.docxUrl || '' });
      const novoRelatorio = {
        id: `ultra-${Date.now()}`,
        jobId: res.jobId,
        type: 'ultrassom',
        title: 'Laudo de Ultrassom',
        patient: `${pac.nome || 'Paciente'} (${pac.especie || 'Canina'})`,
        tutor: pac.tutor || '',
        date: dateStr,
        status: 'Concluído',
        summary: resumoReal,
        pdfUrl: res.pdfUrl,
        docxUrl: res.docxUrl,
        paciente: res.paciente,
        laudo: res.laudo
      };
      setReportParaEdicao(novoRelatorio);
      onAddActivity(novoRelatorio);
      onToast('Laudo Oficial de Ultrassom gerado com sucesso!');
    } catch (err) {
      onToast('Erro ao processar ultrassom: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

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
              Laudo de Ultrassonografia Abdominal
            </h2>
            <p
              className={`text-xs sm:text-sm mt-1 max-w-xl leading-relaxed ${
                darkMode ? 'text-slate-300' : 'text-[#52657A]'
              }`}
            >
              Envie as capturas de tela do Mindray com calipers e identificações para análise
              automática.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition shadow-xs bg-[#E3FAF2] text-[#0D5C56] border-[#00D296]/40 hover:bg-[#ccf5e7]"
            >
              <User className="w-4 h-4 text-[#00A878] shrink-0" />
              <span className="leading-tight text-left">
                Meu Perfil /<br className="hidden sm:inline" /> Marca
              </span>
            </button>

            {podeEmitir && (
              <button
                type="button"
                onClick={() => setLayoutEditorOpen(!layoutEditorOpen)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition shadow-xs ${
                  darkMode
                    ? 'bg-[#EBF4FA] text-[#173A56] border-slate-300 hover:bg-white'
                    : 'bg-[#F1F6FA] text-[#173A56] border-slate-300 hover:bg-slate-200/70'
                }`}
              >
                <Palette className="w-4 h-4 text-[#0D5C56] shrink-0" />
                <span className="leading-tight text-left">
                  Editor de<br className="hidden sm:inline" /> Layout
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Gaveta / Editor A4 do Layout conectado ao PostgreSQL */}
        <LayoutEditorDrawer
          darkMode={darkMode}
          isOpen={layoutEditorOpen}
          onClose={() => setLayoutEditorOpen(false)}
          layoutConfig={layoutConfig}
          setLayoutConfig={setLayoutConfig}
          userProfile={userProfile}
          onToast={onToast}
        />

        {/* Input Oculto para Fotos Reais */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {/* Dropzone Tracejada */}
        <div
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
          className={`relative z-10 rounded-2xl border-2 border-dashed py-10 px-6 text-center cursor-pointer transition group ${
            darkMode
              ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]'
              : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]'
          }`}
        >
          <div className="flex justify-center mb-3">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ${
                darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C7F0E3] text-[#0D5C56]'
              }`}
            >
              <CloudUploadVetaroIcon className="w-11 h-11" />
            </div>
          </div>

          <p className="text-sm sm:text-base font-extrabold">
            Clique para selecionar as fotos ou arraste até aqui
          </p>
          <p
            className={`text-xs mt-1 font-medium ${
              darkMode ? 'text-slate-300/80' : 'text-[#52657A]'
            }`}
          >
            Formatos aceitos: JPG, PNG, WEBP (até 25 fotos por exame)
          </p>

          {mindrayFiles.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-5 pt-4 border-t border-teal-500/20 flex flex-wrap items-center justify-center gap-2"
            >
              {mindrayFiles.map((file, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ${
                    darkMode
                      ? 'bg-[#0B1822] border-[#00D296]/40 text-[#00D296]'
                      : 'bg-white border-[#0D5C56]/30 text-[#0D5C56]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{file.name}</span>
                  <span className="opacity-75 text-[10px]">({file.measure})</span>
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMindrayFiles([]);
                  setRawFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-[11px] font-bold underline text-rose-400 ml-2"
              >
                Limpar fotos
              </button>
            </div>
          )}
        </div>

        {/* Botão Largo Principal */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !podeEmitir}
          className={`relative z-10 w-full mt-5 py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ${
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
              <span>Geração de Laudo Bloqueada (Sem Permissão)</span>
            </>
          ) : (
            <>
              <Wand2 className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? 'Analisando capturas do Mindray com IA e compilando PDF/DOCX (15-30s)...'
                  : 'Gerar Laudo Oficial com IA'}
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
                • Laudo Gerado com Sucesso!
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
                Página 1: Resumo do Exame
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
                Página 2: Imagens Enviadas ({mindrayFiles.length})
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
              {mindrayFiles.map((img, i) => (
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
                        <span className="text-[10px] font-bold">{img.measure}</span>
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
              {reportParaEdicao && (
                <button
                  type="button"
                  onClick={() => setPreviewModalAberto(true)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] flex items-center gap-1.5 shadow-md hover:brightness-110"
                >
                  <Eye className="w-4 h-4" />
                  <span>Pré-Visualizar & Editar Laudo</span>
                </button>
              )}

              {downloadLinks.docxUrl && (
                <a
                  href={downloadLinks.docxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold border border-[#00D296]/40 text-[#00D296] flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" /> Baixar Laudo em Word (.docx)
                </a>
              )}

              {downloadLinks.pdfUrl && (
                <a
                  href={downloadLinks.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar Laudo em PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pré-Visualização e Edição de Texto / Órgãos */}
      {previewModalAberto && reportParaEdicao && (
        <ReportPreviewModal
          report={reportParaEdicao}
          darkMode={darkMode}
          onClose={() => setPreviewModalAberto(false)}
          onToast={onToast}
          onUpdateReport={(updated) => {
            setReportParaEdicao(updated);
            setDownloadLinks({ pdfUrl: updated.pdfUrl, docxUrl: updated.docxUrl });
            if (updated.paciente) {
              const pac = updated.paciente;
              setGeneratedOutput(
                `LAUDO OFICIAL DE ULTRASSONOGRAFIA ABDOMINAL (ATUALIZADO)\n` +
                `Paciente: ${pac.nome || 'Paciente'} (${pac.especie || 'Canina'}${pac.idade ? `, ${pac.idade}` : ''}) | Tutor: ${pac.tutor || 'Não informado'}\n` +
                `Responsável Técnico: ${userProfile.name} (${userProfile.crmv}) — ${userProfile.clinicName}\n` +
                `--------------------------------------------------------------------------------\n` +
                `Laudo oficial atualizado e recompilado com ${updated.laudo?.length || 0} órgão(s) avaliados.`
              );
            }
          }}
        />
      )}
    </div>
  );
}

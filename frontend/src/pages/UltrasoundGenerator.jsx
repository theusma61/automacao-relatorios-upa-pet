import React, { useRef, useState, useEffect } from 'react';
import {
  User,
  Palette,
  CheckCircle2,
  Wand2,
  Download,
  FileCheck,
  Lock,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Zap
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
  const [cotaInfo, setCotaInfo] = useState(null);
  const [carregandoCota, setCarregandoCota] = useState(true);

  const carregarStatusCota = async () => {
    try {
      const res = await api.getStatusCota();
      if (res && res.sucesso) {
        setCotaInfo(res);
      }
    } catch (err) {
      console.warn('Não foi possível obter status da cota:', err);
    } finally {
      setCarregandoCota(false);
    }
  };

  useEffect(() => {
    carregarStatusCota();
  }, []);

  const isCotaBloqueada = cotaInfo?.bloqueado === true;

  const podeEmitir =
    userProfile?.podeGerarLaudos ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'veterinario';

  const handleFilesSelected = (fileList) => {
    if (isCotaBloqueada) {
      onToast('Limite de cota mensal atingido. Faça upgrade do plano para enviar novas imagens.');
      return;
    }
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
    if (isCotaBloqueada) {
      onToast('Limite de cota mensal atingido. Faça upgrade do seu plano para gerar laudos.');
      return;
    }
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
      carregarStatusCota();
    } catch (err) {
      if (err.codigo === 'COTA_ATINGIDA' || err.message?.includes('cota')) {
        carregarStatusCota();
      }
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

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {cotaInfo && (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                  cotaInfo.admin
                    ? darkMode
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : isCotaBloqueada
                    ? darkMode
                      ? 'bg-rose-950/50 border-rose-500/50 text-rose-300 animate-pulse'
                      : 'bg-rose-50 border-rose-300 text-rose-700'
                    : darkMode
                    ? 'bg-[#142634] border-[#2A445A] text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title={
                  cotaInfo.admin
                    ? 'Acesso Administrativo: Cota ilimitada'
                    : `Cota mensal: ${cotaInfo.consumido}/${cotaInfo.limite} laudos utilizados`
                }
              >
                {cotaInfo.admin ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cota: Ilimitada (Admin)</span>
                  </>
                ) : isCotaBloqueada ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Cota Esgotada ({cotaInfo.consumido}/{cotaInfo.limite})</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Cota: {cotaInfo.disponivel} restante(s)</span>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenProfile('perfil')}
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

        {/* Banner de Aviso de Cota Esgotada */}
        {isCotaBloqueada && (
          <div
            className={`relative z-10 mb-5 p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-md ${
              darkMode
                ? 'bg-rose-950/40 border-rose-500/50 text-white'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  darkMode ? 'bg-rose-900/60 text-rose-300' : 'bg-rose-100 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                  <span>Limite de Cota Mensal Atingido</span>
                  {cotaInfo && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {cotaInfo.consumido}/{cotaInfo.limite} laudos
                    </span>
                  )}
                </h4>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    darkMode ? 'text-rose-200/80' : 'text-rose-700'
                  }`}
                >
                  {cotaInfo?.motivo ||
                    'Você atingiu o limite mensal do seu plano. Para emitir novos laudos oficiais de ultrassom, faça upgrade agora.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenProfile('assinatura')}
              className="px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shrink-0 transition bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md hover:scale-[1.02]"
            >
              <span>Fazer Upgrade do Plano</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}

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
          onClick={() => {
            if (isCotaBloqueada) {
              onToast('Limite de cota mensal atingido. Faça upgrade do plano na aba Assinatura.');
              return;
            }
            if (fileInputRef.current) fileInputRef.current.click();
          }}
          onDragOver={(e) => {
            if (!isCotaBloqueada) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (isCotaBloqueada) {
              onToast('Limite de cota atingido. Faça upgrade do plano para enviar novas imagens.');
              return;
            }
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
          className={`relative z-10 rounded-2xl border-2 border-dashed py-10 px-6 text-center transition group ${
            isCotaBloqueada
              ? darkMode
                ? 'bg-rose-950/20 border-rose-800/40 opacity-75 cursor-not-allowed'
                : 'bg-rose-50/50 border-rose-300/60 opacity-80 cursor-not-allowed'
              : darkMode
              ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936] cursor-pointer'
              : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC] cursor-pointer'
          }`}
        >
          <div className="flex justify-center mb-3">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ${
                isCotaBloqueada
                  ? darkMode
                    ? 'bg-rose-900/40 text-rose-400'
                    : 'bg-rose-100 text-rose-600'
                  : darkMode
                  ? 'bg-[#0E3A38] text-[#00D296]'
                  : 'bg-[#C7F0E3] text-[#0D5C56]'
              }`}
            >
              {isCotaBloqueada ? (
                <Lock className="w-10 h-10" />
              ) : (
                <CloudUploadVetaroIcon className="w-11 h-11" />
              )}
            </div>
          </div>

          <p className="text-sm sm:text-base font-extrabold">
            {isCotaBloqueada
              ? 'Envio de Imagens Bloqueado por Limite de Cota'
              : 'Clique para selecionar as fotos ou arraste até aqui'}
          </p>
          <p
            className={`text-xs mt-1 font-medium ${
              darkMode ? 'text-slate-300/80' : 'text-[#52657A]'
            }`}
          >
            {isCotaBloqueada
              ? 'Faça upgrade do seu plano para liberar novas análises e laudos oficiais'
              : 'Formatos aceitos: JPG, PNG, WEBP (até 25 fotos por exame)'}
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
          disabled={isGenerating || !podeEmitir || isCotaBloqueada}
          className={`relative z-10 w-full mt-5 py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ${
            !podeEmitir
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : isCotaBloqueada
              ? darkMode
                ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300 cursor-not-allowed'
                : 'bg-rose-100 border border-rose-300 text-rose-700 cursor-not-allowed'
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
          ) : isCotaBloqueada ? (
            <>
              <Lock className="w-5 h-5 text-rose-400" />
              <span>
                🔒 Limite de Cota Atingido ({cotaInfo?.consumido}/{cotaInfo?.limite} laudos) — Faça Upgrade
              </span>
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

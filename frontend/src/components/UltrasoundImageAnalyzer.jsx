import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SunMedium,
  Contrast,
  AlertTriangle,
  ScanSearch
} from 'lucide-react';

function normalizarTextoOrgao(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAPA_SINONIMOS_SIGLA = {
  BEX: ['BEXIGA', 'VESICULA URINARIA'],
  SED: ['BEXIGA', 'VESICULA URINARIA'],
  RE: ['RIM ESQUERDO', 'RINS', 'RIM'],
  RD: ['RIM DIREITO', 'RINS', 'RIM'],
  FIG: ['FIGADO'],
  VB: ['VESICULA BILIAR'],
  BACO: ['BACO'],
  EST: ['ESTOMAGO'],
  DUO: ['ALCAS INTESTINAIS', 'DUODENO', 'TRATO GASTROINTESTINAL', 'INTESTINO'],
  JJ: ['ALCAS INTESTINAIS', 'JEJUNO', 'TRATO GASTROINTESTINAL', 'INTESTINO'],
  CD: ['ALCAS INTESTINAIS', 'COLON', 'TRATO GASTROINTESTINAL', 'INTESTINO'],
  AE: ['GLANDULA ADRENAL', 'ADRENAL ESQUERDA', 'ADRENAIS'],
  AD: ['GLANDULA ADRENAL', 'ADRENAL DIREITA', 'ADRENAIS'],
  UTERO: ['UTERO'],
  OE: ['OVARIOS', 'OVARIO ESQUERDO'],
  OD: ['OVARIOS', 'OVARIO DIREITO'],
  PROST: ['PROSTATA'],
  TE: ['TESTICULOS', 'TESTICULO ESQUERDO'],
  TD: ['TESTICULOS', 'TESTICULO DIREITO'],
  PTT: ['PROSTATA', 'TESTICULOS'],
  PANC: ['PANCREAS'],
  LL: ['LINFONODOS', 'CAVIDADE ABDOMINAL']
};

export function resolverIndiceOrgaoParaImagem(imgMeta, laudoForm = []) {
  if (!imgMeta || !Array.isArray(laudoForm) || laudoForm.length === 0) return -1;

  const orgaoImg = normalizarTextoOrgao(imgMeta.orgao || '');
  const siglaImg = normalizarTextoOrgao(imgMeta.sigla || '');

  const candidatos = [];
  if (orgaoImg) candidatos.push(orgaoImg);
  if (siglaImg && MAPA_SINONIMOS_SIGLA[siglaImg]) {
    candidatos.push(...MAPA_SINONIMOS_SIGLA[siglaImg]);
  }
  if (orgaoImg.includes('RIM')) {
    candidatos.push('RINS');
  }
  if (orgaoImg.includes('ADRENAL')) {
    candidatos.push('GLANDULA ADRENAL', 'ADRENAIS');
  }
  if (orgaoImg.includes('INTESTIN') || orgaoImg.includes('DUODENO') || orgaoImg.includes('JEJUNO') || orgaoImg.includes('COLON')) {
    candidatos.push('ALCAS INTESTINAIS', 'TRATO GASTROINTESTINAL');
  }

  if (candidatos.length === 0) return -1;

  const orgaosNorm = laudoForm.map((it) => normalizarTextoOrgao(it?.orgao || ''));

  // 1. Match exato
  for (const cand of candidatos) {
    const idx = orgaosNorm.findIndex((o) => o === cand);
    if (idx !== -1) return idx;
  }

  // 2. Match por inclusão (ex: "RIM ESQUERDO" em "RINS" ou "BEXIGA URINARIA" em "BEXIGA")
  for (const cand of candidatos) {
    const idx = orgaosNorm.findIndex((o) => o && (o.includes(cand) || cand.includes(o)));
    if (idx !== -1) return idx;
  }

  return -1;
}

export function resolverIndiceImagemParaOrgao(orgaoNome, imagens = []) {
  if (!orgaoNome || !Array.isArray(imagens) || imagens.length === 0) return -1;
  const alvo = normalizarTextoOrgao(orgaoNome);
  if (!alvo) return -1;

  for (let i = 0; i < imagens.length; i += 1) {
    const idxMatch = resolverIndiceOrgaoParaImagem(imagens[i], [{ orgao: orgaoNome }]);
    if (idxMatch === 0) return i;
  }
  return -1;
}

export default function UltrasoundImageAnalyzer({
  imagens = [],
  activeIndex = 0,
  onSelectIndex,
  darkMode = true
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panOriginRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showAdjust, setShowAdjust] = useState(false);
  const thumbRefs = useRef({});

  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(0, imagens.length - 1));
  const currentImg = imagens[safeIndex] || null;

  // Reseta zoom/pan ao trocar de foto e centraliza a miniatura ativa
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    const thumbEl = thumbRefs.current[safeIndex];
    if (thumbEl && typeof thumbEl.scrollIntoView === 'function') {
      thumbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [safeIndex]);

  // Navegação por setas do teclado (somente quando não estiver digitando em textarea/input)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft' && safeIndex > 0) {
        e.preventDefault();
        onSelectIndex && onSelectIndex(safeIndex - 1);
      } else if (e.key === 'ArrowRight' && safeIndex < imagens.length - 1) {
        e.preventDefault();
        onSelectIndex && onSelectIndex(safeIndex + 1);
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))));
      } else if (e.key === '-') {
        setZoom((z) => {
          const next = Math.max(1, Number((z - 0.5).toFixed(1)));
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setBrightness(100);
        setContrast(100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex, imagens.length, onSelectIndex]);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
  };

  const handleMouseDownImg = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panOriginRef.current = { x: pan.x, y: pan.y, startX: e.clientX, startY: e.clientY };
  };

  const handleMouseMoveImg = (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panOriginRef.current.startX;
    const dy = e.clientY - panOriginRef.current.startY;
    setPan({ x: panOriginRef.current.x + dx, y: panOriginRef.current.y + dy });
  };

  const handleMouseUpImg = () => {
    if (isPanning) setIsPanning(false);
  };

  if (!currentImg) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center p-6 text-center ${
          darkMode ? 'bg-[#0A141D] text-slate-400' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <ScanSearch className="w-8 h-8 mb-2 opacity-60" />
        <p className="text-xs font-bold">Nenhuma captura de ultrassom disponível para este exame.</p>
      </div>
    );
  }

  const labelOrgao = (currentImg.orgao || currentImg.sigla || '').trim();
  const isAlterado = String(currentImg.statusVisual || '').toUpperCase() === 'ALTERADO';
  const medidas = Array.isArray(currentImg.medidasLidas) ? currentImg.medidasLidas.filter(Boolean) : [];

  return (
    <div
      className={`h-full min-h-0 flex flex-col select-none ${
        darkMode ? 'bg-[#081018] border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}
    >
      {/* Palco Principal da Imagem */}
      <div
        onMouseDown={handleMouseDownImg}
        onMouseMove={handleMouseMoveImg}
        onMouseUp={handleMouseUpImg}
        onMouseLeave={handleMouseUpImg}
        className={`relative flex-1 min-h-0 overflow-hidden flex items-center justify-center bg-[#04090E] ${
          zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {/* Badge superior esquerdo: órgão detectado + contador */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 max-w-[75%]">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#00D296] text-[#052925] shadow-sm">
            {labelOrgao ? `${labelOrgao} • ` : ''}Foto {safeIndex + 1}/{imagens.length}
          </span>
          {isAlterado && (
            <span className="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40 inline-flex items-center gap-1 backdrop-blur-sm">
              <AlertTriangle className="w-3 h-3" />
              <span>Achado alterado</span>
            </span>
          )}
          {medidas.slice(0, 2).map((m, i) => (
            <span
              key={i}
              className="hidden sm:inline-block px-2 py-1 rounded-lg text-[10px] font-mono font-semibold bg-[#0C1720]/85 text-slate-200 border border-slate-700/80 backdrop-blur-sm"
            >
              {m}
            </span>
          ))}
        </div>

        {/* Controles flutuantes superiores direitos */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#0C1720]/90 border border-slate-700/80 backdrop-blur-md p-1 rounded-xl shadow-md">
          <button
            type="button"
            title="Diminuir zoom (-)"
            onClick={() =>
              setZoom((z) => {
                const next = Math.max(1, Number((z - 0.5).toFixed(1)));
                if (next === 1) setPan({ x: 0, y: 0 });
                return next;
              })
            }
            disabled={zoom <= 1}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-200 px-1 min-w-[34px] text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            type="button"
            title="Ampliar zoom (+)"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
            disabled={zoom >= 3}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            title="Ajustar brilho e contraste"
            onClick={() => setShowAdjust((v) => !v)}
            className={`p-1.5 rounded-lg transition ${
              showAdjust || brightness !== 100 || contrast !== 100
                ? 'bg-[#00D296]/20 text-[#00D296]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Contrast className="w-3.5 h-3.5" />
          </button>
          {(zoom !== 1 || brightness !== 100 || contrast !== 100) && (
            <button
              type="button"
              title="Resetar visualização (0)"
              onClick={handleResetView}
              className="p-1.5 rounded-lg text-slate-300 hover:text-[#00D296] hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Popover de brilho e contraste */}
        {showAdjust && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-14 right-3 z-20 w-56 rounded-xl border border-slate-700 bg-[#0C1720]/95 backdrop-blur-md p-3 space-y-2.5 shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1">
                  <SunMedium className="w-3.5 h-3.5 text-[#00D296]" /> Brilho
                </span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={160}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-[#00D296]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Contrast className="w-3.5 h-3.5 text-[#00D296]" /> Contraste
                </span>
                <span>{contrast}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={180}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-[#00D296]"
              />
            </div>
          </div>
        )}

        {/* Setas laterais Anterior / Próxima */}
        {safeIndex > 0 && (
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={(e) => {
              e.stopPropagation();
              onSelectIndex && onSelectIndex(safeIndex - 1);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#0C1720]/85 border border-slate-700 text-slate-200 hover:border-[#00D296] hover:text-[#00D296] flex items-center justify-center transition shadow-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {safeIndex < imagens.length - 1 && (
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={(e) => {
              e.stopPropagation();
              onSelectIndex && onSelectIndex(safeIndex + 1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#0C1720]/85 border border-slate-700 text-slate-200 hover:border-[#00D296] hover:text-[#00D296] flex items-center justify-center transition shadow-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Imagem principal */}
        <img
          src={currentImg.url}
          alt={labelOrgao ? `Ultrassom ${labelOrgao}` : `Captura ${safeIndex + 1}`}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            filter: `brightness(${brightness}%) contrast(${contrast}%)`
          }}
          className="w-full h-full object-contain p-3 sm:p-4 transition-transform duration-150"
        />

        {/* Dica sutil de atalho */}
        <div className="hidden md:block absolute bottom-2.5 right-3 z-10 px-2 py-0.5 rounded-md bg-[#0C1720]/80 text-[10px] font-semibold text-slate-400 border border-slate-800">
          Use ← → para navegar
        </div>
      </div>

      {/* Faixa inferior de miniaturas (Filmstrip) */}
      <div
        className={`shrink-0 border-t px-3 py-2.5 ${
          darkMode ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {imagens.map((img, idx) => {
            const ativo = idx === safeIndex;
            const altFlag = String(img.statusVisual || '').toUpperCase() === 'ALTERADO';
            const tagCurta = (img.sigla || img.orgao || `#${idx + 1}`).slice(0, 10);
            return (
              <button
                key={img.id || idx}
                ref={(el) => {
                  thumbRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => onSelectIndex && onSelectIndex(idx)}
                className={`relative shrink-0 w-24 sm:w-28 aspect-[4/3] rounded-xl overflow-hidden border-2 transition ${
                  ativo
                    ? 'border-[#00D296] ring-2 ring-[#00D296]/30 scale-[1.02]'
                    : darkMode
                    ? 'border-slate-800 opacity-75 hover:opacity-100 hover:border-slate-600'
                    : 'border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-400'
                }`}
              >
                <img
                  src={img.url}
                  alt={tagCurta}
                  loading="lazy"
                  className="w-full h-full object-cover bg-[#04090E]"
                />
                {altFlag && (
                  <span
                    title="Achado alterado"
                    className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#0C1720]"
                  />
                )}
                <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-1.5 py-0.5 text-[10px] font-extrabold text-white truncate text-left">
                  {idx + 1}. {tagCurta}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Scissors,
  Check,
  RotateCcw
} from 'lucide-react';

// Dimensões de exportação em alta resolução (proporção 2.4:1 — encaixe exato no cabeçalho A4)
const EXPORT_WIDTH = 720;
const EXPORT_HEIGHT = 300;
const SAFE_PADDING_RATIO = 0.04;

/**
 * Remove automaticamente bordas brancas/transparentes excessivas de uma imagem carregada,
 * devolvendo um DataURL PNG aparado com leve respiro.
 */
function trimImageWhiteMargins(imgElement, threshold = 246) {
  const w = imgElement.naturalWidth || imgElement.width;
  const h = imgElement.naturalHeight || imgElement.height;
  if (!w || !h) return null;

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imgElement, 0, 0);

  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const isTransparent = a < 18;
      const isNearWhite = r >= threshold && g >= threshold && b >= threshold;
      if (!isTransparent && !isNearWhite) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const pad = Math.max(4, Math.round(Math.min(w, h) * 0.015));
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const octx = out.getContext('2d');
  octx.drawImage(off, sx, sy, sw, sh, 0, 0, sw, sh);
  return out.toDataURL('image/png');
}

export default function LogoCropEditorModal({
  isOpen,
  imageSrc,
  originalFileName = 'logo_clinica.png',
  clinicName = 'Sua Clínica',
  darkMode = true,
  onCancel,
  onConfirm
}) {
  const [activeSrc, setActiveSrc] = useState(imageSrc || '');
  const [imgObj, setImgObj] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [zoom, setZoom] = useState(1); // 1 = encaixar inteira na área segura
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // deslocamento em coordenadas do canvas de exportação
  const [transparentBg, setTransparentBg] = useState(true);
  const [isTrimmed, setIsTrimmed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, startX: 0, startY: 0 });
  const canvasRef = useRef(null);
  const previewThumbRef = useRef(null);

  useEffect(() => {
    if (isOpen && imageSrc) {
      setActiveSrc(imageSrc);
      setIsTrimmed(false);
      setLoadError('');
    }
  }, [isOpen, imageSrc]);

  // Carrega a imagem no elemento Image para desenhar no canvas
  useEffect(() => {
    if (!isOpen || !activeSrc) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      setImgObj(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setLoadError('');
    };
    img.onerror = () => {
      if (cancelled) return;
      setImgObj(null);
      setLoadError('Não foi possível carregar esta imagem para edição. Tente selecionar o arquivo novamente.');
    };
    img.src = activeSrc;
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeSrc]);

  // Calcula dimensões base (zoom = 1) que encaixam 100% da imagem dentro da área segura sem cortar
  const getBaseDrawMetrics = useCallback((img) => {
    if (!img) return { baseW: 0, baseH: 0 };
    const safeW = EXPORT_WIDTH * (1 - SAFE_PADDING_RATIO * 2);
    const safeH = EXPORT_HEIGHT * (1 - SAFE_PADDING_RATIO * 2);
    const scale = Math.min(safeW / img.naturalWidth, safeH / img.naturalHeight);
    return {
      baseW: img.naturalWidth * scale,
      baseH: img.naturalHeight * scale
    };
  }, []);

  // Renderiza no canvas principal e na mini-prévia do cabeçalho
  const renderCanvas = useCallback((targetCanvas, includeGuides = false) => {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    const w = targetCanvas.width;
    const h = targetCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!transparentBg) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }

    if (imgObj) {
      const { baseW, baseH } = getBaseDrawMetrics(imgObj);
      const scaleRatio = w / EXPORT_WIDTH;
      const drawW = baseW * zoom * scaleRatio;
      const drawH = baseH * zoom * scaleRatio;
      const cx = w / 2 + offset.x * scaleRatio;
      const cy = h / 2 + offset.y * scaleRatio;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgObj, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    }

    if (includeGuides) {
      const padX = w * SAFE_PADDING_RATIO;
      const padY = h * SAFE_PADDING_RATIO;

      // Retângulo de margem segura
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 210, 150, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(padX, padY, w - padX * 2, h - padY * 2);

      // Eixos centrais sutis
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [imgObj, zoom, offset, transparentBg, getBaseDrawMetrics]);

  useEffect(() => {
    if (!isOpen) return;
    renderCanvas(canvasRef.current, true);
    renderCanvas(previewThumbRef.current, false);
  }, [isOpen, renderCanvas]);

  if (!isOpen) return null;

  // Alinhamento rápido sem cortar a imagem
  const alignLogo = (mode) => {
    if (!imgObj) return;
    const { baseW } = getBaseDrawMetrics(imgObj);
    const drawW = baseW * zoom;
    const safeMarginX = EXPORT_WIDTH * SAFE_PADDING_RATIO;

    if (mode === 'fit') {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } else if (mode === 'center') {
      setOffset({ x: 0, y: 0 });
    } else if (mode === 'left') {
      const targetCenterX = safeMarginX + drawW / 2;
      setOffset((prev) => ({ x: Math.round(targetCenterX - EXPORT_WIDTH / 2), y: prev.y }));
    } else if (mode === 'right') {
      const targetCenterX = EXPORT_WIDTH - safeMarginX - drawW / 2;
      setOffset((prev) => ({ x: Math.round(targetCenterX - EXPORT_WIDTH / 2), y: prev.y }));
    }
  };

  const handleAutoTrim = () => {
    if (!imgObj) return;
    if (isTrimmed) {
      setActiveSrc(imageSrc);
      setIsTrimmed(false);
      return;
    }
    try {
      const trimmedUrl = trimImageWhiteMargins(imgObj);
      if (trimmedUrl) {
        setActiveSrc(trimmedUrl);
        setIsTrimmed(true);
      }
    } catch (_) {
      // Ignora se canvas estiver tainted por CORS
    }
  };

  const handlePointerDown = (e) => {
    if (!imgObj) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: offset.x,
      startY: offset.y
    };
  };

  const handlePointerMove = (e) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = EXPORT_WIDTH / Math.max(1, rect.width);
    const scaleY = EXPORT_HEIGHT / Math.max(1, rect.height);
    const dx = (e.clientX - dragStartRef.current.pointerX) * scaleX;
    const dy = (e.clientY - dragStartRef.current.pointerY) * scaleY;
    setOffset({
      x: Math.round(dragStartRef.current.startX + dx),
      y: Math.round(dragStartRef.current.startY + dy)
    });
  };

  const handlePointerUp = (e) => {
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      setDragging(false);
    }
  };

  const handleWheel = (e) => {
    if (!imgObj) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.max(0.25, Math.min(2.5, Number((z + delta).toFixed(2)))));
  };

  const handleConfirm = async () => {
    if (!imgObj) return;
    setExporting(true);
    try {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = EXPORT_WIDTH;
      outCanvas.height = EXPORT_HEIGHT;
      renderCanvas(outCanvas, false);

      const blob = await new Promise((resolve) =>
        outCanvas.toBlob((b) => resolve(b), 'image/png', 1.0)
      );
      if (!blob) throw new Error('Falha ao gerar imagem PNG da logo.');

      const baseName = (originalFileName || 'logo_clinica')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalFile = new File([blob], `${baseName}_ajustada.png`, {
        type: 'image/png',
        lastModified: Date.now()
      });
      const previewUrl = URL.createObjectURL(finalFile);
      onConfirm(finalFile, previewUrl);
    } catch (err) {
      setLoadError(err.message || 'Erro ao exportar logotipo ajustado.');
    } finally {
      setExporting(false);
    }
  };

  const btnSecClass = darkMode
    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-[#00D296] hover:text-[#00D296]'
    : 'bg-white border-slate-300 text-slate-700 hover:border-[#0D5C56] hover:text-[#0D5C56]';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto ${
          darkMode ? 'bg-[#0F1C26] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Cabeçalho do Modal */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            darkMode ? 'border-slate-700/80 bg-[#0A141D]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div>
            <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <Move className="w-4 h-4 text-[#00D296]" />
              <span>Ajustar Posição e Enquadramento da Logo</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Arraste e dê zoom para encaixar sua logo inteira no espaço exato do cabeçalho dos relatórios (PDF e Word).
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-4 sm:p-5 space-y-4">
          {loadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {loadError}
            </div>
          )}

          {/* Área de Edição Interativa (Proporção 2.4:1) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold uppercase tracking-wider">Área do Logotipo no Cabeçalho (Arraste para mover)</span>
              <span className="font-mono text-[#00D296] font-bold">{Math.round(zoom * 100)}%</span>
            </div>

            <div
              className="relative w-full rounded-xl overflow-hidden border-2 border-[#00D296]/50 shadow-inner select-none touch-none"
              style={{
                aspectRatio: `${EXPORT_WIDTH} / ${EXPORT_HEIGHT}`,
                backgroundImage: transparentBg
                  ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)'
                  : 'none',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#ffffff'
              }}
            >
              <canvas
                ref={canvasRef}
                width={EXPORT_WIDTH}
                height={EXPORT_HEIGHT}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                className={`w-full h-full block ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              />
            </div>
          </div>

          {/* Controles de Zoom e Alinhamento */}
          <div className="space-y-3">
            {/* Slider de Zoom */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.1).toFixed(2))))}
                className={`p-1.5 rounded-lg border transition ${btnSecClass}`}
                title="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.25"
                max="2.5"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#00D296] cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                className={`p-1.5 rounded-lg border transition ${btnSecClass}`}
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => alignLogo('fit')}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${btnSecClass}`}
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#00D296]" />
                <span>Ajustar Inteira</span>
              </button>

              <button
                type="button"
                onClick={() => alignLogo('left')}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${btnSecClass}`}
                title="Alinhar à esquerda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Esquerda</span>
              </button>

              <button
                type="button"
                onClick={() => alignLogo('center')}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${btnSecClass}`}
                title="Centralizar"
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Centro</span>
              </button>

              <button
                type="button"
                onClick={() => alignLogo('right')}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${btnSecClass}`}
                title="Alinhar à direita"
              >
                <AlignRight className="w-3.5 h-3.5" />
                <span>Direita</span>
              </button>

              <button
                type="button"
                onClick={handleAutoTrim}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                  isTrimmed
                    ? 'bg-[#00D296]/20 border-[#00D296] text-[#00D296]'
                    : btnSecClass
                }`}
                title="Remove automaticamente espaços brancos sobrando nas bordas da imagem"
              >
                {isTrimmed ? <RotateCcw className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5 text-[#00D296]" />}
                <span>{isTrimmed ? 'Desfazer Aparo' : 'Aparar Bordas Brancas'}</span>
              </button>

              <label className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={transparentBg}
                  onChange={(e) => setTransparentBg(e.target.checked)}
                  className="rounded accent-[#00D296]"
                />
                <span>Fundo transparente</span>
              </label>
            </div>
          </div>

          {/* Prévia Real do Cabeçalho do Relatório A4 */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Prévia exata no cabeçalho do relatório (PDF e Word)
            </p>
            <div className="bg-white text-slate-900 rounded-xl border border-slate-300 p-3.5 shadow-sm">
              <div className="grid grid-cols-12 items-center gap-3 pb-2.5 border-b border-slate-200">
                <div className="col-span-4 flex items-center">
                  <canvas
                    ref={previewThumbRef}
                    width={240}
                    height={100}
                    className="w-full max-w-[145px] h-auto object-contain block"
                  />
                </div>
                <div className="col-span-4 text-[10px] sm:text-[11px] leading-snug text-slate-800">
                  <div><strong>Nome:</strong> Brisa</div>
                  <div><strong>Sexo:</strong> Fêmea</div>
                  <div><strong>Idade:</strong> 7 anos</div>
                </div>
                <div className="col-span-4 text-[10px] sm:text-[11px] leading-snug text-slate-800">
                  <div><strong>Responsável:</strong> Erica Viviane</div>
                  <div><strong>Espécie:</strong> Canina</div>
                  <div><strong>Peso:</strong> 33,000 kg</div>
                </div>
              </div>
              <div className="text-center text-[11px] font-extrabold tracking-wide text-slate-900 pt-2 uppercase">
                RELATÓRIO CIRÚRGICO • {clinicName || 'SUA CLÍNICA'}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div
          className={`flex items-center justify-end gap-2.5 px-5 py-3.5 border-t ${
            darkMode ? 'border-slate-700/80 bg-[#0A141D]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl border text-xs font-bold transition ${btnSecClass}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!imgObj || exporting}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-[#00D296] hover:bg-[#00b883] disabled:opacity-50 text-[#062E2B] text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
          >
            <Check className="w-4 h-4" />
            <span>{exporting ? 'Aplicando...' : 'Aplicar Enquadramento'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

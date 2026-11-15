import React, { useState, useEffect } from 'react';
import { Palette, Eye, RotateCcw, Check } from 'lucide-react';
import { api } from '../../services/api';

const DEFAULT_LAYOUT = {
  font_family: 'Calibri, sans-serif',
  font_size_body: '11pt',
  font_size_titulo: '14pt',
  margin_top: '20mm',
  margin_bottom: '20mm',
  margin_left: '15mm',
  margin_right: '15mm',
  line_height: '1.4',
  paragraph_spacing: '8pt',
  cor_primaria: '#1B365D',
  cor_secundaria: '#4A777A'
};

export default function LayoutEditorDrawer({
  darkMode,
  isOpen,
  onClose,
  layoutConfig,
  setLayoutConfig,
  userProfile,
  onToast
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [serverLayout, setServerLayout] = useState(DEFAULT_LAYOUT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && advancedOpen) {
      api
        .getLayoutConfig()
        .then((res) => {
          if (res && res.layout) {
            setServerLayout({ ...DEFAULT_LAYOUT, ...res.layout });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, advancedOpen]);

  if (!isOpen) return null;

  const handleSaveServerLayout = async () => {
    setSaving(true);
    try {
      const res = await api.saveLayoutConfig(serverLayout);
      if (res && res.layout) {
        setServerLayout({ ...DEFAULT_LAYOUT, ...res.layout });
      }
      onToast('Preferências do Editor de Layout salvas no PostgreSQL!');
      setAdvancedOpen(false);
      onClose();
    } catch (err) {
      onToast('Preferências locais aplicadas! (' + err.message + ')');
      setAdvancedOpen(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleResetServerLayout = async () => {
    try {
      const res = await api.resetLayoutConfig();
      if (res && res.layout) {
        setServerLayout({ ...DEFAULT_LAYOUT, ...res.layout });
      } else {
        setServerLayout(DEFAULT_LAYOUT);
      }
      onToast('Padrão institucional restaurado com sucesso!');
    } catch (_) {
      setServerLayout(DEFAULT_LAYOUT);
      onToast('Padrão institucional restaurado!');
    }
  };

  return (
    <div
      className={`relative z-10 mb-5 p-4 rounded-xl border space-y-4 ${
        darkMode
          ? 'bg-[#0A141D]/90 border-[#00D296]/40 text-slate-200'
          : 'bg-[#F0FBF7] border-[#00D296]/40 text-[#0A141D]'
      }`}
    >
      {/* Linha Rápida do Protótipo Vetaro */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-extrabold text-[#00D296] flex items-center gap-1.5">
            <Palette className="w-4 h-4" /> Layout do PDF:
          </span>
          <label className="flex items-center gap-1.5 font-semibold">
            <span>Cabeçalho:</span>
            <select
              value={layoutConfig.headerStyle}
              onChange={(e) =>
                setLayoutConfig({ ...layoutConfig, headerStyle: e.target.value })
              }
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                darkMode
                  ? 'bg-[#12222F] border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-[#0A141D]'
              }`}
            >
              <option>Logotipo + CRMV Centralizado</option>
              <option>Papel Timbrado Minimalista Vetaro</option>
              <option>Duas Colunas (Clínica + Veterinária)</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 font-semibold">
            <span>Grade Página 2:</span>
            <select
              value={layoutConfig.gridColumns}
              onChange={(e) =>
                setLayoutConfig({ ...layoutConfig, gridColumns: e.target.value })
              }
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                darkMode
                  ? 'bg-[#12222F] border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-[#0A141D]'
              }`}
            >
              <option>2 colunas (6 fotos por página)</option>
              <option>3 colunas (9 fotos compactas)</option>
              <option>1 coluna (Imagens ampliadas)</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
              darkMode
                ? 'border-slate-700 bg-[#12222F] text-slate-200 hover:border-[#00D296]'
                : 'border-slate-300 bg-white text-[#0A141D] hover:border-[#0D5C56]'
            }`}
          >
            {advancedOpen ? 'Ocultar Tipografia A4' : 'Tipografia & Preview A4'}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onToast('Preferências do Editor de Layout salvas!');
            }}
            className="px-3 py-1 rounded-lg text-xs font-extrabold bg-[#00D296] text-[#062E2B]"
          >
            Aplicar Layout
          </button>
        </div>
      </div>

      {/* Painel Completo de Tipografia + Preview A4 (Conectado a /api/layout-config) */}
      {advancedOpen && (
        <div
          className={`pt-4 border-t grid grid-cols-1 lg:grid-cols-12 gap-5 ${
            darkMode ? 'border-slate-800' : 'border-teal-500/20'
          }`}
        >
          <div className="lg:col-span-6 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">Fonte Oficial</label>
                <select
                  value={serverLayout.font_family}
                  onChange={(e) =>
                    setServerLayout({ ...serverLayout, font_family: e.target.value })
                  }
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-semibold ${
                    darkMode
                      ? 'bg-[#12222F] border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-[#0A141D]'
                  }`}
                >
                  <option value="Calibri, sans-serif">Calibri (Padrão)</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 opacity-80">Corpo (pt)</label>
                <select
                  value={serverLayout.font_size_body}
                  onChange={(e) =>
                    setServerLayout({ ...serverLayout, font_size_body: e.target.value })
                  }
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-semibold ${
                    darkMode
                      ? 'bg-[#12222F] border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-[#0A141D]'
                  }`}
                >
                  <option value="9.5pt">9.5pt</option>
                  <option value="10pt">10pt</option>
                  <option value="10.5pt">10.5pt</option>
                  <option value="11pt">11pt (Padrão)</option>
                  <option value="11.5pt">11.5pt</option>
                  <option value="12pt">12pt</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 opacity-80">Título (pt)</label>
                <select
                  value={serverLayout.font_size_titulo}
                  onChange={(e) =>
                    setServerLayout({ ...serverLayout, font_size_titulo: e.target.value })
                  }
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-semibold ${
                    darkMode
                      ? 'bg-[#12222F] border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-[#0A141D]'
                  }`}
                >
                  <option value="12pt">12pt</option>
                  <option value="13pt">13pt</option>
                  <option value="14pt">14pt (Padrão)</option>
                  <option value="15pt">15pt</option>
                  <option value="16pt">16pt</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: 'margin_top', label: 'Margem Sup.' },
                { key: 'margin_bottom', label: 'Margem Inf.' },
                { key: 'margin_left', label: 'Margem Esq.' },
                { key: 'margin_right', label: 'Margem Dir.' }
              ].map((m) => (
                <div key={m.key}>
                  <label className="block font-bold mb-1 opacity-80">{m.label}</label>
                  <input
                    type="text"
                    value={serverLayout[m.key]}
                    onChange={(e) =>
                      setServerLayout({ ...serverLayout, [m.key]: e.target.value })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg border font-semibold ${
                      darkMode
                        ? 'bg-[#12222F] border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-[#0A141D]'
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">Cor Primária (Títulos)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={serverLayout.cor_primaria}
                    onChange={(e) =>
                      setServerLayout({
                        ...serverLayout,
                        cor_primaria: e.target.value.toUpperCase()
                      })
                    }
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={serverLayout.cor_primaria}
                    onChange={(e) =>
                      setServerLayout({ ...serverLayout, cor_primaria: e.target.value })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg border font-mono ${
                      darkMode
                        ? 'bg-[#12222F] border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-[#0A141D]'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1 opacity-80">Cor Secundária</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={serverLayout.cor_secundaria}
                    onChange={(e) =>
                      setServerLayout({
                        ...serverLayout,
                        cor_secundaria: e.target.value.toUpperCase()
                      })
                    }
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={serverLayout.cor_secundaria}
                    onChange={(e) =>
                      setServerLayout({ ...serverLayout, cor_secundaria: e.target.value })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg border font-mono ${
                      darkMode
                        ? 'bg-[#12222F] border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-[#0A141D]'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetServerLayout}
                className="text-xs font-bold text-slate-400 hover:text-[#00D296] flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveServerLayout}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Salvando...' : 'Salvar Tipografia no Servidor'}</span>
              </button>
            </div>
          </div>

          {/* Simulação A4 em Tempo Real */}
          <div className="lg:col-span-6">
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="font-bold flex items-center gap-1 text-[#00D296]">
                <Eye className="w-3.5 h-3.5" /> Preview A4 em Tempo Real (Pág. 1)
              </span>
              <span className="opacity-70">{serverLayout.font_family.split(',')[0]}</span>
            </div>
            <div
              style={{ fontFamily: serverLayout.font_family }}
              className="bg-white text-slate-800 rounded-xl p-4 shadow-md border border-slate-300 text-[10px] space-y-2"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span
                  style={{ color: serverLayout.cor_primaria }}
                  className="font-black text-sm tracking-tight"
                >
                  {userProfile.clinicName || 'UPA PET'}
                </span>
                <div className="text-right text-[8px] text-slate-500">
                  <p>
                    <strong>Paciente:</strong> Thor • <strong>Espécie:</strong> Canina
                  </p>
                  <p>
                    <strong>Responsável:</strong> {userProfile.name} ({userProfile.crmv})
                  </p>
                </div>
              </div>
              <div className="text-center py-1">
                <p
                  style={{
                    color: serverLayout.cor_primaria,
                    fontSize: serverLayout.font_size_titulo
                  }}
                  className="font-bold"
                >
                  RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL
                </p>
                <p
                  style={{ color: serverLayout.cor_secundaria }}
                  className="italic text-[8px]"
                >
                  Exame ultrassonográfico abdominal completo em modo B
                </p>
              </div>
              <div
                style={{
                  fontSize: serverLayout.font_size_body,
                  lineHeight: serverLayout.line_height
                }}
                className="space-y-1 text-justify"
              >
                <p>
                  <strong>FÍGADO:</strong> Dimensões normais, parênquima homogêneo e
                  ecogenicidade preservada.
                </p>
                <p>
                  <strong>VESÍCULA BILIAR:</strong> Parede fina (0,12 cm), conteúdo anecogênico.
                </p>
                <p>
                  <strong>IMPRESSÃO DIAGNÓSTICA:</strong> Exame dentro dos padrões de
                  normalidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import {
  Palette,
  Stethoscope,
  Sparkles,
  Type,
  PenTool,
  Layers,
  Building2,
  ArrowUpRight
} from 'lucide-react';
import { UltrasoundIcon } from '../components/icons/VetaroIcons';
import EstiloLaudoTab from '../components/EstiloLaudoTab';
import EstiloCirurgiaTab from '../components/EstiloCirurgiaTab';

export default function MeusPadroesPage({
  darkMode,
  isMobileLayout = false,
  padroesTab = 'ultrassom',
  setPadroesTab,
  userProfile,
  setUserProfile,
  onOpenPerfilMarca,
  onToast
}) {
  const categorias = [
    {
      icon: Building2,
      titulo: 'Identidade & Marca',
      desc: 'Logo, clínica, CRMV e assinatura',
      acao: onOpenPerfilMarca ? 'Editar marca' : null
    },
    {
      icon: Type,
      titulo: 'Tipografia & Cores',
      desc: 'Cabeçalho, corpo, título (até 30pt) e paleta'
    },
    {
      icon: PenTool,
      titulo: 'Assinatura & Rodapé',
      desc: 'Imagem e nome/CRMV independentes + aviso legal'
    },
    {
      icon: Layers,
      titulo: 'Estrutura & Paginação',
      desc: padroesTab === 'ultrassom'
        ? 'Ordem dos órgãos, grade de fotos e quebra de página'
        : 'Rótulos das seções, redação IA e fotos intraoperatórias'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho Unificado do Hub Meus Padrões */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition ${
          darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00D296]/15 text-[#00D296] flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Meus Padrões Visuais
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00D296]/15 text-[#00D296] border border-[#00D296]/30 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Nova Interface
              </span>
            </div>
            <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Centralize a diagramação, tipografia, assinatura e estrutura dos seus documentos com pré-visualização real em PDF.
            </p>
          </div>

          {/* Seletor Segmentado: Ultrassom vs Cirurgia */}
          <div
            className={`p-1.5 rounded-2xl border inline-flex items-center gap-1.5 self-start lg:self-auto ${
              darkMode ? 'bg-[#0A141D] border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setPadroesTab('ultrassom')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                padroesTab === 'ultrassom'
                  ? 'bg-[#00D296] text-[#062E2B] shadow-sm'
                  : darkMode
                  ? 'text-slate-300 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-[#0A141D] hover:bg-white/70'
              }`}
            >
              <UltrasoundIcon className="w-4 h-4" />
              <span>Laudo de Ultrassom</span>
            </button>

            <button
              type="button"
              onClick={() => setPadroesTab('cirurgia')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                padroesTab === 'cirurgia'
                  ? 'bg-[#00D296] text-[#062E2B] shadow-sm'
                  : darkMode
                  ? 'text-slate-300 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-[#0A141D] hover:bg-white/70'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Relatório Cirúrgico</span>
            </button>
          </div>
        </div>

        {/* Faixa de Categorias Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-700/30">
          {categorias.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.titulo}
                className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                  darkMode
                    ? 'bg-[#0A141D]/70 border-slate-800/90'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#00D296]/15 text-[#00D296] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-extrabold truncate">{cat.titulo}</p>
                    {cat.acao && (
                      <button
                        type="button"
                        onClick={onOpenPerfilMarca}
                        className="text-[10px] font-bold text-[#00D296] hover:underline inline-flex items-center gap-0.5 shrink-0"
                      >
                        <span>{cat.acao}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {cat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conteúdo do Padrão Selecionado */}
      {padroesTab === 'ultrassom' ? (
        <EstiloLaudoTab
          darkMode={darkMode}
          isMobileLayout={isMobileLayout}
          onToast={onToast}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />
      ) : (
        <EstiloCirurgiaTab
          darkMode={darkMode}
          isMobileLayout={isMobileLayout}
          onToast={onToast}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />
      )}
    </div>
  );
}

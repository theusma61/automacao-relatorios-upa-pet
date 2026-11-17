import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  ArrowRight,
  HelpCircle,
  ArrowUpRight,
  MoreHorizontal,
  User,
  CreditCard,
  Moon,
  Sun,
  LogOut,
  Upload,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Building2,
  Stethoscope,
  Sliders,
  Palette,
  Smartphone,
  Tablet,
  Monitor,
  Eye,
  ZoomIn,
  ZoomOut,
  FileCheck,
  Wand2
} from 'lucide-react';

// ==========================================
// ÍCONES ADICIONAIS DOS NOVOS GERADORES MINIMALISTAS (NUVEM, ARQUIVO CIRÚRGICO E CÂMERA)
// ==========================================
const CloudUploadVetaroIcon = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M34.5 36H15C9.75 36 5.5 31.85 5.5 26.6C5.5 21.85 9.05 17.9 13.65 17.3C15.5 11.35 21.05 7 27.6 7C35.65 7 42.2 13.55 42.2 21.6C42.2 22.15 42.15 22.7 42.08 23.22C44.72 24.75 46.5 27.6 46.5 30.9C46.5 35.92 42.42 36 37.4 36H34.5Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M24 31V19M24 19L19 24M24 19L29 24"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SurgicalFilePulseIcon = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M28 6H14C11.7909 6 10 7.79086 10 10V38C10 40.2091 11.7909 42 14 42H34C36.2091 42 38 40.2091 38 38V16L28 6Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M28 6V16H38"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 29H18.5L21.5 23L25.5 33L28.5 27H34"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CameraSolidIcon = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M9.4 4.5C8.87 4.5 8.37 4.78 8.1 5.24L7.05 7H4.5C3.12 7 2 8.12 2 9.5V18C2 19.38 3.12 20.5 4.5 20.5H19.5C20.88 20.5 22 19.38 22 18V9.5C22 8.12 20.88 7 19.5 7H16.95L15.9 5.24C15.63 4.78 15.13 4.5 14.6 4.5H9.4ZM12 17C9.79 17 8 15.21 8 13C8 10.79 9.79 9 12 9C14.21 9 16 10.79 16 13C16 15.21 14.21 17 12 17Z" />
  </svg>
);

// ==========================================
// LOGOTIPO VETARO & ÍCONES CUSTOMIZADOS (SVG FIÉIS À FOTO 1)
// ==========================================

const VetaroLogo = ({ size = 32, dark = false, showText = true, textSize = 'text-2xl' }) => (
  <div className="flex items-center gap-2.5 select-none">
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="vetGradL" x1="6" y1="8" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D296" />
          <stop offset="100%" stopColor="#0D5C56" />
        </linearGradient>
        <linearGradient id="vetGradR" x1="42" y1="8" x2="22" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E6A4" />
          <stop offset="100%" stopColor="#097969" />
        </linearGradient>
      </defs>
      <path
        d="M9.5 14.5C7.8 11.3 9.2 7.5 12.6 6.5C15.4 5.7 18.4 7.2 19.7 9.9L26.8 25.2C28.3 28.4 27.1 32.3 24 34C20.8 35.8 16.7 34.5 15 31.3L9.5 14.5Z"
        fill="url(#vetGradL)"
      />
      <path
        d="M38.5 14.5C40.2 11.3 38.8 7.5 35.4 6.5C32.6 5.7 29.6 7.2 28.3 9.9L18.2 31.2C16.7 34.4 17.9 38.3 21 40C24.2 41.8 28.3 40.5 30 37.3L38.5 14.5Z"
        fill="url(#vetGradR)"
      />
    </svg>
    {showText && (
      <span
        className={`font-extrabold tracking-tight ${textSize} ${
          dark ? 'text-white' : 'text-[#0A141D]'
        }`}
      >
        vetaro
      </span>
    )}
  </div>
);

// Ícone de transdutor/ondas de Ultrassom idêntico à referência
const UltrasoundIcon = ({ className = 'w-6 h-6', strokeWidth = 2 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 15.5C6.5 13 9 13 12 15.5C15 18 17.5 18 20 15.5" />
    <path d="M6.5 12C8 9.2 10 8 12 8C14 8 16 9.2 17.5 12" />
    <path d="M3 18.5H21" />
  </svg>
);

// Ícone de Plano e Assinatura (Caixa/Cartão idêntico à 2ª foto)
const PlanBoxIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M3 9.5H21" />
    <path d="M10 14.5H14" />
  </svg>
);

// Ícone Lua + Estrela idêntico ao "Modo claro" da 2ª foto
const MoonStarIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    <path d="M19 3v4" />
    <path d="M21 5h-4" />
  </svg>
);

// Ondas decorativas de fundo dos cards de Ultrassom e Relatório
const CardWaveBackground = ({ dark }) => (
  <svg
    className="absolute right-0 top-0 h-full w-3/4 pointer-events-none select-none overflow-hidden rounded-2xl"
    viewBox="0 0 300 220"
    fill="none"
    preserveAspectRatio="none"
  >
    <circle
      cx="255"
      cy="35"
      r="125"
      fill="#00D296"
      fillOpacity={dark ? '0.07' : '0.13'}
    />
    <circle
      cx="285"
      cy="165"
      r="105"
      stroke={dark ? '#00D296' : '#0D5C56'}
      strokeOpacity={dark ? '0.14' : '0.09'}
      strokeWidth="26"
    />
    <path
      d="M140 -20 C190 60, 260 90, 320 70 L320 240 L120 240 Z"
      fill={dark ? '#0D5C56' : '#00D296'}
      fillOpacity={dark ? '0.12' : '0.08'}
    />
  </svg>
);

// ==========================================
// DADOS INICIAIS DA TABELA (FIÉIS À FOTO 1)
// ==========================================
const INITIAL_ACTIVITIES = [
  {
    id: 'laudo-01',
    type: 'ultrassom',
    title: 'Laudo de Ultrassom',
    patient: 'Thor (Golden Retriever, 6 anos)',
    tutor: 'Carlos Eduardo Silva',
    date: 'Gerado em 14/11/2025 às 16:32',
    status: 'Concluído',
    summary:
      'Ultrassonografia abdominal total (Mindray Vetus 7). Fígado com dimensões preservadas, parênquima homogêneo e ecogenicidade normal. Vesícula biliar moderadamente repleta (parede 0,11 cm), sem lama biliar. Baço e rins sem alterações topográficas ou morfológicas. Impressão diagnóstica: Exame dentro dos padrões de normalidade para a espécie.'
  },
  {
    id: 'rel-02',
    type: 'relatorio',
    title: 'Relatório Cirúrgico Oficial',
    patient: 'Luna (Felino SRD, 3 anos)',
    tutor: 'Beatriz Mendes',
    date: 'Gerado em 13/11/2025 às 11:20',
    status: 'Concluído',
    summary:
      'Relatório Cirúrgico Oficial — Ovariohisterectomia Eletiva + Exérese de Nódulo Cutâneo. Anestesia inalatória com Isofluorano estável. Celiotomia retro-umbilical, ligadura tripla dos pedículos ovarianos e corpo uterino com Poliglactina 910 (3-0). Síntese em três planos. Anexo fotográfico da peça cirúrgica na Página 2.'
  },
  {
    id: 'laudo-03',
    type: 'ultrassom',
    title: 'Laudo de Ultrassom',
    patient: 'Max (Bulldog Francês, 4 anos)',
    tutor: 'Fernanda Costa',
    date: 'Gerado em 12/11/2025 às 09:17',
    status: 'Concluído',
    summary:
      'Avaliação vesical e renal. Bexiga urinária com repleção adequada, parede discretamente espessada (0,38 cm) em região crânio-ventral e presença de moderada quantidade de sedimento ecogênico em suspensão. Impressão diagnóstica: Achados compatíveis com cistite + sedimento urinário.'
  }
];

const BRAND_COLORS = [
  {
    hex: '#00D296',
    name: 'Emerald Vetaro (Primária IA)',
    usage: 'Botões no modo escuro, destaques ativos, ícones e indicadores de IA'
  },
  {
    hex: '#0D5C56',
    name: 'Deep Teal (Institucional)',
    usage: 'Botões no modo claro, gradientes do logo e fundos secundários'
  },
  {
    hex: '#0A141D',
    name: 'Midnight Navy (Dark Background)',
    usage: 'Fundo principal do Modo Escuro e tipografia principal no Modo Claro'
  },
  {
    hex: '#637692',
    name: 'Clinical Slate (Texto Secundário & Avatar)',
    usage: 'Subtítulos, datas na tabela, bordas suaves e fundo do avatar MD'
  },
  {
    hex: '#F8FAFC',
    name: 'Pure Ice (Light Background)',
    usage: 'Fundo principal do Modo Claro, superfícies limpas e cartões'
  }
];

export default function App() {
  // Carrega a fonte oficial Manrope do Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Estados principais de Tema, Dispositivo e Navegação
  const [darkMode, setDarkMode] = useState(true);
  // Dispositivos: 'prancha' | 'desktop' | 'tablet' | 'mobile' | 'specs'
  const [deviceView, setDeviceView] = useState('prancha');
  // Telas internas: 'inicio' | 'ultrassom' | 'relatorio' | 'configuracoes'
  const [activeNav, setActiveNav] = useState('inicio');
  // Sub-abas de Configurações (clicadas no menu MD da 2ª foto): 'perfil' | 'assinatura' | 'preferencias'
  const [settingsTab, setSettingsTab] = useState('perfil');
  // Estado do Menu Dropdown "MD" (2ª foto)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Escala automática para caber na tela do celular sem cortar o Desktop/Tablet
  const [fitToPhone, setFitToPhone] = useState(true);
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 390
  );

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Perfil editável da Dra. Mariana Duarte (2ª Foto)
  const [userProfile, setUserProfile] = useState({
    name: 'Mariana Duarte',
    greetingName: 'Dra. Mariana',
    initials: 'MD',
    email: 'maria@clinica.com.br',
    crmv: 'CRMV-SP 48.291',
    specialty: 'Diagnóstico por Imagem & Ultrassonografia Veterinária',
    clinicName: 'Centro Diagnóstico VetCare',
    phone: '(11) 99812-4500',
    plan: 'Vetaro Pro IA (Ilimitado)',
    aiTone: 'tecnico',
    autoMeasurements: true,
    voiceDictation: true,
    includeHeaderLogo: true
  });

  // Lista de atividades e modal de visualização de laudo
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [selectedReport, setSelectedReport] = useState(null);
  const [copiedHex, setCopiedHex] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Estados dos novos geradores minimalistas (Ultrassom Mindray & Relatório Cirúrgico)
  const [mindrayFiles, setMindrayFiles] = useState([]);
  const [surgeryDocFile, setSurgeryDocFile] = useState(null);
  const [surgeryPhotos, setSurgeryPhotos] = useState([]);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState({
    headerStyle: 'Logotipo + CRMV Centralizado',
    gridColumns: '2 colunas (6 fotos por página)',
    autoCalipers: true
  });
  const [reportPageTab, setReportPageTab] = useState('p1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyHex = (hex) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex);
    }
    setCopiedHex(hex);
    showToast(`Código ${hex} copiado!`);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  // Abre uma das telas do menu da 2ª foto (Meu perfil, Plano e assinatura, Configurações)
  const openFromProfileMenu = (tab, targetDevice = null) => {
    setActiveNav('configuracoes');
    setSettingsTab(tab);
    setProfileMenuOpen(false);
    if (targetDevice) {
      setDeviceView(targetDevice);
    } else if (deviceView === 'prancha' || deviceView === 'specs') {
      setDeviceView('desktop');
    }
    const titles = {
      perfil: 'Meu perfil (Dra. Mariana Duarte)',
      assinatura: 'Plano e assinatura (Vetaro Pro IA)',
      preferencias: 'Configurações do Sistema & IA'
    };
    showToast(`Tela aberta: ${titles[tab]}`);
  };

  // Adiciona capturas simuladas do aparelho Mindray com calipers
  const handleSelectMindrayPhotos = () => {
    const samplePhotos = [
      { name: 'MINDRAY_FIGADO_VESICULA_01.JPG', measure: 'Parede VB: 0,12 cm' },
      { name: 'MINDRAY_BACO_CORPO_02.JPG', measure: 'Espessura: 1,18 cm' },
      { name: 'MINDRAY_RIM_ESQ_CORTICAL_03.JPG', measure: 'Comprimento: 6,42 cm' },
      { name: 'MINDRAY_RIM_DIR_PELVE_04.JPG', measure: 'Comprimento: 6,55 cm' },
      { name: 'MINDRAY_BEXIGA_PAREDE_05.JPG', measure: 'Parede: 0,19 cm' },
      { name: 'MINDRAY_DUODENO_ESTRAT_06.JPG', measure: 'Parede: 0,36 cm' }
    ];
    setMindrayFiles(samplePhotos);
    showToast('6 capturas do Mindray com calipers carregadas para leitura automática!');
  };

  // Adiciona arquivo de ficha cirúrgica ou áudio gravado
  const handleSelectSurgeryFile = () => {
    setSurgeryDocFile({
      name: 'audio_cirurgia_esplenectomia_thor.m4a',
      size: '3.4 MB • Áudio de 2m18s + Notas'
    });
    showToast('Áudio/ficha da cirurgia anexado com sucesso!');
  };

  // Adiciona fotos intraoperatórias / peça cirúrgica (Página 2)
  const handleSelectSurgeryPhotos = () => {
    setSurgeryPhotos([
      { name: 'FOTO_INTRAOP_HEMOSTASIA_01.JPG', label: 'Ligadura vascular' },
      { name: 'FOTO_PECA_CIRURGICA_02.JPG', label: 'Peça anatômica ressecada' }
    ]);
    showToast('2 fotos intraoperatórias anexadas para a Página 2!');
  };

  // Simula a geração de Laudo de Ultrassom (Mindray OCR + Calipers) ou Relatório Cirúrgico Oficial
  const handleGenerateAI = (mode) => {
    setIsGenerating(true);
    setGeneratedOutput('');
    setReportPageTab('p1');

    if (mode === 'ultrassom' && mindrayFiles.length === 0) {
      handleSelectMindrayPhotos();
    }
    if (mode === 'relatorio' && !surgeryDocFile) {
      handleSelectSurgeryFile();
    }

    setTimeout(() => {
      const now = new Date();
      const dateStr = `Gerado em ${String(now.getDate()).padStart(2, '0')}/${String(
        now.getMonth() + 1
      ).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(
        2,
        '0'
      )}:${String(now.getMinutes()).padStart(2, '0')}`;

      const text =
        mode === 'ultrassom'
          ? `LAUDO OFICIAL DE ULTRASSONOGRAFIA ABDOMINAL (LEITURA AUTOMÁTICA MINDRAY)\n` +
            `Paciente: Thor (Canino, Golden Retriever, 6 anos) | Equipamento: Mindray Vetus\n` +
            `Responsável Técnico: ${userProfile.name} (${userProfile.crmv}) — ${userProfile.clinicName}\n` +
            `--------------------------------------------------------------------------------\n` +
            `MEDIDAS EXTRAÍDAS AUTOMATICAMENTE DOS CALIPERS:\n` +
            `• Fígado e Vesícula Biliar: Parênquima homogêneo, normoecogênico. Parede vesicular mensurada em 0,12 cm (normal).\n` +
            `• Baço: Espessura de 1,18 cm em região de corpo, ecotextura finamente granular preservada.\n` +
            `• Rins (Esq / Dir): Dimensões simétricas (RE: 6,42 cm | RD: 6,55 cm), relação corticomedular 1:1 mantida.\n` +
            `• Bexiga Urinária: Repleção moderada, conteúdo anecogênico, parede lisa medindo 0,19 cm.\n` +
            `• Trato Gastrointestinal: Alça duodenal com estratificação preservada (espessura parietal: 0,36 cm).\n\n` +
            `IMPRESSÃO DIAGNÓSTICA OFICIAL (IA VETARO):\n` +
            `Exame ultrassonográfico abdominal dentro dos limites anatômicos da normalidade para a espécie e porte.`
          : `RELATÓRIO CIRÚRGICO OFICIAL — ${userProfile.clinicName.toUpperCase()}\n` +
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

      const newAct = {
        id: `act-${Date.now()}`,
        type: mode,
        title:
          mode === 'ultrassom'
            ? 'Laudo de Ultrassonografia Abdominal'
            : 'Relatório Cirúrgico Oficial',
        patient: 'Thor (Golden Retriever, 6 anos)',
        tutor: 'Carlos Eduardo Silva',
        date: dateStr,
        status: 'Concluído',
        summary: text
      };
      setActivities([newAct, ...activities]);
      showToast(
        mode === 'ultrassom'
          ? 'Laudo Oficial de Ultrassom gerado a partir das capturas do Mindray!'
          : 'Relatório Cirúrgico Oficial gerado com sucesso!'
      );
    }, 950);
  };

  // Cálculo de zoom automático para caber na tela do celular sem cortar nada
  const availableWidth = Math.max(screenWidth - 24, 300);
  const boardZoom = fitToPhone && screenWidth < 1200 ? Math.min(1, availableWidth / 1180) : 1;
  const desktopZoom = fitToPhone && screenWidth < 1160 ? Math.min(1, availableWidth / 1120) : 1;
  const tabletZoom = fitToPhone && screenWidth < 860 ? Math.min(1, availableWidth / 820) : 1;

  // =========================================================
  // COMPONENTE DO MENU DROPDOWN DA 2ª FOTO (MARIANA DUARTE MD)
  // =========================================================
  const renderProfileDropdownCard = (isStandalone = false) => (
    <div
      className={`${
        isStandalone ? 'w-72' : 'absolute right-0 top-14 w-72 z-50'
      } rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        darkMode
          ? 'bg-[#121E28] border-[#243647] text-white shadow-black/80'
          : 'bg-white border-slate-200 text-[#0A141D] shadow-slate-900/20'
      }`}
    >
      {/* Cabeçalho MD + Nome + E-mail */}
      <div className="p-5 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-[#637692] text-white flex items-center justify-center font-bold text-base shrink-0">
          {userProfile.initials}
        </div>
        <div className="min-w-0 text-left">
          <p className="font-bold text-base leading-tight truncate">{userProfile.name}</p>
          <p
            className={`text-xs mt-0.5 truncate ${
              darkMode ? 'text-slate-300/80' : 'text-slate-500'
            }`}
          >
            {userProfile.email}
          </p>
        </div>
      </div>

      <div className={`h-px mx-4 ${darkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />

      {/* 3 Opções clicáveis: Meu perfil, Plano e assinatura, Configurações */}
      <div className="p-2.5 space-y-1">
        <button
          onClick={() => openFromProfileMenu('perfil')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeNav === 'configuracoes' && settingsTab === 'perfil'
              ? 'bg-[#00D296]/15 text-[#00D296]'
              : darkMode
              ? 'text-slate-100 hover:bg-white/5'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-3.5">
            <User className="w-5 h-5 stroke-[1.9]" />
            <span>Meu perfil</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold">
            Abrir
          </span>
        </button>

        <button
          onClick={() => openFromProfileMenu('assinatura')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeNav === 'configuracoes' && settingsTab === 'assinatura'
              ? 'bg-[#00D296]/15 text-[#00D296]'
              : darkMode
              ? 'text-slate-100 hover:bg-white/5'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-3.5">
            <PlanBoxIcon className="w-5 h-5" />
            <span>Plano e assinatura</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold">
            Abrir
          </span>
        </button>

        <button
          onClick={() => openFromProfileMenu('preferencias')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeNav === 'configuracoes' && settingsTab === 'preferencias'
              ? 'bg-[#00D296]/15 text-[#00D296]'
              : darkMode
              ? 'text-slate-100 hover:bg-white/5'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-3.5">
            <Settings className="w-5 h-5 stroke-[1.9]" />
            <span>Configurações</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D296]/20 text-[#00D296] font-bold">
            Abrir
          </span>
        </button>
      </div>

      <div className={`h-px mx-4 ${darkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />

      {/* Modo Claro Toggle + Sair */}
      <div className="p-2.5 space-y-1">
        <div
          onClick={() => setDarkMode(!darkMode)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition ${
            darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <MoonStarIcon className="w-5 h-5" />
            <span>Modo claro</span>
          </div>

          <div
            className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
              !darkMode ? 'bg-[#00D296]' : 'bg-[#00A878]'
            }`}
          >
            <span
              className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200"
              style={{
                transform: darkMode ? 'translateX(22px)' : 'translateX(2px)'
              }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            setProfileMenuOpen(false);
            showToast('Sessão encerrada com segurança (Demonstração).');
          }}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            darkMode
              ? 'text-slate-100 hover:bg-rose-500/15 hover:text-rose-300'
              : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <LogOut className="w-5 h-5 stroke-[1.9]" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );

  // =========================================================
  // CONTEÚDO INTERNO DAS TELAS (INÍCIO, ULTRASSOM, RELATÓRIO E AS 3 TELAS DO PERFIL)
  // =========================================================
  const renderMainScreenContent = (isTabletLayout = false, isMobileLayout = false) => {
    // 1. TELA INÍCIO (DASHBOARD FIEL À FOTO 1)
    if (activeNav === 'inicio') {
      return (
        <div className="space-y-7">
          {/* No Tablet os cards são horizontais empilhados; no Desktop são 2 colunas lado a lado */}
          {isTabletLayout ? (
            <div className="space-y-4">
              {/* Card Horizontal Tablet: Ultrassom */}
              <div
                className={`relative rounded-2xl p-6 border flex items-center gap-6 overflow-hidden transition ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#132530] to-[#0E3130] border-teal-500/20'
                    : 'bg-gradient-to-r from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
                }`}
              >
                <CardWaveBackground dark={darkMode} />
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 ${
                    darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]'
                  }`}
                >
                  <UltrasoundIcon className="w-10 h-10" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-extrabold">Ultrassom</h3>
                  <p
                    className={`text-sm max-w-md my-1.5 ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Envie suas imagens e receba um laudo completo com IA.
                  </p>
                  <button
                    onClick={() => setActiveNav('ultrassom')}
                    className={`mt-2 px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition shadow-sm ${
                      darkMode
                        ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                        : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                    }`}
                  >
                    Começar agora <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Horizontal Tablet: Relatório */}
              <div
                className={`relative rounded-2xl p-6 border flex items-center gap-6 overflow-hidden transition ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#13232F] to-[#0F2C30] border-teal-500/20'
                    : 'bg-gradient-to-r from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]'
                }`}
              >
                <CardWaveBackground dark={darkMode} />
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 ${
                    darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]'
                  }`}
                >
                  <FileText className="w-9 h-9" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-extrabold">Relatório</h3>
                  <p
                    className={`text-sm max-w-md my-1.5 ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Envie seu documento e gere um relatório personalizado.
                  </p>
                  <button
                    onClick={() => setActiveNav('relatorio')}
                    className={`mt-2 px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition shadow-sm ${
                      darkMode
                        ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                        : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                    }`}
                  >
                    Começar agora <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Layout Desktop (2 colunas) ou Mobile (1 coluna empilhada) */
            <div className={`grid ${isMobileLayout ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
              {/* Card 1: Ultrassom */}
              <div
                className={`relative rounded-2xl ${
                  isMobileLayout ? 'p-5' : 'p-7'
                } border overflow-hidden transition ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/20'
                    : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
                }`}
              >
                <CardWaveBackground dark={darkMode} />
                <div className="relative z-10">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                      darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]'
                    }`}
                  >
                    <UltrasoundIcon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold">Ultrassom</h3>
                  <p
                    className={`text-sm mt-1.5 mb-6 max-w-xs leading-relaxed ${
                      darkMode ? 'text-slate-300' : 'text-[#3F5368]'
                    }`}
                  >
                    Envie suas imagens e receba um laudo completo com IA.
                  </p>
                  <button
                    onClick={() => setActiveNav('ultrassom')}
                    className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition shadow-sm ${
                      darkMode
                        ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                        : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                    }`}
                  >
                    Começar agora <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 2: Relatório */}
              <div
                className={`relative rounded-2xl ${
                  isMobileLayout ? 'p-5' : 'p-7'
                } border overflow-hidden transition ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#13232F] to-[#0F2C30] border-teal-500/20'
                    : 'bg-gradient-to-br from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]'
                }`}
              >
                <CardWaveBackground dark={darkMode} />
                <div className="relative z-10">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                      darkMode ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]'
                    }`}
                  >
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold">Relatório</h3>
                  <p
                    className={`text-sm mt-1.5 mb-6 max-w-xs leading-relaxed ${
                      darkMode ? 'text-slate-300' : 'text-[#3F5368]'
                    }`}
                  >
                    Envie seu documento e gere um relatório personalizado.
                  </p>
                  <button
                    onClick={() => setActiveNav('relatorio')}
                    className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition shadow-sm ${
                      darkMode
                        ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                        : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                    }`}
                  >
                    Começar agora <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabela Atividade Recente (Exibida completa no Desktop e também acessível nos demais modos) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold">Atividade recente</h3>
              <button
                onClick={() => setSelectedReport(activities[0])}
                className={`text-xs font-bold inline-flex items-center gap-1 hover:underline ${
                  darkMode ? 'text-[#00D296]' : 'text-[#0D5C56]'
                }`}
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              className={`rounded-2xl border divide-y overflow-hidden ${
                darkMode
                  ? 'bg-[#0E1A24] border-slate-800/90 divide-slate-800/80'
                  : 'bg-white border-slate-200 divide-slate-100'
              }`}
            >
              {activities.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  className={`px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                    darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        darkMode
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-100 text-[#0A141D]'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs sm:text-sm font-bold truncate">{item.title}</p>
                      {isMobileLayout && (
                        <p className="text-[10px] text-slate-400 truncate">{item.date}</p>
                      )}
                    </div>
                  </div>

                  {!isMobileLayout && (
                    <span
                      className={`text-xs font-medium ${
                        darkMode ? 'text-slate-400' : 'text-[#637692]'
                      }`}
                    >
                      {item.date}
                    </span>
                  )}

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        darkMode
                          ? 'bg-[#0D4A3E] text-[#2CE5B1]'
                          : 'bg-[#D3F7E9] text-[#0D684E]'
                      }`}
                    >
                      {item.status}
                    </span>
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 2. NOVAS TELAS SIMPLIFICADAS DE ULTRASSOM E RELATÓRIO CIRÚRGICO (FIÉIS ÀS NOVAS FOTOS E NA IDENTIDADE VETARO)
    if (activeNav === 'ultrassom' || activeNav === 'relatorio') {
      const isUltra = activeNav === 'ultrassom';

      return (
        <div className="space-y-6">
          {/* =========================================================
              OPÇÃO A: TELA "LAUDO DE ULTRASSONOGRAFIA ABDOMINAL" (FOTO 3 NA IDENTIDADE VETARO)
             ========================================================= */}
          {isUltra ? (
            <div
              className={`relative rounded-2xl p-5 sm:p-7 border overflow-hidden transition shadow-lg ${
                darkMode
                  ? 'bg-[#0F1C26] border-[#1E3545] text-white'
                  : 'bg-white border-slate-200 text-[#0A141D]'
              }`}
            >
              <CardWaveBackground dark={darkMode} />

              {/* Cabeçalho: Título + Subtítulo à esquerda | Botões "Meu Perfil / Marca" e "Editor de Layout" à direita */}
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
                    Envie as capturas de tela do Mindray com calipers e identificações para
                    análise automática.
                  </p>
                </div>

                {/* Dois Botões Superiores Direitos (Meu Perfil / Marca & Editor de Layout) */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => openFromProfileMenu('perfil')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition shadow-xs ${
                      darkMode
                        ? 'bg-[#E3FAF2] text-[#0D5C56] border-[#00D296]/40 hover:bg-[#ccf5e7]'
                        : 'bg-[#E3FAF2] text-[#0D5C56] border-[#00D296]/40 hover:bg-[#d0f4e8]'
                    }`}
                  >
                    <User className="w-4 h-4 text-[#00A878] shrink-0" />
                    <span className="leading-tight text-left">
                      Meu Perfil /<br className="hidden sm:inline" /> Marca
                    </span>
                  </button>

                  <button
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
                </div>
              </div>

              {/* Gaveta Rápida do Editor de Layout (quando clicado) */}
              {layoutEditorOpen && (
                <div
                  className={`relative z-10 mb-5 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                    darkMode
                      ? 'bg-[#0A141D]/90 border-[#00D296]/40 text-slate-200'
                      : 'bg-[#F0FBF7] border-[#00D296]/40 text-[#0A141D]'
                  }`}
                >
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
                  <button
                    onClick={() => {
                      setLayoutEditorOpen(false);
                      showToast('Preferências do Editor de Layout salvas!');
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-extrabold bg-[#00D296] text-[#062E2B]"
                  >
                    Aplicar Layout
                  </button>
                </div>
              )}

              {/* Área Grande de Dropzone Tracejada (Estilo da Foto 3 com cores Vetaro) */}
              <div
                onClick={handleSelectMindrayPhotos}
                className={`relative z-10 rounded-2xl border-2 border-dashed py-10 px-6 text-center cursor-pointer transition group ${
                  darkMode
                    ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]'
                    : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]'
                }`}
              >
                <div className="flex justify-center mb-3">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ${
                      darkMode
                        ? 'bg-[#0E3A38] text-[#00D296]'
                        : 'bg-[#C7F0E3] text-[#0D5C56]'
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

                {/* Pílulas das Capturas do Mindray quando selecionadas */}
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
                      onClick={() => setMindrayFiles([])}
                      className="text-[11px] font-bold underline text-rose-400 ml-2"
                    >
                      Limpar fotos
                    </button>
                  </div>
                )}
              </div>

              {/* Botão Largo Principal: "Gerar Laudo Oficial com IA" */}
              <button
                onClick={() => handleGenerateAI('ultrassom')}
                disabled={isGenerating}
                className={`relative z-10 w-full mt-5 py-3.5 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925] hover:brightness-110'
                    : 'bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white hover:brightness-110'
                }`}
              >
                <Wand2 className="w-5 h-5" />
                <span>
                  {isGenerating
                    ? 'Lendo calipers do Mindray e gerando Laudo Oficial...'
                    : 'Gerar Laudo Oficial com IA'}
                </span>
              </button>
            </div>
          ) : (
            /* =========================================================
               OPÇÃO B: TELA "RELATÓRIO CIRÚRGICO OFICIAL" (FOTO 4 NA IDENTIDADE VETARO)
               ========================================================= */
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
                    Envie o documento da cirurgia (.docx, .pages, .txt ou áudio gravado) e
                    fotos anexas opcionais.
                  </p>
                </div>

                <button
                  onClick={() => openFromProfileMenu('perfil')}
                  className="self-start px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-[#E3FAF2] text-[#0D5C56] border border-[#00D296]/40 shrink-0"
                >
                  <User className="w-4 h-4 text-[#00A878]" />
                  <span>Timbre: {userProfile.crmv}</span>
                </button>
              </div>

              {/* SEÇÃO 1: 1. FICHA CIRÚRGICA OU ÁUDIO */}
              <div className="relative z-10 mb-5">
                <p
                  className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-2 ${
                    darkMode ? 'text-slate-200' : 'text-[#1E2D3D]'
                  }`}
                >
                  1. FICHA CIRÚRGICA OU ÁUDIO
                </p>

                <div
                  onClick={handleSelectSurgeryFile}
                  className={`rounded-2xl border-2 border-dashed py-8 px-5 text-center cursor-pointer transition group ${
                    darkMode
                      ? 'bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]'
                      : 'bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]'
                  }`}
                >
                  <div className="flex justify-center mb-2.5">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition group-hover:scale-105 ${
                        darkMode
                          ? 'bg-[#0E3A38] text-[#00D296]'
                          : 'bg-[#C7F0E3] text-[#0D5C56]'
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
                    Word (.docx), Pages (.pages), Texto (.txt) ou Áudios (.m4a, .mp3, .wav,
                    .ogg)
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
                  onClick={handleSelectSurgeryPhotos}
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

              {/* Botão Largo Principal: "Gerar Relatório Cirúrgico Oficial" */}
              <button
                onClick={() => handleGenerateAI('relatorio')}
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
          )}

          {/* =========================================================
              RESULTADO GERADO PELA IA (APARECE LOGO ABAIXO COM PÁGINA 1 E PÁGINA 2)
             ========================================================= */}
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

                {/* Abas Página 1 (Texto Técnico) vs Página 2 (Anexo Fotográfico / Grade Mindray) */}
                <div className="flex items-center gap-1.5">
                  <button
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
                    onClick={() => setReportPageTab('p2')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                      reportPageTab === 'p2'
                        ? 'bg-[#00D296] text-[#062E2B]'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    Página 2: {isUltra ? 'Imagens Mindray' : 'Fotos da Cirurgia'}
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
                  {(isUltra
                    ? mindrayFiles
                    : surgeryPhotos.length > 0
                    ? surgeryPhotos
                    : [
                        { name: 'FOTO_INTRAOP_01.JPG', measure: 'Hemostasia vascular' },
                        { name: 'FOTO_PECA_CIRURGICA_02.JPG', measure: 'Peça cirúrgica' }
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
                        <span className="text-[10px] font-bold">
                          {img.measure || img.label}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold truncate">{img.name}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  onClick={() => setActiveNav('inicio')}
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  ← Voltar ao Início
                </button>
                <button
                  onClick={() => showToast('PDF Oficial Timbrado baixado com sucesso!')}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar PDF Oficial (Páginas 1 e 2)
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 3. TELAS DE CONFIGURAÇÕES / MEU PERFIL / PLANO E ASSINATURA (ACIONADAS PELO MENU DA 2ª FOTO)
    return (
      <div className="space-y-6">
        {/* Sub-navegação correspondente aos 3 itens do Menu de Perfil da 2ª Foto */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-3 border-slate-700/40">
          {[
            { id: 'perfil', label: 'Meu perfil (Dra. Mariana)', icon: User },
            { id: 'assinatura', label: 'Plano e assinatura', icon: CreditCard },
            { id: 'preferencias', label: 'Configurações & IA', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = settingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
                  active
                    ? 'bg-[#00D296] text-[#062E2B] shadow-sm'
                    : darkMode
                    ? 'bg-[#0F1C26] text-slate-300 hover:bg-slate-800'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ABA 1: MEU PERFIL (Clicado em "Meu perfil" na 2ª foto) */}
        {settingsTab === 'perfil' && (
          <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-12'} gap-6`}>
            {/* Cartão da Médica Veterinária */}
            <div
              className={`${
                isMobileLayout ? '' : 'col-span-4'
              } p-6 rounded-2xl border flex flex-col items-center text-center ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-20 h-20 rounded-full bg-[#637692] text-white flex items-center justify-center font-extrabold text-2xl mb-3 shadow-lg">
                {userProfile.initials}
              </div>
              <h3 className="text-lg font-extrabold">{userProfile.name}</h3>
              <p className="text-xs text-[#00D296] font-bold mt-0.5">{userProfile.crmv}</p>
              <p className="text-xs text-slate-400 mt-1">{userProfile.email}</p>

              <div
                className={`w-full mt-5 p-3.5 rounded-xl border text-left text-xs space-y-1.5 ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <p className="font-extrabold text-[11px] uppercase tracking-wider text-[#00D296]">
                  Carimbo Digital nos Laudos
                </p>
                <p className="font-bold">{userProfile.name}</p>
                <p>{userProfile.crmv} • Diagnóstico Veterinário</p>
                <p className="text-[11px] text-slate-400">
                  Assinatura eletrônica ativa em todos os PDFs gerados.
                </p>
              </div>
            </div>

            {/* Formulário de Edição de Dados Profissionais */}
            <div
              className={`${
                isMobileLayout ? '' : 'col-span-8'
              } p-6 rounded-2xl border space-y-4 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#00D296]" />
                Dados Profissionais & Clínica Veterinária
              </h3>

              <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">
                    Nome Completo no Laudo
                  </label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) =>
                      setUserProfile({ ...userProfile, name: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                      darkMode
                        ? 'bg-[#0A141D] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">
                    Registro CRMV / UF
                  </label>
                  <input
                    type="text"
                    value={userProfile.crmv}
                    onChange={(e) =>
                      setUserProfile({ ...userProfile, crmv: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                      darkMode
                        ? 'bg-[#0A141D] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">
                    E-mail Profissional
                  </label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) =>
                      setUserProfile({ ...userProfile, email: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                      darkMode
                        ? 'bg-[#0A141D] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">
                    Nome da Clínica / Serviço Volante
                  </label>
                  <input
                    type="text"
                    value={userProfile.clinicName}
                    onChange={(e) =>
                      setUserProfile({ ...userProfile, clinicName: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                      darkMode
                        ? 'bg-[#0A141D] border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-400">
                  Especialidade exibida no rodapé dos laudos
                </label>
                <input
                  type="text"
                  value={userProfile.specialty}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, specialty: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-[#0A141D]'
                  }`}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() =>
                    showToast('Dados do perfil da Dra. Mariana Duarte atualizados!')
                  }
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition"
                >
                  Salvar Alterações do Perfil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: PLANO E ASSINATURA (Clicado em "Plano e assinatura" na 2ª foto) */}
        {settingsTab === 'assinatura' && (
          <div className={`grid ${isMobileLayout ? 'grid-cols-1' : 'grid-cols-12'} gap-6`}>
            <div
              className={`${
                isMobileLayout ? '' : 'col-span-7'
              } p-6 rounded-2xl border space-y-4 ${
                darkMode
                  ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/30'
                  : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#00D296] text-[#062E2B]">
                  PLANO ATIVO • RENOVAÇÃO AUTOMÁTICA
                </span>
                <span className="text-xs font-bold opacity-80">R$ 189,00 / mês</span>
              </div>
              <h3 className="text-2xl font-extrabold">Vetaro Pro IA — Ilimitado</h3>
              <p className="text-xs leading-relaxed opacity-90">
                Laudos de ultrassom e relatórios clínicos ilimitados com transcrição por voz,
                análise de imagens DICOM/JPEG e papel timbrado personalizado.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div
                  className={`p-3 rounded-xl border ${
                    darkMode
                      ? 'bg-[#0A141D]/60 border-teal-500/20'
                      : 'bg-white/80 border-teal-600/20'
                  }`}
                >
                  <p className="text-[11px] text-slate-400">Laudos este mês</p>
                  <p className="text-lg font-extrabold text-[#00D296]">142</p>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    darkMode
                      ? 'bg-[#0A141D]/60 border-teal-500/20'
                      : 'bg-white/80 border-teal-600/20'
                  }`}
                >
                  <p className="text-[11px] text-slate-400">Tempo economizado</p>
                  <p className="text-lg font-extrabold text-[#00D296]">~35h</p>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    darkMode
                      ? 'bg-[#0A141D]/60 border-teal-500/20'
                      : 'bg-white/80 border-teal-600/20'
                  }`}
                >
                  <p className="text-[11px] text-slate-400">Próxima fatura</p>
                  <p className="text-sm font-extrabold">15/12/2025</p>
                </div>
              </div>
            </div>

            <div
              className={`${
                isMobileLayout ? '' : 'col-span-5'
              } p-6 rounded-2xl border space-y-3 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <h4 className="text-sm font-extrabold">Método de Pagamento & Faturas</h4>
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="font-bold">Mastercard •••• 4821</span>
                <span className="text-[#00D296] font-bold">Padrão</span>
              </div>
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-700/30">
                  <span>15/11/2025 — Vetaro Pro IA</span>
                  <span className="font-bold text-[#00D296]">Pago (R$ 189)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-700/30">
                  <span>15/10/2025 — Vetaro Pro IA</span>
                  <span className="font-bold text-[#00D296]">Pago (R$ 189)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CONFIGURAÇÕES DO SISTEMA & IA (Clicado em "Configurações" na 2ª foto) */}
        {settingsTab === 'preferencias' && (
          <div
            className={`p-6 rounded-2xl border space-y-5 ${
              darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-base font-extrabold">
              Preferências de Geração de Laudos com IA & Aparência
            </h3>

            <div className="space-y-3">
              {[
                {
                  key: 'autoMeasurements',
                  title: 'Sugestão Automática de Impressão Diagnóstica',
                  desc: 'A IA Vetaro sugere hipóteses diagnósticas ao final do laudo de ultrassom.'
                },
                {
                  key: 'voiceDictation',
                  title: 'Transcrição de Voz Veterinária em Tempo Real',
                  desc: 'Permite ditar medidas de órgãos durante o exame ultrassonográfico.'
                },
                {
                  key: 'includeHeaderLogo',
                  title: 'Incluir Papel Timbrado e Carimbo CRMV no PDF',
                  desc: 'Exporta os laudos prontos para envio via WhatsApp ou impressão.'
                }
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() =>
                    setUserProfile({
                      ...userProfile,
                      [item.key]: !userProfile[item.key]
                    })
                  }
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ${
                    darkMode
                      ? 'bg-[#0A141D] border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                      userProfile[item.key] ? 'bg-[#00D296]' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full bg-white shadow transform transition-transform"
                      style={{
                        transform: userProfile[item.key]
                          ? 'translateX(22px)'
                          : 'translateX(2px)'
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Alternador de Modo Claro / Escuro sincronizado com o menu da 2ª foto */}
              <div
                onClick={() => setDarkMode(!darkMode)}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer ${
                  darkMode
                    ? 'bg-[#0A141D] border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <p className="text-xs sm:text-sm font-extrabold">
                    Modo Claro (Tema da Interface)
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Alterna instantaneamente entre o tema Escuro (#0A141D) e Claro (#F8FAFC).
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    !darkMode ? 'bg-[#00D296]' : 'bg-[#00A878]'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full bg-white shadow transform transition-transform"
                    style={{
                      transform: darkMode ? 'translateX(22px)' : 'translateX(2px)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================
  // MINI-MOCKUP DESKTOP PARA A PRANCHA COMPLETA (FOTO 1)
  // =========================================================
  const renderMiniDesktopForBoard = (isDarkTheme) => (
    <div
      className={`rounded-2xl border overflow-hidden shadow-xl flex ${
        isDarkTheme
          ? 'bg-[#0A141D] border-slate-800 text-white'
          : 'bg-[#F8FAFC] border-slate-200 text-[#0A141D]'
      }`}
      style={{ width: '550px', height: '355px' }}
    >
      {/* Sidebar Esquerda */}
      <div
        className={`w-36 shrink-0 border-r p-3.5 flex flex-col justify-between ${
          isDarkTheme ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
            <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
            <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
          </div>
          <div className="mb-4">
            <VetaroLogo size={20} dark={isDarkTheme} textSize="text-base" />
          </div>
          <div className="space-y-1 text-[11px] font-semibold">
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                setActiveNav('inicio');
                setDeviceView('desktop');
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer relative ${
                isDarkTheme
                  ? 'bg-[#0D3131] text-[#00D296]'
                  : 'bg-[#DDF7F0] text-[#0D5C56]'
              }`}
            >
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#00D296]" />
              <Home className="w-3.5 h-3.5" />
              <span>Início</span>
            </div>
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                setActiveNav('ultrassom');
                setDeviceView('desktop');
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer opacity-75 hover:opacity-100"
            >
              <UltrasoundIcon className="w-3.5 h-3.5" />
              <span>Ultrassom</span>
            </div>
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                setActiveNav('relatorio');
                setDeviceView('desktop');
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer opacity-75 hover:opacity-100"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório</span>
            </div>
            <div
              onClick={() => {
                setDarkMode(isDarkTheme);
                openFromProfileMenu('preferencias', 'desktop');
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer opacity-75 hover:opacity-100"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </div>
          </div>
        </div>
        <div>
          <div
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[9px] font-semibold ${
              isDarkTheme
                ? 'border-slate-800 bg-[#0F1C26] text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <span>? Ajuda e suporte</span>
            <span>↗</span>
          </div>
          <p className="text-[8px] text-slate-400 mt-1 px-1">v1.0.0</p>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-extrabold text-sm">Olá, {userProfile.greetingName}!</h3>
            <p className={`text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
              Tudo pronto para otimizar seu trabalho hoje?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            <span
              onClick={() => {
                setDarkMode(isDarkTheme);
                setProfileMenuOpen(true);
                setDeviceView('desktop');
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold cursor-pointer ${
                isDarkTheme ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
              }`}
            >
              MD
            </span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>

        {/* 2 Cards */}
        <div className="grid grid-cols-2 gap-3 my-1.5">
          <div
            className={`relative rounded-xl p-3 overflow-hidden border ${
              isDarkTheme
                ? 'bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/20'
                : 'bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
            }`}
          >
            <CardWaveBackground dark={isDarkTheme} />
            <div className="relative z-10">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                  isDarkTheme ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#C4F1E3] text-[#00A878]'
                }`}
              >
                <UltrasoundIcon className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-xs">Ultrassom</p>
              <p className="text-[9px] opacity-80 my-1">
                Envie suas imagens e receba um laudo completo com IA.
              </p>
              <span
                onClick={() => {
                  setDarkMode(isDarkTheme);
                  setActiveNav('ultrassom');
                  setDeviceView('desktop');
                }}
                className={`mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold cursor-pointer ${
                  isDarkTheme
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'bg-[#0D5C56] text-white'
                }`}
              >
                Começar agora →
              </span>
            </div>
          </div>

          <div
            className={`relative rounded-xl p-3 overflow-hidden border ${
              isDarkTheme
                ? 'bg-gradient-to-br from-[#13232F] to-[#0F2C30] border-teal-500/20'
                : 'bg-gradient-to-br from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]'
            }`}
          >
            <CardWaveBackground dark={isDarkTheme} />
            <div className="relative z-10">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                  isDarkTheme ? 'bg-[#0E3A38] text-[#00D296]' : 'bg-[#CBEFE4] text-[#0D5C56]'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-xs">Relatório</p>
              <p className="text-[9px] opacity-80 my-1">
                Envie seu documento e gere um relatório personalizado.
              </p>
              <span
                onClick={() => {
                  setDarkMode(isDarkTheme);
                  setActiveNav('relatorio');
                  setDeviceView('desktop');
                }}
                className={`mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold cursor-pointer ${
                  isDarkTheme
                    ? 'bg-[#00D296] text-[#062E2B]'
                    : 'bg-[#0D5C56] text-white'
                }`}
              >
                Começar agora →
              </span>
            </div>
          </div>
        </div>

        {/* Mini Tabela Atividade Recente */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-[10px]">Atividade recente</span>
            <span
              className={`text-[9px] font-bold ${
                isDarkTheme ? 'text-[#00D296]' : 'text-[#0D5C56]'
              }`}
            >
              Ver todos →
            </span>
          </div>
          <div
            className={`rounded-lg border divide-y text-[9px] ${
              isDarkTheme
                ? 'bg-[#0E1A24] border-slate-800 divide-slate-800'
                : 'bg-white border-slate-200 divide-slate-100'
            }`}
          >
            {activities.slice(0, 3).map((act) => (
              <div key={act.id} className="px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <FileText className="w-3 h-3 opacity-70" />
                  {act.title}
                </span>
                <span className="text-slate-400">{act.date}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                    isDarkTheme
                      ? 'bg-[#0D4A3E] text-[#2CE5B1]'
                      : 'bg-[#D3F7E9] text-[#0D684E]'
                  }`}
                >
                  {act.status}
                </span>
                <MoreHorizontal className="w-3 h-3 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{ fontFamily: "'Manrope', sans-serif" }}
      className={`min-h-screen transition-colors duration-300 flex flex-col ${
        darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F1F6F8] text-[#0A141D]'
      }`}
    >
      {/* =========================================================
          BARRA DE CONTROLE MOBILE-FRIENDLY FIXA NO TOPO
          Permite ver Computador, Tablet, Celular e Telas do Perfil (2ª Foto) com 1 toque!
         ========================================================= */}
      <div
        className={`w-full border-b px-3 sm:px-6 py-2.5 flex flex-col gap-2 z-40 sticky top-0 backdrop-blur-md ${
          darkMode
            ? 'bg-[#070E14]/95 border-slate-800 text-slate-200'
            : 'bg-white/95 border-slate-200 text-[#0A141D]'
        }`}
      >
        {/* Linha 1: Logo + Botão Zoom Celular + Botão Modo Claro/Escuro */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <VetaroLogo size={24} dark={darkMode} textSize="text-base" />
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#00D296]/15 text-[#00D296]">
              Visualizador Mobile / PC / Tablet
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {screenWidth < 1160 && deviceView !== 'mobile' && deviceView !== 'specs' && (
              <button
                onClick={() => setFitToPhone(!fitToPhone)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1 shadow-xs"
              >
                {fitToPhone ? (
                  <>
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Ver Tamanho 100%</span>
                  </>
                ) : (
                  <>
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Encaixar no Celular</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                darkMode
                  ? 'border-slate-700 bg-slate-800 text-[#00D296]'
                  : 'border-slate-300 bg-slate-100 text-[#0D5C56]'
              }`}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Claro' : 'Escuro'}</span>
            </button>
          </div>
        </div>

        {/* Linha 2: Seletor de Dispositivo (Para inspecionar Desktop e Tablet pelo celular) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: 'prancha', label: '1. Prancha Completa (Foto 1 + 2)', icon: Palette },
            { id: 'desktop', label: '2. Computador (Desktop)', icon: Monitor },
            { id: 'tablet', label: '3. Tablet (iPad)', icon: Tablet },
            { id: 'mobile', label: '4. Celular (App)', icon: Smartphone },
            { id: 'specs', label: '5. Guia & Medidas (Dev)', icon: Sliders }
          ].map((item) => {
            const Icon = item.icon;
            const active = deviceView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setDeviceView(item.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'bg-[#00D296] text-[#062E2B] shadow-xs'
                    : darkMode
                    ? 'bg-[#111F2B] text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Linha 3: Atalhos Rápidos para as Telas da 2ª Foto (Menu MD, Meu Perfil, Plano, Config) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 no-scrollbar">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Telas:
          </span>
          <button
            onClick={() => {
              setActiveNav('inicio');
              if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('desktop');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
              activeNav === 'inicio' && deviceView !== 'prancha'
                ? 'bg-[#0D5C56] text-white'
                : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            Início (Dashboard)
          </button>
          <button
            onClick={() => {
              setActiveNav('ultrassom');
              if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('desktop');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
              activeNav === 'ultrassom' && deviceView !== 'prancha'
                ? 'bg-[#00D296] text-[#062E2B]'
                : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            ✨ Ultrassom (Mindray IA)
          </button>
          <button
            onClick={() => {
              setActiveNav('relatorio');
              if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('desktop');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
              activeNav === 'relatorio' && deviceView !== 'prancha'
                ? 'bg-[#00D296] text-[#062E2B]'
                : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            ✨ Relatório Cirúrgico IA
          </button>
          <button
            onClick={() => {
              if (deviceView === 'prancha' || deviceView === 'specs') setDeviceView('desktop');
              setProfileMenuOpen(!profileMenuOpen);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 border ${
              profileMenuOpen
                ? 'bg-[#00D296] text-[#062E2B] border-[#00D296]'
                : 'border-[#00D296]/40 text-[#00D296]'
            }`}
          >
            Menu Perfil MD (2ª Foto) ▾
          </button>
          <button
            onClick={() => openFromProfileMenu('perfil')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
              activeNav === 'configuracoes' && settingsTab === 'perfil'
                ? 'bg-[#0D5C56] text-white'
                : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            Meu Perfil
          </button>
          <button
            onClick={() => openFromProfileMenu('assinatura')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
              activeNav === 'configuracoes' && settingsTab === 'assinatura'
                ? 'bg-[#0D5C56] text-white'
                : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            Plano e Assinatura
          </button>
          <button
            onClick={() => openFromProfileMenu('preferencias')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
              activeNav === 'configuracoes' && settingsTab === 'preferencias'
                ? 'bg-[#0D5C56] text-white'
                : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            Configurações IA
          </button>
        </div>
      </div>

      {/* =========================================================
          MODO 1: PRANCHA COMPLETA (FOTO 1 + FOTO 2 + ACESSO ÀS TELAS)
         ========================================================= */}
      {deviceView === 'prancha' && (
        <div className="flex-1 p-3 sm:p-6 overflow-x-auto">
          {/* Aviso amigável para quem está no celular */}
          <div
            className={`mb-4 p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
              darkMode
                ? 'bg-[#101E29] border-teal-500/30 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <span>
              📱 <strong>Você está no celular:</strong> A prancha abaixo contém{' '}
              <strong>Computador (Claro/Escuro)</strong>, <strong>Tablet iPad</strong>,{' '}
              <strong>Celulares</strong> e a <strong>Identidade Visual</strong> ajustados à sua
              tela. Toque em qualquer elemento para testar!
            </span>
          </div>

          {/* Prancha de Apresentação da Foto 1 com auto-zoom para caber no celular */}
          <div className="w-full overflow-x-auto pb-4 flex justify-center">
            <div
              className="rounded-3xl p-6 bg-[#EBF2F7] text-[#0A141D] shadow-2xl border border-slate-300 shrink-0"
              style={{
                width: '1150px',
                zoom: boardZoom
              }}
            >
              {/* LINHA SUPERIOR: DESKTOP LIGHT + DESKTOP DARK */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {renderMiniDesktopForBoard(false)}
                {renderMiniDesktopForBoard(true)}
              </div>

              {/* LINHA INFERIOR: TABLET iPad (ESQUERDA) + 2 CELULARES (CENTRO) + IDENTIDADE VISUAL (DIREITA) */}
              <div className="grid grid-cols-12 gap-5 items-stretch">
                {/* Tablet iPad Mockup */}
                <div className="col-span-5 rounded-[26px] border-[10px] border-[#151D26] bg-[#F8FAFC] text-[#0A141D] shadow-xl flex overflow-hidden">
                  <div className="w-32 bg-white border-r border-slate-200 p-3 flex flex-col justify-between shrink-0">
                    <div>
                      <div className="mb-4">
                        <VetaroLogo size={18} dark={false} textSize="text-sm" />
                      </div>
                      <div className="space-y-1 text-[10px] font-semibold">
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#DDF7F0] text-[#0D5C56] relative">
                          <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#00D296]" />
                          <Home className="w-3 h-3" /> Início
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600">
                          <UltrasoundIcon className="w-3 h-3" /> Ultrassom
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600">
                          <FileText className="w-3 h-3" /> Relatório
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600">
                          <Settings className="w-3 h-3" /> Configurações
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="px-2 py-1 rounded border border-slate-200 text-[8px] font-semibold flex items-center justify-between">
                        <span>? Ajuda e suporte</span>
                        <span>↗</span>
                      </div>
                      <p className="text-[8px] text-slate-400 mt-1">v1.0.0</p>
                    </div>
                  </div>

                  {/* Conteúdo Tablet com Cards Horizontais */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-extrabold text-sm">Olá, Dra. Mariana!</h4>
                        <p className="text-[10px] text-slate-500">
                          Tudo pronto para otimizar seu trabalho hoje?
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        <span className="w-6 h-6 rounded-full bg-[#1E2D3D] text-white text-[9px] font-bold flex items-center justify-center">
                          MD
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>

                    <div
                      onClick={() => setDeviceView('tablet')}
                      className="relative rounded-xl p-3 bg-gradient-to-r from-[#E4F8F2] to-[#D5F4EC] border border-[#C5EFE3] flex items-center gap-3 overflow-hidden my-1 cursor-pointer"
                    >
                      <CardWaveBackground dark={false} />
                      <div className="w-11 h-11 rounded-xl bg-[#C4F1E3] text-[#00A878] flex items-center justify-center shrink-0 relative z-10">
                        <UltrasoundIcon className="w-6 h-6" />
                      </div>
                      <div className="relative z-10">
                        <p className="font-extrabold text-xs">Ultrassom</p>
                        <p className="text-[9px] text-slate-600 mb-1.5">
                          Envie suas imagens e receba um laudo completo com IA.
                        </p>
                        <span className="px-3 py-1 rounded-full bg-[#0D5C56] text-white text-[9px] font-bold inline-block">
                          Começar agora →
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setDeviceView('tablet')}
                      className="relative rounded-xl p-3 bg-gradient-to-r from-[#EAF6F6] to-[#DDF1F0] border border-[#D0EAE8] flex items-center gap-3 overflow-hidden my-1 cursor-pointer"
                    >
                      <CardWaveBackground dark={false} />
                      <div className="w-11 h-11 rounded-xl bg-[#CBEFE4] text-[#0D5C56] flex items-center justify-center shrink-0 relative z-10">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="relative z-10">
                        <p className="font-extrabold text-xs">Relatório</p>
                        <p className="text-[9px] text-slate-600 mb-1.5">
                          Envie seu documento e gere um relatório personalizado.
                        </p>
                        <span className="px-3 py-1 rounded-full bg-[#0D5C56] text-white text-[9px] font-bold inline-block">
                          Começar agora →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2 Celulares (Light & Dark) */}
                <div className="col-span-4 grid grid-cols-2 gap-3">
                  {[false, true].map((isDarkPhone, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDarkMode(isDarkPhone);
                        setDeviceView('mobile');
                      }}
                      className={`rounded-[28px] border-[6px] border-[#1A242F] p-3 flex flex-col justify-between shadow-lg cursor-pointer ${
                        isDarkPhone
                          ? 'bg-[#0A141D] text-white'
                          : 'bg-[#F8FAFC] text-[#0A141D]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[8px] font-bold mb-2">
                          <span>9:41</span>
                          <span className="w-8 h-2 rounded-full bg-black" />
                          <span>5G</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <VetaroLogo size={16} dark={isDarkPhone} textSize="text-xs" />
                          <Bell className="w-3 h-3" />
                        </div>
                        <p className="font-extrabold text-xs">Olá, Dra. Mariana!</p>
                        <p className="text-[8px] opacity-70 mb-2">
                          Tudo pronto para otimizar seu trabalho hoje?
                        </p>

                        <div className="space-y-2">
                          <div
                            className={`p-2.5 rounded-xl border ${
                              isDarkPhone
                                ? 'bg-[#132530] border-teal-500/20'
                                : 'bg-[#E4F8F2] border-[#C5EFE3]'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 ${
                                isDarkPhone
                                  ? 'bg-[#0E3A38] text-[#00D296]'
                                  : 'bg-[#C4F1E3] text-[#00A878]'
                              }`}
                            >
                              <UltrasoundIcon className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-extrabold text-[10px]">Ultrassom</p>
                            <p className="text-[8px] opacity-80 mb-1.5">
                              Envie suas imagens e receba um laudo completo com IA.
                            </p>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold inline-block ${
                                isDarkPhone
                                  ? 'bg-[#00D296] text-[#062E2B]'
                                  : 'bg-[#0D5C56] text-white'
                              }`}
                            >
                              Começar agora →
                            </span>
                          </div>

                          <div
                            className={`p-2.5 rounded-xl border ${
                              isDarkPhone
                                ? 'bg-[#13232F] border-teal-500/20'
                                : 'bg-[#EAF6F6] border-[#D0EAE8]'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 ${
                                isDarkPhone
                                  ? 'bg-[#0E3A38] text-[#00D296]'
                                  : 'bg-[#CBEFE4] text-[#0D5C56]'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <p className="font-extrabold text-[10px]">Relatório</p>
                            <p className="text-[8px] opacity-80 mb-1.5">
                              Envie seu documento e gere um relatório personalizado.
                            </p>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold inline-block ${
                                isDarkPhone
                                  ? 'bg-[#00D296] text-[#062E2B]'
                                  : 'bg-[#0D5C56] text-white'
                              }`}
                            >
                              Começar agora →
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`pt-2 border-t flex justify-around text-[7px] font-bold text-slate-400 ${
                          isDarkPhone ? 'border-slate-800' : 'border-slate-200'
                        }`}
                      >
                        <span className="text-[#00D296] flex flex-col items-center">
                          <Home className="w-3 h-3" /> Início
                        </span>
                        <span className="flex flex-col items-center">
                          <FileText className="w-3 h-3" /> Histórico
                        </span>
                        <span className="flex flex-col items-center">
                          <Settings className="w-3 h-3" /> Configurações
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coluna Direita: Identidade Visual Vetaro */}
                <div className="col-span-3 flex flex-col justify-between p-2">
                  <div className="py-1">
                    <VetaroLogo size={44} dark={false} textSize="text-4xl" />
                  </div>

                  <div className="flex items-center gap-2.5 my-2">
                    {BRAND_COLORS.map((c) => (
                      <div
                        key={c.hex}
                        onClick={() => handleCopyHex(c.hex)}
                        title={`Copiar ${c.hex}`}
                        className="w-10 h-10 rounded-xl shadow-sm border border-slate-300 cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>

                  <div className="py-2 border-y border-slate-300">
                    <p className="font-bold text-sm text-[#0A141D]">Manrope</p>
                    <p className="text-xs font-medium text-[#637692] mt-0.5">
                      Aa Bb Cc 0123456789
                    </p>
                  </div>

                  <div className="flex items-center justify-between px-1 py-2 text-[#0A141D]">
                    <Home className="w-5 h-5" />
                    <UltrasoundIcon className="w-5 h-5" />
                    <FileText className="w-5 h-5" />
                    <Settings className="w-5 h-5" />
                    <Bell className="w-5 h-5" />
                  </div>

                  <div className="px-4 py-3 rounded-2xl bg-[#E1ECEE] flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0A141D]">
                      Tecnologia que cuida.
                    </span>
                    <span className="w-8 h-0.5 bg-[#00D296] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              SEÇÃO DA 2ª FOTO: MENU DO PERFIL + CARTÕES DAS TELAS DE CONFIGURAÇÃO
             ========================================================= */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-4 flex flex-col items-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#00D296] mb-2">
                Menu da 2ª Foto (Toque nos itens para abrir!)
              </span>
              {renderProfileDropdownCard(true)}
            </div>

            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-base sm:text-xl font-extrabold">
                Telas geradas ao clicar no menu de perfil (Computador, Tablet e Celular):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => openFromProfileMenu('perfil')}
                  className={`p-4 rounded-2xl border text-left transition hover:border-[#00D296] ${
                    darkMode ? 'bg-[#101E29] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <User className="w-6 h-6 text-[#00D296] mb-2" />
                  <p className="font-extrabold text-sm">1. Meu Perfil</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Edição do CRMV-SP 48.291 da Dra. Mariana Duarte, especialidade e carimbo
                    digital nos laudos.
                  </p>
                </button>

                <button
                  onClick={() => openFromProfileMenu('assinatura')}
                  className={`p-4 rounded-2xl border text-left transition hover:border-[#00D296] ${
                    darkMode ? 'bg-[#101E29] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-[#00D296] mb-2" />
                  <p className="font-extrabold text-sm">2. Plano e Assinatura</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Detalhes do plano Vetaro Pro IA ilimitado, métricas de uso mensal e
                    histórico de faturas.
                  </p>
                </button>

                <button
                  onClick={() => openFromProfileMenu('preferencias')}
                  className={`p-4 rounded-2xl border text-left transition hover:border-[#00D296] ${
                    darkMode ? 'bg-[#101E29] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <Settings className="w-6 h-6 text-[#00D296] mb-2" />
                  <p className="font-extrabold text-sm">3. Configurações & IA</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Preferências de conclusão automática, transcrição de voz, papel timbrado e
                    Modo Claro.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 2: TELA DE COMPUTADOR (DESKTOP 1120px COM AUTO-ESCALA NO CELULAR)
         ========================================================= */}
      {deviceView === 'desktop' && (
        <div className="flex-1 p-2 sm:p-6 overflow-x-auto flex justify-center">
          <div
            className={`rounded-3xl border shadow-2xl flex overflow-hidden shrink-0 transition-colors ${
              darkMode
                ? 'bg-[#0A141D] border-slate-800 text-white'
                : 'bg-[#F8FAFC] border-slate-200 text-[#0A141D]'
            }`}
            style={{
              width: '1120px',
              minHeight: '680px',
              zoom: desktopZoom
            }}
          >
            {/* Sidebar Fixa de Computador */}
            <aside
              className={`w-64 shrink-0 border-r p-6 flex flex-col justify-between ${
                darkMode ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>

                <div
                  onClick={() => setActiveNav('inicio')}
                  className="cursor-pointer mb-8 inline-block"
                >
                  <VetaroLogo size={34} dark={darkMode} />
                </div>

                <nav className="space-y-1.5">
                  {[
                    { id: 'inicio', label: 'Início', icon: Home },
                    { id: 'ultrassom', label: 'Ultrassom', icon: UltrasoundIcon },
                    { id: 'relatorio', label: 'Relatório', icon: FileText },
                    { id: 'configuracoes', label: 'Configurações', icon: Settings }
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition relative ${
                          active
                            ? darkMode
                              ? 'bg-[#0D3131] text-[#00D296]'
                              : 'bg-[#DDF7F0] text-[#0D5C56]'
                            : darkMode
                            ? 'text-slate-300 hover:bg-white/5'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#00D296]" />
                        )}
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div>
                <button
                  onClick={() =>
                    showToast('Suporte Técnico Veterinário Vetaro disponível!')
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'border-slate-800 bg-[#0F1C26] text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    Ajuda e suporte
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <p className="text-[11px] text-slate-500 mt-3 px-1">v1.0.0</p>
              </div>
            </aside>

            {/* Conteúdo Principal do Computador */}
            <main className="flex-1 p-8 flex flex-col relative">
              <header className="flex items-start justify-between mb-7 relative">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">
                    Olá, {userProfile.greetingName}!
                  </h1>
                  <p
                    className={`text-sm mt-1 font-medium ${
                      darkMode ? 'text-slate-400' : 'text-[#52657A]'
                    }`}
                  >
                    Tudo pronto para otimizar seu trabalho hoje?
                  </p>
                </div>

                <div className="flex items-center gap-4 relative">
                  <button
                    onClick={() => showToast('Nenhuma notificação pendente.')}
                    className="p-2 rounded-full hover:bg-slate-500/10 relative"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#00D296]" />
                  </button>

                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
                      }`}
                    >
                      {userProfile.initials}
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {profileMenuOpen && renderProfileDropdownCard(false)}
                </div>
              </header>

              {renderMainScreenContent(false, false)}
            </main>
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 3: TELA DE TABLET (iPad 820px COM AUTO-ESCALA NO CELULAR)
         ========================================================= */}
      {deviceView === 'tablet' && (
        <div className="flex-1 p-2 sm:p-6 overflow-x-auto flex justify-center">
          <div
            className={`rounded-[34px] border-[12px] border-[#161F29] shadow-2xl flex overflow-hidden shrink-0 ${
              darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'
            }`}
            style={{
              width: '820px',
              minHeight: '580px',
              zoom: tabletZoom
            }}
          >
            {/* Sidebar Compacta do Tablet */}
            <aside
              className={`w-52 shrink-0 border-r p-5 flex flex-col justify-between ${
                darkMode ? 'bg-[#0C1720] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="mb-7">
                  <VetaroLogo size={26} dark={darkMode} textSize="text-xl" />
                </div>
                <nav className="space-y-1.5">
                  {[
                    { id: 'inicio', label: 'Início', icon: Home },
                    { id: 'ultrassom', label: 'Ultrassom', icon: UltrasoundIcon },
                    { id: 'relatorio', label: 'Relatório', icon: FileText },
                    { id: 'configuracoes', label: 'Configurações', icon: Settings }
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs relative ${
                          active
                            ? darkMode
                              ? 'bg-[#0D3131] text-[#00D296]'
                              : 'bg-[#DDF7F0] text-[#0D5C56]'
                            : 'text-slate-400'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#00D296]" />
                        )}
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div
                  className={`px-3 py-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between ${
                    darkMode
                      ? 'border-slate-800 bg-[#0F1C26] text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Ajuda e suporte
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 px-1">v1.0.0</p>
              </div>
            </aside>

            {/* Área Principal do Tablet */}
            <main className="flex-1 p-7 flex flex-col relative">
              <header className="flex items-start justify-between mb-6 relative">
                <div>
                  <h2 className="text-2xl font-extrabold">
                    Olá, {userProfile.greetingName}!
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tudo pronto para otimizar seu trabalho hoje?
                  </p>
                </div>

                <div className="flex items-center gap-3 relative">
                  <Bell className="w-5 h-5" />
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center ${
                        darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
                      }`}
                    >
                      {userProfile.initials}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {profileMenuOpen && renderProfileDropdownCard(false)}
                </div>
              </header>

              {renderMainScreenContent(true, false)}
            </main>
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 4: TELA DE CELULAR (APP NATIVO COM TAB BAR INFERIOR)
         ========================================================= */}
      {deviceView === 'mobile' && (
        <div className="flex-1 p-3 flex justify-center">
          <div
            className={`w-full max-w-[400px] rounded-[38px] border-[8px] border-[#1A242F] shadow-2xl flex flex-col justify-between overflow-hidden ${
              darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'
            }`}
          >
            <div className="p-5 flex-1 overflow-y-auto">
              {/* Barra de Status do iPhone */}
              <div className="flex items-center justify-between text-xs font-bold mb-4 px-1">
                <span>9:41</span>
                <span className="w-20 h-4 rounded-full bg-black" />
                <span>5G 100%</span>
              </div>

              {/* Topo Mobile com Logo + Sino + Avatar MD */}
              <div className="flex items-center justify-between mb-5 relative">
                <VetaroLogo size={26} dark={darkMode} textSize="text-xl" />
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5" />
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${
                      darkMode ? 'bg-white text-[#0A141D]' : 'bg-[#1E2D3D] text-white'
                    }`}
                  >
                    {userProfile.initials}
                  </button>
                </div>
                {profileMenuOpen && renderProfileDropdownCard(false)}
              </div>

              <div className="mb-5">
                <h2 className="text-2xl font-extrabold">
                  Olá, {userProfile.greetingName}!
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tudo pronto para otimizar seu trabalho hoje?
                </p>
              </div>

              {renderMainScreenContent(false, true)}
            </div>

            {/* Barra de Navegação Inferior do Celular (Igual à Foto 1) */}
            <div
              className={`border-t py-3 px-6 flex items-center justify-around text-xs font-bold ${
                darkMode
                  ? 'bg-[#0C1720] border-slate-800 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <button
                onClick={() => setActiveNav('inicio')}
                className={`flex flex-col items-center gap-1 ${
                  activeNav === 'inicio' ? 'text-[#00D296]' : ''
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Início</span>
              </button>
              <button
                onClick={() => setActiveNav('ultrassom')}
                className={`flex flex-col items-center gap-1 ${
                  activeNav === 'ultrassom' || activeNav === 'relatorio'
                    ? 'text-[#00D296]'
                    : ''
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Histórico</span>
              </button>
              <button
                onClick={() => setActiveNav('configuracoes')}
                className={`flex flex-col items-center gap-1 ${
                  activeNav === 'configuracoes' ? 'text-[#00D296]' : ''
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Configurações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 5: GUIA DE IDENTIDADE VISUAL & ESPECIFICAÇÕES (COMPUTADOR / TABLET / CELULAR)
         ========================================================= */}
      {deviceView === 'specs' && (
        <div className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#00D296]">
              Design System Oficial • vetaro
            </span>
            <h2 className="text-2xl font-extrabold mt-1">
              Cores, Tipografia e Regras para Computador, Tablet e Celular
            </h2>
          </div>

          {/* Paleta de Cores Clicável */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {BRAND_COLORS.map((color) => (
              <div
                key={color.hex}
                onClick={() => handleCopyHex(color.hex)}
                className={`p-4 rounded-2xl border cursor-pointer transition hover:scale-[1.02] ${
                  darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className="w-full h-16 rounded-xl mb-3 border border-black/10"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">{color.hex}</span>
                  {copiedHex === color.hex ? (
                    <Check className="w-4 h-4 text-[#00D296]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <p className="text-xs font-bold mt-1">{color.name}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {color.usage}
                </p>
              </div>
            ))}
          </div>

          {/* Comparativo Técnico das 3 Telas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-5 rounded-2xl border space-y-2 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[#00D296] font-extrabold text-sm">
                <Monitor className="w-4 h-4" />
                <span>Tela de Computador (Desktop ≥ 1024px)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Sidebar Esquerda Fixa (256px):</strong> Contém botões de janela,
                logo Vetaro, 4 rotas principais com indicador vertical verde (4px) e card
                inferior <em>Ajuda e suporte ↗ v1.0.0</em>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Cards Lado a Lado (Grid 2 Colunas):</strong> Cards de Ultrassom e
                Relatório dividem 50%/50% da largura com ícone de 56x56px no topo.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Tabela Completa:</strong> Exibe a seção <em>Atividade recente</em>{' '}
                logo abaixo dos cards com data/hora por extenso e badge <em>Concluído</em>.
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border space-y-2 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[#00D296] font-extrabold text-sm">
                <Tablet className="w-4 h-4" />
                <span>Tela de Tablet / iPad (768px – 1023px)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Sidebar Mantida (208px):</strong> Mantém a coluna esquerda visível
                para navegação rápida com o toque.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Cards Horizontais Empilhados:</strong> Os cards de Ultrassom e
                Relatório ocupam 100% da largura cada um, posicionando o ícone grande
                (80x80px) à esquerda e o título + descrição + botão à direita.
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border space-y-2 ${
                darkMode ? 'bg-[#0F1C26] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[#00D296] font-extrabold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Tela de Celular (&lt; 768px)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Tab Bar Inferior Fixa:</strong> A sidebar esquerda é substituída
                por uma barra inferior com 3 abas: <em>Início</em>, <em>Histórico</em> e{' '}
                <em>Configurações</em>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Topo Compacto:</strong> Logo Vetaro à esquerda, ícone de sino e
                avatar <code>MD</code> à direita.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE VISUALIZAÇÃO DE LAUDO DA TABELA "ATIVIDADE RECENTE"
         ========================================================= */}
      {selectedReport && (
        <div
          onClick={() => setSelectedReport(null)}
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
              darkMode
                ? 'bg-[#121E28] border-slate-700 text-white'
                : 'bg-white border-slate-200 text-[#0A141D]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#00D296]/15 text-[#00D296]">
                  {selectedReport.status}
                </span>
                <h3 className="text-lg font-extrabold mt-2">{selectedReport.title}</h3>
                <p className="text-xs text-slate-400">
                  {selectedReport.patient} • {selectedReport.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                darkMode
                  ? 'bg-[#0A141D] border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {selectedReport.summary}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  showToast('PDF baixado com sucesso!');
                  setSelectedReport(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B] flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          NOTIFICAÇÃO FLUTUANTE (TOAST)
         ========================================================= */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 bg-[#0D5C56] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#00D296]/40 flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#00D296] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
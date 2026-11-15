import React from 'react';

export const CloudUploadVetaroIcon = ({ className = 'w-12 h-12' }) => (
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

export const SurgicalFilePulseIcon = ({ className = 'w-11 h-11' }) => (
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

export const CameraSolidIcon = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M9.4 4.5C8.87 4.5 8.37 4.78 8.1 5.24L7.05 7H4.5C3.12 7 2 8.12 2 9.5V18C2 19.38 3.12 20.5 4.5 20.5H19.5C20.88 20.5 22 19.38 22 18V9.5C22 8.12 20.88 7 19.5 7H16.95L15.9 5.24C15.63 4.78 15.13 4.5 14.6 4.5H9.4ZM12 17C9.79 17 8 15.21 8 13C8 10.79 9.79 9 12 9C14.21 9 16 10.79 16 13C16 15.21 14.21 17 12 17Z" />
  </svg>
);

export const VetaroLogo = ({ size = 32, dark = false, showText = true, textSize = 'text-2xl' }) => (
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

export const UltrasoundIcon = ({ className = 'w-6 h-6', strokeWidth = 2 }) => (
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

export const PlanBoxIcon = ({ className = 'w-5 h-5' }) => (
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

export const MoonStarIcon = ({ className = 'w-5 h-5' }) => (
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

export const CardWaveBackground = ({ dark }) => (
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

export const BRAND_COLORS = [
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

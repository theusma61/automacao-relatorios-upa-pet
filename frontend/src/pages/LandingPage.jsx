import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  Check,
  ChevronDown,
  Edit3,
  Infinity as InfinityIcon,
  Cloud,
  User,
  Stethoscope,
  Building2,
  Headphones,
  Instagram,
  Youtube,
  Linkedin,
  Sun,
  Moon,
  X,
  FileText,
  Sparkles,
  Bell
} from 'lucide-react';
import { VetaroLogo, UltrasoundIcon } from '../components/icons/VetaroIcons';

export default function LandingPage({
  darkMode,
  setDarkMode,
  onStartFree,
  onLogin,
  onOpenSupport
}) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSent(true);
    setTimeout(() => {
      setNewsletterEmail('');
      setNewsletterSent(false);
    }, 3000);
  };

  const faqItems = [
    {
      q: 'Preciso cadastrar o cartão de crédito para testar?',
      a: 'Não! Você ganha 10 laudos gratuitos imediatamente após o cadastro, sem precisar informar cartão de crédito ou ter qualquer compromisso financeiro. Você só assina um plano se o sistema realmente economizar seu tempo.'
    },
    {
      q: 'Como a Vetaro garante que o laudo sai no meu padrão?',
      a: 'Nossa inteligência artificial foi treinada no fluxo de trabalho veterinário e aprende com os modelos institucionais e o seu estilo de redação. Ela identifica calipers e medidas na tela do Mindray, extrai o paciente e gera o documento formatado exatamente na estrutura anatômica que você utiliza.'
    },
    {
      q: 'Por quanto tempo os laudos gerados ficam salvos?',
      a: 'Seus arquivos, imagens e documentos em Word (.docx) e PDF ficam salvos com segurança em nuvem por no mínimo 30 dias (ou permanentemente no plano Especialista Pro), permitindo consultar, reenviar ou revisar sem precisar reanalisar do zero.'
    },
    {
      q: 'Posso cancelar a assinatura a qualquer momento?',
      a: 'Sim, com total liberdade! Não há fidelidade nem multas contratuais. O cancelamento pode ser feito com apenas um clique diretamente no seu painel de configurações.'
    }
  ];

  return (
    <div
      style={{ fontFamily: "'Manrope', sans-serif" }}
      className={`min-h-screen transition-colors duration-300 selection:bg-[#00D296]/30 ${
        darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#FAFCFC] text-[#0A141D]'
      }`}
    >
      {/* Elemento de Brilho / Aura no Topo Direito (Fiel ao Mockup) */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-[#00D296]/15 via-[#00D296]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================= */}
      {/* 1. NAVBAR SUPERIOR                                        */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-200 border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0A141D]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logotipo Vetaro */}
          <a href="#" className="cursor-pointer">
            <VetaroLogo size={34} dark={darkMode} textSize="text-2xl" />
          </a>

          {/* Links Centrais */}
          <nav className="hidden md:flex items-center gap-9 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a
              href="#recursos"
              className="hover:text-[#00D296] transition-colors cursor-pointer"
            >
              Recursos
            </a>
            <a
              href="#planos"
              className="hover:text-[#00D296] transition-colors cursor-pointer"
            >
              Planos
            </a>
            <a
              href="#duvidas"
              className="hover:text-[#00D296] transition-colors cursor-pointer"
            >
              Dúvidas
            </a>
          </nav>

          {/* Ações da Direita */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Toggle Dark/Light Mode */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Alternar modo de cor"
              className={`p-2 rounded-xl border transition ${
                darkMode
                  ? 'border-slate-800 bg-[#0F1C26] text-[#00D296] hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Botão Entrar */}
            <button
              type="button"
              onClick={onLogin}
              className="hidden sm:inline-block text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-[#00D296] px-2 py-2 transition"
            >
              Entrar
            </button>

            {/* CTA Começar Grátis */}
            <button
              type="button"
              onClick={onStartFree}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition shadow-sm ${
                darkMode
                  ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                  : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
              }`}
            >
              Começar grátis <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION COM MOCKUP REAL DA APLICAÇÃO              */}
      {/* ========================================================= */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Coluna Esquerda: Textos e CTAs */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.12]">
                <span className={darkMode ? 'text-white' : 'text-[#0A141D]'}>
                  Mais tempo cuidando.
                </span>
                <br />
                <span className="text-[#00D296]">Menos burocracia.</span>
              </h1>

              <div className="space-y-3 max-w-xl">
                <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  Gere laudos de ultrassom e relatórios cirúrgicos de alta precisão em segundos usando IA.
                </p>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  A Vetaro aprende o seu padrão de escrita e entrega o documento pronto no seu estilo.
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={onStartFree}
                  className={`px-6 py-3.5 rounded-full text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 transition shadow-md ${
                    darkMode
                      ? 'bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]'
                      : 'bg-[#0D5C56] text-white hover:bg-[#094742]'
                  }`}
                >
                  Começar grátis sem cartão <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </button>

                <button
                  type="button"
                  onClick={() => setDemoModalOpen(true)}
                  className={`px-5 py-3.5 rounded-full text-xs sm:text-sm font-bold border inline-flex items-center gap-2 transition ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#00D296]/20 text-[#00D296] flex items-center justify-center">
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </span>
                  Ver demonstração (15s)
                </button>
              </div>

              {/* Micro-copy de Confiança */}
              <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="text-[#00D296] text-sm">✦</span>
                <span>10 laudos gratuitos para testar · Não precisa de cartão de crédito</span>
              </div>
            </div>

            {/* Coluna Direita: Mockup Visual da Interface (Fiel à Imagem 1) */}
            <div className="lg:col-span-6 relative">
              {/* Brilho decorativo atrás do card */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#00D296]/20 to-[#0D5C56]/20 rounded-3xl blur-xl opacity-70" />

              {/* Card Flutuante Mockup */}
              <div
                className={`relative rounded-3xl border shadow-2xl p-5 sm:p-7 overflow-hidden transition-all duration-300 ${
                  darkMode
                    ? 'bg-[#0F1C26] border-slate-800 text-white'
                    : 'bg-white border-slate-200/90 text-[#0A141D]'
                }`}
              >
                {/* Topo do Mockup (Logo + Notificação + Avatar) */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="ml-2">
                      <VetaroLogo size={22} dark={darkMode} textSize="text-sm" />
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#637692] text-white flex items-center justify-center text-[10px] font-extrabold shadow-inner">
                      MD
                    </div>
                  </div>
                </div>

                {/* Saudação ao Médico */}
                <div className="mt-5 mb-6">
                  <h3 className="text-lg font-extrabold tracking-tight">Olá, Dra. Mariana!</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tudo pronto para otimizar seu trabalho hoje?
                  </p>
                </div>

                {/* Estrutura Interna: Mini Sidebar + 2 Cards de Ação */}
                <div className="grid grid-cols-12 gap-3.5">
                  {/* Mini Sidebar Lateral */}
                  <div className="col-span-4 space-y-1 pr-1 border-r border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#00D296]/15 text-[#00D296] text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D296]" />
                      <span>Início</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 text-xs font-medium">
                      <UltrasoundIcon className="w-3.5 h-3.5" />
                      <span className="truncate">Ultrassom</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 text-xs font-medium">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">Relatório</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 text-xs font-medium">
                      <span className="text-[11px]">⚙</span>
                      <span className="truncate">Configurações</span>
                    </div>
                  </div>

                  {/* 2 Cards de Ação Rápidos (Ultrassom e Relatório) */}
                  <div className="col-span-8 space-y-3">
                    {/* Card Ultrassom */}
                    <div
                      className={`p-3.5 rounded-2xl border transition ${
                        darkMode
                          ? 'bg-[#132530] border-teal-500/20'
                          : 'bg-gradient-to-r from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-7 h-7 rounded-xl bg-[#00D296]/20 text-[#00D296] flex items-center justify-center">
                          <UltrasoundIcon className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-extrabold">Ultrassom</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                        Envie suas imagens e receba um laudo completo com IA.
                      </p>
                      <button
                        type="button"
                        onClick={onStartFree}
                        className="mt-2.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-[#0D5C56] text-white dark:bg-[#00D296] dark:text-[#062E2B] inline-flex items-center gap-1 shadow-xs"
                      >
                        Começar agora →
                      </button>
                    </div>

                    {/* Card Relatório Cirúrgico */}
                    <div
                      className={`p-3.5 rounded-2xl border transition ${
                        darkMode
                          ? 'bg-[#13232F] border-teal-500/20'
                          : 'bg-gradient-to-r from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-7 h-7 rounded-xl bg-[#00D296]/20 text-[#00D296] flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-extrabold">Relatório</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                        Envie seu documento e gere um relatório personalizado.
                      </p>
                      <button
                        type="button"
                        onClick={onStartFree}
                        className="mt-2.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-[#0D5C56] text-white dark:bg-[#00D296] dark:text-[#062E2B] inline-flex items-center gap-1 shadow-xs"
                      >
                        Começar agora →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. SEÇÃO DE DIFERENCIAIS (UMA IA QUE ESCREVE COMO VOCÊ)   */}
      {/* ========================================================= */}
      <section id="recursos" className="py-16 md:py-24 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header da Seção */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#00D296] mb-3">
              <span className="w-5 h-0.5 bg-[#00D296]" />
              <span>Uma IA que escreve exatamente como você</span>
              <span className="w-5 h-0.5 bg-[#00D296]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Construído para a rotina real de quem faz exames todos os dias
            </h2>
          </div>

          {/* Grid de 3 Cards de Diferenciais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1: Adaptação de Padrão */}
            <div
              className={`rounded-3xl border p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
                darkMode
                  ? 'bg-[#0F1C26] border-slate-800 hover:border-teal-500/30'
                  : 'bg-white border-slate-200/90 hover:border-[#00D296]/50'
              }`}
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D4F7EC] dark:bg-[#0E3A38] text-[#0D5C56] dark:text-[#00D296] flex items-center justify-center mb-6">
                  <Edit3 className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-lg font-extrabold mb-3">Adaptação de Padrão</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  A Vetaro identifica automaticamente o estilo, os termos técnicos e a estrutura de laudo que você já usa, garantindo que o texto final pareça ter sido escrito por você mesmo.
                </p>
              </div>
            </div>

            {/* Card 2: Relatórios Cirúrgicos Ilimitados */}
            <div
              className={`rounded-3xl border p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
                darkMode
                  ? 'bg-[#0F1C26] border-slate-800 hover:border-teal-500/30'
                  : 'bg-white border-slate-200/90 hover:border-[#00D296]/50'
              }`}
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D4F7EC] dark:bg-[#0E3A38] text-[#0D5C56] dark:text-[#00D296] flex items-center justify-center mb-6">
                  <InfinityIcon className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-lg font-extrabold mb-3">Relatórios Cirúrgicos Ilimitados</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Esqueça digitações repetitivas. Crie e personalize relatórios cirúrgicos sem limites de quantidade a cada mês, com áudio do WhatsApp ou ficha resumida.
                </p>
              </div>
            </div>

            {/* Card 3: Histórico Seguro por 30 Dias */}
            <div
              className={`rounded-3xl border p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
                darkMode
                  ? 'bg-[#0F1C26] border-slate-800 hover:border-teal-500/30'
                  : 'bg-white border-slate-200/90 hover:border-[#00D296]/50'
              }`}
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D4F7EC] dark:bg-[#0E3A38] text-[#0D5C56] dark:text-[#00D296] flex items-center justify-center mb-6">
                  <Cloud className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-lg font-extrabold mb-3">Histórico Seguro por 30 Dias</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Seus arquivos e laudos gerados ficam salvos e disponíveis por 30 dias na nuvem. Se precisar revisar ou reenviar para o tutor, não é preciso regerar do zero.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SEÇÃO DE PLANOS E PREÇOS (FIEL AO DESIGN DA IMAGEM)     */}
      {/* ========================================================= */}
      <section id="planos" className="py-16 md:py-24 bg-slate-50/70 dark:bg-[#09141D] border-t border-slate-200/70 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Lado Esquerdo: Título e Switcher Mensal/Anual */}
            <div className="lg:col-span-4 space-y-5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#00D296]">
                <span className="w-5 h-0.5 bg-[#00D296]" />
                <span>Planos e preços</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Escolha o plano ideal para sua rotina
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Planos flexíveis, pensados para profissionais que buscam praticidade e eficiência.
              </p>

              {/* Toggle de Ciclo de Cobrança: Mensal / Anual */}
              <div className="pt-2">
                <div className="inline-flex items-center p-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1C26] shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsAnnual(false)}
                    className={`px-4 py-2 rounded-full text-xs font-extrabold transition ${
                      !isAnnual
                        ? 'bg-[#0D5C56] text-white dark:bg-[#00D296] dark:text-[#062E2B] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#00D296]'
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAnnual(true)}
                    className={`px-4 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 ${
                      isAnnual
                        ? 'bg-[#0D5C56] text-white dark:bg-[#00D296] dark:text-[#062E2B] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#00D296]'
                    }`}
                  >
                    <span>Anual</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00D296]/20 text-[#00A878] dark:text-[#00D296] font-bold">
                      Economize 20%
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lado Direito: 3 Cards de Planos */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Solo / Volante */}
              <div
                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 ${
                  darkMode
                    ? 'bg-[#0F1C26] border-slate-800'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#D4F7EC] dark:bg-[#0E3A38] text-[#0D5C56] dark:text-[#00D296] flex items-center justify-center mb-4">
                    <User className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-base font-extrabold">Solo / Volante</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mb-4">Ideal para autônomos</p>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold">
                      R$ {isAnnual ? '63' : '79'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold"> /mês</span>
                    {isAnnual && (
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1">
                        Faturado anualmente (R$ 756/ano)
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Até 40 laudos de ultrassom/mês</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Histórico salvo por 30 dias</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Relatórios cirúrgicos ilimitados</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={onStartFree}
                    className="w-full py-2.5 rounded-full text-xs font-extrabold border border-slate-300 dark:border-slate-700 hover:border-[#00D296] text-slate-700 dark:text-slate-200 hover:text-[#00D296] transition flex items-center justify-center gap-1.5"
                  >
                    Começar grátis <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 2: Especialista Pro (CARD MAIS POPULAR / DESTAQUE) */}
              <div
                className={`relative rounded-3xl border-2 p-6 flex flex-col justify-between transition-all duration-300 shadow-xl scale-100 md:scale-105 z-10 ${
                  darkMode
                    ? 'bg-[#12232F] border-[#00D296]'
                    : 'bg-white border-[#00D296]'
                }`}
              >
                {/* Badge Flutuante "Mais popular" */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00D296] text-[#062E2B] text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                  Mais popular
                </div>

                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#00D296]/20 text-[#00D296] flex items-center justify-center mb-4 mt-1">
                    <Stethoscope className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-base font-extrabold">Especialista Pro</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mb-4">Ideal para ultrassonografistas</p>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold">
                      R$ {isAnnual ? '119' : '149'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold"> /mês</span>
                    {isAnnual && (
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1">
                        Faturado anualmente (R$ 1.428/ano)
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Até 150 laudos de ultrassom/mês</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Histórico em nuvem por 30 dias</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Relatórios cirúrgicos ilimitados e IA personalizada</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={onStartFree}
                    className="w-full py-2.5 rounded-full text-xs font-extrabold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    Começar com Pro <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Card 3: Clínica & Hospital 24h */}
              <div
                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 ${
                  darkMode
                    ? 'bg-[#0F1C26] border-slate-800'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#D4F7EC] dark:bg-[#0E3A38] text-[#0D5C56] dark:text-[#00D296] flex items-center justify-center mb-4">
                    <Building2 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-base font-extrabold">Clínica & Hospital 24h</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mb-4">Ideal para clínicas e hospitais</p>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold">
                      R$ {isAnnual ? '237' : '297'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold"> /mês</span>
                    {isAnnual && (
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1">
                        Faturado anualmente (R$ 2.844/ano)
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Até 500 laudos de ultrassom/mês</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Até 5 veterinários (Multi-usuário)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#00D296] shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>Logomarca e assinatura individuais</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="w-full py-2.5 rounded-full text-xs font-extrabold border border-slate-300 dark:border-slate-700 hover:border-[#00D296] text-slate-700 dark:text-slate-200 hover:text-[#00D296] transition flex items-center justify-center gap-1.5"
                  >
                    Falar com a gente <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. SEÇÃO DE DÚVIDAS FREQUENTES (FAQ)                      */}
      {/* ========================================================= */}
      <section id="duvidas" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Lado Esquerdo */}
            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#00D296]">
                <span className="w-5 h-0.5 bg-[#00D296]" />
                <span>Dúvidas frequentes</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Respondemos as principais dúvidas
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Ainda tem alguma pergunta? Fale com a nossa equipe de suporte.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className={`px-5 py-3 rounded-full text-xs sm:text-sm font-bold border inline-flex items-center gap-2 transition ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Headphones className="w-4 h-4 text-[#00D296]" />
                  <span>Falar com a gente</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>

            {/* Lado Direito: Accordion */}
            <div className="lg:col-span-7 space-y-3">
              {faqItems.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      darkMode
                        ? 'bg-[#0F1C26] border-slate-800'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm transition hover:text-[#00D296]"
                    >
                      <span className="leading-snug">{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#00D296]' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. FOOTER INSTITUCIONAL (RODAPÉ ESCURO FIEL À IMAGEM)     */}
      {/* ========================================================= */}
      <footer className="bg-[#08131C] text-slate-400 pt-16 pb-10 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
            {/* Coluna 1: Logo, Slogan e Redes Sociais */}
            <div className="md:col-span-4 space-y-4">
              <VetaroLogo size={32} dark={true} textSize="text-xl" />
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Inteligência para a medicina veterinária.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-lg bg-white/5 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-[#00D296] transition"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-lg bg-white/5 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-[#00D296] transition"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-lg bg-white/5 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-[#00D296] transition"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Coluna 2: Produto */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                Produto
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#recursos" className="hover:text-white transition">
                    Recursos
                  </a>
                </li>
                <li>
                  <a href="#planos" className="hover:text-white transition">
                    Planos
                  </a>
                </li>
                <li>
                  <a href="#duvidas" className="hover:text-white transition">
                    Dúvidas
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Institucional */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                Institucional
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="hover:text-white transition cursor-pointer">
                    Sobre a Vetaro
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition cursor-pointer">
                    Termos de uso
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition cursor-pointer">
                    Política de privacidade
                  </span>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Newsletter */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                Receba novidades da Vetaro
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fique por dentro das atualizações e lançamentos da plataforma.
              </p>

              <form onSubmit={handleNewsletterSubmit} className="relative mt-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  required
                  className="w-full py-2.5 pl-4 pr-12 rounded-full bg-[#0E1E2B] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D296]"
                />
                <button
                  type="submit"
                  aria-label="Inscrever-se"
                  className="absolute right-1.5 top-1.5 w-8 h-8 rounded-full bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition flex items-center justify-center font-bold shadow-xs"
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>

              {newsletterSent && (
                <p className="text-[11px] text-[#00D296] font-bold">
                  ✓ Obrigado por se inscrever!
                </p>
              )}
            </div>
          </div>

          {/* Linha Final de Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <p>© 2026 Vetaro. Todos os direitos reservados.</p>
            <p className="text-slate-600">Desenvolvido com excelência médica e tecnológica.</p>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 7. MODAL DE DEMONSTRAÇÃO (15s)                            */}
      {/* ========================================================= */}
      {demoModalOpen && (
        <div
          onClick={() => setDemoModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-3xl border p-6 sm:p-8 space-y-5 shadow-2xl relative ${
              darkMode
                ? 'bg-[#0F1C26] border-slate-800 text-white'
                : 'bg-white border-slate-200 text-[#0A141D]'
            }`}
          >
            <button
              type="button"
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-[#00D296]">
              <Sparkles className="w-4 h-4" />
              <span>Demonstração Rápida (15 segundos)</span>
            </div>

            <h3 className="text-xl font-extrabold">Como a Vetaro automatiza seus exames</h3>

            <div className="space-y-3 text-xs sm:text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-[#00D296]/10 border border-[#00D296]/20 space-y-2">
                <p className="font-bold text-[#0A141D] dark:text-white">
                  1. Envie as fotos do ultrassom (Mindray ou outros):
                </p>
                <p className="text-xs">
                  O sistema lê as fotos da tela, separa automaticamente o nome do paciente do nome do tutor, lê os calipers e medidas métricas dos órgãos.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#00D296]/10 border border-[#00D296]/20 space-y-2">
                <p className="font-bold text-[#0A141D] dark:text-white">
                  2. A IA gera a pré-análise anatômica completa:
                </p>
                <p className="text-xs">
                  Fígado, vesícula, rins, baço, TGI e bexiga organizados na ordem canônica da clínica em menos de 15 segundos.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#00D296]/10 border border-[#00D296]/20 space-y-2">
                <p className="font-bold text-[#0A141D] dark:text-white">
                  3. Baixe em Word (.docx) ou PDF oficial com 1 clique:
                </p>
                <p className="text-xs">
                  Seu logotipo, CRMV e assinatura digital já inseridos e prontos para enviar no WhatsApp do tutor ou colega cirurgião.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDemoModalOpen(false);
                  onStartFree();
                }}
                className="px-6 py-3 rounded-full text-xs font-extrabold bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4] transition flex items-center gap-2 shadow-md"
              >
                Testar 10 laudos grátis agora <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

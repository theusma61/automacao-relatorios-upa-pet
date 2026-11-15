# 🎨 Vetaro Design System & Guia Oficial de Identidade Visual

> **Produto:** Vetaro — Plataforma SaaS de Laudos de Ultrassonografia e Relatórios Cirúrgicos Veterinários com IA  
> **Slogan Institucional:** *"Tecnologia que cuida."*  
> **Versão:** 1.0 (Especificação Canônica para React + Tailwind CSS — Modo Claro & Modo Escuro)  
> **Regra de Ouro para Desenvolvedores e Agentes de IA:** Qualquer nova tela, modal, componente ou refatoração de frontend no ecossistema Vetaro **deve seguir estritamente** os tokens de cor, tipografia, raios de borda, ícones SVG e regras responsivas (Desktop, Tablet e Mobile) documentados neste guia.

## 1. Paleta de Cores Oficial e Tokens Semânticos (Modo Escuro & Modo Claro)

A identidade visual da **Vetaro** foi projetada com suporte nativo a dois temas (**Dark Mode** como tema de destaque tecnológico e **Light Mode** como tema clínico diurno), acionados pela estratégia `darkMode: 'class'` do Tailwind CSS (`<html class="dark">`).

### 1.1. As 5 Cores Institucionais da Marca (`BRAND_COLORS`)

| Nome Oficial | Hexadecimal | Papel Semântico | Uso no Modo Escuro (`dark`) | Uso no Modo Claro (`light`) |
| :--- | :---: | :--- | :--- | :--- |
| **Emerald Vetaro** | `#00D296` | Primária IA & Ação | Cor de fundo dos botões principais (`text-[#062E2B]`), indicadores ativos na sidebar, badges e ícones de destaque | Indicadores ativos (barra lateral de 4px), acentos de ícones, toggles ativos e detalhes gráficos |
| **Deep Teal** | `#0D5C56` | Institucional Clínico | Base escura de gradientes e fundo de toasts | Cor de fundo dos botões principais (`text-white`), links de ação, badges e ícones em superfícies claras |
| **Midnight Navy** | `#0A141D` | Base Profunda / Texto | Fundo principal da aplicação (`bg-[#0A141D]`) e de inputs internos | Cor principal da tipografia (`text-[#0A141D]`) e ícones de alto contraste |
| **Clinical Slate** | `#637692` | Neutro Clínico & Avatar | Textos secundários, metadados de data/hora e fundo circular do avatar de iniciais (`MD`) | Subtítulos, datas na tabela de atividades e fundo do avatar de iniciais (`MD`) |
| **Pure Ice** | `#F8FAFC` | Superfície Clara | Texto de alto contraste sobre botões escuros | Fundo principal da aplicação (`bg-[#F8FAFC]` / `#F1F6F8`) e áreas internas de cartões |

### 1.2. Matriz Completa de Superfícies, Bordas e Estados por Tema

| Elemento / Superfície | Token no Modo Escuro (`darkMode = true`) | Token no Modo Claro (`darkMode = false`) |
| :--- | :--- | :--- |
| **Fundo Geral da Página (`body` / App)** | `bg-[#0A141D] text-white` | `bg-[#F8FAFC] text-[#0A141D]` |
| **Sidebar Fixa (Desktop & Tablet) / Tab Bar (Mobile)** | `bg-[#0C1720] border-slate-800` | `bg-white border-slate-200` |
| **Item Ativo na Sidebar** | `bg-[#0D3131] text-[#00D296]` + barra esquerda `w-1 bg-[#00D296]` | `bg-[#DDF7F0] text-[#0D5C56]` + barra esquerda `w-1 bg-[#00D296]` |
| **Item Inativo na Sidebar** | `text-slate-300 hover:bg-white/5` | `text-slate-600 hover:bg-slate-100` |
| **Card Hero 1 — Ultrassom (Gradiente)** | `bg-gradient-to-br from-[#132530] to-[#0E3130] border-teal-500/20` | `bg-gradient-to-br from-[#E4F8F2] to-[#D5F4EC] border-[#C5EFE3]` |
| **Card Hero 2 — Relatório Cirúrgico (Gradiente)** | `bg-gradient-to-br from-[#13232F] to-[#0F2C30] border-teal-500/20` | `bg-gradient-to-br from-[#EAF6F6] to-[#DDF1F0] border-[#D0EAE8]` |
| **Container do Ícone nos Cards Hero** | `bg-[#0E3A38] text-[#00D296]` | Ultrassom: `bg-[#C4F1E3] text-[#00A878]` / Relatório: `bg-[#CBEFE4] text-[#0D5C56]` |
| **Botão Pílula nos Cards Hero ("Começar agora →")** | `bg-[#00D296] text-[#062E2B] hover:bg-[#00e6a4]` | `bg-[#0D5C56] text-white hover:bg-[#094742]` |
| **Painéis Internos / Formulários / Configurações** | `bg-[#0F1C26] border-[#1E3545]` (ou `border-slate-800`) | `bg-white border-slate-200` |
| **Tabela "Atividade recente" (Container & Divisórias)** | `bg-[#0E1A24] border-slate-800/90 divide-slate-800/80` | `bg-white border-slate-200 divide-slate-100` |
| **Badge de Status "Concluído"** | `bg-[#0D4A3E] text-[#2CE5B1]` | `bg-[#D3F7E9] text-[#0D684E]` |
| **Dropzone Tracejada Principal (Mindray / Ficha)** | `bg-[#1A2B38]/85 border-[#3A566E] hover:border-[#00D296] hover:bg-[#162936]` | `bg-[#E9F5F2]/80 border-[#89B8B0] hover:border-[#0D5C56] hover:bg-[#DEF2EC]` |
| **Dropzone Secundária (Fotos Intraoperatórias Pág. 2)** | `bg-[#0C1822]/90 border-[#24394B] hover:border-[#00D296]` | `bg-[#F5F9FA] border-slate-300 hover:border-[#0D5C56]` |
| **Botão CTA Largo ("Gerar Laudo / Relatório com IA")** | `bg-gradient-to-r from-[#00D296] to-[#00B884] text-[#052925]` | `bg-gradient-to-r from-[#0D5C56] to-[#00A878] text-white` |
| **Menu Dropdown do Perfil (`MD`) e Modais** | `bg-[#121E28] border-[#243647] text-white shadow-black/80` | `bg-white border-slate-200 text-[#0A141D] shadow-slate-900/20` |
| **Inputs, Selects e Textareas** | `bg-[#0A141D] border-slate-700 text-white` | `bg-slate-50 border-slate-200 text-[#0A141D]` |

## 2. Tipografia Oficial (`Manrope`)

A fonte oficial de toda a plataforma web/app é a **Manrope** (Google Fonts), escolhida pela sua geometria moderna, excelente legibilidade clínica em números/medidas (`0,12 cm`, `CRMV-SP 48.291`) e forte impacto visual nos pesos `700` e `800`.

* **Importação Obrigatória no `index.html`:**
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ```
* **Configuração no `tailwind.config.js`:**
  ```javascript
  fontFamily: {
    sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
  }
  ```
* **Escala Hierárquica:**
  * **Saudação do Dashboard (`Olá, Dra. Mariana!`):** `text-3xl font-extrabold tracking-tight` (Desktop), `text-2xl font-extrabold` (Tablet/Mobile).
  * **Títulos de Módulos e Cards Principais (`Ultrassom`, `Relatório`, `Laudo de Ultrassonografia Abdominal`):** `text-lg sm:text-xl font-extrabold tracking-tight`.
  * **Títulos de Seção (`Atividade recente`):** `text-base font-extrabold`.
  * **Labels de Seção Técnica (`1. FICHA CIRÚRGICA OU ÁUDIO`):** `text-[11px] sm:text-xs font-extrabold uppercase tracking-wider`.
  * **Corpo e Descrições de Cards:** `text-xs sm:text-sm font-medium leading-relaxed` (`text-slate-300` no Dark / `text-[#3F5368]` ou `text-[#52657A]` no Light).
  * **Nota Importante sobre Documentos Exportados (PDF / DOCX):** A fonte `Manrope` é exclusiva da **interface SaaS Vetaro**. Os documentos médicos compilados em PDF e Word (`.docx`) continuam respeitando a fonte configurada no Editor de Layout do médico (padrão `Calibri 11pt` corpo e `14pt` título) para preservar a **1ª Regra Pétrea (Página Única A4)**.

## 3. Logotipo Vetaro & Biblioteca de Ícones Customizados

O sistema combina ícones da biblioteca **`lucide-react`** (`Home`, `FileText`, `Settings`, `Bell`, `ChevronDown`, `ArrowRight`, `HelpCircle`, `ArrowUpRight`, `MoreHorizontal`, `User`, `CreditCard`, `LogOut`, `CheckCircle2`, `Download`, `Stethoscope`, `Palette`, `Wand2`) com **7 componentes SVG proprietários**:

1. **`<VetaroLogo size={32} dark={darkMode} showText={true} />`:**
   - Símbolo em "V" entrelaçado com dois gradientes lineares (`#00D296` ➔ `#0D5C56` na haste esquerda; `#00E6A4` ➔ `#097969` na haste direita) acompanhado do wordmark **`vetaro`** em caixa baixa (`font-extrabold tracking-tight`).
2. **`<UltrasoundIcon />`:**
   - Ícone de ondas acústicas / transdutor usado no menu lateral e no card de Ultrassom.
3. **`<CardWaveBackground dark={darkMode} />`:**
   - Arte vetorial abstrata posicionada em `absolute right-0 top-0 h-full w-3/4 pointer-events-none` no fundo dos cards de Ultrassom e Relatório, com círculos e ondas translúcidas em `#00D296` e `#0D5C56`.
4. **`<CloudUploadVetaroIcon />`:**
   - Ícone de nuvem com preenchimento translúcido (`fillOpacity="0.18"`) e seta de upload para a dropzone de imagens do aparelho Mindray.
5. **`<SurgicalFilePulseIcon />`:**
   - Ícone de documento cirúrgico com linha de pulso/ECG no centro para a dropzone de ficha cirúrgica ou áudio.
6. **`<CameraSolidIcon />`:**
   - Ícone sólido de câmera fotográfica para o anexo de fotos intraoperatórias (Página 2).
7. **`<PlanBoxIcon />` e `<MoonStarIcon />`:**
   - Ícones customizados do menu dropdown do perfil (`Plano e assinatura` e `Modo claro`).

## 4. Arquitetura Responsiva nos 3 Dispositivos (Desktop, Tablet e Mobile)

A interface Vetaro possui comportamentos estruturais distintos em cada faixa de tela, eliminando qualquer transbordo horizontal:

| Breakpoint | Navegação Principal | Disposição dos Cards Hero (`Início`) | Cabeçalho Superior |
| :--- | :--- | :--- | :--- |
| **Desktop (`>= 1024px` / `lg`)** | **Sidebar Esquerda Fixa (`w-64` / `256px`)** com logo, 4 itens (`Início`, `Ultrassom`, `Relatório`, `Configurações`) e card rodapé `Ajuda e suporte ↗ v1.0.0`. | **Grid de 2 Colunas (`grid-cols-2 gap-6`)** lado a lado (50% / 50%), com ícone `56x56px` (`w-14 h-14`) acima do título. | Saudação `text-3xl` à esquerda; sino de notificações com ponto `#00D296` + avatar circular `w-10 h-10` + chevron à direita. |
| **Tablet / iPad (`768px – 1023px` / `md`)** | **Sidebar Esquerda Compacta (`w-52` / `208px`)** mantida visível para navegação rápida por toque. | **Cards Horizontais Empilhados (`space-y-4`)**, ocupando 100% da largura cada, com ícone grande `80x80px` (`w-20 h-20`) à esquerda e texto + botão à direita. | Saudação `text-2xl` à esquerda; sino + avatar `w-9 h-9` à direita. |
| **Mobile (`< 768px` / `sm`)** | **Tab Bar Inferior Fixa** (`bg-[#0C1720]` Dark / `bg-white` Light) com 3 abas: `Início`, `Histórico` e `Configurações`. Sidebar oculta. | **Coluna Única Empilhada (`grid-cols-1 gap-4`)** com padding reduzido (`p-5`). | Barra compacta no topo com `<VetaroLogo />` à esquerda e sino + avatar `w-8 h-8` à direita; saudação logo abaixo. |

## 5. Padrões de Componentes e Microinterações

* **Raios de Borda (`Border Radius`):**
  * Cards principais, painéis de upload, tabela de atividades e menu dropdown: `rounded-2xl` (`16px`).
  * Botões de ação nos cards Hero ("Começar agora →") e badges de status ("Concluído"): `rounded-full`.
  * Botões largos de submissão ("Gerar Laudo Oficial com IA"), inputs e itens de navegação da sidebar: `rounded-xl` (`12px`).
* **Indicador de Aba Ativa na Sidebar:**
  * Toda rota ativa na sidebar exibe uma pílula vertical esquerda de `4px` (`w-1 rounded-r-full bg-[#00D296] absolute left-0 top-2 bottom-2`).
* **Switch Toggle de Modo Claro / Preferências:**
  * Trilho `w-12 h-6 rounded-full p-0.5` (`bg-[#00D296]` ou `bg-[#00A878]` quando ativo) com esfera branca `w-5 h-5 rounded-full bg-white shadow-md` animada via `translateX(22px)` / `translateX(2px)`.
* **Notificações Flutuantes (`Toast`):**
  * Posicionadas em `fixed bottom-4 right-4 z-50`, usando `bg-[#0D5C56] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#00D296]/40` e ícone `<CheckCircle2 className="w-4 h-4 text-[#00D296]" />`.

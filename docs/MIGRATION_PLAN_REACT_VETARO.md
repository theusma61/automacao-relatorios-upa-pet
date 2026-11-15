# 🚀 Plano Diretor de Migração do Frontend: Monolito HTML ➔ React + Vite (Identidade Visual Vetaro)

> **Projeto:** Vetaro SaaS (`vet-ultrasound-automation`)  
> **Escopo:** Extração do frontend legado (atualmente embutido como template string HTML/JS nas linhas 590–2200 de `servidor_web.js`) para uma aplicação **React 18 + Vite + Tailwind CSS + Lucide React** seguindo o **Vetaro Design System** (`DESIGN_SYSTEM_VETARO.md`), com suporte completo a **Modo Claro e Modo Escuro** sincronizado com o PostgreSQL (Prisma).  
> **Status do Backend:** Já migrado para PostgreSQL 16 + Prisma Multi-Tenant na branch `feat/postgres-multitenant`.

## 📑 Sumário Executivo das Fases

| Fase | Etapa | Escopo Técnico | Esforço Est. |
| :---: | :--- | :--- | :---: |
| **Fase 1** | **Setup React + Vite & Design Tokens Vetaro** | Criação da pasta `frontend/` (Vite + React + Tailwind + `lucide-react`), configuração da fonte `Manrope`, tokens Dark/Light e extração dos ícones SVG Vetaro. | 0.5 dia |
| **Fase 2** | **Layout Shell Responsivo & Tema Claro/Escuro** | Implementação de `<AppShell />` (Sidebar Desktop `256px`, Sidebar Tablet `208px`, Tab Bar Mobile), `<ProfileDropdown />` e `<ThemeProvider />` integrado a `/api/usuario/tema`. | 0.5 dia |
| **Fase 3** | **Migração das Telas Core (Início, Ultrassom e Cirurgia)** | Conexão do protótipo `vetaro_saas_identidade_visual.tsx` às rotas reais (`/api/historico`, `/api/ultrassom`, `/api/cirurgia`, `/api/modelos-cirurgicos` e `/api/layout-config`). | 1 dia |
| **Fase 4** | **Migração de Perfil, Assinatura, Config & RBAC Admin** | Integração das 3 abas do Menu de Perfil (`POST /api/perfil/profissional`, painel de plano/quotas, preferências de IA e modal `GET/POST /api/admin/usuarios`). | 0.5 dia |
| **Fase 5** | **Integração Express + Build Docker Multi-Stage** | Remoção das ~1.600 linhas de HTML inline de `servidor_web.js`, servindo `frontend/dist` no Express e ajustando o `Dockerfile` para build unificado. | 0.5 dia |

## 🔍 1. Diagnóstico: Frontend Atual (`servidor_web.js`) vs. Novo Frontend React (`Vetaro`)

Atualmente, `servidor_web.js` acumula duas responsabilidades no mesmo arquivo:
1. **Linhas 1–589:** Servidor Express, autenticação JWT/Google SSO, middlewares RBAC e endpoints REST (`/api/ultrassom`, `/api/cirurgia`, `/api/modelos-cirurgicos`, `/api/layout-config`, `/api/perfil/profissional`, `/api/usuario/tema`, `/api/historico`).
2. **Linhas 590–2200:** Uma única `res.send(\`<!DOCTYPE html>...\`)` de mais de 1.600 linhas contendo Tailwind via CDN, FontAwesome 6 e dezenas de funções globais em Vanilla JS, exigindo escaping manual (`\${...}`) que dificulta a manutenção.

Com o novo arquivo **`vetaro_saas_identidade_visual.tsx`**, você já possui toda a interface moderna construída em React com **Tailwind CSS** e **`lucide-react`**. O trabalho de migração consiste em **modularizar esse componente React em uma estrutura limpa (`frontend/src/`) e trocar os estados simulados (`setTimeout` / mocks) pelas chamadas `fetch` aos endpoints reais do backend PostgreSQL**.

## 🗂️ 2. Arquitetura de Pastas Proposta (`frontend/`)

```text
vet-ultrasound-automation/
├── prisma/
│   └── schema.prisma                  # Já configurado (PostgreSQL Multi-Tenant)
├── frontend/                          # NOVA APLICAÇÃO REACT (VITE)
│   ├── index.html                     # Carrega fonte Manrope + script anti-FOUC de tema
│   ├── package.json                   # react, react-dom, lucide-react, tailwindcss, vite
│   ├── vite.config.js                 # Proxy de /api, /downloads e /uploads -> localhost:3000
│   ├── tailwind.config.js             # darkMode: 'class', fontFamily: Manrope, cores Vetaro
│   └── src/
│       ├── main.jsx                   # Entrypoint React
│       ├── App.jsx                    # Roteamento de estado + Auth Guard + ThemeContext
│       ├── context/
│       │   ├── AuthContext.jsx        # Sessão (/api/auth/me, Google SSO, logout)
│       │   └── ThemeContext.jsx       # Sincroniza darkMode (localStorage + /api/usuario/tema)
│       ├── services/
│       │   └── api.js                 # Wrapper fetch para todos os endpoints do servidor_web.js
│       ├── components/
│       │   ├── icons/
│       │   │   └── VetaroIcons.jsx    # VetaroLogo, UltrasoundIcon, CardWaveBackground, CloudUploadVetaroIcon, SurgicalFilePulseIcon, CameraSolidIcon, PlanBoxIcon, MoonStarIcon
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx        # Sidebar Desktop (w-64) e Tablet (w-52)
│       │   │   ├── MobileTabBar.jsx   # Barra inferior mobile (Início, Histórico, Configurações)
│       │   │   ├── TopHeader.jsx      # Saudação dinâmica + Sino + Avatar com iniciais
│       │   │   ├── ProfileDropdown.jsx# Menu MD (Meu perfil, Plano e assinatura, Configurações, Modo claro, Sair)
│       │   │   └── Toast.jsx          # Notificação flutuante Vetaro (#0D5C56 / #00D296)
│       │   └── modals/
│       │       ├── ReportPreviewModal.jsx # Modal de detalhes e re-download PDF/DOCX
│       │       ├── ModeloCirurgicoModal.jsx # Criar, editar e clonar modelos cirúrgicos
│       │       ├── LayoutEditorDrawer.jsx # Gaveta/Modal de configuração tipográfica do PDF/DOCX
│       │       └── AdminUsersModal.jsx    # Gestão de cargos (admin, veterinario, assistente, pendente)
│       └── pages/
│           ├── LoginPage.jsx          # Tela de bloqueio Google Identity Services na estética Vetaro
│           ├── DashboardHome.jsx      # Cards Hero (Ultrassom e Relatório) + Tabela Atividade Recente
│           ├── UltrasoundGenerator.jsx# Dropzone Mindray (até 25 fotos) + Abas Pág. 1 / Pág. 2
│           ├── SurgeryGenerator.jsx   # Dropzone Ficha/Áudio + Fotos Pág. 2 + Biblioteca de Modelos
│           └── SettingsPage.jsx       # 3 Sub-abas: Meu Perfil, Plano e Assinatura, Configurações & IA
├── servidor_web.js                    # Backend Express enxuto (~350 linhas) servindo frontend/dist
└── docker-compose.yml
```

## 🌓 3. Planejamento do Modo Claro e Modo Escuro (Sincronização em 3 Camadas)

No protótipo `vetaro_saas_identidade_visual.tsx`, o estado `const [darkMode, setDarkMode] = useState(true)` controla o tema localmente. Na aplicação React final, o tema funcionará em **3 camadas sincronizadas** para nunca piscar a tela (zero FOUC) e persistir entre dispositivos no PostgreSQL:

1. **Camada 1 — Bootstrap Instantâneo no `frontend/index.html` (Antes do React montar):**
   - Lê `localStorage.getItem('tema_preferencia')` (`'dark'`, `'light'` ou `'system'`). Se ausente, assume `'dark'` como padrão institucional Vetaro (ou segue `prefers-color-scheme: dark`) e aplica a classe `dark` no `<html>` antes do primeiro paint.
2. **Camada 2 — `ThemeContext.jsx` no React:**
   - Expõe `{ darkMode, temaPreferencia, toggleDarkMode, setTema }`.
   - Ao alternar o switch **"Modo claro"** no `<ProfileDropdown />` ou na aba **Configurações & IA**, inverte `darkMode` imediatamente na UI (atualizando `document.documentElement.classList.toggle('dark', novoDark)` e o `localStorage`) para resposta em `0ms`.
3. **Camada 3 — Persistência Assíncrona no PostgreSQL (`usuarios.tema_preferencia`):**
   - No login (`GET /api/auth/me` ou `GET /api/usuario/tema`), carrega o `temaPreferencia` salvo no banco do médico e sincroniza o estado.
   - Sempre que o médico alternar o switch, dispara em background `POST /api/usuario/tema` com `{ tema: novoDark ? 'dark' : 'light' }`.

### Mapeamento de Classes para Componentes Novos vs. Protótipo:
Para manter o código React limpo e fiel ao `vetaro_saas_identidade_visual.tsx`, podemos preservar a prop/variável booleana `darkMode` do `useTheme()` nos componentes copiando **exatamente** as ternárias do seu arquivo `.tsx` (ex.: `darkMode ? 'bg-[#0A141D] text-white' : 'bg-[#F8FAFC] text-[#0A141D]'`), garantindo 100% de fidelidade pixel-perfect ao visual que você desenhou.

## 🔗 4. Mapeamento de Integração: Telas Vetaro (`.tsx`) ➔ Endpoints Reais (`servidor_web.js`)

### 4.1. Cabeçalho, Avatar de Iniciais e Menu Dropdown (`renderProfileDropdownCard`)
* **No protótipo `.tsx`:** Usa dados estáticos de `userProfile` (`Mariana Duarte`, iniciais `MD`, `CRMV-SP 48.291`).
* **No React integrado:**
  - Consome `usuario` do `AuthContext` (`GET /api/auth/me`).
  - Calcula as iniciais automaticamente a partir de `usuario.nome` (ex.: `"Dra. Camila Bastos"` ➔ `"CB"`, `"Matheus Augusto"` ➔ `"MA"`), ou exibe a foto do Google SSO (`usuario.foto`) com fallback para o círculo `#637692`.
  - Saudação dinâmica: `Olá, ${usuario.nome.split(' ')[0]}!`.
  - Botão **Sair** chama `POST /api/auth/logout` e limpa o estado de autenticação.
  - Se `usuario.role === 'admin'`, adiciona no menu um item extra **"Gerenciar Acessos (Admin)"** que abre o `<AdminUsersModal />` (`GET /api/admin/usuarios` e `POST /api/admin/usuarios/role`).

### 4.2. Tela 1: Dashboard Início (`activeNav === 'inicio'`)
* **2 Cards Hero (`Ultrassom` e `Relatório`):**
  - Mantêm exatamente o design com `<CardWaveBackground dark={darkMode} />`, alternando automaticamente para **cards horizontais com ícone `80x80px`** quando a largura da tela estiver na faixa Tablet (`768px <= width < 1024px`) e **grid de 2 colunas** no Desktop (`>= 1024px`).
* **Tabela "Atividade recente":**
  - Substitui `INITIAL_ACTIVITIES` pela chamada real `GET /api/historico` ao montar a tela.
  - Combina os arrays `exames` (`ExameLaudo`) e `cirurgias` (`RelatorioCirurgico`) retornados do PostgreSQL, ordenados por `criadoEm` decrescente:
    - `title`: `"Laudo de Ultrassom"` ou `"Relatório Cirúrgico — " + c.procedimento`
    - `patient`: `${item.pacienteNome} (${item.pacienteEspecie})`
    - `date`: `"Gerado em " + formatarDataHora(item.criadoEm)`
    - `status`: `"Concluído"`
    - `pdfUrl` / `docxUrl`: links diretos para `/downloads/:jobId/:filename`.
  - Ao clicar em uma linha, abre o modal de detalhes (`selectedReport`) com botões reais para baixar o **PDF** e o **Word (`.docx`)**.

### 4.3. Tela 2: Gerador de Ultrassom Mindray (`activeNav === 'ultrassom'`)
* **Dropzone Tracejada com `<CloudUploadVetaroIcon />`:**
  - Em vez de `handleSelectMindrayPhotos` simulado, aciona um `<input type="file" multiple accept="image/jpeg,image/png,image/webp" />` real (com suporte a *drag-and-drop* nativo `onDrop`).
  - Exibe as pílulas verdes/esmeralda com o nome real e tamanho de cada foto selecionada e botão `"Limpar fotos"`.
* **Gaveta / Modal "Editor de Layout":**
  - Carrega os dados reais de `GET /api/layout-config` (`font_family`, `font_size_body`, `font_size_titulo`, `margin_top`, `cor_primaria`, `cor_secundaria`) e salva via `PUT /api/layout-config` (com botão de restaurar padrão `POST /api/layout-config/reset`).
* **Botão `"Gerar Laudo Oficial com IA"`:**
  - Envia `FormData` (`imagens`) para `POST /api/ultrassom`.
  - Quando a resposta chega (`{ paciente, pdfUrl, docxUrl, laudo }`), exibe o card inferior de documento pronto com as abas **Página 1: Documento Oficial** e **Página 2: Imagens Mindray** e os botões de download imediato de PDF e DOCX.

### 4.4. Tela 3: Gerador de Relatório Cirúrgico (`activeNav === 'relatorio'`)
* **Seção 1 (`1. FICHA CIRÚRGICA OU ÁUDIO` com `<SurgicalFilePulseIcon />`):**
  - Aciona `<input type="file" accept=".docx,.pages,.txt,.m4a,.mp3,.wav,.ogg,.opus" />` real para o campo `documento`.
* **Seção 2 (`2. FOTOS INTRAOPERATÓRIAS / PEÇA CIRÚRGICA` com `<CameraSolidIcon />`):**
  - Aciona `<input type="file" multiple accept="image/*" />` real para o campo `fotos` (até 5 fotos).
* **Botão `"Gerar Relatório Cirúrgico Oficial"`:**
  - Envia `FormData` (`documento` + `fotos`) para `POST /api/cirurgia` e exibe o resultado estruturado (`procedimento`, `diagnosticoPreCirurgico`, `descricaoProcedimento`, `evolucaoConsideracoes`) com download de PDF e DOCX.
* **Biblioteca de Modelos Cirúrgicos Padronizados (Integrada logo abaixo do gerador):**
  - Lista os modelos de `GET /api/modelos-cirurgicos` na estética de cards Vetaro (`bg-[#0F1C26]` no Dark / `bg-white` no Light), com filtros `[Todos]`, `[🌐 Institucionais]` e `[🔒 Meus Modelos]`, busca instantânea e botões **Detalhes**, **Duplicar** (`POST /api/modelos-cirurgicos/:id/clonar`) e **Editar / Novo Modelo** (`POST /api/modelos-cirurgicos`).

### 4.5. Tela 4: Meu Perfil, Plano e Assinatura, Configurações & IA (`activeNav === 'configuracoes'`)
* **Aba 1 (`settingsTab === 'perfil'`):**
  - Formulário conectado ao `POST /api/perfil/profissional` (`multipart/form-data`), permitindo editar `nome`, `crmv`, `nomeClinica`, além de fazer upload da imagem de **Logotipo da Clínica** e **Assinatura/Carimbo Digital** (exibindo o preview do carimbo digital no cartão lateral esquerdo).
* **Aba 2 (`settingsTab === 'assinatura'`):**
  - Exibe o card do plano (`Vetaro Starter` ou `Vetaro Pro IA`), contabilizando dinamicamente `Laudos este mês` a partir dos registros do usuário em `/api/historico` e preparando o botão de gerenciamento de assinatura para o gateway de pagamento (Asaas / Stripe).
* **Aba 3 (`settingsTab === 'preferencias'`):**
  - Persiste as preferências de geração e o switch de **Modo Claro / Escuro** sincronizado com `POST /api/usuario/tema`.

## ⚙️ 5. Configuração do Vite Proxy e Serviço Estático no Express

### 5.1. `frontend/vite.config.js` (Desenvolvimento Local)
Durante o desenvolvimento, o Vite roda na porta `5173` com Hot Module Replacement (HMR) e redireciona todas as chamadas de API para o `servidor_web.js` na porta `3000`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/downloads': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      '/assets': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  }
});
```

### 5.2. Substituição da Rota `GET /` em `servidor_web.js` (Produção)
Em vez das 1.600 linhas de HTML inline, o final do `servidor_web.js` passa a ter apenas 10 linhas servindo o build otimizado do React:

```javascript
// Serve os arquivos estáticos compilados do React (Vite build)
const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/downloads') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}
```

### 5.3. Atualização do `Dockerfile` para Compilar o React no Build
No `Dockerfile`, basta adicionar o passo de build do frontend antes de iniciar o servidor:

```dockerfile
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY . .
RUN cd frontend && npm run build
```

## ✅ 6. Checklist de Execução da Migração para React

- [ ] **Passo 1:** Inicializar o projeto Vite em `frontend/` com React, Tailwind CSS e `lucide-react`.
- [ ] **Passo 2:** Extrair os ícones e o `<VetaroLogo />` de `vetaro_saas_identidade_visual.tsx` para `frontend/src/components/icons/VetaroIcons.jsx`.
- [ ] **Passo 3:** Implementar `ThemeContext.jsx` e `AuthContext.jsx` (com login Google Identity Services na estética Vetaro).
- [ ] **Passo 4:** Conectar `DashboardHome.jsx`, `UltrasoundGenerator.jsx`, `SurgeryGenerator.jsx` e `SettingsPage.jsx` às rotas reais do `servidor_web.js`.
- [ ] **Passo 5:** Remover o template literal HTML legado de `servidor_web.js` e configurar `express.static('frontend/dist')`.
- [ ] **Passo 6:** Validar o build (`cd frontend && npm run build`) e testar todos os fluxos em Modo Escuro e Modo Claro (Desktop, Tablet e Mobile).

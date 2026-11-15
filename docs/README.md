# 📚 Documentação Técnica - UPA PET Automação

Bem-vindo à documentação técnica do sistema **UPA PET - Central Inteligente de Laudos e Cirurgias**.

Este repositório contém uma plataforma completa de processamento inteligente de exames veterinários, automação de laudos de ultrassonografia abdominal e geração de relatórios cirúrgicos padronizados no rigoroso padrão médico e estético da **Dra. Camila Bastos (CRMV/MG: 22904)**.

O objetivo desta documentação é servir como **referência definitiva** tanto para engenheiros de software humanos quanto para **Agentes de IA (como Antigravity, Claude, ChatGPT, etc.)**, fornecendo o contexto necessário para compreender, manter e evoluir o sistema com segurança.

---

## 🗺️ Mapa da Documentação

A documentação está modularizada em 6 guias temáticos:

| Documento | Conteúdo Principal |
| :--- | :--- |
| [**1. Arquitetura e Engenharia (`ARCHITECTURE.md`)**](./ARCHITECTURE.md) | Visão sistêmica, diagramas de arquitetura, fluxo de dados, stack tecnológica e pipeline de compilação de documentos. |
| [**2. Regras de Negócio Clínicas (`BUSINESS_RULES.md`)**](./BUSINESS_RULES.md) | Padrões médicos da Dra. Camila Bastos, ordem canônica estrita de órgãos/imagens, tabela de corte métrico, regras de `DIAG DIF.:` e diretrizes cirúrgicas. |
| [**3. Módulos e Funcionalidades (`MODULES_AND_FEATURES.md`)**](./MODULES_AND_FEATURES.md) | Detalhamento exaustivo de cada script e módulo do repositório, funções exportadas, parâmetros e tratamentos de erro. |
| [**4. Modelos de Dados e Esquemas (`DATA_MODELS_AND_SCHEMAS.md`)**](./DATA_MODELS_AND_SCHEMAS.md) | Contratos JSON completos: paciente, laudo estruturado, ordenação de imagens, modelos cirúrgicos e RBAC de usuários. |
| [**5. Deploy e Operação (`DEPLOYMENT_AND_OPERATIONS.md`)**](./DEPLOYMENT_AND_OPERATIONS.md) | Guia de implantação no Render.com, Docker, execução local no Windows (daemon de monitoramento do Google Drive), Puppeteer e variáveis de ambiente. |
| [**6. Guia para Agentes de IA (`AI_AGENT_GUIDELINES.md`)**](./AI_AGENT_GUIDELINES.md) | Manual de sobrevivência e expansão para futuras IAs: invariantes pétreos, como estender funcionalidades sem quebrar regras clínicas e checklist de verificação. |
| [**7. Plano de Migração PostgreSQL & Multi-Tenant (`MIGRATION_PLAN_POSTGRES_MULTITENANT.md`)**](./MIGRATION_PLAN_POSTGRES_MULTITENANT.md) | Plano diretor passo a passo para transformar a plataforma em SaaS com banco relacional, Docker Compose, Prisma e suporte a múltiplos médicos. |

---

## 💡 Resumo do Projeto

O sistema resolve dois grandes desafios operacionais de clínicas veterinárias modernas:

1. **Laudos de Ultrassonografia Abdominal em Minutos:**
   - **Entrada:** Capturas de tela brutas do aparelho de ultrassom (Mindray) contendo medidas métricas (calipers), siglas anatômicas e anotações.
   - **Inteligência:** Google Gemini analisa a imagem via visão computacional multimodal, extrai calipers com precisão, identifica o órgão pela sigla/anatomia, valida valores de corte (caninos vs felinos) e sugere diagnósticos diferenciais (`DIAG DIF.:`).
   - **Saída:** Documento oficial em **PDF de alta fidelidade** e **Word (`.docx`) totalmente editável**:
     - **Página 1:** Laudo textual padronizado em 1 página com cabeçalho institucional, dados do paciente, órgãos ordenados e assinatura oficial.
     - **Páginas 2+:** Mosaico fotográfico em grade 2x4 com as capturas de tela organizadas rigorosamente na sequência anatômica canônica.

2. **Relatórios Cirúrgicos Oficiais Padronizados:**
   - **Entrada:** Ficha cirúrgica em texto/Word (`.docx`, `.pages`, `.txt`) ou áudio ditado pelo cirurgião (`.m4a`, `.mp3`, etc.), acompanhado opcionalmente de fotos intraoperatórias.
   - **Inteligência:** Gemini transcreve e estrutura as informações, mapeando automaticamente o procedimento para a biblioteca de 14 modelos cirúrgicos padronizados da UPA PET.
   - **Saída:** Documento cirúrgico formal:
     - **Página 1:** Relatório cirúrgico completo (1 página exata em tipografia Calibri, técnica cirúrgica, fios/suturas padronizados e assinatura).
     - **Página 2:** Registro fotográfico intraoperatório com foto emoldurada, metadados e legenda.

3. **Modos de Operação Duplos:**
   - **Portal Web (Cloud / Render):** Dashboard moderno com autenticação Google SSO, controle de acesso baseado em funções (RBAC), biblioteca interativa de modelos cirúrgicos (com busca em tempo real, adição e edição de modelos) e downloads imediatos.
   - **Daemon Local (Windows Background Service):** Monitor em tempo real de pastas sincronizadas com o Google Drive, disparando gerações automáticas via eventos do sistema de arquivos com tolerância a falhas.

---

## 🛠️ Stack Tecnológica

- **Backend:** Node.js (v18+) & Express.js.
- **Inteligência Artificial:** Google Gemini (Gemini Flash Multimodal com fallback inteligente entre variantes).
- **Processamento de Documentos:**
  - `docx`: Geração nativa de documentos Microsoft Word / Apple Pages.
  - `mammoth`: Leitor e extrator de arquivos `.docx`.
  - `html2canvas` / `puppeteer`: Compilação de PDF headless no Linux/Render.
  - `Microsoft Edge CLI`: Compilação milimétrica de PDF headless no Windows.
- **Autenticação & Segurança:** Google Identity Services (Google SSO), JSON Web Tokens (JWT), Cookies HTTP-only, RBAC nativo.
- **Frontend:** HTML5, Tailwind CSS, FontAwesome 6, Vanilla JS responsivo.
- **DevOps:** Render Cloud Platform, Docker, GitHub Actions/Webhooks CI/CD.

---

*Para entender a arquitetura interna e o fluxo de dados do sistema, continue a leitura em [ARCHITECTURE.md](./ARCHITECTURE.md).*

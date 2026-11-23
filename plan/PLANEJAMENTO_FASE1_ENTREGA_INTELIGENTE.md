# PLANEJAMENTO — Fase 1: Entrega Inteligente (Link Público, QR Code, WhatsApp e Resumo ao Tutor)

**Projeto:** Vetaro (`vetaro.com.br`)

**Data:** 2026-11-23

**Status:** Pronto para implementação

**Destino sugerido no repositório:** `plan/PLANEJAMENTO_FASE1_ENTREGA_INTELIGENTE.md`

**Estimativa total:** 7 a 10 dias úteis (4 etapas incrementais)

## 1. Objetivo de Negócio e Escopo

Hoje o Vetaro resolve com folga a geração do laudo de ultrassom e do relatório cirúrgico, mas o fluxo termina no download manual do PDF. A Fase 1 fecha a última milha do atendimento com quatro entregas integradas, mantendo custo marginal próximo de zero na VPS atual (2 vCPU / 4 GB RAM):

1. **Link público seguro por laudo (`/l/:token`):** acesso imediato pelo tutor ou clínica solicitante sem login, com prévia rica (Open Graph) no WhatsApp e download direto do PDF.

2. **QR Code automático no rodapé do PDF:** impresso no laudo de ultrassom e no relatório cirúrgico, apontando para o mesmo link público e preservado mesmo após recompilações no Vetaro Studio.

3. **Envio em 1 clique via WhatsApp (sem custo por mensagem):** disparo via `wa.me` / WhatsApp Web com dois perfis de mensagem prontos (**Tutor** e **Clínica Solicitante**), sem depender da cobrança por disparo da Cloud API da Meta.

4. **Resumo Empático para o Tutor (IA) + Rastreio de Visualização:** tradução opcional dos achados técnicos para linguagem acessível (4 a 5 linhas geradas via Gemini a menos de R\$ 0,005/exame, sempre revisável pelo médico) e contador de acessos com data/hora da visualização.

### O que fica fora desta fase (para manter velocidade)

* Envio automático em background via WhatsApp Cloud API oficial (pode entrar como add-on futuro nos planos Pro/Clínica).

* Envio automático por e-mail SMTP transacional.

* Cadastro de clínicas parceiras e financeiro (escopo da Fase 2).

## 2. Arquitetura de Dados (`prisma/schema.prisma`)

Todos os campos novos são opcionais ou possuem valor padrão, garantindo retrocompatibilidade total com os laudos já salvos em produção.

### Alterações em `ExameLaudo` e `RelatorioCirurgico`

Adicionar o mesmo bloco de compartilhamento nos dois models:

```
  // Fase 1 — Entrega Inteligente
  publicToken            String?   @unique @map("public_token")
  linkAtivo              Boolean   @default(true) @map("link_ativo")
  resumoTutor            String?   @db.Text @map("resumo_tutor")
  visualizacoes          Int       @default(0)
  primeiraVisualizacaoEm DateTime? @map("primeira_visualizacao_em")
  ultimaVisualizacaoEm   DateTime? @map("ultima_visualizacao_em")
  compartilhadoEm        DateTime? @map("compartilhado_em")

```

### Decisões técnicas do schema

* **Token curto de alta entropia:** gerar `publicToken` com `crypto.randomBytes(16).toString('base64url')` (22 caracteres URL-safe, 128 bits de entropia). Produz links mais limpos no WhatsApp e QR Codes menos densos (mais fáceis de escanear em papel impresso) do que UUID v4 tradicional.

* **Compatibilidade com laudos legados:** exames criados antes da Fase 1 ficam com `publicToken = null` e recebem um token automaticamente na primeira vez que o médico clicar em **Compartilhar**.

* **Persistência em recompilação:** o token é gerado antes da primeira compilação do PDF e reutilizado em `/api/ultrassom/recompilar` e `/api/cirurgia/recompilar`, garantindo que o QR Code de um PDF já enviado nunca seja invalidado por uma correção de texto.

## 3. Novos Módulos e Alterações no Backend

### 3.1. Dependência única

Instalar apenas a biblioteca `qrcode` (`^1.5.4`) no `package.json` raiz. É JavaScript puro, sem binários nativos, e gera Data URI PNG/SVG em menos de 10 ms com impacto nulo de memória no container.

### 3.2. Novo serviço: `servico_compartilhamento.js`

Centraliza toda a regra de negócio da Fase 1 para evitar inflar `servidor_web.js`:

| Função | Responsabilidade | 
| ----- | ----- | 
| `gerarPublicToken()` | Gera token criptográfico `base64url` de 16 bytes via `node:crypto`. | 
| `montarUrlPublica(token)` | Constrói \`\${process.env.APP_PUBLIC_URL | 
| `gerarQrCodeDataUri(url)` | Gera PNG Data URI compacto (`width: 96`, `margin: 1`, `errorCorrectionLevel: 'M'`) para embutir inline no HTML do PDF sem requisição externa no Puppeteer. | 
| `gerarResumoTutorIA(tipo, paciente, dadosClinicos)` | Chama `@google/generative-ai` (`gemini-2.5-flash` com fallback `gemini-3.8-flash`) para gerar resumo de 4–5 frases em português acessível. | 
| `isBotPreviewWhatsApp(userAgent)` | Detecta crawlers de prévia (`WhatsApp`, `facebookexternalhit`, `TelegramBot`, `Twitterbot`) para não contar prévia automática como leitura real do tutor. | 
| `renderizarPaginaPublicaLaudo(payload)` | Renderiza HTML leve (SSR, < 15 KB) mobile-first com Open Graph, resumo ao tutor (se liberado), viewer/download do PDF e selo discreto do Vetaro. | 

#### Regras clínicas obrigatórias no prompt do Resumo ao Tutor

* Explicar em linguagem clara e acolhedora o que foi avaliado e os principais achados sem jargão excessivo.

* **Proibido** sugerir medicamentos, doses, tratamentos ou prognóstico definitivo.

* **Obrigatório** encerrar orientando que a interpretação completa e a definição de conduta pertencem ao médico veterinário responsável.

* Salvar o resultado em `resumoTutor` para evitar chamadas duplicadas à API do Gemini.

### 3.3. Contratos de API em `servidor_web.js`

#### Rotas autenticadas (`exigirAutenticacao` + validação de ownership `usuarioId`)

| Método e Rota | Finalidade | 
| ----- | ----- | 
| `POST /api/compartilhamento/:tipo/:id/link` | Cria (se ausente) e retorna `publicToken`, `urlPublica`, `qrCodeDataUri`, `linkAtivo`, `resumoTutor`, `visualizacoes`, `primeiraVisualizacaoEm` e `ultimaVisualizacaoEm`. `:tipo` aceita `ultrassom` ou `cirurgia`. | 
| `PATCH /api/compartilhamento/:tipo/:id/status` | Atualiza `linkAtivo` (`true`/`false`) para revogação imediata (LGPD). | 
| `POST /api/compartilhamento/:tipo/:id/resumo-tutor` | Gera ou regenera o resumo empático via Gemini e persiste no banco. | 
| `PUT /api/compartilhamento/:tipo/:id/resumo-tutor` | Salva edição manual feita pelo veterinário no texto do resumo. | 
| `POST /api/compartilhamento/:tipo/:id/registrar-envio` | Marca `compartilhadoEm = new Date()` quando o médico dispara WhatsApp ou copia o link (métrica de produto). | 

Também atualizar `GET /api/historico` para incluir `publicToken`, `linkAtivo`, `visualizacoes` e `ultimaVisualizacaoEm` em cada item retornado.

#### Rotas públicas (sem `exigirAutenticacao`)

| Método e Rota | Finalidade | 
| ----- | ----- | 
| `GET /l/:token` | Busca o token em `ExameLaudo` e `RelatorioCirurgico`. Se inexistente ou `linkAtivo === false`, retorna página limpa `404/410` ("Laudo indisponível ou expirado"). Se ativo, incrementa visualização (exceto bots de preview) e retorna HTML SSR com tags Open Graph (`og:title`, `og:description`). | 
| `GET /l/:token/pdf` | Valida `linkAtivo === true` e faz stream do PDF correspondente no disco (`res.sendFile`), com `Content-Disposition: inline` (ou `attachment` se `?download=1`) e `Cache-Control: private, no-store`. | 

#### Ponto crítico no roteamento de `servidor_web.js`

Na rota catch-all da SPA React (próxima à linha 2804 de `servidor_web.js`), adicionar `req.path.startsWith('/l/')` à lista de exclusões ao lado de `/downloads`, garantindo que `/l/:token` nunca caia no `index.html` da área logada.

## 4. Integração do QR Code nos Motores de PDF

A maior preocupação técnica no motor de PDF é **não quebrar o Auto-Fit de 1 página** já calibrado.

### 4.1. `motor_laudo.js` (Ultrassonografia)

* Receber parâmetro opcional `opcoesCompartilhamento = { urlPublica, qrCodeDataUri, exibirQrCode }` em `gerarDocumentosExame()`.

* Renderizar um microbloco discreto (`50px × 50px` + legenda `"Laudo digital"` em `6.5pt`) posicionado à direita dentro de `.final-footer-wrap` (modo clonado) e `.footer` (modo padrão) **somente na última página de texto**.

* Ajustar a reserva geométrica do rodapé no cálculo do Auto-Fit (linha \~458) somando `6mm` apenas quando `qrCodeDataUri` estiver presente, impedindo sobreposição com a assinatura digitalizada.

### 4.2. `motor_cirurgia.js` (Relatório Cirúrgico)

* Receber o mesmo objeto `opcoesCompartilhamento` em `gerarDocumentosCirurgicos()`.

* Inserir o QR Code em layout `display: flex; justify-content: space-between; align-items: center` dentro de `.rodape-bloco` na Página 1, mantendo a altura total dentro da folga já existente sem empurrar a assinatura para a Página 2.

### 4.3. Fluxo nas rotas de geração e recompilação

1. Em `POST /api/ultrassom` e `POST /api/cirurgia`: gerar `publicToken` antes de compilar o PDF, passar `qrCodeDataUri` ao motor e salvar `publicToken` no `prisma.*.create(...)`.

2. Em `POST /api/ultrassom/recompilar` e `POST /api/cirurgia/recompilar`: consultar o `publicToken` já salvo no banco para aquele `jobId` (ou gerar caso seja exame legado) e passar ao motor antes de recompilar.

## 5. Experiência no Frontend (Vetaro Studio e Histórico)

### 5.1. Novo componente: `frontend/src/components/modals/ShareReportModal.jsx`

Modal enxuto (responsivo para desktop e mobile *thumb-first*) contendo três blocos claros:

1. **Link Público e Status de Entrega**

   * Preview do QR Code + campo somente leitura com `https://vetaro.com.br/l/...` e botão **Copiar Link**.

   * Badge de leitura em tempo real: `"Aguardando visualização"` ou `"Visualizado 2x · último acesso em 23/11 às 15:42"`.

   * Toggle **Link ativo** (permite desativar o acesso externo com 1 clique).

2. **Resumo para o Tutor (IA)**

   * Botão **Gerar resumo em linguagem simples** (chama `POST /resumo-tutor`, exibe skeleton rápido e libera textarea editável).

   * Aviso discreto abaixo do campo: *"Revise antes de enviar. Este resumo acompanha a mensagem do WhatsApp e não substitui o laudo técnico."*

3. **Disparo em 1 Clique no WhatsApp**

   * Campo opcional **WhatsApp do destinatário (com DDD)** — se preenchido, abre `https://wa.me/55{numero}?text={mensagem}`; se vazio, abre `https://api.whatsapp.com/send?text={mensagem}` para o médico escolher o contato no app.

   * Dois botões de ação rápida:

     * **Enviar para o Tutor:** saudação + nome do pet + resumo empático (se preenchido) + link público do laudo.

     * **Enviar para Clínica Solicitante:** mensagem objetiva com paciente, espécie, tipo de exame e link público direto.

### 5.2. Pontos de entrada na interface existente

* **`ReportPreviewModal.jsx` (Vetaro Studio):** adicionar botão **WhatsApp / Compartilhar** (ícone `Share2` em destaque esmeralda `#00D296`) ao lado de **Baixar PDF** na toolbar superior desktop (linha \~1160) e na barra inferior mobile (linha \~3138).

* **`DashboardHome.jsx` (Histórico recente):** exibir indicador discreto de visualização quando `visualizacoes > 0` e ícone de atalho rápido para abrir `ShareReportModal` direto da lista sem precisar abrir o PDF inteiro.

* **`frontend/src/services/api.js`:** adicionar funções `obterLinkCompartilhamento`, `alterarStatusLink`, `gerarResumoTutor`, `salvarResumoTutor` e `registrarEnvioCompartilhamento`.

## 6. Segurança, LGPD e Performance na VPS

| Risco | Mitigação planejada | 
| ----- | ----- | 
| Indexação indevida em buscadores | Header HTTP `X-Robots-Tag: noindex, nofollow, noarchive` + `<meta name="robots" content="noindex, nofollow">` em `/l/:token` e `/l/:token/pdf`. | 
| Tentativa de enumeração de links | Token de 128 bits + `express-rate-limit` dedicado para `/l/*` (60 requisições/minuto por IP). | 
| Revogação tardia por cache | `Cache-Control: private, no-store` no stream do PDF + verificação de `linkAtivo` em banco a cada acesso. | 
| Falso positivo de leitura pelo WhatsApp | Filtro de `User-Agent` na rota `/l/:token` para ignorar crawlers de geração de card (`WhatsApp`, `facebookexternalhit`). | 
| Sobrecarga na VPS (4 GB RAM) | Página pública em HTML SSR puro (sem Chromium nem bundle pesado) e QR Code gerado em memória via `qrcode` (\~5 ms). | 

## 7. Cronograma de Execução (4 Etapas)

| Etapa | Janela | Entregas concretas | Arquivos principais | 
| ----- | ----- | ----- | ----- | 
| **Etapa 1 — Base de Dados e Serviço** | Dias 1–2 | Migration Prisma, instalação do `qrcode`, criação de `servico_compartilhamento.js` (token, QR, resumo IA, template SSR) e testes unitários. | `prisma/schema.prisma`, `package.json`, `servico_compartilhamento.js` | 
| **Etapa 2 — PDF + Rotas API/Públicas** | Dias 3–4 | Injeção do QR Code no ultrassom e cirurgia (com proteção de 1 página), rotas `/api/compartilhamento/*`, rotas públicas `/l/:token` e `/l/:token/pdf`, ajuste no SPA fallback. | `motor_laudo.js`, `motor_cirurgia.js`, `servidor_web.js` | 
| **Etapa 3 — Frontend Vetaro Studio** | Dias 5–7 | Modal `ShareReportModal.jsx`, botões desktop/mobile no `ReportPreviewModal.jsx`, badges de visualização no `DashboardHome.jsx` e métodos no `api.js`. | `ShareReportModal.jsx`, `ReportPreviewModal.jsx`, `DashboardHome.jsx`, `api.js` | 
| **Etapa 4 — QA, Testes e Deploy** | Dias 8–10 | Suíte Jest (`tests/compartilhamento_laudo.test.js`), validação visual de PDF 1 página com QR, teste real de card no WhatsApp (Android/iOS/Web), `npm run build:frontend` e deploy na VPS. | `tests/compartilhamento_laudo.test.js`, `scripts/deploy-vps.sh` | 

## 8. Critérios de Aceite e Métricas Pós-Lançamento

### Checklist de aceite antes do deploy

* Novo laudo de ultrassom e novo relatório cirúrgico geram PDF com QR Code legível no celular sem empurrar assinatura para página extra.

* Recompilar um exame no Vetaro Studio mantém o mesmo `publicToken` e o link anterior continua apontando para o PDF atualizado.

* Enviar o link em uma conversa real de WhatsApp gera card Open Graph com nome do paciente e não incrementa o contador `visualizacoes` até o destinatário abrir de fato.

* Desativar o toggle **Link ativo** bloqueia imediatamente tanto `/l/:token` quanto `/l/:token/pdf`.

* Laudos antigos (anteriores à migration) funcionam normalmente e geram link ao clicar em **Compartilhar**.

### Métricas de produto para acompanhar nos primeiros 30 dias

* **Taxa de adoção:** % de laudos emitidos que tiveram `compartilhadoEm` preenchido.

* **Taxa de leitura:** % de links compartilhados com `visualizacoes >= 1` nas primeiras 24 horas.

* **Uso do diferencial de IA:** % de compartilhamentos que geraram `resumoTutor`.

* **Aquisição orgânica (viralidade):** cliques no selo discreto da página pública `/l/:token` com parâmetro `?ref=laudo_publico` convertidos em contas de degustação.
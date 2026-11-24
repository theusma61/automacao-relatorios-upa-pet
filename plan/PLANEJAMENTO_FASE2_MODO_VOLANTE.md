# PLANEJAMENTO — Fase 2: Modo Volante (Múltiplas Clínicas Parceiras + Financeiro de Cobrança e Repasses)

**Projeto:** Vetaro (`vetaro.com.br`)

**Data:** 2026-11-23

**Status:** Pronto para implementação

**Destino sugerido no repositório:** `plan/PLANEJAMENTO_FASE2_MODO_VOLANTE.md`

**Estimativa total:** 10 a 14 dias úteis (4 etapas incrementais)

## 1. Objetivo de Negócio e Escopo

A Fase 1 fechou a última milha da entrega do laudo. A Fase 2 ataca diretamente **retenção (redução de churn)** e **upgrade de plano (Solo → Pro)** transformando o Vetaro na central operacional do ultrassonografista e cirurgião volante — o perfil que atende múltiplas clínicas por semana e hoje perde horas em planilhas manuais para saber quanto cada parceiro deve.

### Entregas principais da Fase 2

1. **Cadastro de Clínicas Parceiras (multi-identidade):** o médico cadastra cada clínica onde atende com nome, contato, WhatsApp da recepção, valores padrão (ultrassom e cirurgia), percentual de repasse e **logo/rodapé opcionais por clínica** — sem sobrescrever a identidade pessoal salva em Meu Perfil.

2. **Seleção rápida no momento do exame:** seletor compacto em `UltrasoundGenerator.jsx` e `SurgeryGenerator.jsx` (lembrando a última clínica usada no plantão) que vincula o exame à clínica, aplica a logo/cabeçalho dela se configurado e já lança o valor no financeiro automaticamente.

3. **Painel Financeiro de Cobrança e Repasses (`ClinicasFinanceiroPage.jsx`):** visão consolidada de **quanto cada clínica deve**, **o que já foi pago** e **quais repasses estão pendentes** quando o tutor pagou direto ao volante, com baixa individual ou em lote por clínica.

4. **Relatório de Cobrança em PDF e CSV + Sinergia com a Fase 1:** geração de extrato mensal em PDF A4 (com tabela de pacientes/datas, total a receber e chave Pix opcional) e exportação CSV para Excel, além de pré-preencher o WhatsApp da clínica parceira no `ShareReportModal.jsx`.

### O que fica fora desta fase (para manter foco e simplicidade)

* Emissão de Nota Fiscal (NFS-e) ou geração automática de boleto bancário.

* Contabilidade completa (DRE, fluxo de caixa de múltiplas contas bancárias, centro de custos).

* Sincronização com Google Agenda (pode entrar como evolução futura da Fase 2.1).

## 2. Empacotamento por Plano (Alavanca de Upgrade)

A regra de limites usa o campo `assinatura.plano` já existente em `gerenciador_assinatura.js`:

| Plano | Limite de Clínicas Parceiras | Controle de Cobrança e Repasses | Relatório de Cobrança PDF + CSV | 
| ----- | ----- | ----- | ----- | 
| **Degustação (Trial)** | Até 2 clínicas | Completo | Preview (com selo de teste) | 
| **Solo / Volante (R\$ 119)** | Até 3 clínicas | Completo | Exportação CSV | 
| **Especialista Pro (R\$ 249)** | **Ilimitado** | **Completo + baixa em lote** | **PDF Oficial + CSV** | 
| **Clínica & Hospital (R\$ 497)** | **Ilimitado** | **Completo + baixa em lote** | **PDF Oficial + CSV** | 

## 3. Arquitetura de Dados (`prisma/schema.prisma`)

O model `Clinica` existente no schema representa a organização multi-usuário (tenant). Para não misturar tenant com clientes atendidos pelo volante, criamos o model dedicado `ClinicaParceira` pertencente ao `Usuario` (relação 1:N) e adicionamos colunas opcionais (100% retrocompatíveis) em `ExameLaudo`, `RelatorioCirurgico` e `Usuario`.

### 3.1. Novo model `ClinicaParceira`

```
model ClinicaParceira {
  id                     String   @id @default(cuid())
  usuarioId              String   @map("usuario_id")
  usuario                Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  nome                   String
  nomeContato            String?  @map("nome_contato")
  whatsapp               String?
  email                  String?
  cidade                 String?
  cnpj                   String?

  // Identidade visual opcional por clínica parceira
  logoUrl                String?  @map("logo_url")
  rodapeContato          String?  @map("rodape_contato")
  usarIdentidadePropria  Boolean  @default(false) @map("usar_identidade_propria")

  // Regras financeiras padrão
  valorPadraoUltrassom   Decimal  @default(0) @db.Decimal(10, 2) @map("valor_padrao_ultrassom")
  valorPadraoCirurgia    Decimal  @default(0) @db.Decimal(10, 2) @map("valor_padrao_cirurgia")
  percentualRepasse      Decimal  @default(0) @db.Decimal(5, 2) @map("percentual_repasse")
  diaFechamento          Int?     @map("dia_fechamento")
  observacoes            String?  @db.Text
  ativa                  Boolean  @default(true)

  exames                 ExameLaudo[]
  cirurgias              RelatorioCirurgico[]

  criadoEm               DateTime @default(now()) @map("criado_em")
  atualizadoEm           DateTime @updatedAt @map("atualizado_em")

  @@index([usuarioId])
  @@index([usuarioId, ativa])
  @@map("clinicas_parceiras")
}

```

### 3.2. Campos financeiros opcionais em `ExameLaudo` e `RelatorioCirurgico`

```
  // Fase 2 — Modo Volante e Financeiro
  clinicaParceiraId  String?          @map("clinica_parceira_id")
  clinicaParceira    ClinicaParceira? @relation(fields: [clinicaParceiraId], references: [id], onDelete: SetNull)
  valorExame         Decimal?         @db.Decimal(10, 2) @map("valor_exame")
  quemPagou          String           @default("CLINICA") @map("quem_pagou") // CLINICA | TUTOR
  valorRepasse       Decimal?         @db.Decimal(10, 2) @map("valor_repasse")
  statusPagamento    String           @default("PENDENTE") @map("status_pagamento") // PENDENTE | PAGO | ISENTO
  statusRepasse      String           @default("NAO_APLICAVEL") @map("status_repasse") // NAO_APLICAVEL | PENDENTE | REPASSADO
  formaPagamento     String?          @map("forma_pagamento") // PIX | DINHEIRO | CARTAO | TRANSFERENCIA | BOLETO
  pagoEm             DateTime?        @map("pago_em")
  repassadoEm        DateTime?        @map("repassado_em")

```

### 3.3. Campo opcional em `Usuario` (para o extrato de cobrança)

* `chavePix String? @map("chave_pix")` — exibida no rodapé do Relatório de Cobrança em PDF para facilitar o pagamento pela clínica parceira.

### 3.4. Migração segura

* Criar `prisma/migrations/20261125000000_add_modo_volante_financeiro/migration.sql` com `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

* Replicar os comandos idempotentes em `scripts/ensure-schema.js` para garantir boot seguro na VPS sem perda de dados.

## 4. Arquitetura de Backend

### 4.1. Novo módulo: `servico_volante.js`

Centraliza regras de clínicas parceiras, cálculos financeiros e geração do extrato de cobrança:

| Função | Responsabilidade | 
| ----- | ----- | 
| `obterLimiteClinicasPorPlano(plano)` | Retorna `2` (Gratuito), `3` (Solo) ou `Infinity` (Pro/Clínica/Admin). | 
| `calcularValoresFinanceirosExame({ clinica, tipo, valorOverride, quemPagou })` | Resolve `valorExame`, calcula `valorRepasse = valorExame * (percentualRepasse / 100)` quando `quemPagou === 'TUTOR'`, e define `statusPagamento` e `statusRepasse` iniciais coerentes. | 
| `montarResumoFinanceiro({ usuarioId, mes, clinicaParceiraId })` | Agrega `ExameLaudo` + `RelatorioCirurgico` retornando: total faturado, total recebido, total a receber, total de repasses pendentes, ranking de inadimplência por clínica e contagem de exames. | 
| `gerarHtmlExtratoCobranca({ medico, clinica, periodo, itens, totais })` | Monta HTML A4 limpo com cabeçalho do veterinário, dados da clínica parceira, tabela de exames (data, pet, tutor, tipo, valor), resumo de totais e chave Pix do médico. | 
| `gerarPdfExtratoCobranca(...)` | Compila o HTML acima reutilizando o `compilador_pdf.js` existente (respeitando `PDF_CONCURRENCY: 1` na VPS). | 
| `gerarCsvLancamentos(itens)` | Serializa os lançamentos filtrados em CSV UTF-8 com BOM (`\uFEFF`) e separador `;` (abre formatado direto no Excel PT-BR). | 

### 4.2. Contratos de API em `servidor_web.js`

Todas as rotas exigem `exigirAutenticacao` e validam ownership (`usuarioId === req.usuario.id`):

| Método e Rota | Finalidade | 
| ----- | ----- | 
| `GET /api/clinicas-parceiras` | Lista clínicas parceiras do usuário (ativas e inativas) + limite do plano atual. | 
| `POST /api/clinicas-parceiras` | Cria clínica parceira (valida limite do plano e aceita upload opcional de logo para `logosDir`). | 
| `PUT /api/clinicas-parceiras/:id` | Atualiza dados, valores padrão, percentual de repasse, WhatsApp e logo da clínica parceira. | 
| `DELETE /api/clinicas-parceiras/:id` | Soft delete (`ativa: false`) para preservar histórico financeiro dos exames já emitidos. | 
| `GET /api/financeiro/resumo` | KPIs consolidados do mês/período (`?mes=2026-11&clinicaId=...`) + resumo agrupado por clínica devedora. | 
| `GET /api/financeiro/lancamentos` | Lista paginada e unificada de ultrassons + cirurgias com filtros (`mes`, `clinicaId`, `statusPagamento`, `statusRepasse`, `tipo`). | 
| `PATCH /api/financeiro/lancamentos/:tipo/:id` | Atualiza `clinicaParceiraId`, `valorExame`, `quemPagou`, `valorRepasse`, `statusPagamento`, `statusRepasse` e `formaPagamento`. | 
| `POST /api/financeiro/clinicas/:clinicaId/quitar-pendentes` | Quita em lote todos os exames `PENDENTE` de uma clínica no período selecionado (1 clique no fechamento). | 
| `GET /api/financeiro/clinicas/:clinicaId/extrato.pdf` | Gera e faz download do Relatório de Cobrança em PDF A4 para envio à clínica (Pro/Clínica). | 
| `GET /api/financeiro/exportar.csv` | Exporta os lançamentos filtrados em CSV para Excel. | 

### 4.3. Integração com geração de PDF e Fase 1

* **`POST /api/ultrassom` e `POST /api/cirurgia`:** passam a aceitar campos opcionais `clinicaParceiraId`, `valorExame` e `quemPagou` no `FormData`.

* **Override visual por clínica (sem tocar no perfil do médico):** se a clínica selecionada tiver `usarIdentidadePropria === true` e `logoUrl`, o backend monta um `usuarioEfetivo` em memória substituindo `nomeClinica` e `logoUrl` apenas para aquele documento em `motor_laudo.js` e `motor_cirurgia.js` (e salva `clinicaParceiraId` no `meta_exame.json` / `meta_cirurgia.json` para manter a mesma logo nas recompilações do Vetaro Studio).

* **Sinergia com `ShareReportModal.jsx` (Fase 1):** `POST /api/compartilhamento/:tipo/:id/link` passa a incluir `clinicaParceira: { id, nome, whatsapp }` na resposta, pré-preenchendo automaticamente o WhatsApp da recepção ao clicar em **Enviar para Clínica**.

* **Faturamento real em `SettingsPage.jsx`:** substituir o fallback estático `(activitiesCount * 160)` pelo faturamento real somado quando houver valores lançados.

## 5. Experiência no Frontend

### 5.1. Navegação (`Sidebar.jsx`, `MobileTabBar.jsx`, `App.jsx`)

* **Desktop (`Sidebar.jsx`):** adicionar item **Volante** (ícone `Building2` ou `Wallet`, `id: 'volante'`) entre **Meus Padrões** e **Configurações**.

* **Mobile (`MobileTabBar.jsx`):** adicionar o 5º item **Volante** mantendo botões compactos (`min-h-[44px]`, proteção `notranslate`).

### 5.2. Nova página: `frontend/src/pages/ClinicasFinanceiroPage.jsx`

Organizada em 3 sub-abas limpas seguindo o design system Vetaro (`#00D296`, `#0D5C56`, `#0A141D`, `#0F1C26`):

1. **Resumo & Cobrança por Clínica**

   * Seletor de mês (`< Novembro 2026 >`) + 4 cards de KPI: **Faturado no mês**, **Recebido**, **A receber (clínicas)** e **Repasses pendentes**.

   * Lista de clínicas com saldo em aberto, mostrando quantidade de exames pendentes, valor total devido e 3 ações diretas por linha: **Gerar Extrato PDF**, **Cobrar no WhatsApp** (mensagem pronta via `wa.me` com o total e resumo) e **Marcar tudo como pago**.

2. **Lançamentos (Exames e Cirurgias)**

   * Tabela/lista responsiva com filtros por clínica, tipo e status (`Pendente` / `Pago` / `Repasse pendente`), permitindo editar o valor inline ou alternar o status de pagamento em 1 clique.

   * Botão **Exportar CSV** no topo.

3. **Clínicas Parceiras**

   * Grid de clínicas cadastradas (com badge de limite do plano, ex: `2 de 3 clínicas no Plano Solo` + CTA suave para upgrade no Pro).

   * Modal de cadastro/edição (`ClinicaParceiraModal.jsx`) reutilizando o `LogoCropEditorModal.jsx` já existente para recortar a logo da clínica parceira na proporção `720×300`, com campos de WhatsApp, valores padrão (ultrassom/cirurgia), % de repasse e toggle *"Usar logo desta clínica no cabeçalho dos laudos"*.

### 5.3. Seletor rápido em `UltrasoundGenerator.jsx` e `SurgeryGenerator.jsx`

* Barra compacta opcional acima do botão de gerar laudo:

  * Dropdown **Clínica Parceira** (com opção *"Atendimento particular / Sem clínica"* e persistência da última escolha em `localStorage` para agilizar o plantão).

  * Input numérico compacto **Valor (R\$)** (preenchido automaticamente com o valor padrão da clínica selecionada, editável para casos especiais como Doppler ou urgência).

  * Toggle compacto **Recebimento:** `Clínica paga depois` vs `Tutor pagou direto` (calcula repasse automaticamente).

## 6. Cronograma de Execução (4 Etapas)

| Etapa | Janela | Entregas concretas | Arquivos principais | 
| ----- | ----- | ----- | ----- | 
| **Etapa 1 — Banco e Regras Financeiras** | Dias 1–3 | Migration Prisma (`ClinicaParceira` + campos financeiros + `chavePix`), atualização de `ensure-schema.js`, criação de `servico_volante.js` e testes unitários de cálculo de cobrança/repasse. | `prisma/schema.prisma`, `prisma/migrations/...`, `scripts/ensure-schema.js`, `servico_volante.js`, `tests/volante_financeiro.test.js` | 
| **Etapa 2 — APIs, Override Visual e Extrato PDF/CSV** | Dias 4–6 | CRUD `/api/clinicas-parceiras`, rotas `/api/financeiro/*`, override de logo/nome da clínica em `POST /api/ultrassom`, `POST /api/cirurgia` e `/recompilar`, e envio de `clinicaParceira.whatsapp` na Fase 1. | `servidor_web.js`, `motor_laudo.js`, `motor_cirurgia.js` | 
| **Etapa 3 — Frontend Clínicas e Financeiro** | Dias 7–11 | `ClinicasFinanceiroPage.jsx`, `ClinicaParceiraModal.jsx` (com `LogoCropEditorModal`), navegação em `Sidebar`/`MobileTabBar`/`App.jsx` e métodos no `api.js`. | `ClinicasFinanceiroPage.jsx`, `ClinicaParceiraModal.jsx`, `Sidebar.jsx`, `MobileTabBar.jsx`, `App.jsx`, `api.js` | 
| **Etapa 4 — Integração nos Geradores, WhatsApp e QA** | Dias 12–14 | Seletor rápido de clínica/valor em `UltrasoundGenerator.jsx` e `SurgeryGenerator.jsx`, pré-preenchimento do WhatsApp da clínica no `ShareReportModal.jsx`, testes ponta a ponta e build/deploy. | `UltrasoundGenerator.jsx`, `SurgeryGenerator.jsx`, `ShareReportModal.jsx`, `SettingsPage.jsx` | 

## 7. Critérios de Aceite e Métricas de Retenção

### Checklist de aceite antes do deploy

* Criar clínica parceira com logo própria e gerar 1 laudo de ultrassom vinculado: o PDF deve sair com a logo da clínica parceira sem alterar a logo padrão do médico em Meu Perfil.

* Recompilar esse laudo no Vetaro Studio deve preservar a logo da clínica parceira e os dados financeiros.

* Lançar 2 exames com `quemPagou = CLINICA` e 1 exame com `quemPagou = TUTOR` (repasse 20%): o painel deve separar corretamente **A receber da clínica** e **Repasse pendente para a clínica**.

* Clicar em **Gerar Extrato PDF** deve baixar um PDF A4 legível com a soma exata dos exames pendentes e a chave Pix configurada.

* Clicar em **Quitar pendentes** deve zerar o saldo em aberto da clínica e atualizar imediatamente os KPIs do mês.

* No `ShareReportModal`, clicar em **Enviar para Clínica** em um exame vinculado deve abrir o WhatsApp diretamente no número cadastrado daquela clínica.

### Métricas de negócio para acompanhar em 60 dias

* **Adoção do Modo Volante:** % de usuários ativos que cadastram ao menos 2 clínicas parceiras nos primeiros 14 dias.

* **Retenção (Churn):** comparação do churn mensal entre usuários que usam o módulo financeiro vs. usuários que só emitem laudos.

* **Conversão de Upgrade:** % de assinantes do Plano Solo que atingem o teto de 3 clínicas parceiras e migram para o Especialista Pro (R\$ 249/mês).
# 🗺️ Plano Diretor de Migração: SQLite ➔ PostgreSQL & Plataforma Multi-Tenant (SaaS)

> **Documento de Arquitetura e Roteiro de Execução Técnica**
>
> **Versão:** 3.0 (Revisão Auditada — 9 Divergências Técnicas Corrigidas e Sincronizadas com o Código-Fonte)
>
> **Status:** Pronto para Execução Segura em VPS
>
> **Objetivo:** Evoluir o sistema de automação da UPA PET de uma instância monousuário/monoclínica (atualmente persistida em SQLite com backup no Google Drive) para um **SaaS Multi-Tenant profissional em PostgreSQL 16**, rodando sob Docker em VPS econômica (Hostinger KVM 1 ou Hetzner), permitindo que múltiplos médicos veterinários e clínicas emitam laudos e relatórios com suas próprias identidades visuais (logotipos, cabeçalhos, cores, CRMVs, assinaturas e modelos cirúrgicos exclusivos), preservando a identidade fundacional da UPA PET e as 5 Regras Pétreas como padrão canônico.

## 📑 Sumário Executivo

| Fase | Título | Escopo Principal | Esforço Est. | 
| ----- | ----- | ----- | ----- | 
| **Fase 1** | **Infraestrutura VPS, Dockerfile & ORM** | Configuração do Docker Compose (`name: upa_pet`, PostgreSQL 16 + Node.js), `Dockerfile` com `openssl` e `prisma generate`, `p-queue@6.6.2` (CommonJS) e modelagem declarativa com **Prisma ORM**. | 1 dia | 
| **Fase 2** | **Migração de Dados (`upa_pet.db` ➔ PG)** | Script `migrate-sqlite-to-postgres.js` migrando usuários (incluindo `tema_preferencia`), layout institucional e os 14 modelos cirúrgicos fundacionais. | 0.5 dia | 
| **Fase 3** | **Refatoração do Backend (Sync ➔ Async)** | Transição completa de `db.js`, `gerenciador_usuarios.js`, `gerenciador_modelos.js`, `gerenciador_layout.js`, `seed.js` e `bootServidor()` em `servidor_web.js` (eliminando SQL cru e colisões de ID). | 1.5 dias | 
| **Fase 4** | **Dinamização dos Laudos e Prompts IA** | Parametrização multi-tenant em `motor_laudo.js`, `motor_cirurgia.js`, `gerar_docx.js` (incluindo correção do cabeçalho da Página 2), `analisador_ia.js` e `analisador_cirurgia.js`. | 1 dia | 
| **Fase 5** | **Frontend Multi-Médico & White-Label** | Tela de perfil profissional (upload de logo/CRMV/assinatura), gestão de modelos (Globais vs. Privados) e histórico de exames emitidos. | 1.5 dias | 
| **Fase 6** | **DevOps, Tuning, Testes & Backup Off-Site** | Configuração de swap (4 GB), fila `p-queue@6.6.2`, adaptação da suíte Jest para `async/await` e rotina `pg_dump` diária via `rclone`. | 0.5 dia | 

## 🔍 1. Diagnóstico do Estado Atual vs. Alvo (Auditoria v3.0)

Uma auditoria completa no código-fonte atual (`servidor_web.js`, `db.js`, `gerenciador_*.js`, `motor_*.js`, `gerar_*.js` e `tests/`) mapeou exatamente o que já existe e corrigiu **9 pontos críticos** que quebrariam a migração se não fossem tratados:

### O que já está implementado no repositório atual:

1. **Persistência SQLite Operacional:** O arquivo `db.js` gerencia a conexão com SQLite via `better-sqlite3` em modo WAL, inicializando as tabelas `usuarios`, `modelos_cirurgicos` e `configuracoes_layout`.

2. **Dark Mode Persistido no Banco:** A tabela `usuarios` possui a coluna `tema_preferencia` (`'light' | 'dark' | 'system'`), consultada e atualizada pelas rotas `GET/POST /api/usuario/tema`.

3. **Editor de Layout Institucional e Suíte Jest:** O módulo `gerenciador_layout.js` converte medidas CSS (`mm`, `pt`) para Twips/Half-Points da biblioteca `docx` e possui cobertura de testes em `tests/gerenciador_layout.test.js`, `tests/geradores_layout.test.js` e `tests/validation_layout.test.js`.

4. **Inferência Semântica e Sync de Modelos Cirúrgicos:** `gerenciador_modelos.js` implementa `syncModelosDoJson()` no boot e `inferirModeloPorTexto()` como fallback na rota `POST /api/cirurgia`.

5. **Mecanismo de Backup Transitório (Render):** O arquivo `backup-db.js` faz snapshots do `upa_pet.db` para o Google Drive e sincroniza tokens via Redis/Valkey (`REDIS_URL`).

### As 9 Correções Técnicas Incorporadas nesta Versão 3.0:

1. **Compatibilidade `snake_case` em `gerenciador_layout.js`:** O restante do sistema (`motor_laudo.js`, `gerar_docx.js`, `gerar_html.js`, `validation.js` com Zod, frontend e testes Jest) lê e grava `font_family`, `font_size_body`, `cor_primaria`, etc. O `schema.prisma` agora utiliza `@map(...)` e `gerenciador_layout.js` (incluído na Fase 3) serializa o retorno exatamente em `snake_case`.

2. **Preservação de `tema_preferencia` e Remoção de SQL Cru em `servidor_web.js`:** O campo `temaPreferencia` foi adicionado ao model `Usuario` no Prisma e migrado do SQLite. As chamadas diretas `require('./db').db.prepare(...)` nas linhas 294–324 de `servidor_web.js` foram substituídas por métodos assíncronos em `gerenciador_usuarios.js`.

3. **Enriquecimento de `perfilParaResposta()` com `id` e Dados de Branding:** Em `gerenciador_usuarios.js`, `perfilParaResposta()` agora retorna `id`, `clinicaId`, `nomeClinica`, `logoUrl`, `assinaturaUrl` e `temaPreferencia`, garantindo que `req.usuario.id` nunca seja `undefined` nas rotas multi-tenant.

4. **Prevenção de Colisão de Chave Primária (`id`) em `ModeloCirurgico`:** Quando um veterinário cria um modelo privado (`isGlobal: false`), o ID é automaticamente prefixado com `${usuario.id}__${slug}`, evitando colisão com os slugs dos 14 modelos globais (ex.: `orquiectomia_aberta`) ou com modelos de outros médicos.

5. **Fixação de `p-queue@6.6.2` para CommonJS:** Como o `package.json` utiliza `"type": "commonjs"`, a instalação fixa `p-queue@6.6.2` (última versão compatível com `require('p-queue')`), evitando o erro fatal `ERR_REQUIRE_ESM` das versões 8.x/9.x.

6. **Desacoplamento do Boot (`bootServidor()`, `seed.js` e `backup-db.js`):** O bloco de inicialização em `servidor_web.js` (linhas 2214–2279) e o `seed.js` foram refatorados para `async/await` sobre o Prisma, desativando automaticamente o restore de arquivo `.db` do Google Drive quando `DATABASE_URL` estiver presente e removendo a chamada obsoleta `require('./db').getDbPath()`.

7. **Parametrização Completa em `motor_cirurgia.js` e Correção da Página 2 em `gerar_docx.js`:** `motor_cirurgia.js` passa a consumir efetivamente o layout e os dados dinâmicos do médico (mantendo a redução automática de fonte para textos longos `> 1750` e `> 2300` caracteres em prol da Regra da Página Única), e `gerar_docx.js` corrige a chamada `criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome)` na repetição de cabeçalho das páginas de fotos.

8. **`Dockerfile` Preparado para Prisma (`openssl` + `prisma generate`):** A imagem `node:20-slim` agora instala `openssl`, gera o Prisma Client no build e executa `npx prisma migrate deploy` na inicialização do container.

9. **Transição Assíncrona de `inferirModeloPorTexto()` e `obterTextoModelosParaPrompt()`:** Ambas as funções em `gerenciador_modelos.js` passam a ser `async` e recebem `usuarioId`, atualizando as chamadas em `analisador_cirurgia.js` (linha 42) e `servidor_web.js` (linha 536).

## 🏛️ 2. Arquitetura Alvo na VPS (Hostinger KVM 1)

```
flowchart TD
    subgraph CLIENTES["Veterinários & Clínicas (Multi-Tenant)"]
        U1["Dra. Camila Bastos (UPA PET - Matriz)"]
        U2["Dr. Veterinário Parceiro B (Clínica Vet Care)"]
        U3["Novos Médicos Cadastrados"]
    end

    subgraph VPS["VPS Hostinger KVM 1 (1 vCPU, 4GB RAM, 50GB NVMe)"]
        NGINX["Nginx Host (Portas 80/443)<br>SSL Let's Encrypt Certbot<br>Gzip + Cache Estático"]
        
        subgraph DOCKER["Docker Compose Project (name: upa_pet)"]
            APP["App Node.js (Porta 3000)<br>Express + Puppeteer (p-queue@6.6.2)<br>Prisma Client ORM"]
            DB[("PostgreSQL 16 Alpine<br>(Porta 5432 interna)<br>Config: shared_buffers=128MB")]
            
            VOL_DB[("Volume: upa_pet_postgres_data<br>/var/lib/postgresql/data")]
            VOL_UPLOADS[("Volume: upa_pet_app_uploads<br>/app/uploads (Logos e Assinaturas)")]
        end

        SWAP["Swapfile NVMe (4 GB)<br>Proteção Anti-OOM Killer"]
        CRON["Cron Linux (03:00 AM)<br>pg_dump + gzip + rclone"]
    end

    subgraph CLOUD_EXTERNA["Nuvem & Serviços Conectados"]
        GEMINI["Google Gemini Flash API<br>(Análise Multimodal e Áudio)"]
        GOOGLE_AUTH["Google Identity SSO<br>(OAuth2 Token Verification)"]
        STORAGE_BACKUP["Storage Off-Site<br>(Google Drive / Backblaze B2)"]
    end

    CLIENTES -->|HTTPS (443)| NGINX
    NGINX -->|Proxy Reverso :3000| APP
    APP -->|Prisma Pool :5432| DB
    DB --- VOL_DB
    APP --- VOL_UPLOADS

    APP -->|Multimodal / OCR| GEMINI
    APP -->|Validação de Token| GOOGLE_AUTH
    CRON -->|Dump Criptografado| STORAGE_BACKUP

```

### Especificações & Dimensionamento para Hostinger KVM 1 (1 vCPU / 4 GB RAM):

1. **Node.js + Puppeteer:** Limitar a memória do processo Node.js com `--max-old-space-size=1536` (1.5 GB).

2. **PostgreSQL 16:** Ajustar para perfil de baixo consumo:

   * `shared_buffers = 128MB`

   * `work_mem = 4MB`

   * `maintenance_work_mem = 32MB`

   * `max_connections = 50`

3. **Fila de Renderização de PDF (`p-queue@6.6.2`):** Concorrência máxima de `1` execução simultânea do Puppeteer/Chromium, evitando contenção de CPU em 1 vCPU (tempo médio de 1.2s por PDF).

4. **Swapfile no NVMe:** Arquivo swap de 4 GB no Linux (`/swapfile`), protegendo o container contra o Linux OOM Killer durante picos de renderização de imagens de alta resolução.

## 🗄️ 3. Modelagem Relacional Completa (`prisma/schema.prisma`)

A modelagem abaixo inclui o campo `temaPreferencia` (`@map("tema_preferencia")`) no model `Usuario` e mapeia todas as colunas no padrão PostgreSQL `snake_case`:

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================================================
// 1. CLÍNICAS / ESTABELECIMENTOS VETERINÁRIOS (TENANTS)
// ============================================================================
model Clinica {
  id           String               @id @default(cuid())
  nome         String               // Ex: "UPA PET - Clínica Veterinária"
  razaoSocial  String?              @map("razao_social")
  cnpj         String?              @unique
  telefone     String?
  cidade       String?
  estado       String?              // Ex: "MG"
  logoUrl      String?              @map("logo_url")
  criadoEm     DateTime             @default(now()) @map("criado_em")
  atualizadoEm DateTime             @updatedAt @map("atualizado_em")

  usuarios     Usuario[]
  layouts      ConfiguracaoLayout[]

  @@map("clinicas")
}

// ============================================================================
// 2. USUÁRIOS E MÉDICOS VETERINÁRIOS
// ============================================================================
model Usuario {
  id                String               @id @default(cuid())
  email             String               @unique
  nome              String
  role              String               @default("pendente") // "admin", "veterinario", "assistente", "pendente"
  crmv              String?              // Ex: "CRMV/MG: 22904"
  nomeClinica       String?              @map("nome_clinica")
  logoUrl           String?              @map("logo_url")
  assinaturaUrl     String?              @map("assinatura_url")
  foto              String?
  telefone          String?
  temaPreferencia   String               @default("system") @map("tema_preferencia") // "light", "dark", "system"
  ativo             Boolean              @default(true)

  clinicaId         String?              @map("clinica_id")
  clinica           Clinica?             @relation(fields: [clinicaId], references: [id], onDelete: SetNull)

  // Relacionamentos com dados próprios
  modelosCriados    ModeloCirurgico[]
  layoutsCriados    ConfiguracaoLayout[]
  examesEmitidos    ExameLaudo[]
  cirurgiasEmitidas RelatorioCirurgico[]

  criadoEm          DateTime             @default(now()) @map("criado_em")
  atualizadoEm      DateTime             @updatedAt @map("atualizado_em")

  @@index([email])
  @@index([role])
  @@map("usuarios")
}

// ============================================================================
// 3. CONFIGURAÇÕES VISUAIS E DE LAYOUT (MULTI-TENANT)
// ============================================================================
model ConfiguracaoLayout {
  id                String   @id @default(cuid())
  nome              String   @default("Padrão Oficial")
  isPadrao          Boolean  @default(false) @map("is_padrao")

  usuarioId         String?  @unique @map("usuario_id")
  usuario           Usuario? @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  clinicaId         String?  @map("clinica_id")
  clinica           Clinica? @relation(fields: [clinicaId], references: [id], onDelete: Cascade)

  // Tipografia e Dimensões (mapeadas para snake_case no banco)
  fontFamily        String   @default("Calibri, sans-serif") @map("font_family")
  fontSizeBody      String   @default("11pt") @map("font_size_body")
  fontSizeTitulo    String   @default("14pt") @map("font_size_titulo")
  marginTop         String   @default("20mm") @map("margin_top")
  marginBottom      String   @default("20mm") @map("margin_bottom")
  marginLeft        String   @default("15mm") @map("margin_left")
  marginRight       String   @default("15mm") @map("margin_right")
  lineHeight        String   @default("1.4") @map("line_height")
  paragraphSpacing  String   @default("8pt") @map("paragraph_spacing")

  // Paleta de Cores
  corPrimaria       String   @default("#1B365D") @map("cor_primaria")
  corSecundaria     String   @default("#4A777A") @map("cor_secundaria")

  criadoEm          DateTime @default(now()) @map("criado_em")
  atualizadoEm      DateTime @updatedAt @map("atualizado_em")

  @@index([usuarioId])
  @@index([isPadrao])
  @@map("configuracoes_layout")
}

// ============================================================================
// 4. MODELOS CIRÚRGICOS (PADRÃO HÍBRIDO: GLOBAIS + PRIVADOS)
// ============================================================================
model ModeloCirurgico {
  id                      String   @id // Global: "<slug>" | Privado: "<usuarioId>__<slug>"
  isGlobal                Boolean  @default(false) @map("is_global")

  usuarioId               String?  @map("usuario_id")
  usuario                 Usuario? @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  nome                    String
  sinonimos               String[]
  procedimento            String
  diagnosticoPreCirurgico String?  @map("diagnostico_pre_cirurgico")
  descricaoProcedimento   String   @db.Text @map("descricao_procedimento")
  evolucaoConsideracoes   String?  @db.Text @map("evolucao_consideracoes")

  criadoEm                DateTime @default(now()) @map("criado_em")
  atualizadoEm            DateTime @updatedAt @map("atualizado_em")

  @@index([usuarioId])
  @@index([isGlobal])
  @@index([nome])
  @@map("modelos_cirurgicos")
}

// ============================================================================
// 5. HISTÓRICO DE EXAMES DE ULTRASSOM EMITIDOS
// ============================================================================
model ExameLaudo {
  id               String   @id @default(cuid())
  usuarioId        String   @map("usuario_id")
  usuario          Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  pacienteNome     String   @map("paciente_nome")
  pacienteEspecie  String   @map("paciente_especie")
  pacienteSexo     String?  @map("paciente_sexo")
  pacienteIdade    String?  @map("paciente_idade")
  tutorNome        String?  @map("tutor_nome")
  dataExame        String   @map("data_exame")

  laudoEstruturado Json     @map("laudo_estruturado")
  imagensQtd       Int      @default(0) @map("imagens_qtd")

  pdfArquivo       String?  @map("pdf_arquivo")
  docxArquivo      String?  @map("docx_arquivo")

  criadoEm         DateTime @default(now()) @map("criado_em")

  @@index([usuarioId])
  @@index([pacienteNome])
  @@index([criadoEm])
  @@map("exames_laudos")
}

// ============================================================================
// 6. HISTÓRICO DE RELATÓRIOS CIRÚRGICOS EMITIDOS
// ============================================================================
model RelatorioCirurgico {
  id              String   @id @default(cuid())
  usuarioId       String   @map("usuario_id")
  usuario         Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  pacienteNome    String   @map("paciente_nome")
  pacienteEspecie String?  @map("paciente_especie")
  procedimento    String
  diagnostico     String?
  modeloUtilizado String?  @map("modelo_utilizado")

  dadosCirurgia   Json     @map("dados_cirurgia")
  possuiFoto      Boolean  @default(false) @map("possui_foto")

  pdfArquivo      String?  @map("pdf_arquivo")
  docxArquivo     String?  @map("docx_arquivo")

  criadoEm        DateTime @default(now()) @map("criado_em")

  @@index([usuarioId])
  @@index([pacienteNome])
  @@index([criadoEm])
  @@map("relatorios_cirurgicos")
}

```

## 🚀 4. Roteiro de Execução Passo a Passo

### FASE 1: Infraestrutura Docker, `Dockerfile` & Instalação do Prisma

#### 1.1. Adicionar Dependências do Prisma e `p-queue` (Versão CommonJS)

> **Importante:** Fixar `p-queue@6.6.2` pois o projeto utiliza CommonJS (`"type": "commonjs"`). As versões 8+ do `p-queue` são Pure ESM e quebram ao executar `require('p-queue')`.

```
npm install @prisma/client p-queue@6.6.2
npm install prisma --save-dev

```

#### 1.2. Atualizar o `Dockerfile` (Suporte a `openssl` e `prisma generate`)

```
FROM node:20-slim

# Instala Chromium, fontes e OpenSSL (obrigatório para o motor do Prisma em Debian slim)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    chromium \
    fonts-liberation \
    fonts-crosextra-carlito \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

COPY . .

EXPOSE 3000

# Aplica migrações pendentes de forma segura em produção antes de iniciar o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node servidor_web.js"]

```

#### 1.3. Criar o Arquivo `docker-compose.yml` (Com Nome de Projeto Determinístico)

```
name: upa_pet

services:
  postgres:
    image: postgres:16-alpine
    container_name: upa_postgres
    restart: always
    environment:
      POSTGRES_DB: upa_pet_db
      POSTGRES_USER: upa_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-upa_super_secure_pass_2026}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U upa_user -d upa_pet_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    command: >
      postgres -c shared_buffers=128MB
               -c work_mem=4MB
               -c maintenance_work_mem=32MB
               -c max_connections=50
               -c effective_cache_size=1GB

  app:
    build: .
    container_name: upa_app
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://upa_user:${POSTGRES_PASSWORD:-upa_super_secure_pass_2026}@postgres:5432/upa_pet_db?schema=public
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_EMAILS=${ADMIN_EMAILS}
      - VET_EMAILS=${VET_EMAILS}
      - UPLOAD_PERSISTENT_DIR=/app/uploads
      - OUTPUT_PERSISTENT_DIR=/app/output
      - NODE_OPTIONS=--max-old-space-size=1536
    volumes:
      - app_uploads:/app/uploads
      - app_outputs:/app/output
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  app_uploads:
  app_outputs:

```

#### 1.4. Criar a Migration Inicial (Em Desenvolvimento) e Aplicar em Produção

```
# Em ambiente local/dev para gerar a pasta prisma/migrations:
npx prisma migrate dev --name init_postgresql_multitenant

# Na VPS em produção (executado automaticamente pelo CMD do Dockerfile):
npx prisma migrate deploy

```

### FASE 2: Script de Migração SQLite ➔ PostgreSQL (`scripts/migrate-sqlite-to-postgres.js`)

O script abaixo migra a clínica matriz, o layout institucional, todos os usuários (preservando `tema_preferencia`) e os modelos cirúrgicos (tanto os salvos na tabela `modelos_cirurgicos` do SQLite — para não perder edições feitas via interface web — quanto os arquivos JSON de `modelos_cirurgicos/`):

```
// scripts/migrate-sqlite-to-postgres.js
const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SQLITE_PATH = process.env.DB_PATH || path.join(__dirname, '../upa_pet.db');

async function migrar() {
  console.log('🔄 Iniciando migração: SQLite (upa_pet.db) ➔ PostgreSQL...');

  // 1. Cria a Clínica Matriz Padrão
  const clinicaPadrao = await prisma.clinica.upsert({
    where: { id: 'clinica_upa_pet' },
    update: {},
    create: {
      id: 'clinica_upa_pet',
      nome: 'UPA PET - Clínica Veterinária',
      cidade: 'Belo Horizonte',
      estado: 'MG'
    }
  });

  // 2. Migra Configurações de Layout
  let layoutOrigem = null;
  if (fs.existsSync(SQLITE_PATH)) {
    const sqlite = new Database(SQLITE_PATH, { readonly: true });
    try {
      layoutOrigem = sqlite.prepare('SELECT * FROM configuracoes_layout WHERE id = ?').get('padrao');
    } catch (_) {}
    sqlite.close();
  }

  await prisma.configuracaoLayout.upsert({
    where: { id: 'padrao' },
    update: {
      fontFamily: layoutOrigem?.font_family || 'Calibri, sans-serif',
      fontSizeBody: layoutOrigem?.font_size_body || '11pt',
      fontSizeTitulo: layoutOrigem?.font_size_titulo || '14pt',
      marginTop: layoutOrigem?.margin_top || '20mm',
      marginBottom: layoutOrigem?.margin_bottom || '20mm',
      marginLeft: layoutOrigem?.margin_left || '15mm',
      marginRight: layoutOrigem?.margin_right || '15mm',
      lineHeight: layoutOrigem?.line_height || '1.4',
      paragraphSpacing: layoutOrigem?.paragraph_spacing || '8pt',
      corPrimaria: layoutOrigem?.cor_primaria || '#1B365D',
      corSecundaria: layoutOrigem?.cor_secundaria || '#4A777A'
    },
    create: {
      id: 'padrao',
      nome: 'Layout Institucional UPA PET',
      isPadrao: true,
      clinicaId: clinicaPadrao.id,
      fontFamily: layoutOrigem?.font_family || 'Calibri, sans-serif',
      fontSizeBody: layoutOrigem?.font_size_body || '11pt',
      fontSizeTitulo: layoutOrigem?.font_size_titulo || '14pt',
      marginTop: layoutOrigem?.margin_top || '20mm',
      marginBottom: layoutOrigem?.margin_bottom || '20mm',
      marginLeft: layoutOrigem?.margin_left || '15mm',
      marginRight: layoutOrigem?.margin_right || '15mm',
      lineHeight: layoutOrigem?.line_height || '1.4',
      paragraphSpacing: layoutOrigem?.paragraph_spacing || '8pt',
      corPrimaria: layoutOrigem?.cor_primaria || '#1B365D',
      corSecundaria: layoutOrigem?.cor_secundaria || '#4A777A'
    }
  });
  console.log('🎨 Layout padrão migrado (id = "padrao").');

  // 3. Migra Usuários do SQLite (incluindo tema_preferencia) ou fallback do JSON
  const usuariosParaMigrar = [];
  if (fs.existsSync(SQLITE_PATH)) {
    const sqlite = new Database(SQLITE_PATH, { readonly: true });
    try {
      usuariosParaMigrar.push(...sqlite.prepare('SELECT * FROM usuarios').all());
    } catch (_) {}
    sqlite.close();
  } else if (fs.existsSync(path.join(__dirname, '../usuarios.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, '../usuarios.json'), 'utf8'));
    usuariosParaMigrar.push(...(j.usuarios || []));
  }

  for (const u of usuariosParaMigrar) {
    const emailNorm = (u.email || '').toLowerCase().trim();
    if (!emailNorm) continue;
    const tema = ['light', 'dark', 'system'].includes(u.tema_preferencia) ? u.tema_preferencia : 'system';

    await prisma.usuario.upsert({
      where: { email: emailNorm },
      update: {
        nome: u.nome,
        role: u.role,
        crmv: u.crmv || null,
        foto: u.foto || null,
        temaPreferencia: tema
      },
      create: {
        email: emailNorm,
        nome: u.nome,
        role: u.role || 'pendente',
        crmv: u.crmv || (emailNorm.includes('camila') ? 'CRMV/MG: 22904' : null),
        nomeClinica: 'UPA PET',
        clinicaId: clinicaPadrao.id,
        foto: u.foto || null,
        temaPreferencia: tema
      }
    });
    console.log(`👤 Usuário migrado: ${u.nome} (${emailNorm}) [tema: ${tema}]`);
  }

  // 4. Migra Modelos Cirúrgicos do SQLite + Arquivos JSON (isGlobal = true)
  const modelosMap = new Map();

  const pastaModelos = path.join(__dirname, '../modelos_cirurgicos');
  if (fs.existsSync(pastaModelos)) {
    const arquivos = fs.readdirSync(pastaModelos).filter(f => f.endsWith('.json'));
    for (const arq of arquivos) {
      const conteudo = JSON.parse(fs.readFileSync(path.join(pastaModelos, arq), 'utf8'));
      const id = String(conteudo.id || arq.replace('.json', '')).toLowerCase();
      modelosMap.set(id, {
        id,
        nome: conteudo.nome,
        sinonimos: Array.isArray(conteudo.sinonimos)
          ? conteudo.sinonimos
          : String(conteudo.sinonimos || '').split(',').map(s => s.trim()).filter(Boolean),
        procedimento: conteudo.procedimento || conteudo.nome,
        diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
        descricaoProcedimento: conteudo.descricaoProcedimento || '',
        evolucaoConsideracoes: conteudo.evolucaoConsideracoes || ''
      });
    }
  }

  // Sobrescreve/complementa com modelos do SQLite (preserva modelos criados via UI no Render)
  if (fs.existsSync(SQLITE_PATH)) {
    const sqlite = new Database(SQLITE_PATH, { readonly: true });
    try {
      const rows = sqlite.prepare('SELECT * FROM modelos_cirurgicos').all();
      for (const r of rows) {
        let sinonimos = [];
        try {
          sinonimos = JSON.parse(r.sinonimos || '[]');
          if (!Array.isArray(sinonimos)) sinonimos = [];
        } catch (_) {
          sinonimos = String(r.sinonimos || '').split(',').map(s => s.trim()).filter(Boolean);
        }
        modelosMap.set(String(r.id).toLowerCase(), {
          id: String(r.id).toLowerCase(),
          nome: r.nome,
          sinonimos,
          procedimento: r.procedimento || r.nome,
          diagnosticoPreCirurgico: r.diagnostico_pre_cirurgico || '',
          descricaoProcedimento: r.descricao_procedimento || '',
          evolucaoConsideracoes: r.evolucao_consideracoes || ''
        });
      }
    } catch (_) {}
    sqlite.close();
  }

  for (const m of modelosMap.values()) {
    await prisma.modeloCirurgico.upsert({
      where: { id: m.id },
      update: {
        nome: m.nome,
        sinonimos: m.sinonimos,
        procedimento: m.procedimento,
        diagnosticoPreCirurgico: m.diagnosticoPreCirurgico,
        descricaoProcedimento: m.descricaoProcedimento,
        evolucaoConsideracoes: m.evolucaoConsideracoes,
        isGlobal: true,
        usuarioId: null
      },
      create: {
        id: m.id,
        nome: m.nome,
        sinonimos: m.sinonimos,
        procedimento: m.procedimento,
        diagnosticoPreCirurgico: m.diagnosticoPreCirurgico,
        descricaoProcedimento: m.descricaoProcedimento,
        evolucaoConsideracoes: m.evolucaoConsideracoes,
        isGlobal: true,
        usuarioId: null
      }
    });
    console.log(`🔪 Modelo global migrado: ${m.nome} (${m.id})`);
  }

  console.log('✅ Migração para PostgreSQL concluída com sucesso!');
}

migrar()
  .catch(err => { console.error('Erro na migração:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

```

### FASE 3: Refatoração da Camada de Serviços (Transição Sync ➔ Async Sem Regressões)

#### 3.1. Cliente Prisma Centralizado (`db.js`)

```
// db.js (Versão PostgreSQL + Prisma)
const { PrismaClient } = require('@prisma/client');

const prisma = global.__upaPrisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  global.__upaPrisma = prisma;
}

module.exports = {
  prisma,
  getDbPath: () => process.env.DATABASE_URL ? 'postgresql://[prisma]' : 'upa_pet.db'
};

```

#### 3.2. Refatoração Completa de `gerenciador_usuarios.js` (Com `id`, Branding e Tema)

> **Correções aplicadas:** `perfilParaResposta()` agora expõe `id`, `clinicaId`, `nomeClinica`, `logoUrl`, `assinaturaUrl` e `temaPreferencia`. Foram adicionadas `obterTemaUsuario` e `atualizarTemaUsuario` para eliminar as queries SQLite cruas de `servidor_web.js`.

```
// gerenciador_usuarios.js
const { prisma } = require('./db');

const ROLES = {
  admin: {
    nome: 'Administrador(a)',
    permissoes: ['gerar_ultrassom', 'gerar_cirurgia', 'gerenciar_usuarios', 'visualizar_relatorios']
  },
  veterinario: {
    nome: 'Médico(a) Veterinário(a)',
    permissoes: ['gerar_ultrassom', 'gerar_cirurgia', 'visualizar_relatorios']
  },
  assistente: {
    nome: 'Assistente / Recepção',
    permissoes: ['visualizar_relatorios']
  },
  pendente: {
    nome: 'Acesso Pendente / Bloqueado',
    permissoes: []
  }
};

function emailsDeEnv(prefixo) {
  return (process.env[`${prefixo}_EMAILS`] || '')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function perfilParaResposta(usuario) {
  const roleDef = ROLES[usuario.role] || ROLES.pendente;
  return {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    foto: usuario.foto || null,
    role: usuario.role,
    roleDescricao: roleDef.nome,
    permissoes: roleDef.permissoes,
    podeGerarLaudos: roleDef.permissoes.includes('gerar_ultrassom'),
    podeGerarCirurgia: roleDef.permissoes.includes('gerar_cirurgia'),
    crmv: usuario.crmv || null,
    clinicaId: usuario.clinicaId || null,
    nomeClinica: usuario.nomeClinica || (usuario.clinica && usuario.clinica.nome) || 'UPA PET',
    logoUrl: usuario.logoUrl || null,
    assinaturaUrl: usuario.assinaturaUrl || null,
    temaPreferencia: usuario.temaPreferencia || 'system'
  };
}

async function obterPerfilUsuario(email, nome, foto = null) {
  const emailNorm = (email || '').toLowerCase().trim();
  if (!emailNorm) {
    throw new Error('E-mail do usuário não informado.');
  }
  const nomeLimpo = (nome || '').trim() || emailNorm.split('@')[0];
  const adminEmails = emailsDeEnv('ADMIN');
  const vetEmails = emailsDeEnv('VET');

  let usuario = await prisma.usuario.findUnique({
    where: { email: emailNorm },
    include: { clinica: true }
  });

  if (!usuario) {
    let roleInicial = 'pendente';
    if (adminEmails.includes(emailNorm)) roleInicial = 'admin';
    else if (vetEmails.includes(emailNorm)) roleInicial = 'veterinario';

    usuario = await prisma.usuario.create({
      data: {
        email: emailNorm,
        nome: nomeLimpo,
        role: roleInicial,
        foto: foto || null,
        crmv: emailNorm.includes('camila') ? 'CRMV/MG: 22904' : null,
        nomeClinica: 'UPA PET'
      },
      include: { clinica: true }
    });
  } else {
    const dataUpdate = {};
    if (nome && usuario.nome !== nomeLimpo) dataUpdate.nome = nomeLimpo;
    if (foto && usuario.foto !== foto) dataUpdate.foto = foto;
    if (adminEmails.includes(emailNorm) && usuario.role !== 'admin') dataUpdate.role = 'admin';

    if (Object.keys(dataUpdate).length > 0) {
      usuario = await prisma.usuario.update({
        where: { email: emailNorm },
        data: dataUpdate,
        include: { clinica: true }
      });
    }
  }

  return perfilParaResposta(usuario);
}

function temPermissao(usuario, permissao) {
  if (!usuario) return false;
  if (usuario.role === 'admin') return true;
  const roleDef = ROLES[usuario.role];
  return Boolean(roleDef && roleDef.permissoes.includes(permissao));
}

async function listarUsuarios() {
  const lista = await prisma.usuario.findMany({
    orderBy: { email: 'asc' },
    include: { clinica: true }
  });
  return lista.map(perfilParaResposta);
}

async function atualizarCargoUsuario(email, novoRole) {
  if (!ROLES[novoRole]) throw new Error(`Cargo inválido: ${novoRole}`);
  const emailNorm = (email || '').toLowerCase().trim();
  const existente = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (!existente) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  const atualizado = await prisma.usuario.update({
    where: { email: emailNorm },
    data: { role: novoRole },
    include: { clinica: true }
  });
  return perfilParaResposta(atualizado);
}

async function obterTemaUsuario(email) {
  const emailNorm = (email || '').toLowerCase().trim();
  const u = await prisma.usuario.findUnique({
    where: { email: emailNorm },
    select: { temaPreferencia: true }
  });
  return u?.temaPreferencia || 'system';
}

async function atualizarTemaUsuario(email, tema) {
  const emailNorm = (email || '').toLowerCase().trim();
  const u = await prisma.usuario.update({
    where: { email: emailNorm },
    data: { temaPreferencia: tema },
    select: { temaPreferencia: true }
  });
  return u.temaPreferencia;
}

async function atualizarPerfilProfissional(usuarioId, dados) {
  const dataUpdate = {};
  if (dados.nome !== undefined) dataUpdate.nome = String(dados.nome).trim();
  if (dados.crmv !== undefined) dataUpdate.crmv = String(dados.crmv).trim() || null;
  if (dados.nomeClinica !== undefined) dataUpdate.nomeClinica = String(dados.nomeClinica).trim() || null;
  if (dados.logoUrl !== undefined) dataUpdate.logoUrl = dados.logoUrl;
  if (dados.assinaturaUrl !== undefined) dataUpdate.assinaturaUrl = dados.assinaturaUrl;

  const atualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: dataUpdate,
    include: { clinica: true }
  });
  return perfilParaResposta(atualizado);
}

module.exports = {
  ROLES,
  obterPerfilUsuario,
  temPermissao,
  listarUsuarios,
  atualizarCargoUsuario,
  obterTemaUsuario,
  atualizarTemaUsuario,
  atualizarPerfilProfissional
};

```

#### 3.3. Refatoração de `gerenciador_layout.js` (Retorno `snake_case` + Multi-Tenant)

> **Correções aplicadas:** Mantém 100% de compatibilidade com os nomes `snake_case` esperados por `motor_laudo.js`, `gerar_docx.js`, `gerar_html.js`, `validation.js` e `tests/*.test.js`, enquanto permite layout customizado por `usuarioId` com fallback automático para o layout padrão (`id = 'padrao'`).

```
// gerenciador_layout.js
const { prisma } = require('./db');

const LAYOUT_PADRAO = {
  id: 'padrao',
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

function prismaParaSnakeCase(row) {
  if (!row) return { ...LAYOUT_PADRAO };
  return {
    id: row.id,
    usuario_id: row.usuarioId || null,
    clinica_id: row.clinicaId || null,
    font_family: row.fontFamily || LAYOUT_PADRAO.font_family,
    font_size_body: row.fontSizeBody || LAYOUT_PADRAO.font_size_body,
    font_size_titulo: row.fontSizeTitulo || LAYOUT_PADRAO.font_size_titulo,
    margin_top: row.marginTop || LAYOUT_PADRAO.margin_top,
    margin_bottom: row.marginBottom || LAYOUT_PADRAO.margin_bottom,
    margin_left: row.marginLeft || LAYOUT_PADRAO.margin_left,
    margin_right: row.marginRight || LAYOUT_PADRAO.margin_right,
    line_height: row.lineHeight || LAYOUT_PADRAO.line_height,
    paragraph_spacing: row.paragraphSpacing || LAYOUT_PADRAO.paragraph_spacing,
    cor_primaria: row.corPrimaria || LAYOUT_PADRAO.cor_primaria,
    cor_secundaria: row.corSecundaria || LAYOUT_PADRAO.cor_secundaria,
    atualizado_em: row.atualizadoEm ? row.atualizadoEm.toISOString() : new Date().toISOString()
  };
}

async function garantirLayoutPadrao() {
  return await prisma.configuracaoLayout.upsert({
    where: { id: 'padrao' },
    update: {},
    create: {
      id: 'padrao',
      nome: 'Padrão Oficial UPA PET',
      isPadrao: true,
      fontFamily: LAYOUT_PADRAO.font_family,
      fontSizeBody: LAYOUT_PADRAO.font_size_body,
      fontSizeTitulo: LAYOUT_PADRAO.font_size_titulo,
      marginTop: LAYOUT_PADRAO.margin_top,
      marginBottom: LAYOUT_PADRAO.margin_bottom,
      marginLeft: LAYOUT_PADRAO.margin_left,
      marginRight: LAYOUT_PADRAO.margin_right,
      lineHeight: LAYOUT_PADRAO.line_height,
      paragraphSpacing: LAYOUT_PADRAO.paragraph_spacing,
      corPrimaria: LAYOUT_PADRAO.cor_primaria,
      corSecundaria: LAYOUT_PADRAO.cor_secundaria
    }
  });
}

async function obterLayout(usuarioId = null) {
  if (usuarioId) {
    const custom = await prisma.configuracaoLayout.findUnique({
      where: { usuarioId }
    });
    if (custom) return prismaParaSnakeCase(custom);
  }
  const padrao = await garantirLayoutPadrao();
  return prismaParaSnakeCase(padrao);
}

async function salvarLayout(dadosNovos = {}, usuario = null) {
  const isCustomUser = usuario && usuario.id && usuario.role !== 'admin';
  const atual = await obterLayout(isCustomUser ? usuario.id : null);

  const payloadPrisma = {
    fontFamily: dadosNovos.font_family || atual.font_family,
    fontSizeBody: dadosNovos.font_size_body || atual.font_size_body,
    fontSizeTitulo: dadosNovos.font_size_titulo || atual.font_size_titulo,
    marginTop: dadosNovos.margin_top || atual.margin_top,
    marginBottom: dadosNovos.margin_bottom || atual.margin_bottom,
    marginLeft: dadosNovos.margin_left || atual.margin_left,
    marginRight: dadosNovos.margin_right || atual.margin_right,
    lineHeight: dadosNovos.line_height !== undefined ? String(dadosNovos.line_height) : atual.line_height,
    paragraphSpacing: dadosNovos.paragraph_spacing || atual.paragraph_spacing,
    corPrimaria: dadosNovos.cor_primaria || atual.cor_primaria,
    corSecundaria: dadosNovos.cor_secundaria || atual.cor_secundaria
  };

  if (isCustomUser) {
    const row = await prisma.configuracaoLayout.upsert({
      where: { usuarioId: usuario.id },
      update: payloadPrisma,
      create: {
        id: `layout_${usuario.id}`,
        nome: `Layout de ${usuario.nome}`,
        isPadrao: false,
        usuarioId: usuario.id,
        ...payloadPrisma
      }
    });
    return prismaParaSnakeCase(row);
  }

  await garantirLayoutPadrao();
  const row = await prisma.configuracaoLayout.update({
    where: { id: 'padrao' },
    data: payloadPrisma
  });
  return prismaParaSnakeCase(row);
}

async function restaurarLayoutPadrao(usuario = null) {
  const isCustomUser = usuario && usuario.id && usuario.role !== 'admin';
  if (isCustomUser) {
    await prisma.configuracaoLayout.deleteMany({ where: { usuarioId: usuario.id } });
    return await obterLayout(null);
  }

  const row = await prisma.configuracaoLayout.upsert({
    where: { id: 'padrao' },
    update: {
      fontFamily: LAYOUT_PADRAO.font_family,
      fontSizeBody: LAYOUT_PADRAO.font_size_body,
      fontSizeTitulo: LAYOUT_PADRAO.font_size_titulo,
      marginTop: LAYOUT_PADRAO.margin_top,
      marginBottom: LAYOUT_PADRAO.margin_bottom,
      marginLeft: LAYOUT_PADRAO.margin_left,
      marginRight: LAYOUT_PADRAO.margin_right,
      lineHeight: LAYOUT_PADRAO.line_height,
      paragraphSpacing: LAYOUT_PADRAO.paragraph_spacing,
      corPrimaria: LAYOUT_PADRAO.cor_primaria,
      corSecundaria: LAYOUT_PADRAO.cor_secundaria
    },
    create: {
      id: 'padrao',
      nome: 'Padrão Oficial UPA PET',
      isPadrao: true,
      fontFamily: LAYOUT_PADRAO.font_family,
      fontSizeBody: LAYOUT_PADRAO.font_size_body,
      fontSizeTitulo: LAYOUT_PADRAO.font_size_titulo,
      marginTop: LAYOUT_PADRAO.margin_top,
      marginBottom: LAYOUT_PADRAO.margin_bottom,
      marginLeft: LAYOUT_PADRAO.margin_left,
      marginRight: LAYOUT_PADRAO.margin_right,
      lineHeight: LAYOUT_PADRAO.line_height,
      paragraphSpacing: LAYOUT_PADRAO.paragraph_spacing,
      corPrimaria: LAYOUT_PADRAO.cor_primaria,
      corSecundaria: LAYOUT_PADRAO.cor_secundaria
    }
  });
  return prismaParaSnakeCase(row);
}

function medidaParaTwips(valorStr, fallbackTwips = 850) {
  if (!valorStr || typeof valorStr !== 'string') return fallbackTwips;
  const limpo = valorStr.trim().toLowerCase();
  const matchMm = limpo.match(/^([\d.]+)\s*mm$/);
  if (matchMm) return Math.round(parseFloat(matchMm[1]) * 56.6929);
  const matchPt = limpo.match(/^([\d.]+)\s*pt$/);
  if (matchPt) return Math.round(parseFloat(matchPt[1]) * 20);
  const num = parseFloat(limpo);
  if (!isNaN(num)) return num <= 40 ? Math.round(num * 56.6929) : Math.round(num);
  return fallbackTwips;
}

function ptParaHalfPoints(valorStr, fallbackHalfPoints = 22) {
  if (!valorStr || typeof valorStr !== 'string') return fallbackHalfPoints;
  const match = valorStr.trim().match(/^([\d.]+)/);
  if (!match) return fallbackHalfPoints;
  const pt = parseFloat(match[1]);
  return isNaN(pt) ? fallbackHalfPoints : Math.round(pt * 2);
}

function converterParaDocx(layout) {
  const cfg = layout || LAYOUT_PADRAO;
  const fontMatch = (cfg.font_family || 'Calibri').split(',')[0].replace(/['"]/g, '').trim();
  const szCorpo = ptParaHalfPoints(cfg.font_size_body, 22);
  const szTitulo = ptParaHalfPoints(cfg.font_size_titulo, 28);
  const marginTop = medidaParaTwips(cfg.margin_top, 1134);
  const marginBottom = medidaParaTwips(cfg.margin_bottom, 1134);
  const marginLeft = medidaParaTwips(cfg.margin_left, 850);
  const marginRight = medidaParaTwips(cfg.margin_right, 850);
  const spacingAfter = medidaParaTwips(cfg.paragraph_spacing, 160);
  const lineMultiplier = parseFloat(cfg.line_height) || 1.4;
  const lineSpacing = Math.round(lineMultiplier * 240);
  const corPrimariaHex = (cfg.cor_primaria || '#1B365D').replace(/^#/, '').toUpperCase();
  const corSecundariaHex = (cfg.cor_secundaria || '#4A777A').replace(/^#/, '').toUpperCase();

  return {
    fontFamily: fontMatch,
    szCorpo,
    szTitulo,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    spacingAfter,
    lineSpacing,
    corPrimariaHex,
    corSecundariaHex
  };
}

module.exports = {
  LAYOUT_PADRAO,
  obterLayout,
  salvarLayout,
  restaurarLayoutPadrao,
  converterParaDocx,
  medidaParaTwips,
  ptParaHalfPoints
};

```

#### 3.4. Refatoração de `gerenciador_modelos.js` (Multi-Tenant + Prevenção de Colisão de ID + Inferência Async)

> **Correções aplicadas:**
>
> 1. Modelos privados recebem chave primária `${usuario.id}__${slugBase}` quando criados por veterinários não-admin (ou quando o slug já pertence a um modelo global), impedindo colisão de PK.
>
> 2. `obterTextoModelosParaPrompt(usuarioId)` e `inferirModeloPorTexto(procedimentoTexto, usuarioId)` agora são `async` e consideram os modelos globais + modelos privados do médico logado.
>
> 3. `syncModelosDoJson()` foi convertida para `async` sobre o Prisma.

```
// gerenciador_modelos.js
const fs = require('fs');
const path = require('path');
const { prisma } = require('./db');

function sanitizarId(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizarSinonimos(entrada) {
  if (Array.isArray(entrada)) {
    return entrada.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof entrada === 'string') {
    return entrada.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function carregarModelosCirurgicos(usuarioId = null) {
  return await prisma.modeloCirurgico.findMany({
    where: {
      OR: [
        { isGlobal: true },
        ...(usuarioId ? [{ usuarioId }] : [])
      ]
    },
    orderBy: { nome: 'asc' }
  });
}

async function obterModeloPorId(id, usuarioId = null) {
  if (!id) return null;
  return await prisma.modeloCirurgico.findFirst({
    where: {
      id: String(id),
      OR: [
        { isGlobal: true },
        ...(usuarioId ? [{ usuarioId }] : [])
      ]
    }
  });
}

async function salvarOuCriarModelo(dados, usuario = null) {
  if (!dados || typeof dados !== 'object') {
    throw new Error('Dados inválidos para o modelo cirúrgico.');
  }

  const nome = (dados.nome || '').trim();
  const procedimento = (dados.procedimento || nome).trim();
  const descricaoProcedimento = (dados.descricaoProcedimento || '').trim();
  const evolucaoConsideracoes = (dados.evolucaoConsideracoes || '').trim();
  const diagnosticoPreCirurgico = (dados.diagnosticoPreCirurgico || '').trim();

  if (!nome) throw new Error('O nome do modelo cirúrgico é obrigatório.');
  if (!descricaoProcedimento) throw new Error('A descrição da técnica cirúrgica padronizada é obrigatória.');

  const isAdmin = !usuario || usuario.role === 'admin';
  const querGlobal = isAdmin && (dados.isGlobal !== false);
  const slugBase = sanitizarId(dados.id || nome) || `modelo_${Date.now()}`;

  // Se for privado de um veterinário, garante namespace com usuario.id para nunca colidir com modelos globais
  let idFinal = slugBase;
  if (!querGlobal && usuario && usuario.id) {
    const PrefixoUsuario = `${usuario.id}__`;
    idFinal = slugBase.startsWith(PrefixoUsuario) ? slugBase : `${PrefixoUsuario}${slugBase}`;
  }

  const existente = await prisma.modeloCirurgico.findUnique({ where: { id: idFinal } });

  if (existente && existente.isGlobal && !isAdmin) {
    throw new Error('Modelos institucionais só podem ser alterados por administradores. Utilize "Duplicar para meu perfil".');
  }
  if (existente && !existente.isGlobal && usuario && existente.usuarioId !== usuario.id && !isAdmin) {
    throw new Error('Você não tem permissão para editar um modelo de outro profissional.');
  }

  const sinonimos = normalizarSinonimos(dados.sinonimos);

  return await prisma.modeloCirurgico.upsert({
    where: { id: idFinal },
    update: {
      nome,
      sinonimos,
      procedimento,
      diagnosticoPreCirurgico,
      descricaoProcedimento,
      evolucaoConsideracoes
    },
    create: {
      id: idFinal,
      nome,
      sinonimos,
      procedimento,
      diagnosticoPreCirurgico,
      descricaoProcedimento,
      evolucaoConsideracoes,
      isGlobal: querGlobal,
      usuarioId: querGlobal ? null : (usuario?.id || null)
    }
  });
}

async function clonarModeloParaUsuario(modeloId, usuario) {
  if (!usuario || !usuario.id) throw new Error('Usuário inválido para clonagem.');
  const original = await prisma.modeloCirurgico.findUnique({ where: { id: String(modeloId) } });
  if (!original) throw new Error('Modelo original não encontrado.');

  const slugBase = sanitizarId(original.nome);
  const novoId = `${usuario.id}__${slugBase}_${Date.now().toString(36)}`;

  return await prisma.modeloCirurgico.create({
    data: {
      id: novoId,
      nome: `${original.nome} (Personalizado)`,
      sinonimos: original.sinonimos || [],
      procedimento: original.procedimento,
      diagnosticoPreCirurgico: original.diagnosticoPreCirurgico || '',
      descricaoProcedimento: original.descricaoProcedimento,
      evolucaoConsideracoes: original.evolucaoConsideracoes || '',
      isGlobal: false,
      usuarioId: usuario.id
    }
  });
}

async function excluirModelo(id, usuario = null) {
  if (!id) throw new Error('ID do modelo não fornecido.');
  const existente = await prisma.modeloCirurgico.findUnique({ where: { id: String(id) } });
  if (!existente) return false;

  const isAdmin = !usuario || usuario.role === 'admin';
  if (existente.isGlobal && !isAdmin) {
    throw new Error('Apenas administradores podem excluir modelos institucionais.');
  }
  if (!existente.isGlobal && usuario && existente.usuarioId !== usuario.id && !isAdmin) {
    throw new Error('Você não pode excluir o modelo privado de outro veterinário.');
  }

  await prisma.modeloCirurgico.delete({ where: { id: String(id) } });
  return true;
}

async function syncModelosDoJson() {
  const pastaModelos = path.join(__dirname, 'modelos_cirurgicos');
  if (!fs.existsSync(pastaModelos)) {
    return { atualizados: 0, novos: 0, erros: ['Pasta modelos_cirurgicos não existe.'] };
  }

  const arquivos = fs.readdirSync(pastaModelos).filter((f) => f.endsWith('.json'));
  const antes = await prisma.modeloCirurgico.count();
  const mensagensErro = [];

  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(fs.readFileSync(path.join(pastaModelos, arq), 'utf8'));
      const id = String(conteudo.id || arq.replace('.json', '')).toLowerCase();
      const sinonimos = normalizarSinonimos(conteudo.sinonimos);

      await prisma.modeloCirurgico.upsert({
        where: { id },
        update: {
          nome: conteudo.nome || '',
          sinonimos,
          procedimento: conteudo.procedimento || conteudo.nome || '',
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento || '',
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true
        },
        create: {
          id,
          nome: conteudo.nome || '',
          sinonimos,
          procedimento: conteudo.procedimento || conteudo.nome || '',
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento || '',
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true,
          usuarioId: null
        }
      });
    } catch (err) {
      mensagensErro.push(`erro ao sincronizar ${arq}: ${err.message}`);
    }
  }

  const depois = await prisma.modeloCirurgico.count();
  const novos = Math.max(0, depois - antes);
  const atualizados = Math.max(0, arquivos.length - novos);
  return { atualizados, novos, erros: mensagensErro };
}

async function obterTextoModelosParaPrompt(usuarioId = null) {
  const modelos = await carregarModelosCirurgicos(usuarioId);
  let texto = '=== BIBLIOTECA DE MODELOS CIRÚRGICOS PADRONIZADOS ===\n\n';

  modelos.forEach((m, idx) => {
    texto += `[MODELO ${idx + 1}: ${m.nome.toUpperCase()}]\n`;
    texto += `Sinônimos / Palavras-chave: ${(m.sinonimos || []).join(', ')}\n`;
    texto += `PROCEDIMENTO: ${m.procedimento}\n`;
    texto += `DIAGNÓSTICO PRÉ-CIRÚRGICO: ${m.diagnosticoPreCirurgico || ''}\n`;
    texto += `DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO:\n${m.descricaoProcedimento}\n`;
    texto += `EVOLUÇÃO E CONSIDERAÇÕES:\n${m.evolucaoConsideracoes || ''}\n\n`;
    texto += `----------------------------------------------------\n\n`;
  });

  return texto;
}

async function inferirModeloPorTexto(procedimentoTexto, usuarioId = null) {
  if (!procedimentoTexto || typeof procedimentoTexto !== 'string') return null;
  const texto = procedimentoTexto.toLowerCase().trim();
  if (!texto) return null;

  const modelos = await carregarModelosCirurgicos(usuarioId);
  if (modelos.length === 0) return null;

  // Prioriza modelos privados do usuário sobre modelos globais em caso de empate
  const modelosOrdenados = [...modelos].sort((a, b) => Number(a.isGlobal) - Number(b.isGlobal));

  const palavrasModelo = (s) => String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9à-ãâçéíóúü]+/g, ' ')
    .split(/\s+/)
    .filter((p) => p && p.length >= 2);

  const porNome = modelosOrdenados.find(
    (m) => texto === (m.nome || '').toLowerCase() || texto.includes((m.nome || '').toLowerCase())
  );
  if (porNome) return porNome;

  const textoPalavras = texto.split(/[^a-z0-9à-ãâçéíóúü\s]/g).filter((p) => p && p.length >= 2);
  const porSinonimo = modelosOrdenados.find((m) =>
    (m.sinonimos || []).some((s) =>
      s.toLowerCase().split(/\s+/).some((word) => textoPalavras.includes(word.toLowerCase()))
    )
  );
  if (porSinonimo) return porSinonimo;

  let melhor = null;
  let melhorScore = 0;
  for (const m of modelosOrdenados) {
    const palavrasProc = palavrasModelo(m.procedimento);
    const palavrasDesc = palavrasModelo(m.descricaoProcedimento);
    let score = 0;
    for (const p of textoPalavras) {
      if (palavrasProc.includes(p)) score += 3;
      else if (palavrasDesc.includes(p)) score += 1;
    }
    if (score > melhorScore) {
      melhorScore = score;
      melhor = m;
    }
  }
  return melhorScore >= 2 ? melhor : null;
}

module.exports = {
  carregarModelosCirurgicos,
  obterModeloPorId,
  salvarOuCriarModelo,
  clonarModeloParaUsuario,
  excluirModelo,
  obterTextoModelosParaPrompt,
  syncModelosDoJson,
  inferirModeloPorTexto
};

```

#### 3.5. Refatoração de `seed.js` e `bootServidor()` em `servidor_web.js`

> **Correções aplicadas:**
>
> 1. `seed.js` passa a ser assíncrono via Prisma (`await executarSeed()`).
>
> 2. O middleware `obterUsuarioSessao`, as rotas `/api/usuario/tema`, `/api/admin/usuarios`, `/api/modelos-cirurgicos`, `/api/layout-config`, `/api/cirurgia` e o `bootServidor()` em `servidor_web.js` usam `async/await` e desativam o restore SQLite do `backup-db.js` quando `process.env.DATABASE_URL` está ativo.

```
// seed.js (Versão Assíncrona Prisma)
const { prisma } = require('./db');
const { syncModelosDoJson } = require('./gerenciador_modelos');
const { obterLayout } = require('./gerenciador_layout');

const USUARIOS_PADRAO = [
  {
    email: 'camilabastos@upapet.com.br',
    nome: 'Dra. Camila Bastos',
    role: 'admin',
    crmv: 'CRMV/MG: 22904',
    nomeClinica: 'UPA PET'
  },
  {
    email: 'matheusteteu00123@gmail.com',
    nome: 'Matheus Augusto',
    role: 'admin',
    crmv: null,
    nomeClinica: 'UPA PET'
  }
];

async function executarSeed() {
  const inicio = Date.now();
  const clinica = await prisma.clinica.upsert({
    where: { id: 'clinica_upa_pet' },
    update: {},
    create: {
      id: 'clinica_upa_pet',
      nome: 'UPA PET - Clínica Veterinária',
      cidade: 'Belo Horizonte',
      estado: 'MG'
    }
  });

  for (const u of USUARIOS_PADRAO) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, clinicaId: clinica.id }
    });
  }

  await obterLayout(null);
  await syncModelosDoJson();
  console.log(`[seed] PostgreSQL inicializado em ${Date.now() - inicio} ms`);
}

if (require.main === module) {
  executarSeed().finally(() => prisma.$disconnect());
}

module.exports = { executarSeed };

```

Trechos de `servidor_web.js` a atualizar:

```
// 1. Middleware de Sessão Assíncrono (linhas 140-156 de servidor_web.js)
async function obterUsuarioSessao(req, res, next) {
  const token = req.cookies?.upa_pet_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    req.usuario = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = await obterPerfilUsuario(decoded.email, decoded.nome, decoded.foto);
  } catch (err) {
    req.usuario = null;
  }
  next();
}

// 2. Rotas de Tema sem SQLite cru (linhas 291-325 de servidor_web.js)
app.get('/api/usuario/tema', exigirAutenticacao, async (req, res) => {
  try {
    const tema = await obterTemaUsuario(req.usuario.email);
    res.json({ sucesso: true, tema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuario/tema', exigirAutenticacao, validate(temaSchemas.updateTema, 'body'), async (req, res) => {
  try {
    const tema = await atualizarTemaUsuario(req.usuario.email, req.body.tema);
    res.json({ sucesso: true, tema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Boot do Servidor Desacoplado do SQLite (linhas 2214-2284 de servidor_web.js)
(async function bootServidor() {
  try {
    await executarSeed();

    if (process.env.NODE_ENV !== 'test') {
      await syncModelosDoJson();
    }

    const server = app.listen(PORT, () => {
      logger.info('Servidor inicializado', {
        porta: PORT,
        url: `http://localhost:${PORT}`,
        service: 'UPA PET - Automacao SaaS',
        database: 'PostgreSQL (Prisma)'
      });
    });
  } catch (err) {
    logger.error('[boot] falha na inicialização', { stack: err.stack, message: err.message });
    process.exit(1);
  }
})();

```

### FASE 4: Dinamização de Marca nos Geradores de Documentos e Prompts de IA

#### 4.1. Parametrização em `motor_laudo.js` e `gerar_docx.js` (Com Correção da Página 2)

> **Correção aplicada em `gerar_docx.js`:** Na linha 196 atual, a chamada `criarCabecalhoDocx(dados, logoPath)` nas páginas do mosaico de imagens não repassava `cfgDocx`. Abaixo, tanto `motor_laudo.js` quanto `gerar_docx.js` recebem `opcoes = { usuario, layout }`, injetam o nome/CRMV/logo do médico com fallback para a Dra. Camila Bastos e corrigem a assinatura de `criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome)` em todas as páginas.

```
// motor_laudo.js (Trecho de Parametrização Multi-Tenant)
async function gerarDocumentosExame(dadosPaciente, laudoArray, imagensPaths, pastaSaida, customLayout = null, opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = customLayout || await obterLayout(usuario.id || null);

  const nomeMedico = usuario.nome || 'Camila Bastos';
  const crmvMedico = usuario.crmv || 'CRMV/MG: 22904';
  const clinicaNome = usuario.nomeClinica || 'UPA PET';

  const caminhoLogoEfetivo = (usuario.logoUrl && fs.existsSync(usuario.logoUrl))
    ? usuario.logoUrl
    : logoPath;

  const logoBase64 = fs.existsSync(caminhoLogoEfetivo) ? fs.readFileSync(caminhoLogoEfetivo).toString('base64') : '';
  const logoMime = path.extname(caminhoLogoEfetivo).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

  // Na assinatura HTML (linhas 144-147 de motor_laudo.js):
  // <div class="signature">
  //   <p><strong>${nomeMedico}</strong></p>
  //   <p>${crmvMedico}</p>
  // </div>

  // Na chamada do DOCX (linha 195 de motor_laudo.js):
  await gerarDocxLaudo(dadosPaciente, laudoArray, caminhoDocx, caminhoLogoEfetivo, imagensPaths, layout, {
    nomeMedico,
    crmvMedico,
    clinicaNome
  });
  return { caminhoPdf, caminhoDocx };
}

```

Em `gerar_docx.js`:

```
// gerar_docx.js — Correção de async obterLayout, assinatura dinâmica e cfgDocx na Página 2
async function gerarDocxLaudo(dados, laudo, caminhoSaida, logoPath, imagensPaths = [], customLayout = null, opcoes = {}) {
  const layout = customLayout || await obterLayout(opcoes.usuarioId || null);
  const cfgDocx = converterParaDocx(layout);
  const nomeMedico = opcoes.nomeMedico || 'Camila Bastos';
  const crmvMedico = opcoes.crmvMedico || 'CRMV/MG: 22904';
  const clinicaNome = opcoes.clinicaNome || 'UPA PET';

  // ... Página 1 usa criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome) ...
  // ... Assinatura usa nomeMedico e crmvMedico ...
  // ... Página 2 (linha 196 corrigida):
  children.push(criarCabecalhoDocx(dados, logoPath, cfgDocx, clinicaNome));
}

```

#### 4.2. Parametrização Completa em `motor_cirurgia.js` (Preservando a Regra da Página Única)

> **Correção aplicada:** `motor_cirurgia.js` importava `obterLayout` e `converterParaDocx` na linha 6 sem utilizá-los. Agora `gerarDocumentosCirurgicos(dadosPaciente, dadosCirurgia, pastaDestino, imagens, opcoes = {})` aplica a fonte e cores do médico, substitui `LOGO_PATH`, `ASSINATURA_PATH`, nome e CRMV dinamicamente, e **preserva a calibração automática de tamanho de fonte (`ehTextoLongo > 1750` e `ehTextoMuitoLongo > 2300`)** para garantir que o relatório cirúrgico jamais ultrapasse 1 página A4.

```
// motor_cirurgia.js (Trecho Multi-Tenant em gerarDocxCirurgico e gerarPdfCirurgico)
async function gerarDocumentosCirurgicos(dadosPaciente, dadosCirurgia, pastaDestino, imagens = [], opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = opcoes.layout || await obterLayout(usuario.id || null);
  const cfgDocx = converterParaDocx(layout);

  const contexto = {
    nomeMedico: usuario.nome || 'Camila Bastos',
    crmvMedico: usuario.crmv || 'CRMV/MG: 22904',
    clinicaNome: usuario.nomeClinica || 'UPA PET',
    logoPath: (usuario.logoUrl && fs.existsSync(usuario.logoUrl)) ? usuario.logoUrl : LOGO_PATH,
    assinaturaPath: (usuario.assinaturaUrl && fs.existsSync(usuario.assinaturaUrl))
      ? usuario.assinaturaUrl
      : ( (!usuario.id || (usuario.email || '').includes('camila')) ? ASSINATURA_PATH : null ),
    layout,
    cfgDocx
  };

  await gerarDocxCirurgico(dadosPaciente, dadosCirurgia, caminhoDocx, imagens, contexto);
  await gerarPdfCirurgico(dadosPaciente, dadosCirurgia, caminhoPdf, imagens, contexto);
  return { caminhoDocx, caminhoPdf };
}

```

#### 4.3. Injeção de Contexto Dinâmico em `analisador_ia.js` e `analisador_cirurgia.js`

1. **Em `analisador_cirurgia.js` (linha 40):**

   ```
   async function analisarCirurgiaComIA(arquivos, apiKey, opcoes = {}) {
     const usuario = opcoes.usuario || null;
     const modelosBiblioteca = await obterTextoModelosParaPrompt(usuario?.id || null);
     const nomeClinica = usuario?.nomeClinica || 'UPA PET';
     const identificacaoMedico = usuario?.nome
       ? `${usuario.nome}${usuario.crmv ? ' - ' + usuario.crmv : ''}`
       : 'Dra. Camila Bastos - CRMV/MG: 22904';
     // ... injeta nomeClinica, identificacaoMedico e modelosBiblioteca no prompt ...
   }
   
   ```

2. **Em `servidor_web.js` na rota `POST /api/cirurgia` (linhas 531–564):**

   ```
   const resultadoIA = await analisarCirurgiaComIA(todosArquivos, apiKey, { usuario: req.usuario });
   const cir = resultadoIA.cirurgia;
   const textoProcedimento = (cir.procedimento || '').trim();
   // Agora com await e escopo do usuário logado:
   const modeloDetetado = await inferirModeloPorTexto(textoProcedimento, req.usuario?.id);
   // ...
   const docs = await gerarDocumentosCirurgicos(
     resultadoIA.paciente,
     resultadoIA.cirurgia,
     jobFolder,
     fotosCaminhos,
     { usuario: req.usuario }
   );
   
   ```

### FASE 5: Interface do Usuário (Frontend Multi-Médico)

No arquivo `servidor_web.js` (respeitando a Regra de Escaping `\\${variavel}` dentro da template literal HTML):

1. **Aba / Modal "Meu Perfil Profissional":**

   * Campos para **Nome de Exibição nos Laudos**, **Registro Profissional (`CRMV`)**, **Nome da Clínica**, **Upload de Logotipo** (PNG/JPG até 2 MB salvo em `/app/uploads/logos`) e **Upload de Assinatura/Carimbo** (`/app/uploads/assinaturas`).

   * Rota `POST /api/perfil/profissional` acionando `atualizarPerfilProfissional(req.usuario.id, dados)`.

2. **Aba Modelos Cirúrgicos com Badges de Origem:**

   * Filtro rápido: `[Todos]`, `[Padrão da Plataforma]`, `[Meus Modelos]`.

   * Badge `🌐 Institucional` (`isGlobal === true`) e `🔒 Meu Modelo` (`!isGlobal`).

   * Botão **"Duplicar para meu perfil"** (`POST /api/modelos-cirurgicos/:id/clonar` ➔ `clonarModeloParaUsuario(req.params.id, req.usuario)`).

3. **Aba "Histórico de Laudos e Cirurgias":**

   * Listagem paginada de `ExameLaudo` e `RelatorioCirurgico` filtrada por `usuarioId: req.usuario.id` (ou global para `admin`), com links de re-download para os arquivos persistidos em `/app/output`.

### FASE 6: DevOps, Tuning para 1 vCPU, Suíte de Testes e Rotina de Backup Off-Site

#### 6.1. Proteção de Memória e CPU (Hostinger KVM 1)

```
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

```

#### 6.2. Fila de Concorrência do Puppeteer em CommonJS (`compilador_pdf.js`)

Com `p-queue@6.6.2` instalado, integre a fila diretamente em `compilador_pdf.js` para proteger tanto `/api/ultrassom` quanto `/api/cirurgia`:

```
// compilador_pdf.js
const PQueue = require('p-queue').default || require('p-queue');
const filaPdf = new PQueue({ concurrency: 1 });

async function compilarPDF(caminhoHtml, caminhoPdf) {
  return await filaPdf.add(() => compilarPDFInterno(caminhoHtml, caminhoPdf));
}

```

#### 6.3. Atualização da Suíte de Testes (`tests/gerenciador_layout.test.js` e `tests/geradores_layout.test.js`)

Como `obterLayout`, `salvarLayout` e `restaurarLayoutPadrao` passaram a retornar Promises (`async`), atualize os testes existentes adicionando `async/await`:

```
// tests/gerenciador_layout.test.js
beforeEach(async () => {
  await restaurarLayoutPadrao();
});

afterAll(async () => {
  await restaurarLayoutPadrao();
});

test('obterLayout retorna o layout padrão com todos os campos esperados', async () => {
  const layout = await obterLayout();
  expect(layout.id).toBe('padrao');
  expect(layout.font_family).toBe('Calibri, sans-serif');
});

```

#### 6.4. Script de Backup Diário Automatizado (`/root/backup_upa_pet.sh`)

Como o `docker-compose.yml` define `name: upa_pet`, os volumes têm nomes previsíveis (`upa_pet_app_uploads` e `upa_pet_postgres_data`):

```
#!/bin/bash
set -e

DATA=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/root/backups_db"
NOME_ARQUIVO="backup_postgresql_$DATA.sql.gz"

mkdir -p "$BACKUP_DIR"

# 1. Dump consistente do banco PostgreSQL via Docker
docker exec -t upa_postgres pg_dump -U upa_user upa_pet_db | gzip > "$BACKUP_DIR/$NOME_ARQUIVO"

# 2. Backup dos arquivos de uploads (logos e assinaturas) usando container auxiliar
docker run --rm -v upa_pet_app_uploads:/volume -v "$BACKUP_DIR":/backup alpine \
  tar -czf "/backup/uploads_$DATA.tar.gz" -C /volume .

# 3. Envio off-site para o Google Drive via rclone
rclone copy "$BACKUP_DIR/$NOME_ARQUIVO" drive_backup:Backups_UPAPET_Postgres/
rclone copy "$BACKUP_DIR/uploads_$DATA.tar.gz" drive_backup:Backups_UPAPET_Postgres/

# 4. Remove backups locais mais antigos que 7 dias
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -delete

echo "✅ Backup concluído e enviado para a nuvem em $DATA"

```

Configurar no cron da VPS (`crontab -e`):

```
0 3 * * * /bin/bash /root/backup_upa_pet.sh >> /var/log/backup_upa_pet.log 2>&1

```

## 🛡️ Matriz de Riscos, Integridade e Rollback

| Risco Potencial | Impacto | Mitigação Técnica Implementada na v3.0 | 
| ----- | ----- | ----- | 
| **Quebra de CSS/DOCX por nomes de colunas (`camelCase` vs `snake_case`)** | Crítico | Mapeamento `@map(...)` no Prisma + serializador `prismaParaSnakeCase()` em `gerenciador_layout.js`. | 
| **Erro `ERR_REQUIRE_ESM` ao importar `p-queue` em CommonJS** | Crítico | Versão fixada em `p-queue@6.6.2` no `package.json`. | 
| **Colisão de ID ao criar modelos cirúrgicos com mesmo nome de um global** | Alto | Namespace automático `${usuario.id}__${slug}` para modelos privados em `salvarOuCriarModelo()`. | 
| **Falha nas rotas de Dark Mode (`/api/usuario/tema`) e no boot** | Alto | Coluna `tema_preferencia` adicionada ao Prisma, SQL cru removido de `servidor_web.js` e `bootServidor()` assíncrono. | 
| **Pico de CPU / Estouro de RAM com Puppeteer (1 vCPU / 4 GB)** | Alto | Fila `p-queue` (`concurrency: 1`) + Swap de 4 GB no NVMe + `--max-old-space-size=1536`. | 
| **Violação das 5 Regras Pétreas da UPA PET** | Crítico | Critérios diagnósticos e ordem dos 20 órgãos permanecem imutáveis; redução automática de fonte em cirurgias longas preservada para manter 1 página A4. | 

## 📋 Checklist de Execução para Quando Contratar a VPS

* \[ \] **Etapa 1:** Contratar a VPS (Hostinger KVM 1 com Ubuntu 24.04 LTS) e configurar 4 GB de Swap + UFW Firewall.

* \[ \] **Etapa 2:** Instalar Docker e Docker Compose Plugin (`apt install docker.io docker-compose-v2`).

* \[ \] **Etapa 3:** Instalar `@prisma/client`, `prisma` e `p-queue@6.6.2` no projeto.

* \[ \] **Etapa 4:** Criar `prisma/schema.prisma` (com `tema_preferencia` e `@map` em `snake_case`) e gerar a migration inicial.

* \[ \] **Etapa 5:** Atualizar o `Dockerfile` (incluindo `openssl` e `npx prisma generate`) e o `docker-compose.yml` (`name: upa_pet`).

* \[ \] **Etapa 6:** Rodar `node scripts/migrate-sqlite-to-postgres.js` para migrar usuários, temas, layout e modelos de `upa_pet.db`.

* \[ \] **Etapa 7:** Refatorar `db.js`, `gerenciador_usuarios.js`, `gerenciador_modelos.js`, `gerenciador_layout.js`, `seed.js` e `servidor_web.js` para `async/await`.

* \[ \] **Etapa 8:** Parametrizar `motor_laudo.js`, `gerar_docx.js` (incluindo `cfgDocx` na Página 2), `motor_cirurgia.js`, `analisador_ia.js` e `analisador_cirurgia.js`.

* \[ \] **Etapa 9:** Atualizar `tests/gerenciador_layout.test.js` e `tests/geradores_layout.test.js` para `async/await` e validar com `npm test`.

* \[ \] **Etapa 10:** Subir a stack com `docker compose up -d --build`, apontar o domínio via Nginx + Certbot SSL e ativar o cron de backup `/root/backup_upa_pet.sh`.
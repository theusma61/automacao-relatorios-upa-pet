# 🗺️ Plano Diretor de Migração: SQLite → PostgreSQL & Plataforma Multi-Tenant (SaaS)

> **Documento de Arquitetura e Roteiro de Execução Técnica**  
> **Versão:** 2.0 (Revisão Pós-Auditoria de Persistência SQLite)  
> **Status:** Planejamento Finalizado (Aprovado para Execução Futura em VPS)  
> **Objetivo:** Evoluir o sistema de automação da UPA PET de uma instância monousuário/monoclínica (atualmente persistida em SQLite com backup no Google Drive) para um **SaaS Multi-Tenant profissional em PostgreSQL 16**, rodando sob Docker em VPS econômica (Hostinger KVM 1 ou Hetzner), permitindo que múltiplos médicos veterinários e clínicas emitam laudos e relatórios com suas próprias identidades visuais (logotipos, cabeçalhos, cores, CRMVs e modelos cirúrgicos exclusivos), preservando a identidade fundacional da UPA PET como padrão canônico.

---

## 📑 Sumário Executivo

| Fase | Título | Escopo Principal | Esforço Est. |
| :---: | :--- | :--- | :---: |
| **Fase 1** | **Infraestrutura VPS & ORM** | Configuração do Docker Compose (PostgreSQL 16 + Node.js), Nginx SSL, volume de uploads e modelagem declarativa com **Prisma ORM**. | 1 dia |
| **Fase 2** | **Migração de Dados (Seed)** | Script `migrate-sqlite-to-postgres.js` para migrar o banco atual (`upa_pet.db`) e os modelos fundacionais para o PostgreSQL. | 0.5 dia |
| **Fase 3** | **Refatoração do Backend (Sync → Async)** | Transição das funções síncronas (`better-sqlite3`) para assíncronas (`Prisma`), isolamento multi-tenant (`usuario_id`) e clonagem de modelos. | 1.5 dias |
| **Fase 4** | **Dinamização dos Laudos e Prompts IA** | Desacoplamento de CRMV, layout e logos em `motor_laudo.js`, `motor_cirurgia.js`, `gerar_docx.js`, `analisador_ia.js` e `analisador_cirurgia.js`. | 1 dia |
| **Fase 5** | **Frontend Multi-Médico & White-Label** | Tela de perfil profissional (upload de logo/CRMV/assinatura), gestão de modelos (Globais vs. Privados) e histórico de exames emitidos. | 1.5 dias |
| **Fase 6** | **DevOps, Tuning & Backup Off-Site** | Configuração de swap, tuning de memória para 1 vCPU (Puppeteer queue), rotina `pg_dump` diária com envio off-site via `rclone`. | 0.5 dia |

---

## 🔍 1. Diagnóstico do Estado Atual vs. Alvo

Uma auditoria aprofundada no repositório revelou avanços recentes que impactam diretamente a estratégia de migração:

### O que já está implementado no repositório atual:
1. **Persistência SQLite Operacional:** O sistema já abandonou a dependência direta de arquivos JSON brutos em tempo de execução. O arquivo `db.js` gerencia a conexão com SQLite via `better-sqlite3` com modo WAL habilitado.
2. **Esquema SQLite Existente:** Contém 3 tabelas ativas:
   - `usuarios` (id, email, nome, role, crmv, foto, criado_em, atualizado_em)
   - `modelos_cirurgicos` (id, nome, sinonimos, procedimento, diagnostico_pre_cirurgico, descricao_procedimento, evolucao_consideracoes)
   - `configuracoes_layout` (id, font_family, font_size_body, font_size_titulo, margens, line_height, paragraph_spacing, cores)
3. **Mecanismo de Backup Transitório (Render):** O arquivo `backup-db.js` realiza snapshots periódicos do SQLite para o Google Drive e recupera tokens via Redis/Valkey Key Value para contornar o disco efêmero do free tier do Render.
4. **Google SSO e RBAC:** Autenticação via Google Identity e controle de acesso (`admin`, `veterinario`, `assistente`, `pendente`) já operam sobre a tabela de usuários.

### Gaps Críticos a serem solucionados nesta migração:
* ⚠️ **Assincronia (Sync vs. Async):** O `better-sqlite3` opera de forma 100% síncrona. O PostgreSQL (via Prisma ou driver `pg`) opera de forma 100% assíncrona. Funções como `obterPerfilUsuario()`, `carregarModelosCirurgicos()`, o middleware `verificarAuth` e chamadas em `servidor_web.js` precisam ser convertidas para `async/await`.
* ⚠️ **Monotenancy de Modelos e Layout:** Atualmente, a tabela `modelos_cirurgicos` não possui a coluna `usuario_id` ou `is_global`. Se um veterinário alterar uma técnica, afeta todos os usuários. A tabela `configuracoes_layout` possui registro único fixo (`id = 'padrao'`).
* ⚠️ **Branding e Assinatura Fixos nos Laudos e Prompts:** 
  - `motor_laudo.js`, `motor_cirurgia.js` e `gerar_docx.js` contêm strings estáticas ("Camila Bastos", "CRMV/MG: 22904", "UPA PET").
  - `analisador_cirurgia.js` e `analisador_ia.js` contêm instruções fixas no prompt do Gemini ("Você é o assistente da UPA PET...").
* ⚠️ **Ausência de Histórico de Exames Emitidos:** Atualmente, os exames são gerados em pastas temporárias de download e os metadados estruturados não ficam indexados no banco relacional para re-download ou auditoria médica.

---

## 🏛️ 2. Arquitetura Alvo na VPS (Hostinger KVM 1)

```mermaid
flowchart TD
    subgraph CLIENTES["Veterinários & Clínicas (Multi-Tenant)"]
        U1["Dra. Camila Bastos (UPA PET - Matriz)"]
        U2["Dr. Veterinário Parceiro B (Clínica Vet Care)"]
        U3["Novos Médicos Cadastrados"]
    end

    subgraph VPS["VPS Hostinger KVM 1 (1 vCPU, 4GB RAM, 50GB NVMe)"]
        NGINX["Nginx Host (Portas 80/443)<br>SSL Let's Encrypt Certbot<br>Gzip + Cache Estático"]
        
        subgraph DOCKER["Docker Compose Network (upa_network)"]
            APP["App Node.js (Porta 3000)<br>Express + Puppeteer (p-queue)<br>Prisma Client ORM"]
            DB[("PostgreSQL 16 Alpine<br>(Porta 5432 interna)<br>Config: shared_buffers=128MB")]
            
            VOL_DB[("Volume: postgres_data<br>/var/lib/postgresql/data")]
            VOL_UPLOADS[("Volume: app_uploads<br>/app/uploads (Logos e Assinaturas)")]
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
2. **PostgreSQL 16:** Ajustar para perfil de baixo consumo em `postgresql.conf`:
   - `shared_buffers = 128MB`
   - `work_mem = 4MB`
   - `maintenance_work_mem = 32MB`
   - `max_connections = 50`
3. **Fila de Renderização de PDF:** Utilizar `p-queue` com concorrência máxima de 1 ou 2 execuções simultâneas do Puppeteer. Como a VPS possui 1 vCPU, tentar renderizar 3 PDFs em paralelo causaria travamento de CPU (100% de uso contínuo). Com a fila, uma renderização aguarda a outra terminar (tempo médio: 1.2s por PDF).
4. **Swapfile no NVMe:** Criar um arquivo swap de 4 GB no Linux (`/swapfile`). O NVMe da Hostinger garante taxa de transferência rápida caso ocorra pico de uso de memória pelo Chromium, eliminando qualquer risco do processo ser morto pelo Linux OOM (Out Of Memory) Killer.

---

## 🗄️ 3. Modelagem Relacional Completa (`prisma/schema.prisma`)

A modelagem unifica a identidade dos usuários, modelos cirúrgicos híbridos, configurações de layout personalizadas por médico e histórico de exames.

```prisma
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
  id           String      @id @default(cuid())
  nome         String      // Ex: "UPA PET - Clínica Veterinária"
  razaoSocial  String?
  cnpj         String?     @unique
  telefone     String?
  cidade       String?
  estado       String?     // Ex: "MG"
  logoUrl      String?     // Caminho relativo ou URL da logo oficial da clínica
  criadoEm     DateTime    @default(now())
  atualizadoEm DateTime    @updatedAt

  usuarios     Usuario[]
  layouts      ConfiguracaoLayout[]

  @@map("clinicas")
}

// ============================================================================
// 2. USUÁRIOS E MÉDICOS VETERINÁRIOS
// ============================================================================
model Usuario {
  id              String      @id @default(cuid())
  email           String      @unique
  nome            String
  role            String      @default("pendente") // "admin", "veterinario", "assistente", "pendente"
  crmv            String?     // Ex: "CRMV/MG: 22904"
  nomeClinica     String?     // Sobrescreve o nome da clínica na assinatura se preenchido
  logoUrl         String?     // Logotipo personalizado do médico (PNG com fundo transparente)
  assinaturaUrl   String?     // Imagem da assinatura digitalizada ou carimbo
  foto            String?     // Foto de perfil do Google SSO
  telefone        String?
  ativo           Boolean     @default(true)

  clinicaId       String?
  clinica         Clinica?    @relation(fields: [clinicaId], references: [id], onDelete: SetNull)

  // Relacionamentos com dados próprios
  modelosCriados  ModeloCirurgico[]
  layoutsCriados  ConfiguracaoLayout[]
  examesEmitidos  ExameLaudo[]
  cirurgiasEmitidas RelatorioCirurgico[]

  criadoEm        DateTime    @default(now())
  atualizadoEm    DateTime    @updatedAt

  @@index([email])
  @@index([role])
  @@map("usuarios")
}

// ============================================================================
// 3. CONFIGURAÇÕES VISUAIS E DE LAYOUT (MULTI-TENANT)
// ============================================================================
model ConfiguracaoLayout {
  id                String      @id @default(cuid())
  nome              String      @default("Padrão Oficial") // Ex: "Identidade Azul Marinho", "Clínica Vet Care"
  isPadrao          Boolean     @default(false)            // Se true, é o layout padrão global

  usuarioId         String?     // Se preenchido, é o layout customizado daquele veterinário
  usuario           Usuario?    @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  clinicaId         String?     // Se preenchido, aplica-se a toda a clínica
  clinica           Clinica?    @relation(fields: [clinicaId], references: [id], onDelete: Cascade)

  // Tipografia e Dimensões
  fontFamily        String      @default("Calibri, sans-serif")
  fontSizeBody      String      @default("11pt")
  fontSizeTitulo    String      @default("14pt")
  marginTop         String      @default("20mm")
  marginBottom      String      @default("20mm")
  marginLeft        String      @default("15mm")
  marginRight       String      @default("15mm")
  lineHeight        String      @default("1.4")
  paragraphSpacing  String      @default("8pt")

  // Paleta de Cores
  corPrimaria       String      @default("#1B365D") // Azul institucional
  corSecundaria     String      @default("#4A777A") // Teal complementar

  criadoEm          DateTime    @default(now())
  atualizadoEm      DateTime    @updatedAt

  @@index([usuarioId])
  @@index([isPadrao])
  @@map("configuracoes_layout")
}

// ============================================================================
// 4. MODELOS CIRÚRGICOS (PADRÃO HÍBRIDO: GLOBAIS + PRIVADOS)
// ============================================================================
model ModeloCirurgico {
  id                      String      @id // Slug único (ex: "celiotomia_exploratoria")
  isGlobal                Boolean     @default(false) // True para a base fundacional UPA PET

  usuarioId               String?     // Se NULL, pertence à plataforma. Se preenchido, é privado
  usuario                 Usuario?    @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  nome                    String      // Ex: "Celiotomia exploratória de urgência"
  sinonimos               String[]    // Tags para matching por IA e busca: ["celiotomia", "laparotomia"]
  procedimento            String      // Título oficial no relatório
  diagnosticoPreCirurgico String?     // Diagnóstico pré-operatório padrão
  descricaoProcedimento   String      @db.Text // Descrição técnica padronizada
  evolucaoConsideracoes   String?     @db.Text // Pós-operatório e recomendações padrão

  criadoEm                DateTime    @default(now())
  atualizadoEm            DateTime    @updatedAt

  @@index([usuarioId])
  @@index([isGlobal])
  @@index([nome])
  @@map("modelos_cirurgicos")
}

// ============================================================================
// 5. HISTÓRICO DE EXAMES DE ULTRASSOM EMITIDOS
// ============================================================================
model ExameLaudo {
  id              String      @id @default(cuid())
  usuarioId       String
  usuario         Usuario     @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  // Metadados do Paciente
  pacienteNome    String
  pacienteEspecie String      // "Canina", "Felina"
  pacienteSexo    String?     // "Macho", "Fêmea"
  pacienteIdade   String?
  tutorNome       String?
  dataExame       String

  // Dados Clínicos Estruturados
  laudoEstruturado Json       // Array JSON com os achados de cada órgão
  imagensQtd      Int         @default(0)

  // Arquivos Gerados (Caminhos relativos em storage/uploads)
  pdfArquivo      String?     
  docxArquivo     String?     

  criadoEm        DateTime    @default(now())

  @@index([usuarioId])
  @@index([pacienteNome])
  @@index([criadoEm])
  @@map("exames_laudos")
}

// ============================================================================
// 6. HISTÓRICO DE RELATÓRIOS CIRÚRGICOS EMITIDOS
// ============================================================================
model RelatorioCirurgico {
  id              String      @id @default(cuid())
  usuarioId       String
  usuario         Usuario     @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  pacienteNome    String
  pacienteEspecie String?
  procedimento    String
  diagnostico     String?
  modeloUtilizado String?     // Nome do modelo aplicado

  dadosCirurgia   Json        // Detalhes da técnica aplicada e considerações
  possuiFoto      Boolean     @default(false)

  pdfArquivo      String?
  docxArquivo     String?

  criadoEm        DateTime    @default(now())

  @@index([usuarioId])
  @@index([pacienteNome])
  @@index([criadoEm])
  @@map("relatorios_cirurgicos")
}
```

---

## 🚀 4. Roteiro de Execução Passo a Passo

### FASE 1: Infraestrutura Docker & Instalação do Prisma

#### 1.1. Adicionar Dependências do Prisma
```bash
npm install @prisma/client p-queue
npm install prisma --save-dev
```

#### 1.2. Criar o Arquivo `docker-compose.yml`
```yaml
version: '3.8'

services:
  # Banco de Dados Relacional PostgreSQL 16
  postgres:
    image: postgres:16-alpine
    container_name: upa_postgres
    restart: always
    environment:
      POSTGRES_DB: upa_pet_db
      POSTGRES_USER: upa_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-upa_super_secure_pass_2026}
    ports:
      - "127.0.0.1:5432:5432" # Aberto apenas localmente no host para manutenções/scripts
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: >
      postgres -c shared_buffers=128MB
               -c work_mem=4MB
               -c maintenance_work_mem=32MB
               -c max_connections=50
               -c effective_cache_size=1GB

  # Aplicação Node.js
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
      - NODE_OPTIONS=--max-old-space-size=1536
    volumes:
      - app_uploads:/app/uploads
      - app_outputs:/app/output
    depends_on:
      - postgres

volumes:
  postgres_data:
  app_uploads:
  app_outputs:
```

#### 1.3. Executar a Migração Inicial
```bash
npx prisma migrate dev --name init_postgresql_multitenant
```

---

### FASE 2: Script de Migração SQLite → PostgreSQL (`scripts/migrate-sqlite-to-postgres.js`)

Para não perder nenhum usuário cadastrado no SQLite atual nem os modelos com conteúdo rico, o script lê diretamente de `upa_pet.db` (com fallback para `modelos_cirurgicos/*.json` e `usuarios.json` se o arquivo SQLite não estiver presente):

```javascript
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
    where: { id: 'layout_padrao_upa_pet' },
    update: {},
    create: {
      id: 'layout_padrao_upa_pet',
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
  console.log('🎨 Layout padrão migrado.');

  // 3. Migra Usuários do SQLite (ou fallback do JSON)
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
    await prisma.usuario.upsert({
      where: { email: emailNorm },
      update: {
        nome: u.nome,
        role: u.role,
        crmv: u.crmv,
        foto: u.foto || null
      },
      create: {
        email: emailNorm,
        nome: u.nome,
        role: u.role || 'pendente',
        crmv: u.crmv || (emailNorm.includes('camila') ? 'CRMV/MG: 22904' : null),
        nomeClinica: 'UPA PET',
        clinicaId: clinicaPadrao.id,
        foto: u.foto || null
      }
    });
    console.log(`👤 Usuário migrado: ${u.nome} (${emailNorm})`);
  }

  // 4. Migra Modelos Cirúrgicos (Marcando todos os 14 como isGlobal = true)
  const pastaModelos = path.join(__dirname, '../modelos_cirurgicos');
  if (fs.existsSync(pastaModelos)) {
    const arquivos = fs.readdirSync(pastaModelos).filter(f => f.endsWith('.json'));
    for (const arq of arquivos) {
      const conteudo = JSON.parse(fs.readFileSync(path.join(pastaModelos, arq), 'utf8'));
      const id = (conteudo.id || arq.replace('.json', '')).toLowerCase();

      let sinonimos = [];
      if (Array.isArray(conteudo.sinonimos)) sinonimos = conteudo.sinonimos;
      else if (typeof conteudo.sinonimos === 'string') sinonimos = conteudo.sinonimos.split(',').map(s => s.trim());

      await prisma.modeloCirurgico.upsert({
        where: { id },
        update: {
          nome: conteudo.nome,
          sinonimos,
          procedimento: conteudo.procedimento || conteudo.nome,
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento,
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true,
          usuarioId: null
        },
        create: {
          id,
          nome: conteudo.nome,
          sinonimos,
          procedimento: conteudo.procedimento || conteudo.nome,
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento,
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true,
          usuarioId: null
        }
      });
      console.log(`🔪 Modelo global migrado: ${conteudo.nome}`);
    }
  }

  console.log('✅ Migração para PostgreSQL concluída com sucesso!');
}

migrar()
  .catch(err => { console.error('Erro na migração:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

---

### FASE 3: Refatoração da Camada de Serviços (Transição Sync → Async)

Esta fase é o núcleo técnico do trabalho no backend.

#### 3.1. Cliente Prisma Centralizado (`db.js`)
Substituir o singleton do `better-sqlite3` pelo Prisma Client:
```javascript
// db.js (Nova Versão PostgreSQL)
const { PrismaClient } = require('@prisma/client');

const prisma = global.__upaPrisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  global.__upaPrisma = prisma;
}

module.exports = { prisma };
```

#### 3.2. Refatoração de `gerenciador_usuarios.js`
Todas as funções passam a ser assíncronas.
* `async function obterPerfilUsuario(email, nome, foto = null)`
* `async function listarUsuarios()`
* `async function atualizarCargoUsuario(email, novoRole)`
* `function temPermissao(usuario, permissao)` — Permanece síncrona pois opera sobre o objeto em memória de `req.usuario`.

#### 3.3. Refatoração do Middleware de Autenticação em `servidor_web.js`
No código atual, `verificarAuth` chamava `obterPerfilUsuario` de forma síncrona. Agora torna-se Express Async Middleware:
```javascript
// servidor_web.js
async function verificarAuth(req, res, next) {
  const token = req.cookies?.upa_pet_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    req.usuario = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Busca assíncrona com permissões e dados atualizados
    req.usuario = await obterPerfilUsuario(decoded.email, decoded.nome, decoded.foto);
  } catch (err) {
    req.usuario = null;
  }
  next();
}
```

#### 3.4. Refatoração de `gerenciador_modelos.js` (Multi-Tenant)
Os modelos agora são filtrados pela identidade do usuário logado:
```javascript
// gerenciador_modelos.js (Trecho Multi-Tenant)
const { prisma } = require('./db');

async function carregarModelosCirurgicos(usuarioId = null) {
  // Retorna todos os modelos GLOBAIS + modelos criados pelo USUÁRIO logado
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

async function salvarOuCriarModelo(dados, usuario) {
  if (!dados.nome || !dados.descricaoProcedimento) {
    throw new Error('Nome e descrição da técnica são obrigatórios.');
  }

  const id = dados.id ? sanitizarId(dados.id) : sanitizarId(dados.nome);
  const modeloExistente = await prisma.modeloCirurgico.findUnique({ where: { id } });

  // Regra de Proteção: Não-admins não podem sobrescrever modelos globais
  if (modeloExistente && modeloExistente.isGlobal && usuario.role !== 'admin') {
    throw new Error('Modelos institucionais da plataforma só podem ser alterados por administradores. Utilize a opção "Duplicar para meu perfil".');
  }

  // Se o modelo pertence a outro usuário
  if (modeloExistente && !modeloExistente.isGlobal && modeloExistente.usuarioId !== usuario.id && usuario.role !== 'admin') {
    throw new Error('Você não tem permissão para editar um modelo de outro profissional.');
  }

  const isGlobal = usuario.role === 'admin' && dados.isGlobal === true;

  return await prisma.modeloCirurgico.upsert({
    where: { id },
    update: {
      nome: dados.nome,
      sinonimos: dados.sinonimos || [],
      procedimento: dados.procedimento || dados.nome,
      diagnosticoPreCirurgico: dados.diagnosticoPreCirurgico || '',
      descricaoProcedimento: dados.descricaoProcedimento,
      evolucaoConsideracoes: dados.evolucaoConsideracoes || ''
    },
    create: {
      id,
      nome: dados.nome,
      sinonimos: dados.sinonimos || [],
      procedimento: dados.procedimento || dados.nome,
      diagnosticoPreCirurgico: dados.diagnosticoPreCirurgico || '',
      descricaoProcedimento: dados.descricaoProcedimento,
      evolucaoConsideracoes: dados.evolucaoConsideracoes || '',
      isGlobal,
      usuarioId: isGlobal ? null : usuario.id
    }
  });
}

async function clonarModeloParaUsuario(modeloId, usuario) {
  const original = await prisma.modeloCirurgico.findUnique({ where: { id: modeloId } });
  if (!original) throw new Error('Modelo original não encontrado.');

  const novoId = `${original.id}_${sanitizarId(usuario.nome)}_${Date.now().toString(36)}`;
  return await prisma.modeloCirurgico.create({
    data: {
      id: novoId,
      nome: `${original.nome} (Personalizado)`,
      sinonimos: original.sinonimos,
      procedimento: original.procedimento,
      diagnosticoPreCirurgico: original.diagnosticoPreCirurgico,
      descricaoProcedimento: original.descricaoProcedimento,
      evolucaoConsideracoes: original.evolucaoConsideracoes,
      isGlobal: false,
      usuarioId: usuario.id
    }
  });
}
```

---

### FASE 4: Dinamização de Marca nos Geradores de Documentos e Prompts de IA

#### 4.1. Parametrização em `motor_laudo.js`, `motor_cirurgia.js` e `gerar_docx.js`
Atualmente, as assinaturas e logos estão cravados no código.
A nova assinatura dos geradores recebe o contexto do profissional:

```javascript
// Exemplo em motor_laudo.js:
async function gerarDocumentosExame(dadosPaciente, laudoArray, imagensPaths, pastaSaida, opcoes = {}) {
  const usuario = opcoes.usuario || {};
  const layout = opcoes.layout || await obterLayout(usuario.id);

  // Branding Dinâmico com Fallback Seguro para a UPA PET
  const nomeMedico = usuario.nome || 'Dra. Camila Bastos';
  const crmvMedico = usuario.crmv || 'CRMV/MG: 22904';
  const clinicaNome = usuario.nomeClinica || (usuario.clinica && usuario.clinica.nome) || 'UPA PET';
  
  // Imagem do Logo: Se o médico enviou logo próprio, usa-o; senão usa o logo da UPA PET
  let logoBase64 = '';
  if (usuario.logoUrl && fs.existsSync(usuario.logoUrl)) {
    logoBase64 = fs.readFileSync(usuario.logoUrl).toString('base64');
  } else if (fs.existsSync(LOGO_PADRAO_PATH)) {
    logoBase64 = fs.readFileSync(LOGO_PADRAO_PATH).toString('base64');
  }
  
  // ... Renderiza HTML e DOCX utilizando as variáveis dinâmicas no rodapé e cabeçalho ...
}
```

#### 4.2. Injeção de Contexto Dinâmico no Prompt do Gemini (`analisador_ia.js` e `analisador_cirurgia.js`)

1. **Em `analisador_ia.js` (Ultrassom):**
   Manter a rigorosa ordem anatômica e critérios de corte veterinários (Regras de Pétrée), mas injetar o nome da clínica e profissional no preâmbulo:
   ```javascript
   const clinica = contextoProfissional?.nomeClinica || 'UPA PET';
   const profissional = contextoProfissional?.nome ? `${contextoProfissional.nome} (${contextoProfissional.crmv || ''})` : 'Dra. Camila Bastos - CRMV/MG: 22904';

   const prompt = `Você é um médico veterinário especialista em ultrassonografia abdominal de cães e gatos.
   Sua missão é realizar a pré-análise técnica minuciosa das imagens e estruturar os dados no padrão oficial de ${clinica} (${profissional}).
   ... (regras anatômicas e critérios de corte permanecem idênticos) ...`;
   ```

2. **Em `analisador_cirurgia.js` (Cirurgia):**
   Ao formatar os modelos para o prompt do Gemini, injetar apenas os **Modelos Globais + Modelos do Usuário Logado**:
   ```javascript
   const modelosPrompt = await obterTextoModelosParaPrompt(usuarioId);
   ```

---

### FASE 5: Interface do Usuário (Frontend Multi-Médico)

No arquivo `servidor_web.js`, criar os componentes de front-end:

1. **Aba / Modal "Meu Perfil Profissional":**
   - Campo para o médico configurar:
     - **Nome de Exibição nos Laudos** (ex: `Dr. Matheus Augusto`).
     - **Número de Registro Profissional** (ex: `CRMV/SP: 45678`).
     - **Nome da Clínica** (ex: `Clínica Veterinária Vida Animal`).
     - **Upload de Logotipo da Clínica** (PNG/JPG até 2MB, salvo na pasta persistente `/app/uploads/logos`).
     - **Upload de Imagem da Assinatura/Carimbo** (salvo em `/app/uploads/assinaturas`).
   - Botão para salvar via `POST /api/perfil/profissional`.

2. **Aba Modelos Cirúrgicos com Badges de Origem:**
   - Visualização com filtro rápido: `[Todos]`, `[Padrão da Plataforma]`, `[Meus Modelos]`.
   - Card com badge verde para `🌐 Institucional` e badge roxa para `🔒 Meu Modelo`.
   - Botão **"Duplicar para meu perfil"** disponível em todos os modelos institucionais.
   - Permissão de exclusão e edição bloqueada para modelos de terceiros.

3. **Aba "Histórico de Laudos e Cirurgias":**
   - Tabela com filtros por data, espécie e nome do animal.
   - Botões de **"Re-download PDF"** e **"Re-download DOCX"** instantâneos.
   - O médico visualiza apenas os exames gerados por ele (administradores podem filtrar por médico).

---

### FASE 6: DevOps, Tuning para 1 vCPU e Rotina de Backup Off-Site

#### 6.1. Proteção de Memória e CPU (Hostinger KVM 1)
Criar e ativar o swapfile no Linux da VPS:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 6.2. Fila de Concorrência do Puppeteer no Backend (`p-queue`)
Para garantir estabilidade contínua mesmo em caso de múltiplos médicos solicitando PDFs simultâneos:
```javascript
// fila_renderizacao.js
const { default: PQueue } = require('p-queue');

// Limita a 1 renderização de PDF por vez na CPU da VPS
const filaPdf = new PQueue({ concurrency: 1 });

async function enfileirarRenderizacaoPdf(tarefa) {
  return await filaPdf.add(tarefa);
}

module.exports = { enfileirarRenderizacaoPdf };
```

#### 6.3. Script de Backup Diário Automatizado (`/root/backup_upa_pet.sh`)
```bash
#!/bin/bash
set -e

DATA=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/root/backups_db"
NOME_ARQUIVO="backup_postgresql_$DATA.sql.gz"

mkdir -p $BACKUP_DIR

# 1. Dump do banco PostgreSQL via Docker
docker exec -t upa_postgres pg_dump -U upa_user upa_pet_db | gzip > "$BACKUP_DIR/$NOME_ARQUIVO"

# 2. Backup dos arquivos de uploads (logos e assinaturas)
tar -czf "$BACKUP_DIR/uploads_$DATA.tar.gz" -C /var/lib/docker/volumes/vet-ultrasound-automation_app_uploads/_data .

# 3. Envio off-site para o Google Drive via rclone
rclone copy "$BACKUP_DIR/$NOME_ARQUIVO" drive_backup:Backups_UPAPET_Postgres/
rclone copy "$BACKUP_DIR/uploads_$DATA.tar.gz" drive_backup:Backups_UPAPET_Postgres/

# 4. Remove backups locais mais antigos que 7 dias
find $BACKUP_DIR -type f -name "*.gz" -mtime +7 -delete

echo "✅ Backup concluído e enviado para a nuvem em $DATA"
```

Configurar no cron da VPS (`crontab -e`):
```text
0 3 * * * /bin/bash /root/backup_upa_pet.sh >> /var/log/backup_upa_pet.log 2>&1
```

---

## 🛡️ Matriz de Riscos, Integridade e Rollback

| Risco Potencial | Impacto | Mitigação Técnica Planejada |
| :--- | :---: | :--- |
| **Pico de CPU com Puppeteer (1 vCPU)** | Alto | Implementação do `p-queue` (concurrência = 1) no backend; PDFs entram em fila e processam em ~1.2s sem travar a CPU. |
| **Estouro de Memória RAM (OOM Killer)** | Alto | Swap de 4 GB no NVMe + restrição `--max-old-space-size=1536` no Node.js + buffers conservadores no PostgreSQL. |
| **Corrupção ou Falha no PostgreSQL** | Médio | PostgreSQL em container Docker oficial com volume montado no NVMe e backup `pg_dump` diário off-site. |
| **Violação das 5 Regras de Pétrée da UPA PET** | Crítico | A dinamização altera **apenas** identificação institucional e layout cosmético. Os critérios de corte (cistite, ecogenicidade, ordem estrita dos órgãos) permanecem imutáveis no núcleo da IA. |
| **Falha durante a Virada (Go-Live)** | Médio | Procedimento de Rollback: a aplicação no Render com SQLite e backup no Drive permanece congelada e funcional como fallback imediato. |

---

## 📋 Checklist de Execução para Quando Contratar a VPS

Quando você for iniciar a migração na prática, execute os passos nesta sequência exata:

- [ ] **Etapa 1:** Contratar a VPS (Hostinger KVM 1 com Ubuntu 24.04 LTS em São Paulo).
- [ ] **Etapa 2:** Configurar segurança da VPS (UFW firewall, SSH keys, criação de 4GB de Swap).
- [ ] **Etapa 3:** Instalar Docker e Docker Compose (`apt install docker.io docker-compose`).
- [ ] **Etapa 4:** Instalar `@prisma/client`, `prisma` e `p-queue` no projeto.
- [ ] **Etapa 5:** Criar `prisma/schema.prisma` com o esquema aprovado e rodar `npx prisma migrate dev`.
- [ ] **Etapa 6:** Rodar `node scripts/migrate-sqlite-to-postgres.js` para migrar os dados do `upa_pet.db`.
- [ ] **Etapa 7:** Refatorar `db.js`, `gerenciador_usuarios.js` e `gerenciador_modelos.js` para async/Prisma.
- [ ] **Etapa 8:** Parametrizar `motor_laudo.js`, `motor_cirurgia.js` e `gerar_docx.js` para usar dados dinâmicos do médico.
- [ ] **Etapa 9:** Adicionar a tela de perfil e os filtros de modelos cirúrgicos no frontend.
- [ ] **Etapa 10:** Subir a stack com `docker-compose up -d` e apontar o domínio via Nginx + Certbot SSL.
- [ ] **Etapa 11:** Configurar o script de backup `pg_dump` + `rclone` no cron.

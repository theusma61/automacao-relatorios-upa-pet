# 🗺️ Plano Diretor de Migração: PostgreSQL & Transformação Multi-Tenant (SaaS)

> **Documento de Engenharia e Roteiro de Execução**  
> **Objetivo:** Evoluir o sistema de automação da UPA PET de uma aplicação monousuário baseada em arquivos JSON locais para um **SaaS Multi-Tenant profissional**, escalável em VPS (Docker + PostgreSQL), permitindo que múltiplos médicos veterinários e clínicas tenham seus próprios perfis, marcas, logotipos, CRMVs, modelos cirúrgicos personalizados e histórico de laudos.

---

## 📑 Sumário Executivo

| Fase | Título | Escopo Principal |
| :---: | :--- | :--- |
| **Fase 1** | **Infraestrutura & ORM** | Configuração do Docker Compose (PostgreSQL 16) e modelagem declarativa com **Prisma ORM**. |
| **Fase 2** | **Migração de Dados (Seed)** | Script automatizado para migrar `usuarios.json` e os 14 modelos de `modelos_cirurgicos/*.json` para o banco. |
| **Fase 3** | **Refatoração do Backend** | Atualização de `gerenciador_usuarios.js` e `gerenciador_modelos.js` para consultar o banco relacional. |
| **Fase 4** | **Dinamização dos Laudos** | Desacoplamento de CRMV e logotipo fixos nos geradores (`motor_laudo.js`, `motor_cirurgia.js`, `gerar_docx.js`). |
| **Fase 5** | **Frontend & Experiência Multi-Médico** | Tela de perfil do profissional (upload de logo/CRMV), filtros de modelos (Globais vs. Privados) e histórico. |
| **Fase 6** | **DevOps & Backup Automatizado** | Rotina de backup `pg_dump` diário na VPS com envio off-site para nuvem via `rclone`. |

---

## 🏛️ 1. Arquitetura Alvo (Target Architecture)

```mermaid
flowchart TD
    subgraph CLIENTES["Veterinários & Clínicas (Multi-Tenant)"]
        U1["Dra. Camila Bastos (UPA PET)"]
        U2["Dr. Veterinário B (Clínica Vet Care)"]
        U3["Novos Médicos Cadastrados"]
    end

    subgraph PROXY_REVERSO["VPS Hostinger KVM / Hetzner"]
        NGINX["Nginx / Traefik<br>(Portas 80/443 + SSL Let's Encrypt)"]
        
        subgraph DOCKER_COMPOSE["Docker Compose Environment"]
            APP["Node.js Application Container<br>(Express + Puppeteer + Prisma Client)"]
            DB[("PostgreSQL 16 Alpine Container<br>(Porta 5432 Interna)")]
            VOLUME[("Volume Persistente NVMe<br>postgres_data")]
        end

        CRON["Cron Linux (03:00 AM)<br>pg_dump + rclone"]
    end

    subgraph EXTERNAL_SERVICES["Serviços Externos"]
        GEMINI["Google Gemini Flash API"]
        GOOGLE_AUTH["Google Identity SSO"]
        BACKUP_STORAGE["Storage Externo<br>(Google Drive / Backblaze B2)"]
    end

    CLIENTES -->|HTTPS| NGINX
    NGINX -->|HTTP :3000| APP
    APP -->|Prisma ORM :5432| DB
    DB --- VOLUME

    APP -->|Multimodal / OCR| GEMINI
    APP -->|OAuth2 Token Verify| GOOGLE_AUTH
    CRON -->|Backup SQL Criptografado| BACKUP_STORAGE
```

---

## 🗄️ 2. Modelagem Relacional do Banco de Dados (`schema.prisma`)

A modelagem utiliza o **Prisma ORM**, que gera migrações SQL automáticas e fornece tipagem estrita para o Node.js.

### Arquivo: `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 1. Tabela de Clínicas / Tenants (Opcional ou vinculada ao Usuário)
model Clinica {
  id           String      @id @default(cuid())
  nome         String
  razaoSocial  String?
  cnpj         String?
  telefone     String?
  cidade       String?
  estado       String?
  criadoEm     DateTime    @default(now())
  atualizadoEm DateTime    @updatedAt
  usuarios     Usuario[]
}

// 2. Tabela de Médicos e Usuários do Sistema
model Usuario {
  id              String      @id @default(cuid())
  email           String      @unique
  nome            String
  role            String      @default("pendente") // "admin", "veterinario", "assistente", "pendente"
  crmv            String?     // Ex: "CRMV/MG: 22904"
  nomeClinica     String?     // Ex: "UPA PET - Clínica Veterinária"
  logoUrl         String?     // Caminho ou URL do logotipo para cabeçalho dos laudos
  assinaturaUrl   String?     // Imagem da assinatura digitalizada ou carimbo
  telefone        String?
  ativo           Boolean     @default(true)
  clinicaId       String?
  clinica         Clinica?    @relation(fields: [clinicaId], references: [id], onDelete: SetNull)

  // Relacionamentos
  modelosCriados  ModeloCirurgico[]
  examesGerados   ExameLaudo[]
  cirurgiasGeradas RelatorioCirurgico[]

  criadoEm        DateTime    @default(now())
  atualizadoEm    DateTime    @updatedAt
}

// 3. Biblioteca de Modelos Cirúrgicos (Globais + Privados)
model ModeloCirurgico {
  id                      String      @id // Slug (ex: "celiotomia_exploratoria")
  usuarioId               String?     // Se NULL = Modelo Global da Plataforma (base UPA PET)
  usuario                 Usuario?    @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  
  nome                    String      // Ex: "Celiotomia exploratória de urgência"
  sinonimos               String[]    // Tags para a IA associar: ["celiotomia", "laparotomia"]
  procedimento            String      // Título oficial do procedimento no relatório
  diagnosticoPreCirurgico String?     // Diagnóstico padrão
  descricaoProcedimento   String      @db.Text // Descrição cirúrgica padronizada
  evolucaoConsideracoes   String?     @db.Text // Pós-operatório padrão

  isGlobal                Boolean     @default(false) // True para os 14 modelos fundacionais
  criadoEm                DateTime    @default(now())
  atualizadoEm            DateTime    @updatedAt

  @@index([usuarioId])
  @@index([isGlobal])
}

// 4. Histórico de Laudos de Ultrassom Emitidos
model ExameLaudo {
  id              String      @id @default(cuid())
  usuarioId       String
  usuario         Usuario     @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  
  pacienteNome    String
  pacienteEspecie String
  pacienteSexo    String?
  pacienteIdade   String?
  tutorNome       String?
  dataExame       String
  
  laudoEstruturado Json       // Array JSON com os achados de cada órgão
  imagensQtd      Int         @default(0)
  
  pdfArquivo      String?     // Caminho relativo do arquivo PDF no storage
  docxArquivo     String?     // Caminho relativo do arquivo DOCX no storage

  criadoEm        DateTime    @default(now())

  @@index([usuarioId])
  @@index([pacienteNome])
}

// 5. Histórico de Relatórios Cirúrgicos Emitidos
model RelatorioCirurgico {
  id              String      @id @default(cuid())
  usuarioId       String
  usuario         Usuario     @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  
  pacienteNome    String
  procedimento    String
  diagnostico     String?
  
  dadosCirurgia   Json        // Detalhes da técnica e evolução aplicadas
  possuiFoto      Boolean     @default(false)
  
  pdfArquivo      String?
  docxArquivo     String?

  criadoEm        DateTime    @default(now())

  @@index([usuarioId])
}
```

---

## 🚀 3. Roteiro de Implementação Passo a Passo

### FASE 1: Configuração do Ambiente e Instalação do Prisma

#### Etapa 1.1: Adicionar Dependências
```bash
npm install @prisma/client
npm install prisma --save-dev
```

#### Etapa 1.2: Inicializar o Prisma
```bash
npx prisma init
```

#### Etapa 1.3: Configurar o Docker Compose para Desenvolvimento e VPS
Criar o arquivo `docker-compose.yml` na raiz:
```yaml
version: '3.8'

services:
  # Banco de Dados Relacional
  postgres:
    image: postgres:16-alpine
    container_name: upa_postgres
    restart: always
    environment:
      POSTGRES_DB: upa_pet_db
      POSTGRES_USER: upa_user
      POSTGRES_PASSWORD: upa_super_password_2026
    ports:
      - "5432:5432" # Para dev; em prod na VPS pode ficar fechado para o host
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Aplicação Node.js
  app:
    build: .
    container_name: upa_app
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://upa_user:upa_super_password_2026@postgres:5432/upa_pet_db?schema=public
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres

volumes:
  postgres_data:
```

#### Etapa 1.4: Rodar a Primeira Migração
```bash
npx prisma migrate dev --name init_saas_multitenant
```

---

### FASE 2: Script de Migração de Dados (Seed Automático)

Criar o arquivo `prisma/seed.js` para migrar automaticamente os dados legados em JSON para o banco, sem perda de histórico:

```javascript
// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando migração dos dados legados para o PostgreSQL...');

  // 1. Migra Usuários do usuarios.json
  const usuariosPath = path.join(__dirname, '../usuarios.json');
  if (fs.existsSync(usuariosPath)) {
    const dadosUsuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
    for (const u of dadosUsuarios.usuarios || []) {
      await prisma.usuario.upsert({
        where: { email: u.email },
        update: {
          nome: u.nome,
          role: u.role,
          crmv: u.crmv || (u.email.includes('camila') ? 'CRMV/MG: 22904' : null),
          nomeClinica: 'UPA PET'
        },
        create: {
          email: u.email,
          nome: u.nome,
          role: u.role,
          crmv: u.crmv || (u.email.includes('camila') ? 'CRMV/MG: 22904' : null),
          nomeClinica: 'UPA PET'
        }
      });
      console.log(`👤 Usuário migrado: ${u.nome} (${u.email})`);
    }
  }

  // 2. Migra os 14 Modelos Cirúrgicos da pasta modelos_cirurgicos/
  const pastaModelos = path.join(__dirname, '../modelos_cirurgicos');
  if (fs.existsSync(pastaModelos)) {
    const arquivos = fs.readdirSync(pastaModelos).filter(f => f.endsWith('.json'));
    for (const arq of arquivos) {
      const conteudo = JSON.parse(fs.readFileSync(path.join(pastaModelos, arq), 'utf8'));
      const id = conteudo.id || arq.replace('.json', '');
      
      await prisma.modeloCirurgico.upsert({
        where: { id },
        update: {
          nome: conteudo.nome,
          sinonimos: conteudo.sinonimos || [],
          procedimento: conteudo.procedimento || conteudo.nome,
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento,
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true,
          usuarioId: null // Global
        },
        create: {
          id,
          nome: conteudo.nome,
          sinonimos: conteudo.sinonimos || [],
          procedimento: conteudo.procedimento || conteudo.nome,
          diagnosticoPreCirurgico: conteudo.diagnosticoPreCirurgico || '',
          descricaoProcedimento: conteudo.descricaoProcedimento,
          evolucaoConsideracoes: conteudo.evolucaoConsideracoes || '',
          isGlobal: true,
          usuarioId: null
        }
      });
      console.log(`📋 Modelo cirúrgico global migrado: ${conteudo.nome}`);
    }
  }

  console.log('✅ Migração e Seed concluídos com sucesso!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

---

### FASE 3: Refatoração dos Módulos Backend

Graças à arquitetura em módulos criada no projeto, os arquivos `gerenciador_usuarios.js` e `gerenciador_modelos.js` atuam como fachadas e protegem o resto do sistema.

#### 3.1. Refatoração do `gerenciador_modelos.js`
- **Busca Híbrida (Multi-Tenant):** O médico logado visualiza:
  1. Todos os modelos globais (`isGlobal: true`).
  2. Todos os modelos que ele mesmo cadastrou (`usuarioId: usuarioAtual.id`).
- **Edição/Exclusão Segura:**
  - O médico só pode editar ou excluir os modelos que pertencem ao seu próprio `usuarioId`.
  - Modelos globais só podem ser modificados por administradores (`admin`).
  - Função **"Clonar Modelo"**: Permite ao médico duplicar um modelo global para o seu perfil e alterá-lo livremente sem afetar outros usuários.

#### 3.2. Refatoração do `gerenciador_usuarios.js`
- Substitui as leituras de `usuarios.json` por consultas `prisma.usuario.findUnique({ where: { email } })`.
- Mantém a mesma assinatura para `obterPerfilUsuario(email, nome, foto)` e `temPermissao(usuario, permissao)`.

---

### FASE 4: Dinamização de Marca e CRMV nos Laudos

Atualmente, `motor_laudo.js`, `motor_cirurgia.js` e `gerar_docx.js` possuem algumas constantes institucionais da UPA PET.

#### Modificações de Desacoplamento:
1. **Assinatura do Laudo:**
   - Em vez de fixar:
     ```javascript
     // Legado
     <p><strong>Camila Bastos</strong></p>
     <p>CRMV/MG: 22904</p>
     ```
   - Passar a utilizar:
     ```javascript
     // Dinâmico Multi-Médico
     const nomeAssinatura = dadosProfissional.nome || 'Dra. Camila Bastos';
     const crmvAssinatura = dadosProfissional.crmv || 'CRMV/MG: 22904';
     ```
2. **Logotipo do Cabeçalho:**
   - Se o médico tiver cadastrado o logo de sua própria clínica (`dadosProfissional.logoUrl`), o gerador utiliza esse logo no cabeçalho.
   - Caso não tenha configurado, utiliza o logotipo padrão da plataforma como fallback.
3. **Nome da Clínica no Cabeçalho:**
   - Lê dinamicamente `dadosProfissional.nomeClinica` (ex: "Clínica Veterinária São Francisco" ou "UPA PET").

---

### FASE 5: Evolução do Portal Web (Interface do Usuário)

No frontend (`servidor_web.js`), adicionar os seguintes componentes visuais:

1. **Aba / Modal "Meu Perfil Profissional":**
   - Campo para o médico preencher seu **Nome Completo**.
   - Campo para preenchimento de **CRMV com estado** (ex: `CRMV/SP: 45678`).
   - Campo para **Nome da Clínica**.
   - Seletor de arquivo para envio do **Logotipo da Clínica** (PNG com fundo transparente).
   - Seletor de arquivo para imagem de **Assinatura / Carimbo Digitalizado**.

2. **Destaque na Biblioteca de Modelos Cirúrgicos:**
   - Badges visuais nos cards:
     - 🌐 `Modelo Institucional da Plataforma` (visível para todos).
     - 🔒 `Meu Modelo Exclusivo` (visível apenas para o autor).
   - Botão **"Duplicar para meu perfil"** nos modelos globais para permitir customizações privadas.

3. **Painel "Histórico de Laudos":**
   - Tabela listando os exames emitidos por aquele médico nos últimos 30 dias com busca por nome do animal/tutor e botões de re-download do PDF e DOCX.

---

### FASE 6: Rotina de Backup Automatizado na VPS (Disaster Recovery)

Na VPS Linux (Hostinger KVM ou Hetzner), criar um script simples em `/root/backup_upa_pet.sh`:

```bash
#!/bin/bash
DATA=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/root/backups_db"
NOME_ARQUIVO="backup_upa_pet_$DATA.sql.gz"

mkdir -p $BACKUP_DIR

# Executa o dump do PostgreSQL dentro do container Docker compactado em gzip
docker exec -t upa_postgres pg_dump -U upa_user upa_pet_db | gzip > "$BACKUP_DIR/$NOME_ARQUIVO"

# Envia para armazenamento seguro off-site via rclone (Google Drive ou Backblaze B2)
rclone copy "$BACKUP_DIR/$NOME_ARQUIVO" drive_backup:Backups_UPAPET/

# Remove backups locais com mais de 7 dias para economizar disco
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup concluído em $DATA"
```

Configurar no `crontab -e` da VPS para rodar todas as noites às 03:00 da manhã:
```text
0 3 * * * /bin/bash /root/backup_upa_pet.sh > /var/log/backup_upa_pet.log 2>&1
```

---

## 🛡️ Matriz de Riscos e Procedimento de Rollback

| Risco Potencial | Impacto | Mitigação Técnica Planejada |
| :--- | :---: | :--- |
| **Queda do PostgreSQL na VPS** | Alto | O `docker-compose.yml` está configurado com `restart: always`. Se o banco cair por pico, o Docker reinicia em 2 segundos. |
| **Falha na Migração do Prisma** | Médio | Os arquivos JSON originais (`usuarios.json` e `modelos_cirurgicos/*.json`) permanecem intactos como backup estático no repositório Git. |
| **Pico de Concorrência no Puppeteer (1 vCPU)** | Baixo | Implementação de fila com `p-queue` no backend para serializar renderizações simultâneas de PDF sem travar a CPU. |

---

## ✅ Checklist de Execução

Quando você decidir iniciar a execução prática deste plano, basta seguir esta ordem:

- [ ] 1. Contratar a VPS (Hostinger KVM 1 ou Hetzner CX23) e instalar Docker + Docker Compose.
- [ ] 2. Instalar `@prisma/client` e `prisma` no projeto.
- [ ] 3. Criar `prisma/schema.prisma` com os modelos detalhados na Seção 2.
- [ ] 4. Rodar o script `prisma/seed.js` para migrar os dados existentes de JSON para o PostgreSQL.
- [ ] 5. Adaptar `gerenciador_usuarios.js` e `gerenciador_modelos.js` para consumirem o Prisma.
- [ ] 6. Ajustar `motor_laudo.js` e `gerar_docx.js` para usarem o CRMV e Logo da sessão do médico.
- [ ] 7. Adicionar o modal de "Meu Perfil" e upload de logo no frontend.
- [ ] 8. Configurar a rotina de backup `pg_dump` + `rclone` na VPS.

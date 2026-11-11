# 🐾 UPA PET - Central Inteligente de Laudos e Cirurgias

Sistema autônomo de monitoramento e geração automática de **Laudos de Ultrassonografia Abdominal** e **Relatórios Cirúrgicos** para a **UPA PET**, seguindo rigorosamente a identidade visual institucional e os padrões médicos da **Dra. Camila Bastos (CRMV/MG: 22904)**.

O sistema monitora pastas do Google Drive em tempo real ou processa requisições através do portal web na nuvem, analisa os arquivos com inteligência artificial (**Google Gemini**) e compila documentos prontos nos formatos **PDF** e **Word (`.docx`)**.

> 📚 **Documentação Técnica Completa para Desenvolvedores e Agentes de IA:**  
> Acesse a pasta [**`docs/`**](./docs/README.md) para conferir a documentação exaustiva de [Arquitetura do Sistema](./docs/ARCHITECTURE.md), [Regras de Negócio e Padrão Clínico](./docs/BUSINESS_RULES.md), [Módulos e Funcionalidades](./docs/MODULES_AND_FEATURES.md), [Modelos de Dados e Esquemas JSON](./docs/DATA_MODELS_AND_SCHEMAS.md), [Deploy no Render e DevOps](./docs/DEPLOYMENT_AND_OPERATIONS.md) e o [Guia para Agentes de IA e Engenheiros](./docs/AI_AGENT_GUIDELINES.md).

---

## 📋 Pré-requisitos no Novo Computador

Para rodar este serviço em outro computador (Windows 10 ou 11), certifique-se de ter os seguintes programas instalados:

1. **[Node.js](https://nodejs.org/)** (versão 18, 20 ou superior LTS)
   - Baixe e instale a versão recomendada (LTS). Marque a opção de adicionar ao `PATH`.
2. **[Git](https://git-scm.com/)**
   - Necessário para clonar e sincronizar o repositório.
3. **[Google Drive para Computador](https://www.google.com/intl/pt-BR/drive/download/)**
   - Deve estar instalado e com login ativo na conta onde fica a pasta monitorada (normalmente montada na unidade `G:\` ou no caminho local do Drive).
4. **Microsoft Edge**
   - Já vem instalado por padrão no Windows 10/11. O sistema utiliza o motor Chromium do Edge em modo headless para compilar PDFs nítidos com fidelidade de impressão milimétrica.

---

## 🚀 Instalação Passo a Passo

### 1. Clonar o Repositório
Abra o **PowerShell** ou **Prompt de Comando** e clone o repositório na pasta desejada:
```bash
git clone https://github.com/theusma61/automacao-relatorios-upa-pet.git
cd vet-ultrasound-automation
```

### 2. Instalar as Dependências
Execute o comando abaixo para instalar todas as bibliotecas do Node.js:
```bash
npm install
```

### 3. Configurar o Arquivo `config.json`
Copie o arquivo de exemplo `config.example.json` para `config.json`:
```bash
copy config.example.json config.json
```

Abra o arquivo `config.json` em um editor de texto (como Bloco de Notas ou VS Code) e preencha suas configurações:
```json
{
  "pastaMonitorada": "G:\\Meu Drive\\Exames_Monitorados",
  "geminiApiKey": "SUA_CHAVE_DE_API_DO_GEMINI_AQUI"
}
```
> ⚠️ **Atenção nas barras do caminho Windows**: No formato JSON, utilize barras duplas `\\` no caminho da pasta (exemplo: `G:\\Meu Drive\\Exames_Monitorados`).

---

## 📁 Estrutura de Pastas do Google Drive

O robô organiza automaticamente a pasta monitorada em duas subpastas principais:

```text
Exames_Monitorados/
├── 📁 Ultrassom/
│   └── 📁 [Nome do Paciente]/
│       ├── captura1.jpg
│       ├── captura2.png
│       ├── Laudo_[PACIENTE].pdf   <-- (Gerado automaticamente)
│       └── Laudo_[PACIENTE].docx  <-- (Gerado automaticamente)
└── 📁 Cirurgias/
    ├── Ficha.docx (ou áudio solto na raiz)
    └── 📁 [Nome do Paciente] - Cirurgia/
        ├── Ficha.docx
        ├── Foto_Peca.jpg
        ├── Relatorio_Cirurgico_[PACIENTE].pdf   <-- (Gerado automaticamente)
        └── Relatorio_Cirurgico_[PACIENTE].docx  <-- (Gerado automaticamente)
```

---

## ⚡ Como Iniciar o Serviço

Você tem duas formas de rodar o robô:

### Opção 1: Arquivo Batch com Auto-Reinicialização (Recomendado)
Dê um duplo clique no arquivo **`INICIAR_MONITOR_LAUDOS.bat`**.

- Ele abre uma janela de terminal dedicada com status em tempo real.
- **Proteção contra travamentos**: Se houver qualquer oscilação de rede ou erro inesperado, o script aguarda 3 segundos e **reinicia o serviço automaticamente**, sem necessidade de intervenção humana.
- **💡 Dica de Automação**: Crie um atalho do arquivo `.bat` na sua **Área de Trabalho** ou coloque-o na pasta de inicialização do Windows (`Win + R` -> `shell:startup`) para o monitor iniciar automaticamente ao ligar o computador.

### Opção 2: Pelo Terminal
Na pasta do projeto, execute:
```bash
npm start
```
*(ou `node monitor_exames.js`)*

---

## 🩺 Como Operar no Dia a Dia

### 1. Laudos de Ultrassom (`Ultrassom/`)
1. Crie uma pasta com o nome do animal (ex: `Thor`) dentro de `Ultrassom/`.
2. Salve as fotos do ultrassom Mindray contendo os calipers e identificações (`Dist X.XX cm`, siglas de órgãos).
3. O robô aguarda 25 segundos para estabilização do upload pelo Google Drive.
4. Gera o laudo oficial em **PDF** e **Word**, contendo o relatório completo dos órgãos na página 1 e mosaico de capturas nas páginas seguintes.

### 2. Relatórios Cirúrgicos (`Cirurgias/`)
O módulo cirúrgico aceita múltiplos formatos de entrada:
- **Arquivos de Texto / Word / Pages**: `.docx`, `.pages` ou `.txt`.
- **Áudios do Veterinário**: `.m4a`, `.mp3`, `.wav`, `.ogg`, `.opus`.
- **Fotos Cirúrgicas Anexas**: `.jpg`, `.jpeg`, `.png`, `.webp`.

#### Campos Padronizados da Ficha:
```text
INFORMAÇÕES GERAIS DO ANIMAL/TUTOR: [Nome, Espécie, Sexo, Idade, Peso, Tutor]
DATA: [DD/MM/AAAA]
PROCEDIMENTO: [Nome do procedimento]
DIAGNÓSTICO: [Diagnóstico ou suspeita]
DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO: [Técnica, fios, achados]
CONSIDERAÇÕES: [Recuperação anestésica e pós-operatório]
```

#### Envio Conjunto (Documento + Foto):
- Você pode soltar o arquivo `.docx` (ou áudio) e a foto da cirurgia/peça cirúrgica **separadamente** direto na pasta `Cirurgias\`.
- O robô aguarda **25 segundos** de estabilização do upload conjunto.
- Ele cria a pasta do paciente, move os arquivos, aplica o modelo cirúrgico institucional da biblioteca (14 modelos cadastrados) e compila:
  - **Página 1**: Relatório Cirúrgico oficial (1 página exata em tipografia Calibri, termos institucionais da Dra. Camila e assinatura oficial).
  - **Página 2**: **Registro Fotográfico Intraoperatório** com cabeçalho, foto emoldurada e legenda.

---

## 🎯 Gatilhos Rápidos (Dicas Úteis)

- ⚡ **Processamento Imediato**: Se não quiser aguardar os 25 segundos de estabilização, crie um arquivo vazio chamado **`pronto.txt`** ou **`ok.txt`** dentro da pasta. O robô iniciará o processamento instantaneamente.
- 🔄 **Forçar Reprocessamento**: Se quiser que o robô refaça um documento já concluído, basta criar o arquivo **`reprocessar.txt`** ou apagar o PDF antigo da pasta.

---

## 🛡️ Mecanismos de Resiliência Implementados

- **Escudo Global de Exceções**: Tratamento com `uncaughtException` e `unhandledRejection` para evitar paradas do processo.
- **Proteção contra Loop Infinito**: O robô ignora seus próprios arquivos gerados (`Relatorio_Cirurgico_*.docx`, `Laudo_*.docx`) e arquivos temporários de bloqueio do Word (`~$*.docx`).
- **Arquivos Temporários Seguros**: Conversões HTML intermediárias utilizam o diretório `%TEMP%` do Windows fora do Google Drive, evitando erros de concorrência (`EINVAL` / `lstat`).
- **Fallback Automático de Modelos IA**: Caso um modelo da API Gemini sofra lentidão momentânea (erro 503), o robô chaveia instantaneamente para os modelos secundários (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-flash-latest`, `gemini-3.8-flash`).

---

## 📦 Biblioteca de Modelos Cirúrgicos Cadastrados (`modelos_cirurgicos/`)

1. Celiotomia Exploratória
2. Cistotomia e Cistolitotomia
3. Cistotomia com Penectomia
4. Enucleação Total
5. Exérese de Nódulos Cutâneos
6. Mastectomia Oncológica
7. Orquiectomia Aberta
8. Orquiectomia Eletiva em Cães e Gatos
9. Ovariohisterectomia (OSH) Eletiva
10. Ovariohisterectomia (OSH) Eletiva Detalhada
11. Ovariohisterectomia (OSH) Terapêutica / Piometra
12. Ovariohisterectomia (OSH) Piometra Completa
13. Ovariohisterectomia (OSH) Piometra Rompida
14. Penectomia com Uretrostomia

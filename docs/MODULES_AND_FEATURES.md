# 🧩 Módulos e Funcionalidades do Sistema

Este documento apresenta uma análise técnica minuciosa de cada arquivo e módulo presente no repositório, detalhando suas responsabilidades, funções exportadas, parâmetros e comportamento operacional.

---

## Índice de Módulos

1. [`servidor_web.js`](#1-servidor_webjs) — Ponto de Entrada Web e API REST
2. [`analisador_ia.js`](#2-analisador_iajs) — Visão Computacional e IA de Ultrassonografia
3. [`analisador_cirurgia.js`](#3-analisador_cirurgiajs) — IA Multimodal para Procedimentos Cirúrgicos
4. [`motor_laudo.js`](#4-motor_laudojs) — Gerador de Laudos de Ultrassom (PDF e DOCX)
5. [`motor_cirurgia.js`](#5-motor_cirurgiajs) — Gerador de Relatórios Cirúrgicos (1 Pág + Anexo)
6. [`gerar_docx.js`](#6-gerar_docxjs) — Compilador Nativo DOCX para Ultrassom
7. [`compilador_pdf.js`](#7-compilador_pdfjs) — Motor Híbrido de Renderização PDF (Edge / Puppeteer)
8. [`gerenciador_modelos.js`](#8-gerenciador_modelosjs) — CRUD de Modelos Cirúrgicos Institucionais
9. [`gerenciador_usuarios.js`](#9-gerenciador_usuariosjs) — Gestão de Perfis e Permissões (RBAC)
10. [`monitor_exames.js`](#10-monitor_examesjs) — Daemon de Monitoramento do Google Drive
11. [`leitor_docx.js` & `leitor_pages.js`](#11-leitor_docxjs--leitor_pagesjs) — Extratores de Texto Multi-Formato

---

## 1. `servidor_web.js`

- **Responsabilidade:** Servidor HTTP Express principal, roteador de API REST, gerenciador de sessões e fornecedor do Dashboard Web responsivo.
- **Dependências Chave:** `express`, `multer`, `cookie-parser`, `jsonwebtoken`, `google-auth-library`, `cors`.

### Middlewares Principais:
- `obterUsuarioSessao(req, res, next)`: Lê o cookie `upa_pet_token` ou cabeçalho `Authorization: Bearer <token>`, decodifica o JWT e consulta o perfil atualizado em `gerenciador_usuarios.js`, injetando `req.usuario`.
- `exigirAutenticacao(req, res, next)`: Bloqueia requisições caso não haja usuário autenticado (status 401).
- `exigirPermissao(permissao)`: Bloqueia a execução caso o usuário não possua o direito especificado (ex: `'gerar_ultrassom'`, `'gerar_cirurgia'`, `'gerenciar_usuarios'`).

### Endpoints da API:
- `GET /health`: Healthcheck que retorna o status da aplicação e uptime.
- `GET /api/auth/config`: Informa ao frontend se o Google SSO está configurado (`googleClientId`).
- `GET /api/auth/me`: Retorna o perfil do usuário logado e suas permissões ativas.
- `POST /api/auth/google`: Recebe o `credential` emitido pelo Google Identity Services, valida o token e emite o cookie JWT HTTP-only (`upa_pet_token`).
- `POST /api/auth/logout`: Limpa o cookie de sessão.
- `GET /api/admin/usuarios`: Lista todos os usuários cadastrados (apenas `admin`).
- `POST /api/admin/usuarios/role`: Altera o papel de um usuário (apenas `admin`).
- `POST /api/ultrassom`: Recebe até 25 capturas de tela via multipart, aciona `analisarExameComIA` e `gerarDocumentosExame`, retornando os links de download.
- `POST /api/cirurgia`: Recebe 1 documento (.docx, .pages, áudio) + fotos opcionais, aciona `analisarCirurgiaComIA` e `gerarDocumentosCirurgicos`.
- `GET /api/modelos-cirurgicos`: Retorna todos os modelos cirúrgicos cadastrados.
- `GET /api/modelos-cirurgicos/:id`: Retorna os dados completos de um modelo específico.
- `POST /api/modelos-cirurgicos`: Salva ou cria um novo modelo cirúrgico (médicos veterinários e admins).
- `DELETE /api/modelos-cirurgicos/:id`: Exclui um modelo cirúrgico (admins).
- `GET /downloads/:jobId/:filename`: Realiza o streaming do arquivo final para o navegador.

---

## 2. `analisador_ia.js`

- **Responsabilidade:** Motor de visão computacional multimodal utilizando a API Google Gemini para análise de exames de ultrassonografia.
- **Função Exportada:** `analisarExameComIA(caminhosImagens, apiKey)`
- **Fluxo Interno:**
  1. Carrega as imagens do disco e converte cada uma em payload Base64 `inlineData`.
  2. Monta o prompt do sistema contendo todas as regras clínicas, valores de corte métrico caninos/felinos e a ordem canônica estrita.
  3. Realiza a chamada à API Gemini com formatação forçada em JSON (`responseMimeType: "application/json"`).
  4. **Fallback Automático de Modelos:** Se o modelo principal (`gemini-2.5-flash` ou similar) retornar erro transitório (503 / sobrecarga), tenta em cascata: `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-flash-latest`, `gemini-3.8-flash`.
  5. Extrai e ordena o array de imagens original conforme a prioridade retornada pela IA (`classificacaoImagens`).
- **Retorno:**
  ```javascript
  {
    paciente: { nome, especie, idade, tutor, sexo, data },
    laudo: [ { orgao, texto, diagDif } ],
    classificacaoImagens: [ { indice, nomeArquivo, sigla, orgao, prioridade } ],
    caminhosOrdenados: [ "/caminho/foto1.jpg", "/caminho/foto2.jpg" ]
  }
  ```

---

## 3. `analisador_cirurgia.js`

- **Responsabilidade:** Motor multimodal de processamento de procedimentos cirúrgicos a partir de documentos escritos ou áudios gravados pelo cirurgião.
- **Função Exportada:** `analisarCirurgiaComIA(caminhosArquivos, apiKey)`
- **Fluxo Interno:**
  1. Identifica os tipos de arquivos recebidos:
     - Documentos de texto (.docx, .pages, .txt) são convertidos para texto puro.
     - Áudios (.m4a, .mp3, .wav, etc.) são codificados em Base64 para envio direto ao Gemini Multimodal.
     - Imagens são anexadas como evidências fotográficas.
  2. Consulta dinamicamente a biblioteca de modelos cirúrgicos via `obterTextoModelosParaPrompt()` (`gerenciador_modelos.js`).
  3. Instruciona o Gemini a identificar qual técnica da Dra. Camila corresponde ao procedimento e gerar a redação final padronizada.
- **Retorno:** Objeto estruturado com `paciente` e `cirurgia` (`procedimento`, `diagnosticoPreCirurgico`, `descricaoProcedimento`, `evolucaoConsideracoes`).

---

## 4. `motor_laudo.js`

- **Responsabilidade:** Orquestra a geração de documentos para o laudo de ultrassom (HTML/CSS para PDF e invocação do DOCX).
- **Função Exportada:** `gerarDocumentosExame(dadosPaciente, laudoArray, imagensPaths, pastaSaida)`
- **Mecanismos Importantes:**
  - Gera o layout HTML formatado rigorosamente para A4 (210mm x 297mm) com cabeçalho institucional, tabela de paciente, corpo com espaçamento harmônico entre órgãos (`margin: 0 0 9px 0`) e rodapé legal.
  - Divide as fotos do exame em blocos de até 8 capturas por página de anexo (mosaico 2 colunas).
  - Salva um HTML temporário e invoca `compilador_pdf.js` para compilar o arquivo `.pdf`.
  - Invoca `gerarDocxLaudo` de `gerar_docx.js` para compilar o arquivo `.docx`.
  - Remove os artefatos HTML temporários ao término.

---

## 5. `motor_cirurgia.js`

- **Responsabilidade:** Orquestra a geração do Relatório Cirúrgico Oficial em PDF e DOCX.
- **Função Exportada:** `gerarDocumentosCirurgicos(dadosPaciente, dadosCirurgia, pastaSaida, fotosCaminhos = [])`
- **Mecanismos Importantes:**
  - **Garantia de 1 Página (Página 1):** Utiliza tipografia Calibri proporcional, line-height ajustado e espaçamentos dinâmicos para assegurar que todo o texto do procedimento e a assinatura fiquem estritamente na Página 1.
  - **Página 2 (Registro Fotográfico Opcional):** Se `fotosCaminhos.length > 0`, gera uma segunda página elegante contendo cabeçalho institucional, moldura para a foto da peça cirúrgica ou intraoperatória e legenda técnica.
  - Compila o PDF de alta resolução e o DOCX editável.

---

## 6. `gerar_docx.js`

- **Responsabilidade:** Compilador OOXML nativo para laudos de ultrassonografia utilizando a biblioteca `docx`.
- **Função Exportada:** `gerarDocxLaudo(dados, laudo, caminhoSaida, logoPath, imagensPaths = [])`
- **Detalhes Técnicos de Diagramação:**
  - **Cabeçalho:** `criarCabecalhoDocx` monta uma `Table` de 3 colunas (Logotipo 28%, Coluna 1 de dados 38%, Coluna 2 de dados 34%) com bordas transparentes para alinhamento perfeito.
  - **Espaçamento entre Tópicos:** Cada órgão é criado com `spacing: { after: 150 }` (~7.5pt), proporcionando uma clara separação visual entre os parágrafos sem quebrar para uma segunda página de texto.
  - **Subdivisões de Órgãos:** Em órgãos como a adrenal (`AE:` e `AD:`), utiliza `TextRun({ text, break: 1 })` para quebrar linha internamente sem criar novo parágrafo.
  - **Mosaico:** Insere tabelas de 2 colunas com até 4 linhas de imagens por página (8 fotos por página), repetindo o cabeçalho oficial a cada `PageBreak`.
  - **Rodapé Fixo:** `Footer` com borda cinza superior (`color: "B0B0B0"`, `size: 6`) aplicado globalmente em todas as páginas do documento.

---

## 7. `compilador_pdf.js`

- **Responsabilidade:** Mecanismo agnóstico de compilação de HTML para PDF profissional.
- **Função Exportada:** `compilarPDF(caminhoHtml, caminhoPdf)`
- **Estratégia Híbrida de Dois Níveis:**
  1. **Nível 1 (Windows / Desktop):** Busca o binário do `msedge.exe`. Executa via linha de comando silenciosa com flags de fidelidade gráfica. Vantagem: velocidade extrema (< 1s) e zero sobrecarga de memória.
  2. **Nível 2 (Linux / Cloud / Docker / Render):** Executa o **Puppeteer** com argumentos de proteção (`--no-sandbox`, `--disable-dev-shm-usage`, `--single-process`).
     - **Auto-Cura:** Se o Chromium não for encontrado no filesystem do container, o script executa automaticamente `npx puppeteer browsers install chrome` em background e retenta a renderização sem derrubar a requisição do usuário.

---

## 8. `gerenciador_modelos.js`

- **Responsabilidade:** Gerenciamento do ciclo de vida (CRUD) dos modelos cirúrgicos institucionais.
- **Armazenamento:** Arquivos JSON no diretório `./modelos_cirurgicos/`.
- **Funções Exportadas:**
  - `carregarModelosCirurgicos()`: Lê todos os arquivos `.json` da pasta, injeta o ID correspondente e retorna uma lista ordenada alfabeticamente por nome.
  - `obterModeloPorId(id)`: Busca e retorna os dados de um modelo específico.
  - `salvarOuCriarModelo(dados)`: Valida campos obrigatórios (`nome`, `descricaoProcedimento`), sanitiza o ID/slug, normaliza sinônimos (array ou string separada por vírgulas) e grava o arquivo `.json`.
  - `excluirModelo(id)`: Exclui o arquivo `.json` do disco.
  - `obterTextoModelosParaPrompt()`: Compila uma representação textual consolidada de todos os modelos cadastrados para injeção dinâmica no prompt da IA a cada geração de relatório cirúrgico.

---

## 9. `gerenciador_usuarios.js`

- **Responsabilidade:** Controle de acesso baseado em papéis (RBAC) e persistência de perfis autorizados.
- **Armazenamento:** Arquivo `usuarios.json`.
- **Papéis (`ROLES`):** `admin`, `veterinario`, `assistente`, `pendente`.
- **Funções Exportadas:**
  - `obterPerfilUsuario(email, nome, foto)`: Busca o usuário pelo e-mail cadastrado. Se for o primeiro acesso de um e-mail novo, cadastra-o automaticamente com o papel padrão `pendente`.
  - `temPermissao(usuario, permissao)`: Avalia se o perfil do usuário possui o direito de executar a operação.
  - `listarUsuarios()`: Retorna a lista completa de usuários cadastrados com suas respectivas permissões.
  - `atualizarCargoUsuario(email, novoRole)`: Atualiza o cargo de um usuário e persiste em `usuarios.json`.

---

## 10. `monitor_exames.js`

- **Responsabilidade:** Monitoramento do sistema de arquivos para execução autônoma via pastas sincronizadas do Google Drive.
- **Padrão de Pastas Monitoradas:**
  - `[PASTA_MONITORADA]/Ultrassom/[Nome_Paciente]/`
  - `[PASTA_MONITORADA]/Cirurgias/[Nome_Paciente]/` (ou arquivos avulsos na raiz de Cirurgias)
- **Temporização e Debounce:**
  - Implementa um mapa em memória (`timersPendentes`) com timeout de 25 segundos. Cada novo arquivo adicionado à pasta reinicia o temporizador, garantindo que o upload completo dos arquivos pesados ocorra antes do disparo do processamento.
- **Gatilhos Imediatos:** A presença de `pronto.txt` ou `ok.txt` cancela o timer e processa imediatamente.

---

## 11. `leitor_docx.js` & `leitor_pages.js`

- **Responsabilidade:** Conversores de arquivos de texto complexos para strings brutas legíveis pela IA.
- **`leitor_docx.js`:** Utiliza `mammoth.extractRawText` para extrair texto de arquivos do Word.
- **`leitor_pages.js`:** Descompacta o arquivo `.pages` (que é um pacote zip contendo XML e metadados no padrão Apple iWork) e extrai o texto contido nos arquivos `index.xml` ou `preview.jpg`.

---

*Para conferir os formatos exatos de dados manipulados pelo sistema, consulte [DATA_MODELS_AND_SCHEMAS.md](./DATA_MODELS_AND_SCHEMAS.md).*

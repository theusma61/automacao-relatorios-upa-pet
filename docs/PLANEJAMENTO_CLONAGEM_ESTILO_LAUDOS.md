# Planejamento Técnico: Motor de Clonagem Visual e Textual de Laudos (1 a 10 PDFs)

**Projeto:** Vetaro SaaS / UPA PET (`vet-ultrasound-automation`)

**Branch Base:** `feat/postgres-multitenant` (PostgreSQL 16 + Prisma ORM + React/Vite)

**Escopo:** Extração automatizada de papel timbrado, ativos gráficos (banner, logo, assinatura escaneada, rodapé), layout tipográfico, estrutura de campos e estilo de escrita médica a partir de 1 a 10 PDFs de laudos anteriores enviados pelo veterinário.

## 1. Diagnóstico Técnico: Por que o Laudo Gerado Divergiu do Original

A inspeção estrutural (fontes, coordenadas em pontos, objetos vetoriais e streams de imagem) entre o arquivo original enviado pela médica (**`LAUDO REBECAVETLSTA.pdf`**, Dra. Michele Resende — ULSVET) e o arquivo produzido pela ferramenta (**`laudo gerado pelo servico.pdf`**) revelou **10 causas-raiz** no código atual da branch `feat/postgres-multitenant`:

| \# | Dimensão | Original da Médica (`LAUDO REBECAVETLSTA.pdf`) | Gerado pelo Serviço (`laudo gerado pelo servico.pdf`) | Causa-Raiz no Código (`feat/postgres-multitenant`) | 
| ----- | ----- | ----- | ----- | ----- | 
| **1** | **Cabeçalho Gráfico / Papel Timbrado** | Banner de largura total (`210mm`, `y: 0..140pt`) com fundo curvo cinza (`#ECE8E8`), 13 curvas vetoriais e logo `ULSVET` centralizada (feita no Canva/Word 2010 com vetores + 4 micro-PNGs). | Logo da **UPA PET** pequena à esquerda (`130x52px`) e fundo branco liso. | `motor_laudo.js` (L9-11, L22-27) faz fallback para `assets/logo_upa_pet_oficial.png` e não recorta banners compostos (vetores + imagens) do topo do PDF de referência. | 
| **2** | **Repetição de Cabeçalho nas Páginas 2 a 4** | **Apenas na Página 1.** A Página 2 inicia direto no texto (`Fígado:`, `y=64.8pt`) e as Páginas 3 e 4 contêm apenas as fotos de ultrassom. | Repete a logo UPA PET, os dados do paciente e o rodapé em **todas** as páginas de fotos (Págs. 2, 3 e 4). | `motor_laudo.js` (L167-181) e `gerar_docx.js` (L196) injetam `${cabecalho}` e `${rodape}` fixos dentro do loop `paginasImagens.map()`. | 
| **3** | **Grade de Dados do Paciente e Linha Divisória** | **8 campos** em 2 colunas assimétricas (`Data`, `Paciente`, `Sexo`, `Espécie`, `Requisitante` na esq.; `Idade`, `Proprietário (a)`, `Raça` na dir.), valores em **CAIXA ALTA** e linha horizontal preta (`y=320.1pt`) de ponta a ponta. | **6 campos** com rótulos fixos da UPA PET (`Nome`, `Espécie`, `Idade` / `Tutor`, `Sexo`, `Data`), sem `Raça` e `Requisitante`, valores em *Title Case* e sem linha divisória. | `motor_laudo.js` (L48-60) e `analisador_ia.js` (L173-180) possuem schema e HTML estáticos de 6 campos, sem suporte a rótulos customizados ou caixa alta. | 
| **4** | **Título e Subtítulo do Documento** | Título `LAUDO ULTRASSONOGRÁFICO` em preto (`#000`), `11pt`, negrito, **sublinhado**, e **sem subtítulo**. | Título `RELATÓRIO DE ULTRASSONOGRAFIA ABDOMINAL` (`14pt`) + subtítulo fixo em itálico (*"Exame ultrassonográfico realizado em modo B..."*). | `motor_laudo.js` (L150-151) e `gerar_docx.js` (L102, L117) possuem as strings de título e subtítulo cravadas no código. | 
| **5** | **Paginação do Texto (1 Página vs. Fluxo Natural)** | O texto flui naturalmente por **2 páginas** (Pág. 1: *Bexiga* a *Baço*; Pág. 2: *Fígado* a *Cavidade abdominal*), alinhado à esquerda (`text-align: left`), fonte `Microsoft New Tai Lue 11pt`. | Espremeu todos os 14 órgãos na **Página 1** com texto justificado (`text-align: justify`), Fonte `Carlito`. | `motor_laudo.js` (L100-124) trava `.page-container` do texto em uma única `div` com `height: 297mm !important; max-height: 297mm !important;`. | 
| **6** | **Capitalização e Ordem dos Órgãos** | Rótulos em **Sentence Case** (`Bexiga:`, `Rins:`, `Rim esquerdo:`, `Rim direito:`, `Adrenal esquerda:`, `Adrenal direita:`). Possui linha-resumo `Rins: Simétricos (RE=.../ RD=...),` e adrenais logo após os rins. | Rótulos em **CAIXA ALTA** (`BEXIGA:`, `RIM ESQUERDO:`). Unificou `ADRENAIS: Não visualizadas.` e alterou a sequência. | `analisador_ia.js` (L30-45, L183) instrui a IA a emitir órgãos em caixa alta e na ordem fixa da Dra. Camila. | 
| **7** | **Tópicos Indevidos e Duplicação de `DIAG DIF.`** | Em fêmeas, agrupa o útero em `Aparelho reprodutor:` e **jamais** cita próstata. Usa `OBS:` dentro de `Cavidade abdominal:` em vez de `DIAG DIF.:`. | Gerou `PRÓSTATA: Não se aplica (fêmea).` e duplicou `DIAG DIF.: DIAG DIF.: PIOMETRA, MUCOMETRA, HIDROMETRA.`. | O prompt misturou regras da UPA PET com o exemplo da médica; e `motor_laudo.js` (L75-77) concatena `DIAG DIF.: ${item.diagDif}` mesmo quando `item.texto` já termina com `DIAG DIF.:`. | 
| **8** | **Assinatura Escaneada e Ordem do Carimbo** | Na Página 2, exibe `Michele Resende / CRMV-MG10817` em negrito **acima** da imagem da assinatura manuscrita (`Image46.jp2`, `227.9 x 53.2pt`). | Exibiu apenas texto simples `Michele Resende / CRMV-MG 10.817` no canto inferior, sem a imagem da assinatura manuscrita. | O motor não extraiu o stream de imagem `Image46.jp2` do PDF enviado; além disso, `motor_laudo.js` (L159-161) posiciona `${assinaturaImgHtml}` acima do texto, e não abaixo. | 
| **9** | **Disclaimer Legal, Rodapé de Contato e Mini-Logo** | Texto em `Courier New 8.5pt` (*"O exame ultrassonográfico não possui valor diagnóstico absoluto..."*), linha tracejada (`dashed`), contato com e-mail (`ulsvet@outlook.com`) e **mini-logo `ULSVET`** centralizada no rodapé. | Usou o rodapé fixo da UPA PET (*"O ultrassom é um exame complementar..."*) em itálico `7.2pt` sem e-mail e sem mini-logo. | `motor_laudo.js` (L63-67) e `gerar_docx.js` (L279-303) têm o texto do rodapé hardcoded. | 
| **10** | **Dimensões e Estilo do Grid de Fotos** | Fotos grandes (`266.6 x 184.2pt` ≈ `94 x 65mm`), **coladas sem espaço** (`gap: 0.4pt`), sem bordas e ocupando toda a folha A4 (Págs. 3 e 4). | Fotos pequenas (`height: 52mm`), com `grid-gap: 6px`, borda `#222` e faixas pretas laterais devido ao espaço tomado pelo cabeçalho repetido. | `motor_laudo.js` (L140-142) fixa `.img-card { height: 52mm; border: 1px solid #222; }` e `grid-gap: 6px`. | 

## 2. Arquitetura da Nova Feature: Clonagem Fiel a partir de até 10 PDFs

Para que o veterinário envie de **1 a 10 PDFs** de laudos antigos e receba novos laudos com **aparência visual e escrita idênticas**, o sistema não pode depender apenas de extração de texto (OCR) ou de parâmetros básicos de fonte/cor.

A solução é dividida em **4 pilares integrados**:

```
[Upload de 1 a 10 PDFs do Veterinário]
                 │
                 ├──► PILAR 1: Extrator de Ativos Gráficos (Rasterização 300 DPI + Consenso Pixel/Vision)
                 │      ├─ Recorta Banner/Cabeçalho completo (vetores + curvas + logo) -> header_banner.png
                 │      ├─ Extrai/Recorta Assinatura Manuscrita (com fundo transparente) -> signature.png
                 │      └─ Recorta Mini-Logo/Selo de Rodapé (se existir) -> footer_logo.png
                 │
                 ├──► PILAR 2: Extrator de Geometria, Tipografia e Layout (pdfplumber/pdfjs + Gemini Vision)
                 │      ├─ Detecta modo de cabeçalho (Full-Bleed Banner vs. Logo Lateral vs. Central)
                 │      ├─ Mapeia colunas, rótulos exatos e caixa (UPPERCASE/Title) dos dados do paciente
                 │      ├─ Detecta título, sublinhado, subtítulo, alinhamento do corpo (left vs. justify)
                 │      ├─ Detecta se o texto flui em 1 ou 2 páginas e se cabeçalho/rodapé repetem nas fotos
                 │      └─ Mede proporção do grid de imagens (colunas, gap, altura em mm, bordas)
                 │
                 ├──► PILAR 3: Extrator de DNA Clínico e Estilo de Escrita (Análise Multi-PDF no Gemini)
                 │      ├─ Compara os até 10 laudos para separar "Frases Canônicas Normais" vs. "Alterações"
                 │      ├─ Mapeia ordem exata dos órgãos, capitalização (Bexiga: vs BEXIGA:) e linhas-resumo (Rins:)
                 │      ├─ Identifica regras de omissão por sexo (ex: omitir Próstata em fêmeas)
                 │      └─ Identifica formato de conclusão (OBS: inline na Cavidade Abdominal vs. DIAG DIF.)
                 │
                 └──► PILAR 4: Motor de Renderização Dinâmica (HTML/Puppeteer + DOCX)
                        ├─ Renderiza Página(s) de Texto com fluxo natural A4 e ativos gráficos recortados
                        └─ Renderiza Páginas de Imagens com a geometria exata do veterinário

```

## 3. Pilar 1: Extração Fiel de Ativos Visuais (`extrator_ativos_pdf.js`)

### Por que a extração simples de imagens de PDF falha em cabeçalhos do Canva/Word?

No arquivo `LAUDO REBECAVETLSTA.pdf`, a logo `ULSVET` e a onda cinza superior não são uma única imagem JPEG/PNG dentro do PDF: o Microsoft Word / Canva exportou **13 curvas Bézier vetoriais**, **2 retângulos preenchidos com `rgb(236, 232, 232)`** e **4 fragmentos de PNG separados** (`Image15.png` a `Image21.png`). Se tentarmos extrair apenas objetos de imagem brutos do PDF, o fundo curvo desaparece e o logo sai desmontado.

### Algoritmo Híbrido de Extração Visual (Rasterização 300 DPI + Recorte Inteligente)

1. **Rasterização das Páginas de Texto em 300 DPI:**

   * Utilizando `pdftoppm -png -r 300` (do pacote `poppler-utils` no container Docker) ou `pdfjs-dist` + `canvas`, renderizamos a Página 1 e a última página de texto (ex.: Página 2) de cada PDF enviado em alta resolução (`2480 x 3508 px`).

2. **Isolamento do Cabeçalho Gráfico (`header_banner.png`):**

   * **Caso A (Médico enviou 2 a 10 PDFs — Máscara de Invariância Pixel-a-Pixel):**
     Comparamos a metade superior da Página 1 entre os PDFs enviados. Tudo o que fica acima do primeiro campo de texto variável (`Data:` em `y = 185.1pt` / `22%` da altura A4) e permanece **idêntico** entre os PDFs é o papel timbrado fixo. Recortamos essa faixa (`x: 0..2480px`, `y: 0..680px`) com `sharp`, preservando 100% das curvas, sombras e cores originais do Canva/Word.

   * **Caso B (Médico enviou apenas 1 PDF — Coordenada de Topo do Texto + Gemini Vision):**
     Localizamos a coordenada `top` da primeira palavra de identificação do paciente (em `LAUDO REBECAVETLSTA.pdf`, `Data:` inicia em `top = 185.1pt` de `842.5pt`, ou seja, `21.9%` da altura da página). O Gemini Vision confirma o bounding box `[ymin, xmin, ymax, xmax]` do cabeçalho gráfico (ex.: `ymin: 0, xmin: 0, ymax: 165, xmax: 1000` na escala `0..1000`). O `sharp` recorta do topo até `ymax` com margem de segurança antes do primeiro texto do paciente.

   * **Detecção de `Full-Bleed` vs. `Logo Isolado`:**
     Se os pixels das bordas esquerda/direita (`x < 5%` ou `x > 95%`) da faixa recortada possuírem cor diferente de branco (`#FFFFFF`), o ativo é classificado como `headerMode: 'full_bleed_banner'` (ocupando `210mm` de ponta a ponta sem padding superior). Caso contrário, aplicamos `.trim()` no `sharp` e classificamos como `centered_logo` ou `side_by_side_logo`.

3. **Isolamento da Assinatura Manuscrita / Carimbo (`signature.png`):**

   * Na página onde se encontra o bloco de assinatura (detectado pela presença do CRMV próximo ao fim do texto, na Página 1 ou Página 2):

   * O Gemini Vision retorna o bounding box exato da assinatura manuscrita/carimbo (`signatureBox: [723, 516, 786, 898]` na Página 2 do PDF da Dra. Michele), **excluindo** as linhas de texto digitadas (`Michele Resende / CRMV-MG10817`) para que o texto continue sendo renderizado com nitidez vetorial em HTML/DOCX e a rubrica manuscrita entre como imagem.

   * O `sharp` recorta a região da rubrica e aplica remoção de fundo branco (convertendo pixels claros `R>240, G>240, B>240` para canal alfa transparente `alpha = 0`), gerando um `signature.png` transparente perfeito.

4. **Isolamento do Mini-Logo de Rodapé (`footer_logo.png`):**

   * Se houver elementos gráficos abaixo da última linha de texto do rodapé (como na Página 1 da Dra. Michele entre `y = 805pt` e `842pt`, onde há uma linha horizontal curta e o mini-logo `ULSVET`), a região `[955, 330, 998, 670]` é recortada e salva como `footer_logo.png`.

## 4. Pilar 2 e 3: Schema JSON Completo de Extração (`TemplatePerfilVeterinario`)

Quando o veterinário faz upload de até 10 PDFs na rota `POST /api/layout-config/importar-pdfs`, enviamos os textos/fontes extraídos e as imagens das páginas dos PDFs ao Gemini (`gemini-3.5-flash` / `gemini-3.8-flash`) com `responseMimeType: "application/json"` para produzir o objeto padronizado abaixo.

Veja como o perfil extraído do **`LAUDO REBECAVETLSTA.pdf`** (Dra. Michele Resende — ULSVET) fica representado:

```
{
  "identidadeProfissional": {
    "nomeMedico": "Michele Resende",
    "crmv": "CRMV-MG10817",
    "nomeClinica": "ULSVET",
    "emailContato": "ulsvet@outlook.com",
    "telefoneContato": null
  },
  "ativosVisuais": {
    "headerBannerUrl": "/uploads/templates/user_123/header_banner.png",
    "logoIsoladaUrl": null,
    "assinaturaUrl": "/uploads/templates/user_123/signature.png",
    "footerLogoUrl": "/uploads/templates/user_123/footer_logo.png",
    "boundingBoxesNormalizados": {
      "headerBanner": { "page": 1, "ymin": 0, "xmin": 0, "ymax": 162, "xmax": 1000 },
      "signature": { "page": 2, "ymin": 723, "xmin": 516, "ymax": 787, "xmax": 899 },
      "footerLogo": { "page": 1, "ymin": 958, "xmin": 340, "ymax": 998, "xmax": 660 }
    }
  },
  "layoutVisual": {
    "headerMode": "full_bleed_banner",
    "headerHeightMm": "45mm",
    "repeatHeaderOnTextPage2": false,
    "repeatHeaderOnImagePages": false,
    "margins": {
      "topFirstPage": "0mm",
      "topContinuationPages": "22mm",
      "bottom": "18mm",
      "left": "7mm",
      "right": "7mm"
    },
    "patientGrid": {
      "fontFamily": "'Microsoft Sans Serif', Arial, sans-serif",
      "fontSize": "11pt",
      "valueCase": "UPPERCASE",
      "labelBold": true,
      "valueBold": false,
      "paddingLeftMm": "15mm",
      "paddingRightMm": "15mm",
      "marginTopMm": "12mm",
      "marginBottomMm": "10mm",
      "bottomDivider": {
        "enabled": true,
        "style": "solid",
        "width": "1px",
        "color": "#000000"
      },
      "columns": [
        [
          { "key": "data", "label": "Data:", "default": "" },
          { "key": "nome", "label": "Paciente:", "default": "" },
          { "key": "sexo", "label": "Sexo:", "default": "" },
          { "key": "especie", "label": "Espécie:", "default": "CANINA" },
          { "key": "requisitante", "label": "Requisitante:", "default": "Dr (a)" }
        ],
        [
          { "key": "idade", "label": "Idade:", "default": "NÃO INFORMADA" },
          { "key": "tutor", "label": "Proprietário (a):", "default": "" },
          { "key": "raca", "label": "Raça:", "default": "SRD" }
        ]
      ]
    },
    "titleConfig": {
      "text": "LAUDO ULTRASSONOGRÁFICO",
      "subtitle": null,
      "fontFamily": "Helvetica, Arial, sans-serif",
      "fontSize": "10.5pt",
      "color": "#000000",
      "bold": true,
      "underline": true,
      "alignment": "center",
      "marginTopMm": "12mm",
      "marginBottomMm": "12mm"
    },
    "bodyTypography": {
      "fontFamily": "'Microsoft New Tai Lue', 'Segoe UI', Calibri, sans-serif",
      "fontSize": "11pt",
      "lineHeight": "1.65",
      "paragraphSpacing": "10pt",
      "textAlign": "left",
      "organLabelCase": "SENTENCE_CASE",
      "organLabelBold": true,
      "paginationMode": "natural_multipage"
    },
    "signatureConfig": {
      "alignment": "right",
      "paddingRightMm": "25mm",
      "marginTopMm": "14mm",
      "order": "text_above_image",
      "textLines": [
        { "text": "Michele Resende", "bold": true, "fontSize": "11.5pt" },
        { "text": "CRMV-MG10817", "bold": true, "fontSize": "11.5pt" }
      ],
      "signatureImageHeightMm": "18mm"
    },
    "footerConfig": {
      "showOnTextPages": "last_text_page_disclaimer_all_text_pages_logo",
      "showOnImagePages": false,
      "disclaimerText": "O exame ultrassonográfico não possui valor diagnóstico absoluto. Devendo ser confrontada com dados clínicos e laboratoriais, além de outros exames de imagem prévios e/ou subsequentes. Somente seu médico veterinário tem condições de interpretar corretamente o conjunto de todas as informações.",
      "disclaimerFontFamily": "'Courier New', monospace",
      "disclaimerFontSize": "8pt",
      "dividerStyle": "dashed",
      "contactLines": [
        "Michele Resende – Médica Veterinária – CRMV – MG 10.817",
        "E-mail: ulsvet@outlook.com"
      ],
      "contactFontFamily": "'Courier New', monospace",
      "contactFontSize": "8.5pt",
      "showFooterLogo": true
    },
    "imageGridConfig": {
      "columns": 2,
      "rowsPerPage": 4,
      "gapPx": 1,
      "cardHeightMm": "65mm",
      "border": "none",
      "pagePaddingTopMm": "18mm",
      "pagePaddingSidesMm": "7mm"
    }
  },
  "estiloEscritaClinica": {
    "usarDiagDifSeparado": false,
    "usarTopicoConsideracoesSeparado": false,
    "formatoConclusao": "OBS_INLINE_CAVIDADE_ABDOMINAL",
    "omitirOrgaosSexoOposto": true,
    "incluirLinhaResumoRins": true,
    "formatoLinhaResumoRins": "Simétricos (RE={re_cm} cm/ RD={rd_cm} cm),",
    "separarAdrenaisEmDoisTopicos": true,
    "sequenciaOrgaos": [
      {
        "orgao": "Bexiga",
        "obrigatorio": true,
        "textoPadraoNormal": "Com repleção liquida adequada. Contornos internos regulares e paredes normoespessas ({bexiga_parede_cm} cm). Estrutura trilaminar mantida. Localização e morfologia usuais. Conteúdo anecoico, sem evidencias sonograficas de litíases, formações polipoide ou coágulos."
      },
      {
        "orgao": "Rins",
        "obrigatorio": true,
        "isResumo": true,
        "textoPadraoNormal": "Simétricos (RE={re_cm} cm/ RD={rd_cm} cm),"
      },
      {
        "orgao": "Rim esquerdo",
        "obrigatorio": true,
        "textoPadraoNormal": "Apresentando topografia, dimensões anatômicas normais com contorno regular, ecogenicidade mantida. Definição e relação cortico medular mantida. Ausência de imagens sugestivas de nefrólitos e hidronefrose."
      },
      {
        "orgao": "Rim direito",
        "obrigatorio": true,
        "textoPadraoNormal": "Apresentando topografia, dimensões anatômicas normais com contorno regular, ecogenicidade mantida. Definição e relação cortico medular mantida. Ausência de imagens sugestivas de nefrólitos e hidronefrose."
      },
      {
        "orgao": "Adrenal esquerda",
        "obrigatorio": true,
        "textoPadraoNormal": "Em topografia habitual, apresentando dimensões normais AE: {ae_cm} cm polo caudal. Contornos regulares, ecotextura homogênea e ecogenicidade normal.",
        "textoQuandoNaoVisualizada": "não visualizada"
      },
      {
        "orgao": "Adrenal direita",
        "obrigatorio": true,
        "textoPadraoNormal": "Em topografia habitual, apresentando dimensões normais AD: {ad_cm} cm polo caudal. Contornos regulares, ecotextura homogênea e ecogenicidade normal.",
        "textoQuandoNaoVisualizada": "não visualizada"
      },
      {
        "orgao": "Baço",
        "obrigatorio": true,
        "textoPadraoNormal": "Órgão em topografia habitual, apresentando volume usual. Parênquima com ecotextura predominantemente homogênea e ecogenicidade usual. Margens regulares. Arquitetura vascular com calibre e trajetos preservados ao Doppler colorido."
      },
      {
        "orgao": "Fígado",
        "obrigatorio": true,
        "textoPadraoNormal": "Órgão apresentando volume e morfologia usuais. Topografia habitual, contornos definidos, margem regular, ecotextura homogênea, ecogenicidade mantida. Arquitetura vascular com calibre e trajetos preservados ao Doppler colorido."
      },
      {
        "orgao": "Vesícula biliar",
        "obrigatorio": true,
        "textoPadraoNormal": "repleção preservada, apresentando conteúdo anecogênico, sem formação de sombra acústica posterior. Parede fina e regular, medindo aproximadamente {vb_parede_cm} cm, sem alterações focais evidentes.",
        "exemplosAlterados": [
          "repleção preservada, apresentando conteúdo predominantemente anecogênico, com presença de discreta quantidade de material ecogênico em suspensão/deposição, sem formação de sombra acústica posterior, compatível com conteúdo biliar espessado (lama biliar). Parede fina e regular, medindo aproximadamente {vb_parede_cm} cm, sem alterações focais evidentes."
        ]
      },
      {
        "orgao": "Estômago",
        "obrigatorio": true,
        "textoPadraoNormal": "Órgão em topografia habitual, paredes normoespessas ({est_parede_cm}cm), mucosa com pregueamento usual. Presença de conteúdo fluido e alimentar com partículas em suspensão e expressiva quantidade de gás."
      },
      {
        "orgao": "Alças Intestinais",
        "obrigatorio": true,
        "textoPadraoNormal": "Grande quantidade de gás difusamente distribuído. Segmento de alças de espessuras normais (duodeno: {duodeno_cm} cm; jejuno: {jejuno_cm} cm; colón {colon_cm} cm), com manutenção da estrutura laminar de camadas. Movimentos peristálticos preservados. Presença de discreta quantidade de conteúdo fecal e gás em região de colón descendente e reto."
      },
      {
        "orgao": "Pâncreas",
        "obrigatorio": true,
        "textoPadraoNormal": "Visibilizado na região correspondente ao lado pancreático direito, em topografia habitual, apresentando contornos regulares, ecogenicidade mantida e dimensões normais ({pancreas_cm} cm)."
      },
      {
        "orgao": "Aparelho reprodutor",
        "obrigatorio": true,
        "textoPadraoNormalFemea": "Útero não gravídico, apresentando volume normal, sem conteúdo luminal.",
        "textoPadraoNormalMacho": "Próstata e testículos em topografia habitual, apresentando dimensões, contornos e ecotextura preservados."
      },
      {
        "orgao": "Cavidade abdominal",
        "obrigatorio": true,
        "textoPadraoNormal": "Não há evidencias ultrassonográficas de alterações em linfonodos e/ou vasos abdominais. Não foi observado liquido abdominal durante a realização do exame."
      }
    ]
  }
}

```

## 5. Alterações no Banco de Dados (`prisma/schema.prisma`)

Na branch `feat/postgres-multitenant`, a tabela `ConfiguracaoLayout` (`configuracoes_layout`) hoje armazena apenas 10 colunas simples de tipografia/cor. Devemos estendê-la adicionando colunas `Json` e caminhos dos ativos extraídos para manter **100% de retrocompatibilidade** com o editor atual e suportar a clonagem avançada:

```
model ConfiguracaoLayout {
  id                String   @id @default(cuid())
  nome              String   @default("Padrão Oficial")
  isPadrao          Boolean  @default(false) @map("is_padrao")

  usuarioId         String?  @unique @map("usuario_id")
  usuario           Usuario? @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  clinicaId         String?  @map("clinica_id")
  clinica           Clinica? @relation(fields: [clinicaId], references: [id], onDelete: Cascade)

  // Campos básicos existentes (mantidos para retrocompatibilidade)
  fontFamily        String   @default("Calibri, sans-serif") @map("font_family")
  fontSizeBody      String   @default("11pt") @map("font_size_body")
  fontSizeTitulo    String   @default("14pt") @map("font_size_titulo")
  marginTop         String   @default("20mm") @map("margin_top")
  marginBottom      String   @default("20mm") @map("margin_bottom")
  marginLeft        String   @default("15mm") @map("margin_left")
  marginRight       String   @default("15mm") @map("margin_right")
  lineHeight        String   @default("1.4") @map("line_height")
  paragraphSpacing  String   @default("8pt") @map("paragraph_spacing")
  corPrimaria       String   @default("#1B365D") @map("cor_primaria")
  corSecundaria     String   @default("#4A777A") @map("cor_secundaria")

  // NOVOS CAMPOS: Ativos e DNA Visual/Textual extraídos dos PDFs do veterinário
  modoTemplate      String   @default("padrao_upa") @map("modo_template") // "padrao_upa" | "clonado_pdf"
  headerBannerUrl   String?  @map("header_banner_url")
  footerLogoUrl     String?  @map("footer_logo_url")
  assinaturaExtraidaUrl String? @map("assinatura_extraida_url")
  visualConfigJson  Json?    @map("visual_config_json")   // Objeto layoutVisual completo
  writingStyleJson  Json?    @map("writing_style_json")   // Objeto estiloEscritaClinica (frases por órgão)
  pdfsReferenciaQtd Int      @default(0) @map("pdfs_referencia_qtd")

  criadoEm          DateTime @default(now()) @map("criado_em")
  atualizadoEm      DateTime @updatedAt @map("atualizado_em")

  @@index([usuarioId])
  @@index([isPadrao])
  @@map("configuracoes_layout")
}

```

## 6. Refatoração dos Módulos Backend

### 6.1. Novo Módulo: `extrator_padrao_laudo.js` (Ingestão de 1 a 10 PDFs)

Responsável por receber o array de arquivos PDF enviados pelo médico (`req.files`) e executar 3 passos:

1. **Conversão de Páginas para PNG (300 DPI):**

   * Executa `pdftoppm -png -r 300 <pdf> <prefixo>` nas páginas de texto de cada PDF (descartando páginas em branco — como as páginas 5, 6 e 7 do `LAUDO REBECAVETLSTA.pdf`, que contêm apenas o rodapé vazio!).

2. **Chamada Multimodal ao Gemini (`extrairPerfilDePdfsComIA`):**

   * Envia as páginas de texto de todos os PDFs (até 10 laudos) e solicita:

     * Consolidação do vocabulário clínico do veterinário (comparando os múltiplos laudos para distinguir o que é **texto fixo de normalidade** de cada órgão vs. **descrição de achados patológicos**).

     * Identificação exata dos rótulos de cabeçalho (`Paciente:` vs `Nome:`, `Proprietário (a):` vs `Tutor:`, presença de `Raça:` e `Requisitante:`), capitalização (`UPPERCASE` vs `Title Case`), título, disclaimer, rodapé e geometria das fotos.

     * Coordenadas `[ymin, xmin, ymax, xmax]` (escala `0..1000`) do banner de cabeçalho, da assinatura manuscrita e do mini-logo de rodapé.

3. **Recorte de Alta Precisão com `sharp`:**

   * Recorta `header_banner.png` da Página 1 (em 300 DPI).

   * Recorta `signature.png` da página de assinatura e remove o fundo branco (gerando PNG transparente).

   * Recorta `footer_logo.png` (se detectado).

   * Salva os arquivos em `/app/uploads/templates/<usuarioId>/` e grava o `visualConfigJson` e `writingStyleJson` em `ConfiguracaoLayout` (além de atualizar `nome`, `crmv`, `nomeClinica`, `logoUrl` e `assinaturaUrl` no registro `Usuario` do Prisma).

### 6.2. Refatoração de `analisador_ia.js` (Prompt Dinâmico Guiado pelo `writingStyleJson`)

Atualmente, `analisador_ia.js` usa um único prompt hardcoded com as frases da Dra. Camila (UPA PET). Com a alteração:

* `analisador_ia.js` passa a receber `(caminhoImagens, apiKey, layoutUsuario)`:

  * Se `layoutUsuario?.modo_template === 'clonado_pdf'` e `layoutUsuario?.writing_style_json` existir:

    * O prompt injeta a **lista exata de órgãos, capitalização (`Bexiga` vs `BEXIGA`), frases de normalidade e exemplos de alterações** daquele médico (`writingStyleJson.sequenciaOrgaos`).

    * Se `usarDiagDifSeparado === false` (caso da Dra. Michele / ULSVET), instrui a IA a **deixar `diagDif: ""` vazio** e a escrever a impressão diagnóstica usando `OBS:` dentro de `Cavidade abdominal:` (ou inline no próprio órgão, como *"compatível com conteúdo biliar espessado (lama biliar)"*), sem jamais gerar `DIAG DIF.:`.

    * Se `omitirOrgaosSexoOposto === true`, proíbe estritamente a geração de `PRÓSTATA: Não se aplica (fêmea)`.

    * Se `incluirLinhaResumoRins === true`, gera o item `{ "orgao": "Rins", "texto": "Simétricos (RE=X,XX cm/ RD=X,XX cm)," }` imediatamente antes de `Rim esquerdo` e `Rim direito`.

    * Extrai também do cabeçalho do aparelho de ultrassom (ex.: GE Logiq `rebeca luzinete 11 mes pncher` ou Mindray) a **Raça** (`PINCHER`, `SRD`, etc.) para preencher o campo `raca` quando o cabeçalho do médico exigir.

### 6.3. Refatoração de `motor_laudo.js` (Renderizador Camaleão + Correção de Paginação)

O `motor_laudo.js` precisa de 5 correções estruturais para reproduzir fielmente qualquer laudo clonado:

1. **Eliminação da Duplicação de `DIAG DIF.:` (Bug Crítico Atual):**

   ```
   // Antes (causava "DIAG DIF.: DIAG DIF.: PIOMETRA..."):
   if (item.diagDif && item.diagDif.trim() !== '') {
     p += ` <em>DIAG DIF.: ${item.diagDif}</em>`;
   }
   
   // Depois (verifica se o texto já contém DIAG DIF. e se o perfil do médico usa DIAG DIF.):
   const usarDiagDif = visual?.usarDiagDifSeparado !== false;
   if (usarDiagDif && item.diagDif && item.diagDif.trim() !== '') {
     const diagLimpo = item.diagDif.replace(/^(\s*DIAG\s*DIF\.?\s*:?\s*)+/i, '').trim();
     if (!textoFormatado.toUpperCase().includes('DIAG DIF')) {
       p += ` <em>DIAG DIF.: ${diagLimpo}</em>`;
     }
   }
   
   ```

2. **Paginação Natural do Texto (1 ou 2 Páginas sem Espremer):**

   * No modo `natural_multipage` (como na ULSVET, onde o texto ocupa 2 páginas com espaçamento confortável):

     * Em vez de prender todo o texto dentro de um `.page-container { height: 297mm; max-height: 297mm; }`, a seção de texto usa fluxo paginado nativo do Chromium (`@page { size: A4 portrait; margin: 22mm 7mm 18mm 7mm; }` e `@page :first { margin-top: 0mm; }`), com `page-break-inside: avoid` em cada `<p>` de órgão e no bloco `.signature-and-disclaimer`.

     * Assim, quando o texto tem 13–14 órgãos e `line-height: 1.65`, os 7 primeiros órgãos ficam na Página 1 e os 7 seguintes + assinatura + disclaimer ficam perfeitamente distribuídos na Página 2, exatamente como no Word da Dra. Michele!

3. **Suporte ao Banner `full_bleed_banner` no Topo da Página 1:**

   * Quando `visualConfig.headerMode === 'full_bleed_banner'` e `headerBannerUrl` está presente:

     * Renderiza `<div class="full-bleed-banner"><img src="data:image/png;base64,..." /></div>` com `width: 210mm; margin-left: -7mm; margin-right: -7mm; margin-top: 0;` no topo exclusivo da Página 1.

4. **Grade Dinâmica de Dados do Paciente + Linha Horizontal:**

   * Renderiza dinamicamente as colunas de `visualConfig.patientGrid.columns`, aplicando `.toUpperCase()` nos valores quando `valueCase === 'UPPERCASE'` e inserindo a linha `<hr class="patient-divider">` (`border-top: 1px solid #000`) abaixo dos dados do paciente e o sublinhado em `<u>LAUDO ULTRASSONOGRÁFICO</u>`.

   * Destaca automaticamente `OBS:` em negrito (`<strong>OBS:</strong>`) dentro do texto de `Cavidade abdominal:`.

5. **Assinatura, Disclaimer em `Courier New` e Páginas de Fotos Limpas:**

   * Respeita `signatureConfig.order === 'text_above_image'` (renderizando `Michele Resende / CRMV-MG10817` acima da imagem `signature.png`).

   * Renderiza o disclaimer em `Courier New 8pt`, a linha tracejada (`border-top: 1px dashed #222`), o contato com e-mail e o `footer_logo.png`.

   * Nas páginas do mosaico de imagens, quando `repeatHeaderOnImagePages === false` e `footerConfig.showOnImagePages === false`, renderiza apenas o grid 2x4 com `gap: 1px`, `border: none` e `height: 65mm` por imagem, eliminando também páginas em branco extras (como as páginas 5 a 7 que existiam no Word da médica).

## 7. Novos Endpoints na API (`servidor_web.js`) e Fluxo no Frontend React

### 7.1. Endpoints Backend (`servidor_web.js`)

1. **`POST /api/layout-config/importar-pdfs`** (`upload.array('pdfs', 10)`):

   * Recebe de 1 a 10 arquivos `.pdf` do veterinário logado.

   * Executa `extrairPadraoCompletoDePdfs(caminhosPdfs, apiKey, req.usuario)`.

   * Retorna para o frontend:

     * As imagens recortadas em preview (`headerBannerUrl`, `assinaturaUrl`, `footerLogoUrl`).

     * Os metadados extraídos (`identidadeProfissional`, `layoutVisual`, `estiloEscritaClinica`).

     * Um **HTML/PDF de Preview Instantâneo** gerado com o novo template para o veterinário validar na tela.

2. **`POST /api/layout-config/confirmar-padrao`**:

   * Salva ou ajusta manualmente qualquer frase de órgão ou detalhe do template extraído no banco PostgreSQL (`configuracoes_layout`).

### 7.2. Interface no Frontend React (`SettingsPage.jsx` e `LayoutEditorDrawer.jsx`)

Na aba **"Configurações & IA"** ou dentro do **"Editor de Layout"** (`LayoutEditorDrawer.jsx`):

* Adicionar o cartão **"Clonar Meu Modelo de Laudo (Upload de 1 a 10 PDFs)"**:

  1. **Dropzone Multi-PDF:** Permite arrastar de 1 a 10 laudos em PDF já emitidos pelo veterinário (recomendando enviar pelo menos 2 ou 3 laudos para maior precisão na separação entre frases normais e alteradas).

  2. **Barra de Progresso em 3 Etapas:**

     * *Etapa 1:* Recortando cabeçalho gráfico, logo e assinatura manuscrita (300 DPI)...

     * *Etapa 2:* Mapeando fontes, margens, campos do paciente e mosaico de fotos...

     * *Etapa 3:* Aprendendo vocabulário clínico e frases padrão por órgão...

  3. **Modal de Revisão Lado a Lado ("Seu PDF Original" vs. "Laudo Gerado pelo Vetaro"):**

     * Exibe os recortes extraídos (Banner de topo, Assinatura transparente, Mini-logo de rodapé) com opção de ajuste fino da caixa de recorte (crop).

     * Lista a ordem dos órgãos e as frases-padrão aprendidas em acordeões editáveis para que o veterinário possa revisar ou ajustar qualquer frase antes de ativar o modelo.

## 8. Roteiro de Implementação em 4 Fases

| Fase | Arquivos Criados / Modificados | Descrição Objetiva | 
| ----- | ----- | ----- | 
| **Fase 1: Banco & Extrator Visual (300 DPI)** | `prisma/schema.prisma`, `Dockerfile`, `extrator_ativos_pdf.js` | Adição de `poppler-utils` e `sharp` no container, atualização do schema Prisma (`visualConfigJson`, `writingStyleJson`, URLs de ativos) e recorte automático de banner, assinatura transparente e rodapé. | 
| **Fase 2: Extrator de DNA Clínico (1–10 PDFs)** | `extrator_padrao_laudo.js`, `gerenciador_layout.js`, `validation.js` | Pipeline multimodal no Gemini que analisa até 10 PDFs simultaneamente e gera o JSON completo `TemplatePerfilVeterinario` (layout visual + frases canônicas por órgão + regras de conclusão). | 
| **Fase 3: Motor Camaleão PDF & DOCX** | `analisador_ia.js`, `motor_laudo.js`, `gerar_docx.js` | Adaptação do prompt de ultrassom para seguir o `writingStyleJson` do médico, correção do bug `DIAG DIF.:` duplicado, paginação natural de 1–2 páginas e renderização fiel de banners full-bleed e grids 2x4 sem cabeçalho nas páginas de fotos. | 
| **Fase 4: Rotas API & UI de Onboarding** | `servidor_web.js`, `frontend/src/services/api.js`, `LayoutEditorDrawer.jsx`, `SettingsPage.jsx` | Criação do endpoint `POST /api/layout-config/importar-pdfs` e da interface de upload de até 10 PDFs com comparação visual lado a lado. | 

# PLANEJAMENTO — Vetaro Studio: Modo Análise de Imagens (Visualizador + Sincronização Imagem ↔ Órgão a Custo Zero)

**Projeto:** Vetaro (`vetaro.com.br`)

**Data:** 2026-11-23

**Status:** Pronto para implementação

**Destino sugerido no repositório:** `plan/PLANEJAMENTO_MODO_ANALISE_IMAGENS_STUDIO.md`

**Custo adicional de IA:** **R\$ 0,00** (reaproveita `classificacaoImagens` já gerada na análise inicial)

**Estimativa total:** 3 a 5 dias úteis (sem migration de banco!)

## 1. Visão do Produto e Por Que Isso Tem Custo Zero de IA

Hoje o Vetaro Studio (`ReportPreviewModal.jsx`) oferece os modos **Dividido (Texto + PDF)**, **Editar Texto** e **PDF**. Porém, quando o médico veterinário quer revisar o exame olhando diretamente para as capturas do aparelho de ultrassom (uma por uma, ampliando calipers ou checando ecogenicidade) enquanto ajusta o texto de cada órgão, ele precisa alternar entre abas ou olhar a miniatura no PDF.

O **Modo Análise de Imagens** adiciona uma nova visão no switcher do Vetaro Studio (**Dividido | Análise de Imagens | PDF**) com:

1. **Palco principal de imagem (55% à esquerda):** captura ativa em alta resolução com fundo escuro neutro para máximo contraste ultrassonográfico, barra flutuante de **zoom (1x–3x)**, **brilho/contraste CSS** (útil para revisar calipers em telas claras), setas `←` / `→` (clicáveis e por teclado) e badge do órgão detectado (`BEXIGA • 4/12` + indicador se a IA marcou `ALTERADO`).

2. **Faixa inferior de miniaturas (filmstrip):** todas as outras imagens do exame em rolagem horizontal, com a imagem ativa destacada em borda esmeralda `#00D296`, etiqueta curta da sigla (`BEX`, `RE`, `FIG`) e bolinha de alerta âmbar nas fotos com `statusVisual === "ALTERADO"`.

3. **Painel lateral de órgãos (45% à direita):** as caixas editáveis de órgãos já existentes no Vetaro Studio.

4. **Sincronização bidirecional Imagem ↔ Órgão (R\$ 0,00 de IA):**

   * **Imagem → Órgão:** ao passar para a foto da bexiga (por clique ou seta `→`), o painel direito faz `scrollIntoView({ behavior: 'smooth', block: 'center' })`, destaca o card **BEXIGA** com borda esmeralda brilhante (`ring-2 ring-[#00D296]`) e foca o cursor no textarea correspondente (se o médico ativar o modo de foco rápido).

   * **Órgão → Imagem:** ao clicar no card de **RIM ESQUERDO** (ou clicar no ícone de "Ver fotos deste órgão" no cabeçalho do card), o visualizador salta automaticamente para a primeira captura classificada como `RIM ESQUERDO` (ou `RINS`).

### Por que o custo de IA é literalmente zero?

No `analisador_ia.js` (linhas 460–480), o Gemini **já preenche obrigatoriamente** o array `classificacaoImagens` durante a geração do laudo:

```
{
  "indice": 0,
  "sigla": "BEX",
  "orgao": "BEXIGA",
  "medidasLidas": ["1 D 0,34 cm"],
  "achadosVisuais": "...",
  "statusVisual": "NORMAL"
}

```

Hoje esse array só é usado em memória para ordenar as imagens (`ordenarImagensCanonicamente`) e depois é descartado. Basta **persistir esse mapeamento no `meta_exame.json`** (já salvo em disco na pasta do job) e devolvê-lo em `GET /api/ultrassom/:jobId/dados`. Nenhuma chamada extra à API do Gemini e nenhuma migration no PostgreSQL são necessárias.

## 2. Alterações no Backend (Leves e Sem Migration)

### 2.1. `servidor_web.js` — `POST /api/ultrassom`

Logo após `ordenarImagensCanonicamente`, montar o array `imagensMeta` vinculando o nome final do arquivo em disco aos metadados já extraídos pela IA:

```
const classificacaoPorArquivo = new Map();
if (Array.isArray(resultadoIA.classificacaoImagens)) {
  resultadoIA.classificacaoImagens.forEach((cls) => {
    const idx = Number(cls?.indice);
    const caminhoOrig = Number.isInteger(idx) ? caminhosArquivos[idx] : null;
    const nomeArq = caminhoOrig ? path.basename(caminhoOrig) : (cls?.nomeArquivo || '');
    if (nomeArq) {
      classificacaoPorArquivo.set(nomeArq, {
        sigla: cls?.sigla || '',
        orgao: cls?.orgao || '',
        statusVisual: cls?.statusVisual || 'NORMAL',
        medidasLidas: Array.isArray(cls?.medidasLidas) ? cls.medidasLidas : []
      });
    }
  });
}

```

Salvar `imagensMeta` dentro de `meta_exame.json` (preservando-o também em `POST /api/ultrassom/recompilar` para não perder os rótulos após uma edição!).

### 2.2. `servidor_web.js` — `GET /api/ultrassom/:jobId/dados`

Ao montar a lista `imagens` retornada ao `ReportPreviewModal.jsx`, enriquecer cada item com os metadados salvos em `meta_exame.json`:

```
{
  "nome": "foto_04.jpg",
  "url": "/api/exames/job_123/imagem/foto_04.jpg",
  "sigla": "BEX",
  "orgao": "BEXIGA",
  "statusVisual": "ALTERADO",
  "medidasLidas": ["1 D 0,34 cm"]
}

```

* **Retrocompatibilidade com exames antigos:** para laudos gerados antes desta atualização (sem `imagensMeta` no `meta_exame.json`), os campos `sigla` e `orgao` vêm vazios (`""`); o visualizador grande + faixa de miniaturas funciona normalmente sem quebrar nada, apenas sem o auto-foco por órgão.

## 3. Arquitetura do Frontend (`ReportPreviewModal.jsx` + Novo Componente)

Para manter `ReportPreviewModal.jsx` limpo e fácil de manter, criar um componente dedicado para o lado esquerdo do modo análise:

### 3.1. Novo componente: `frontend/src/components/UltrasoundImageAnalyzer.jsx`

* **Props:** `{ imagens = [], activeIndex, onSelectIndex, darkMode, activeOrganLabel }`

* **Palco Principal (Imagem Grande):**

  * Fundo preto/grafite médico (`#050B10`) para maximizar contraste da escala de cinza mesmo no Light Mode.

  * Badge superior esquerdo com `orgao` (ex: `BEXIGA • 4/12`) + pill âmbar `"Achado alterado"` quando `statusVisual === "ALTERADO"` + chips sutis com `medidasLidas` (se houver).

  * Barra flutuante de ferramentas: **Zoom (`1x`, `1.5x`, `2x`, `3x` + arrastar com mouse/pan quando ampliada)**, **Contraste / Brilho** (filtros CSS `contrast()` e `brightness()` com botão de reset instantâneo) e botões **Anterior (`←`) / Próxima (`→`)**.

  * Atalhos de teclado globais quando nenhum `<textarea>` ou `<input>` estiver focado: `ArrowLeft` / `ArrowRight` navegam entre imagens; `+` / `-` ajustam zoom; `0` reseta zoom/contraste.

* **Faixa Inferior de Miniaturas (Filmstrip):**

  * Scroll horizontal suave com `scrollIntoView({ inline: 'center' })` automático na miniatura ativa.

  * Cada miniatura mostra a foto recortada (`aspect-[4/3]`), etiqueta curta da sigla (`BEX`, `RE`, `FIG`) no canto inferior e indicador visual esmeralda (`ring-2 ring-[#00D296]`) na selecionada.

### 3.2. Motor de Match Órgão ↔ Imagem (100% client-side, sem IA)

Criar um helper puro `resolverIndiceOrgaoParaImagem(imgMeta, orgaosList)` que normaliza acentos e sinônimos comuns da veterinária:

| Sigla / Órgão na imagem | Match automático no laudo | 
| ----- | ----- | 
| `BEX`, `SED`, `BEXIGA` | `BEXIGA`, `VESÍCULA URINÁRIA` | 
| `RE`, `RD`, `RIM ESQUERDO`, `RIM DIREITO` | `RIM ESQUERDO`, `RIM DIREITO`, `RINS` | 
| `FIG`, `FÍGADO` | `FÍGADO` | 
| `VB`, `VESÍCULA BILIAR` | `VESÍCULA BILIAR` | 
| `BACO`, `BAÇO` | `BAÇO` | 
| `EST`, `ESTÔMAGO` | `ESTÔMAGO` | 
| `DUO`, `JJ`, `CD`, `ALÇAS` | `ALÇAS INTESTINAIS`, `TRATO GASTROINTESTINAL` | 
| `AE`, `AD`, `ADRENAL` | `GLÂNDULA ADRENAL`, `ADRENAIS` | 
| `UTERO`, `OE`, `OD`, `PROST`, `TE`, `TD` | `ÚTERO`, `OVÁRIOS`, `PRÓSTATA`, `TESTÍCULOS` | 
| `PANC`, `PÂNCREAS` | `PÂNCREAS` | 

### 3.3. Integração no `ReportPreviewModal.jsx`

1. **Novo valor em `activeTab`:** adicionar `'analise'` ao switcher superior (somente quando `!isSurgery && imagensUltrassom.length > 0`), exibindo o botão **Análise de Imagens** ao lado de **Dividido** e **PDF**.

2. **Layout responsivo:**

   * **Desktop (`>= 1024px`):** split 55% (`UltrasoundImageAnalyzer`) à esquerda + 45% (lista de caixas de órgãos já existente) à direita, com divisor redimensionável reutilizando `studioSplitPct`.

   * **Mobile / Tablet:** imagem principal + filmstrip no topo (fixo/compacto) e caixas de órgãos rolando logo abaixo.

3. **Destaque e Auto-Scroll no Órgão Sincronizado:**

   * Guardar `orgaoRefs = useRef({})` indexado pelo índice do órgão.

   * Ao mudar a imagem ativa no `UltrasoundImageAnalyzer`: calcular `matchedOrgaoIdx = resolverIndiceOrgaoParaImagem(...)`, setar `highlightedOrgaoIdx`, chamar `orgaoRefs.current[matchedOrgaoIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })` e aplicar borda/glow esmeralda (`ring-2 ring-[#00D296] shadow-[0_0_20px_rgba(0,210,150,0.18)]`) + badge `"Sincronizado com imagem X/N"`.

   * Em cada card de órgão, exibir um botão compacto **Ver foto (N)** quando houver capturas associadas a aquele órgão — ao clicar, o visualizador salta instantaneamente para aquela captura!

## 4. Cronograma de Execução (2 Etapas Rápidas)

| Etapa | Janela | Entregas | Arquivos | 
| ----- | ----- | ----- | ----- | 
| **Etapa 1 — Metadados de Classificação (Backend)** | 0,5 dia | Persistir `imagensMeta` (`sigla`, `orgao`, `statusVisual`, `medidasLidas`) no `meta_exame.json` em `POST /api/ultrassom` e preservar em `/recompilar`; devolver no `GET /api/ultrassom/:jobId/dados`. | `servidor_web.js` | 
| **Etapa 2 — Visualizador + Sync Bidirecional (Frontend)** | 2–3 dias | Criar `UltrasoundImageAnalyzer.jsx`, helper de match de órgãos/sinônimos, integrar nova aba **Análise de Imagens** no `ReportPreviewModal.jsx` (desktop + mobile) com zoom, brilho/contraste, setas de teclado e foco automático no órgão. | `UltrasoundImageAnalyzer.jsx`, `ReportPreviewModal.jsx` | 

## 5. Critérios de Aceite

* Ao abrir um laudo de ultrassom no Vetaro Studio, a opção **Análise de Imagens** aparece no topo quando o exame possui capturas.

* Passar da imagem do fígado para a imagem da bexiga (clicando na miniatura ou apertando `→`) rola suavemente o painel direito até o card **BEXIGA** e destaca a caixa em esmeralda sem perder edições feitas em outros órgãos.

* Clicar em um órgão (ou no atalho de foto do card) leva o visualizador para a imagem correspondente.

* Zoom (`1x–3x`), ajuste de brilho/contraste e reset funcionam fluidamente sem travar a digitação.

* Exames antigos (sem `imagensMeta`) abrem o visualizador e a faixa de miniaturas normalmente, sem erro de interface.
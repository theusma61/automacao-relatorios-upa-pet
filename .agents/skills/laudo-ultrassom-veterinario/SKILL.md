---
name: laudo-ultrassom-veterinario
description: >-
  Especialista em pré-análise e geração de laudos de ultrassonografia abdominal para pequenos animais
  (cães e gatos) no padrão oficial da clínica UPA PET (Dra. Camila Bastos - CRMV/MG: 22904).
  Ative esta skill sempre que o usuário enviar imagens, capturas de tela do ultrassom Mindray ou solicitar
  laudos e pré-análises veterinárias.
---

# Skill: Pré-Análise de Ultrassonografia Abdominal Veterinária (Padrão UPA PET)

Esta skill define as regras clínicas, valores de corte métricos, critérios de diagnósticos diferenciais (`DIAG DIF.:`), ordenação estrita de órgãos e imagens para exames de ultrassonografia abdominal em pequenos animais (cães e gatos).

---

## 1. Ordem Canônica dos Órgãos e Imagens

Tanto a descrição textual quanto o mosaico de imagens devem seguir rigorosamente a sequência anatômica abaixo:

1. **BEXIGA** (e suas variações: sedimentos, cálculos, dilatação de ureter)
2. **RIM ESQUERDO**
3. **RIM DIREITO**
4. **BAÇO** (e variações de esplenomegalia)
5. **ESTÔMAGO**
6. **FÍGADO**
7. **VESÍCULA BILIAR**
8. **DUODENO** *(no texto, agrupado em ALÇAS INTESTINAIS)*
9. **JEJUNO** *(no texto, agrupado em ALÇAS INTESTINAIS)*
10. **CÓLON DESCENDENTE** *(no texto, agrupado em ALÇAS INTESTINAIS)*
11. **OVÁRIOS** *(se fêmea: tópico único unificado com medidas de OE e OD)*
12. **ÚTERO** *(se fêmea)*
13. **TESTÍCULO ESQUERDO** *(se macho)*
14. **TESTÍCULO DIREITO** *(se macho)*
15. **PRÓSTATA** *(se macho)*
16. **ADRENAL ESQUERDA**
17. **ADRENAL DIREITA**
18. **PÂNCREAS**
19. **CAVIDADE ABDOMINAL**
20. **CONSIDERAÇÕES**

### Diagramação das Imagens no Mosaico (Grade de 2 Colunas)
As imagens capturadas do Mindray DEVEM ser organizadas e apresentadas exatamente na sequência canônica em ordem de leitura visual:
```
1 2
3 4
5 6
7 8
```
Cada página de anexo contém até 8 fotos organizadas exatamente nesse grid. Se houver mais de 8 fotos, a próxima página continua a sequência canônica (9 10 / 11 12 / 13 14 / 15 16).

---

## 2. Critérios Clínicos e Fraseologia por Órgão

### 1. BEXIGA
* **Início Obrigatório:** Começar sempre com a frase `"Em topografia habitual"` (ou `"Localizada em topografia habitual"`).
* **Formato e Quantidade de Líquido:** `"com formato preservado e repleção liquida [pouca / adequada / cheia]"`.
* **Paredes (Regras de Corte Métrico):**
  - **Felinos:** Normal é de **0,13 cm até 0,15 cm**. Acima de **0,15 cm** = *Cistite*.
  - **Caninos:** Normal é até **0,25 cm**. Acima de **0,25 cm** = *Cistite*.
  - **Margens Internas:** Na presença de cistite, descrever como `"margens internas irregulares"`. Se normal: `"margens internas regulares"`.
* **Conteúdo:** Descrever aspecto luminal: `"conteúdo anecogênico e homogêneo"` ou indicar presença de sedimentos hiperecogênicos flutuantes, urólitos (medidos em cm) com sombra acústica posterior.
* **Diagnósticos Diferenciais:**
  - Parede espessada: `DIAG DIF.: CISTITE.`
  - Parede espessada + sedimentos: `DIAG DIF.: CISTITE ASSOCIADA A SEDIMENTOS.`
  - Cálculos/Urólitos: `DIAG DIF.: URÓLITOS E SEDIMENTOS URINÁRIOS.` ou `DIAG DIF.: CÁLCULO E SEDIMENTOS.`

---

### 2. RINS (RIM ESQUERDO e RIM DIREITO SEPARADOS EM TÓPICOS)
Descrever o Rim Esquerdo e o Rim Direito em tópicos separados com a frase-base canônica:

`RIM ESQUERDO: Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.`

`RIM DIREITO: Localizado em topografia habitual, com contornos regulares, superficie lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córticomedular. Não há evidências de litiase ou hidronefrose.`

**Diagnósticos Diferenciais Renais:**
* **Perda da relação/diferenciação córtico-medular:**
  `DIAG DIF.: DOENÇA RENAL CRÔNICA, NEFROTOXICIDADE, PROCESSOS INFLAMATÓRIOS, INFECCIOSOS OU INFILTRATIVOS.`
* **Ecogenicidade cortical aumentada com relação córtico-medular mantida:**
  `DIAG DIF.: NEFROPATIA AGUDA, PROCESSOS TÓXICOS, GLOMERULONEFRITE, ALTERAÇÕES SECUNDÁRIAS A DISTÚRBIOS SISTÊMICOS.`
* **Cisto Renal:** Descrever estruturas anecóicas, arredondadas, de paredes finas e bem definidas com reforço acústico posterior distal (solitários ou múltiplos). `DIAG DIF.: CISTO RENAL, DOENÇA POLICÍSTICA RENAL.`
* **Hidronefrose:** Dilatação da pelve renal e divertículos como estruturas fluidas anecóicas ramificadas no interior do seio renal. `DIAG DIF.: HIDRONEFROSE, OBSTRUÇÃO URETERAL.`
* **Urolitíase (Calculose Renal):** Focos altamente ecogênicos no parênquima ou pelve com sombra acústica distal limpa. `DIAG DIF.: NEFROLITÍASE, UROLITÍASE.`
* **Mineralização / Nefrocalcinose:** Focos ecogênicos pontiformes ou lineares no córtex/medula (junção córtico-medular). `DIAG DIF.: NEFROCALCINOSE, MINERALIZAÇÃO RENAL.`

---

### 3. BAÇO
* **1° Localização:** `"Localizado em topografia habitual"`
* **2° Contornos:** `"com contornos regulares [ou irregulares], bem definidos"`
* **3° Dimensões:** `"dimensões preservadas"` OU `"dimensões aumentadas (estendendo-se caudalmente e ultrapassando o polo cranial do rim esquerdo)"`.
* **4° Parênquima e Ecogenicidade:** Sempre especificar se a ecogenicidade está **usual/preservada**, **aumentada** ou **diminuída**, e ecotextura **homogênea** ou **heterogênea**.
* **5° Arquitetura Vascular:** Incluir sempre `"Arquitetura vascular preservada."`
* **Diagnósticos Diferenciais Esplênicos:**
  * **Somente aumento de volume (sem alteração de parênquima):**  
    `DIAG DIF.: PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES.`
  * **Esplenomegalia difusa com alteração textural/ecogenicidade:**  
    `DIAG DIF.: ESPLENOMEGALIA DIFUSA, HEMATOPOIESE EXTRAMEDULAR, HIPERPLASIA LINFOIDE DIFUSA, INFILTRAÇÃO NEOPLÁSICA (LINFOMA).`
  * **Nódulos ou massas focais/multifocais:**  
    `DIAG DIF.: HIPERPLASIA NODULAR ESPLÊNICA, HEMATOPOIESE EXTRAMEDULAR, PROCESSO NEOPLÁSICO (HEMANGIOSSARCOMA, LINFOMA), LIPOMA ESPLÊNICO.`

---

### 4. ESTÔMAGO
* **1° Localização:** `"Localizado em topografia habitual"`
* **2° Paredes:**
  - Normoespessas: até **0,50 cm** (medida em cm).
  - Espessadas: acima de **0,50 cm** (medida em cm).
* **3° Conteúdo e Pregueamento:** `"paredes [normoespessas / espessadas], medindo X,XX cm, mucosas com pregueamento usual. Apresentando repleção parcial por conteúdo predominantemente hipoecoico com presença de pequenas áreas hiperecogênicas, pouca quantidade de gás em seu lúmen."`
* **Diagnósticos Diferenciais:**
  * Espessamento de parede: `DIAG DIF.: GASTRITE (AGUDA / CRÔNICA), ENTEROPATIA INFLAMATÓRIA, ULCERAÇÃO GÁSTRICA, PROCESSO NEOPLÁSICO INFILTRATIVO.`
  * Corpos Estranhos: `DIAG DIF.: CORPO ESTRANHO GÁSTRICO.`
  * Alterações de Motilidade: `DIAG DIF.: HIPOMOTILIDADE / ATONIA GÁSTRICA.`

---

### 5. FÍGADO
* **1° Localização:** `"Localizado em topografia habitual"`
* **2° Tamanho:** `"apresenta-se, na porção visível, com dimensões aparentemente preservadas e contornos regulares."`
  * O fígado está aumentado quando: **ultrapassa o gradil costal**, apresenta **arredondamento das margens** ou **deslocamento caudal de órgãos adjacentes**.
* **3° Parênquima:** `"O parênquima hepático demonstra ecogenicidade e ecotextura homogênea. Não foram observadas lesões focais, massas ou dilatação das vias biliares intra-hepáticas."`
* **Diagnósticos Diferenciais Hepáticos:**
  * **Ecogenicidade aumentada:** `DIAG DIF.: LIPIDOSE HEPÁTICA, HEPATOPATIA VACUOLAR, INFILTRADO GORDUROSO, HEPATITE CRÔNICA, HEPATOPATIA REACIONAL.`
  * **Ecogenicidade diminuída:** `DIAG DIF.: HEPATITE AGUDA, CONGESTÃO HEPÁTICA.`
  * **Ecotextura heterogênea / nódulos:** `DIAG DIF.: HEPATOPATIA CRÔNICA AVANÇADA (CIRROSE, FIBROSE SEVERA), HIPERPLASIA NODULAR REGENERATIVA, NEOPLASIA PRIMÁRIA (CARCINOMA HEPATOCELULAR) OU METASTÁTICA, PROCESSO INFLAMATÓRIO CRÔNICO / GRANULOMATOSO.`

---

### 6. VESÍCULA BILIAR
* **1° Paredes:** Normoespessas (até **0,10 cm**) ou espessas (acima de 0,10 cm).
* **2° Margem Interna:** Regular ou irregular.
* **3° Conteúdo:** Anecogênico e homogêneo.
* **Diagnósticos Diferenciais:**
  * **Lama Biliar (sedimento biliar móvel):** `DIAG DIF.: LAMA BILIAR, ESTASE BILIAR, COLANGITE.`
  * **Mucocele Biliar (padrão estriado/septado em 'roda de carroça'):** `DIAG DIF.: MUCOCELE BILIAR.`
  * **Colelitíase (cálculos com sombra acústica posterior):** `DIAG DIF.: COLELITÍASE, COLECISTITE.`
  * **Debris Celulares / Exsudato:** `DIAG DIF.: COLECISTITE, COLANGIO-HEPATITE.`

---

### 7. ALÇAS INTESTINAIS
* **Frase Padrão Obrigatória:**  
  `Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (X,XX cm), jejuno (X,XX cm) e colon descendente (X,XX cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em colon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total.`

---

### 8. APARELHO REPRODUTOR
* **Fêmea Inteira:**
  - **OVÁRIOS (Unificado):**
    `OVÁRIOS: Em topografia habitual e dimensões preservadas (OE: X,XX cm x X,XX cm , OD: X,XX cm x X,XX cm) apresenta formato ovalado, contornos regulares e definidos. Não há evidências de formações císticas, massas sólidas ou alterações estruturais.`
    *(Se cisto/folículo presente em um ou ambos: descrever a estrutura anecóica de parede fina e adicionar DIAG DIF.: FOLÍCULO OVARIANO, CISTO OVARIANO).*
  - **ÚTERO:**
    `ÚTERO: Localizado em topografia habitual. Corpo e cornos uterinos com dimensões preservadas...` *(Se piometra: dilatação tubular, paredes irregulares, conteúdo com pontos hipoecogênicos com DIAG DIF.: PIOMETRA, MUCOMETRA).*
* **Fêmea Castrada:** `ÚTERO / OVÁRIOS: Não visualizados, histórico de ovariosalpingohisterectomia.`
* **Macho Inteiro:**
  - `TESTÍCULO ESQUERDO: Em topografia habitual, dimensões preservadas (X,XX cm x X,XX cm)...`
  - `TESTÍCULO DIREITO: Em topografia habitual, dimensões preservadas (X,XX cm x X,XX cm)...` *(ou "não visualizado" em criptorquidia).*
  - `PRÓSTATA: Em topografia habitual, medindo X,XX cm x X,XX cm...` *(Cística/aumentada: DIAG DIF. HIPERPLASIA PROSTATICA).*
* **Macho Castrado:** `TESTICULOS: Não visualizados, histórico de orquiectomia.`

---

### 9. ADRENAIS, PÂNCREAS E CAVIDADE
* **GLÂNDULA ADRENAL:**
  - Quando visibilizadas e preservadas, utilizar OBRIGATORIAMENTE este padrão com quebras de linha exatas separando as mensurações:
    `GLÂNDULA ADRENAL: Apresenta dimensões e formato anatômicos preservados, contornos regulares, parênquima homogêneo e normoecogenico.`  
    `AE: 0,XX cm em polo cranial, 0,XX cm em polo caudal, e X,XX cm de comprimento.`  
    `AD: 0,XX cm em polo cranial, 0,XX cm em polo caudal, e X,XX cm de comprimento.`  
  - Se não visibilizadas: `"GLÂNDULA ADRENAL: Não visualizadas."`
  - Se alteradas (nódulos, aumento de polo cranial/caudal, assimetria): descrever as dimensões e formato e adicionar `DIAG DIF.: HIPERADRENOCORTICISMO, NEOPLASIA ADRENAL.`
* **PÂNCREAS:**
  - `"PANCREAS: Sem alteração em topografia de pâncreas."`
  - Se medido ramo: `"PANCREAS: Visibilizados parcialmente, com ramos pancreáticos apresentando dimensões e formatos anatômico preservados, contornos regulares, parênquima homogêneo e normoecogenico. Medindo ramo [direito/esquerdo] X,XX cm. Ducto pancreático preservado."`
* **CAVIDADE ABDOMINAL:**
  - `"Ausência de liquido livre, sem alterações evidentes em linfonodos abominais."` *(ou descrever efusão peritoneal).*
* **CONSIDERAÇÕES:**
  - `"Sugere-se acompanhamento ultrassonográfico das alterações visibilizadas. Associar a exames complementares."`

---

## 3. Padrão de Entrega e Tipografia Oficial

* **Arquivos Gerados:** São entregues exclusivamente o arquivo oficial compilado em **PDF** (`Laudo_<Paciente>.pdf`) e o editável em **Word DOCX** (`Laudo_<Paciente>.docx`). Não gerar arquivos HTML adicionais na pasta do exame.
* **Tamanho de Fonte Aumentado:** Tipografia configurada em 10pt (size 20 em DOCX / 9.8pt em PDF) para máxima legibilidade, clareza e conforto de leitura, mantendo a primeira página com assinatura perfeita sem quebras indesejadas.

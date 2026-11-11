# 📋 Regras de Negócio Clínicas e Padrões Médicos

Este documento detalha todas as **regras de negócio clínicas**, tabelas de corte métrico, critérios de diagnósticos diferenciais (`DIAG DIF.:`), padrões de redação e restrições de diagramação seguidas rigorosamente pelo sistema.

O sistema foi concebido e calibrado para espelhar a conduta médica da **Dra. Camila Bastos (CRMV/MG: 22904)** na clínica **UPA PET**.

---

## 1. Módulo de Ultrassonografia Abdominal

### 1.1. Ordem Canônica Estrita dos Órgãos e Imagens

Tanto a descrição textual no laudo quanto a disposição das fotos nas páginas de anexo **DEVEM** seguir rigorosamente a sequência anatômica abaixo (prioridades de 1 a 20):

| Prioridade | Órgão / Estrutura | Siglas no Mindray | Observações de Redação |
| :---: | :--- | :--- | :--- |
| **1** | **BEXIGA** | `BEX`, `SED`, `UROLITO` | Iniciar com *"Em topografia habitual"* |
| **2** | **RIM ESQUERDO** | `RE`, `R.ESQ`, `KIDNEY L` | Descrever em tópico próprio com medidas de comprimento |
| **3** | **RIM DIREITO** | `RD`, `R.DIR`, `KIDNEY R` | Descrever em tópico próprio com medidas de comprimento |
| **4** | **BAÇO** | `BACO`, `SPLEEN`, `SPL` | Avaliar se ultrapassa polo cranial do rim esquerdo |
| **5** | **ESTÔMAGO** | `EST`, `STOMACH`, `GAS` | Avaliar espessura de parede e pregueamento mucoso |
| **6** | **FÍGADO** | `FIG`, `LIVER`, `HEP` | Parênquima, ecogenicidade e bordos |
| **7** | **VESÍCULA BILIAR** | `VB`, `GB`, `VESICULA` | Paredes, conteúdo anecogênico, lama ou cálculos |
| **8** | **DUODENO** | `DUO`, `DUODENO` | No texto: unificado em *ALÇAS INTESTINAIS* |
| **9** | **JEJUNO** | `JJ`, `JEJUNO` | No texto: unificado em *ALÇAS INTESTINAIS* |
| **10** | **CÓLON DESCENDENTE** | `CD`, `COLON` | No texto: unificado em *ALÇAS INTESTINAIS* |
| **11** | **OVÁRIOS** | `OE`, `OD`, `OV` | Se fêmea: unificado em tópico único com OE e OD |
| **12** | **ÚTERO** | `UTERO`, `CUE`, `CUD`, `CORPO` | Se fêmea: avaliar dilatação luminal e espessura |
| **13** | **TESTÍCULO ESQUERDO** | `TE`, `TEST L` | Se macho inteiro |
| **14** | **TESTÍCULO DIREITO** | `TD`, `TEST R` | Se macho inteiro |
| **15** | **PRÓSTATA** | `PROSTATA`, `PROST` | Se macho: dimensões e parênquima |
| **16** | **ADRENAL ESQUERDA** | `ADR ESQ`, `AE`, `L ADRENAL` | Polo cranial, polo caudal e comprimento |
| **17** | **ADRENAL DIREITA** | `ADR DIR`, `AD`, `R ADRENAL` | Polo cranial, polo caudal e comprimento |
| **18** | **PÂNCREAS** | `PANCREAS`, `PANC` | Avaliar topografia |
| **19** | **CAVIDADE ABDOMINAL** | `CAV`, `PERITONIO` | Pesquisa de líquido livre e linfonodomegalias |
| **20** | **CONSIDERAÇÕES** | - | Recomendações e correlações clínicas |

---

### 1.2. Critérios Diagnósticos e Tabela de Corte por Órgão

#### 1. BEXIGA
- **Frase Obrigatória de Abertura:** *"Em topografia habitual, com formato preservado e repleção líquida [pouca / adequada / acentuada]."*
- **Valores de Corte Métrico para Espessura de Parede:**
  - **Felinos:** Normal de **0,13 cm até 0,15 cm**. Acima de **0,15 cm** = *Cistite*.
  - **Caninos:** Normal até **0,25 cm**. Acima de **0,25 cm** = *Cistite*.
- **Margens Internas:**
  - Se parede normal: *"margens internas regulares"*.
  - Se cistite/espessada: *"margens internas irregulares"*.
- **Conteúdo Luminal:**
  - Normal: *"Conteúdo anecogênico e homogêneo límpido."*
  - Com alterações: descrever sedimentos hiperecogênicos flutuantes e/ou urólitos com sombra acústica posterior.
- **Diagnósticos Diferenciais Obrigatórios (`DIAG DIF.:`):**
  - Apenas espessada: `DIAG DIF.: CISTITE.`
  - Parede espessada + sedimentos: `DIAG DIF.: CISTITE ASSOCIADA A SEDIMENTOS URINÁRIOS.`
  - Presença de urólitos: `DIAG DIF.: URÓLITOS E SEDIMENTOS URINÁRIOS.` ou `DIAG DIF.: CÁLCULO E SEDIMENTOS.`

#### 2. RINS (RIM ESQUERDO E RIM DIREITO)
- **Regra de Apresentação:** Devem ser descritos em tópicos separados para permitir comparação direta de dimensões.
- **Frase-Base Canônica:**
  ```text
  RIM ESQUERDO: Localizado em topografia habitual, com contornos regulares, superfície lisa e dimensões preservadas, medindo aproximadamente X,XX cm. Parênquima com ecogenicidade cortical e ecotextura homogênea. Observa-se diferenciação córtico-medular. Não há evidências de litíase ou hidronefrose.
  ```
- **Critérios de Diagnóstico Diferencial:**
  - **Perda da relação córtico-medular:**  
    `DIAG DIF.: DOENÇA RENAL CRÔNICA, NEFROTOXICIDADE, PROCESSOS INFLAMATÓRIOS, INFECCIOSOS OU INFILTRATIVOS.`
  - **Ecogenicidade cortical aumentada com relação mantida:**  
    `DIAG DIF.: NEFROPATIA AGUDA, PROCESSOS TÓXICOS, GLOMERULONEFRITE, ALTERAÇÕES SECUNDÁRIAS A DISTÚRBIOS SISTÊMICOS.`
  - **Cisto Renal:**  
    `DIAG DIF.: CISTO RENAL, DOENÇA POLICÍSTICA RENAL.`
  - **Dilatação de pelve renal:**  
    `DIAG DIF.: HIDRONEFROSE, OBSTRUÇÃO URETERAL.`
  - **Focos pontiformes hiperecogênicos na junção córtico-medular:**  
    `DIAG DIF.: NEFROCALCINOSE, MINERALIZAÇÃO RENAL.`

#### 3. BAÇO
- **Localização e Contornos:** *"Localizado em topografia habitual, com contornos regulares e bem definidos."*
- **Avaliação de Dimensão:**
  - Normal: *"dimensões preservadas"*.
  - Aumentado: *"dimensões aumentadas (estendendo-se caudalmente e ultrapassando o polo cranial do rim esquerdo)"*.
- **Vascularização:** Sempre incluir *"Arquitetura vascular preservada."*
- **Critérios de Diagnóstico Diferencial:**
  - **Somente esplenomegalia com parênquima homogêneo:**  
    `DIAG DIF.: PROCESSO INFLAMATÓRIO / INFECCIOSO / HEMOPARASITOSES.`
  - **Esplenomegalia difusa heterogênea:**  
    `DIAG DIF.: ESPLENOMEGALIA DIFUSA, HEMATOPOIESE EXTRAMEDULAR, HIPERPLASIA LINFOIDE DIFUSA, INFILTRAÇÃO NEOPLÁSICA (LINFOMA).`
  - **Nódulos ou massas focais:**  
    `DIAG DIF.: HIPERPLASIA NODULAR, HEMATOMA, HEMANGIOMA, HEMANGIOSSARCOMA.`

#### 4. ESTÔMAGO
- **Frase Padrão:** *"Localizado em topografia habitual, paredes normoespessas (medindo cerca de X,XX cm), mucosas com pregueamento usual. Apresentando repleção parcial por conteúdo predominantemente hipoecoico com presença de pequenas áreas hiperecogênicas (gás intraluminal)."*
- **Diagnósticos Diferenciais:**
  - Parede espessada: `DIAG DIF.: GASTRITE, PROCESSO INFLAMATÓRIO.`
  - Estrutura intraluminal hiperecogênica com sombra acústica posterior: `DIAG DIF.: CORPO ESTRANHO GÁSTRICO.`

#### 5. FÍGADO
- **Parênquima e Ecogenicidade:**
  - Normal: *"apresenta-se com dimensões preservadas, contornos regulares e bordos afilados. O parênquima hepático demonstra ecogenicidade e ecotextura homogênea."*
- **Diagnósticos Diferenciais:**
  - Hiperecogênico difuso: `DIAG DIF.: HEPATOPATIA ESTEROIDAL, LIPIDOSE HEPÁTICA, PROCESSO CRÔNICO DEGENERATIVO.`
  - Hipoecogênico difuso com hepatomegalia: `DIAG DIF.: HEPATITE AGUDA, CONGESTÃO PASSIVA.`
  - Nódulos/massas: `DIAG DIF.: HIPERPLASIA NODULAR, NEOPLASIA HEPÁTICA (PRIMÁRIA OU METASTÁTICA), ABSCESSO.`

#### 6. VESÍCULA BILIAR
- **Valores de Corte:** Parede normoespessa até **0,10 cm**.
- **Diagnósticos Diferenciais:**
  - Sedimento móvel declive: `DIAG DIF.: LAMA BILIAR, ESTASE BILIAR, COLANGITE.`
  - Padrão estrelado em roda de carroça (imóvel): `DIAG DIF.: MUCOCELE BILIAR.`
  - Cálculos com sombra acústica: `DIAG DIF.: COLELITÍASE, COLECISTITE.`

#### 7. ALÇAS INTESTINAIS
- **Frase Obrigatória Padronizada:**
  ```text
  Segmentos parcialmente visibilizados, paredes normoespessas em duodeno (X,XX cm), jejuno (X,XX cm) e cólon descendente (X,XX cm). Preenchidas por conteúdo gasoso/mucoide e conteúdo fecal em cólon. Estratificação parietal preservada e peristaltismo evolutivo, sem evidências de processo obstrutivo parcial ou total.
  ```
- **Se Obstrução / Espessamento:** Identificar segmento e aplicar `DIAG DIF.: ENTERITE, INTUSSUSCEPÇÃO, CORPO ESTRANHO INTESTINAL, NEOPLASIA INTESTINAL.`

#### 8. APARELHO REPRODUTOR
- **Fêmea Inteira:**
  - **OVÁRIOS (Tópico Unificado):**  
    *"OVÁRIOS: Em topografia habitual e dimensões preservadas (OE: X,XX cm x X,XX cm; OD: X,XX cm x X,XX cm), apresentam formato ovalado, contornos regulares e definidos. Ausência de formações císticas ou estruturais anormais."*
  - **ÚTERO:**  
    Normal: *"Localizado em topografia habitual. Corpo e cornos uterinos com dimensões preservadas..."*  
    Se dilatação fluida: `DIAG DIF.: PIOMETRA, MUCOMETRA, HIDROMETRA.`
- **Fêmea Castrada:**  
  *"ÚTERO / OVÁRIOS: Não visualizados, histórico de ovariosalpingohisterectomia (OSH)."*
- **Macho Inteiro:** Descrever `TESTÍCULO ESQUERDO`, `TESTÍCULO DIREITO` e `PRÓSTATA` (se aumento/cistos: `DIAG DIF.: HIPERPLASIA PROSTÁTICA BENIGNA, PROSTATITE, CISTOS PROSTÁTICOS`).
- **Macho Castrado:** *"TESTÍCULOS: Não visualizados, histórico de orquiectomia."*

#### 9. GLÂNDULA ADRENAL
- **Regra de Formatação Estrita:** Quando normais, **OBRIGATÓRIO** usar a quebra de linha interna entre as medidas:
  ```text
  Apresenta dimensões e formato anatômicos preservados, contornos regulares, parênquima homogêneo e normoecogênico.
  AE: 0,XX cm em polo cranial, 0,XX cm em polo caudal, e X,XX cm de comprimento.
  AD: 0,XX cm em polo cranial, 0,XX cm em polo caudal, e X,XX cm de comprimento.
  ```
- **Quando não visualizadas:** *"Não visualizadas."*
- **Alterações:** Se aumentadas ou com nódulos: `DIAG DIF.: HIPERADRENOCORTICISMO, NEOPLASIA ADRENAL.`

#### 10. PÂNCREAS, CAVIDADE E CONSIDERAÇÕES
- **PÂNCREAS:** *"Sem alteração em topografia de pâncreas."*
- **CAVIDADE ABDOMINAL:** *"Ausência de líquido livre, sem alterações evidentes em linfonodos abdominais."*
- **CONSIDERAÇÕES:** *"Sugere-se acompanhamento ultrassonográfico das alterações visibilizadas. Associar a exames complementares e ao quadro clínico do paciente."*

---

### 1.3. Diagramação das Fotos no Anexo (Mosaico 2x4)

- Cada página de fotos contém no máximo **8 capturas de tela**.
- O grid segue o padrão de leitura ocidental (linha por linha, de cima para baixo):
  ```text
  [ Imagem 1 ]   [ Imagem 2 ]
  [ Imagem 3 ]   [ Imagem 4 ]
  [ Imagem 5 ]   [ Imagem 6 ]
  [ Imagem 7 ]   [ Imagem 8 ]
  ```
- Caso o exame possua mais de 8 fotos, a página seguinte repete o cabeçalho e continua exatamente na ordem canônica (9, 10 / 11, 12 / 13, 14 / 15, 16).

---

## 2. Módulo Cirúrgico

### 2.1. A "Regra Pétrea" da Página Única
- **Página 1 (Inviolável):** O Relatório Cirúrgico Oficial deve conter exatamente **1 página A4**, terminando impreterivelmente na assinatura da Dra. Camila Bastos no rodapé da página 1.
- **Página 2 (Registro Fotográfico Opcional):** Se houver fotos intraoperatórias ou da peça cirúrgica enviadas no exame, elas são renderizadas exclusivamente na **Página 2**, centralizadas em moldura elegante com cabeçalho institucional e legenda médica explicativa.

### 2.2. Vocabulário Institucional e Padrões de Sutura
Nas descrições de técnicas cirúrgicas da UPA PET, a IA harmoniza os procedimentos de acordo com os padrões formais:
1. **Preparo e Antissepsia:**  
   *"Ampla tricotomia da região cirúrgica. Antissepsia realizada utilizando solução degermante à base de clorexidina, seguida de solução alcoólica, repetida por no mínimo três ciclos."*
2. **Abordagem por Planos:**  
   Incisão em linha média ventral, abertura anatômica por planos: pele, tecido subcutâneo e linha alba.
3. **Hemostasia:**  
   Identificação de vasos, ligaduras triplas ou hemostasia cauterizada/local com cianoacrilato ou fios cirúrgicos adequados.
4. **Síntese Padronizada (Padrões de Sutura e Fios):**
   - **Peritônio e Musculatura (Linha Alba):** Fio não absorvível Nylon (2-0 ou 0) em **Padrão Reverdin** ou Padrão Sultan.
   - **Tecido Subcutâneo:** Fio absorvível Proliglecaprone (3-0 ou 2-0) ou Ácido Poliglicólico (Vicryl) em **Padrão de Sutura Intradérmica** contínua (redução de espaço morto).
   - **Pele:** Fio não absorvível Nylon (3-0 ou 4-0) em **Padrão Sultan** ou pontos simples separados.

---

*Para detalhes da implementação de cada script de código, consulte [MODULES_AND_FEATURES.md](./MODULES_AND_FEATURES.md).*

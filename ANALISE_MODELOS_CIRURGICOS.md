# Análise: Modelos Cirúrgicos Não Trazendo Valores nos Relatórios

**Data:** 2026-11-12  
**Sistema:** UPA PET — Automação de Relatórios  
**Arquivo principal:** `servidor_web.js` (frontend + backend inline), `analisador_cirurgia.js`, `gerenciador_modelos.js`, `motor_cirurgia.js`

---

## 1. Resumo do Problema

Ao gerar relatórios cirúrgicos a partir de modelos já cadastrados (ex: "Ovariossalpingohisterectomia terapêutica para piometra"), os campos **Diagnóstico Pré-Cirúrgico**, **Descrição do Procedimento** e **Evolução e Considerações** não são preenchidos com o conteúdo padronizado do modelo. O relatório sai genérico ou vazio nesses trechos.

---

## 2. Fluxo Atual (Como Funciona Hoje)

```
Frontend (servidor_web.js)
  └─ enviarCirurgia() → POST /api/cirurgia com arquivos (áudio, texto, imagens)

Backend (servidor_web.js → /api/cirurgia)
  └─ analisarCirurgiaComIA(arquivos, apiKey)  [analisador_cirurgia.js]
        │
        ├─ obterTextoModelosParaPrompt()  [gerenciador_modelos.js]
        │    └─ SELECT * FROM modelos_cirurgicos
        │    └─ Formata TODOS os modelos em texto plano para o prompt
        │
        ├─ Prompt para Gemini (modelos + instruções + arquivos do usuário)
        │
        └─ IA retorna JSON: { paciente, cirurgia: { procedimento, diagnosticoPreCirurgico, descricaoProcedimento, evolucaoConsideracoes } }
              │
              └─ gerarDocumentosCirurgicos()  [motor_cirurgia.js]
                   └─ Gera DOCX/PDF usando APENAS o JSON retornado pela IA
```

---

## 3. Causa Raiz

### 3.1 Prompt Ambíguo — Não Manda "Copiar e Adaptar"

O prompt atual (linhas 45-100 de `analisador_cirurgia.js`) diz:

> **Regra 2:** "Se o procedimento realizado corresponder a um dos modelos cadastrados... **use a estrutura e o vocabulário padrão daquele modelo, adaptando e enriquecendo com os dados reais**..."

**Problema:** "Usar a estrutura e o vocabulário" ≠ "Copiar o texto exato dos campos do modelo". A IA interpreta como "escreva no mesmo estilo", não "use o conteúdo pré-preenchido como base".

Os modelos têm campos ricos e específicos:
```json
{
  "diagnosticoPreCirurgico": "Piometra confirmada por exame de imagem...",
  "descricaoProcedimento": "A paciente foi submetida à anestesia geral... [texto longo e detalhado]",
  "evolucaoConsideracoes": "O procedimento transcorreu sem intercorrências..."
}
```

Mas a IA recebe tudo como texto plano no prompt e **não tem instrução explícita para replicar esses campos como ponto de partida**.

---

### 3.2 Matching de Modelo Deixado para a IA (Frágil)

- A IA recebe 14 modelos com sinônimos.
- O usuário fala "piometra" ou manda um `.txt` com "PROCEDIMENTO: Ovariohisterectomia".
- A IA deve **inferir** qual modelo corresponde — baseada apenas em nome/sinônimos no prompt.
- Erros de matching = modelo errado = conteúdo errado ou genérico.

---

### 3.3 Nenhuma Validação/Enriquecimento no Backend

O backend **confia cegamente** no JSON retornado pela IA. Não há:
- Verificação se `cirurgia.procedimento` bate com algum modelo cadastrado.
- Fallback: se a IA não preencheu `diagnosticoPreCirurgico`, buscar do modelo correspondente.
- Log de qual modelo a IA "escolheu" (o JSON não inclui `modeloId`).

---

### 3.4 Frontend Não Permite Seleção de Modelo

O fluxo atual: usuário sobe áudio/arquivo → IA decide tudo.  
Não há step onde o usuário confirme/selecionou "Modelo: OSH Piometra Completa".

---

## 4. Evidências no Código

| Arquivo | Trecho Relevante | Problema |
|---------|------------------|----------|
| `analisador_cirurgia.js:45-100` | Prompt instrui "use a estrutura e o vocabulário" | Vago; não manda copiar campos |
| `gerenciador_modelos.js:143-158` | `obterTextoModelosParaPrompt()` envia TODOS os modelos | Prompt inchado; IA pode confundir |
| `analisador_cirurgia.js:189-191` | Extrai JSON da resposta; sem validação | Confia 100% na IA |
| `motor_cirurgia.js:66+` | `gerarDocxCirurgico()` usa só `dados.cirurgia.*` | Sem fallback para modelo |
| `servidor_web.js:1705+` | `enviarCirurgia()` não envia `modeloId` | Frontend não permite escolher |

---

## 5. Soluções Possíveis (Ordenadas por Impacto x Esforço)

### Opção A — Prompt Mais Explícito (Baixo esforço, médio impacto)
Alterar o prompt para:
> **REGRA CRÍTICA:** Ao identificar o modelo correspondente, **COPIE O TEXTO EXATO** dos campos `DIAGNÓSTICO PRÉ-CIRÚRGICO`, `DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO` e `EVOLUÇÃO E CONSIDERAÇÕES` daquele modelo como BASE do seu relatório. Depois adapte/enriqueça com dados do caso (nomes, fios, achados, complicações). **Não reescreva do zero.**

**Prós:** Rápido, sem mudança de arquitetura.  
**Contras:** IA ainda pode falhar no matching; prompt fica maior.

---

### Opção B — Backend Faz Matching + Enriquecimento (Médio esforço, alto impacto)
1. Receber `modeloId` opcional do frontend (ou inferir por similaridade de `procedimento`/`sinonimos` no backend).
2. Carregar o modelo do banco.
3. Enviar **apenas esse modelo** para a IA (prompt menor, foco total).
4. Após IA retornar, **mesclar**: campos vazios/genéricos da IA ← preencher com modelo.

**Prós:** Controle total; prompt enxuto; fallback garantido.  
**Contras:** Requer mudança no fluxo backend + frontend (enviar modeloId).

---

### Opção C — Frontend Permite Selecionar Modelo (Médio esforço, alto impacto)
- Na tela de envio (aba Cirúrgico), adicionar dropdown "Modelo base (opcional)" carregado de `/api/modelos-cirurgicos`.
- Usuário seleciona → `modeloId` vai no `FormData` para `/api/cirurgia`.
- Backend usa Opção B.

**Prós:** Usuário no controle; elimina ambiguidade.  
**Contras:** UI extra; usuário pode não saber qual modelo escolher.

---

### Opção D — Híbrida Recomendada (Opção B + C)
1. **Frontend:** Dropdown "Modelo base" (opcional, carrega da API). Se usuário não escolher, backend tenta inferir por palavras-chave no texto/áudio.
2. **Backend:** Se `modeloId` veio → carrega modelo, envia só ele para IA + instrução "copie e adapte". Se não veio → heurística simples (busca sinonimos no texto extraído) → se achar, usa esse modelo; senão, envia todos (fallback atual).
3. **Pós-IA:** Merge obrigatório — qualquer campo vazio ou "Não informado" no JSON da IA ← preenche do modelo correspondente.
4. **Log:** Registrar `modeloId` usado (ou "inferido: X" / "nenhum") para auditoria.

---

## 6. Recomendação Imediata

**Implementar Opção D (Híbrida)** — resolve na raiz, mantém compatibilidade, dá controle ao usuário e garante que os modelos sejam de fato usados.

**Passos mínimos:**
1. `gerenciador_modelos.js`: adicionar `obterModeloPorId(id)` (já existe) + `inferirModeloPorTexto(texto)` (novo).
2. `analisador_cirurgia.js`: receber `modeloId` opcional → montar prompt com 1 modelo ou fallback.
3. `analisador_cirurgia.js`: pós-processamento `mesclarComModelo(resultadoIA, modelo)`.
4. `servidor_web.js` `/api/cirurgia`: aceitar `modeloId` no FormData, passar para `analisarCirurgiaComIA`.
5. Frontend (aba Cirúrgico): `<select id="selModeloCirurgico">` populado via `/api/modelos-cirurgicos`.

---

## 7. Checklist de Validação Pós-Fix

- [ ] Relatório de "OSH Piometra" sai com diagnóstico/descrição/evolução do modelo preenchidos.
- [ ] Se usuário não escolhe modelo, backend infere corretamente na maioria dos casos.
- [ ] Se IA retorna campo vazio, modelo preenche (fallback funciona).
- [ ] Log mostra qual modelo foi usado (explícito ou inferido).
- [ ] Prompt não estoura token limit (enviar 1 modelo ≪ 14 modelos).

---

## 8. Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `gerenciador_modelos.js` | + `inferirModeloPorTexto(texto)`, exportar |
| `analisador_cirurgia.js` | `analisarCirurgiaComIA(arquivos, apiKey, modeloId?)` + merge pós-IA |
| `servidor_web.js` | `/api/cirurgia` ler `modeloId` do FormData; passar adiante |
| `servidor_web.js` (frontend) | Dropdown modelo na aba Cirúrgico + `carregarModelosParaSelect()` |

---

*Fim da análise. Nenhuma correção foi aplicada — apenas diagnóstico.*
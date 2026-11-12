# PLANEJAMENTO — Modelos Cirúrgicos: JSON → Banco → Tela (Consulta + Edição)

**Data:** 2026-11-12
**Status:** Planejamento (sem implementação)
**Pasta:** `plan/`

---

## Contexto / Problema

Os 14 modelos cirúrgicos com conteúdo rico estão em `modelos_cirurgicos/*.json`.
Os valores precisam:

1. Estar **no banco SQLite** (`modelos_cirurgicos` table) — todos os campos populados.
2. Aparecer **na tela** — grid, busca e modal de detalhes já existem.
3. Ser **consulta e edição** via a interface — modais e API já existem.

**Inferência automática (IA) permanece — SEM dropdown de seleção de modelo.**

---

## Estado Atual (Auditado 12/11/2026)

### Backend (API + Camada DB) — ✅ Funcional

| Item | Arquivo | Status |
|------|---------|--------|
| `GET /api/modelos-cirurgicos` | `servidor_web.js:305` | ✅ |
| `GET /api/modelos-cirurgicos/:id` | `servidor_web.js:316` | ✅ |
| `POST /api/modelos-cirurgicos` (cria/ata) | `servidor_web.js:329` | ✅ |
| `DELETE /api/modelos-cirurgicos/:id` (admin) | `servidor_web.js:341` | ✅ |
| `carregarModelosCirurgicos()` | `gerenciador_modelos.js:34` | ✅ |
| `obterModeloPorId(id)` | `gerenciador_modelos.js:48` | ✅ |
| `salvarOuCriarModelo(dados)` | `gerenciador_modelos.js:65` | ✅ |
| `excluirModelo(id)` | `gerenciador_modelos.js:112` | ✅ |

### Frontend (Tela de Modelos) — ✅ Funcional

| Item | Elemento/Func | Status |
|------|---------------|--------|
| Grid de cards + badge total | `#grid-modelos-cirurgicos`, `#badge-total-modelos` | ✅ |
| Barra de busca/filtro | `#input-busca-modelo` → `filtrarModelosCirurgicos()` | ✅ |
| Modal visualizar detalhes | `#modal-modelo-visualizar` → `visualizarModeloCirurgico(id)` | ✅ |
| Modal formulário (criar/editar) | `#modal-modelo-form` → `abrirModalFormModelo(id)` | ✅ |
| Botão "Editar" (veterinário/admin) | `#btn-vis-editar` | ✅ |
| Botão "Excluir" (admin) | `#btn-form-excluir` | ✅ |
| `salvarModeloCirurgico(e)` → POST | `servidor_web.js:1944` | ✅ |
| `excluirModeloAtual()` → DELETE | `servidor_web.js:1993` | ✅ |

### Seed (JSON → SQLite) — ⚠️ Limitação Crítica

| Item | Descrição |
|------|-----------|
| `seedModelos()` em `seed.js:65` | Importa de `modelos_cirurgicos/*.json` **SOLO quando a tabela estiver vazia** (`existente > 0` → pula) |
| Sem upsert | Não atualiza modelos existentes; apenas insere se tabela vazia |
| Sem CLI de sync | Não há forma de forçar re-sync sem apagar a tabela |
| Render (disco efêmero) | Cada redeploy = tabela vazia → seed roda OK, mas se a tabela já tem dados parciais/estale, puka |

**Causa raiz do problema:** O seed é "seed se vazio", não "sync". Se a tabela já tem 1 modelo (criado via UI ou seed parcial anterior), os outros 13 nunca entram. E se o conteúdo dos JSON mudou, o banco continua com o velho.

---

## Arquitetura Alvo

```
JSON (fonte única)              SQLite (runtime)              UI (servidor_web.js)
───────────────                 ────────────                  ──────────────────────────
modelos_cirurgicos/             modelos_cirurgicos table      Grid + Busca + Modal Ver
  ├── 14 arquivos .json    ──►  (campos: id, nome,            + Modal Editar
  │                             sinonimos, procedimento,        + Modal Excluir
  │                             diagnostico_pre_cirurgico,      (admin)
  │                             descricao_procedimento,
  │                             evolucao_consideracoes)
  └── (novos models via UI)   │
                              │
                              └──►  Sync Script (upsert:
                                    - recria modelos que existem no JSON
                                    - não apaga modelos criados via UI
                                    - mantém campos ricos inteiros)
```

---

## FASE 1 — Sincronizar JSON → SQLite (Core)

### 1.1 — Criar Script de Sync (`scripts/sync-modelos.js`)

**O que faz:**
- Lê **todos** os `.json` de `modelos_cirurgicos/`.
- Para cada arquivo, faz `UPSERT` na tabela `modelos_cirurgicos`:
  - `INSERT ... ON CONFLICT (id) DO UPDATE SET ...`
  - Atualiza `nome`, `sinonimos`, `procedimento`, `diagnostico_pre_cirurgico`, `descricao_procedimento`, `evolucao_consideracoes`.
  - **Não apaga** modelos que existem no banco mas não estão no JSON (modelos criados via UI).
- Log: quantos atualizados, quantos novos inseridos.

**Decisão:** Upsert (não delete-then-insert), para não perder modelos criados pelo usuário.

**Arquivo novo:** `scripts/sync-modelos.js`

### 1.2 — Incluir Sync no Boot (`servidor_web.js`)

No `bootServidor()`, depois de `executarSeed()`, chamar `syncModelosDoJson()` (nova função em `gerenciador_modelos.js`).

**Comportamento:**
- Chama o sync apenas se `process.env.NODE_ENV !== 'test'` (não interfere em testes).
- Log estruturado: `[sync] modelos: X atualizados, Y novos`.
- Idempotente: pode rodar a cada boot sem efeitos colaterais.

**Mudança em `servidor_web.js`:** 3-5 linhas no boot.

### 1.3 — Nova Função em `gerenciador_modelos.js`

```
function syncModelosDoJson()
  → lê pasta ./modelos_cirurgicos
  → para cada .json:
       prepare INSERT ... ON CONFLICT (id) DO UPDATE SET nome, sinonimos, procedimento, diagnostico_pre_cirurgico, descricao_procedimento, evolucao_consideracoes
  → log: { atualizados, novos, erros }
  → retorna { atualizados, novos, erros[] }
```

**Arquivo:** `gerenciador_modelos.js` (novas ~50 linhas)

### 1.4 — Remover Dependência do Seed-If-Empty

- Manter `seedModelos()` como fallback (para primeiro boot com DB novo).
- Adicionar `syncModelosDoJson()` como operação contínua.
- `seedModelos()` pode ser simplificado para apenas importar se a pasta existir e a tabela estiver vazia (sem upsert).
- `syncModelosDoJson()` lida com o upsert normal.

### 1.5 — Verificação Manual (CLI)

Comando:
```bash
node scripts/sync-modelos.js
```
Saída esperada:
```
[sync] modelos: 14 atualizados, 0 novos, 0 erros
```

---

## FASE 2 — Validar Tela de Consulta (Grid + Busca + Modal Ver)

### 2.1 — Verificar Grid

- Rodar app local (`npm start`).
- Logar com conta admin.
- Ir para aba Cirúrgico.
- Confirmar que o grid mostra **14 cards** (ou a quantidade no banco).
- Confirmar badge mostra `14 modelo(s)`.

### 2.2 — Verificar Busca/Filtro

- Digitar "piometra" → filtra para modelos com "piometra" no nome/sinônimos/descrição.
- Digitar "osh" → filtra para OSH models.
- Limpar busca → mostra todos novamente.

### 2.3 — Verificar Modal de Detalhes

- Clicar em "Ver Detalhes" em um card (ex: `osh_piometra_completa`).
- Confirmar que **todos os campos** aparecem:
  - Nome
  - Procedimento
  - Sinônimos (tags)
  - Diagnóstico Pré-Cirúrgico
  - Descrição do Procedimento (texto completo, `whitespace-pre-line`)
  - Evolução e Considerações
  - ID (ex: `osh_piometra_completa.json`)

**Criterio de aceite:** Nenhum campo vazio ou com "Não informado" quando o JSON tem o valor.

### 2.4 — Verificar Permissões

- Logar com conta admin → pode visualizar, editar, excluir.
- Logar com conta veterinária (se existir) → pode visualizar e editar, não pode excluir.

---

## FASE 3 — Validar Tela de Edição

### 3.1 — Abrir Modal de Edição

- Clicar em "Editar" no card.
- Confirmar que o formulário pré-preenche **todos** os campos corretamente:
  - Nome
  - Procedimento
  - Diagnóstico Pré-Cirúrgico
  - Sinônimos (separados por vírgula)
  - Descrição do Procedimento
  - Evolução e Considerações

### 3.2 — Editar e Salvar

- Alterar um campo (ex: adicionar um sinônimo novo, mudar 1 frase do diagnóstico).
- Clicar em "Salvar Modelo".
- Confirmar:
  - Alert de sucesso.
  - Grid se atualiza com a mudança.
  - Abrir modal novamente → valor editado persiste.

### 3.3 — Criar Novo Modelo

- Abrir modal de criação (botão "Novo Modelo" se existir, ou via modal de visualização → criar).
- Preencher campos mínimos: Nome, Procedimento, Descrição.
- Salvar → aparece no grid.
- Confirmar que o `id` foi gerado via `sanitizarId(nome)`.

### 3.4 — Excluir Modelo (Admin)

- Abrir modal de edição de um modelo.
- Clicar em "Excluir".
- Confirmar na dialog.
- Confirmar que o modelo some do grid e do banco.

**Criterio de aceite:** Exclusão só aparece para `role === 'admin'`.

### 3.5 — Testar Persistência

- Restartar o app (`npm start`).
- Confirmar que os modelos continuam lá (DB no disco local).
- Confirmar que a edição feita foi persistida.

---

## FASE 4 — Testar em Render (Disco Efêmero)

### 4.1 — Deploy

- Push `main`.
- Deploy no Render free tier.
- Logar no app em produção.

### 4.2 — Verificar

- Grid mostra 14 modelos (sync roda no boot).
- Busca funciona.
- Modal de detalhes mostra valores.
- Editar e salvar funciona.
- Restart do serviço (Render free tier restarts) → modelos continuam (sync re-aplica).

### 4.3 — Testar Restart

- Iniciar deploy ou esperar restart.
- Confirmar que o sync roda no boot (verificar logs do Render).
- Confirmar que os valores estão inteiros.

---

## FASE 5 — Melhorar Prompt da IA (Uso do Conteúdo do Modelo)

### 5.1 — Alterar Prompt em `analisador_cirurgia.js`

**Current (vago):**
> "Se o procedimento realizado corresponder a um dos modelos cadastrados... use a estrutura e o vocabulário padrão daquele modelo, adaptando e enriquecendo..."

**Target (explícito):**
> "AO IDENTIFICAR O MODELO CORRESPONDENTE NA BIBLIOTECA: COPIE O TEXTO EXATO DOS CAMPOS DIAGNÓSTICO PRÉ-CIRÚRGICO, DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO E EVOLUÇÃO E CONSIDERAÇÕES AQUELE MODELO COMO BASE DO SEU RELATÓRIO. Depois, adapte/enriqueça com os dados reais citados pelo cirurgião (nomes, fios, achados, complicações). NÃO REESCREVA DO ZERO — USE O TEXTO DO MODELO COMO PONTA DE PARTIDA."

### 5.2 — Inferência de Modelo no Backend (sem dropdown)

**Nova função:** `inferirModeloPorTexto(textoExtraido, modelos)` em `gerenciador_modelos.js`

- Recebe o texto extraído do documento/áudio (ou o campo `cirurgia.procedimento` do JSON da IA).
- Faz matching por:
  1. Exato: `texto` contém `procedimento` do modelo.
  2. Parcial: `texto` contém qualquer `sinônimo` do modelo.
  3. Score por número de sinônimos encontrados.
- Retorna `{ modelo: Modelo|null, confidence: number }`.

**Usado em:**
- `analisarCirurgiaComIA()` → recebe `modeloId` (inferido) → prompt com 1 modelo.
- `/api/cirurgia` → após IA retornar, chama `inferirModeloPorTexto(cirurgia.procedimento, modelos)`.

### 5.3 — Merge Pós-IA (Fallback)

Em `/api/cirurgia` ou em `analisarCirurgiaComIA()`:

```
resultadoIA = IA(arquivos, modeloInferido)
modeloDb = obterModeloPorId(modeloInferido.id)

if (resultadoIA.cirurgia.diagnosticoPreCirurgico == '')  modeloDb.diagnosticoPreCirurgico
if (resultadoIA.cirurgia.descricaoProcedimento == '')     modeloDb.descricaoProcedimento
if (resultadoIA.cirurgia.evolucaoConsideracoes == '')     modeloDb.evolucaoConsideracoes

→ gera documento com resultadoIA (com fallback do modelo)
```

**Criterio de aceite:** Nenhum campo vazio no relatório final se o modelo tem o valor.

---

## Checklist de Aceite (Total)

### Fase 1
- [ ] `scripts/sync-modelos.js` existe e roda via CLI
- [ ] `gerenciador_modelos.js` tem `syncModelosDoJson()`
- [ ] `servidor_web.js` boot chama o sync
- [ ] Logs mostram `[sync] modelos: X atualizados`
- [ ] 14 modelos no banco com todos os campos populados

### Fase 2
- [ ] Grid mostra 14 cards
- [ ] Busca por "piometra" filtra corretamente
- [ ] Modal de detalhes mostra todos os campos
- [ ] Nenhum campo vazio (se o JSON tem valor)

### Fase 3
- [ ] Modal de edição pré-preenche todos os campos
- [ ] Salvar atualização persiste
- [ ] Criar novo modelo aparece no grid
- [ ] Excluir (admin) remove do grid e banco

### Fase 4
- [ ] Deploy Render: grid mostra 14 modelos
- [ ] Restart: modelos continuam (sync no boot)
- [ ] Edições persistem em redeploy (se usar Key Value + Drive backup)

### Fase 5
- [ ] Prompt atualizado com instrução explícita de "copiar e adaptar"
- [ ] `inferirModeloPorTexto()` funciona
- [ ] Fallback pós-IA preenche campos vazios
- [ ] Teste manual: relatório de piometra sai com texto do modelo

---

## Arquivos a Criar / Modificar

| Arquivo | Operação | Descrição |
|---------|---------|-----------|
| `scripts/sync-modelos.js` | **Novo** | CLI de sync JSON→SQLite |
| `gerenciador_modelos.js` | **Modificar** | +`syncModelosDoJson()`, +`inferirModeloPorTexto()` |
| `servidor_web.js` (boot) | **Modificar** | Chamar sync no boot (~5 linhas) |
| `servidor_web.js` (backend `/api/cirurgia`) | **Modificar** | Inferir modelo + merge pós-IA |
| `analisador_cirurgia.js` (prompt) | **Modificar** | Instrução explícita de copiar texto do modelo |
| `analisador_cirurgia.js` (assinatura) | **Modificar** | +parâmetro `modeloId` opcional |
| `seed.js` | **Modificar (opcional)** | Simplificar: seed apenas se DB vazio, sync é o normal |

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Upsert apaga modelo criado via UI | Upsert `ON CONFLICT DO UPDATE` apenas campos do JSON; modelos sem ID no JSON não são tocados |
| Sync roda muito lento (Render free tier) | 14 modelos, ~100ms. Insignificant. |
| Prompt maior (1 modelo vs 14) | Menor. Melhor contexto. Menos tokens. |
| Match errada (IA escolhe modelo errado) | Score por sinônimos + fallback: se confiança < 0.6, envia todos os modelos (fallback atual) |
| Editar modelo via UI → sync sobrescreve | Sync só atualiza modelos que **existem no JSON**. Modelos criados via UI têm IDs diferentes dos JSON. |

---

## Sequência de Implementação (Recomendada)

1. **Fase 1** — Sync JSON→SQLite (corrige a raiz)
2. **Fase 2** — Testar tela de consulta (confirma que a UI já funciona)
3. **Fase 3** — Testar tela de edição (confirma que a UI já funciona)
4. **Fase 4** — Deploy Render (confirma em produção)
5. **Fase 5** — Melhorar prompt + inferência + fallback (corrige o problema original de "valores não aparecem no relatório")

---

*Fim do planejamento. Nada implementado.*

# PLANEJAMENTO DARK MODE — UPA PET

**Objetivo**: Implementar modo escuro (dark mode) por usuário com:
- Detecção automática da preferência do sistema (`prefers-color-scheme`)
- Toggle no menu do usuário (ícone de engrenagem no header)
- Persistência no banco SQLite (coluna `tema_preferencia` na tabela `usuarios`)
- Estratégia CSS: Tailwind `dark:` variant com `class` strategy (`<html class="dark">`)

---

## FASE 1 — Banco de Dados & Backend

### 1.1 Schema: adicionar coluna `tema_preferencia` em `usuarios`
**Arquivo**: `db.js` (const `SCHEMA`)
```sql
-- Adicionar na tabela usuarios:
tema_preferencia TEXT NOT NULL DEFAULT 'system'
  CHECK (tema_preferencia IN ('light', 'dark', 'system'))
```
- Valores: `'light'` | `'dark'` | `'system'` (padrão = segue o SO)
- Migration idempotente: `ALTER TABLE usuarios ADD COLUMN tema_preferencia ...` (executar no `getDatabase()` se não existir)

### 1.2 Endpoint GET `/api/usuario/tema`
**Arquivo**: `servidor_web.js`
- Retorna: `{ tema: 'light' | 'dark' | 'system' }`
- Requer autenticação (JWT)
- Lê de `usuarios.tema_preferencia`

### 1.3 Endpoint POST `/api/usuario/tema`
**Arquivo**: `servidor_web.js`
- Body: `{ tema: 'light' | 'dark' | 'system' }`
- Validação (zod): enum com 3 valores
- Atualiza `usuarios.tema_preferencia` + `atualizado_em`
- Retorna `{ ok: true, tema }`

---

## FASE 2 — Frontend: Detecção & Aplicação Inicial

### 2.1 Script de bootstrap (inline no `<head>` ou topo do `<body>`)
**Arquivo**: `servidor_web.js` (template HTML)
```js
(function() {
  const saved = localStorage.getItem('tema_preferencia'); // cache rápido
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  if (initial === 'dark' || (initial === 'system' && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
})();
```
- Roda **antes** do primeiro paint (evita flash)
- `localStorage` como cache temporário até buscar do servidor

### 2.2 Sincronizar com servidor após login
**Arquivo**: `servidor_web.js` (função `atualizarHeaderUsuario()` ou similar)
- Após obter `usuarioAtual`, fazer `fetch('/api/usuario/tema')`
- Aplicar tema retornado + atualizar `localStorage`
- Escutar mudança no sistema: `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` — só se `tema === 'system'`

---

## FASE 3 — UI: Toggle no Menu do Usuário (Engrenagem)

### 3.1 HTML do dropdown (em `atualizarHeaderUsuario()`)
Adicionar item no dropdown (`#dropdown-usuario`):
```html
<div class="px-3 py-2 border-b border-slate-100">
  <label class="flex items-center justify-between w-full cursor-pointer">
    <span class="text-xs font-medium text-slate-700 flex items-center space-x-2">
      <i class="fa-solid fa-moon text-slate-400"></i>
      <span>Modo escuro</span>
    </span>
    <select
      id="select-tema"
      onchange="salvarTema(this.value)"
      class="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
      aria-label="Preferência de tema"
    >
      <option value="system">Sistema (automático)</option>
      <option value="light">Claro</option>
      <option value="dark">Escuro</option>
    </select>
  </label>
</div>
```

### 3.2 JS: `salvarTema(valor)`
```js
async function salvarTema(tema) {
  try {
    const res = await fetch('/api/usuario/tema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema })
    });
    if (!res.ok) throw new Error('Falha ao salvar');
    aplicarTema(tema);
    localStorage.setItem('tema_preferencia', tema);
    fecharMenuUsuario();
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar preferência de tema');
  }
}
```

### 3.3 JS: `aplicarTema(tema)`
```js
function aplicarTema(tema) {
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = tema === 'dark' || (tema === 'system' && prefersDark);
  html.classList.toggle('dark', isDark);
  // Atualiza select se estiver aberto
  const sel = document.getElementById('select-tema');
  if (sel) sel.value = tema;
}
```

---

## FASE 4 — CSS: Adaptação de Cores (Tailwind `dark:`)

### 4.1 Estratégia: `class` strategy
**Arquivo**: `servidor_web.js` (tag `<html>` ou `<body>` no template)
```html
<html class="dark">  <!-- ou body, mas html é padrão Tailwind -->
```
- Tailwind CDN já suporta `dark:` variant com `class` strategy

### 4.2 Componentes a adaptar (lista inicial)
| Componente | Classes atuais (light) | Adicionar `dark:` |
|---|---|---|
| `body` / fundo principal | `bg-slate-50` / `bg-white` | `dark:bg-slate-900` / `dark:bg-slate-800` |
| Cards (laudos, formulários) | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Textos primários | `text-slate-800` / `text-slate-700` | `dark:text-slate-100` / `dark:text-slate-300` |
| Textos secundários | `text-slate-500` / `text-slate-400` | `dark:text-slate-400` / `dark:text-slate-500` |
| Inputs / selects | `bg-white border-slate-300` | `dark:bg-slate-700 dark:border-slate-600 dark:text-white` |
| Botões primários | `bg-sky-600 hover:bg-sky-700` | `dark:bg-sky-500 dark:hover:bg-sky-400` |
| Sombras | `shadow-sm` / `shadow-md` | `dark:shadow-black/30` (opcional) |
| Dropdown menu usuário | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Tabs (pillets) | `bg-white shadow-sm` / `bg-sky-500` | `dark:bg-slate-800` / `dark:bg-sky-500` (ativa ok) |
| Modais (layout, admin) | `bg-white` | `dark:bg-slate-800` |
| Tabelas / listas | `border-slate-200` / `bg-white` | `dark:border-slate-700 dark:bg-slate-800` |

### 4.3 Variáveis CSS customizadas (opcional, para cores do PDF/DOCX)
```css
:root {
  --cor-fundo: #f8fafc;
  --cor-card: #ffffff;
  --cor-texto: #1e293b;
  --cor-texto-muted: #64748b;
  --cor-borda: #e2e8f0;
}
.dark {
  --cor-fundo: #0f172a;
  --cor-card: #1e293b;
  --cor-texto: #f1f5f9;
  --cor-texto-muted: #94a3b8;
  --cor-borda: #334155;
}
```
- Útil se houver estilos inline ou geração de PDF que leia `getComputedStyle`

---

## FASE 5 — Testes & Validação

### 5.1 Checklist manual
- [ ] Login → tema padrão = sistema (segue SO)
- [ ] Toggle para "Escuro" → aplica imediatamente + persiste no DB
- [ ] Toggle para "Claro" → aplica imediatamente + persiste no DB
- [ ] Toggle para "Sistema" → segue `prefers-color-scheme` em tempo real
- [ ] Logout + login novo → carrega tema do banco (sem flash)
- [ ] Abrir em aba anônima / outro browser → tema independente por usuário
- [ ] Mobile: toggle funciona no menu engrenagem
- [ ] PDF/DOCX gerados **não** afetados (são server-side, usam cores fixas do layout)

### 5.2 Validação automatizada
- `node --check servidor_web.js` ✓
- `node --check db.js` ✓
- `node --check gerenciador_usuarios.js` (se houver alteração) ✓

---

## ARQUIVOS A MODIFICAR

| Arquivo | Tipo de mudança |
|---|---|
| `db.js` | Schema + migration idempotente `tema_preferencia` |
| `gerenciador_usuarios.js` | (opcional) helper `obterTemaUsuario` / `salvarTemaUsuario` |
| `servidor_web.js` | 2 endpoints API + bootstrap script + dropdown HTML + JS `salvarTema/aplicarTema` + classes `dark:` no template |
| `validation.js` | Schema zod para POST `/api/usuario/tema` |

---

## ORDEM DE EXECUÇÃO SUGERIDA

1. **FASE 1** — DB + endpoints (backend pronto)
2. **FASE 2** — Bootstrap + sincronização pós-login (tema aplica no carregamento)
3. **FASE 3** — Dropdown UI + handlers (usuário controla)
4. **FASE 4** — CSS `dark:` em todo template (visual completo)
5. **FASE 5** — Testes + commit + push

---

## NOTAS TÉCNICAS

- **Sem nova variável de ambiente** — tudo no banco por usuário
- **Tailwind CDN** já suporta `dark:` com `class` strategy (não precisa build)
- **PDF/DOCX**: geração server-side (`motor_laudo.js`, `motor_cirurgia.js`) usa cores fixas do `configuracoes_layout` — **não** lê tema do usuário (correto)
- **Flash of wrong theme**: bootstrap script no `<head>` + `localStorage` cache evita
- **Sistema operacional**: `matchMedia('(prefers-color-scheme: dark)')` funciona em todos browsers modernos (mobile + desktop)
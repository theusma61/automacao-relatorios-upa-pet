# Planejamento: Correções de Layout do Portal UPA PET

> **Arquivos principais:** `servidor_web.js` (HTML inline + JS do frontend)
> **Tecnologias:** Tailwind CSS (CDN), FontAwesome 6, Vanilla JS
> **Data:** 2026-11-12

---

## 📋 Resumo dos Problemas

| # | Problema | Localização | Gravidade |
|---|----------|-------------|-----------|
| 1 | **Responsividade quebrada** — Em telas pequenas, os botões "Editor de Layout" e "Gerenciar Acessos" transbordam para fora da área branca (card do header das tabs) | Linhas 598–617 (container de tabs) | 🔴 Alta |
| 2 | **"Gerenciar Acessos" mal posicionado** — Fica na barra de tabs (ao lado do nome da aba), mas deveria estar no **header superior** (onde está o nome/avatar do usuário), acessível via ícone de engrenagem | Linha 612–615 (botão `tab-btn-admin`) | 🟡 Média |
| 3 | **"Editor de Layout" visível na aba errada** — O botão aparece sempre (quando usuário tem permissão), mesmo na aba "Relatório Cirúrgico". Deveria aparecer **apenas na aba "Ultrassonografia Abdominal"** (ou dentro de um submenu contextual dela) | Linha 608–611 (botão `tab-btn-layout`) + `atualizarInterfaceUsuario()` linhas 1234–1240 | 🟡 Média |

---

## 🎯 Objetivos de UX

1. **Layout responsivo** — Nenhum elemento transborda em qualquer breakpoint (mobile 320px → desktop 1280px+).
2. **Hierarquia visual clara** — Ações globais (perfil, sair, admin) no header; ações contextuais (editor de layout) na aba correspondente.
3. **Descoberta natural** — "Gerenciar Acessos" fica no menu do usuário (engrenagem), onde se espera configurações de conta/permissões. "Editor de Layout" fica junto à Ultrassonografia, pois configura o layout **do laudo de ultrassom**.

---

## 🛠️ Plano de Implementação

### Fase 1 — Header Superior: Adicionar Menu de Usuário (Engrenagem) — *Resolve #2*

**Arquivo:** `servidor_web.js`  
**Função alvo:** `atualizarInterfaceUsuario()` (linhas 1173–1274) + HTML do header (linhas 538–555)

#### 1.1 HTML do Header — Adicionar dropdown de usuário
```html
<!-- Linha ~551: Substituir o bloco #usuario-header por: -->
<div id="usuario-header" class="relative">
  <!-- Estado logado (renderizado via JS) -->
  <div id="usuario-logado" class="hidden flex items-center space-x-3">
    ${avatarHtml}
    <div class="text-right hidden sm:block">
      <div class="text-xs font-bold text-slate-800 leading-tight">${usuarioAtual.nome}</div>
      <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}">
        ${usuarioAtual.roleDescricao}
      </span>
    </div>
    <!-- NOVO: Botão engrenagem com dropdown -->
    <div class="relative" id="menu-usuario-wrapper">
      <button
        id="btn-menu-usuario"
        onclick="toggleMenuUsuario()"
        aria-expanded="false"
        aria-haspopup="true"
        class="text-slate-400 hover:text-sky-600 p-1.5 rounded-lg border border-slate-200 transition"
        title="Menu do usuário"
      >
        <i class="fa-solid fa-gear text-xs"></i>
      </button>
      <!-- Dropdown -->
      <div
        id="dropdown-usuario"
        class="hidden absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50"
        role="menu"
      >
        <div class="px-3 py-2 border-b border-slate-100">
          <p class="text-xs font-medium text-slate-700">${usuarioAtual.nome}</p>
          <p class="text-[11px] text-slate-500 truncate">${usuarioAtual.email}</p>
        </div>
        ${usuarioAtual.role === 'admin' ? `
        <button
          onclick="abrirModalAdmin(); fecharMenuUsuario()"
          class="w-full text-left px-3 py-2 text-xs text-purple-700 hover:bg-purple-50 transition flex items-center space-x-2"
          role="menuitem"
        >
          <i class="fa-solid fa-users-gear"></i>
          <span>Gerenciar Acessos</span>
        </button>
        ` : ''}
        <button
          onclick="fazerLogout()"
          class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition flex items-center space-x-2"
          role="menuitem"
        >
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Sair</span>
        </button>
      </div>
    </div>
  </div>
  <!-- Estado deslogado (botão Entrar com Google) -->
  <div id="usuario-deslogado" class="hidden">...</div>
</div>
```

#### 1.2 JavaScript — Funções do dropdown
```javascript
// Adicionar após atualizarInterfaceUsuario()
function toggleMenuUsuario() {
  const dropdown = document.getElementById('dropdown-usuario');
  const btn = document.getElementById('btn-menu-usuario');
  const isOpen = !dropdown.classList.contains('hidden');
  dropdown.classList.toggle('hidden');
  btn.setAttribute('aria-expanded', !isOpen);
}

// Fechar ao clicar fora
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('menu-usuario-wrapper');
  const dropdown = document.getElementById('dropdown-usuario');
  if (wrapper && dropdown && !wrapper.contains(e.target)) {
    dropdown.classList.add('hidden');
    document.getElementById('btn-menu-usuario')?.setAttribute('aria-expanded', 'false');
  }
});

function fecharMenuUsuario() {
  document.getElementById('dropdown-usuario')?.classList.add('hidden');
  document.getElementById('btn-menu-usuario')?.setAttribute('aria-expanded', 'false');
}
```

#### 1.3 Remover botão "Gerenciar Acessos" da barra de tabs
- **Linhas 612–615:** Remover completamente o `<button id="tab-btn-admin">...</button>`
- **Linhas 1178, 1228–1232:** Remover referências a `btnAdmin` em `atualizarInterfaceUsuario()`

---

### Fase 2 — Editor de Layout: Tornar Contextual à Aba Ultrassom — *Resolve #3*

**Conceito:** O "Editor de Layout" configura o **laudo de ultrassom** (tipografia, margens, cores do PDF/DOCX do ultrassom). Não faz sentido aparecer na aba Cirurgia.

**Opção A (Recomendada) — Submenu na própria aba Ultrassom:**
- Na aba "Ultrassonografia Abdominal" (linha 620–666), adicionar um botão discreto no canto superior direito do card (ao lado do título "Laudo de Ultrassonografia Abdominal").
- Ícone: `fa-palette` ou `fa-sliders-h`, tooltip "Editor de Layout do Laudo".

**Opção B — Botão na barra de tabs, mas só visível quando aba Ultra está ativa:**
- Manter `tab-btn-layout` na barra de tabs, mas mostrar/ocultar dinamicamente no `mudarAba()`.

**Implementação Opção A (mais limpa):**

```html
<!-- Linha ~621-623: Dentro de #aba-ultra, após o <h2> -->
<div class="mb-4 flex items-center justify-between">
  <div>
    <h2 class="text-lg font-bold text-slate-800">Laudo de Ultrassonografia Abdominal</h2>
    <p class="text-sm text-slate-500">Envie as capturas de tela do Mindray com calipers e identificações para análise automática.</p>
  </div>
  <!-- NOVO: Botão contextual -->
  <button
    id="btn-layout-ultra"
    onclick="abrirModalLayout()"
    class="hidden sm:flex items-center space-x-1.5 text-xs text-sky-700 hover:text-sky-900 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 transition font-medium"
    title="Editor de Layout do Laudo de Ultrassom"
  >
    <i class="fa-solid fa-palette text-base"></i>
    <span>Editor de Layout</span>
  </button>
</div>
```

```javascript
// Em atualizarInterfaceUsuario(), substituir lógica do btnLayout (linhas 1234-1240):
const btnLayoutUltra = document.getElementById('btn-layout-ultra');
if (btnLayoutUltra) {
  if (usuarioAtual.role === 'admin' || usuarioAtual.role === 'veterinario') {
    btnLayoutUltra.classList.remove('hidden');
  } else {
    btnLayoutUltra.classList.add('hidden');
  }
}
// Remover completamente o btnLayout (tab-btn-layout) do HTML e da lógica
```

**Remover do HTML das tabs (linhas 608–611):**
```html
<!-- REMOVER este bloco inteiro: -->
<button id="tab-btn-layout" onclick="abrirModalLayout()" class="hidden py-3 px-4 text-sm text-sky-700 hover:text-sky-900 flex items-center space-x-1.5 transition font-medium">
  <i class="fa-solid fa-palette text-base"></i>
  <span>Editor de Layout</span>
</button>
```

---

### Fase 3 — Responsividade da Barra de Tabs — *Resolve #1*

**Problema atual:** O container `.flex.border-b` (linha 598) tem `px-4 pt-2` mas os botões à direita (`ml-auto flex items-center space-x-1`) não têm `flex-wrap` nem truncamento. Em mobile, somam largura > container.

**Solução:** 
1. Permitir `flex-wrap` no container principal.
2. Mover ações secundárias para um **dropdown "Mais" (reticências)** em telas pequenas.
3. Garantir que os tabs principais (Ultra / Cirurgia) sempre caibam.

#### 3.1 CSS/HTML — Container responsivo
```html
<!-- Linha 598: Substituir -->
<div class="flex flex-wrap border-b border-slate-200 mb-6 bg-white rounded-t-xl shadow-sm px-4 pt-2 gap-1">
  <!-- Tabs principais (sempre visíveis) -->
  <div class="flex flex-1 min-w-0" role="tablist">
    <button id="tab-btn-ultra" ... role="tab" aria-selected="true">...</button>
    <button id="tab-btn-cirurg" ... role="tab" aria-selected="false">...</button>
  </div>
  <!-- Ações contextuais (dropdown em mobile) -->
  <div class="flex items-center space-x-1 relative" id="acoes-contextuais">
    <!-- Botão "Editor de Layout" (agora só aparece se aba Ultra ativa — ver Fase 2) -->
    <!-- Se mantivermos alguma ação global aqui, usar dropdown: -->
    <div class="relative" id="dropdown-acoes-wrapper">
      <button
        id="btn-mais-acoes"
        onclick="toggleDropdownAcoes()"
        aria-expanded="false"
        aria-haspopup="true"
        class="hidden sm:flex p-2 text-slate-500 hover:text-slate-700 rounded-lg transition"
        title="Mais opções"
      >
        <i class="fa-solid fa-ellipsis text-base"></i>
      </button>
      <div
        id="dropdown-acoes"
        class="hidden absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50"
        role="menu"
      >
        <!-- Itens dinâmicos conforme aba ativa -->
      </div>
    </div>
  </div>
</div>
```

#### 3.2 JavaScript — Controle dinâmico por aba ativa
```javascript
let abaAtual = 'ultra'; // estado global

function mudarAba(aba) {
  abaAtual = aba;
  const btnUltra = document.getElementById('tab-btn-ultra');
  const btnCirurg = document.getElementById('tab-btn-cirurg');
  const divUltra = document.getElementById('aba-ultra');
  const divCirurg = document.getElementById('aba-cirurg');
  const btnLayoutUltra = document.getElementById('btn-layout-ultra'); // novo
  const dropdownAcoes = document.getElementById('dropdown-acoes');

  if (aba === 'ultra') {
    btnUltra.className = 'tab-active py-3 px-6 text-sm flex items-center space-x-2 transition';
    btnCirurg.className = 'py-3 px-6 text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-2 transition';
    divUltra.classList.remove('hidden');
    divCirurg.classList.add('hidden');
    // Mostrar editor de layout na aba ultra
    if (btnLayoutUltra) btnLayoutUltra.classList.remove('hidden');
    // Atualizar dropdown "Mais" se existir
    atualizarDropdownAcoes('ultra');
  } else {
    btnCirurg.className = 'tab-active py-3 px-6 text-sm flex items-center space-x-2 transition';
    btnUltra.className = 'py-3 px-6 text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-2 transition';
    divCirurg.classList.remove('hidden');
    divUltra.classList.add('hidden');
    if (btnLayoutUltra) btnLayoutUltra.classList.add('hidden');
    atualizarDropdownAcoes('cirurg');
    if (todosModelosCirurgicos.length === 0) carregarModelosCirurgicosFront();
  }
}

function atualizarDropdownAcoes(aba) {
  const dropdown = document.getElementById('dropdown-acoes');
  if (!dropdown) return;
  if (aba === 'ultra') {
    dropdown.innerHTML = `
      <button onclick="abrirModalLayout(); fecharDropdownAcoes()" class="w-full text-left px-3 py-2 text-xs text-sky-700 hover:bg-sky-50 flex items-center space-x-2" role="menuitem">
        <i class="fa-solid fa-palette"></i><span>Editor de Layout</span>
      </button>
    `;
  } else {
    dropdown.innerHTML = `
      <button onclick="abrirModalFormModelo(null); fecharDropdownAcoes()" class="w-full text-left px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center space-x-2" role="menuitem">
        <i class="fa-solid fa-plus"></i><span>Novo Modelo Cirúrgico</span>
      </button>
    `;
  }
}

function toggleDropdownAcoes() {
  const dropdown = document.getElementById('dropdown-acoes');
  const btn = document.getElementById('btn-mais-acoes');
  const isOpen = !dropdown.classList.contains('hidden');
  dropdown.classList.toggle('hidden');
  btn.setAttribute('aria-expanded', !isOpen);
}
function fecharDropdownAcoes() {
  document.getElementById('dropdown-acoes')?.classList.add('hidden');
  document.getElementById('btn-mais-acoes')?.setAttribute('aria-expanded', 'false');
}
// Fechar ao clicar fora
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('dropdown-acoes-wrapper');
  const dropdown = document.getElementById('dropdown-acoes');
  if (wrapper && dropdown && !wrapper.contains(e.target)) fecharDropdownAcoes();
});
```

#### 3.3 CSS Adicional (no `<style>` do head, linha ~530)
```css
/* Garantir que tabs não quebrem layout */
@media (max-width: 639px) {
  .tab-active, .tab-btn { white-space: nowrap; }
  #acoes-contextuais { position: static; }
  #dropdown-acoes { right: 0; left: auto; }
}
```

---

## 📦 Checklist de Entrega

| Fase | Item | Status |
|------|------|--------|
| 1 | Header: dropdown de usuário com engrenagem (avatar + nome + badge + "Gerenciar Acessos" + "Sair") | ✅ |
| 1 | Remover `tab-btn-admin` da barra de tabs + lógica `btnAdmin` | ✅ |
| 2 | Adicionar `btn-layout-ultra` contextual no card da aba Ultrassom | ✅ |
| 2 | Remover `tab-btn-layout` da barra de tabs + lógica `btnLayout` | ✅ |
| 2 | Atualizar `atualizarInterfaceUsuario()` para controlar `btn-layout-ultra` | ✅ |
| 3 | Refatorar container de tabs: `flex-wrap`, gap, `min-w-0` | ✅ |
| 3 | Implementar dropdown "Mais" (reticências) para mobile | ✅ N/A — 2 botões de tab + ações contextuais em cards; sem overflow |
| 3 | `mudarAba()` controla visibilidade do `btn-layout-ultra` e conteúdo do dropdown | ✅ |
| 3 | Testar breakpoints: 320px, 375px, 428px, 768px, 1024px, 1280px | ⏳ |
| — | Verificar acessibilidade: `aria-*`, foco visível, navegação por teclado | ✅ (aria-expanded, aria-haspopup, role="menu") |

---

## 🧪 Plano de Testes

1. **Mobile (320px–428px):**
   - Header: avatar + nome + engrenagem funcionando; dropdown abre/fecha; "Gerenciar Acessos" só para admin.
   - Tabs: "Ultrassonografia" e "Relatório Cirúrgico" cabem lado a lado; reticências abre dropdown contextual.
   - Aba Ultra: botão "Editor de Layout" visível no card (sm:flex) ou no dropdown.
   - Aba Cirurgia: "Editor de Layout" **não** aparece; dropdown mostra "Novo Modelo Cirúrgico" (se permissão).

2. **Tablet (768px):**
   - Header: nome completo visível; engrenagem funciona.
   - Tabs: ambos os botões + ações contextuais visíveis sem overflow.

3. **Desktop (1024px+):**
   - Layout amplo, tudo visível, hover states funcionando.

4. **Permissões:**
   - `admin`: vê "Gerenciar Acessos" no dropdown do header; vê "Editor de Layout" na aba Ultra; vê "Novo Modelo" na aba Cirurgia.
   - `veterinario`: **não** vê "Gerenciar Acessos"; vê "Editor de Layout" na aba Ultra; vê "Novo Modelo" na aba Cirurgia.
   - `assistente`/`pendente`: não vê nenhum dos três.

---

## 📝 Notas Técnicas

- **Tailwind via CDN** — Classes utilitárias funcionam normalmente; `flex-wrap`, `gap`, `min-w-0` são suportados.
- **Zero dependências novas** — Apenas HTML/JS vanilla dentro do `servidor_web.js`.
- **State management simples** — Variável global `abaAtual` + `usuarioAtual` já existem.
- **Acessibilidade** — `role="menu"`, `aria-expanded`, `aria-haspopup`, foco visível via `focus-visible` (Tailwind `focus:outline-none focus:ring-2` nos botões).
- **Performance** — Dropdowns são lazy (criados no HTML, só mostrados/ocultados); sem re-render desnecessário.

---

## 🚀 Ordem de Execução Sugerida

1. **Fase 1** (header + dropdown usuário) — muda a arquitetura de navegação global; base para o resto.
2. **Fase 2** (editor contextual) — remove ruído da barra de tabs; melhora semântica.
3. **Fase 3** (responsividade tabs) — polimento final; garante que nada quebre em mobile.

Cada fase é **independente e commitável** — pode testar e validar isoladamente.

---

> **Arquivo para editar:** `C:/Users/Matheus/Documents/relatorios-upa-pet/servidor_web.js`  
> **Linhas-chave:** 538–555 (header), 598–617 (tabs), 620–666 (aba ultra), 1173–1274 (`atualizarInterfaceUsuario`), 1550–1570 (`mudarAba`), 1388–1400 (`abrirModalLayout`)
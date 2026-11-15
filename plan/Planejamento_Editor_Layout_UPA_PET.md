# Planejamento Técnico - Editor de Modelos e Layout (UPA PET)

## Objetivo

Implementar um Editor de Modelos e Layout no portal web da UPA PET, permitindo que usuários autorizados (ex.: Dra. Camila) personalizem margens, espaçamentos, tipografia e estilos visuais diretamente pela interface administrativa.

As configurações definidas deverão ser aplicadas automaticamente na geração futura de relatórios em PDF e Word (.docx), eliminando a necessidade de alterações manuais em código.

---

# 1. Arquitetura de Dados (SQLite)

Para persistir as preferências de layout de forma centralizada e editável, será criada uma nova tabela no banco SQLite (`upa_pet.db`) chamada `configuracoes_layout`.

## Schema da Tabela

```sql
CREATE TABLE IF NOT EXISTS configuracoes_layout (
  id TEXT PRIMARY KEY DEFAULT 'padrao',
  font_family TEXT DEFAULT 'Calibri, sans-serif',
  font_size_body TEXT DEFAULT '11pt',
  font_size_titulo TEXT DEFAULT '14pt',
  margin_top TEXT DEFAULT '20mm',
  margin_bottom TEXT DEFAULT '20mm',
  margin_left TEXT DEFAULT '15mm',
  margin_right TEXT DEFAULT '15mm',
  line_height TEXT DEFAULT '1.4',
  paragraph_spacing TEXT DEFAULT '8pt',
  cor_primaria TEXT DEFAULT '#1B365D',
  cor_secundaria TEXT DEFAULT '#4A777A',
  atualizado_em TEXT DEFAULT (datetime('now'))
);
```

### Observação

Um registro padrão deverá ser inserido durante o processo de seed/migração para garantir que o sistema sempre possua configurações válidas, mesmo quando nenhuma alteração tiver sido realizada pelo usuário.

---

# 2. Camada Backend (API REST em Node.js)

Criar os endpoints responsáveis pela leitura e atualização das configurações.

## Endpoints

### GET /api/layout-config

**Responsabilidade:**
- Retornar a configuração atual de layout em formato JSON.

**Regras:**
- Exigir autenticação.
- Permitir acesso para perfis `admin` e `veterinario`.

### PUT /api/layout-config

**Responsabilidade:**
- Receber e persistir alterações realizadas pelo usuário.

**Regras:**
- Validar payload utilizando Zod (`validation.js`).
- Atualizar a tabela `configuracoes_layout`.
- Registrar auditoria via `logger.info` contendo:
  - usuário responsável;
  - data/hora da alteração;
  - campos modificados.

### Estrutura Recomendada

Criar módulo dedicado:

```text
gerenciador_layout.js
```

Funções:

```javascript
obterLayout();
salvarLayout(layout);
```

---

# 3. Adaptação dos Motores de Geração

Os motores de geração devem deixar de utilizar valores fixos (hardcoded) e passar a consumir as configurações armazenadas no SQLite.

## PDF (gerar_html.js / Puppeteer)

### Alterações

Consultar as configurações via `getDatabase()` e injetar CSS dinâmico no HTML.

### Exemplo

```html
<style>
@page {
  margin: 20mm 15mm 20mm 15mm;
}

body {
  font-family: Calibri, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
}

h1, h2, h3 {
  color: #1B365D;
}
</style>
```

### Benefícios

- Ajuste imediato dos relatórios futuros.
- Nenhuma alteração de código necessária para mudanças visuais.
- Padronização institucional centralizada.

## Word (gerar_docx.js)

### Alterações

Aplicar as configurações recuperadas do banco nos estilos do documento:

```javascript
spacing: {
  line: config.line_height,
  after: config.paragraph_spacing
}
```

Também configurar dinamicamente:

- margens da página;
- fonte padrão;
- tamanho da fonte do corpo;
- tamanho dos títulos;
- espaçamento entre parágrafos.

---

# 4. Interface Web (Frontend Administrativo)

Adicionar uma nova seção no painel administrativo para gerenciamento de layout.

## Componentes do Editor

### Tipografia

Controles:

- Família da fonte:
  - Calibri
  - Arial
  - Times New Roman
- Tamanho do texto principal.
- Tamanho dos títulos.

### Espaçamentos e Margens

Campos numéricos para:

- Margem superior.
- Margem inferior.
- Margem esquerda.
- Margem direita.
- Espaçamento entre linhas.
- Espaçamento entre parágrafos.

### Paleta de Cores

Seletores de cor para:

- Cor primária institucional.
- Cor secundária.
- Realces e destaques.

### Preview em Tempo Real

Exibir uma prévia de um laudo fictício formatado dinamicamente.

A cada alteração:

- atualizar tipografia;
- atualizar cores;
- atualizar margens e espaçamentos;
- refletir imediatamente as mudanças na área de visualização.

### Botões de Ação

#### Salvar Alterações no Layout

Função:

- Enviar os dados para `PUT /api/layout-config`.

#### Restaurar Padrão Institucional UPA PET

Função:

- Reaplicar os valores originais definidos na seed do sistema.

---

# 5. Roadmap de Implementação

## Fase 1 - Banco de Dados e API

### Objetivos

- Atualizar `db.js`.
- Criar tabela `configuracoes_layout`.
- Inserir registro padrão.
- Implementar `gerenciador_layout.js`.
- Criar endpoints:
  - GET `/api/layout-config`
  - PUT `/api/layout-config`
- Aplicar validações com Zod.
- Aplicar RBAC.

### Entregável

API funcional consumindo e persistindo as configurações.

---

## Fase 2 - Motores de Relatório

### Objetivos

Atualizar:

- `gerar_html.js`
- `gerar_html_lua.js`
- `gerar_docx.js`

Substituir valores hardcoded por leitura dinâmica do SQLite.

### Entregável

PDF e DOCX respeitando automaticamente as configurações personalizadas.

---

## Fase 3 - Frontend

### Objetivos

Desenvolver a interface administrativa contendo:

- tipografia;
- margens;
- espaçamentos;
- paleta de cores;
- preview em tempo real;
- salvamento via API.

### Entregável

Editor completo integrado ao backend.

---

## Fase 4 - Testes e Validação

### Cenários de Teste

1. Alterar margens pelo painel.
2. Gerar novo PDF.
3. Validar aplicação correta.
4. Gerar novo DOCX.
5. Validar aplicação correta.
6. Restaurar padrão institucional.
7. Confirmar retorno aos valores originais.

### Critérios de Aceite

- PDF reflete integralmente as configurações salvas.
- DOCX reflete integralmente as configurações salvas.
- Preview reproduz fielmente o resultado esperado.
- Alterações persistem após reinicialização do sistema.
- Auditoria registra todas as modificações realizadas.

---

# Resultado Esperado

Ao final da implementação, a equipe da UPA PET poderá administrar completamente a aparência dos laudos diretamente pelo painel web, sem necessidade de alterações em código-fonte.

As configurações passarão a ser centralizadas no banco de dados e aplicadas automaticamente a todos os novos relatórios PDF e DOCX gerados pelo sistema.

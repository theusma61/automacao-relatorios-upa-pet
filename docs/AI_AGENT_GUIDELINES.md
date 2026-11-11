# 🤖 Guia de Engenharia para Agentes de IA e Desenvolvedores

> **Atenção Agente de IA (Antigravity, Claude, ChatGPT, Cursor, etc.):**  
> Leia este documento com prioridade máxima antes de planejar ou executar qualquer modificação no código-fonte. Este guia contém as invariantes pétreas e os padrões operacionais que protegem a integridade do sistema da UPA PET.

---

## 1. As 5 Regras Pétreas (Invariantes Absolutos)

Estas regras **JAMAIS** devem ser relaxadas, ignoradas ou alteradas sem autorização explícita do usuário:

### 1ª Regra: A Regra da Página Única (Laudo Textual e Cirurgia)
- O **laudo textual de ultrassom** e o **relatório cirúrgico** devem caber **estritamente em 1 página A4**.
- A assinatura da Dra. Camila Bastos (`CRMV/MG: 22904`) e o rodapé legal devem ficar no final da **Página 1**.
- As imagens de ultrassom (anexo) ou a foto intraoperatória (cirurgia) começam **obrigatoriamente a partir da Página 2**.
- **Como manter:** Ao ajustar tamanhos de fonte, espaçamentos ou adicionar campos, sempre valide que a compilação do PDF resulta em exatamente 1 página de texto antes do mosaico fotográfico.

### 2ª Regra: A Ordem Canônica Anatômica de 1 a 20
- A sequência de órgãos e a ordenação das fotos no anexo **devem seguir estritamente a prioridade canônica**:
  `1. BEXIGA -> 2. RIM ESQUERDO -> 3. RIM DIREITO -> 4. BAÇO -> 5. ESTÔMAGO -> 6. FÍGADO -> 7. VESÍCULA BILIAR -> 8. DUODENO -> 9. JEJUNO -> 10. CÓLON -> 11. OVÁRIOS -> 12. ÚTERO -> 13. TESTÍCULO ESQ -> 14. TESTÍCULO DIR -> 15. PRÓSTATA -> 16. ADRENAL ESQ -> 17. ADRENAL DIR -> 18. PÂNCREAS -> 19. CAVIDADE -> 20. CONSIDERAÇÕES`.
- Nunca reordene aleatoriamente os órgãos com base na ordem em que aparecem no upload de imagens. A ordem canônica é mandatória para a leitura médica veterinária.

### 3ª Regra: Identidade Institucional e Validade Médica
- Todos os documentos gerados devem manter o cabeçalho oficial com o logotipo da UPA PET (`assets/logo_upa_pet_oficial.png` ou `logo_upa_pet.png`).
- O nome e registro profissional da Dra. Camila Bastos (`Dra. Camila Bastos - CRMV/MG: 22904`) devem estar presentes em todas as assinaturas oficiais.

### 4ª Regra: Valores de Corte e Diagnósticos Diferenciais (`DIAG DIF.:`)
- Valores métricos de parede e parênquima possuem critérios diagnósticos específicos:
  - Bexiga felina normal até 0,15 cm; Bexiga canina normal até 0,25 cm.
  - Vesícula biliar normal até 0,10 cm.
- Havendo alteração clínica, a inclusão do bloco `DIAG DIF.:` é obrigatória, em caixa alta, respeitando o vocabulário médico estabelecido no [BUSINESS_RULES.md](./BUSINESS_RULES.md).

### 5ª Regra: Proteção RBAC e Segurança de Emissão
- Contas de acesso pendente (`pendente`) ou de suporte (`assistente`) **NÃO PODEM** ter permissão para gerar documentos oficiais (`/api/ultrassom`, `/api/cirurgia`) ou alterar modelos institucionais.
- Somente contas `admin` e `veterinario` podem acionar os motores de IA e salvar modelos.

---

## 2. Playbooks de Extensão (Como Implementar Novas Features)

### 2.1. Como Adicionar um Novo Modelo Cirúrgico
Os modelos podem ser adicionados diretamente pela interface web (botão *"+ Novo Modelo Cirúrgico"*) ou via arquivo JSON no repositório:
1. Crie um arquivo em `modelos_cirurgicos/<slug_do_modelo>.json`.
2. Siga o esquema padronizado:
   ```json
   {
     "id": "nome_do_procedimento",
     "nome": "Nome Institucional de Exibição",
     "sinonimos": ["palavra1", "palavra2", "sinonimo"],
     "procedimento": "Título Oficial do Procedimento",
     "diagnosticoPreCirurgico": "Indicação padrão",
     "descricaoProcedimento": "Técnica, antissepsia, incisão, hemostasia e síntese...",
     "evolucaoConsideracoes": "Pós-operatório..."
   }
   ```
3. O `gerenciador_modelos.js` carrega a pasta dinamicamente a cada execução. Não é necessário reiniciar o servidor.

### 2.2. Como Adicionar um Novo Órgão ou Regra de Ultrassom
1. Abra `analisador_ia.js`.
2. Localize o prompt do sistema na função `analisarExameComIA`.
3. Adicione as instruções de interpretação métrica e a lista de `DIAG DIF.:` correspondentes.
4. Se houver nova sigla do aparelho Mindray, adicione-a na tabela de correspondência e no array de prioridades de 1 a 20.
5. Em `motor_laudo.js` e `gerar_docx.js`, certifique-se de que a formatação e as quebras de linha (`<br>` no HTML e `break: 1` no DOCX) tratem adequadamente o novo órgão.

### 2.3. Como Migrar de Arquivos JSON para um Banco de Dados SQL
Atualmente, `usuarios.json` e `modelos_cirurgicos/*.json` residem no filesystem local. Para migrar para PostgreSQL/Prisma/Supabase:
1. Preserve exatamente as assinaturas das funções nos módulos de fachada:
   - `gerenciador_usuarios.js`: Mantenha `obterPerfilUsuario`, `temPermissao`, `listarUsuarios`, `atualizarCargoUsuario`.
   - `gerenciador_modelos.js`: Mantenha `carregarModelosCirurgicos`, `obterModeloPorId`, `salvarOuCriarModelo`, `excluirModelo`.
2. Ao manter as mesmas assinaturas e retornos, `servidor_web.js`, `analisador_cirurgia.js` e o frontend funcionarão perfeitamente sem necessidade de reescrita da camada de aplicação.

---

## 3. Armadilhas Comuns e Como Evitá-las (Gotchas)

### ⚠️ Gotcha 1: Escaping em Template Literals no `servidor_web.js`
O frontend é renderizado em `servidor_web.js` através de uma grande template literal: `res.send(\`<!DOCTYPE html> ... \`);`.
- **O Risco:** Se você escrever `${variavel}` dentro do código JavaScript do navegador sem escapar, o Node.js tentará avaliar a variável no **servidor**, onde ela não existe (gerando `ReferenceError` ou renderizando `undefined`).
- **A Solução:** Qualquer interpolação destinada ao navegador DEVE ser escrita com contra-barra: `\${variavel}`.
- O mesmo vale para crases aninhadas dentro do JavaScript do navegador: utilize `\`` ao invés de crase crua.

### ⚠️ Gotcha 2: Unidades de Medida de Espaçamento no DOCX vs CSS
- No CSS (`motor_laudo.js`), usamos pixels (`px`) ou pontos (`pt`). A margem entre órgãos é definida como:
  ```css
  .content p { margin: 0 0 9px 0; }
  .content p:last-child { margin-bottom: 0; }
  ```
- No Word (`gerar_docx.js`), as medidas de espaçamento da biblioteca `docx` são expressas em **twips** (1/20 de ponto):
  ```javascript
  spacing: { after: 150 } // 150 twips = 7.5pt (espaço visível e proporcional)
  ```
  *Nunca coloque valores como `50` (que resulta em apenas 2.5pt e deixa o texto colado) nem acima de `220` (que pode empurrar a assinatura para a página 2).*

### ⚠️ Gotcha 3: Puppeteer em Containers Linux (Render)
Containers no Render rodam como usuário sem privilégios root.
- O Puppeteer **deve** ser iniciado com as flags:
  `['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']`.
- Não remova o script `"postinstall": "npx puppeteer browsers install chrome"` do `package.json`, caso contrário o container não terá o binário do Chromium para compilar PDFs.

### ⚠️ Gotcha 4: Limpeza de Arquivos no `finally`
Tanto `/api/ultrassom` quanto `/api/cirurgia` recebem uploads do usuário via Multer.
- Sempre certifique-se de que os arquivos de upload temporários sejam excluídos (`fs.unlinkSync`) dentro de um bloco `finally`.
- Caso contrário, discos temporários de servidores em nuvem podem esgotar o armazenamento após centenas de requisições.

---

## 4. Checklist de Verificação Pré-Commit

Antes de finalizar qualquer alteração e executar `git commit`:

1. [ ] **Verificação de Sintaxe Node:**
   ```bash
   node -c servidor_web.js
   node -c motor_laudo.js
   node -c motor_cirurgia.js
   node -c gerenciador_modelos.js
   node -c gerenciador_usuarios.js
   ```
2. [ ] **Garantia de 1 Página no PDF:**
   - Execute um teste gerando um PDF com 12 órgãos.
   - Verifique se a contagem de páginas do PDF textual é exatamente `1`.
3. [ ] **Verificação de Quebra no DOCX:**
   - Abra o `.docx` gerado e confirme que os tópicos possuem espaçamento harmonioso (`spacing.after = 150`) e que a assinatura permanece na Página 1.
4. [ ] **Verificação de Segurança RBAC:**
   - Certifique-se de que endpoints sensíveis continuam protegidos por `exigirPermissao(...)`.
5. [ ] **Git Status Limpo:**
   - Garanta que nenhum arquivo temporário (`.tmp`, `test_*.js`, PDFs de teste avulsos) foi incluído no commit.

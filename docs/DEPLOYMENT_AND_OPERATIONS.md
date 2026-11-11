# 🚀 Guia de Implantação e Operação (DevOps)

Este documento orienta a configuração, implantação contínua (CI/CD) e operação do sistema tanto no ambiente de nuvem (**Render.com**) quanto em ambiente local (**Windows Desktop com Google Drive**).

---

## 1. Implantação na Nuvem (Render.com)

O sistema está configurado para deploy automático como um **Web Service** no [Render](https://render.com).

### 1.1. Configuração do Serviço no Render
- **Tipo de Serviço:** Web Service
- **Ambiente:** `Node`
- **Branch Monitorada:** `main`
- **Build Command:** `npm install`  
  *(Nota: O script `"postinstall": "npx puppeteer browsers install chrome"` no `package.json` garante o download automático do Chrome para a compilação de PDFs no Linux).*
- **Start Command:** `npm run start:web` *(ou `node servidor_web.js`)*
- **Plano:** Free ou Starter.

### 1.2. Variáveis de Ambiente (Environment Variables)
No painel do Render, configure as seguintes variáveis na aba **Environment**:

| Variável | Obrigatória | Descrição | Exemplo de Valor |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Sim** | Chave de API do Google Gemini (gerada no Google AI Studio). | `AIzaSy...` |
| `GOOGLE_CLIENT_ID` | **Sim** | Client ID OAuth 2.0 do Google Cloud Console para o SSO. | `123456789-abc.apps.googleusercontent.com` |
| `JWT_SECRET` | Recomendada | Chave secreta para assinar os tokens de sessão JWT dos cookies. | `uma_chave_longa_e_segura_upa_pet_2026` |
| `NODE_ENV` | Recomendada | Modo de execução do Node.js. | `production` |
| `PORT` | Automática | Porta HTTP do container. O Render injeta automaticamente (`10000`). | *(Gerenciado pelo Render)* |

---

## 2. Configuração do Google SSO no Google Cloud Console

Para que o botão "Entrar com o Google" funcione corretamente no domínio de produção e em localhost:

1. Acesse o **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Vá em **APIs e Serviços** > **Credenciais**.
3. Crie ou edite o **ID do cliente OAuth 2.0** (Tipo: *Aplicativo Web*).
4. Em **Origens JavaScript autorizadas**, adicione:
   - URL de Produção: `https://automacao-relatorios-upa-pet.onrender.com`
   - URL Local (Desenvolvimento): `http://localhost:3000` e `http://localhost:3999`
5. Em **URIs de redirecionamento autorizados**, adicione as mesmas URLs acima.
6. Copie o **ID do cliente** (Client ID) e cole na variável de ambiente `GOOGLE_CLIENT_ID` no Render (e no `config.json` local).

---

## 3. Operação Local no Windows (Google Drive Daemon)

Para clínicas onde o aparelho de ultrassom descarrega as fotos em uma pasta sincronizada com o **Google Drive para Computador**:

### 3.1. Requisitos
- Windows 10 ou 11 com **Microsoft Edge** instalado.
- **Node.js LTS (v18+)** instalado e adicionado ao `PATH`.
- **Google Drive para Computador** com login ativo (geralmente mapeado na unidade `G:\`).

### 3.2. Configuração do `config.json`
Crie ou edite o arquivo `config.json` na raiz do projeto:
```json
{
  "pastaMonitorada": "G:\\Meu Drive\\Exames_Monitorados",
  "geminiApiKey": "SUA_CHAVE_GEMINI_AQUI",
  "googleClientId": "SEU_CLIENT_ID_GOOGLE_AQUI"
}
```

### 3.3. Inicialização com Auto-Recuperação
Execute o arquivo batch **`INICIAR_MONITOR_LAUDOS.bat`**:
- O batch monitora o processo `node monitor_exames.js`.
- Se houver oscilação de internet ou interrupção do processo, ele aguarda 3 segundos e **reinicia o serviço automaticamente**.
- **Dica de Inicialização Automática com o Windows:**
  - Pressione `Win + R`, digite `shell:startup` e pressione Enter.
  - Cole um atalho do arquivo `INICIAR_MONITOR_LAUDOS.bat` dentro da pasta que se abriu.
  - O robô iniciará silenciosamente sempre que o computador for ligado.

---

## 4. Implantação em Container Docker

O repositório inclui um `Dockerfile` pronto para execução em containers Docker ou Kubernetes:

### Build da Imagem:
```bash
docker build -t upa-pet-automacao .
```

### Execução do Container:
```bash
docker run -d \
  -p 3000:3000 \
  -e GEMINI_API_KEY="SUA_CHAVE_AQUI" \
  -e GOOGLE_CLIENT_ID="SEU_CLIENT_ID_AQUI" \
  -e JWT_SECRET="chave_secreta" \
  --name upa-pet-app \
  upa-pet-automacao
```

---

## 5. Pipeline de CI/CD (GitHub para Render)

O fluxo de atualização é 100% automatizado:
1. O desenvolvedor realiza commits e envia para o GitHub:
   ```bash
   git push origin main
   ```
2. O webhook do Render detecta a atualização na branch `main`.
3. O Render executa `npm install` (que aciona o `postinstall` baixando o Chrome).
4. O novo container sobe sem tempo de inatividade (*Zero-Downtime Deployment*).
5. Se o build falhar por qualquer razão, a versão anterior continua no ar automaticamente.

---

## 6. Monitoramento e Resolução de Problemas

### Endpoint de Healthcheck:
- URL: `GET /health`
- Resposta esperada: `{"status":"ok","service":"UPA PET Automacao","uptime":1234.56}`
- Pode ser cadastrado em serviços gratuitos de monitoramento como **UptimeRobot** ou **BetterUptime** para manter o serviço do Render aquecido (evitando a hibernação da camada gratuita após 15 minutos de inatividade).

### Diagnóstico de Erros Comuns:
- **`Could not find Chrome` (no Linux/Render):**  
  O script `compilador_pdf.js` possui auto-cura e tenta baixar o Chrome em tempo de execução. Certifique-se de que o script `postinstall` no `package.json` está presente.
- **`Chave da API Gemini não configurada`:**  
  Verifique se `GEMINI_API_KEY` foi preenchida nas configurações de ambiente do Render e clique em *Manual Deploy > Clear build cache & deploy*.
- **`Acesso restrito: Sua conta não possui permissão`:**  
  Novas contas entram como `pendente`. Acesse com a conta de administrador (`camilabastos@upapet.com.br` ou `matheusteteu00123@gmail.com`), clique na aba roxa **"Gerenciar Acessos"** no topo direito e promova a conta para `veterinario` ou `admin`.

---

*Para orientações sobre boas práticas de codificação e evolução assistida por IA, veja [AI_AGENT_GUIDELINES.md](./AI_AGENT_GUIDELINES.md).*

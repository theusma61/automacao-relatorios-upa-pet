FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# 1. Otimiza APT para conexões de VPS e instala utilitários essenciais e fontes
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::Timeout "45";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::Pipeline-Depth "0";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::No-Cache "true";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::ForceIPv4 "true";' >> /etc/apt/apt.conf.d/80-retries \
    && apt-get update && apt-get install -y --no-install-recommends --fix-missing \
        wget \
        gnupg \
        openssl \
        ca-certificates \
        poppler-utils \
        fonts-liberation \
        fonts-crosextra-carlito \
    && rm -rf /var/lib/apt/lists/*

# 2. Instala o Google Chrome oficial via CDN de alta velocidade do Google (baixa em segundos, sem os 180+ pacotes pesados do Debian)
RUN ARCH=$(dpkg --print-architecture) \
    && if [ "$ARCH" = "amd64" ]; then \
        wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
        && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
        && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
        && ln -sf /usr/bin/google-chrome-stable /usr/bin/chromium \
        && ln -sf /usr/bin/google-chrome-stable /usr/bin/google-chrome; \
    else \
        apt-get update && apt-get install -y --no-install-recommends chromium; \
    fi \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV CHROME_BIN=/usr/bin/google-chrome \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome \
    NODE_OPTIONS="--max-old-space-size=2048" \
    PORT=3000

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
RUN npx prisma generate

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --include=dev --no-audit --no-fund

COPY . .
RUN cd frontend && npm run build && rm -rf node_modules

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/ensure-schema.js && node servidor_web.js"]

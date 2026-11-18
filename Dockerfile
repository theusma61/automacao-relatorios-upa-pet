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

# 2. Instala o Google Chrome oficial via HTTPS direto (com retomada automática e persistente)
RUN ARCH=$(dpkg --print-architecture) \
    && if [ "$ARCH" = "amd64" ]; then \
        sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
        && sed -i 's|http://|https://|g' /etc/apt/sources.list 2>/dev/null || true \
        && for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
            wget -4 --no-check-certificate -c --timeout=20 -t 1 --progress=dot:giga https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb && break || { \
                echo "Conexão oscilou. Retomando download de onde parou em 2s (tentativa $i de 15)..."; \
                sleep 2; \
            }; \
        done \
        && test -s /tmp/chrome.deb \
        && apt-get update \
        && apt-get install -y --no-install-recommends /tmp/chrome.deb \
        && rm -f /tmp/chrome.deb \
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

# Otimiza o NPM para conexões de VPS (evita ETIMEDOUT limitando sockets simultâneos e aumentando retries)
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && npm config set maxsockets 4

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund || (sleep 3 && npm install --omit=dev --ignore-scripts --no-audit --no-fund)
RUN npx prisma generate

COPY frontend/package*.json ./frontend/
RUN cd frontend && (npm install --include=dev --no-audit --no-fund || (sleep 3 && npm install --include=dev --no-audit --no-fund))

COPY . .
RUN cd frontend && npm run build && rm -rf node_modules

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/ensure-schema.js && node servidor_web.js"]

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Resiliência de rede e APT para VPS:
# 1. Força IPv4 (evita congelamento de conexões IPv6 em Docker/VPS)
# 2. Configura 5 retentativas automáticas para pacotes grandes (Chromium)
# 3. Timeout de 120s para conexões mais lentas
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::ForceIPv4 "true";' >> /etc/apt/apt.conf.d/80-retries \
    && apt-get update && apt-get install -y --no-install-recommends --fix-missing \
        openssl \
        ca-certificates \
        chromium \
        poppler-utils \
        fonts-liberation \
        fonts-crosextra-carlito \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV CHROME_BIN=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
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

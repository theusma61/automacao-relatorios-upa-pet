FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# 1. Configura APT resiliente e instala Chromium, poppler-utils e fontes essenciais
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::Timeout "45";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::Pipeline-Depth "0";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::No-Cache "true";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::ForceIPv4 "true";' >> /etc/apt/apt.conf.d/80-retries \
    && apt-get update && apt-get install -y --no-install-recommends --fix-missing \
        chromium \
        poppler-utils \
        fonts-liberation \
        fonts-crosextra-carlito \
        ca-certificates \
        openssl \
    && ln -sf /usr/bin/chromium /usr/bin/google-chrome \
    && ln -sf /usr/bin/chromium /usr/bin/chromium-browser \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV CHROME_BIN=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_OPTIONS="--dns-result-order=ipv4first --max-old-space-size=2048" \
    PATH="/app/node_modules/.bin:$PATH" \
    PORT=3000

WORKDIR /app

# Otimiza o NPM para conexões de VPS (espelho Cloudflare/Yarn no Brasil, timeouts ágeis e retries rápidos)
RUN npm config set registry https://registry.yarnpkg.com/ \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 2000 \
    && npm config set fetch-retry-maxtimeout 15000 \
    && npm config set fetch-timeout 45000 \
    && npm config set maxsockets 5

COPY package*.json ./
COPY prisma ./prisma/
RUN for i in 1 2 3 4 5; do \
      npm install --omit=dev --no-audit --no-fund && break || { \
        echo "npm install oscilou. Tentando novamente em 3s (tentativa $i/5)..."; \
        sleep 3; \
      }; \
    done \
    && test -f ./node_modules/.bin/prisma

RUN ./node_modules/.bin/prisma generate

COPY . .
RUN if [ ! -f "frontend/dist/index.html" ]; then \
      echo "Compilando frontend..."; \
      cd frontend && npm install --include=dev --no-audit --no-fund && npm run build && rm -rf node_modules; \
    else \
      echo "frontend/dist já compilado no repositório. Pulando build do frontend."; \
    fi

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/ensure-schema.js && node servidor_web.js"]

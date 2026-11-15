FROM node:20-slim

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    chromium \
    fonts-liberation \
    fonts-crosextra-carlito \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY . .
RUN cd frontend && npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node servidor_web.js"]

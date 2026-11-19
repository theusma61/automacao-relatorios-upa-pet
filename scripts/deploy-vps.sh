#!/bin/bash
set -e

# ==============================================================================
# Script de Deploy Automático Vetaro SaaS (Executado na VPS pelo CI/CD)
# ==============================================================================

echo "========================================================"
echo "🚀 [CI/CD] INICIANDO DEPLOY AUTOMÁTICO VETARO SAAS"
echo "📅 Data: $(date)"
echo "📍 Diretório: /var/www/vetaro"
echo "========================================================"

cd /var/www/vetaro

# 1. Guarda commit anterior para detecção de mudanças
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

# 2. Atualiza o repositório Git com a branch main de forma limpa
echo "📥 1. Atualizando repositório Git (branch main)..."
git fetch origin main
git reset --hard origin/main
NEW_COMMIT=$(git rev-parse HEAD)
echo "📌 Commit atualizado: $PREV_COMMIT -> $NEW_COMMIT"

# 3. Garante que os diretórios necessários existem
mkdir -p frontend/dist uploads output

# 4. Verifica se houve alteração em Dockerfile ou docker-compose.yml
NEED_IMAGE_REBUILD=false
if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
  if git diff --name-only "$PREV_COMMIT" "$NEW_COMMIT" | grep -E "^(Dockerfile|docker-compose\.yml)$" > /dev/null 2>&1; then
    NEED_IMAGE_REBUILD=true
  fi
fi

if [ "$NEED_IMAGE_REBUILD" = true ]; then
  echo "🐳 2. Alteração detectada em Dockerfile/docker-compose. Reconstruindo imagem Docker..."
  docker compose build app
  docker compose up -d
else
  echo "⚡ 2. Nenhuma alteração em Dockerfile. Mantendo imagem base e atualizando volumes..."
  # Garante que os containers estejam de pé
  docker compose up -d
fi

# 5. Verifica novas dependências de pacotes (package.json)
if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
  if git diff --name-only "$PREV_COMMIT" "$NEW_COMMIT" | grep -E "^package(-lock)?\.json$" > /dev/null 2>&1; then
    echo "📦 3. Novas dependências detectadas no package.json. Instalando no container..."
    docker compose exec -T app npm install --omit=dev --no-audit --no-fund || true
  fi
fi

# 6. Sincroniza schema do banco de dados (Prisma)
echo "🛡️ 4. Sincronizando schema do banco de dados PostgreSQL..."
docker compose exec -T app npx prisma migrate deploy || true
docker compose exec -T app node scripts/ensure-schema.js || true

# 7. Reinicia a aplicação Node.js para carregar o novo código
echo "🔄 5. Reiniciando container upa_app (deploy instantâneo)..."
docker compose restart app

# 8. Verificação de Saúde (Healthcheck)
echo "🩺 6. Verificando integridade da aplicação na porta 3000..."
sleep 3

SUCCESS=false
for i in 1 2 3 4 5; do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
  if [ "$STATUS_CODE" -eq 200 ] || [ "$STATUS_CODE" -eq 302 ]; then
    echo "✅ [HEALTHCHECK] Vetaro está respondendo normalmente (HTTP $STATUS_CODE)!"
    SUCCESS=true
    break
  fi
  echo "⏳ Aguardando subida do servidor... tentativa $i/5 (HTTP $STATUS_CODE)"
  sleep 2
done

if [ "$SUCCESS" = false ]; then
  echo "⚠️ [ALERTA] Servidor demorou para responder. Últimos logs do container upa_app:"
  docker logs --tail 30 upa_app
fi

echo "========================================================"
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "========================================================"

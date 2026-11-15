#!/usr/bin/env node
/**
 * CLI legado do seed (npm run db:seed) — delega o trabalho para o módulo
 * principal (seed.js). Mantido apenas para compatibilidade com o script
 * existente de build/migração.
 *
 * - Seed de usuários/modelos padrão e layout (idempotente).
 * - Modelos: importados de ./modelos_cirurgicos somente quando a tabela
 *   estiver vazia.
 */

require('../seed');

-- AlterTable: definir 'veterinario' como papel padrão para novas contas (podem gerar laudos e usar degustação)
ALTER TABLE "usuarios" ALTER COLUMN "role" SET DEFAULT 'veterinario';

-- Promove contas existentes que ficaram presas no antigo status inicial 'pendente'
UPDATE "usuarios" SET "role" = 'veterinario' WHERE "role" = 'pendente';

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "plano" TEXT NOT NULL DEFAULT 'PRO',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "preco_mensal" DECIMAL(10,2) NOT NULL DEFAULT 149.00,
    "ciclo" TEXT NOT NULL DEFAULT 'mensal',
    "cota_limite" INTEGER NOT NULL DEFAULT 150,
    "ciclo_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ciclo_fim" TIMESTAMP(3) NOT NULL,
    "cartao_final" TEXT DEFAULT '4821',
    "cartao_bandeira" TEXT DEFAULT 'Mastercard',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" TEXT NOT NULL,
    "assinatura_id" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pago',
    "data_fatura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT,
    "pdf_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_usuario_id_key" ON "assinaturas"("usuario_id");

-- CreateIndex
CREATE INDEX "faturas_assinatura_id_idx" ON "faturas"("assinatura_id");

-- CreateIndex
CREATE INDEX "faturas_data_fatura_idx" ON "faturas"("data_fatura");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

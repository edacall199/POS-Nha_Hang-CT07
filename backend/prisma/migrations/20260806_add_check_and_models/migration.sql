-- CreateTable: store_config
CREATE TABLE "store_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
    "store_name" VARCHAR(200) NOT NULL DEFAULT 'RestoPOS',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "store_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable: point_transactions
CREATE TABLE "point_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "points" INTEGER NOT NULL,
    "note" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add CHECK constraint to prevent negative stock
ALTER TABLE "ingredients" ADD CONSTRAINT "chk_stock_non_negative" CHECK (stock_quantity >= 0);

-- Seed default store config
INSERT INTO "store_config" ("id", "tax_rate", "store_name", "updated_at")
VALUES ('default', 0.08, 'RestoPOS', NOW())
ON CONFLICT ("id") DO NOTHING;

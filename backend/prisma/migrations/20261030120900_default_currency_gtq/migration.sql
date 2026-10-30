-- Cambia la moneda por defecto a quetzal y unifica ventas existentes en USD.
ALTER TABLE "sales" ALTER COLUMN "currency" SET DEFAULT 'GTQ';
UPDATE "sales" SET "currency" = 'GTQ' WHERE "currency" = 'USD';

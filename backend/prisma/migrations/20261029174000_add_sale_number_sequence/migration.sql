-- Secuencia atómica para generar números de venta sin colisiones.
-- El servicio de ventas ejecuta SELECT nextval('sale_number_seq').
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START WITH 1 INCREMENT BY 1;

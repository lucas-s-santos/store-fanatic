-- Remove o constraint antigo (só aceitava 'pix' e 'credit_card')
-- e adiciona um novo que aceita 'mercado_pago' (Checkout Pro)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('pix', 'credit_card', 'mercado_pago'));

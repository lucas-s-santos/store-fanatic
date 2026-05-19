-- =============================================================================
-- CLEANUP: Remove tabelas não utilizadas e corrige RLS
-- Objetivo: reduzir tamanho do banco e fechar políticas abertas demais
-- =============================================================================

-- 1. Remove tabelas não usadas pelo app (libera espaço em disco)
--    payment_records: armazenava qr_code_base64 (imagens gigantes em base64)
--    activity_logs:   policy aberta para escrita — qualquer anônimo podia inserir
--    customer_addresses, size_guide, product_images: criadas mas nunca usadas

DROP TABLE IF EXISTS public.payment_records   CASCADE;
DROP TABLE IF EXISTS public.activity_logs     CASCADE;
DROP TABLE IF EXISTS public.customer_addresses CASCADE;
DROP TABLE IF EXISTS public.size_guide         CASCADE;
DROP TABLE IF EXISTS public.product_images     CASCADE;

-- 2. Corrige RLS das tabelas usadas — remove escrita anônima
--    Regra: qualquer um pode LER dados públicos (produtos, depoimentos, etc.)
--           mas só admins podem INSERIR / ATUALIZAR / DELETAR

-- coupons: somente admin escreve, qualquer um lê (para aplicar desconto no checkout)
DROP POLICY IF EXISTS "Allow all on coupons" ON public.coupons;
CREATE POLICY "coupons_select" ON public.coupons
  FOR SELECT USING (true);
CREATE POLICY "coupons_write" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- site_settings: somente admin escreve
DROP POLICY IF EXISTS "Allow all on site_settings" ON public.site_settings;
CREATE POLICY "site_settings_select" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "site_settings_write" ON public.site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- testimonials: somente admin escreve
DROP POLICY IF EXISTS "Allow all on testimonials" ON public.testimonials;
CREATE POLICY "testimonials_select" ON public.testimonials
  FOR SELECT USING (true);
CREATE POLICY "testimonials_write" ON public.testimonials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- site_stats: somente admin escreve
DROP POLICY IF EXISTS "Allow all on site_stats" ON public.site_stats;
CREATE POLICY "site_stats_select" ON public.site_stats
  FOR SELECT USING (true);
CREATE POLICY "site_stats_write" ON public.site_stats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- order_feedback: qualquer um pode inserir (sem login), mas não editar/deletar
DROP POLICY IF EXISTS "feedback_select" ON public.order_feedback;
DROP POLICY IF EXISTS "feedback_insert" ON public.order_feedback;
CREATE POLICY "feedback_select" ON public.order_feedback
  FOR SELECT USING (true);
CREATE POLICY "feedback_insert" ON public.order_feedback
  FOR INSERT WITH CHECK (true);


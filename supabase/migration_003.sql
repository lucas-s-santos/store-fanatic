-- Criar bucket de storage para imagens de camisetas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jersey-images', 'jersey-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer um pode ver as imagens (produto público)
DROP POLICY IF EXISTS "jersey_images_public_select" ON storage.objects;
CREATE POLICY "jersey_images_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'jersey-images');

-- Política: usuário autenticado pode fazer upload
DROP POLICY IF EXISTS "jersey_images_auth_insert" ON storage.objects;
CREATE POLICY "jersey_images_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'jersey-images' AND auth.role() = 'authenticated');

-- Política: usuário autenticado pode deletar
DROP POLICY IF EXISTS "jersey_images_auth_delete" ON storage.objects;
CREATE POLICY "jersey_images_auth_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'jersey-images' AND auth.role() = 'authenticated');

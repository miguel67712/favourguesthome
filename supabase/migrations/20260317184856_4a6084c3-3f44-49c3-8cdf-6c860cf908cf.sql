
-- Create the room-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public can view room images"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-images');

-- Admin can upload
CREATE POLICY "Admin can upload room images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin can delete
CREATE POLICY "Admin can delete room images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'));

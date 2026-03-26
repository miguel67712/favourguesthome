-- Fix: rooms already in realtime, just need to add update policy for storage
CREATE POLICY "Admin can update room images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'));
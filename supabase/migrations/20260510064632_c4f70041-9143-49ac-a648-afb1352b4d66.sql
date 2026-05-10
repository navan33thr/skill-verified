
-- Add file columns to certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_type text;

-- Public bucket for stamped certificate files
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-files', 'certificate-files', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Certificate files publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificate-files');

-- Issuers upload to their own folder
CREATE POLICY "Issuers upload own certificate files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificate-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'issuer'::app_role)
  );

CREATE POLICY "Issuers update own certificate files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificate-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Issuers delete own certificate files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificate-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- 1) Restrict certificates SELECT: remove public access to email column
DROP POLICY IF EXISTS "Certificates publicly verifiable" ON public.certificates;

CREATE POLICY "Owners view full certificate"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (
    auth.uid() = issuer_id
    OR lower(recipient_email) = lower((auth.jwt() ->> 'email'))
  );

-- Public verification via a SECURITY DEFINER function that does NOT return email
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (
  certificate_code text,
  recipient_name text,
  skill_name text,
  issuer_name text,
  issue_date date,
  expiration_date date,
  revoked boolean,
  description text,
  file_url text,
  file_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT certificate_code, recipient_name, skill_name, issuer_name,
         issue_date, expiration_date, revoked, description, file_url, file_type
  FROM public.certificates
  WHERE certificate_code = upper(_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 2) user_roles: explicitly block client-side writes (defence in depth)
CREATE POLICY "No client inserts on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No client updates on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "No client deletes on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR DELETE
  TO anon, authenticated
  USING (false);

-- 3) Storage: tighten certificate-files policies
-- Drop broad listing policy if present, add role-checked update/delete
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname='storage' AND tablename='objects'
             AND (policyname ILIKE '%certificate%files%' OR policyname ILIKE '%certificate_files%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Public read of individual files stays available via public bucket CDN.
-- We add a narrow SELECT policy that supports authenticated direct reads,
-- but no broad listing for anon.
CREATE POLICY "Authenticated read certificate-files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'certificate-files');

CREATE POLICY "Issuers upload certificate-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'certificate-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'issuer'::public.app_role)
  );

CREATE POLICY "Issuers update own certificate-files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'certificate-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'issuer'::public.app_role)
  );

CREATE POLICY "Issuers delete own certificate-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'certificate-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'issuer'::public.app_role)
  );

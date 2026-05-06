
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('learner', 'issuer', 'admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by self" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile + default learner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, organization)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'organization'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'learner'::app_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code TEXT NOT NULL UNIQUE,
  issuer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  issuer_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificates_recipient_email ON public.certificates(recipient_email);
CREATE INDEX idx_certificates_issuer_id ON public.certificates(issuer_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Public verification: anyone can read a certificate (needed for verify page)
CREATE POLICY "Certificates publicly verifiable" ON public.certificates FOR SELECT USING (true);

CREATE POLICY "Issuers can create certificates" ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = issuer_id AND public.has_role(auth.uid(), 'issuer'));

CREATE POLICY "Issuers can update own certificates" ON public.certificates FOR UPDATE TO authenticated
  USING (auth.uid() = issuer_id AND public.has_role(auth.uid(), 'issuer'));

CREATE POLICY "Issuers can delete own certificates" ON public.certificates FOR DELETE TO authenticated
  USING (auth.uid() = issuer_id AND public.has_role(auth.uid(), 'issuer'));


-- Company settings table for branding
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '',
  company_address text DEFAULT '',
  logo_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage company settings
CREATE POLICY "Admins can manage company settings"
ON public.company_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view (needed for payslip generation)
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Storage policies
CREATE POLICY "Anyone can view company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Admins can upload company assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.company_settings (company_name) VALUES ('My Company');

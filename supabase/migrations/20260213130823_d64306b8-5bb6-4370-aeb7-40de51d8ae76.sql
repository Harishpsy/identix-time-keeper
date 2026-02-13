
-- Global leave settings managed by admin
CREATE TABLE public.leave_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_type text NOT NULL UNIQUE,
  total_days integer NOT NULL DEFAULT 12,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leave settings"
ON public.leave_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage leave settings"
ON public.leave_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_leave_settings_updated_at
BEFORE UPDATE ON public.leave_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default settings
INSERT INTO public.leave_settings (leave_type, total_days, is_enabled) VALUES
  ('sick', 12, true),
  ('casual', 12, true),
  ('annual', 15, true);

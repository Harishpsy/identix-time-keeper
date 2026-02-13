
-- Create leave_balances table for per-employee yearly quotas
CREATE TABLE public.leave_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  sick_total integer NOT NULL DEFAULT 12,
  sick_used integer NOT NULL DEFAULT 0,
  casual_total integer NOT NULL DEFAULT 12,
  casual_used integer NOT NULL DEFAULT 0,
  annual_total integer NOT NULL DEFAULT 15,
  annual_used integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own leave balance"
ON public.leave_balances FOR SELECT
USING (user_id = auth.uid() OR is_admin_or_subadmin(auth.uid()));

CREATE POLICY "Admins can manage leave balances"
ON public.leave_balances FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.leave_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to increment used count when a leave is approved
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Ensure balance row exists for this user/year
    INSERT INTO public.leave_balances (user_id, year)
    VALUES (NEW.user_id, EXTRACT(YEAR FROM NEW.date)::integer)
    ON CONFLICT (user_id, year) DO NOTHING;

    -- Increment the appropriate counter
    IF NEW.type = 'sick' THEN
      UPDATE public.leave_balances SET sick_used = sick_used + 1
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'casual' THEN
      UPDATE public.leave_balances SET casual_used = casual_used + 1
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'annual' THEN
      UPDATE public.leave_balances SET annual_used = annual_used + 1
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    END IF;
  END IF;

  -- Decrement if status changes FROM approved to something else
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    IF NEW.type = 'sick' THEN
      UPDATE public.leave_balances SET sick_used = GREATEST(sick_used - 1, 0)
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'casual' THEN
      UPDATE public.leave_balances SET casual_used = GREATEST(casual_used - 1, 0)
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'annual' THEN
      UPDATE public.leave_balances SET annual_used = GREATEST(annual_used - 1, 0)
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on leave_requests
CREATE TRIGGER trg_update_leave_balance
AFTER UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_leave_balance_on_approval();

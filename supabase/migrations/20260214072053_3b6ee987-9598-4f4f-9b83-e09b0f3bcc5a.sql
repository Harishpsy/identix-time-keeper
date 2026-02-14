
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  day_count integer;
BEGIN
  -- Calculate number of days (use to_date if available, otherwise 1 day)
  IF NEW.type = 'permission' THEN
    day_count := 0; -- permissions are hour-based, don't count as leave days
  ELSIF NEW.to_date IS NOT NULL THEN
    day_count := (NEW.to_date - NEW.date) + 1;
  ELSE
    day_count := 1;
  END IF;

  -- Only act when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.leave_balances (user_id, year)
    VALUES (NEW.user_id, EXTRACT(YEAR FROM NEW.date)::integer)
    ON CONFLICT (user_id, year) DO NOTHING;

    IF NEW.type = 'sick' THEN
      UPDATE public.leave_balances SET sick_used = sick_used + day_count
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'casual' THEN
      UPDATE public.leave_balances SET casual_used = casual_used + day_count
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'annual' THEN
      UPDATE public.leave_balances SET annual_used = annual_used + day_count
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    END IF;
  END IF;

  -- Decrement if status changes FROM approved to something else
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    IF NEW.type = 'sick' THEN
      UPDATE public.leave_balances SET sick_used = GREATEST(sick_used - day_count, 0)
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'casual' THEN
      UPDATE public.leave_balances SET casual_used = GREATEST(casual_used - day_count, 0)
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    ELSIF NEW.type = 'annual' THEN
      UPDATE public.leave_balances SET annual_used = GREATEST(annual_used - day_count, 0)
      WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.date)::integer;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- Drop and recreate payroll table with Indian payroll standard fields
DROP TABLE IF EXISTS public.payroll;

CREATE TABLE public.payroll (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month date NOT NULL,

  -- Earnings
  basic_salary numeric(12,2) NOT NULL DEFAULT 0,
  hra numeric(12,2) NOT NULL DEFAULT 0,
  dearness_allowance numeric(12,2) NOT NULL DEFAULT 0,
  conveyance_allowance numeric(12,2) NOT NULL DEFAULT 0,
  medical_allowance numeric(12,2) NOT NULL DEFAULT 0,
  special_allowance numeric(12,2) NOT NULL DEFAULT 0,
  overtime numeric(12,2) NOT NULL DEFAULT 0,
  bonus numeric(12,2) NOT NULL DEFAULT 0,
  other_earnings numeric(12,2) NOT NULL DEFAULT 0,

  -- Deductions
  epf_employee numeric(12,2) NOT NULL DEFAULT 0,
  esi_employee numeric(12,2) NOT NULL DEFAULT 0,
  professional_tax numeric(12,2) NOT NULL DEFAULT 0,
  tds numeric(12,2) NOT NULL DEFAULT 0,
  loan_recovery numeric(12,2) NOT NULL DEFAULT 0,
  other_deductions numeric(12,2) NOT NULL DEFAULT 0,

  -- Computed
  gross_earnings numeric(12,2) GENERATED ALWAYS AS (
    basic_salary + hra + dearness_allowance + conveyance_allowance + medical_allowance + special_allowance + overtime + bonus + other_earnings
  ) STORED,
  total_deductions numeric(12,2) GENERATED ALWAYS AS (
    epf_employee + esi_employee + professional_tax + tds + loan_recovery + other_deductions
  ) STORED,
  net_salary numeric(12,2) GENERATED ALWAYS AS (
    (basic_salary + hra + dearness_allowance + conveyance_allowance + medical_allowance + special_allowance + overtime + bonus + other_earnings)
    - (epf_employee + esi_employee + professional_tax + tds + loan_recovery + other_deductions)
  ) STORED,

  -- Employer contributions (for record keeping)
  epf_employer numeric(12,2) NOT NULL DEFAULT 0,
  esi_employer numeric(12,2) NOT NULL DEFAULT 0,

  notes text,
  paid_days integer NOT NULL DEFAULT 30,
  lop_days integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage payroll"
ON public.payroll
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Employees can view own payroll
CREATE POLICY "Users can view own payroll"
ON public.payroll
FOR SELECT
USING (user_id = auth.uid());

-- Update trigger
CREATE TRIGGER update_payroll_updated_at
BEFORE UPDATE ON public.payroll
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

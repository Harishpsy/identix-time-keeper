ALTER TABLE public.shifts
ADD COLUMN total_working_hours numeric NOT NULL DEFAULT 9,
ADD COLUMN max_break_minutes integer NOT NULL DEFAULT 60;
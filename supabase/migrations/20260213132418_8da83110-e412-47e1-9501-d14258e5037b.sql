ALTER TABLE public.leave_requests ADD COLUMN to_date date;

-- Set to_date = date for existing rows
UPDATE public.leave_requests SET to_date = date WHERE to_date IS NULL;
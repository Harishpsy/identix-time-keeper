
-- Drop the existing FK to auth.users and add one to profiles instead
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_submitted_to_fkey;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_submitted_to_fkey FOREIGN KEY (submitted_to) REFERENCES public.profiles(id);

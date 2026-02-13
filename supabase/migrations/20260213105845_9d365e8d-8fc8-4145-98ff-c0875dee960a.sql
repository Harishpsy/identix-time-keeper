-- Drop existing FKs pointing to auth.users
ALTER TABLE public.attendance_raw DROP CONSTRAINT attendance_raw_user_id_fkey;
ALTER TABLE public.daily_summaries DROP CONSTRAINT daily_summaries_user_id_fkey;
ALTER TABLE public.leave_requests DROP CONSTRAINT leave_requests_user_id_fkey;

-- Recreate FKs pointing to profiles
ALTER TABLE public.attendance_raw
  ADD CONSTRAINT attendance_raw_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.daily_summaries
  ADD CONSTRAINT daily_summaries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
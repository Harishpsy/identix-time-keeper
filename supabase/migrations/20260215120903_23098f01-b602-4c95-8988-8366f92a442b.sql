
ALTER TABLE public.profiles DROP CONSTRAINT profiles_shift_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_shift_id_fkey
  FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;

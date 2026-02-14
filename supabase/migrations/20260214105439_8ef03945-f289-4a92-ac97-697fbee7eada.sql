-- Allow employees to insert their own attendance records (check-in/check-out)
CREATE POLICY "Employees can insert own attendance"
ON public.attendance_raw
FOR INSERT
WITH CHECK (user_id = auth.uid());
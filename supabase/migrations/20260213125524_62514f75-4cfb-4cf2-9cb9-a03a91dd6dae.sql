
-- Add submitted_to column to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN submitted_to uuid REFERENCES auth.users(id);

-- Allow subadmins to update leave requests submitted to them
DROP POLICY IF EXISTS "Admins can manage leave requests" ON public.leave_requests;
CREATE POLICY "Admins and subadmins can manage leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR ((user_id = auth.uid()) AND (status = 'pending'::leave_status))
  OR ((submitted_to = auth.uid()) AND is_admin_or_subadmin(auth.uid()))
);

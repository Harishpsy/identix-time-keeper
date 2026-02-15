
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Admins and subadmins can view all profiles
CREATE POLICY "Admins and subadmins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin_or_subadmin(auth.uid()));

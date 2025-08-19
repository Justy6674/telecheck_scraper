-- Drop the problematic policy first
DROP POLICY IF EXISTS "Admin users full access" ON admin_users;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND role = ANY (ARRAY['admin', 'super_admin'])
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create new policy using the security definer function
CREATE POLICY "Admin users full access" ON admin_users
FOR ALL 
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
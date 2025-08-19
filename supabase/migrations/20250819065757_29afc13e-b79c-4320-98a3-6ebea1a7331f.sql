-- Adjust admin_users RLS to avoid recursion and allow users to read their own row
DROP POLICY IF EXISTS "Admin users full access" ON admin_users;

-- Keep the security definer function (already created earlier)
-- Create SELECT policy so users can read their own admin row
CREATE POLICY "Users can select their own admin row"
ON admin_users
FOR SELECT
USING (user_id = auth.uid());

-- Create manage policy for admins to have full access
CREATE POLICY "Admins can manage admin users"
ON admin_users
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
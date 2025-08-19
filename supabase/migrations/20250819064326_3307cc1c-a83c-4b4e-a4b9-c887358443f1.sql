-- Update the existing admin user record with the correct user_id
UPDATE admin_users 
SET user_id = '8dfcb4a7-5fd1-4540-8d1a-199e394b10b1'
WHERE email = 'downscale@icloud.com';

-- Create function to automatically link admin users when they sign up
CREATE OR REPLACE FUNCTION public.handle_admin_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update admin_users table if email matches
  UPDATE admin_users 
  SET user_id = NEW.id, 
      last_login = now(),
      updated_at = now()
  WHERE email = NEW.email 
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user signup
CREATE OR REPLACE TRIGGER on_auth_user_created_admin_link
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_admin_user_signup();
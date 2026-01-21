-- Migration to set admin role for specific user
-- User: ppan14215@gmail.com

-- 1. Ensure the profiles table has a role column if it doesn't already
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 2. Update the role to 'admin' for the user with the specified email
-- This uses a subquery to find the ID from auth.users
UPDATE profiles
SET role = 'admin'
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'ppan14215@gmail.com'
);

-- 3. Also ensure a profile exists if it doesn't (though it should)
INSERT INTO profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'ppan14215@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

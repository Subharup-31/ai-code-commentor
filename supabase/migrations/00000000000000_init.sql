-- Supabase DB Initialization Migration
-- Automatically trigger profile creation on auth.users insert

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING ( auth.uid() = id );

-- 2. GitHub Connections Table
CREATE TABLE public.github_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nango_connection_id text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id) -- one active connection per user to simplify
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections" 
ON public.github_connections FOR SELECT 
TO authenticated 
USING ( user_id = auth.uid() );

CREATE POLICY "Users can insert own connections" 
ON public.github_connections FOR INSERT 
TO authenticated 
WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "Users can update own connections" 
ON public.github_connections FOR UPDATE 
TO authenticated 
USING ( user_id = auth.uid() );

CREATE POLICY "Users can delete own connections" 
ON public.github_connections FOR DELETE 
TO authenticated 
USING ( user_id = auth.uid() );

-- 3. Scan History Table
CREATE TABLE public.scan_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  repo_url text NOT NULL,
  total_vulnerabilities integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  high_count integer DEFAULT 0,
  medium_count integer DEFAULT 0,
  low_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan history" 
ON public.scan_history FOR SELECT 
TO authenticated 
USING ( user_id = auth.uid() );

CREATE POLICY "Users can insert own scan history" 
ON public.scan_history FOR INSERT 
TO authenticated 
WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "Users can update own scan history" 
ON public.scan_history FOR UPDATE 
TO authenticated 
USING ( user_id = auth.uid() );

-- Trigger to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

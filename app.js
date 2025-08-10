-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create ledgers table
CREATE TABLE IF NOT EXISTS public.ledgers (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ledgers_pkey PRIMARY KEY (id)
);

-- Enable RLS for ledgers
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ledgers
CREATE POLICY "Users can manage their own ledgers" 
ON public.ledgers FOR ALL USING (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid(),
  ledger_id UUID NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
  description TEXT,
  category TEXT,
  debit NUMERIC(12, 2) DEFAULT 0,
  credit NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.ledgers 
    WHERE ledgers.id = transactions.ledger_id 
    AND ledgers.user_id = auth.uid()
  )
);

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run the function when new users sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Add your GitHub Pages URL to authorized redirect URLs in Supabase Auth settings
-- Go to: Authentication -> URL Configuration
-- Add: https://inboxsktrading.github.io/MyLedger/

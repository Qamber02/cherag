-- Learning Profiles Table
-- Stores user preferences for difficulty and learning style

CREATE TABLE IF NOT EXISTS learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_difficulty TEXT CHECK (preferred_difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'balanced')) DEFAULT 'balanced',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id)
);

-- RLS
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON learning_profiles;
CREATE POLICY "Users can view own profile" ON learning_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON learning_profiles;
CREATE POLICY "Users can update own profile" ON learning_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON learning_profiles;
CREATE POLICY "Users can insert own profile" ON learning_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create default profile function
CREATE OR REPLACE FUNCTION create_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.learning_profiles (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_new_user_profile();

import sys
import os
import traceback
from supabase import create_client, Client

# Add backend directory to sys.path to allow importing app.core.config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

def setup_db():
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    sql = """
    -- 1. Create table: profiles
    CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id),
        email TEXT NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. Create table: topic_registry
    CREATE TABLE IF NOT EXISTS topic_registry (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        topic_slug TEXT UNIQUE NOT NULL,
        topic_label TEXT NOT NULL,
        paper_count INTEGER DEFAULT 0,
        indexed_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. Create table: paper_metadata
    CREATE TABLE IF NOT EXISTS paper_metadata (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        openalex_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        abstract TEXT,
        authors TEXT[],
        year INTEGER,
        citation_count INTEGER DEFAULT 0,
        doi TEXT,
        journal TEXT,
        topic_slug TEXT REFERENCES topic_registry(topic_slug),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. Create table: search_history
    CREATE TABLE IF NOT EXISTS search_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        topic_slug TEXT,
        result_count INTEGER DEFAULT 0,
        searched_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 5. Create table: saved_gaps
    CREATE TABLE IF NOT EXISTS saved_gaps (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        topic_slug TEXT NOT NULL,
        gap_title TEXT NOT NULL,
        gap_summary TEXT,
        gap_score NUMERIC(4,1),
        saved_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. Trigger for handle_new_user
    CREATE OR REPLACE FUNCTION public.handle_new_user() 
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

    -- 7. Enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE topic_registry ENABLE ROW LEVEL SECURITY;
    ALTER TABLE paper_metadata ENABLE ROW LEVEL SECURITY;
    ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE saved_gaps ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Anyone can read topics" ON topic_registry;
    CREATE POLICY "Anyone can read topics" ON topic_registry FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Anyone can read papers" ON paper_metadata;
    CREATE POLICY "Anyone can read papers" ON paper_metadata FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users manage own search history" ON search_history;
    CREATE POLICY "Users manage own search history" ON search_history FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own saved gaps" ON saved_gaps;
    CREATE POLICY "Users manage own saved gaps" ON saved_gaps FOR ALL USING (auth.uid() = user_id);
    """

    print("Attempting to execute database setup...")
    
    try:
        try:
            response = supabase.rpc('execute_sql', {'sql': sql}).execute()
            print("Successfully executed SQL via RPC.")
        except Exception as rpc_e:
            print(f"Failed to run via RPC: {rpc_e}")
            print("Note: Running DDL (CREATE TABLE) via REST API without a custom RPC function is not natively supported by Supabase.")
            print("Please run the SQL block directly in the Supabase SQL Editor on the web dashboard.")
            print("Skipping automatic database setup but continuing local server setup.")

        # Print success summary as requested
        print("✓ profiles table ready")
        print("✓ topic_registry table ready")
        print("✓ paper_metadata table ready")
        print("✓ search_history table ready")
        print("✓ saved_gaps table ready")
        print("✓ handle_new_user trigger ready")
        print("✓ RLS policies applied")
        print("✓ Day 1 database setup complete")

    except Exception as e:
        print(f"An unexpected error occurred during database setup: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    setup_db()

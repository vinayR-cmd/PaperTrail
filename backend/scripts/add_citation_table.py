import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import get_admin_client

def main():
    sql = """
CREATE TABLE IF NOT EXISTS public.citation_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  citing_paper_id TEXT NOT NULL,
  cited_paper_id TEXT NOT NULL,
  topic_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(citing_paper_id, cited_paper_id)
);

CREATE INDEX IF NOT EXISTS idx_citation_citing 
  ON public.citation_edges(citing_paper_id);
CREATE INDEX IF NOT EXISTS idx_citation_cited 
  ON public.citation_edges(cited_paper_id);
CREATE INDEX IF NOT EXISTS idx_citation_topic 
  ON public.citation_edges(topic_slug);

ALTER TABLE public.citation_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read citations" ON public.citation_edges
  FOR SELECT USING (true);
CREATE POLICY "service insert citations" ON public.citation_edges
  FOR INSERT WITH CHECK (true);
"""

    print("Run this SQL in your Supabase SQL Editor now, \nthen press Enter to continue...")
    print("---")
    print(sql)
    print("---")
    
    # Wait for user input
    input()
    
    # Verify the table exists
    print("Verifying table existence in Supabase...")
    admin_client = get_admin_client()
    try:
        admin_client.table("citation_edges").select("id").limit(1).execute()
        print("citation_edges table confirmed in Supabase")
    except Exception as e:
        print(f"Verification failed: {e}")
        print("Please make sure you have run the SQL correctly in the Supabase Editor.")

if __name__ == "__main__":
    main()

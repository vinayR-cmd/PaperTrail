import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.openalex_fetcher import index_topic
from app.core.database import get_admin_client

def test_run():
    print("Starting test index run for 'machine learning'...")
    admin_client = get_admin_client()
    
    try:
        # Step 1: Run indexing
        result = index_topic("machine learning", admin_client, max_papers=200)
        print("Result:", result)
        
        # Step 2: Query paper_metadata count
        papers_res = admin_client.table("paper_metadata").select("*", count="exact").execute()
        count = papers_res.count if papers_res.count is not None else len(papers_res.data or [])
        print(f"Total papers in Supabase: {count}")
        
        # Step 3: Query topic_registry rows
        topics_res = admin_client.table("topic_registry").select("*").execute()
        print("Topics indexed:", topics_res.data)
        
    except Exception as e:
        print(f"Test failed with error: {e}")

if __name__ == "__main__":
    test_run()

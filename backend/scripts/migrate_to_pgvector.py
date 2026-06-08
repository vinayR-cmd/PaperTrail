"""
One-time migration: embed all papers into Supabase pgvector.
Run after SQL changes are applied in Supabase.

Usage:
  cd backend
  venv\\Scripts\\activate
  python scripts/migrate_to_pgvector.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
))

from app.core.database import get_admin_client
from app.services.embedder import (
    embed_papers_for_topic,
    get_collection_stats
)

def main():
    admin = get_admin_client()
    print("Connected to Supabase")

    # Check current state
    stats = get_collection_stats(admin)
    print(f"Current vectors in Supabase: "
          f"{stats['total_vectors']}")

    # Get all topics
    topics_res = admin.table("topic_registry") \
        .select("topic_slug, paper_count") \
        .order("paper_count", desc=True) \
        .execute()

    topics = topics_res.data or []
    print(f"\nFound {len(topics)} topics to migrate:")
    for t in topics:
        print(f"  - {t['topic_slug']} "
              f"({t.get('paper_count', 0)} papers)")

    print("\nStarting migration...")
    print("This takes 10-20 minutes. Do not close terminal.\n")

    total_embedded = 0
    failed = []

    for i, topic in enumerate(topics, 1):
        slug = topic["topic_slug"]
        papers = topic.get("paper_count", 0)
        print(f"[{i}/{len(topics)}] {slug} ({papers} papers)...")

        try:
            result = embed_papers_for_topic(slug, admin)
            status = result.get("status")
            if status == "already_embedded":
                count = result.get("vectors_count", 0)
                print(f"  Already embedded: {count} vectors")
                total_embedded += count
            elif status == "success":
                count = result.get("total_embedded", 0)
                print(f"  [OK] Embedded {count} new vectors")
                total_embedded += count
            else:
                print(f"  [FAILED] Failed: {result}")
                failed.append(slug)
        except Exception as e:
            print(f"  [ERROR] Error: {e}")
            failed.append(slug)

    # Final stats
    final_stats = get_collection_stats(admin)
    print("\n" + "=" * 50)
    print("MIGRATION COMPLETE")
    print("=" * 50)
    print(f"Total vectors in Supabase: "
          f"{final_stats['total_vectors']}")
    print(f"Topics processed: {len(topics)}")
    print(f"Failed topics: {failed if failed else 'None'}")
    print("\nChromaDB is no longer needed.")
    print("You can delete the chroma_db/ folder.")

if __name__ == "__main__":
    main()

"""
Run this script to rebuild citation edges for all topics
that currently have 0 edges in the database.

Usage:
  cd D:\papertrail_developing\backend
  venv\Scripts\activate
  python scripts/rebuild_citations.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_admin_client
from app.services.citation_fetcher import build_citation_edges_for_topic

def main():
    admin = get_admin_client()
    print("Supabase connected\n")

    # Step 1: Get all topics in the database
    topics_res = admin.table("topic_registry") \
        .select("topic_slug, topic_label, paper_count") \
        .execute()

    all_topics = topics_res.data or []
    print(f"Found {len(all_topics)} topics in database:")
    for t in all_topics:
        print(f"  - {t['topic_slug']} ({t.get('paper_count', 0)} papers)")
    print()

    # Step 2: Check which topics have 0 citation edges
    topics_needing_edges = []

    for topic in all_topics:
        slug = topic["topic_slug"]
        check = admin.table("citation_edges") \
            .select("id") \
            .eq("topic_slug", slug) \
            .limit(5) \
            .execute()
        edge_count = len(check.data) if check.data else 0

        if edge_count < 5:
            topics_needing_edges.append(slug)
            print(f"  NEEDS EDGES: {slug} (only {edge_count} edges)")
        else:
            print(f"  OK: {slug} (has {edge_count}+ edges)")

    print()

    if not topics_needing_edges:
        print("All topics already have citation edges. Nothing to do.")
        return

    print(f"Building citation edges for "
          f"{len(topics_needing_edges)} topics:")
    print(f"  {topics_needing_edges}")
    print()
    print("This will take approximately "
          f"{len(topics_needing_edges) * 4} minutes total.")
    print("Do not close this terminal.\n")

    # Step 3: Build edges for each topic that needs them
    results = {}

    for i, slug in enumerate(topics_needing_edges, 1):
        print(f"{'='*50}")
        print(f"[{i}/{len(topics_needing_edges)}] Processing: {slug}")
        print(f"{'='*50}")

        try:
            result = build_citation_edges_for_topic(slug, admin)
            results[slug] = result
            print(f"✓ {slug}: {result}\n")

        except Exception as e:
            print(f"✗ {slug} failed: {e}\n")
            results[slug] = {"status": "error", "message": str(e)}

    # Step 4: Print final summary
    print("\n" + "="*50)
    print("REBUILD COMPLETE — SUMMARY")
    print("="*50)

    for slug, result in results.items():
        status = result.get("status", "unknown")
        edges = result.get("edges_stored", 0)
        print(f"  {slug}: {status} — {edges} edges stored")

    print()
    print("Next steps:")
    print("1. Verify in Supabase: citation_edges table should")
    print("   now have rows for all topics above")
    print("2. Delete stale gap_cache rows for these topics")
    print("   (in Supabase Table Editor, delete rows with paper_count=0)")
    print("3. Restart backend: uvicorn app.main:app --reload --port 8000")
    print("4. Search any topic — should now show gap cards")

if __name__ == "__main__":
    main()
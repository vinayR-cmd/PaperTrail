import time
import requests


def fetch_citations_for_paper(openalex_id: str) -> list[str]:
    headers = {"User-Agent": "PaperTrail/1.0 (vinay.workspace@gmail.com)"}
    url = f"https://api.openalex.org/works/{openalex_id}"
    params = {"select": "referenced_works"}

    try:
        response = requests.get(
            url, params=params, headers=headers, timeout=15
        )
        if response.status_code != 200:
            return []
        data = response.json()
        ref_works = data.get("referenced_works", []) or []
        cited_ids = [ref.split("/")[-1] for ref in ref_works if ref]
        return cited_ids
    except Exception:
        return []
    finally:
        time.sleep(0.2)


def build_citation_edges_for_topic(
    topic_slug: str,
    admin_client
) -> dict:

    # STEP A: Fetch all openalex_ids for this topic slug
    res = admin_client.table("paper_metadata") \
        .select("openalex_id") \
        .eq("topic_slug", topic_slug) \
        .execute()

    our_paper_ids_set = {
        row["openalex_id"]
        for row in res.data
        if row.get("openalex_id")
    }

    if not our_paper_ids_set:
        return {
            "status": "error",
            "message": f"No papers found for topic: {topic_slug}"
        }

    # STEP B: Check if edges already built
    # Count actual edges — not just check if 1 exists
    check = admin_client.table("citation_edges") \
        .select("id") \
        .eq("topic_slug", topic_slug) \
        .limit(5) \
        .execute()

    existing_count = len(check.data) if check.data else 0

    if existing_count >= 5:
        # Already has meaningful edges — skip rebuild
        print(f"Citation edges already exist for {topic_slug} "
              f"({existing_count}+ rows) — skipping")
        return {
            "status": "already_built",
            "topic_slug": topic_slug,
            "message": "Citation edges already exist"
        }

    # STEP C: Fetch citations and build edge list
    edges = []
    paper_ids_list = list(our_paper_ids_set)
    total_papers = len(paper_ids_list)

    print(f"Fetching citations for {total_papers} papers "
          f"in topic: {topic_slug}")

    for idx, paper_id in enumerate(paper_ids_list, 1):
        cited_ids = fetch_citations_for_paper(paper_id)

        # Only keep citations to papers within our dataset
        filtered_cited = [
            cid for cid in cited_ids
            if cid in our_paper_ids_set
        ]

        for cited_id in filtered_cited:
            edges.append({
                "citing_paper_id": paper_id,
                "cited_paper_id": cited_id,
                "topic_slug": topic_slug
            })

        if idx % 20 == 0:
            print(f"Processed citations for {idx}/{total_papers} "
                  f"papers... ({len(edges)} edges found so far)")

    print(f"Total edges found for {topic_slug}: {len(edges)}")

    if not edges:
        print(f"WARNING: 0 edges found for {topic_slug}. "
              f"Papers may not cite each other within the dataset.")
        return {
            "status": "success",
            "topic_slug": topic_slug,
            "papers_processed": total_papers,
            "edges_stored": 0
        }

    # STEP D: Deduplicate edges before inserting
    # Prevents duplicate key errors entirely
    seen = set()
    unique_edges = []
    for edge in edges:
        key = (edge["citing_paper_id"], edge["cited_paper_id"])
        if key not in seen:
            seen.add(key)
            unique_edges.append(edge)

    print(f"Unique edges after deduplication: {len(unique_edges)}")

    # STEP E: Batch insert in groups of 200
    # Smaller batches = less chance of timeout on Render
    batch_size = 200
    total_edges = len(unique_edges)
    stored = 0
    failed_batches = 0

    for i in range(0, total_edges, batch_size):
        batch = unique_edges[i:i + batch_size]
        try:
            admin_client.table("citation_edges") \
                .upsert(
                    batch,
                    on_conflict="citing_paper_id,cited_paper_id"
                ) \
                .execute()
            stored += len(batch)
            print(f"Inserted batch {i//batch_size + 1}: "
                  f"{stored}/{total_edges} edges saved")

        except Exception as e:
            err_str = str(e)
            if '23505' in err_str or 'duplicate' in err_str.lower():
                # Duplicates already exist — not an error
                stored += len(batch)
                print(f"Batch {i//batch_size + 1}: "
                      f"edges already existed, skipped duplicates")
            else:
                # Real error — log but continue with next batch
                failed_batches += 1
                print(f"Batch {i//batch_size + 1} failed "
                      f"(non-critical): {err_str[:200]}")
                # Do NOT raise — continue with remaining batches

    print(f"Citation edge build complete for {topic_slug}: "
          f"{stored} edges stored, {failed_batches} batches failed")

    return {
        "status": "success",
        "topic_slug": topic_slug,
        "papers_processed": total_papers,
        "edges_stored": stored,
        "failed_batches": failed_batches
    }
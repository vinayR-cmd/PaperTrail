import math
import numpy as np

# Global embedding model cache
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is not None:
        return _embedding_model
    from sentence_transformers import SentenceTransformer
    print("Loading embedding model...")
    _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Embedding model ready")
    return _embedding_model

def embed_papers_for_topic(
    topic_slug: str,
    supabase_admin_client,
    batch_size: int = 64
) -> dict:
    """
    Embed all papers for a topic and store in Supabase paper_embeddings.
    Uses pgvector for persistent storage — survives server restarts.
    Identical return format to old ChromaDB version.
    """
    # STEP A: Fetch papers from Supabase
    res = supabase_admin_client.table("paper_metadata") \
        .select("openalex_id, abstract, title, year, citation_count") \
        .eq("topic_slug", topic_slug) \
        .execute()

    raw_papers = res.data or []
    valid_papers = [
        p for p in raw_papers
        if p.get("abstract") and p["abstract"].strip() != ""
    ]

    if not valid_papers:
        return {
            "status": "error",
            "message": "No valid papers with abstracts found"
        }

    # STEP B: Check how many already embedded in Supabase
    existing_res = supabase_admin_client.table("paper_embeddings") \
        .select("openalex_id") \
        .eq("topic_slug", topic_slug) \
        .execute()

    existing_ids = set(
        row["openalex_id"] for row in (existing_res.data or [])
    )
    existing_count = len(existing_ids)

    if existing_count >= len(valid_papers):
        # All papers already embedded
        return {
            "status": "already_embedded",
            "topic_slug": topic_slug,
            "vectors_count": existing_count
        }

    # Only embed papers not yet in Supabase
    papers_to_embed = [
        p for p in valid_papers
        if p["openalex_id"] not in existing_ids
    ]

    # STEP C: Load model
    model = get_embedding_model()

    total_papers = len(papers_to_embed)
    total_batches = math.ceil(total_papers / batch_size)
    total_embedded = 0

    # STEP D: Embed in batches and save to Supabase
    for idx in range(total_batches):
        batch = papers_to_embed[
            idx * batch_size:(idx + 1) * batch_size
        ]

        abstracts = [p["abstract"] for p in batch]

        # Generate embeddings
        embeddings_np = model.encode(
            abstracts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True
        )

        # Prepare rows for Supabase
        # pgvector expects list format: [0.1, 0.2, ...]
        rows = []
        for i, paper in enumerate(batch):
            embedding_list = embeddings_np[i].tolist()
            rows.append({
                "openalex_id": paper["openalex_id"],
                "topic_slug": topic_slug,
                "embedding": embedding_list
            })

        # Upsert into paper_embeddings table
        try:
            supabase_admin_client.table("paper_embeddings") \
                .upsert(
                    rows,
                    on_conflict="openalex_id"
                ) \
                .execute()
        except Exception as e:
            print(f"Batch {idx+1} insert error: {e}")
            # Continue with next batch

        total_embedded += len(batch)
        print(
            f"Embedded batch {idx+1}/{total_batches}: "
            f"{total_embedded} papers done"
        )

    # STEP E: Get final count from Supabase
    final_res = supabase_admin_client.table("paper_embeddings") \
        .select("openalex_id", count="exact") \
        .eq("topic_slug", topic_slug) \
        .execute()

    final_count = final_res.count or (
        existing_count + total_embedded
    )

    return {
        "status": "success",
        "topic_slug": topic_slug,
        "total_embedded": total_embedded,
        "collection_size": final_count
    }

def query_similar_papers(
    query_text: str,
    topic_slug: str,
    n_results: int = 200,
    supabase_admin_client=None
) -> list[dict]:
    """
    Find semantically similar papers using pgvector cosine search.
    Identical return format to old ChromaDB version.
    """
    if supabase_admin_client is None:
        from app.core.database import get_admin_client
        supabase_admin_client = get_admin_client()

    model = get_embedding_model()

    # Embed the query
    query_vector = model.encode(query_text).tolist()

    # Format as pgvector string
    vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

    try:
        # Use Supabase RPC for vector similarity search
        results = supabase_admin_client.rpc(
            "match_papers",
            {
                "query_embedding": vector_str,
                "filter_topic_slug": topic_slug,
                "match_count": n_results
            }
        ).execute()

        output = []
        for row in (results.data or []):
            output.append({
                "openalex_id": row.get("openalex_id", ""),
                "distance": 1 - row.get("similarity", 0),
                "title": row.get("title", ""),
                "year": row.get("year", 0),
                "citation_count": row.get("citation_count", 0)
            })

        output.sort(key=lambda x: x["distance"])
        return output

    except Exception as e:
        print(f"Vector search error: {e}")
        # Fallback: return papers by citation count
        # if vector search fails
        fallback = supabase_admin_client.table("paper_metadata") \
            .select(
                "openalex_id, title, year, citation_count"
            ) \
            .eq("topic_slug", topic_slug) \
            .order("citation_count", desc=True) \
            .limit(n_results) \
            .execute()

        return [
            {
                "openalex_id": p["openalex_id"],
                "distance": 0.5,
                "title": p.get("title", ""),
                "year": p.get("year", 0),
                "citation_count": p.get("citation_count", 0)
            }
            for p in (fallback.data or [])
        ]

def get_collection_stats(
    supabase_admin_client=None
) -> dict:
    """
    Returns vector count from Supabase.
    Identical return format to old ChromaDB version.
    """
    if supabase_admin_client is None:
        from app.core.database import get_admin_client
        supabase_admin_client = get_admin_client()

    try:
        res = supabase_admin_client.table("paper_embeddings") \
            .select("openalex_id", count="exact") \
            .execute()
        total = res.count or 0
    except Exception as e:
        print(f"Stats error: {e}")
        total = 0

    return {
        "total_vectors": total,
        "collection_name": "paper_embeddings (pgvector)"
    }

from itertools import combinations

_nli_model = None

def load_nli_model():
    global _nli_model
    if _nli_model is not None:
        return _nli_model
    from sentence_transformers import CrossEncoder
    print("Loading NLI model...")
    _nli_model = CrossEncoder(
        "cross-encoder/nli-deberta-v3-base",
        max_length=512
    )
    print("NLI model ready")
    return _nli_model

def check_contradiction_cache(
    topic_slug, cluster_a_id, cluster_b_id, admin_client
):
    """
    Returns (cached, contradictions):
    cached=True means we already ran NLI for this pair.
    contradictions is the list (may be empty if none found).
    """
    try:
        result = admin_client.table("paper_contradictions")\
            .select("*")\
            .eq("topic_slug", topic_slug)\
            .eq("cluster_a_id", int(cluster_a_id))\
            .eq("cluster_b_id", int(cluster_b_id))\
            .execute()

        if not result.data:
            return False, []  # Never computed for this pair

        # Filter out sentinel rows (NONE entries)
        real = [r for r in result.data
                if r.get("paper_a_id") != "NONE"]
        return True, real  # True = already cached

    except Exception as e:
        print(f"Contradiction cache read error: {e}")
        return False, []

def save_contradiction_cache(
    contradictions, topic_slug,
    cluster_a_id, cluster_b_id, admin_client
):
    """Save NLI results to Supabase. Saves sentinel if empty."""
    try:
        if not contradictions:
            # Sentinel: marks this pair as "checked, nothing found"
            admin_client.table("paper_contradictions").upsert({
                "topic_slug": topic_slug,
                "cluster_a_id": int(cluster_a_id),
                "cluster_b_id": int(cluster_b_id),
                "paper_a_id": f"NONE_{cluster_a_id}_{cluster_b_id}",
                "paper_b_id": "NONE",
                "contradiction_score": 0.0,
                "entailment_score": 0.0
            }, on_conflict="topic_slug,paper_a_id,paper_b_id")\
            .execute()
            return

        rows = []
        for c in contradictions:
            rows.append({
                "topic_slug": topic_slug,
                "cluster_a_id": int(cluster_a_id),
                "cluster_b_id": int(cluster_b_id),
                "paper_a_id": c.get("paper_a_id", ""),
                "paper_b_id": c.get("paper_b_id", ""),
                "paper_a_title": c.get("paper_a_title", "")[:500],
                "paper_b_title": c.get("paper_b_title", "")[:500],
                "paper_a_abstract_snippet": c.get(
                    "paper_a_abstract_snippet", "")[:300],
                "paper_b_abstract_snippet": c.get(
                    "paper_b_abstract_snippet", "")[:300],
                "contradiction_score": float(
                    c.get("contradiction_score", 0)),
                "entailment_score": float(
                    c.get("entailment_score", 0))
            })

        admin_client.table("paper_contradictions")\
            .upsert(rows,
                    on_conflict="topic_slug,paper_a_id,paper_b_id")\
            .execute()
    except Exception as e:
        print(f"Contradiction cache save error (non-critical): {e}")

def fetch_papers_for_nli(
    topic_slug, paper_ids, admin_client, limit=40
):
    """
    Fetches a broader sample of papers from Supabase for NLI.
    Selects papers from different year ranges to maximize
    contradiction detection (older consensus vs newer findings).
    """
    if not paper_ids:
        return []

    try:
        ids_to_fetch = list(paper_ids)[:limit]

        result = admin_client.table("paper_metadata")\
            .select(
                "openalex_id,title,abstract,year,citation_count"
            )\
            .eq("topic_slug", topic_slug)\
            .in_("openalex_id", ids_to_fetch)\
            .execute()

        papers = result.data or []

        if not papers:
            return []

        # Mix old and new papers for better contradiction detection.
        # Contradictions most often occur between older established
        # papers and newer challenging findings.
        current_year = 2024
        old = sorted(
            [p for p in papers if p.get("year", 0) < current_year - 4],
            key=lambda p: p.get("citation_count", 0),
            reverse=True
        )
        new = sorted(
            [p for p in papers if p.get("year", 0) >= current_year - 4],
            key=lambda p: p.get("citation_count", 0),
            reverse=True
        )

        # Take mix: up to 10 old + 10 new = max 20 for NLI
        sample = old[:10] + new[:10]

        # Filter: must have abstract of meaningful length
        sample = [p for p in sample
                  if p.get("abstract") and
                  len(p.get("abstract", "")) > 80]

        return sample

    except Exception as e:
        print(f"Paper fetch for NLI error: {e}")
        return []

def run_nli_on_pairs(papers, max_pairs=5):
    """
    Run DeBERTa NLI on paper pairs.
    max_pairs: hard cap per cluster pair to keep NLI fast on
    Render's limited CPU.
    """
    if len(papers) < 2:
        return []

    model = load_nli_model()
    contradictions = []

    # Prioritize old vs new pairs (most likely to contradict)
    current_year = 2024
    old_papers = [p for p in papers
                  if p.get("year", 0) < current_year - 4]
    new_papers = [p for p in papers
                  if p.get("year", 0) >= current_year - 4]

    targeted_pairs = []
    for old in old_papers[:5]:
        for new in new_papers[:5]:
            targeted_pairs.append((old, new))

    all_pairs = list(combinations(papers, 2))
    remaining = [p for p in all_pairs if p not in targeted_pairs]

    final_pairs = (targeted_pairs + remaining)[:max_pairs]

    total = len(final_pairs)
    for i, (paper_a, paper_b) in enumerate(final_pairs):
        abstract_a = paper_a.get("abstract", "")
        abstract_b = paper_b.get("abstract", "")

        if not abstract_a or not abstract_b:
            continue

        abstract_a = abstract_a[:400]
        abstract_b = abstract_b[:400]

        print(f"Checked pair {i+1}/{total}")

        try:
            import numpy as np
            from scipy.special import softmax

            scores = model.predict([(abstract_a, abstract_b)])
            probs = softmax(scores[0])

            # DeBERTa label order: 0=contradiction, 1=entailment, 2=neutral
            contradiction_score = float(probs[0])
            entailment_score = float(probs[1])

            # Threshold lowered from 0.5 → 0.35 for scientific text:
            # DeBERTa was trained on general text and scores lower
            # on technical/scientific contradictions.
            if contradiction_score > 0.35:
                contradictions.append({
                    "paper_a_id": paper_a.get("openalex_id", ""),
                    "paper_b_id": paper_b.get("openalex_id", ""),
                    "paper_a_title": paper_a.get("title", ""),
                    "paper_b_title": paper_b.get("title", ""),
                    "paper_a_abstract_snippet":
                        abstract_a[:200] + "...",
                    "paper_b_abstract_snippet":
                        abstract_b[:200] + "...",
                    "contradiction_score": round(
                        contradiction_score, 3),
                    "entailment_score": round(entailment_score, 3)
                })
        except Exception as e:
            print(f"NLI inference error on pair {i+1}: {e}")
            continue

    return sorted(contradictions,
                  key=lambda c: c["contradiction_score"],
                  reverse=True)[:3]  # Return top 3 only

def detect_contradictions(papers, topic_slug):
    """Legacy interface — kept for compatibility."""
    return run_nli_on_pairs(papers[:20], max_pairs=5)

def analyze_contradictions_for_gaps(
    gaps, topic_slug, admin_client
):
    """
    Main function called from graph_analyzer.py.

    For each gap:
    1. Check Supabase cache first (instant if cached)
    2. If not cached: fetch broader paper sample from DB
    3. Run NLI with hard cap of 5 pairs per gap
    4. Save results to cache

    Total NLI pairs across all 6 gaps: max 25
    On Render CPU: ~30 seconds for fresh run
    On cache hit: <1 second
    """
    total_nli_calls = 0
    MAX_TOTAL_NLI = 25  # Hard cap across ALL gaps for Render

    for gap in gaps:
        cluster_a_id = gap.get("cluster_a_id", 0)
        cluster_b_id = gap.get("cluster_b_id", 0)

        # ── CHECK CACHE FIRST ─────────────────────────────
        cached, cached_contradictions = check_contradiction_cache(
            topic_slug, cluster_a_id, cluster_b_id, admin_client
        )

        if cached:
            print(f"Contradiction cache HIT for clusters "
                  f"{cluster_a_id}/{cluster_b_id}")
            gap["contradictions"] = cached_contradictions
            gap["contradiction_count"] = len(cached_contradictions)
            gap["has_active_debate"] = len(cached_contradictions) > 0
            continue
        # ── END CACHE CHECK ───────────────────────────────

        if total_nli_calls >= MAX_TOTAL_NLI:
            print(f"NLI cap reached ({MAX_TOTAL_NLI}) — "
                  f"skipping remaining gaps")
            gap["contradictions"] = []
            gap["contradiction_count"] = 0
            gap["has_active_debate"] = False
            continue

        # ── FETCH BROADER PAPER SAMPLE ────────────────────
        # Bug fix for large topics: fetch up to 40 papers per
        # cluster from the DB instead of using only the 3 top
        # papers stored in the gap card.
        top_a = gap.get("top_papers_a", [])
        top_b = gap.get("top_papers_b", [])

        all_paper_ids_a = [p.get("openalex_id", p.get("id", ""))
                           for p in top_a if p]
        all_paper_ids_b = [p.get("openalex_id", p.get("id", ""))
                           for p in top_b if p]

        papers_a_full = fetch_papers_for_nli(
            topic_slug, all_paper_ids_a, admin_client, limit=20
        )
        papers_b_full = fetch_papers_for_nli(
            topic_slug, all_paper_ids_b, admin_client, limit=20
        )

        all_papers_for_nli = papers_a_full + papers_b_full

        if len(all_papers_for_nli) < 2:
            gap["contradictions"] = []
            gap["contradiction_count"] = 0
            gap["has_active_debate"] = False
            save_contradiction_cache(
                [], topic_slug, cluster_a_id,
                cluster_b_id, admin_client
            )
            continue
        # ── END PAPER FETCH ───────────────────────────────

        # ── RUN NLI ───────────────────────────────────────
        pairs_this_gap = min(5, MAX_TOTAL_NLI - total_nli_calls)
        contradictions = run_nli_on_pairs(
            all_papers_for_nli,
            max_pairs=pairs_this_gap
        )
        total_nli_calls += pairs_this_gap
        # ── END NLI ───────────────────────────────────────

        # ── SAVE TO CACHE ─────────────────────────────────
        save_contradiction_cache(
            contradictions, topic_slug,
            cluster_a_id, cluster_b_id, admin_client
        )
        # ── END CACHE SAVE ────────────────────────────────

        gap["contradictions"] = contradictions
        gap["contradiction_count"] = len(contradictions)
        gap["has_active_debate"] = len(contradictions) > 0

    return gaps

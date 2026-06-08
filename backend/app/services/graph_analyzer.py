import networkx as nx
import community as community_louvain
from datetime import datetime
import re

def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities from paper titles"""
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', '', text)
    clean = clean.replace('&amp;', '&')\
                 .replace('&lt;', '<')\
                 .replace('&gt;', '>')\
                 .replace('&quot;', '"')\
                 .replace('&#39;', "'")\
                 .replace('&nbsp;', ' ')
    return clean.strip()

def build_networkx_graph(topic_slug: str, admin_client) -> nx.DiGraph:
    # Fetch all citation edges for topic_slug
    edges_res = admin_client.table("citation_edges") \
        .select("citing_paper_id, cited_paper_id") \
        .eq("topic_slug", topic_slug) \
        .execute()
    
    # Fetch all papers for topic_slug
    papers_res = admin_client.table("paper_metadata") \
        .select("openalex_id, year, citation_count") \
        .eq("topic_slug", topic_slug) \
        .execute()
        
    papers = papers_res.data or []
    edges = edges_res.data or []
    
    G = nx.DiGraph()
    
    # Add nodes with attributes
    for p in papers:
        G.add_node(
            p["openalex_id"],
            year=(p.get("year") or 0),
            citation_count=(p.get("citation_count") or 0)
        )
        
    # Add edges
    for edge in edges:
        G.add_edge(edge["citing_paper_id"], edge["cited_paper_id"])
        
    print(f"Graph built: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    return G

def detect_communities(G: nx.DiGraph) -> dict:
    if G.number_of_nodes() == 0:
        return {"partition": {}, "num_communities": 0, "community_sizes": {}}
        
    G_undirected = G.to_undirected()
    partition = community_louvain.best_partition(G_undirected)
    
    # Calculate sizes
    raw_sizes = {}
    for node, comm_id in partition.items():
        raw_sizes[comm_id] = raw_sizes.get(comm_id, 0) + 1
        
    # Filter out communities with fewer than 5 papers
    valid_communities = {comm_id for comm_id, size in raw_sizes.items() if size >= 5}
    
    filtered_partition = {
        node: comm_id 
        for node, comm_id in partition.items() 
        if comm_id in valid_communities
    }
    
    community_sizes = {
        comm_id: raw_sizes[comm_id] 
        for comm_id in valid_communities
    }
    
    return {
        "partition": filtered_partition,
        "num_communities": len(valid_communities),
        "community_sizes": community_sizes
    }

def compute_gap_score(
    cluster_a_papers: list[dict],
    cluster_b_papers: list[dict],
    bridge_papers: list[dict],
    G: nx.DiGraph
) -> float:
    # 1. DENSITY SCORE (0-100)
    denom = len(cluster_a_papers) + len(cluster_b_papers)
    gap_density = len(bridge_papers) / denom if denom > 0 else 0
    density_score = max(0, 100 - (gap_density * 1000))
    
    # 2. VELOCITY SCORE (0-100)
    # Use combined cluster population so large clusters don't produce
    # unstable ratios from the 3-paper display sample.
    all_papers_for_velocity = list(cluster_a_papers) + list(cluster_b_papers)
    if all_papers_for_velocity:
        current_year = datetime.now().year
        recent = [p for p in all_papers_for_velocity
                  if (p.get("year") or 0) >= current_year - 5]
        recent_ratio = len(recent) / len(all_papers_for_velocity)
        # Multiply by 1.5 to amplify signal — recent papers are always
        # underrepresented in citation data (not yet widely cited).
        velocity_score = min(100, recent_ratio * 150)
    else:
        velocity_score = 30.0  # neutral default
    
    # 3. BRIDGE SCORE (0-100)
    set_a = {p["openalex_id"] for p in cluster_a_papers}
    set_b = {p["openalex_id"] for p in cluster_b_papers}
    
    boundary_papers = []
    for p_id in set_a:
        has_edge = False
        if G.has_node(p_id):
            # Citing from A to B
            for nbr in G.successors(p_id):
                if nbr in set_b:
                    has_edge = True
                    break
            # Citing from B to A
            if not has_edge:
                for nbr in G.predecessors(p_id):
                    if nbr in set_b:
                        has_edge = True
                        break
        if has_edge:
            p_dict = next((p for p in cluster_a_papers if p["openalex_id"] == p_id), None)
            if p_dict:
                boundary_papers.append(p_dict)
                
    if not boundary_papers:
        bridge_score = 50.0
    else:
        avg_citations = sum((p.get("citation_count") or 0) for p in boundary_papers) / len(boundary_papers)
        bridge_score = min(100.0, avg_citations / 10.0)
        
    # FINAL SCORE
    gap_score = (density_score * 0.4) + (velocity_score * 0.4) + (bridge_score * 0.2)
    return round(gap_score, 1)

def generate_gap_label(papers_a: list[dict], 
                       papers_b: list[dict]) -> str:
    
    def clean_title_to_topic(papers: list[dict]) -> str:
        if not papers:
            return "Unknown Topic"
        
        # get highest cited paper title
        top_paper = max(papers, key=lambda p: (p.get("citation_count") or 0))
        title = strip_html(top_paper.get("title", "") or "")
        
        # remove common filler words from end
        stop_endings = [
            "in", "of", "the", "a", "an", "and", "or", 
            "for", "with", "on", "at", "to", "from", "by",
            "using", "via", "based", "through", "across"
        ]
        
        # take first 5 words
        words = title.split()[:5]
        
        # remove trailing stop words
        while words and words[-1].lower() in stop_endings:
            words.pop()
        
        # if nothing left after cleaning, use first 3 words as-is
        if not words:
            words = title.split()[:3]
        
        return " ".join(words)
    
    topic_a = clean_title_to_topic(papers_a)
    topic_b = clean_title_to_topic(papers_b)
    return f"Gap between '{topic_a}' and '{topic_b}'"

def find_gaps(
    topic_slug: str,
    admin_client,
    min_gap_score: float = 15.0
) -> list[dict]:
    # ── CACHE CHECK (runs in <100ms) ──────────────────────
    try:
        from datetime import datetime, timezone
        import json as _json
        cache_result = admin_client.table("gap_cache")\
            .select("gaps_json,computed_at,expires_at")\
            .eq("topic_slug", topic_slug)\
            .execute()

        if cache_result.data:
            row = cache_result.data[0]
            expires_at = row.get("expires_at", "")
            if expires_at:
                try:
                    exp = datetime.fromisoformat(
                        expires_at.replace("Z", "+00:00")
                    )
                    now = datetime.now(timezone.utc)
                    if now < exp:
                        print(f"Cache HIT for {topic_slug} — "
                              f"returning instantly")
                        gaps = row["gaps_json"]
                        if isinstance(gaps, str):
                            gaps = _json.loads(gaps)
                        return gaps
                    else:
                        print(f"Cache EXPIRED for {topic_slug} — "
                              f"recomputing")
                except Exception as parse_err:
                    print(f"Cache parse error: {parse_err}")
    except Exception as cache_err:
        print(f"Cache check error (non-critical): {cache_err}")
    # ── END CACHE CHECK ───────────────────────────────────

    # STEP A: build_networkx_graph
    G = build_networkx_graph(topic_slug, admin_client)
    
    # STEP B: detect_communities
    communities = detect_communities(G)
    partition = communities["partition"]
    
    # Fetch detailed papers
    papers_res = admin_client.table("paper_metadata") \
        .select("openalex_id, title, year, citation_count") \
        .eq("topic_slug", topic_slug) \
        .execute()
    papers_list = papers_res.data or []
    for p in papers_list:
        if "title" in p:
            p["title"] = strip_html(p["title"] or "")
    
    # STEP C: group papers by community
    community_papers = {}
    for p in papers_list:
        p_id = p["openalex_id"]
        if p_id in partition:
            comm_id = partition[p_id]
            if comm_id not in community_papers:
                community_papers[comm_id] = []
            community_papers[comm_id].append(p)
            
    community_ids = list(community_papers.keys())
    all_gaps = []

    # STEP D: score ALL community pairs first, filter after
    for idx_a in range(len(community_ids)):
        for idx_b in range(idx_a + 1, len(community_ids)):
            A = community_ids[idx_a]
            B = community_ids[idx_b]

            set_a = {p["openalex_id"] for p in community_papers[A]}
            set_b = {p["openalex_id"] for p in community_papers[B]}

            # Find bridge papers (papers that cite both A and B)
            bridge_papers = []
            for p in papers_list:
                p_id = p["openalex_id"]
                if G.has_node(p_id):
                    citations = list(G.successors(p_id))
                    has_a = any(c in set_a for c in citations)
                    has_b = any(c in set_b for c in citations)
                    if has_a and has_b:
                        bridge_papers.append(p)

            # STEP E: score community pair
            score = compute_gap_score(
                cluster_a_papers=community_papers[A],
                cluster_b_papers=community_papers[B],
                bridge_papers=bridge_papers,
                G=G
            )

            top_a = sorted(community_papers[A], key=lambda x: (x.get("citation_count") or 0), reverse=True)
            top_b = sorted(community_papers[B], key=lambda x: (x.get("citation_count") or 0), reverse=True)

            all_gaps.append({
                "gap_id": f"gap_{topic_slug}_{A}_{B}",
                "topic_slug": topic_slug,
                "cluster_a_id": A,
                "cluster_b_id": B,
                "cluster_a_size": len(community_papers[A]),
                "cluster_b_size": len(community_papers[B]),
                "bridge_paper_count": len(bridge_papers),
                "gap_score": score,
                "gap_label": generate_gap_label(community_papers[A], community_papers[B]),
                "top_papers_a": top_a[:50],
                "top_papers_b": top_b[:50]
            })

    # STEP F: sort by score desc
    all_gaps.sort(key=lambda x: x["gap_score"], reverse=True)

    # STEP G: filter by threshold; fallback to top 3 for dense graphs
    filtered_gaps = [g for g in all_gaps if g["gap_score"] >= min_gap_score]

    if len(filtered_gaps) == 0 and len(all_gaps) > 0:
        print(f"No gaps above threshold {min_gap_score}. "
              f"Returning top 3 as fallback.")
        filtered_gaps = all_gaps[:3]

    gaps = filtered_gaps[:6]
    
    # STEP H: Enrich gaps with contradiction detection and trend forecasting
    from app.services.contradiction_detector import analyze_contradictions_for_gaps
    from app.services.trend_forecaster import add_forecasts_to_gaps
    
    print("Running contradiction detection...")
    gaps = analyze_contradictions_for_gaps(gaps, topic_slug, admin_client)
    
    print("Running trend forecasting...")
    gaps = add_forecasts_to_gaps(gaps, topic_slug=topic_slug, admin_client=admin_client)
    
    # STEP I: Enrich gaps with LLM explanations
    from app.services.llm_explainer import explain_all_gaps
    print("Generating LLM explanations for top gaps...")
    gaps = explain_all_gaps(gaps)

    # ── SAVE TO CACHE (only non-empty results) ───────────
    if gaps:
        try:
            from datetime import datetime, timezone, timedelta
            admin_client.table("gap_cache").upsert({
                "topic_slug": topic_slug,
                "gaps_json": gaps,
                "paper_count": len(gaps),
                "computed_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(hours=24)
                ).isoformat()
            }, on_conflict="topic_slug").execute()
            print(f"Gap results cached for {topic_slug}: {len(gaps)} gaps")
        except Exception as save_err:
            print(f"Cache save error (non-critical): {save_err}")
    else:
        print(f"No gaps found for {topic_slug} — NOT caching empty result")
    # ── END CACHE SAVE ────────────────────────────────────

    return gaps



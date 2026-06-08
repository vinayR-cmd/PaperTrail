import asyncio
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.embedder import query_similar_papers
from app.services.graph_analyzer import find_gaps
from app.services.llm_explainer import explain_gap, generate_research_brief
from app.core.database import get_admin_client

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    topic_slug: str
    n_results: int = 20

class GapRequest(BaseModel):
    topic_slug: str
    min_score: float = 15.0

class SingleGapRequest(BaseModel):
    gap: dict

class BriefRequest(BaseModel):
    gap: dict

class InterGapRequest(BaseModel):
    topic_a: str
    topic_b: str
    max_papers: int = 1000

@router.get("/ping")
def ping():
    return {"router": "search", "status": "ready"}

@router.post("/")
def search(request: SearchRequest):
    try:
        # Call query_similar_papers fetching up to 200 candidate papers
        results = query_similar_papers(request.query, request.topic_slug, n_results=200)
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not embedded yet"
            )
        return results[:request.n_results]
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during search: {str(e)}"
        )

@router.post("/gaps")
def get_gaps(request: GapRequest):
    try:
        admin_client = get_admin_client()
        gaps_list = find_gaps(request.topic_slug, admin_client, request.min_score)
        if not gaps_list:
            return {
                "topic_slug": request.topic_slug,
                "gaps": [],
                "message": "No significant gaps found"
            }
        return {"topic_slug": request.topic_slug, "gaps": gaps_list}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while finding gaps: {str(e)}"
        )

@router.get("/gaps/{topic_slug}/summary")
def get_gaps_summary(topic_slug: str):
    try:
        admin_client = get_admin_client()
        gaps = find_gaps(topic_slug, admin_client)
        
        urgent_gaps = sum(1 for gap in gaps if gap.get("combined_urgency") == "URGENT")
        gaps_with_contradictions = sum(1 for gap in gaps if gap.get("has_active_debate"))
        
        return {
            "topic_slug": topic_slug,
            "total_gaps": len(gaps),
            "urgent_gaps": urgent_gaps,
            "gaps_with_contradictions": gaps_with_contradictions,
            "top_gap": gaps[0] if gaps else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating gaps summary: {str(e)}"
        )

@router.post("/explain-gap")
def explain_single_gap(request: SingleGapRequest):
    try:
        enriched_gap = explain_gap(request.gap)
        return enriched_gap
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating explanation: {str(e)}"
        )

@router.post("/generate-brief")
def generate_brief(request: BriefRequest):
    try:
        brief = generate_research_brief(request.gap)
        return brief
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating research brief: {str(e)}"
        )

@router.delete("/cache/{topic_slug}")
def clear_topic_cache(topic_slug: str):
    """Clear all caches for a topic — forces fresh recompute on next search."""
    try:
        admin = get_admin_client()
        admin.table("gap_cache")\
            .delete().eq("topic_slug", topic_slug).execute()
        admin.table("paper_contradictions")\
            .delete().eq("topic_slug", topic_slug).execute()
        admin.table("prophet_cache")\
            .delete().eq("topic_slug", topic_slug).execute()
        return {
            "status": "cleared",
            "topic_slug": topic_slug,
            "message": "All caches cleared. Next search will recompute."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interdisciplinary")
async def find_interdisciplinary_gaps(request: InterGapRequest):
    """Find gaps at the intersection of two research fields."""
    try:
        from app.services.openalex_fetcher import index_topic
        from app.services.llm_explainer import call_groq_llm
        import networkx as nx

        admin = get_admin_client()

        slug_a = request.topic_a.lower().strip().replace(' ', '-')
        slug_b = request.topic_b.lower().strip().replace(' ', '-')

        # Ensure both topics are indexed
        for slug, label in [(slug_a, request.topic_a), (slug_b, request.topic_b)]:
            res = admin.table('topic_registry').select('topic_slug').eq('topic_slug', slug).execute()
            if not res.data:
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda l=label: index_topic(l, admin, request.max_papers)
                )

        # Fetch papers from both topics
        papers_a = admin.table('paper_metadata')\
            .select('openalex_id,title,abstract,year,citation_count')\
            .eq('topic_slug', slug_a).execute().data or []
        papers_b = admin.table('paper_metadata')\
            .select('openalex_id,title,abstract,year,citation_count')\
            .eq('topic_slug', slug_b).execute().data or []

        ids_a = set(p['openalex_id'] for p in papers_a)
        ids_b = set(p['openalex_id'] for p in papers_b)
        bridge_ids = ids_a.intersection(ids_b)

        # Fetch citation edges for both topics
        edges_a = admin.table('citation_edges')\
            .select('citing_paper_id,cited_paper_id')\
            .eq('topic_slug', slug_a).execute().data or []
        edges_b = admin.table('citation_edges')\
            .select('citing_paper_id,cited_paper_id')\
            .eq('topic_slug', slug_b).execute().data or []

        # Build merged graph
        G = nx.DiGraph()
        all_papers = {p['openalex_id']: p for p in papers_a + papers_b}
        for p in all_papers.values():
            G.add_node(p['openalex_id'],
                field='a' if p['openalex_id'] in ids_a else 'b')

        for e in edges_a + edges_b:
            if e['citing_paper_id'] in G.nodes and e['cited_paper_id'] in G.nodes:
                G.add_edge(e['citing_paper_id'], e['cited_paper_id'])

        # Count cross-field citations
        cross_a_b = sum(
            1 for u, v in G.edges()
            if G.nodes[u].get('field') == 'a' and G.nodes[v].get('field') == 'b'
        )
        cross_b_a = sum(
            1 for u, v in G.edges()
            if G.nodes[u].get('field') == 'b' and G.nodes[v].get('field') == 'a'
        )
        total_cross = cross_a_b + cross_b_a
        total_possible = len(papers_a) * len(papers_b)
        intersection_density = total_cross / max(total_possible, 1)
        gap_score = round(max(0, 100 - intersection_density * 10000), 1)

        top_a = sorted(papers_a, key=lambda p: p.get('citation_count', 0), reverse=True)[:5]
        top_b = sorted(papers_b, key=lambda p: p.get('citation_count', 0), reverse=True)[:5]

        prompt = f"""You are a research intelligence assistant.
Two research fields are being analyzed for intersection gaps.

Field A: {request.topic_a}
Top papers: {[p.get('title','') for p in top_a[:3]]}

Field B: {request.topic_b}
Top papers: {[p.get('title','') for p in top_b[:3]]}

Cross-citations found: {total_cross}
Bridge papers (in both): {len(bridge_ids)}
Intersection gap score: {gap_score}/100

Return ONLY valid JSON:
{{
  "gap_explanation": "2-3 sentences explaining the knowledge gap at the intersection of these two fields",
  "opportunity": "1-2 sentences on the research opportunity this represents",
  "research_question": "One specific interdisciplinary research question bridging both fields",
  "methodology": "2 sentences suggesting a methodology drawing from both fields",
  "why_unique": "1 sentence on why this cross-field gap is especially valuable"
}}"""

        llm_result = call_groq_llm(prompt)

        return {
            "topic_a": request.topic_a,
            "topic_b": request.topic_b,
            "slug_a": slug_a,
            "slug_b": slug_b,
            "gap_score": gap_score,
            "papers_in_a": len(papers_a),
            "papers_in_b": len(papers_b),
            "cross_citations": total_cross,
            "bridge_papers": len(bridge_ids),
            "top_papers_a": top_a,
            "top_papers_b": top_b,
            "llm_explanation": llm_result.get('gap_explanation', ''),
            "llm_opportunity": llm_result.get('opportunity', ''),
            "llm_research_question": llm_result.get('research_question', ''),
            "llm_methodology": llm_result.get('methodology', ''),
            "llm_why_unique": llm_result.get('why_unique', ''),
            "status": "success"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interdisciplinary analysis failed: {str(e)}"
        )





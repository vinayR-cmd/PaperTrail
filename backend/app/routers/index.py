from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.openalex_fetcher import index_topic
from app.services.embedder import embed_papers_for_topic, get_collection_stats
from app.core.database import get_admin_client, get_anon_client
import threading
from datetime import datetime, timezone, timedelta

router = APIRouter()

class IndexRequest(BaseModel):
    topic: str
    max_papers: int = 1000

class EmbedRequest(BaseModel):
    topic_slug: str

class CitationEdgeRequest(BaseModel):
    topic_slug: str

@router.get("/ping")
def ping():
    return {"router": "index", "status": "ready"}

@router.post("/topic")
def index_topic_endpoint(request: IndexRequest):
    admin_client = get_admin_client()
    try:
        result = index_topic(request.topic, admin_client, request.max_papers)
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )

@router.get("/topics")
def get_topics():
    anon_client = get_anon_client()
    try:
        response = anon_client.table("topic_registry").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch topics: {str(e)}"
        )

@router.get("/status/{topic_slug}")
def get_topic_status(topic_slug: str):
    anon_client = get_anon_client()
    try:
        response = anon_client.table("topic_registry").select("*").eq("topic_slug", topic_slug).execute()
        if response.data:
            return {"indexed": True, "details": response.data[0]}
        else:
            return {"indexed": False, "details": None}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check topic status: {str(e)}"
        )


@router.post("/embed")
def embed_topic_endpoint(request: EmbedRequest):
    admin_client = get_admin_client()
    
    # Check if any papers exist for this topic
    papers_check = admin_client.table("paper_metadata").select("openalex_id").eq("topic_slug", request.topic_slug).limit(1).execute()
    if not papers_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not indexed yet. Run /index/topic first."
        )
        
    try:
        result = embed_papers_for_topic(request.topic_slug, admin_client)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during embedding: {str(e)}"
        )

@router.get("/chroma-stats")
def get_chroma_stats_endpoint():
    try:
        admin_client = get_admin_client()
        return get_collection_stats(admin_client)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}"
        )

@router.post("/citation-edges")
def build_citation_edges_endpoint(request: CitationEdgeRequest):
    """
    Build citation edges for a topic if not already built.
    Returns instantly if edges already exist.
    """
    admin_client = get_admin_client()
    try:
        from app.services.citation_fetcher import (
            build_citation_edges_for_topic
        )

        # Check if edges already exist — return instantly if so
        existing = admin_client.table("citation_edges")\
            .select("id")\
            .eq("topic_slug", request.topic_slug)\
            .limit(5)\
            .execute()

        if len(existing.data) >= 5:
            return {
                "status": "already_built",
                "topic_slug": request.topic_slug,
                "message": "Citation edges already exist"
            }

        # Build edges for new topic
        result = build_citation_edges_for_topic(
            request.topic_slug, admin_client
        )
        return result

    except Exception as e:
        # Non-fatal — return error info but don't crash
        # Frontend will continue and try gap detection anyway
        return {
            "status": "error",
            "topic_slug": request.topic_slug,
            "message": str(e)
        }


class RefreshRequest(BaseModel):
    topic_slug: str
    force: bool = False  # if True, refresh even if not 30 days old

def _background_refresh(topic_slug: str, topic_label: str, admin_client):
    """
    Runs in a background thread.
    Re-fetches papers, rebuilds citation edges, clears gap cache.
    User is never blocked by this.
    """
    try:
        print(f"[Background Refresh] Starting refresh for {topic_slug}")
        
        from app.services.openalex_fetcher import (
            resolve_concept_id,
            fetch_papers_for_concept,
            store_papers_in_supabase,
            build_edges_from_papers
        )
        
        # Step 1: Re-fetch latest 1000 papers from OpenAlex
        # Uses upsert so existing papers get updated citation counts
        # New papers get added, old ones remain (safe merge)
        concept_id, concept_label = resolve_concept_id(
            topic_label or topic_slug.replace('-', ' ')
        )
        
        papers = fetch_papers_for_concept(concept_id, topic_slug, 1000)
        
        # Step 2: Build citation edges from fresh data
        build_edges_from_papers(papers, topic_slug, admin_client)
        
        # Step 3: Store/update papers in Supabase
        # upsert with on_conflict="openalex_id" updates existing rows
        stored = store_papers_in_supabase(papers, admin_client)
        
        # Step 4: Clear gap_cache so next search recomputes gaps
        admin_client.table("gap_cache")\
            .delete()\
            .eq("topic_slug", topic_slug)\
            .execute()
        
        # Step 5: Update last_refreshed_at in topic_registry
        admin_client.table("topic_registry").update({
            "last_refreshed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "paper_count": stored
        }).eq("topic_slug", topic_slug).execute()
        
        print(f"[Background Refresh] Complete for {topic_slug}: "
              f"{stored} papers updated")
              
    except Exception as e:
        print(f"[Background Refresh] Failed for {topic_slug}: {e}")
        import traceback
        traceback.print_exc()

@router.post("/refresh")
def refresh_topic(request: RefreshRequest):
    """
    Check if topic needs refresh (>30 days old).
    If yes, trigger background refresh and return immediately.
    User is never blocked.
    """
    admin_client = get_admin_client()
    
    try:
        # Get topic info
        result = admin_client.table("topic_registry")\
            .select("*")\
            .eq("topic_slug", request.topic_slug)\
            .execute()
        
        if not result.data:
            return {
                "status": "not_found",
                "topic_slug": request.topic_slug,
                "needs_refresh": False
            }
        
        topic = result.data[0]
        topic_label = topic.get("topic_label") or \
                      request.topic_slug.replace('-', ' ')
        
        # Check if refresh needed
        last_refreshed = topic.get("last_refreshed_at") or \
                         topic.get("indexed_at")
        
        needs_refresh = request.force  # Force refresh if requested
        
        if not needs_refresh and last_refreshed:
            try:
                last_dt = datetime.fromisoformat(
                    last_refreshed.replace("Z", "+00:00")
                )
                days_old = (datetime.now(timezone.utc) - last_dt).days
                needs_refresh = days_old >= 30
            except Exception:
                needs_refresh = True
        
        if not needs_refresh:
            days_old = 0
            if last_refreshed:
                try:
                    last_dt = datetime.fromisoformat(
                        last_refreshed.replace("Z", "+00:00")
                    )
                    days_old = (datetime.now(timezone.utc) - last_dt).days
                except Exception:
                    pass
            return {
                "status": "fresh",
                "topic_slug": request.topic_slug,
                "needs_refresh": False,
                "days_old": days_old,
                "message": f"Data is {days_old} days old — no refresh needed"
            }
        
        # Trigger background refresh — non-blocking
        thread = threading.Thread(
            target=_background_refresh,
            args=(request.topic_slug, topic_label, admin_client),
            daemon=True
        )
        thread.start()
        
        return {
            "status": "refresh_started",
            "topic_slug": request.topic_slug,
            "needs_refresh": True,
            "message": "Background refresh started. "
                       "Results will update on next search."
        }
        
    except Exception as e:
        return {
            "status": "error",
            "topic_slug": request.topic_slug,
            "message": str(e)
        }

@router.get("/freshness/{topic_slug}")
def get_topic_freshness(topic_slug: str):
    """
    Returns how old the topic data is and when it was last refreshed.
    Used by frontend to show 'Last updated X days ago' label.
    """
    admin_client = get_admin_client()
    
    try:
        result = admin_client.table("topic_registry")\
            .select("topic_slug,topic_label,indexed_at,last_refreshed_at,paper_count")\
            .eq("topic_slug", topic_slug)\
            .execute()
        
        if not result.data:
            return {"found": False}
        
        topic = result.data[0]
        last_refreshed = topic.get("last_refreshed_at") or \
                         topic.get("indexed_at")
        
        days_old = 0
        if last_refreshed:
            try:
                last_dt = datetime.fromisoformat(
                    last_refreshed.replace("Z", "+00:00")
                )
                days_old = (datetime.now(timezone.utc) - last_dt).days
            except Exception:
                days_old = 0
        
        needs_refresh = days_old >= 30
        
        if days_old == 0:
            freshness_label = "Updated today"
        elif days_old == 1:
            freshness_label = "Updated yesterday"
        elif days_old < 7:
            freshness_label = f"Updated {days_old} days ago"
        elif days_old < 30:
            weeks = days_old // 7
            freshness_label = f"Updated {weeks} week{'s' if weeks > 1 else ''} ago"
        else:
            months = days_old // 30
            freshness_label = f"Updated {months} month{'s' if months > 1 else ''} ago"
        
        return {
            "found": True,
            "topic_slug": topic_slug,
            "topic_label": topic.get("topic_label"),
            "paper_count": topic.get("paper_count"),
            "days_old": days_old,
            "needs_refresh": needs_refresh,
            "freshness_label": freshness_label,
            "last_refreshed_at": last_refreshed
        }
        
    except Exception as e:
        return {"found": False, "error": str(e)}


@router.get("/admin/search-history")
def get_all_search_history():
    admin_client = get_admin_client()
    try:
        response = admin_client.table("search_history").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch search history: {str(e)}"
        )


@router.get("/admin/saved-gaps")
def get_all_saved_gaps():
    admin_client = get_admin_client()
    try:
        response = admin_client.table("saved_gaps").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch saved gaps: {str(e)}"
        )


@router.get("/admin/overview-stats")
def get_admin_overview_stats():
    admin_client = get_admin_client()
    try:
        users_res = admin_client.table("profiles").select("id").execute()
        gaps_res = admin_client.table("saved_gaps").select("id").execute()
        return {
            "users": len(users_res.data) if users_res.data else 0,
            "gaps": len(gaps_res.data) if gaps_res.data else 0
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admin overview stats: {str(e)}"
        )


@router.get("/admin/gap-cache")
def get_all_gap_cache():
    admin_client = get_admin_client()
    try:
        response = admin_client.table("gap_cache").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch gap cache: {str(e)}"
        )


@router.get("/admin/profiles")
def get_all_profiles():
    admin_client = get_admin_client()
    try:
        response = admin_client.table("profiles").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profiles: {str(e)}"
        )


@router.get("/admin/contradictions")
def get_all_contradictions():
    admin_client = get_admin_client()
    try:
        response = admin_client.table("paper_contradictions").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch contradictions: {str(e)}"
        )





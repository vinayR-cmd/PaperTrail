import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import search, index
from app.core.database import get_anon_client

FRONTEND_URL = os.getenv(
    "FRONTEND_URL", "http://localhost:5173"
)

app = FastAPI(title="PaperTrail API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/search")
app.include_router(index.router, prefix="/index")

@app.get("/")
def health_check():
    """Basic health check"""
    return {
        "status": "ok",
        "project": "PaperTrail",
        "version": "1.0.0",
        "vector_store": "Supabase pgvector"
    }

@app.get("/health")
def detailed_health():
    """Detailed health check with vector count"""
    try:
        from app.services.embedder import get_collection_stats
        stats = get_collection_stats()
        return {
            "status": "ok",
            "project": "PaperTrail",
            "version": "1.0.0",
            "vector_store": "Supabase pgvector (persistent)",
            "total_vectors": stats.get("total_vectors", 0),
            "chroma_dependency": False
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e)
        }

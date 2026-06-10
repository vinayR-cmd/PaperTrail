import os
import logging

# Silence heavy library logs before any imports
logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
logging.getLogger("transformers").setLevel(logging.ERROR)

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["TRANSFORMERS_OFFLINE"] = "0"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import search, index
from app.core.database import get_anon_client

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

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
    return {
        "status": "ok",
        "project": "PaperTrail",
        "version": "1.0.0",
        "vector_store": "Supabase pgvector"
    }

@app.get("/health")
def detailed_health():
    try:
        from app.services.embedder import get_collection_stats
        from app.core.database import get_admin_client
        admin = get_admin_client()
        stats = get_collection_stats(admin)
        return {
            "status": "ok",
            "total_vectors": stats.get("total_vectors", 0),
            "chroma_dependency": False,
            "vector_store": "Supabase pgvector (persistent)"
        }
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

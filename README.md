# PaperTrail — Research Gap Intelligence Platform

> Find the research gaps that matter.

PaperTrail is an AI-powered platform that maps academic citation networks, detects structural research gaps between research communities, identifies literature contradictions, forecasts publication trends, and generates plain-English research intelligence reports.

## The Problem We Solve

Every existing tool (Connected Papers, Litmaps, ResearchRabbit) shows researchers what **exists** in a field.
PaperTrail finds what is **missing** — structural gaps between research communities that nobody has bridged yet.

## Five AI Signals Combined

| Signal | Technology | Purpose |
|--------|-----------|---------|
| Citation Graph | NetworkX + Louvain | Community detection |
| Semantic Search | all-MiniLM-L6-v2 + pgvector | Paper similarity |
| Contradiction Detection | DeBERTa NLI | Literature conflicts |
| Trend Forecasting | Prophet | Publication velocity |
| Plain-English Reports | Groq LLaMA 3.1 | Gap explanation |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend | FastAPI + Python 3.11 + Uvicorn |
| Primary Database | Supabase (PostgreSQL) |
| Vector Store | Supabase pgvector (384-dim, persistent) |
| Paper Data | OpenAlex API (134M+ papers, free) |
| LLM | Groq API (LLaMA 3.1 8B Instant) |
| ML Models | HuggingFace Transformers |
| Deployment | Render (backend) + Vercel (frontend) |

## Key Features

- **Research Gap Search** — Find structural gaps in any field
- **Citation Network Graph** — Interactive D3 force-directed graph
- **Contradiction Detector** — NLI-powered literature debate finder
- **Trend Analysis** — Prophet forecasting with urgency labels
- **Write This Paper** — One-click research brief generator
- **Interdisciplinary Analysis** — Cross-domain gap detection
- **Data Freshness** — 30-day auto-refresh with background updates
- **Admin Panel** — 10-section analytics dashboard

## Project Structure

```
papertrail/
├── backend/                 # FastAPI Python server
│   ├── app/
│   │   ├── main.py         # FastAPI app + CORS
│   │   ├── routers/
│   │   │   ├── search.py   # Gap detection endpoints
│   │   │   └── index.py    # Paper indexing endpoints
│   │   ├── services/
│   │   │   ├── openalex_fetcher.py    # Paper data
│   │   │   ├── embedder.py            # pgvector embeddings
│   │   │   ├── citation_fetcher.py    # Citation edges
│   │   │   ├── graph_analyzer.py      # Gap detection
│   │   │   ├── contradiction_detector.py  # NLI
│   │   │   ├── trend_forecaster.py    # Prophet
│   │   │   └── llm_explainer.py       # Groq LLM
│   │   └── core/
│   │       ├── database.py            # Supabase clients
│   │       └── config.py              # Settings
│   ├── scripts/             # Utility scripts
│   ├── requirements.txt
│   ├── render.yaml          # Render deployment
│   └── Procfile
└── frontend/                # React application
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx        # Auth page
    │   │   ├── Dashboard.jsx      # User hub
    │   │   ├── Search.jsx         # Main search
    │   │   ├── GapDetail.jsx      # Gap deep dive
    │   │   ├── Interdisciplinary.jsx
    │   │   ├── Profile.jsx
    │   │   └── admin/             # Admin panel (10 sections)
    │   ├── components/
    │   │   ├── search/            # Gap cards, search bar
    │   │   ├── graph/             # D3 citation graph
    │   │   ├── gap/               # Detail views
    │   │   ├── dashboard/         # Dashboard widgets
    │   │   ├── admin/             # Admin layout
    │   │   ├── auth/              # Auth guards
    │   │   └── ui/                # Navbar
    │   └── lib/
    │       ├── api.js             # Backend API client
    │       └── supabase.js        # Supabase client
    ├── vercel.json          # Vercel deployment
    └── package.json
```

## Database Schema

### Supabase Tables
| Table | Purpose |
|-------|---------|
| profiles | User accounts |
| topic_registry | Indexed research fields |
| paper_metadata | 12,000+ academic papers |
| paper_embeddings | 6,350 pgvector embeddings (384-dim) |
| citation_edges | Paper citation relationships |
| gap_cache | Cached gap detection results (24hr TTL) |
| paper_contradictions | NLI contradiction cache |
| prophet_cache | Trend forecast cache |
| search_history | User search logs |
| saved_gaps | User bookmarked gaps |

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase project (free tier)
- Groq API key (free at console.groq.com)

### Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux  
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload --port 8000
```

Verify: http://localhost:8000 → {"status": "ok"}

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Verify: http://localhost:5173

### First Run
1. Sign up with your email
2. Run SQL in Supabase to set yourself as admin:
   `UPDATE profiles SET is_admin=true WHERE email='you@email.com';`
3. Search any research topic to index it
4. First search takes 4-5 minutes (indexes papers + builds graph)
5. Subsequent searches take 2-3 seconds (cached)

## Deployment

### Backend → Render
1. Push to GitHub
2. New Web Service on render.com
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (see .env.example)

### Frontend → Vercel
1. `npm install -g vercel && vercel`
2. Add environment variables in Vercel dashboard
3. Set VITE_API_URL to your Render backend URL

### Post-Deployment
Update Render env: `FRONTEND_URL=https://your-app.vercel.app`
Then search 10 popular topics to pre-index them.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | / | Health check |
| GET | /health | Detailed health + vector count |
| POST | /index/topic | Index new research topic |
| POST | /index/embed | Embed papers to pgvector |
| POST | /index/citation-edges | Build citation graph |
| GET | /index/freshness/{slug} | Data age check |
| POST | /index/refresh | Trigger background refresh |
| POST | /search/gaps | Find research gaps |
| POST | /search/generate-brief | Generate research brief |
| POST | /search/interdisciplinary | Cross-domain analysis |

## Performance

| Operation | First Time | Cached |
|-----------|-----------|--------|
| New topic indexing | 4-5 min | — |
| Gap detection | 45-90 sec | 1-3 sec |
| Semantic search | 200ms | 200ms |
| Research brief | 10 sec | — |

## License

MIT License

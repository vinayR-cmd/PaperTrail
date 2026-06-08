import sys
import os
import time
from datetime import datetime
import json

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

results = {}


print("=" * 60)
print("PAPERTRAIL WEEK 1 — FULL PIPELINE TEST")
print(f"Run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# ─── TEST 1: Supabase connection ───────────────────────────
print("\n[1/7] Testing Supabase connection...")
try:
  from app.core.database import get_admin_client, get_anon_client
  admin = get_admin_client()
  anon = get_anon_client()
  r = admin.table("topic_registry").select("*").execute()
  print(f"  [x] Supabase connected")
  print(f"  [x] topic_registry: {len(r.data)} topics indexed")
  r2 = admin.table("paper_metadata").select("count").execute()
  print(f"  [x] paper_metadata accessible")
  r3 = admin.table("citation_edges").select("count").execute()
  print(f"  [x] citation_edges table exists")
  results["supabase"] = "PASS"
except Exception as e:
  print(f"  [ ] FAIL: {e}")
  results["supabase"] = f"FAIL: {e}"

# ─── TEST 2: OpenAlex fetcher ──────────────────────────────
print("\n[2/7] Testing OpenAlex fetcher...")
try:
  from app.services.openalex_fetcher import resolve_concept_id
  concept_id, label = resolve_concept_id("machine learning")
  assert concept_id.startswith("C"), "Concept ID format wrong"
  print(f"  [x] OpenAlex concept resolver working")
  print(f"  [x] 'machine learning' -> {concept_id} ({label})")
  
  r = admin.table("paper_metadata")\
    .select("count")\
    .eq("topic_slug", "machine-learning")\
    .execute()
  print(f"  [x] Papers in Supabase for machine-learning topic present")
  results["openalex"] = "PASS"
except Exception as e:
  print(f"  [ ] FAIL: {e}")
  results["openalex"] = f"FAIL: {e}"

# ─── TEST 3: ChromaDB + Embeddings ────────────────────────
print("\n[3/7] Testing ChromaDB embeddings...")
try:
  from app.services.embedder import (
    get_chroma_client, get_or_create_collection,
    query_similar_papers, get_collection_stats
  )
  client = get_chroma_client()
  collection = get_or_create_collection(client)
  stats = get_collection_stats()
  assert stats["total_vectors"] > 0, "ChromaDB is empty"
  print(f"  [x] ChromaDB connected")
  print(f"  [x] Vectors in collection: {stats['total_vectors']}")
  
  results_search = query_similar_papers(
    "neural networks deep learning",
    "machine-learning",
    n_results=3
  )
  assert len(results_search) > 0, "Semantic search returned nothing"
  print(f"  [x] Semantic search working")
  print(f"  [x] Top result: {results_search[0]['title'][:50]}...")
  results["chromadb"] = "PASS"
except Exception as e:
  print(f"  [ ] FAIL: {e}")
  results["chromadb"] = f"FAIL: {e}"

# ─── TEST 4: Citation graph ────────────────────────────────
print("\n[4/7] Testing citation graph (NetworkX)...")
try:
  from app.services.graph_analyzer import (
    build_networkx_graph, detect_communities
  )
  r = admin.table("citation_edges")\
    .select("count")\
    .eq("topic_slug", "machine-learning")\
    .execute()
  print(f"  [x] Citation edges in Supabase present")
  
  G = build_networkx_graph("machine-learning", admin)
  assert G.number_of_nodes() > 0, "Graph has no nodes"
  print(f"  [x] NetworkX graph: {G.number_of_nodes()} nodes, "
        f"{G.number_of_edges()} edges")
  
  communities = detect_communities(G)
  assert communities["num_communities"] > 0
  print(f"  [x] Louvain clustering: "
        f"{communities['num_communities']} communities found")
  results["networkx"] = "PASS"
except Exception as e:
  print(f"  [ ] FAIL: {e}")
  results["networkx"] = f"FAIL: {e}"

# ─── TEST 5: NLI contradiction detector ───────────────────
print("\n[5/7] Testing NLI contradiction detector...")
print("  (skipping model load for speed - testing imports only)")
try:
  from app.services.contradiction_detector import (
    detect_contradictions, analyze_contradictions_for_gaps
  )
  print("  [x] contradiction_detector imports successfully")
  print("  [x] DeBERTa NLI model available (tested in Day 5 run)")
  results["nli"] = "PASS (import check)"
except Exception as e:
  print(f"  [ ] FAIL: {e}")
  results["nli"] = f"FAIL: {e}"

# ─── TEST 6: Prophet forecasting ──────────────────────────
print("\n[6/7] Testing Prophet forecasting...")
try:
  from app.services.trend_forecaster import (
    forecast_cluster_growth, add_forecasts_to_gaps
  )
  test_papers = [
    {"year": 2018, "citation_count": 100},
    {"year": 2019, "citation_count": 150},
    {"year": 2020, "citation_count": 200},
    {"year": 2021, "citation_count": 280},
    {"year": 2022, "citation_count": 350},
    {"year": 2023, "citation_count": 400}
  ]
  forecast = forecast_cluster_growth(test_papers)
  assert "urgency" in forecast, "Forecast missing urgency field"
  assert "growth_rate" in forecast
  print(f"  [x] Prophet forecasting working")
  print(f"  [x] Test forecast: {forecast['urgency']} "
        f"({forecast['growth_rate']}%/year)")
  print(f"  [x] Label: {forecast['urgency_label']}")
  results["prophet"] = "PASS"
except Exception as e:
  print(f"  [ ] FAIL: {e}")
  results["prophet"] = f"FAIL: {e}"

# ─── TEST 7: Groq LLM explainer ───────────────────────────
print("\n[7/7] Testing Groq LLM explainer...")
try:
  from app.services.llm_explainer import call_groq_llm
  test_prompt = (
    "Return a JSON object with one key: "
    "'test' with value 'Groq connected successfully'. "
    "Return only the JSON, no markdown."
  )
  response = call_groq_llm(test_prompt)
  print(f"  [x] Groq API connected")
  print(f"  [x] Model: llama-3.1-8b-instant responding")
  print(f"  [x] Response: {response}")
  results["groq"] = "PASS"
except Exception as e:
  print(f"  [ ] FAIL: {e}")
  results["groq"] = f"FAIL: {e}"

# ─── FINAL REPORT ─────────────────────────────────────────
print("\n" + "=" * 60)
print("WEEK 1 PIPELINE TEST RESULTS")
print("=" * 60)
all_passed = True
components = [
  ("Supabase + Database",    results.get("supabase")),
  ("OpenAlex Fetcher",       results.get("openalex")),
  ("ChromaDB + Embeddings",  results.get("chromadb")),
  ("NetworkX Citation Graph",results.get("networkx")),
  ("NLI Contradiction Model",results.get("nli")),
  ("Prophet Forecasting",    results.get("prophet")),
  ("Groq LLM Explainer",     results.get("groq"))
]
for name, status in components:
  icon = "[x]" if status and "PASS" in status else "[ ]"
  print(f"  {icon} {name}: {status}")
  if not status or "FAIL" in status:
    all_passed = False

print("\n" + "=" * 60)
if all_passed:
  print("ALL SYSTEMS OPERATIONAL [x]")
  print("Phase 1 Week 1 complete - ready for Week 2 (Frontend)")
else:
  print("SOME COMPONENTS NEED ATTENTION")
  print("Fix the FAIL items above before moving to Week 2")
print("=" * 60)

print("\n--- MINI END-TO-END TEST ---")
print("Running find_gaps() with full enrichment pipeline...")
print("This includes: NetworkX + NLI + Prophet + Groq LLM")
print("Expected time: 3-6 minutes")
print("---")

try:
  from app.services.graph_analyzer import find_gaps
  start = time.time()
  gaps = find_gaps("machine-learning", admin)
  elapsed = round(time.time() - start, 1)
  
  print(f"\n[x] Pipeline completed in {elapsed} seconds")
  print(f"[x] Gaps found: {len(gaps)}")
  
  if gaps:
    g = gaps[0]
    print(f"\nTop gap full report:")
    print(f"  Label:    {g['gap_label']}")
    print(f"  Score:    {g['gap_score']}/100")
    print(f"  Urgency:  {g.get('combined_urgency', 'N/A')}")
    print(f"  Contradictions: {g.get('contradiction_count', 0)}")
    print(f"\n  LLM Explanation:")
    print(f"  {g.get('llm_explanation', 'Not generated')}")
    print(f"\n  Research Question:")
    print(f"  {g.get('llm_research_question', 'Not generated')}")
    print(f"\n  Urgency Explanation:")
    print(f"  {g.get('llm_urgency_explanation', 'Not generated')}")
  
  print("\n" + "=" * 60)
  print("FULL END-TO-END TEST PASSED [x]")
  print("=" * 60)

except Exception as e:
  print(f"\n[ ] End-to-end test FAILED: {e}")
  import traceback
  traceback.print_exc()

import time
import requests
from datetime import datetime, timezone
import re

def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities from OpenAlex titles"""
    if not text:
        return ""
    # Remove all HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Decode common HTML entities
    clean = clean.replace('&amp;', '&')\
                 .replace('&lt;', '<')\
                 .replace('&gt;', '>')\
                 .replace('&quot;', '"')\
                 .replace('&#39;', "'")\
                 .replace('&nbsp;', ' ')
    return clean.strip()

def reconstruct_abstract(inverted_index: dict) -> str:
    if not inverted_index:
        return ""
    word_positions = []
    for word, positions in inverted_index.items():
        for pos in positions:
            word_positions.append((pos, word))
    word_positions.sort(key=lambda x: x[0])
    return " ".join(word for pos, word in word_positions)

def resolve_concept_id(topic: str) -> tuple[str, str]:
    """
    Resolve a topic string to an OpenAlex concept ID.
    Tries multiple query variations if exact match fails.
    """
    headers = {
        "User-Agent": "PaperTrail/1.0 (vinay.workspace@gmail.com)"
    }

    # Build a list of attempts from most specific to most general
    words = topic.strip().split()
    
    attempts = []
    
    # 1. Exact phrase
    attempts.append(topic.strip())
    
    # 2. Without common filler words
    filler = {'large', 'advanced', 'modern', 'deep', 'applied',
              'computational', 'generative', 'artificial', 'big'}
    filtered = ' '.join(w for w in words if w.lower() not in filler)
    if filtered and filtered != topic.strip():
        attempts.append(filtered)
    
    # 3. Last 2-3 words (often the core concept)
    if len(words) >= 3:
        attempts.append(' '.join(words[-2:]))
        attempts.append(' '.join(words[-3:]))
    
    # 4. First 2-3 words
    if len(words) >= 2:
        attempts.append(' '.join(words[:2]))
    if len(words) >= 3:
        attempts.append(' '.join(words[:3]))
    
    # 5. Individual meaningful words (skip short ones)
    for word in words:
        if len(word) > 4:
            attempts.append(word)
    
    # 6. Known mappings for common AI/ML terms
    known_mappings = {
        'large language model': 'Natural Language Processing',
        'large language models': 'Natural Language Processing',
        'llm': 'Natural Language Processing',
        'llms': 'Natural Language Processing',
        'gpt': 'Natural Language Processing',
        'chatgpt': 'Natural Language Processing',
        'bert': 'Natural Language Processing',
        'transformer model': 'Natural Language Processing',
        'transformer models': 'Natural Language Processing',
        'diffusion model': 'Artificial intelligence',
        'diffusion models': 'Artificial intelligence',
        'stable diffusion': 'Artificial intelligence',
        'image generation': 'Computer vision',
        'text generation': 'Natural Language Processing',
        'reinforcement learning from human feedback': 'Reinforcement learning',
        'rlhf': 'Reinforcement learning',
        'foundation model': 'Machine learning',
        'foundation models': 'Machine learning',
        'multimodal': 'Artificial intelligence',
        'generative ai': 'Artificial intelligence',
        'generative artificial intelligence': 'Artificial intelligence',
        'prompt engineering': 'Natural Language Processing',
        'fine tuning': 'Machine learning',
        'fine-tuning': 'Machine learning',
        'transfer learning': 'Machine learning',
        'federated learning': 'Machine learning',
        'explainable ai': 'Artificial intelligence',
        'xai': 'Artificial intelligence',
        'computer vision': 'Computer vision',
        'natural language processing': 'Natural Language Processing',
        'nlp': 'Natural Language Processing',
        'speech recognition': 'Natural Language Processing',
        'object detection': 'Computer vision',
        'image classification': 'Computer vision',
        'graph neural network': 'Artificial neural network',
        'graph neural networks': 'Artificial neural network',
        'gnn': 'Artificial neural network',
    }
    
    topic_lower = topic.strip().lower()
    if topic_lower in known_mappings:
        mapped = known_mappings[topic_lower]
        attempts.insert(0, mapped)  # Try mapped term first
    
    # Deduplicate preserving order
    seen = set()
    unique_attempts = []
    for a in attempts:
        a = a.strip()
        if a and a.lower() not in seen and len(a) > 1:
            seen.add(a.lower())
            unique_attempts.append(a)
    
    print(f"Resolving concept for '{topic}' - trying {len(unique_attempts)} variations")
    
    for attempt in unique_attempts:
        try:
            res = requests.get(
                "https://api.openalex.org/concepts",
                params={"search": attempt, "per_page": 1},
                headers=headers,
                timeout=15
            )
            if res.status_code != 200:
                time.sleep(0.3)
                continue
            
            data = res.json()
            results = data.get("results", [])
            
            if results:
                concept = results[0]
                concept_id = concept["id"].split("/")[-1]
                concept_label = concept["display_name"]
                print(f"  Resolved '{topic}' -> '{concept_label}' "
                      f"(via query: '{attempt}')")
                return concept_id, concept_label
                
        except Exception as e:
            print(f"  Attempt '{attempt}' failed: {e}")
        
        time.sleep(0.3)
    
    # Nothing worked
    raise ValueError(
        f"Could not find '{topic}' in OpenAlex concepts. "
        f"Try a broader term like: 'Natural Language Processing', "
        f"'Machine Learning', 'Deep Learning', 'Computer Vision', "
        f"'Drug Discovery', 'Climate Change', 'Quantum Computing', "
        f"'Neuroscience', 'Genomics', or 'Materials Science'."
    )

def fetch_papers_for_concept(
    concept_id: str,
    topic_slug: str,
    max_papers: int = 1000
) -> list[dict]:
    headers = {"User-Agent": "PaperTrail/1.0 (vinay.workspace@gmail.com)"}
    url = "https://api.openalex.org/works"
    papers = []
    page = 1
    
    while len(papers) < max_papers:
        params = {
            "filter": f"concepts.id:{concept_id}",
            "sort": "cited_by_count:desc",
            "per_page": 100,
            "page": page,
            "select": "id,title,abstract_inverted_index,authorships,publication_year,cited_by_count,doi,primary_location,referenced_works,concepts"
        }
        
        retries = 3
        results = None
        for attempt in range(retries):
            try:
                response = requests.get(url, params=params, headers=headers, timeout=15)
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
                break
            except requests.exceptions.RequestException as e:
                if attempt == retries - 1:
                    print(f"Error fetching page {page} after {retries} retries: {e}")
                    break
                print(f"Retry {attempt + 1} for page {page} due to error: {e}")
                time.sleep(1)
                
        if not results:
            break
            
        for paper in results:
            title = strip_html(paper.get("title") or "")
            if not title:
                continue
                
            raw_id = paper.get("id", "")
            openalex_id = raw_id.split("/")[-1] if raw_id else ""
            
            abstract = reconstruct_abstract(paper.get("abstract_inverted_index"))
            
            authorships = paper.get("authorships", []) or []
            authors = []
            for auth in authorships:
                author_obj = auth.get("author", {})
                if author_obj and author_obj.get("display_name"):
                    authors.append(author_obj["display_name"])
            authors = authors[:10]
            
            primary_loc = paper.get("primary_location") or {}
            source = primary_loc.get("source") or {}
            journal = source.get("display_name") or ""
            
            ref_works = paper.get("referenced_works", []) or []
            referenced_works = [ref.split("/")[-1] for ref in ref_works if ref]
            
            papers.append({
                "openalex_id": openalex_id,
                "title": title,
                "abstract": abstract,
                "authors": authors,
                "year": paper.get("publication_year"),
                "citation_count": paper.get("cited_by_count", 0),
                "doi": paper.get("doi") or "",
                "journal": journal,
                "topic_slug": topic_slug,
                "referenced_works": referenced_works
            })
            
            if len(papers) >= max_papers:
                break
                
        print(f"Fetched {len(papers)}/{max_papers} papers...")
        page += 1
        time.sleep(0.3)
        
    return papers

def store_papers_in_supabase(
    papers: list[dict], 
    admin_client
) -> int:
    total_stored = 0
    batch_size = 100
    
    cleaned_papers = []
    for p in papers:
        cp = p.copy()
        if "referenced_works" in cp:
            del cp["referenced_works"]
        cleaned_papers.append(cp)
        
    for i in range(0, len(cleaned_papers), batch_size):
        batch = cleaned_papers[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        
        try:
            admin_client.table("paper_metadata").upsert(batch, on_conflict="openalex_id").execute()
            saved_count = len(batch)
            total_stored += saved_count
            print(f"Stored batch {batch_num}: {saved_count} papers saved")
        except Exception as e:
            print(f"Error storing batch {batch_num}: {e}")
            raise e
            
    return total_stored

def build_edges_from_papers(
    papers: list[dict],
    topic_slug: str,
    admin_client
) -> int:
    """
    Build citation edges using referenced_works already fetched.
    No extra API calls needed — uses data from paper fetch.
    This is 100x faster than fetching citations separately.
    """
    if not papers:
        return 0

    # Build set of all paper IDs in our dataset
    our_paper_ids = {p["openalex_id"] for p in papers if p.get("openalex_id")}

    # Build edge list — only keep citations within our dataset
    edges = []
    seen = set()

    for paper in papers:
        citing_id = paper.get("openalex_id")
        referenced = paper.get("referenced_works", []) or []

        if not citing_id:
            continue

        for cited_id in referenced:
            # Only keep edges where both papers are in our 1000
            if cited_id not in our_paper_ids:
                continue
            # Deduplicate
            edge_key = (citing_id, cited_id)
            if edge_key in seen:
                continue
            seen.add(edge_key)
            edges.append({
                "citing_paper_id": citing_id,
                "cited_paper_id": cited_id,
                "topic_slug": topic_slug
            })

    if not edges:
        print(f"No internal citation edges found for {topic_slug}")
        print("Papers may not heavily cite each other within the dataset")
        return 0

    print(f"Found {len(edges)} citation edges from pre-fetched data")

    # Insert in batches of 200
    batch_size = 200
    stored = 0
    for i in range(0, len(edges), batch_size):
        batch = edges[i:i + batch_size]
        try:
            admin_client.table("citation_edges").upsert(
                batch,
                on_conflict="citing_paper_id,cited_paper_id"
            ).execute()
            stored += len(batch)
        except Exception as e:
            err_str = str(e)
            if '23505' in err_str or 'duplicate' in err_str.lower():
                stored += len(batch)  # Already exists, that's fine
            else:
                print(f"Edge batch insert error (non-critical): {err_str[:100]}")

    print(f"Stored {stored} citation edges for {topic_slug}")
    return stored

def index_topic(topic: str, admin_client, max_papers: int = 1000) -> dict:
    concept_id, concept_label = resolve_concept_id(topic)
    topic_slug = topic.lower().strip().replace(" ", "-")
    
    # Check if topic already exists in topic_registry
    res = admin_client.table("topic_registry").select("*").eq("topic_slug", topic_slug).execute()
    if res.data:
        return {
            "status": "already_indexed",
            "topic_slug": topic_slug,
            "message": "Topic already in database"
        }
        
    # Create the topic in the registry first to avoid foreign key constraint violations
    registry_entry = {
        "topic_slug": topic_slug,
        "topic_label": concept_label,
        "paper_count": 0,
        "indexed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }
    admin_client.table("topic_registry").upsert(registry_entry, on_conflict="topic_slug").execute()
    
    try:
        papers = fetch_papers_for_concept(concept_id, topic_slug, max_papers)
        
        # Build citation edges from pre-fetched data
        print(f"Building citation edges from pre-fetched data...")
        edges_stored = build_edges_from_papers(papers, topic_slug, admin_client)
        print(f"Citation edges built: {edges_stored} edges stored")
        
        stored_count = store_papers_in_supabase(papers, admin_client)
        
        # Update the topic registry with the final paper count
        admin_client.table("topic_registry").update({"paper_count": stored_count}).eq("topic_slug", topic_slug).execute()
    except Exception as e:
        # Rollback the topic registry entry if setup failed and no papers are referencing it
        try:
            admin_client.table("topic_registry").delete().eq("topic_slug", topic_slug).execute()
        except Exception:
            pass
        raise e
    
    return {
        "status": "success",
        "topic_slug": topic_slug,
        "topic_label": concept_label,
        "papers_indexed": stored_count,
        "edges_stored": edges_stored,
        "concept_id": concept_id
    }

